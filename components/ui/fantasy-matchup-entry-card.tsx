import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ChevronUp, ChevronDown, Send } from "lucide-react";
import { useState } from "react";
import { ShareDialog } from "@/components/ui/share-dialog";
import { Timestamp } from 'firebase/firestore';
import { FantasyMatchupEntry } from "@/lib/hooks/use-fantasy-matchup-entries";
import { useRouter } from "next/navigation";

function formatDate(timestamp: Timestamp) {
  return timestamp.toDate().toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
}

function getPickTypeLabel(pickType: string) {
  switch (pickType) {
    case 'spread':
      return 'Spread';
    case 'moneyline':
      return 'Moneyline';
    case 'total':
      return 'Total';
    default:
      return pickType;
  }
}

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : odds.toString();
}

// Helper function to get status badge styling and text
function getStatusBadge(status: string) {
  switch (status) {
    case 'won':
      return { 
        text: 'Won', 
        className: 'bg-[#0BC700]/20 text-[#0BC700] text-xs px-2 py-1 rounded-md font-medium' 
      };
    case 'lost':
      return { 
        text: 'Lost', 
        className: 'bg-[#DD3055]/20 text-[#DD3055] text-xs px-2 py-1 rounded-md font-medium' 
      };
    case 'submitted':
      return { 
        text: 'Open', 
        className: 'bg-[#F1D327]/20 text-[#F1D327] text-xs px-2 py-1 rounded-md font-medium' 
      };
    default:
      return null;
  }
}

