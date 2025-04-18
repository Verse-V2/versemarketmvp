"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useEntries } from "@/lib/entries-context";
import { ChevronUp, ChevronDown, Send } from "lucide-react";
import { useState } from "react";
import { ShareDialog } from "@/components/ui/share-dialog";
import { Header } from "@/components/ui/header";
import { useCurrency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function americanToDecimal(odds: string): number {
  const value = parseInt(odds.replace(/[+\-,]/g, ''));
  if (odds.startsWith('+')) {
    return (value / 100) + 1;
  } else {
    return 1 + (100 / value);
  }
}

function decimalToAmerican(decimal: number): string {
  if (decimal <= 2) {
    const americanOdds = Math.round(-100 / (decimal - 1));
    return americanOdds.toString();
  } else {
    const americanOdds = Math.round((decimal - 1) * 100);
    return `+${americanOdds}`;
  }
}

function calculateCombinedOdds(selections: Array<{ odds: string }>): string {
  if (selections.length <= 1) return '';
  
  const combinedDecimal = selections.reduce((acc, selection) => {
    const decimal = americanToDecimal(selection.odds);
    return acc * decimal;
  }, 1);

  const american = decimalToAmerican(combinedDecimal);
  return american.startsWith('+') ? american : `+${american}`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
}

function EntryCard({ entry }: { entry: ReturnType<typeof useEntries>["state"]["entries"][0] }) {
  const [showLegs, setShowLegs] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const odds = entry.selections.length > 1 ? calculateCombinedOdds(entry.selections) : entry.selections[0]?.odds;

  // Get entry title based on selections
  const entryTitle = entry.selections.length > 1 
    ? `${entry.selections.length} Pick Parlay` 
    : entry.selections[0]?.marketQuestion || 'Prediction';

  return (
    <Card className="bg-[#131415] text-white overflow-hidden p-0 rounded-lg flex flex-col">
      {/* Share Dialog */}
      <ShareDialog 
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        entryId={entry.id}
        entryTitle={entryTitle}
        selections={entry.selections}
        entry={{
          entry: entry.entry,
          prize: entry.prize,
          date: entry.date
        }}
      />
      
      {/* Header */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="flex items-center gap-2">
              {entry.selections.length > 1 ? (
                <h3 className="text-lg font-semibold m-0">
                  {entry.selections.length} Pick Parlay
                </h3>
              ) : (
                <h3 className="text-lg font-semibold m-0">
                  {entry.selections[0]?.outcomeName.toLowerCase().includes('no') ? 'No' : 'Yes'}
                </h3>
              )}
              <span className={`text-lg ${entry.currency === 'cash' ? 'text-[#0BC700]' : 'text-[#FFCC00]'}`}>{odds}</span>
            </div>
            <p className="text-sm text-gray-400 uppercase">PREDICTION</p>
          </div>
          <Button variant="outline" className="bg-[#FFCC00] text-black hover:bg-[#FFDD33] border-0 dark:bg-[#FFCC00] dark:text-black dark:hover:bg-[#FFDD33]">
            Open
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Image
            src={entry.currency === 'cash' ? "/cash-icon.png" : "/verse-coin.png"}
            alt={entry.currency === 'cash' ? "Verse Cash" : "Verse Coin"}
            width={24}
            height={24}
            className="object-contain"
          />
          <div className="flex items-center gap-2 text-gray-400">
            <span>WAGER</span>
            <span className={`text-white ${entry.currency === 'cash' ? 'text-[#0BC700]' : 'text-[#FFCC00]'}`}>
              {entry.currency === 'cash' ? '$' : '₡'}{entry.entry.toFixed(2)}
            </span>
            <span>•</span>
            <span>TO PAY</span>
            <span className={`text-white ${entry.currency === 'cash' ? 'text-[#0BC700]' : 'text-[#FFCC00]'}`}>
              {entry.currency === 'cash' ? '$' : '₡'}{entry.prize.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Selections */}
      {showLegs && (
        <div className="border-t border-[#2A2A2D]">
          {entry.selections.map((selection, index) => (
            <div 
              key={selection.id}
              className="px-4 py-3 border-b border-[#2A2A2D] last:border-b-0 relative"
            >
              {/* Dotted line */}
              {index < entry.selections.length - 1 && (
                <div 
                  className="absolute left-[1.45rem] top-[2.25rem] bottom-0 w-[2px] border-l-2 border-dotted border-gray-600"
                  style={{ height: 'calc(100% - 1rem)' }}
                />
              )}
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-600 shrink-0" />
                    <h4 className="text-lg font-semibold">
                      {selection.outcomeName.toLowerCase().includes('no') ? 'No' : 'Yes'}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-400 ml-8">
                    {selection.marketQuestion.split(' - ')[0]}
                  </p>
                  <div className="flex items-center gap-3 ml-8">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#2A2A2D]">
                      {selection.imageUrl && (
                        <Image
                          src={selection.imageUrl}
                          alt={selection.marketQuestion}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span>{selection.outcomeName}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-lg">{selection.odds}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legs Toggle Section */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-[#2A2A2D] h-8">
        <button 
          onClick={() => setShowLegs(!showLegs)}
          className="flex items-center text-gray-400 hover:text-white text-sm focus:outline-none"
        >
          {showLegs ? "Hide Legs" : "Show Legs"}
          {showLegs ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
          )}
        </button>
        <span className="text-xs text-gray-400">{entry.selections.length} selections</span>
      </div>

      {/* Footer */}
      <div className="bg-[#1C1D1E]">
        <div className="px-4 py-2 border-t border-[#2A2A2D] flex items-center justify-between">
          <div className="text-sm text-gray-400">
            <span>Bet ID: {entry.id}</span>
            <span className="mx-2">•</span>
            <span>{formatDate(entry.date)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#0BC700] hover:text-[#0FE800] h-7 w-7"
            onClick={() => setShowShareDialog(true)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function EntriesPage() {
  const { state } = useEntries();
  const { currency } = useCurrency();
  const user = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    }
  }, [user, router]);

  // If not authenticated, show nothing while redirecting
  if (!user) {
    return null;
  }

  // Filter entries based on current currency
  const filteredEntries = state.entries.filter(entry => entry.currency === currency);

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-2xl mx-auto p-6 pb-24">
        <div className="space-y-1.5 mb-6">
          <h1 className="text-lg font-semibold">My Entries</h1>
          <p className="text-sm text-muted-foreground">
            View your active and settled entries
          </p>
        </div>

        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No {currency} entries yet. Place your first bet to get started!
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>
    </main>
  );
} 