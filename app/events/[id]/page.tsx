'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Event } from '@/lib/polymarket-service';
import { EventMarketCard } from '@/components/ui/event-market-card';

import { Header } from '@/components/ui/header';
import { Market } from '@/lib/polymarket-api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { firebaseService } from '@/lib/firebase-service';
import { useAuth } from '@/lib/auth-context';
import { EventHeader } from "@/components/ui/event-header";
import { PriceHistoryChart } from '@/components/ui/price-history-chart';
import { RelatedEvents } from '@/components/ui/related-events';

// Interface for polymarket token
interface Token {
  token_id: string;
  outcome: string;
  symbol?: string;
  decimals?: number;
  address?: string;
}

// Firebase market interface
interface FirebaseMarket {
  id: string;
  question?: string;
  outcomes?: string;
  outcomePrices?: string;
  active?: boolean;
  groupItemTitle?: string;
  description?: string;
  conditionId?: string;
}

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

// Interface for market price history
interface MarketPriceHistory {
  id: string;
  name: string;
  data: {t: number, p: number}[];
}

function EventDetails() {
  const params = useParams();
  const router = useRouter();
  const user = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<Market | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [topMarketPriceHistories, setTopMarketPriceHistories] = useState<MarketPriceHistory[]>([]);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('1w');

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    }
  }, [user, router]);

  // Function to fetch price history for a market
  const fetchPriceHistory = useCallback(async (conditionId: string, marketName: string, marketIndex: number) => {
    try {
      // First, get market data to extract token ID
      const marketResponse = await fetch(`https://clob.polymarket.com/markets/${conditionId}`);
      if (!marketResponse.ok) {
        if (marketResponse.status === 429) {
          setIsRateLimited(true);
          throw new Error('Rate limited by CLOB API');
        }
        throw new Error(`HTTP error! status: ${marketResponse.status}`);
      }
      const marketInfo = await marketResponse.json();
      
      // Find the "Yes" outcome token ID
      const yesToken = marketInfo.tokens.find((token: Token) => token.outcome === "Yes");
      
      if (yesToken && yesToken.token_id) {
        // Now fetch price history using the token ID
        const historyResponse = await fetch(
          `https://clob.polymarket.com/prices-history?market=${yesToken.token_id}&interval=${selectedTimeFrame}&fidelity=60`
        );
        if (!historyResponse.ok) {
          if (historyResponse.status === 429) {
            setIsRateLimited(true);
            throw new Error('Rate limited by CLOB API');
          }
          throw new Error(`HTTP error! status: ${historyResponse.status}`);
        }
        const historyData = await historyResponse.json();
        
        if (historyData && historyData.history) {
          // Update the price histories array
          setTopMarketPriceHistories(prev => {
            const newHistories = [...prev];
            newHistories[marketIndex] = {
              id: conditionId,
              name: marketName,
              data: historyData.history
            };
            return newHistories;
          });
        }
      }
    } catch (err) {
      console.error(`Error fetching price history for market ${marketName}:`, err);
      // Handle both explicit rate limiting and network failures
      if (err instanceof Error && (
        err.message.includes('Rate limited') || 
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError')
      )) {
        setIsRateLimited(true);
      }
    }
  }, [selectedTimeFrame]);

  // Function to fetch price histories for top markets
  const fetchTopMarketsPriceHistories = useCallback(async (markets: Array<{market: FirebaseMarket; probability: number}>) => {
    setLoadingPriceHistory(true);
    setIsRateLimited(false); // Reset rate limited state on new fetch attempt
    
    try {
      // Get the top 4 markets or fewer if not available
      const topMarkets = markets.slice(0, 4);
      console.log('Fetching price history for markets:', {
        totalMarkets: markets.length,
        topMarketsLength: topMarkets.length,
        topMarketIds: topMarkets.map(m => m.market.id)
      });
      
      // Initialize the price histories array with empty data
      setTopMarketPriceHistories(
        topMarkets.map((market, index) => {
          // For single market events, just use "Yes" since we're tracking the Yes outcome
          // For multiple markets, use groupItemTitle or question
          let name;
          if (topMarkets.length === 1) {
            name = "Yes";
          } else {
            name = market.market.groupItemTitle || market.market.question || `Market ${index + 1}`;
          }
          
          return {
            id: market.market.id,
            name: name,
            data: []
          };
        })
      );
      
      // Fetch price history for each market in parallel
      const fetchPromises = topMarkets.map((market, index) => {
        const marketObj = market.market;
        if (marketObj.conditionId) {
          // Use same naming logic as when initializing the array
          let name;
          if (topMarkets.length === 1) {
            name = "Yes";
          } else {
            name = marketObj.groupItemTitle || marketObj.question || `Market ${index + 1}`;
          }
          
          return fetchPriceHistory(
            marketObj.conditionId, 
            name,
            index
          );
        }
        return Promise.resolve();
      });
      
      await Promise.all(fetchPromises);
    } catch (err) {
      console.error('Error fetching top markets price histories:', err);
    } finally {
      setLoadingPriceHistory(false);
    }
  }, [fetchPriceHistory]);

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
        
        // Find the top sorted markets (highest probability markets)
        let topSortedMarket = mainMarket;
        if (data.markets && data.markets.length > 0) {
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
            
            // Fetch price histories for top markets
            await fetchTopMarketsPriceHistories(sortedMarkets);
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
              console.log('Total markets from data:', data.markets.length);
              
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
              
              console.log('Unsorted submarkets:', unsortedSubmarkets.length);
              
              const sortedSubmarkets = [...unsortedSubmarkets].sort((a, b) => {
                // Sort by highest probability first (lowest American odds)
                return b.probability - a.probability;
              });
              
              console.log('Sorted submarkets before return:', sortedSubmarkets.length);
              return sortedSubmarkets;
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
  }, [params.id, fetchTopMarketsPriceHistories]);

  // Effect to refetch price history when time frame changes
  useEffect(() => {
    if (event && event.markets && event.markets.length > 0) {
      const marketsWithProbability = event.markets
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
        return b.probability - a.probability;
      });
      
      if (sortedMarkets.length > 0) {
        fetchTopMarketsPriceHistories(sortedMarkets);
      }
    }
  }, [selectedTimeFrame, event, fetchTopMarketsPriceHistories]);

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
        <Header title="Details" />
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
        <Header title="Details" />
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="text-center text-red-500 py-8">
            {error || 'Event not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Details" />
      <div className="container mx-auto max-w-3xl px-4 py-8 mt-0">
        <div className="space-y-3">
          <EventHeader market={marketData} />
          {/* Price Chart */}
          <PriceHistoryChart
            priceHistories={topMarketPriceHistories}
            loading={loadingPriceHistory}
            isRateLimited={isRateLimited}
            selectedTimeFrame={selectedTimeFrame}
            onTimeFrameChange={setSelectedTimeFrame}
          />
          <EventMarketCard market={marketData} hideViewDetails />
          {/* Rules Card */}
          <Card>
            <CardHeader className="pb-0 px-3">
              <CardTitle>Rules</CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-1">
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {marketData.description}
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Related Events */}
          <RelatedEvents
            events={relatedEvents}
            loading={loadingRelated}
          />
        </div>
      </div>
    </div>
  );
}

export default EventDetails; 