function FantasyMatchupEntryCard({ entry }: { entry: FantasyMatchupEntry }) {
  const [showLegs, setShowLegs] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const odds = entry.picks.length > 1 ? entry.moneylineOdds : entry.picks[0]?.moneylineOdds;
  const router = useRouter();

  // Get entry title based on picks
  let entryTitle;
  if (entry.picks.length > 1) {
    entryTitle = `${entry.picks.length} Pick Parlay`;
  } else {
    const pick = entry.picks[0];
    if (pick?.pickType === 'moneyline') {
      const selectedTeam = pick.Teams.find(t => t.teamId === pick.selectedTeamId);
      entryTitle = selectedTeam?.name || 'Fantasy Matchup';
    } else if (pick?.pickType === 'spread') {
      const selectedTeam = pick.Teams.find(t => t.teamId === pick.selectedTeamId);
      const spread = pick.isSpreadPositive ? 
        `+${pick.pointSpread}` : 
        `-${Math.abs(pick.pointSpread)}`;
      entryTitle = `${selectedTeam?.name} ${spread}`;
    } else if (pick?.pickType === 'total') {
      entryTitle = `${pick.isOver ? 'Over' : 'Under'} ${pick.totalPoints}`;
    } else {
      entryTitle = 'Fantasy Matchup';
    }
  }

  // Get subtitle text
  const subtitleText = entry.picks.length > 1 
    ? 'FANTASY' 
    : getPickTypeLabel(entry.picks[0]?.pickType || '').toUpperCase();

  // Define the odds color class based on isCash
  const oddsColorClass = entry.isCash ? "text-[#0BC700]" : "text-[#E9ED05]";

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
          marketQuestion: `${pick.Teams[0].name} vs ${pick.Teams[1].name}`,
          outcomeName: pick.Teams.find(t => t.teamId === pick.selectedTeamId)?.name || '',
          odds: pick.moneylineOdds.toString(),
          imageUrl: pick.Teams.find(t => t.teamId === pick.selectedTeamId)?.logoUrl || ''
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
              <h3 className="text-base font-semibold m-0">
                {entryTitle}
              </h3>
              <span className={`text-base ${oddsColorClass}`}>{formatOdds(odds)}</span>
            </div>
            <p className="text-xs text-gray-400 uppercase">{subtitleText}</p>
          </div>
          {/* Status Badge */}
          {(() => {
            const statusBadge = getStatusBadge(entry.status);
            return statusBadge ? (
              <div className={statusBadge.className}>
                {statusBadge.text}
              </div>
            ) : null;
          })()}
        </div>

        <div className="flex items-center gap-3 -mb-1">
          <Image
            src={entry.isCash ? "/cash-icon.png" : "/verse-coin.png"}
            alt={entry.isCash ? "Verse Cash" : "Verse Coin"}
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
          {entry.picks.map((pick, index) => {
            const selectedTeam = pick.Teams.find(t => t.teamId === pick.selectedTeamId);
            const opponentTeam = pick.Teams.find(t => t.teamId !== pick.selectedTeamId);
            // Construct matchupId for navigation
            const matchupId = `${pick.leagueId}-${pick.seasonWeek}-${pick.Teams[0].teamId}-${pick.Teams[1].teamId}`;
            
            return (
              <div 
                key={pick.id}
                className="px-4 py-2 border-b border-[#2A2A2D] last:border-b-0 relative cursor-pointer"
                onClick={() => router.push(`/matchupViewLive?id=${matchupId}&entryId=${entry.id}&pickId=${pick.id}`)}
              >
                {/* Dotted line */}
                {index < entry.picks.length - 1 && (
                  <div 
                    className="absolute left-[1.45rem] top-[2.25rem] bottom-0 w-[2px] border-l-2 border-dotted border-gray-600"
                    style={{ height: 'calc(100% - 1rem)' }}
                  />
                )}
                <div className="flex items-start justify-between">
                  {entry.picks.length > 1 ? (
                    // Parlay view
                    <div className="w-full">
                      <div className="w-full">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-4 h-4 md:w-4 md:h-4 w-3 h-3 rounded-full border-2 border-gray-600 shrink-0" />
                          <h4 className="text-base md:text-base text-sm font-semibold flex-1">
                            {pick.pickType === 'total' ? (
                              `${pick.isOver ? 'Over' : 'Under'} ${pick.totalPoints}`
                            ) : (
                              <>
                                {selectedTeam?.name}
                                {pick.pickType === 'spread' && (
                                  <span>
                                    {' '}
                                    {pick.isSpreadPositive ? '+' : '-'}
                                    {Math.abs(pick.pointSpread)}
                                  </span>
                                )}
                              </>
                            )}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-400 mb-2 ml-7 md:ml-7 ml-6">
                          {getPickTypeLabel(pick.pickType)}
                        </p>
                        <div className="flex w-full">
                          <div className="w-4 md:w-4 w-3 shrink-0" />
                          <div className="bg-[#0D0D0E] rounded-lg p-2 flex-1 mr-[-40px]">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3 md:gap-3 gap-2">
                                <div className="relative md:w-6 md:h-6 w-5 h-5 rounded-full overflow-hidden bg-[#2A2A2D]">
                                  {selectedTeam?.logoUrl && (
                                    <Image
                                      src={selectedTeam.logoUrl}
                                      alt={selectedTeam.name}
                                      fill
                                      className="object-cover"
                                    />
                                  )}
                                </div>
                                <span className="text-base md:text-base text-sm font-semibold">{selectedTeam?.name}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 md:gap-3 gap-2">
                                <div className="relative md:w-6 md:h-6 w-5 h-5 rounded-full overflow-hidden bg-[#2A2A2D]">
                                  {opponentTeam?.logoUrl && (
                                    <Image
                                      src={opponentTeam.logoUrl}
                                      alt={opponentTeam.name}
                                      fill
                                      className="object-cover"
                                    />
                                  )}
                                </div>
                                <span className="text-base md:text-base text-sm font-semibold">{opponentTeam?.name}</span>
                              </div>
                              <span className="text-xs text-gray-400 pr-1">Week {pick.seasonWeek}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Single pick view
                    <div className="flex-1">
                      <div className="bg-[#0D0D0E] rounded-lg p-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 md:gap-3 gap-2">
                            <div className="relative md:w-6 md:h-6 w-5 h-5 rounded-full overflow-hidden bg-[#2A2A2D]">
                              {selectedTeam?.logoUrl && (
                                <Image
                                  src={selectedTeam.logoUrl}
                                  alt={selectedTeam.name}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <span className="text-base md:text-base text-sm font-semibold">{selectedTeam?.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 md:gap-3 gap-2">
                            <div className="relative md:w-6 md:h-6 w-5 h-5 rounded-full overflow-hidden bg-[#2A2A2D]">
                              {opponentTeam?.logoUrl && (
                                <Image
                                  src={opponentTeam.logoUrl}
                                  alt={opponentTeam.name}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <span className="text-base md:text-base text-sm font-semibold">{opponentTeam?.name}</span>
                          </div>
                          <span className="text-xs text-gray-400 pr-1">Week {pick.seasonWeek}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-2">
                    {entry.picks.length > 1 && (
                      <span className={`text-base ${oddsColorClass}`}>{formatOdds(pick.moneylineOdds)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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

export default FantasyMatchupEntryCard; 