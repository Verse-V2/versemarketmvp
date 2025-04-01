"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Market } from "@/lib/polymarket-api";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";
import { useBetSlip } from "@/lib/bet-slip-context";

interface MarketCardProps {
  market: Market;
  hideViewDetails?: boolean;
  hideComments?: boolean;
}

export function MarketCard({ market, hideViewDetails = false, hideComments = false }: MarketCardProps) {
  const { addBet, isBetInSlip } = useBetSlip();

  // Format the end date
  const formattedEndDate = market.endDate
    ? `Ends ${formatDistanceToNow(new Date(market.endDate), { addSuffix: true })}`
    : "No end date";

  // These formatted values will be used in future iterations of the component
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formattedVolume = `$${Number(market.volume).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formattedLiquidity = `$${Number(market.liquidity).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  // Convert probability to American odds
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

  const handleBetClick = (outcome: { name: string; probability: number }) => {
    const outcomeId = `${market.id}-${outcome.name}`;
    if (!isBetInSlip(outcomeId)) {
      addBet({
        marketId: market.id,
        marketQuestion: market.question,
        outcomeId,
        outcomeName: outcome.name,
        odds: toAmericanOdds(outcome.probability),
        probability: outcome.probability,
        imageUrl: market.imageUrl,
      });
    }
  };

  const hasMultipleMarkets = market.marketsCount && market.marketsCount > 1;
  const hasTopSubmarkets = hasMultipleMarkets && market.topSubmarkets && market.topSubmarkets.length > 0;

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-0">
        <div className="flex gap-4 items-start">
          {market.imageUrl && (
            <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-md">
              <Image
                src={market.imageUrl}
                alt={market.question}
                fill
                sizes="(max-width: 768px) 100px, 128px"
                style={{ objectFit: "cover" }}
                priority={false}
                className="transition-transform duration-300 hover:scale-105"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2 mb-1">
              <CardTitle className="text-lg line-clamp-2">{market.question}</CardTitle>
            </div>
            <CardDescription className="text-gray-500 dark:text-gray-400">{formattedEndDate}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-1 flex-grow">
        {hasTopSubmarkets ? (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Top Markets:</div>
            {market.topSubmarkets!.map((submarket, index) => {
              const outcomeId = `${market.id}-${submarket.question}`;
              const isSelected = isBetInSlip(outcomeId);
              return (
                <Button 
                  key={index} 
                  variant={isSelected ? "default" : "outline"}
                  className={`w-full justify-between py-2 h-12 mb-1 hover:bg-gray-50 dark:hover:bg-gray-800 group ${
                    isSelected ? 'bg-primary text-primary-foreground' : ''
                  }`}
                  onClick={() => handleBetClick({
                    name: submarket.groupItemTitle || submarket.question.replace(/Will the |win the 2025 NBA Finals\?/g, ''),
                    probability: submarket.probability
                  })}
                >
                  <span className="text-sm truncate text-left">
                    {submarket.groupItemTitle || submarket.question.replace(/Will the |win the 2025 NBA Finals\?/g, '')}
                  </span>
                  <span className={`text-sm font-semibold ${
                    isSelected ? '' :
                    submarket.probability > 0.5 ? "text-green-700 dark:text-green-400 group-hover:text-green-800 dark:group-hover:text-green-300" : 
                    submarket.probability > 0.2 ? "text-yellow-700 dark:text-yellow-400 group-hover:text-yellow-800 dark:group-hover:text-yellow-300" : 
                    "text-red-700 dark:text-red-400 group-hover:text-red-800 dark:group-hover:text-red-300"
                  }`}>
                    {toAmericanOdds(submarket.probability)}
                  </span>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {market.outcomes && market.outcomes.length > 0 ? (
              <>
                <div className="flex flex-col gap-1">
                  {market.outcomes.slice(0, 2).map((outcome, index) => {
                    const outcomeId = `${market.id}-${outcome.name}`;
                    const isSelected = isBetInSlip(outcomeId);
                    return (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{outcome.name}</span>
                        <Button 
                          variant={isSelected ? "default" : "outline"}
                          className={`py-2 h-12 min-w-[100px] ${
                            isSelected ? 'bg-primary text-primary-foreground' :
                            outcome.name.toLowerCase() === 'yes' 
                              ? 'border-green-500 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20' 
                              : 'border-red-500 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20'
                          }`}
                          onClick={() => handleBetClick(outcome)}
                        >
                          {toAmericanOdds(outcome.probability)}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                
                {market.outcomes.length > 2 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic">+ {market.outcomes.length - 2} more outcomes</div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">No outcomes available</div>
            )}
          </div>
        )}
      </CardContent>

      {(!hideComments || !hideViewDetails) && (
        <CardFooter className="pt-1 flex justify-between items-center">
          {!hideComments && (
            <div className="text-xs flex items-center text-gray-600 dark:text-gray-400">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span>Comments ({market.commentCount || 0})</span>
            </div>
          )}
          {!hideViewDetails && (
            <Link href={`/events/${market.id}`}>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <span>View Details</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </CardFooter>
      )}
    </Card>
  );
} 