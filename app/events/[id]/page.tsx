'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Event } from '@/lib/polymarket-service';
import { MarketCard } from '@/components/ui/market-card';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Market } from '@/lib/polymarket-api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { firebaseService } from '@/lib/firebase-service';

// Dynamically import the client-side chart component
const SimplePriceChart = dynamic(() => import('@/components/simple-price-chart'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
});

// Convert probability to American odds - same as in market-card.tsx
const toAmericanOdds = (prob: number) => {
  if (prob <= 0) return "N/A"; // Handle edge cases
  
  if (prob >= 1) return "-∞"; // Very close to certainty
  
  if (prob > 0.5) {
    // Favorite: negative odds
    const odds = Math.round(-100 / (prob - 1));
    return `-${Math.abs(odds).toLocaleString()}`;
  } else {
    // Underdog: positive odds
    const odds = Math.round(100 / prob - 100);
    return `+${odds.toLocaleString()}`;
  }
};

// New interface for related events
interface RelatedEvent {
  id: string;
  slug: string;
  title: string;
  image: string;
  probability?: number;
  endDate?: string;
  volume?: string;
}

function EventDetails() {
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<Market | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!params.id) {
        setError('Event ID is required');
        setLoading(false);
        return;
      }

      try {
        const data = await firebaseService.getEventById(params.id as string);
        if (!data) {
          throw new Error('Event not found');
        }
        
        setEvent(data);
        
        // Convert event to market format for the MarketCard component
        const mainMarket = data.markets.length > 0 ? data.markets[0] : null;
        let outcomes: { name: string; probability: number }[] = [];
        
        if (mainMarket && mainMarket.outcomes && mainMarket.outcomePrices) {
          try {
            const outcomeNames = JSON.parse(mainMarket.outcomes);
            const outcomePrices = JSON.parse(mainMarket.outcomePrices);
            
            outcomes = outcomeNames.map((name: string, index: number) => ({
              name: name,
              probability: parseFloat(outcomePrices[index] || "0")
            }));

            // Sort outcomes to have "Yes" first, then "No", then others
            outcomes.sort((a, b) => {
              const aName = a.name.toLowerCase();
              const bName = b.name.toLowerCase();
              
              if (aName === 'yes' && bName !== 'yes') return -1;
              if (aName !== 'yes' && bName === 'yes') return 1;
              if (aName === 'no' && bName !== 'no' && bName !== 'yes') return -1;
              if (aName !== 'no' && aName !== 'yes' && bName === 'no') return 1;
              
              return 0;
            });
          } catch (error) {
            console.error('Error parsing outcomes:', error);
          }
        }
        
        // Find the top sorted market (highest probability market)
        let topSortedMarket = mainMarket;
        if (data.markets.length > 1) {
          const marketsWithProbability = data.markets
            .filter(m => m.outcomePrices)
            .map(m => {
              let probability = 0;
              if (m.outcomePrices) {
                try {
                  const prices = JSON.parse(m.outcomePrices);
                  probability = parseFloat(prices[0] || "0");
                } catch (e) {
                  console.error('Error parsing prices:', e);
                }
              }
              return {
                market: m,
                probability: probability
              };
            });
            
          const sortedMarkets = [...marketsWithProbability].sort((a, b) => {
            // Sort by highest probability first
            return b.probability - a.probability;
          });
          
          if (sortedMarkets.length > 0) {
            topSortedMarket = sortedMarkets[0].market;
          }
        }
        
        // Create the market data object for the MarketCard component
        const marketDataObj = {
          id: data.id,
          question: data.title,
          slug: data.slug,
          outcomes: outcomes,
          volume: data.volume.toString(),
          liquidity: data.liquidity.toString(),
          endDate: data.endDate,
          category: data.category,
          imageUrl: data.image,
          status: data.active ? 'active' : 'inactive',
          marketsCount: data.markets.length,
          description: topSortedMarket?.description || 'No description available for this market.',
          topSubmarkets: data.markets.length > 1 ? 
            (() => {
              const unsortedSubmarkets = data.markets.map(m => {
                let probability = 0;
                if (m.outcomePrices) {
                  try {
                    const prices = JSON.parse(m.outcomePrices);
                    probability = parseFloat(prices[0] || "0");
                  } catch (e) {
                    console.error('Error parsing prices:', e);
                  }
                }
                return {
                  id: m.id,
                  question: m.question || '',
                  probability: probability,
                  groupItemTitle: m.groupItemTitle
                };
              });
              
              const sortedSubmarkets = [...unsortedSubmarkets].sort((a, b) => {
                // Sort by highest probability first (lowest American odds)
                return b.probability - a.probability;
              });
              
              return sortedSubmarkets.slice(0, 4);
            })() : undefined
        };
        
        setMarketData(marketDataObj);
        
        // Fetch related events based on tags if the event has tags
        if (data.tags && data.tags.length > 0) {
          fetchRelatedEvents(data.tags, data.id);
        }
        
        setError(null);

        // Set up real-time listener for market updates
        const unsubscribe = firebaseService.onMarketUpdate(data.id, (updatedMarket) => {
          setMarketData(updatedMarket);
        });

        // Cleanup listener when component unmounts or event ID changes
        return () => {
          unsubscribe();
        };

      } catch (error) {
        console.error('Error loading event:', error);
        setError(error instanceof Error ? error.message : 'Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [params.id]);

  // Function to fetch related events based on tags
  const fetchRelatedEvents = async (tags: Array<{ id?: string; label?: string; slug?: string }>, currentEventId: string) => {
    setLoadingRelated(true);
    try {
      // Extract tag slugs for filtering
      const tagSlugs = tags.map(tag => tag.slug || '');
      
      // Fetch related events from Firebase
      const response = await firebaseService.getEventsByTags(tagSlugs);
      
      // Filter out the current event and limit to 4 related events
      const relatedData = response
        .filter((event: Event) => event.id !== currentEventId)
        .slice(0, 4)
        .map((event: Event) => {
          let probability = 0;
          if (event.markets && event.markets.length > 0 && event.markets[0].outcomePrices) {
            try {
              const prices = JSON.parse(event.markets[0].outcomePrices);
              probability = parseFloat(prices[0] || "0");
            } catch (e) {
              console.error('Error parsing related event prices:', e);
            }
          }
          
          return {
            id: event.id,
            slug: event.slug,
            title: event.title,
            image: event.image || '',
            probability: probability,
            endDate: event.endDate,
            volume: event.volume?.toString()
          };
        });
      
      setRelatedEvents(relatedData);
    } catch (error) {
      console.error('Error processing related events:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event || !marketData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="text-center text-red-500 py-8">
            {error || 'Event not found'}
          </div>
        </div>
      </div>
    );
  }

  // Format a date string as "MMM DD, YYYY"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format volume for display
  const formatVolume = (volume: string) => {
    const num = parseFloat(volume);
    if (num >= 1_000_000_000) {
      return `$${(num / 1_000_000_000).toFixed(1)}B`;
    } else if (num >= 1_000_000) {
      return `$${(num / 1_000_000).toFixed(1)}M`;
    } else if (num >= 1_000) {
      return `$${(num / 1_000).toFixed(1)}K`;
    }
    return `$${num.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Markets
          </Link>
        </div>

        <div className="space-y-6">
          <MarketCard market={marketData} hideViewDetails />
          
          {/* Price Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
            </CardHeader>
            <CardContent>
              <SimplePriceChart />
            </CardContent>
          </Card>

          {/* Rules Card */}
          <Card>
            <CardHeader>
              <CardTitle>Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {marketData.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Related Events */}
          <Card>
            <CardHeader>
              <CardTitle>Related Events</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRelated ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : relatedEvents.length > 0 ? (
                <div className="space-y-4">
                  {relatedEvents.map((relEvent) => (
                    <div key={relEvent.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <Link href={`/events/${relEvent.id}`} className="block">
                        <div className="flex p-4 gap-4">
                          {relEvent.image && (
                            <div className="relative w-16 h-16 flex-shrink-0">
                              <Image
                                src={relEvent.image}
                                alt={relEvent.title}
                                fill
                                className="object-cover rounded-lg"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <p className="font-semibold text-sm line-clamp-2">{relEvent.title}</p>
                            <div className="flex justify-between items-center mt-1">
                              {relEvent.probability !== undefined ? (
                                <>
                                  <div className="text-xs text-gray-500">{(relEvent.probability * 100).toFixed(1)}% Yes</div>
                                  <div className="text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-0.5 rounded-full">
                                    {toAmericanOdds(relEvent.probability)}
                                  </div>
                                </>
                              ) : relEvent.endDate && relEvent.volume ? (
                                <>
                                  <div className="text-xs text-gray-500">{formatDate(relEvent.endDate)}</div>
                                  <div className="text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-0.5 rounded-full">
                                    {formatVolume(relEvent.volume)}
                                  </div>
                                </>
                              ) : (
                                <div className="text-xs text-gray-500">Related market</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No related events found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default EventDetails; 