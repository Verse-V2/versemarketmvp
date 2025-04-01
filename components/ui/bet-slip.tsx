"use client";

import React, { useState } from 'react';
import { useBetSlip } from '@/lib/bet-slip-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/lib/currency-context";

function americanToDecimal(odds: string): number {
  const value = parseInt(odds.replace(/[+\-]/, ''));
  if (odds.startsWith('+')) {
    return 1 + (value / 100);
  } else {
    // For negative odds
    return 1 + (100 / value);
  }
}

function decimalToAmerican(decimal: number): string {
  if (decimal >= 2) {
    const american = Math.round((decimal - 1) * 100);
    return `+${american}`;
  } else {
    const american = Math.round(-100 / (decimal - 1));
    return american.toString();
  }
}

function calculateCombinedOdds(bets: Array<{ odds: string }>): string {
  if (bets.length <= 1) return '';
  
  // Convert all American odds to decimal, multiply them together
  const combinedDecimal = bets.reduce((acc, bet) => {
    const decimal = americanToDecimal(bet.odds);
    return acc * decimal;
  }, 1);

  // Convert back to American odds
  const american = decimalToAmerican(combinedDecimal);
  
  // Format the result
  if (american.startsWith('-')) {
    return american;
  } else if (american.startsWith('+')) {
    return american;
  } else {
    return `+${american}`;
  }
}

