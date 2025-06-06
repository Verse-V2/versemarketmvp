'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Event } from '@/lib/polymarket-service';
import { EventMarketCard } from '@/components/ui/event-market-card';

import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Market } from '@/lib/polymarket-api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { firebaseService } from '@/lib/firebase-service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { EventHeader } from "@/components/ui/event-header";

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


        <div className="space-y-6">
          <EventHeader market={marketData} />
          
          {/* Price Chart */}
          <Card>
            <CardContent className="pt-2">
              {loadingPriceHistory ? (
                <div className="h-[300px] w-full bg-gray-900 dark:bg-gray-950 animate-pulse rounded-lg"></div>
              ) : isRateLimited ? (
                <div className="h-[300px] w-full bg-gray-900 dark:bg-gray-950 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-400 mb-2">Rate limit exceeded</p>
                    <p className="text-sm text-gray-500">Please try again in a few minutes</p>
                  </div>
                </div>
              ) : topMarketPriceHistories.length > 0 ? (
                <div className="h-[300px] w-full px-1 pb-4 relative">
                  {/* Add legend at the top with better styling */}
                  <div className="mb-4 pt-0 flex flex-wrap gap-x-4 gap-y-2 justify-end text-xs">
                    {topMarketPriceHistories.map((market, idx) => (
                      <div key={market.id} className="flex items-center">
                        <div 
                          className="w-3 h-3 mr-1 rounded-full" 
                          style={{ 
                            backgroundColor: [
                              "#0BC700", // green for main market
                              "#3b82f6", // blue
                              "#f59e0b", // amber
                              "#ef4444"  // red
                            ][idx] 
                          }}
                        />
                        <span className="text-gray-200">{market.name}</span>
                      </div>
                    ))}
                  </div>
                  
                  <ResponsiveContainer width="100%" height="85%" style={{ marginLeft: '-10px' }}>
                    <LineChart
                      data={
                        // Create a merged dataset with all market prices
                        topMarketPriceHistories[0].data.map((point, idx) => {
                          // Use a record type to allow dynamic property names
                          const timePoint: Record<string, number> = { time: point.t * 1000 };
                          
                          // Add each market's price at this timestamp
                          topMarketPriceHistories.forEach((market, marketIdx) => {
                            const marketData = market.data[idx];
                            if (marketData) {
                              timePoint[`market${marketIdx}`] = marketData.p * 100;
                            }
                          });
                          
                          return timePoint;
                        })
                      }
                      margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                      <XAxis 
                        dataKey="time" 
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
                        }}
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => `${value}%`}
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          // Extract market index from the dataKey (e.g., "market0" -> 0)
                          const marketIndex = parseInt(name.replace('market', ''));
                          // Get the market name from our data
                          const marketName = topMarketPriceHistories[marketIndex]?.name || 'Unknown';
                          // Return formatted value and name
                          return [`${value.toFixed(2)}%`, marketName];
                        }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                        contentStyle={{ 
                          backgroundColor: '#111827', 
                          borderColor: '#374151',
                          color: '#f9fafb',
                          fontSize: '12px',
                          borderRadius: '4px'
                        }}
                        itemStyle={{ color: '#f9fafb' }}
                      />
                      
                      {/* Lines for each market with improved styling */}
                      <Line 
                        type="monotone" 
                        dataKey="market0" 
                        name="market0"
                        stroke="#0BC700" 
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 6, fill: "#0BC700", stroke: "#064e3b" }}
                        isAnimationActive={true}
                      />
                      
                      {/* Lines for the other markets */}
                      {topMarketPriceHistories.slice(1).map((market, index) => {
                        const colors = [
                          "#3b82f6", // blue
                          "#f59e0b", // amber
                          "#ef4444"  // red
                        ];
                        const strokeColor = colors[index];
                        const dotFillColor = colors[index];
                        
                        return (
                          <Line 
                            key={market.id}
                            type="monotone" 
                            dataKey={`market${index + 1}`}
                            name={`market${index + 1}`}
                            stroke={strokeColor}
                            strokeWidth={1.8}
                            dot={false}
                            activeDot={{ r: 4, fill: dotFillColor }}
                            isAnimationActive={true}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] w-full bg-gray-900 dark:bg-gray-950 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">No price history available</p>
                </div>
              )}
              
              {/* Time frame toggles - moved outside chart container */}
              <div className="flex justify-center px-1">
                <div className="flex space-x-1">
                  {[
                    { label: '1h', value: '1h' },
                    { label: '6h', value: '6h' },
                    { label: '1d', value: '1d' },
                    { label: '1w', value: '1w' },
                    { label: '1m', value: '1m' },
                    { label: 'All', value: 'max' }
                  ].map((timeFrame) => (
                    <button
                      key={timeFrame.value}
                      onClick={() => setSelectedTimeFrame(timeFrame.value)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        selectedTimeFrame === timeFrame.value
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {timeFrame.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <EventMarketCard market={marketData} hideViewDetails />

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