"use client";

import { Card } from "@/components/ui/card";
import Image from "next/image";

type EntryStatus = "active" | "won" | "lost";

// Sample data structure
const sampleEntries = [
  {
    id: "1",
    date: "2024-03-20T15:30:00Z",
    status: "active" as EntryStatus,
    entry: 10.00,
    prize: 25.00,
    selections: [
      {
        id: "s1",
        marketQuestion: "Who will win the match?",
        outcomeName: "Team Liquid",
        odds: "+150",
        imageUrl: "/sample-team-1.jpg",
      }
    ]
  },
  {
    id: "2",
    date: "2024-03-19T18:00:00Z",
    status: "won" as EntryStatus,
    entry: 5.00,
    prize: 63.60,
    selections: [
      {
        id: "s2",
        marketQuestion: "Map 1 Winner",
        outcomeName: "Cloud9",
        odds: "+208",
        imageUrl: "/sample-team-2.jpg",
      },
      {
        id: "s3",
        marketQuestion: "Map 2 Total Rounds",
        outcomeName: "Over 25.5",
        odds: "+326",
        imageUrl: "/sample-map.jpg",
      },
      {
        id: "s4",
        marketQuestion: "First Blood Map 3",
        outcomeName: "FaZe Clan",
        odds: "-2198",
        imageUrl: "/sample-team-3.jpg",
      }
    ]
  }
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
}

function EntryCard({ entry }: { entry: typeof sampleEntries[0] }) {
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
          <span>+1272</span>
        </div>
      )}
    </Card>
  );
}

export default function EntriesPage() {
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
          {sampleEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </main>
  );
} 