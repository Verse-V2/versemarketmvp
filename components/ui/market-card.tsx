"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Market } from "@/lib/polymarket-api";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";
import { useBetSlip } from "@/lib/bet-slip-context";
import { useEffect, useRef, useState } from "react";
import { useCurrency } from "@/lib/currency-context";
import { firebaseService } from '@/lib/firebase-service';
import { Config } from '@/lib/firebase-service';
import { toAmericanOdds } from '@/utils';

interface MarketCardProps {
  market: Market;
  hideViewDetails?: boolean;
  hideComments?: boolean;
}

export function MarketCard({ market, hideViewDetails = false, hideComments = false }: MarketCardProps) {
  const { addBet, removeBet, isBetInSlip } = useBetSlip();
  const previousOddsRef = useRef<Record<string, string>>({});
  const [flashingOdds, setFlashingOdds] = useState<Record<string, boolean>>({});
  const { currency } = useCurrency();
  const [maxOdds, setMaxOdds] = useState<number | undefined>(undefined);
  const [minOdds, setMinOdds] = useState<number | undefined>(undefined);

  // Load odds limits from config
  useEffect(() => {
    const loadOddsLimits = async () => {
      const config = await firebaseService.getConfig() as Config | null;
      setMaxOdds(config?.safeguards?.maxPredictionOdds);
      setMinOdds(config?.safeguards?.minPredictionOdds);
    };
    loadOddsLimits();
  }, []);

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



  // Check if odds exceed max limit
  const isOddsExceedingLimit = (prob: number): boolean => {
    if (prob <= 0 || prob >= 1) return true;
    
    let odds: number;
    if (prob > 0.5) {
      odds = Math.round(-100 / (prob - 1));
    } else {
      odds = Math.round(100 / prob - 100);
    }
    
    // Use config values if available, otherwise use default limits
    const effectiveMaxOdds = typeof maxOdds === 'number' ? maxOdds : 3000;
    const effectiveMinOdds = typeof minOdds === 'number' ? minOdds : -3000;
    
    return odds > effectiveMaxOdds || odds < effectiveMinOdds;
  };

  const handleBetClick = (outcome: { name: string; probability: number }, submarketId?: string) => {
    // For submarkets, we need to use the groupItemTitle or cleaned question as the name
    const outcomeName = outcome.name.includes('?') 
                              ? outcome.name
      : outcome.name;
    const outcomeId = `${market.id}-${outcomeName}`;
    
    if (isBetInSlip(outcomeId)) {
      removeBet(outcomeId);
    } else {
      addBet({
        marketId: submarketId || market.id, // Use submarket ID if available, otherwise use market ID
        eventId: market.id, // The market ID is the event ID in our data structure
        marketQuestion: market.question,
        outcomeId,
        outcomeName: `${outcomeName} - ${outcome.name === 'No' ? 'No' : 'Yes'}`,
        odds: toAmericanOdds(outcome.probability),
        probability: outcome.probability,
        imageUrl: market.imageUrl,
      });
    }
  };

  // Check for odds changes and trigger animation
  useEffect(() => {
    const currentOdds: Record<string, string> = {};
    
    // Collect all current odds
    if (market.topSubmarkets && market.topSubmarkets.length > 0) {
      market.topSubmarkets.forEach((submarket) => {
        const outcomeName = submarket.groupItemTitle || submarket.question;
        const outcomeId = `${market.id}-${outcomeName}`;
        currentOdds[outcomeId] = toAmericanOdds(submarket.probability);
      });
    } else if (market.outcomes && market.outcomes.length > 0) {
      market.outcomes.forEach((outcome) => {
        const outcomeId = `${market.id}-${outcome.name}`;
        currentOdds[outcomeId] = toAmericanOdds(outcome.probability);
      });
    }
    
    // Check which odds have changed
    const newFlashingOdds: Record<string, boolean> = {};
    Object.keys(currentOdds).forEach((outcomeId) => {
      if (previousOddsRef.current[outcomeId] && 
          previousOddsRef.current[outcomeId] !== currentOdds[outcomeId]) {
        newFlashingOdds[outcomeId] = true;
      }
    });
    
    // If any odds changed, update state and set timeout to remove animation
    if (Object.keys(newFlashingOdds).length > 0) {
      setFlashingOdds(newFlashingOdds);
      
      // Clear animation after it completes
      const timer = setTimeout(() => {
        setFlashingOdds({});
      }, 1000); // Animation duration
      
      return () => clearTimeout(timer);
    }
    
    // Store current odds for next comparison
    previousOddsRef.current = currentOdds;
  }, [market]);

  const hasMultipleMarkets = market.marketsCount && market.marketsCount > 1;
  const hasTopSubmarkets = hasMultipleMarkets && market.topSubmarkets && market.topSubmarkets.length > 0;

  return (
    <Link href={`/events/${market.id}`} className="block h-full">
      <Card className="h-full flex flex-col hover:shadow-md transition-shadow relative">
        <div className="pointer-events-none">
          <CardHeader className="pb-0 px-3">
            <div className="flex gap-4 items-start">
              {market.imageUrl && (
                <div className="relative w-[45px] h-[45px] shrink-0 overflow-hidden rounded-md">
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
              <div className="flex-1 min-w-0 mt-0">
                <div className="flex justify-between items-start gap-2 mb-0">
                  <CardTitle className="text-lg line-clamp-2 mt-0">{market.question}</CardTitle>
                </div>
                <CardDescription className="text-gray-500 dark:text-gray-400">{formattedEndDate}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="py-1 px-3 flex-grow">
            {hasTopSubmarkets ? (
              <div className="space-y-1 py-3">
                {market.topSubmarkets!.map((submarket, index) => {
                  const outcomeName = submarket.groupItemTitle || submarket.question;
                  const outcomeId = `${market.id}-${outcomeName}`;
                  const isSelected = isBetInSlip(outcomeId);
                  const isFlashing = flashingOdds[outcomeId];
                  const isDisabled = isOddsExceedingLimit(submarket.probability);
                  return (
                    <Button 
                      key={index} 
                      variant={isSelected ? "outline" : "outline"}
                      className={`pointer-events-auto w-full justify-between py-2 h-12 mb-1 hover:bg-gray-50 dark:hover:bg-gray-800 group ${
                        isSelected ? 'bg-primary/10 border-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30' : ''
                      } ${isFlashing ? 'odds-changed' : ''} ${
                        isDisabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!isDisabled) {
                          handleBetClick({
                            name: outcomeName,
                            probability: submarket.probability
                          }, submarket.id);
                        }
                      }}
                      disabled={isDisabled}
                    >
                      <span className="text-sm truncate text-left">
                        {outcomeName}
                      </span>
                      <span className={`text-sm font-semibold ${
                        isDisabled ? 'text-gray-500 dark:text-gray-400' :
                        isSelected ? 'text-primary' :
                        currency === 'cash' ? 'text-[#0BC700] dark:text-[#0BC700] group-hover:text-[#0FE800] dark:group-hover:text-[#0FE800]' :
                        'text-[#E9ED05] dark:text-[#E9ED05] group-hover:text-[#FFDD33] dark:group-hover:text-[#FFDD33]'
                      } ${isFlashing ? 'odds-changed-text' : ''}`}>
                        {toAmericanOdds(submarket.probability)}
                      </span>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 py-3">
                {market.outcomes && market.outcomes.length > 0 ? (
                  <>
                    <div className="flex flex-col gap-1">
                      {market.outcomes.slice(0, 2).map((outcome, index) => {
                        const outcomeId = `${market.id}-${outcome.name}`;
                        const isSelected = isBetInSlip(outcomeId);
                        const isFlashing = flashingOdds[outcomeId];
                        const isDisabled = isOddsExceedingLimit(outcome.probability);
                        return (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm font-medium">{outcome.name}</span>
                            <Button 
                              variant={isSelected ? "outline" : "outline"}
                              className={`pointer-events-auto py-2 h-12 min-w-[100px] ${
                                isSelected ? 'bg-primary/10 border-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30' :
                                currency === 'cash' ? 'border-[#0BC700] text-[#0BC700] hover:bg-[#0BC700]/10 dark:border-[#0BC700] dark:text-[#0BC700] dark:hover:bg-[#0BC700]/20' :
                                'border-[#E9ED05] text-[#E9ED05] hover:bg-[#E9ED05]/10 dark:border-[#E9ED05] dark:text-[#E9ED05] dark:hover:bg-[#E9ED05]/20'
                              } ${isFlashing ? 'odds-changed' : ''} ${
                                isDisabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400' : ''
                              }`}
                              onClick={(e) => {
                                e.preventDefault();
                                if (!isDisabled) {
                                  handleBetClick(outcome);
                                }
                              }}
                              disabled={isDisabled}
                            >
                              <span className={isFlashing ? 'odds-changed-text' : ''}>
                                {toAmericanOdds(outcome.probability)}
                              </span>
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
                <div className="text-xs flex items-center text-gray-600 dark:text-gray-400">
                  <span>Details</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              )}
            </CardFooter>
          )}
        </div>
        
        <style jsx global>{`
          @keyframes odds-flash {
            0% { background-color: rgba(34, 197, 94, 0); }
            50% { background-color: rgba(34, 197, 94, 0.3); }
            100% { background-color: rgba(34, 197, 94, 0); }
          }
          
          .odds-changed {
            animation: odds-flash 1s ease-in-out;
          }
          
          @keyframes text-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          
          .odds-changed-text {
            animation: text-pulse 1s ease-in-out;
            display: inline-block;
          }
          
          /* Dark mode adjustments */
          .dark .odds-changed {
            animation-name: odds-flash-dark;
          }
          
          @keyframes odds-flash-dark {
            0% { background-color: rgba(34, 197, 94, 0); }
            50% { background-color: rgba(34, 197, 94, 0.2); }
            100% { background-color: rgba(34, 197, 94, 0); }
          }
        `}</style>
      </Card>
    </Link>
  );
} 