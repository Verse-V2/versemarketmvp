"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, X, Copy } from 'lucide-react';
import Image from 'next/image';

interface ConfirmationEntry {
  entry: number;
  prize: number;
  currency: 'cash' | 'coins';
  selections: Array<{
    id: string;
    marketQuestion: string;
    outcomeName: string;
    odds: string;
    imageUrl?: string;
  }>;
  entryId?: string;
  timestamp?: Date;
}

interface BetSlipConfirmationProps {
  entry: ConfirmationEntry;
  onClose: () => void;
  onViewEntries: () => void;
}

function americanToDecimal(odds: string): number {
  // Remove commas before parsing the number
  const value = parseInt(odds.replace(/[+\-,]/g, ''));
  
  if (odds.startsWith('+')) {
    const decimal = (value / 100) + 1;
    return decimal;
  } else {
    // For negative odds, we need to do: 1 + (100/abs(odds))
    const decimal = 1 + (100 / value);
    return decimal;
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

function calculateCombinedOdds(selections: Array<{ odds: string }>): string {
  if (selections.length <= 1) return '';
  
  // Convert all American odds to decimal, multiply them together
  const combinedDecimal = selections.reduce((acc, selection) => {
    const decimal = americanToDecimal(selection.odds);
    return acc * decimal;
  }, 1);

  // Convert back to American odds
  const american = decimalToAmerican(combinedDecimal);
  
  // Format the result
  let result;
  if (american.startsWith('-')) {
    result = american;
  } else if (american.startsWith('+')) {
    result = american;
  } else {
    result = `+${american}`;
  }
  
  return result;
}

export function BetSlipConfirmation({ entry, onClose, onViewEntries }: BetSlipConfirmationProps) {
  const CurrencyAmount = ({ amount }: { amount: number }) => (
    <div className="flex items-center gap-2">
      <Image
        src={entry.currency === 'cash' ? "/cash-icon.png" : "/verse-coin.png"}
        alt={entry.currency === 'cash' ? "Verse Cash" : "Verse Coin"}
        width={16}
        height={16}
        className="object-contain"
      />
      <span className="font-semibold">{amount.toFixed(2)}</span>
    </div>
  );

  const getCombinedOdds = () => {
    if (entry.selections.length <= 1) return entry.selections[0]?.odds || '';
    
    // Use proper combined odds calculation
    return calculateCombinedOdds(entry.selections);
  };

  return (
    <>
      {/* Mobile Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] md:hidden">
        <div className="bg-background shadow-lg border-t border-gray-200 dark:border-gray-800 max-h-[calc(85vh-64px)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 h-16 shrink-0 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-1">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-base text-green-600 dark:text-green-400">Entry Placed</span>
                <div className="flex items-center gap-1">
                  <Copy className="h-3 w-3 text-white" />
                  <span className="text-xs text-white">Copy Bet ID</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

                     {/* Content */}
           <div className="px-4 pb-4 pt-4 flex-1 overflow-y-auto space-y-4">
             {/* Selections */}
             <div className="space-y-3">
               {entry.selections.map((selection, index) => (
                 <Card key={selection.id} className="p-3">
                   <div className="flex items-start gap-3">
                     {selection.imageUrl && (
                       <div className="relative w-10 h-10 shrink-0 overflow-hidden rounded-md">
                         <Image
                           src={selection.imageUrl}
                           alt={selection.marketQuestion}
                           fill
                           sizes="40px"
                           className="object-cover"
                         />
                       </div>
                     )}
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium line-clamp-2">{selection.marketQuestion}</p>
                       <div className="flex justify-between items-center mt-1">
                         <p className="text-xs text-gray-500 dark:text-gray-400">{selection.outcomeName}</p>
                         <span className="text-sm font-medium">{selection.odds}</span>
                       </div>
                     </div>
                   </div>
                 </Card>
               ))}
             </div>

             {/* Entry Summary */}
             <div className="space-y-0">
               <div className="flex justify-between items-center py-3 border-b border-dotted border-gray-400 dark:border-gray-600">
                 <span className="text-sm text-muted-foreground">Entry</span>
                 <CurrencyAmount amount={entry.entry} />
               </div>
               <div className="flex justify-between items-center py-3 border-b border-dotted border-gray-400 dark:border-gray-600">
                 <span className="text-sm text-muted-foreground">Odds</span>
                 <span className="font-semibold">{getCombinedOdds()}</span>
               </div>
               <div className="flex justify-between items-center py-3 border-b border-dotted border-gray-400 dark:border-gray-600">
                 <span className="text-sm text-muted-foreground">To Win</span>
                 <div className="flex items-center gap-2">
                   <Image
                     src={entry.currency === 'cash' ? "/cash-icon.png" : "/verse-coin.png"}
                     alt={entry.currency === 'cash' ? "Verse Cash" : "Verse Coin"}
                     width={16}
                     height={16}
                     className="object-contain"
                   />
                   <span className="font-semibold text-green-600 dark:text-green-400">{(entry.prize - entry.entry).toFixed(2)}</span>
                 </div>
               </div>
               <div className="flex justify-between items-center py-3">
                 <span className="text-sm text-muted-foreground">Total Payout</span>
                 <div className="flex items-center gap-2">
                   <Image
                     src={entry.currency === 'cash' ? "/cash-icon.png" : "/verse-coin.png"}
                     alt={entry.currency === 'cash' ? "Verse Cash" : "Verse Coin"}
                     width={16}
                     height={16}
                     className="object-contain"
                   />
                   <span className="font-semibold text-green-600 dark:text-green-400">{entry.prize.toFixed(2)}</span>
                 </div>
               </div>
             </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button onClick={onViewEntries} className="w-full">
                View My Entries
              </Button>
              <Button onClick={onClose} variant="outline" className="w-full">
                Place Another Entry
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed right-4 bottom-[64px] w-96 z-[70]">
        <div className="bg-background shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col max-h-[calc(100vh-6rem)]">
          <div className="p-4 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-1">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-green-600 dark:text-green-400">Entry Placed</span>
                  <div className="flex items-center gap-1">
                    <Copy className="h-3 w-3 text-white" />
                    <span className="text-xs text-white">Copy Bet ID</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

                         <div className="mt-4 flex-1 overflow-y-auto space-y-4">
               {/* Selections */}
               <div className="space-y-3">
                 {entry.selections.map((selection, index) => (
                   <Card key={selection.id} className="p-3">
                     <div className="flex items-start gap-3">
                       {selection.imageUrl && (
                         <div className="relative w-10 h-10 shrink-0 overflow-hidden rounded-md">
                           <Image
                             src={selection.imageUrl}
                             alt={selection.marketQuestion}
                             fill
                             sizes="40px"
                             className="object-cover"
                           />
                         </div>
                       )}
                       <div className="flex-1 min-w-0">
                         <p className="text-sm font-medium line-clamp-2">{selection.marketQuestion}</p>
                         <div className="flex justify-between items-center mt-1">
                           <p className="text-xs text-gray-500 dark:text-gray-400">{selection.outcomeName}</p>
                           <span className="text-sm font-medium">{selection.odds}</span>
                         </div>
                       </div>
                     </div>
                   </Card>
                 ))}
               </div>

                                           {/* Entry Summary */}
               <div className="space-y-0">
                 <div className="flex justify-between items-center py-3 border-b border-dotted border-gray-400 dark:border-gray-600">
                   <span className="text-sm text-muted-foreground">Entry</span>
                   <CurrencyAmount amount={entry.entry} />
                 </div>
                 <div className="flex justify-between items-center py-3 border-b border-dotted border-gray-400 dark:border-gray-600">
                   <span className="text-sm text-muted-foreground">Odds</span>
                   <span className="font-semibold">{getCombinedOdds()}</span>
                 </div>
                 <div className="flex justify-between items-center py-3 border-b border-dotted border-gray-400 dark:border-gray-600">
                   <span className="text-sm text-muted-foreground">To win</span>
                   <div className="flex items-center gap-2">
                     <Image
                       src={entry.currency === 'cash' ? "/cash-icon.png" : "/verse-coin.png"}
                       alt={entry.currency === 'cash' ? "Verse Cash" : "Verse Coin"}
                       width={16}
                       height={16}
                       className="object-contain"
                     />
                     <span className="font-semibold text-green-600 dark:text-green-400">{(entry.prize - entry.entry).toFixed(2)}</span>
                   </div>
                 </div>
                 <div className="flex justify-between items-center py-3">
                   <span className="text-sm text-muted-foreground">Total payout</span>
                   <div className="flex items-center gap-2">
                     <Image
                       src={entry.currency === 'cash' ? "/cash-icon.png" : "/verse-coin.png"}
                       alt={entry.currency === 'cash' ? "Verse Cash" : "Verse Coin"}
                       width={16}
                       height={16}
                       className="object-contain"
                     />
                     <span className="font-semibold text-green-600 dark:text-green-400">{entry.prize.toFixed(2)}</span>
                   </div>
                 </div>
               </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <Button onClick={onViewEntries} className="w-full">
                  View My Entries
                </Button>
                <Button onClick={onClose} variant="outline" className="w-full">
                  Place Another Entry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 