export function BetSlip() {
  const { bets, removeBet, clearBets, hasConflictingBets, getConflictingMarkets } = useBetSlip();
  const { currency } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(false);
  const [entryAmount, setEntryAmount] = useState('');

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (bets.length === 0) {
    return null;
  }

  const conflictingBetsExist = hasConflictingBets();
  const conflictingMarkets = conflictingBetsExist ? getConflictingMarkets() : [];

  const calculatePrize = () => {
    if (!entryAmount || Number(entryAmount) <= 0 || bets.length === 0) {
      return '0.00';
    }

    const entry = Number(entryAmount);
    
    if (bets.length > 1) {
      // Use combined odds for multiple picks
      const combinedOdds = calculateCombinedOdds(bets);
      // Convert combined American odds to multiplier
      let multiplier = 1;
      if (combinedOdds.startsWith('+')) {
        const americanOdds = Number(combinedOdds.substring(1));
        multiplier = (americanOdds / 100) + 1;
      } else {
        const americanOdds = Math.abs(Number(combinedOdds));
        multiplier = (100 / americanOdds) + 1;
      }
      const prize = entry * multiplier;
      return prize.toFixed(2);
    } else {
      // Single pick calculation
      const bet = bets[0];
      let multiplier = 1;
      const odds = bet.odds;
      if (odds.startsWith('+')) {
        const americanOdds = Number(odds.substring(1));
        multiplier = (americanOdds / 100) + 1;
      } else {
        const americanOdds = Math.abs(Number(odds));
        multiplier = (100 / americanOdds) + 1;
      }
      const prize = entry * multiplier;
      return prize.toFixed(2);
    }
  };

  const ConflictWarning = () => (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Cannot combine multiple bets from the same event
          </p>
          <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            Please remove one of the following bets:
            <ul className="list-disc list-inside mt-1 space-y-1">
              {conflictingMarkets.map(market => (
                <li key={market.id} className="text-xs">
                  {market.question}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Bottom Sheet */}
      <div className={`
        fixed bottom-0 left-0 right-0 z-50 md:hidden
        ${!isExpanded ? 'pointer-events-none' : ''}
      `}>
        <div 
          className={`
            transform transition-transform duration-300 ease-in-out
            ${isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem)]'}
            bg-background rounded-t-xl shadow-lg border-t border-gray-200 dark:border-gray-800
            max-h-[85vh] flex flex-col
          `}
        >
          {/* Header */}
          <div 
            className={`
              flex items-center justify-between px-4 py-4 h-16 cursor-pointer shrink-0
              ${!isExpanded ? 'pointer-events-auto' : ''}
            `}
            onClick={toggleExpanded}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">Pick Slip</span>
              <span className="bg-[#0BC700] text-white rounded-full px-2.5 py-1 text-sm">
                {bets.length}
              </span>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </div>

          {/* Content */}
          <div className="px-4 pb-4 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-3">
              {conflictingBetsExist && <ConflictWarning />}
              
              {bets.map((bet) => (
                <Card key={bet.outcomeId} className="p-3">
                  <div className="flex items-start gap-3">
                    {bet.imageUrl && (
                      <div className="relative w-12 h-12 shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={bet.imageUrl}
                          alt={bet.marketQuestion}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-sm font-medium line-clamp-2">{bet.marketQuestion}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{bet.outcomeName}</p>
                        </div>
                        <button
                          onClick={() => removeBet(bet.outcomeId)}
                          className="shrink-0"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8" cy="8" r="7.5" stroke="#FF0000"/>
                            <path d="M5.25 8H10.75" stroke="#FF0000" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-sm font-medium">{bet.odds}</span>
                        <span className="text-xs text-gray-500">
                          {(bet.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Bottom Fixed Section */}
            <div className="mt-4 space-y-4 shrink-0">
              {bets.length > 1 && (
                <div className="text-sm text-muted-foreground">
                  {bets.length} leg combo ({calculateCombinedOdds(bets)})
                </div>
              )}

              {/* Entry and Prize Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="entry" className="text-sm font-medium">
                    Entry
                  </label>
                  <div className="relative">
                    <Input
                      id="entry"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0.00"
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      className="pl-8"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {currency === 'cash' ? '$' : '₡'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="prize" className="text-sm font-medium">
                    Prize
                  </label>
                  <div className="relative">
                    <Input
                      id="prize"
                      type="text"
                      value={calculatePrize()}
                      disabled
                      className="pl-8 bg-muted"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {currency === 'cash' ? '$' : '₡'}
                    </span>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full"
                disabled={conflictingBetsExist || !entryAmount || Number(entryAmount) <= 0}
              >
                Place Entry
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed right-4 bottom-4 w-80">
        <div className="bg-background rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col max-h-[calc(100vh-6rem)]">
          <div className="p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Pick Slip</span>
                <span className="bg-[#0BC700] text-white rounded-full px-2 py-0.5 text-sm">
                  {bets.length}
                </span>
              </div>
              <button
                onClick={clearBets}
                className="shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7.5" stroke="#808080"/>
                  <path d="M5.25 5.25L10.75 10.75M5.25 10.75L10.75 5.25" stroke="#808080" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mt-4 min-h-0">
              {conflictingBetsExist && <ConflictWarning />}
              
              {bets.map((bet) => (
                <Card key={bet.outcomeId} className="p-3">
                  <div className="flex items-start gap-3">
                    {bet.imageUrl && (
                      <div className="relative w-12 h-12 shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={bet.imageUrl}
                          alt={bet.marketQuestion}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-sm font-medium line-clamp-2">{bet.marketQuestion}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{bet.outcomeName}</p>
                        </div>
                        <button
                          onClick={() => removeBet(bet.outcomeId)}
                          className="shrink-0"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8" cy="8" r="7.5" stroke="#FF0000"/>
                            <path d="M5.25 8H10.75" stroke="#FF0000" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-sm font-medium">{bet.odds}</span>
                        <span className="text-xs text-gray-500">
                          {(bet.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Bottom Fixed Section */}
            <div className="mt-4 space-y-4 shrink-0">
              {bets.length > 1 && (
                <div className="text-sm text-muted-foreground">
                  {bets.length} leg combo ({calculateCombinedOdds(bets)})
                </div>
              )}

              {/* Entry and Prize Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="entry-desktop" className="text-sm font-medium">
                    Entry
                  </label>
                  <div className="relative">
                    <Input
                      id="entry-desktop"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0.00"
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      className="pl-8"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {currency === 'cash' ? '$' : '₡'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="prize-desktop" className="text-sm font-medium">
                    Prize
                  </label>
                  <div className="relative">
                    <Input
                      id="prize-desktop"
                      type="text"
                      value={calculatePrize()}
                      disabled
                      className="pl-8 bg-muted"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {currency === 'cash' ? '$' : '₡'}
                    </span>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full"
                disabled={conflictingBetsExist || !entryAmount || Number(entryAmount) <= 0}
              >
                Place Entry
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 