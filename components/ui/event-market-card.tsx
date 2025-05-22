"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Market } from "@/lib/polymarket-api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useBetSlip } from "@/lib/bet-slip-context";
import { useEffect, useRef, useState } from "react";
import { useCurrency } from "@/lib/currency-context";
import { firebaseService } from '@/lib/firebase-service';
import { Config } from '@/lib/firebase-service';

interface EventMarketCardProps {
  market: Market;
  hideViewDetails?: boolean;
  hideComments?: boolean;
}

export function EventMarketCard({ market, hideViewDetails = false, hideComments = false }: EventMarketCardProps) {
  console.log('EventMarketCard received market data:', {
    marketsCount: market.marketsCount,
    topSubmarketsLength: market.topSubmarkets?.length,
    hasMultipleMarkets: market.marketsCount && market.marketsCount > 1,
  });

  const { addBet, removeBet, isBetInSlip } = useBetSlip();
  const previousOddsRef = useRef<Record<string, string>>({});
  const [flashingOdds, setFlashingOdds] = useState<Record<string, boolean>>({});
  const { currency } = useCurrency();
  const [maxOdds, setMaxOdds] = useState<number | undefined>(undefined);
  const [minOdds, setMinOdds] = useState<number | undefined>(undefined);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load odds limits from config
  useEffect(() => {
    const loadOddsLimits = async () => {
      const config = await firebaseService.getConfig() as Config | null;
      setMaxOdds(config?.safeguards?.maxPredictionOdds);
      setMinOdds(config?.safeguards?.minPredictionOdds);
    };
    loadOddsLimits();
  }, []);

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
      ? outcome.name.replace(/Will the |win the 2025 NBA Finals\?/g, '')
      : outcome.name;
    const outcomeId = `${market.id}-${outcomeName}`;
    
    console.log('Adding bet to slip:', {
      marketId: submarketId || market.id,
      eventId: market.id,
      marketQuestion: market.question,
      outcomeName,
      odds: toAmericanOdds(outcome.probability)
    });
    
    if (isBetInSlip(outcomeId)) {
      removeBet(outcomeId);
    } else {
      addBet({
        marketId: submarketId || market.id,
        eventId: market.id,
        marketQuestion: market.question,
        outcomeId,
        outcomeName: outcomeName,
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
        const outcomeName = submarket.groupItemTitle || submarket.question.replace(/Will the |win the 2025 NBA Finals\?/g, '');
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
  const hasMoreThanFourMarkets = hasTopSubmarkets && market.topSubmarkets!.length > 4;
  const displayedMarkets = isExpanded ? market.topSubmarkets : market.topSubmarkets?.slice(0, 4);

  return (
    <Link href={`/events/${market.id}`} className="block h-full">
      <Card className="h-full flex flex-col hover:shadow-md transition-shadow relative">
        <div className="pointer-events-none">
          <CardContent className="py-1 flex-grow">
            {hasTopSubmarkets ? (
              <div className="space-y-2">
                <div className={`space-y-2 transition-all duration-300 ease-in-out ${isExpanded ? '' : 'relative'}`}>
                  {displayedMarkets!.map((submarket, index) => {
                    const outcomeName = submarket.groupItemTitle || submarket.question.replace(/Will the |win the 2025 NBA Finals\?/g, '');
                    const outcomeId = `${market.id}-${outcomeName}`;
                    const isYesSelected = isBetInSlip(outcomeId);
                    const isNoSelected = isBetInSlip(outcomeId);
                    const isYesFlashing = flashingOdds[outcomeId];
                    const isNoFlashing = flashingOdds[outcomeId];
                    const isYesDisabled = isOddsExceedingLimit(submarket.probability);
                    const isNoDisabled = isOddsExceedingLimit(1 - submarket.probability);

                    return (
                      <div key={index} className="space-y-1">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {outcomeName}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant={isYesSelected ? "outline" : "outline"}
                            className={`pointer-events-auto flex-1 justify-between py-2 h-12 hover:bg-gray-50 dark:hover:bg-gray-800 group ${
                              isYesSelected ? 'bg-primary/10 border-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30' : ''
                            } ${isYesFlashing ? 'odds-changed' : ''} ${
                              isYesDisabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              if (!isYesDisabled) {
                                handleBetClick({
                                  name: `${outcomeName} - Yes`,
                                  probability: submarket.probability
                                }, submarket.id);
                              }
                            }}
                            disabled={isYesDisabled}
                          >
                            <span className="text-sm truncate text-left">
                              Yes
                            </span>
                            <span className={`text-sm font-semibold ${
                              isYesDisabled ? 'text-gray-500 dark:text-gray-400' :
                              isYesSelected ? 'text-primary' :
                              currency === 'cash' ? 'text-[#0BC700] dark:text-[#0BC700] group-hover:text-[#0FE800] dark:group-hover:text-[#0FE800]' :
                              'text-[#E9ED05] dark:text-[#E9ED05] group-hover:text-[#FFDD33] dark:group-hover:text-[#FFDD33]'
                            } ${isYesFlashing ? 'odds-changed-text' : ''}`}>
                              {toAmericanOdds(submarket.probability)}
                            </span>
                          </Button>
                          <Button 
                            variant={isNoSelected ? "outline" : "outline"}
                            className={`pointer-events-auto flex-1 justify-between py-2 h-12 hover:bg-gray-50 dark:hover:bg-gray-800 group ${
                              isNoSelected ? 'bg-primary/10 border-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30' : ''
                            } ${isNoFlashing ? 'odds-changed' : ''} ${
                              isNoDisabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              if (!isNoDisabled) {
                                handleBetClick({
                                  name: `${outcomeName} - No`,
                                  probability: 1 - submarket.probability
                                }, submarket.id);
                              }
                            }}
                            disabled={isNoDisabled}
                          >
                            <span className="text-sm truncate text-left">
                              No
                            </span>
                            <span className={`text-sm font-semibold ${
                              isNoDisabled ? 'text-gray-500 dark:text-gray-400' :
                              isNoSelected ? 'text-primary' :
                              currency === 'cash' ? 'text-[#0BC700] dark:text-[#0BC700] group-hover:text-[#0FE800] dark:group-hover:text-[#0FE800]' :
                              'text-[#E9ED05] dark:text-[#E9ED05] group-hover:text-[#FFDD33] dark:group-hover:text-[#FFDD33]'
                            } ${isNoFlashing ? 'odds-changed-text' : ''}`}>
                              {toAmericanOdds(1 - submarket.probability)}
                            </span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {!isExpanded && hasMoreThanFourMarkets && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-950 to-transparent pointer-events-none" />
                  )}
                </div>
                {hasMoreThanFourMarkets && (
                  <div className="relative pt-2">
                    <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent" />
                    <Button
                      variant="ghost"
                      className="pointer-events-auto w-full h-10 flex items-center justify-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsExpanded(!isExpanded);
                      }}
                    >
                      <span>
                        {isExpanded ? 'Show Less' : `Show ${market.topSubmarkets!.length - 4} More Markets`}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 transition-transform" />
                      ) : (
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
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
              {!hideViewDetails && (
                <Button variant="outline" size="sm" className="pointer-events-auto flex items-center gap-1">
                  <span>View Details</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
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

          /* Expand/collapse animations */
          .market-list-enter {
            max-height: 0;
            opacity: 0;
            overflow: hidden;
          }
          
          .market-list-enter-active {
            max-height: 1000px;
            opacity: 1;
            transition: all 300ms ease-in-out;
          }
          
          .market-list-exit {
            max-height: 1000px;
            opacity: 1;
            overflow: hidden;
          }
          
          .market-list-exit-active {
            max-height: 0;
            opacity: 0;
            transition: all 300ms ease-in-out;
          }
        `}</style>
      </Card>
    </Link>
  );
} 