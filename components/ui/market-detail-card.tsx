import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Market } from "@/lib/polymarket-service";
import { toAmericanOdds as coreToAmericanOdds } from '@/utils';

interface MarketDetailCardProps {
  market: Market;
}

export function MarketDetailCard({ market }: MarketDetailCardProps) {
  // String-to-number wrapper for the centralized toAmericanOdds function
  const toAmericanOdds = (priceStr: string) => {
    try {
      const prob = Number(priceStr);
      return coreToAmericanOdds(prob);
    } catch {
      return 'N/A';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {market.active && (
            <Badge variant="outline" className="font-normal bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-green-900/20 dark:text-green-400">
              Active
            </Badge>
          )}
          {market.closed && (
            <Badge variant="secondary" className="font-normal">
              Closed
            </Badge>
          )}
          <Badge variant="outline" className="font-normal">{market.marketType || 'Standard'}</Badge>
        </div>
        
        <CardTitle className="text-xl">{market.question}</CardTitle>
        
        {market.description && (
          <CardDescription className="text-sm mt-2 text-gray-600 dark:text-gray-400">
            {market.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Volume</p>
            <p className="font-semibold">${Number(market.volume).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Liquidity</p>
            <p className="font-semibold">${Number(market.liquidity).toLocaleString()}</p>
          </div>
        </div>

        {market.outcomes && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Odds:</p>
            <div className="flex flex-wrap gap-2">
              {(() => {
                try {
                  const outcomes = JSON.parse(market.outcomes);
                  const prices = JSON.parse(market.outcomePrices || '[]');

                  if (!Array.isArray(outcomes) || !Array.isArray(prices)) {
                    return <span className="text-gray-500 dark:text-gray-400">No odds available</span>;
                  }

                  return outcomes.map((outcome: string, index: number) => {
                    const prob = Number(prices[index]);
                    const oddStyle = prob > 0.5 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : prob > 0.2
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                    
                    return (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className={`px-3 py-1 font-normal ${oddStyle}`}
                      >
                        {outcome}: {toAmericanOdds(prices[index])}
                      </Badge>
                    );
                  });
                } catch {
                  return <span className="text-gray-500 dark:text-gray-400">Error loading odds</span>;
                }
              })()}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="w-full">
          <Separator className="my-2" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Best Bid</p>
              <p className="font-semibold">{market.bestBid ? toAmericanOdds(market.bestBid.toString()) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Best Ask</p>
              <p className="font-semibold">{market.bestAsk ? toAmericanOdds(market.bestAsk.toString()) : 'N/A'}</p>
            </div>
          </div>
          <p className="mt-2">Last Trade: {market.lastTradePrice && market.lastTradePrice > 0 ? 
            toAmericanOdds(market.lastTradePrice.toString()) : 'No trades'}</p>
        </div>
      </CardFooter>
    </Card>
  );
} 