import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ChevronUp, ChevronDown, Send } from "lucide-react";
import { useState } from "react";
import { ShareDialog } from "@/components/ui/share-dialog";
import { Timestamp } from 'firebase/firestore';
import { PolymarketEntry } from "@/lib/hooks/use-polymarket-entries";

function formatDate(timestamp: Timestamp) {
  return timestamp.toDate().toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
}

// Helper function to capitalize Yes/No outcomes
function capitalizeOutcome(outcome: string | undefined | null): string {
  if (!outcome) return '';
  const lowerOutcome = outcome.toLowerCase();
  if (lowerOutcome === 'yes' || lowerOutcome === 'no') {
    return lowerOutcome.charAt(0).toUpperCase() + lowerOutcome.slice(1);
  }
  return outcome;
}

export default function EntryCard({ entry }: { entry: PolymarketEntry }) {
  const [showLegs, setShowLegs] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const odds = entry.picks.length > 1 ? entry.moneylineOdds : entry.picks[0]?.moneylineOdds;

  // Get entry title based on picks
  const entryTitle = entry.picks.length > 1 
    ? `${entry.picks.length} Pick Parlay` 
    : (entry.picks[0]?.eventTitle || entry.picks[0]?.question || 'Prediction');

  // Define the odds color class based on isCash
  const oddsColorClass = entry.isCash ? "text-[#0BC700]" : "text-[#FFCC00]";

  return (
    <Card className="bg-[#131415] text-white overflow-hidden p-0 rounded-lg flex flex-col">
      {/* Share Dialog */}
      <ShareDialog 
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        entryId={entry.id}
        entryTitle={entryTitle}
        selections={entry.picks.map(pick => ({
          id: pick.id,
          marketQuestion: pick.eventTitle || pick.question || '',
          outcomeName: pick.outcome || pick.selectedOutcome || '',
          odds: pick.moneylineOdds || pick.outcomePrices,
          imageUrl: pick.imageUrl || '' // Use the fetched image URL
        }))}
        entry={{
          entry: entry.wager,
          prize: entry.totalPayout,
          date: entry.createdAt.toDate().toISOString()
        }}
      />
      
      {/* Header */}
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="flex items-center gap-2">
              {entry.picks.length > 1 ? (
                <h3 className="text-base font-semibold m-0">
                  {entry.picks.length} Pick Parlay
                </h3>
              ) : (
                <h3 className="text-base font-semibold m-0">
                  {capitalizeOutcome(entry.picks[0]?.outcome || entry.picks[0]?.selectedOutcome)}
                </h3>
              )}
              <span className={`text-base ${oddsColorClass}`}>{odds}</span>
            </div>
            <p className="text-xs text-gray-400 uppercase">PREDICTION</p>
          </div>
          <Button variant="outline" className="bg-[#FFCC00] text-black hover:bg-[#FFDD33] border-0 dark:bg-[#FFCC00] dark:text-black dark:hover:bg-[#FFDD33]">
            Open
          </Button>
        </div>

        <div className="flex items-center gap-3 -mb-1">
          <Image
            src="/cash-icon.png"
            alt="Verse Cash"
            width={20}
            height={20}
            className="object-contain"
          />
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs">WAGER</span>
            <span className={oddsColorClass}>
              ${entry.wager.toFixed(2)}
            </span>
            <span className="text-xs">•</span>
            <span className="text-xs">TO PAY</span>
            <span className={oddsColorClass}>
              ${entry.totalPayout.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Picks */}
      {showLegs && (
        <div className="border-t border-[#2A2A2D]">
          {entry.picks.map((pick, index) => (
            <div 
              key={pick.id}
              className="px-4 py-2 border-b border-[#2A2A2D] last:border-b-0 relative"
            >
              {/* Dotted line */}
              {index < entry.picks.length - 1 && (
                <div 
                  className="absolute left-[1.45rem] top-[2.25rem] bottom-0 w-[2px] border-l-2 border-dotted border-gray-600"
                  style={{ height: 'calc(100% - 1rem)' }}
                />
              )}
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-600 shrink-0" />
                    <h4 className="text-base font-semibold">
                      {capitalizeOutcome(pick.outcome || pick.selectedOutcome)}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-400 ml-7">
                    {pick.eventTitle || (pick.question ? pick.question.split(' - ')[0] : '')}
                  </p>
                  <div className="flex items-center gap-3 ml-7">
                    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-[#2A2A2D]">
                      {pick.imageUrl && (
                        <Image
                          src={pick.imageUrl}
                          alt={pick.eventTitle || "Event"}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span className="text-sm">{capitalizeOutcome(pick.marketTitle || pick.selectedOutcome)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-base ${oddsColorClass}`}>{pick.moneylineOdds || pick.outcomePrices}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legs Toggle Section */}
      <div className="flex items-center justify-between px-4 h-7 border-t border-[#2A2A2D]">
        <button 
          onClick={() => setShowLegs(!showLegs)}
          className="flex items-center text-gray-400 hover:text-white text-xs focus:outline-none"
        >
          {showLegs ? "Hide Legs" : "Show Legs"}
          {showLegs ? (
            <ChevronUp className="ml-1 h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          )}
        </button>
        <span className="text-xs text-gray-400">{entry.picks.length} selections</span>
      </div>

      {/* Footer */}
      <div className="bg-[#1C1D1E]">
        <div className="px-4 py-2 border-t border-[#2A2A2D] flex items-center justify-between">
          <div className="text-sm text-gray-400">
            <span className="text-xs hidden md:inline">Bet ID: {entry.id}</span>
            <span className="text-xs hidden md:inline mx-2">•</span>
            <span className="text-xs">{formatDate(entry.createdAt)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`${oddsColorClass} hover:text-opacity-80 h-7 w-7`}
            onClick={() => setShowShareDialog(true)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
} 