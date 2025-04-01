"use client";

import { Card } from "@/components/ui/card";
import Image from "next/image";
import { useEntries, type EntryStatus } from "@/lib/entries-context";

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
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
}

function EntryCard({ entry }: { entry: ReturnType<typeof useEntries>["state"]["entries"][0] }) {
  const statusColors: Record<EntryStatus, string> = {
    active: "bg-blue-500",
    won: "bg-[#0BC700]",
    lost: "bg-red-500"
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {formatDate(entry.date)}
          </span>
          <span className={`${statusColors[entry.status]} text-white text-xs px-2 py-0.5 rounded-full capitalize`}>
            {entry.status}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">${entry.prize.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">
            ${entry.entry.toFixed(2)} Entry
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {entry.selections.map((selection) => (
          <div key={selection.id} className="flex items-start gap-3">
            {selection.imageUrl && (
              <div className="relative w-12 h-12 shrink-0 overflow-hidden rounded-md">
                <Image
                  src={selection.imageUrl}
                  alt={selection.marketQuestion}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">
                {selection.marketQuestion}
              </p>
              <div className="mt-1 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {selection.outcomeName}
                </span>
                <span className="text-sm font-medium">
                  {selection.odds}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {entry.selections.length > 1 && (
        <div className="text-sm text-muted-foreground flex justify-between items-center pt-2 border-t">
          <span>{entry.selections.length} leg combo</span>
          <span>{calculateCombinedOdds(entry.selections)}</span>
        </div>
      )}
    </Card>
  );
}

export default function EntriesPage() {
  const { state } = useEntries();

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto p-6 pb-24">
        <div className="space-y-1.5 mb-6">
          <h1 className="text-lg font-semibold">My Entries</h1>
          <p className="text-sm text-muted-foreground">
            View your active and settled entries
          </p>
        </div>

        <div className="space-y-4">
          {state.entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No entries yet. Place your first bet to get started!
            </div>
          ) : (
            state.entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>
    </main>
  );
} 