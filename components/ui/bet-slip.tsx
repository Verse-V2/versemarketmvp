"use client";

import React, { useState } from 'react';
import { useBetSlip } from '@/lib/bet-slip-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/lib/currency-context";
import { useEntries } from "@/lib/entries-context";
import { useRouter } from "next/navigation";

function americanToDecimal(odds: string): number {
  // Remove commas before parsing the number
  const value = parseInt(odds.replace(/[+\-,]/g, ''));
  if (odds.startsWith('+')) {
    return (value / 100) + 1;
  } else {
    // For negative odds, we need to do: 1 + (100/abs(odds))
    // Example: -2198 should become 1.0455 (not 51!)
    return 1 + (100 / value);
  }
}

function decimalToAmerican(decimal: number): string {
  // For decimal odds like 13.72 (from our example), we want +1272
  // The formula is different depending on whether the resulting American odds should be positive or negative
  const decimalOdds = decimal;
  
  if (decimalOdds <= 2) {
    // Negative American odds
    const americanOdds = Math.round(-100 / (decimalOdds - 1));
    return americanOdds.toString();
  } else {
    // Positive American odds
    const americanOdds = Math.round((decimalOdds - 1) * 100);
    return `+${americanOdds}`;
  }
}

function calculateCombinedOdds(bets: Array<{ odds: string }>): string {
  if (bets.length <= 1) return '';
  
  console.log('Starting odds calculation for bets:', bets.map(b => b.odds).join(', '));
  
  // Convert all American odds to decimal, multiply them together
  const combinedDecimal = bets.reduce((acc, bet) => {
    const decimal = americanToDecimal(bet.odds);
    console.log(`Converting ${bet.odds} to decimal: ${decimal}`);
    console.log(`Current accumulator: ${acc} * ${decimal} = ${acc * decimal}`);
    return acc * decimal;
  }, 1);

  console.log('Final combined decimal odds:', combinedDecimal);

  // Convert back to American odds
  const american = decimalToAmerican(combinedDecimal);
  console.log('Converted back to American odds:', american);
  
  // Format the result
  let result;
  if (american.startsWith('-')) {
    result = american;
  } else if (american.startsWith('+')) {
    result = american;
  } else {
    result = `+${american}`;
  }
  
  console.log('Final formatted result:', result);
  return result;
}

export function BetSlip() {
  const { bets, removeBet, clearBets, hasConflictingBets, getConflictingMarkets } = useBetSlip();
  const { currency } = useCurrency();
  const { addEntry } = useEntries();
  const router = useRouter();
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

  const handlePlaceBets = () => {
    if (!entryAmount || Number(entryAmount) <= 0 || bets.length === 0) {
      return;
    }

    const entry = Number(entryAmount);
    const prize = Number(calculatePrize());

    addEntry({
      entry,
      prize,
      selections: bets.map(bet => ({
        id: bet.outcomeId,
        marketQuestion: bet.marketQuestion,
        outcomeName: bet.outcomeName,
        odds: bet.odds,
        imageUrl: bet.imageUrl
      }))
    });

    clearBets();
    setEntryAmount('');
    router.push('/my-entries');
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
        fixed bottom-0 left-0 right-0 z-[60] md:hidden
        ${!isExpanded ? 'pointer-events-none' : ''}
      `}>
        <div 
          className={`
            transform transition-transform duration-300 ease-in-out
            ${isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-4rem)]'}
            bg-background shadow-lg border-t border-gray-200 dark:border-gray-800
            max-h-[calc(85vh-64px)] flex flex-col
          `}
        >
          {/* Header */}
          <div 
            className={`
              flex items-center justify-between px-4 py-2 h-16 cursor-pointer shrink-0
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
          <div className={`
            px-4 pb-4 flex-1 overflow-hidden flex flex-col min-h-0
            ${isExpanded ? 'opacity-100' : 'opacity-0'}
            transition-opacity duration-200
          `}>
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
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium line-clamp-2 flex-1">{bet.marketQuestion}</p>
                        <button
                          onClick={() => removeBet(bet.outcomeId)}
                          className="shrink-0 ml-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8" cy="8" r="7.5" stroke="#FF0000"/>
                            <path d="M5.25 8H10.75" stroke="#FF0000" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{bet.outcomeName}</p>
                        <span className="text-sm font-medium">{bet.odds}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {bets.length > 0 && (
              <div className="mt-4 space-y-3">
                {bets.length > 1 && (
                  <div className="text-sm text-muted-foreground flex justify-between items-center">
                    <span>{bets.length} leg combo</span>
                    <span>{calculateCombinedOdds(bets)}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Entry
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder={`Enter ${currency === 'cash' ? 'Cash' : 'Coins'}`}
                        value={entryAmount}
                        onChange={(e) => setEntryAmount(e.target.value)}
                        className="text-right pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currency === 'cash' ? '$' : '₡'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Prize
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={`${calculatePrize()}`}
                        readOnly
                        disabled
                        className="text-right pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currency === 'cash' ? '$' : '₡'}
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  disabled={!entryAmount || Number(entryAmount) <= 0 || conflictingBetsExist}
                  onClick={handlePlaceBets}
                >
                  Place Entry
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed right-4 bottom-[64px] w-96">
        <div className="bg-background shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col max-h-[calc(100vh-6rem)]">
          <div className="p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Pick Slip</span>
                <span className="bg-[#0BC700] text-white rounded-full px-2.5 py-1 text-sm">
                  {bets.length}
                </span>
              </div>
              {bets.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearBets}>
                  Clear
                </Button>
              )}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3">
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
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium line-clamp-2 flex-1">{bet.marketQuestion}</p>
                        <button
                          onClick={() => removeBet(bet.outcomeId)}
                          className="shrink-0 ml-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8" cy="8" r="7.5" stroke="#FF0000"/>
                            <path d="M5.25 8H10.75" stroke="#FF0000" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{bet.outcomeName}</p>
                        <span className="text-sm font-medium">{bet.odds}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {bets.length > 0 && (
              <div className="mt-4 space-y-3">
                {bets.length > 1 && (
                  <div className="text-sm text-muted-foreground flex justify-between items-center">
                    <span>{bets.length} leg combo</span>
                    <span>{calculateCombinedOdds(bets)}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Entry
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder={`Enter ${currency === 'cash' ? 'Cash' : 'Coins'}`}
                        value={entryAmount}
                        onChange={(e) => setEntryAmount(e.target.value)}
                        className="text-right pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currency === 'cash' ? '$' : '₡'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Prize
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={`${calculatePrize()}`}
                        readOnly
                        disabled
                        className="text-right pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currency === 'cash' ? '$' : '₡'}
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  disabled={!entryAmount || Number(entryAmount) <= 0 || conflictingBetsExist}
                  onClick={handlePlaceBets}
                >
                  Place Entry
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 