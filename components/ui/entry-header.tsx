import Image from "next/image";
import { FantasyMatchupEntry } from "@/lib/hooks/use-fantasy-matchup-entries";

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : odds.toString();
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

// Helper function to get connected parlay status badges
function getParlayStatusInfo(entry: FantasyMatchupEntry, specificPick: any, pickId: string | undefined) {
  // Only show parlay context if we're viewing a specific pick from a multi-pick entry
  if (!specificPick || !pickId || entry.picks.length <= 1) {
    return null;
  }

  const pickStatus = specificPick.status;
  const entryStatus = entry.status;
  const totalPicks = entry.picks.length;
  const wonPicks = entry.picks.filter((p: any) => p.status === 'won').length;
  const lostPicks = entry.picks.filter((p: any) => p.status === 'lost').length;
  const openPicks = entry.picks.filter((p: any) => p.status === 'submitted').length;

  // Create connected badges
  let pickBadge = { text: '', className: '' };
  let parlayBadge = { text: '', className: '' };

  // Pick status badge (left side with rounded left corners)
  if (pickStatus === 'won') {
    pickBadge = {
      text: 'Won',
      className: 'bg-[#0BC700]/20 text-[#0BC700] text-xs px-2 py-1 rounded-l-md font-medium border border-r-0 border-[#0BC700]/30'
    };
  } else if (pickStatus === 'lost') {
    pickBadge = {
      text: 'Lost',
      className: 'bg-[#DD3055]/20 text-[#DD3055] text-xs px-2 py-1 rounded-l-md font-medium border border-r-0 border-[#DD3055]/30'
    };
  } else {
    pickBadge = {
      text: 'Open',
      className: 'bg-[#F1D327]/20 text-[#F1D327] text-xs px-2 py-1 rounded-l-md font-medium border border-r-0 border-[#F1D327]/30'
    };
  }

  // Parlay status badge (right side with rounded right corners)
  if (entryStatus === 'won') {
    parlayBadge = {
      text: 'Parlay Won',
      className: 'bg-[#0BC700]/20 text-[#0BC700] text-xs px-2 py-1 rounded-r-md font-medium border border-l-0 border-[#0BC700]/30'
    };
  } else if (entryStatus === 'lost') {
    parlayBadge = {
      text: `Parlay Lost (${wonPicks}/${totalPicks})`,
      className: 'bg-[#DD3055]/20 text-[#DD3055] text-xs px-2 py-1 rounded-r-md font-medium border border-l-0 border-[#DD3055]/30'
    };
  } else {
    parlayBadge = {
      text: openPicks > 0 ? `Parlay Open (${openPicks} left)` : `Parlay Open (${wonPicks}/${totalPicks})`,
      className: 'bg-[#F1D327]/20 text-[#F1D327] text-xs px-2 py-1 rounded-r-md font-medium border border-l-0 border-[#F1D327]/30'
    };
  }

  return {
    pickBadge,
    parlayBadge
  };
}

interface EntryHeaderProps {
  entry: FantasyMatchupEntry;
  pickId?: string; // Optional pickId to show specific pick from parlay
}

export function EntryHeader({ entry, pickId }: EntryHeaderProps) {
  // If pickId is provided, find the specific pick and display as single pick
  const specificPick = pickId ? entry.picks.find(pick => pick.id === pickId) : null;
  
  // For parlays (when we have specificPick or multiple picks), always use entry odds
  // For single picks, use the pick's odds
  const odds = (specificPick || entry.picks.length > 1) ? entry.moneylineOdds : entry.picks[0]?.moneylineOdds;

  // Get entry title based on picks
  let entryTitle;
  let subtitleText;
  
  // Use specific pick if pickId is provided, otherwise use normal logic
  const displayPick = specificPick || entry.picks[0];
  
  if (specificPick || entry.picks.length === 1) {
    // Display as single pick
    if (displayPick?.pickType === 'moneyline') {
      const selectedTeam = displayPick.Teams.find(t => t.teamId === displayPick.selectedTeamId);
      entryTitle = selectedTeam?.name || 'Fantasy Matchup';
    } else if (displayPick?.pickType === 'spread') {
      const selectedTeam = displayPick.Teams.find(t => t.teamId === displayPick.selectedTeamId);
      const spread = displayPick.isSpreadPositive ? 
        `+${displayPick.pointSpread}` : 
        `-${Math.abs(displayPick.pointSpread)}`;
      entryTitle = `${selectedTeam?.name} ${spread}`;
    } else if (displayPick?.pickType === 'total') {
      entryTitle = `${displayPick.isOver ? 'Over' : 'Under'} ${displayPick.totalPoints}`;
    } else {
      entryTitle = 'Fantasy Matchup';
    }
    subtitleText = getPickTypeLabel(displayPick?.pickType || '').toUpperCase();
  } else {
    // Display as parlay
    entryTitle = `${entry.picks.length} Pick Parlay`;
    subtitleText = 'FANTASY';
  }

  // Define the odds color class based on isCash
  const oddsColorClass = entry.isCash ? "text-[#0BC700]" : "text-[#E9ED05]";

  // Get parlay status info if applicable
  const parlayStatusInfo = getParlayStatusInfo(entry, specificPick, pickId);

  return (
    <div className="bg-[#131415] text-white rounded-lg p-3">
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
        <div className="flex flex-col items-end">
          {parlayStatusInfo ? (
            <div className="flex">
              <div className={parlayStatusInfo.pickBadge.className}>
                {parlayStatusInfo.pickBadge.text}
              </div>
              <div className={parlayStatusInfo.parlayBadge.className}>
                {parlayStatusInfo.parlayBadge.text}
              </div>
            </div>
          ) : (
            (() => {
              const statusBadge = getStatusBadge(entry.status);
              return statusBadge ? (
                <div className={statusBadge.className}>
                  {statusBadge.text}
                </div>
              ) : null;
            })()
          )}
        </div>
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
  );
} 