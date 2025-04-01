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

function EventDetails() {
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<Market | null>(null);

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
                  probability: probability
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
                This market resolves to YES if the event occurs before the expiration date, and NO otherwise.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Resolution will be determined by reliable and publicly available information.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                If the event is rescheduled to a date before the expiration date, the market will remain open.
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