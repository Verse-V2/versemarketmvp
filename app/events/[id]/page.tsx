'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Event } from '@/lib/polymarket-service';
import { polymarketService } from '@/lib/polymarket-service';
import { MarketCard } from '@/components/ui/market-card';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Market } from '@/lib/polymarket-api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';

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
        const data = await polymarketService.getEventById(params.id as string);
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
  const fetchRelatedEvents = async (tags: any[], currentEventId: string) => {
    setLoadingRelated(true);
    try {
      // Extract tag slugs for filtering
      const tagSlugs = tags.map(tag => tag.slug);
      
      // Fetch related events from API - This is a simplified example
      // In a real implementation, you'd call your API with the tag information
      let relatedData: RelatedEvent[] = [];
      
      try {
        // Mock API call - replace with actual API call
        const response = await polymarketService.getEventsByTags(tagSlugs);
        
        // Filter out the current event and limit to 4 related events
        relatedData = response
          .filter((event: any) => event.id !== currentEventId)
          .slice(0, 4)
          .map((event: any) => {
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
              image: event.image,
              probability: probability,
              endDate: event.endDate,
              volume: event.volume?.toString()
            };
          });
      } catch (error) {
        console.error('Error fetching related events:', error);
        
        // Fallback to some sample related events if API fails
        // In a real implementation, you might want to handle this differently
        relatedData = [
          {
            id: "12815",
            slug: "nba-champion-2024-2025",
            title: "NBA Champion",
            image: "https://polymarket-upload.s3.us-east-2.amazonaws.com/nba-champion-2024-2025-NiYghxjb7928.png",
            endDate: "2025-06-23T12:00:00Z",
            volume: "1602633105",
          },
          {
            id: "507871",
            slug: "will-the-los-angeles-lakers-win-the-2025-nba-finals",
            title: "Will the Los Angeles Lakers win the 2025 NBA Finals?",
            image: "https://polymarket-upload.s3.us-east-2.amazonaws.com/New+NBA+Team+Logos+/LAL.png",
            probability: 0.0685,
          },
          {
            id: "507884",
            slug: "will-the-oklahoma-city-thunder-win-the-2025-nba-finals",
            title: "Will the Oklahoma City Thunder win the 2025 NBA Finals?",
            image: "https://polymarket-upload.s3.us-east-2.amazonaws.com/New+NBA+Team+Logos+/OKC.png",
            probability: 0.325,
          },
          {
            id: "507857",
            slug: "will-the-boston-celtics-win-the-2025-nba-finals",
            title: "Will the Boston Celtics win the 2025 NBA Finals?",
            image: "https://polymarket-upload.s3.us-east-2.amazonaws.com/New+NBA+Team+Logos+/BOS.png",
            probability: 0.285,
          }
        ];
      }
      
      setRelatedEvents(relatedData);
    } catch (error) {
      console.error('Error processing related events:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !event || !marketData) {
    return (
      <div className="text-center text-red-500 py-8">
        {error || 'Event not found'}
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Timeline
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <MarketCard market={marketData} hideViewDetails={true} hideComments={true} />
        
        {/* Price Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Price History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <SimplePriceChart marketId={marketData.id} />
            </div>
          </CardContent>
        </Card>

        {/* Rules Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {marketData.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Comments Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0"></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">User123</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    I think the odds are undervalued. Based on recent developments, this is more likely than the market suggests.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0"></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">Trader456</p>
                    <p className="text-xs text-gray-500">5 hours ago</p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Just added more to my position. The sentiment seems to be shifting based on latest news.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Events Card */}
        {relatedEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRelated ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedEvents.map((relEvent) => (
                    <div key={relEvent.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <Link href={`/events/${relEvent.id}`} className="block">
                        <div className="flex items-center p-3">
                          <div className="w-12 h-12 mr-3 rounded-md overflow-hidden flex-shrink-0">
                            <img 
                              src={relEvent.image} 
                              alt={relEvent.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
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
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function EventPage() {
  return (
    <>
      <Header />
      <EventDetails />
    </>
  );
} 