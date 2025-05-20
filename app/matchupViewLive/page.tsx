'use client';

import { useSearchParams } from 'next/navigation';
import { Header } from "@/components/ui/header";
import Image from "next/image";
import { useEffect, useState } from "react";
import { firebaseService } from "@/lib/firebase-service";
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import type { FantasyMatchupEntry, FantasyMatchupPick, FantasyMatchupTeam } from '@/lib/hooks/use-fantasy-matchup-entries';

// Helper function to ensure image URLs are safe
const safeImage = (url?: string | null) =>
  !url ||
  (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/'))
    ? '/league-logos/generic-league-logo.svg'
    : url;

interface Player {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  team: string;
  position: string;
  points: number;
  projectedPoints: number;
  status: 'Scheduled' | 'InProgress' | 'Final';
  lastGameStats?: string;
  gameStats?: string;
  imageUrl?: string;
  gameResult?: string;
}

interface TeamData {
  id: string;
  teamName: string;
  owner: string;
  logoUrl: string;
  points: number;
  projectedPoints: number;
  winProbability?: number;
  moneylineOdds?: number;
}

// Add type for matchup with optional playerB
interface PlayerMatchup {
  position: string;
  playerA: Player;
  playerB: Player | null;
}

// Update FantasyTeamMatchup to include startersPoints
interface StarterPoint {
  playerId: string;
  statsBasedPoints: number;
}

interface FantasyTeamMatchup {
  id: string;
  leagueId: string;
  season: string;
  seasonWeek: string;
  teamId: string;
  teamName: string;
  logoUrl: string;
  projectedFantasyPoints: number;
  fantasyPoints: number;
  moneylineOdds: number;
  spreadFantasyPoints: number;
  matchupTotalFantasyPoints: number;
  winProbability: number;
  decimalOdds: number;
  serviceProvider: string;
  starters: string[];
  startersPoints?: StarterPoint[];
}

// Add this type near your FantasyTeamMatchup interface
interface MatchupTeam extends FantasyTeamMatchup {
  startersPoints: StarterPoint[];
  starterProjectedPoints?: Array<{
    playerId: string;
    projectedPoints: number;
  }>;
}

// Helper to get points from entryPickTeams startersPoints
function getEntryPoints(entryPickTeams: FantasyMatchupTeam[] | null, teamIndex: number, playerId: string): number | null {
  if (!entryPickTeams) return null;
  const team = entryPickTeams[teamIndex];
  if (!team.startersPoints) return null;
  const starter = team.startersPoints.find((p: { playerId: string; statsBasedPoints: number }) => p.playerId === playerId);
  return starter ? starter.statsBasedPoints : null;
}

export default function MatchupView() {
  const searchParams = useSearchParams();
  const matchupId = searchParams.get('id');
  const entryId = searchParams.get('entryId');
  const pickId = searchParams.get('pickId');

  const [teamA, setTeamA] = useState<TeamData | null>(null);
  const [teamB, setTeamB] = useState<TeamData | null>(null);
  const [playerMatchups, setPlayerMatchups] = useState<PlayerMatchup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatchupData() {
      if (!matchupId) {
        setError("No matchup ID provided");
        setLoading(false);
        return;
      }

      try {
        // Parse the components from the matchup ID
        // Expected format: {leagueId}-{week}-{teamAId}-{teamBId}
        const idParts = matchupId.split('-');
        if (idParts.length < 4) {
          setError("Invalid matchup ID format");
          setLoading(false);
          return;
        }
        const leagueId = idParts[0];
        const week = idParts[1];
        const teamAId = idParts[2];
        const teamBId = idParts[3];

        // Get current season from config
        const configData = await firebaseService.getConfig();
        if (!configData || !configData.currentSeason) {
          setError("Failed to get current season");
          setLoading(false);
          return;
        }
        const season = configData.currentSeason;

        // Fetch both teamA and teamB documents
        const teamAQuery = query(
          collection(db, 'fantasyMatchups'),
          where('leagueId', '==', leagueId),
          where('season', '==', season),
          where('seasonWeek', '==', week),
          where('teamId', '==', teamAId)
        );
        const teamBQuery = query(
          collection(db, 'fantasyMatchups'),
          where('leagueId', '==', leagueId),
          where('season', '==', season),
          where('seasonWeek', '==', week),
          where('teamId', '==', teamBId)
        );

        const [teamASnap, teamBSnap] = await Promise.all([
          getDocs(teamAQuery),
          getDocs(teamBQuery)
        ]);

        const teamAData = teamASnap.docs[0]?.data();
        const teamBData = teamBSnap.docs[0]?.data();

        if (!teamAData || !teamBData) {
          setError("One or both teams not found");
          setLoading(false);
          return;
        }

        setTeamA({
          id: teamAData.teamId,
          teamName: teamAData.teamName,
          owner: teamAData.serviceProvider, // Using serviceProvider as owner for now
          logoUrl: teamAData.logoUrl,
          points: teamAData.fantasyPoints,
          projectedPoints: teamAData.projectedFantasyPoints,
          winProbability: teamAData.winProbability,
          moneylineOdds: teamAData.moneylineOdds
        });
        setTeamB({
          id: teamBData.teamId,
          teamName: teamBData.teamName,
          owner: teamBData.serviceProvider, // Using serviceProvider as owner for now
          logoUrl: teamBData.logoUrl,
          points: teamBData.fantasyPoints,
          projectedPoints: teamBData.projectedFantasyPoints,
          winProbability: teamBData.winProbability,
          moneylineOdds: teamBData.moneylineOdds
        });

        // Fetch the fantasyMatchupEntry and pick
        let entryPickTeams: FantasyMatchupTeam[] | null = null;
        if (entryId && pickId) {
          const entryDoc = await getDoc(doc(db, 'fantasyMatchupEntries', entryId));
          if (entryDoc.exists()) {
            const entryData = entryDoc.data() as FantasyMatchupEntry;
            const pick = entryData.picks.find((p: FantasyMatchupPick) => p.id === pickId);
            if (pick && pick.Teams && pick.Teams.length === 2) {
              entryPickTeams = pick.Teams;
            }
          }
        }

        // Use starters from entryPickTeams if available, otherwise fallback
        const startersA = entryPickTeams ? entryPickTeams[0].starters : teamAData.starters;
        const startersB = entryPickTeams ? entryPickTeams[1].starters : teamBData.starters;

        // Helper function to get game details for a player
        const getPlayerGameResult = async (playerId: string) => {
          try {
            const player = await firebaseService.getPlayerById(playerId);
            if (!player || !player.team) return null;
            
            // Query events collection where the player's team is either homeTeam or awayTeam
            const homeTeamQuery = query(
              collection(db, 'events'),
              where('season', '==', parseInt(season)),
              where('week', '==', parseInt(week)),
              where('homeTeam', '==', player.team)
            );
            
            const awayTeamQuery = query(
              collection(db, 'events'),
              where('season', '==', parseInt(season)),
              where('week', '==', parseInt(week)),
              where('awayTeam', '==', player.team)
            );
            
            // Check home team matches
            let querySnapshot = await getDocs(homeTeamQuery);
            
            // If no matches as home team, check away team
            if (querySnapshot.empty) {
              querySnapshot = await getDocs(awayTeamQuery);
              if (querySnapshot.empty) return null;
            }
            
            // Get the first relevant event (should be only one per team per week)
            const eventDoc = querySnapshot.docs[0];
            const event = eventDoc.data();
            
            // Determine if player's team is home or away
            const isHome = event.homeTeam === player.team;
            const teamScore = isHome ? event.homeScore : event.awayScore;
            const opposingScore = isHome ? event.awayScore : event.homeScore;
            const opposingTeam = isHome ? event.awayTeam : event.homeTeam;
            
            // Check game status and format the display accordingly
            if (event.status === 'Final') {
              const result = teamScore > opposingScore ? 'W' : (teamScore < opposingScore ? 'L' : 'T');
              return `Final ${result} ${teamScore}-${opposingScore} vs ${opposingTeam}`;
            } else if (event.status === 'InProgress' || event.status === 'Halftime' || event.status.includes('Quarter')) {
              // Format live game status with time remaining, quarter, score, opponent
              // e.g., "5:11 Q2 14-19 vs GB"
              const timeRemaining = event.timeRemaining || '';
              const quarter = event.quarter ? `Q${event.quarter}` : 
                             (event.status === 'Halftime' ? 'Halftime' : event.quarterDescription || '');
              
              return `${timeRemaining} ${quarter} ${teamScore}-${opposingScore} vs ${opposingTeam}`;
            } else {
              // Scheduled game - format the game time
              // Handle both Firestore timestamp objects and ISO date strings
              let gameDate;
              if (event.gameDate?.toDate) {
                // Handle Firestore timestamp
                gameDate = event.gameDate.toDate();
              } else if (event.date || event.dateTime) {
                // Handle ISO date string format from the data
                gameDate = new Date(event.date || event.dateTime);
              } else {
                // Fallback to current date if no date info is available
                gameDate = new Date();
              }
              
              // Format date as "Sun 4:25pm vs OPP"
              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const day = days[gameDate.getDay()];
              
              let hours = gameDate.getHours();
              const ampm = hours >= 12 ? 'pm' : 'am';
              hours = hours % 12;
              hours = hours ? hours : 12; // Convert 0 to 12
              
              const minutes = gameDate.getMinutes().toString().padStart(2, '0');
              
              return `${day} ${hours}:${minutes}${ampm} vs ${opposingTeam}`;
            }
          } catch (error) {
            console.error('Error fetching game result for player:', playerId, error);
            return null;
          }
        };

        // Helper function to get player game stats
        const getPlayerGameStats = async (playerId: string) => {
          try {
            // Query playerGameScores collection for this player, season and week
            const docRef = doc(db, 'playerGameScores', `${playerId}_${season}_1_${week}`);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) return null;
            
            const stats = docSnap.data();
            const relevantStats = [];
            
            // Add passing stats if they exist
            if (stats.PassingYards > 0) {
              relevantStats.push(`${stats.PassingYards} Pass Yds`);
            }
            if (stats.PassingTouchdowns > 0) {
              relevantStats.push(`${stats.PassingTouchdowns} Pass TD`);
            }
            if (stats.PassingInterceptions > 0) {
              relevantStats.push(`${stats.PassingInterceptions} INT`);
            }
            
            // Add rushing stats if they exist
            if (stats.RushingYards > 0) {
              relevantStats.push(`${stats.RushingYards} Rush Yds`);
            }
            if (stats.RushingTouchdowns > 0) {
              relevantStats.push(`${stats.RushingTouchdowns} Rush TD`);
            }
            
            // Add receiving stats if they exist
            if (stats.Receptions > 0) {
              relevantStats.push(`${stats.Receptions} REC`);
            }
            if (stats.ReceivingYards > 0) {
              relevantStats.push(`${stats.ReceivingYards} Rec Yds`);
            }
            if (stats.ReceivingTouchdowns > 0) {
              relevantStats.push(`${stats.ReceivingTouchdowns} Rec TD`);
            }
            
            // Return formatted stats string or null if no relevant stats
            return relevantStats.length > 0 ? relevantStats.join(', ') : 'No stats available';
          } catch (error) {
            console.error('Error fetching player game stats:', playerId, error);
            return null;
          }
        };

        // Helper function to determine game status
        const getGameStatus = async (playerId: string) => {
          const player = await firebaseService.getPlayerById(playerId);
          if (!player || !player.team) return 'Scheduled';
          
          // Query events collection where the player's team is either homeTeam or awayTeam
          const homeTeamQuery = query(
            collection(db, 'events'),
            where('season', '==', parseInt(season)),
            where('week', '==', parseInt(week)),
            where('homeTeam', '==', player.team)
          );
          
          const awayTeamQuery = query(
            collection(db, 'events'),
            where('season', '==', parseInt(season)),
            where('week', '==', parseInt(week)),
            where('awayTeam', '==', player.team)
          );
          
          // Check home team matches
          let querySnapshot = await getDocs(homeTeamQuery);
          
          // If no matches as home team, check away team
          if (querySnapshot.empty) {
            querySnapshot = await getDocs(awayTeamQuery);
            if (querySnapshot.empty) return 'Scheduled';
          }
          
          // Get the first relevant event and check status
          const eventDoc = querySnapshot.docs[0];
          const event = eventDoc.data();
          
          if (event.status === 'Final') {
            return 'Final';
          } else if (event.status === 'InProgress' || event.status === 'Halftime' || event.status.includes('Quarter')) {
            return 'InProgress';
          } else {
            return 'Scheduled';
          }
        };
        


        // Helper function to get player projected points
        const getPlayerProjectedPoints = (playerId: string) => {
          const teamA = teamAData as unknown as MatchupTeam;
          const teamB = teamBData as unknown as MatchupTeam;
          
          // Check if starterProjectedPoints exists and contains data for this player
          if (teamA.starters.includes(playerId) && teamA.starterProjectedPoints) {
            const projectedPoints = teamA.starterProjectedPoints.find(
              (p: { playerId: string; projectedPoints: number }) => p.playerId === playerId
            );
            return projectedPoints ? projectedPoints.projectedPoints : 0;
          } else if (teamB.starters.includes(playerId) && teamB.starterProjectedPoints) {
            const projectedPoints = teamB.starterProjectedPoints.find(
              (p: { playerId: string; projectedPoints: number }) => p.playerId === playerId
            );
            return projectedPoints ? projectedPoints.projectedPoints : 0;
          }
          
          return 0;
        };

        // Fetch player data with game results
        // Build the player matchups dynamically from all starters
        const playerMatchups = await Promise.all(
          startersA.map(async (starterId: string, index: number) => {
            // Get the corresponding starter from team B (if exists)
            const teamBStarterId = startersB[index] || null;

            // Fetch player A data
            const playerA = await firebaseService.getPlayerById(starterId);
            const playerAGameStatus = await getGameStatus(starterId) as 'Scheduled' | 'InProgress' | 'Final';
            const playerAGameResult = await getPlayerGameResult(starterId);
            const playerAGameStats = await getPlayerGameStats(starterId);

            // Points logic for player A
            let playerAPoints = 0;
            if (playerAGameStatus === 'InProgress' || playerAGameStatus === 'Final') {
              const entryPoints = getEntryPoints(entryPickTeams, 0, starterId);
              playerAPoints = entryPoints !== null ? entryPoints : 0;
            } else {
              playerAPoints = getPlayerProjectedPoints(starterId);
            }

            // Fetch player B data (if exists)
            const playerB = teamBStarterId ? await firebaseService.getPlayerById(teamBStarterId) : null;
            const playerBGameStatus = teamBStarterId ? (await getGameStatus(teamBStarterId) as 'Scheduled' | 'InProgress' | 'Final') : 'Scheduled';
            const playerBGameResult = teamBStarterId ? await getPlayerGameResult(teamBStarterId) : null;
            const playerBGameStats = teamBStarterId ? await getPlayerGameStats(teamBStarterId) : null;

            // Points logic for player B
            let playerBPoints = 0;
            if (playerBGameStatus === 'InProgress' || playerBGameStatus === 'Final') {
              const entryPoints = getEntryPoints(entryPickTeams, 1, teamBStarterId);
              playerBPoints = entryPoints !== null ? entryPoints : 0;
            } else if (teamBStarterId) {
              playerBPoints = getPlayerProjectedPoints(teamBStarterId);
            }

            // Projected points for display (for scheduled games)
            const playerAProjectedPoints = getPlayerProjectedPoints(starterId);
            const playerBProjectedPoints = teamBStarterId ? getPlayerProjectedPoints(teamBStarterId) : 0;

            return {
              position: playerA?.position || "Unknown",
              playerA,
              playerAGameStatus,
              playerAGameResult,
              playerAGameStats,
              playerAPoints,
              playerAProjectedPoints,
              playerB,
              playerBGameStatus,
              playerBGameResult,
              playerBGameStats,
              playerBPoints,
              playerBProjectedPoints
            };
          })
        );

        setPlayerMatchups(playerMatchups.map(matchup => ({
          position: matchup.position,
          playerA: {
            id: matchup.playerA?.id || "",
            name: matchup.playerA?.name || "",
            firstName: matchup.playerA?.firstName || "",
            lastName: matchup.playerA?.lastName || "",
            team: matchup.playerA?.team || "",
            position: matchup.playerA?.position || "",
            points: matchup.playerAPoints,
            projectedPoints: matchup.playerAProjectedPoints,
            status: matchup.playerAGameStatus,
            lastGameStats: matchup.playerAGameResult || "Game Details",
            gameStats: matchup.playerAGameStatus !== 'Scheduled' ? (matchup.playerAGameStats || "Player Stats") : "",
            imageUrl: matchup.playerA?.photoUrl || "/player-images/default.png"
          },
          playerB: matchup.playerB ? {
            id: matchup.playerB?.id || "",
            name: matchup.playerB?.name || "",
            firstName: matchup.playerB?.firstName || "",
            lastName: matchup.playerB?.lastName || "",
            team: matchup.playerB?.team || "",
            position: matchup.playerB?.position || "",
            points: matchup.playerBPoints,
            projectedPoints: matchup.playerBProjectedPoints,
            status: matchup.playerBGameStatus,
            lastGameStats: matchup.playerBGameResult || "Game Details",
            gameStats: matchup.playerBGameStatus !== 'Scheduled' ? (matchup.playerBGameStats || "Player Stats") : "",
            imageUrl: matchup.playerB?.photoUrl || "/player-images/default.png"
          } : null
        })));

        setLoading(false);
      } catch (error) {
        console.error('Error fetching matchup data:', error);
        setError("Failed to load matchup data");
        setLoading(false);
      }
    }

    fetchMatchupData();
  }, [matchupId, entryId, pickId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex flex-col justify-center items-center h-screen">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-zinc-800 px-4 py-2 rounded-lg hover:bg-zinc-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!teamA || !teamB) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex justify-center items-center h-screen">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      {/* Teams Header with Score */}
      <div className="bg-zinc-900 rounded-lg mx-2 mt-4 overflow-hidden">
        <div className="flex justify-between items-center p-4">
          {/* Team A */}
          <div className="flex flex-col items-start">
            <div className="relative size-16 bg-black rounded-full overflow-hidden flex items-center justify-center mb-2">
              <Image
                src={safeImage(teamA.logoUrl)}
                alt={teamA.teamName}
                width={56}
                height={56}
                className="object-cover rounded-full"
              />
            </div>
            <h2 className="text-sm font-bold truncate max-w-28">{teamA.teamName}</h2>
            <p className="text-green-500 text-xl font-bold mt-1">
              {teamA.points.toFixed(1)}
            </p>
            <div className="text-xs text-gray-400">
              Projected: {teamA.projectedPoints.toFixed(1)}
            </div>
          </div>

          {/* Center Logo */}
          <div className="relative size-10">
            <Image
              src="/Icon_Original@2x.png"
              alt="Verse"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>

          {/* Team B */}
          <div className="flex flex-col items-end">
            <div className="relative size-16 bg-black rounded-full overflow-hidden flex items-center justify-center mb-2">
              <Image
                src={safeImage(teamB.logoUrl)}
                alt={teamB.teamName}
                width={56}
                height={56}
                className="object-cover rounded-full"
              />
            </div>
            <h2 className="text-sm font-bold truncate max-w-28 text-right">{teamB.teamName}</h2>
            <p className="text-yellow-500 text-xl font-bold mt-1">
              {teamB.points.toFixed(1)}
            </p>
            <div className="text-xs text-gray-400 text-right">
              Projected: {teamB.projectedPoints.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Win Probability Bar */}
        <div className="flex items-center px-4 pb-4">
          <div className="relative w-full h-6 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-400" 
              style={{ width: `${(teamA.winProbability || 0.5) * 100}%` }}
            ></div>
            <div className="absolute w-full h-full flex items-center justify-center text-white text-sm font-bold">
              {teamA.winProbability ? `${Math.round((teamA.winProbability) * 100)}%` : '50%'}
            </div>
            <div className="absolute left-2 top-0 h-full flex items-center">
              <div className="relative size-5 bg-black rounded-full overflow-hidden">
                <Image
                  src={safeImage(teamA.logoUrl)}
                  alt="Team A"
                  fill
                  className="object-cover p-0.5"
                />
              </div>
            </div>
            <div className="absolute right-2 top-0 h-full flex items-center">
              <div className="relative size-5 bg-black rounded-full overflow-hidden">
                <Image
                  src={safeImage(teamB.logoUrl)}
                  alt="Team B"
                  fill
                  className="object-cover p-0.5"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Matchups */}
      <div className="mt-4 space-y-1">
        {playerMatchups.map((matchup, idx) => (
          <div key={idx} className="bg-zinc-900 rounded-lg mx-2 overflow-hidden">
            {/* Player A vs Player B */}
            <div className="grid grid-cols-2 divide-x divide-zinc-800">
              {/* Player A */}
              <div className="p-4 relative">
                <div className="flex flex-col items-start w-20">
                  <div className="relative size-10 bg-zinc-800 rounded-full overflow-hidden">
                    <Image
                      src={matchup.playerA.imageUrl || "/player-images/default.png"}
                      alt={matchup.playerA.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h3 className="font-bold text-sm mt-1 truncate w-full">{matchup.playerA.name}</h3>
                  <p className="text-gray-400 text-xs truncate w-full">{matchup.playerA.team}</p>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {matchup.playerA.lastGameStats?.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                  {matchup.playerA.status !== 'Scheduled' && <p>{matchup.playerA.gameStats}</p>}
                </div>
                {/* Points */}
                <div className="absolute top-4 right-4 text-xl font-bold text-green-500">
                  {matchup.playerA.status === 'Scheduled' 
                    ? <span className="text-white">{matchup.playerA.projectedPoints.toFixed(1)}</span> 
                    : matchup.playerA.points.toFixed(1)}
                  <div className="text-xs text-gray-400 text-center">
                    {matchup.playerA.status === 'Scheduled' ? 'Proj' : 
                     matchup.playerA.status === 'InProgress' ? 'Live' : 'Final'}
                  </div>
                </div>
              </div>

              {/* Player B */}
              {matchup.playerB ? (
                <div className="p-4 relative">
                  <div className="flex flex-col items-end w-20 ml-auto">
                    <div className="relative size-10 bg-zinc-800 rounded-full overflow-hidden">
                      <Image
                        src={matchup.playerB.imageUrl || "/player-images/default.png"}
                        alt={matchup.playerB.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="font-bold text-sm mt-1 truncate w-full text-right">{matchup.playerB.name}</h3>
                    <p className="text-gray-400 text-xs truncate w-full text-right">{matchup.playerB.team}</p>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 text-right">
                    {matchup.playerB.lastGameStats?.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                    {matchup.playerB.status !== 'Scheduled' && <p>{matchup.playerB.gameStats}</p>}
                  </div>
                  {/* Points */}
                  <div className="absolute top-4 left-4 text-xl font-bold text-green-500">
                    {matchup.playerB.status === 'Scheduled' 
                      ? <span className="text-white">{matchup.playerB.projectedPoints.toFixed(1)}</span> 
                      : matchup.playerB.points.toFixed(1)}
                    <div className="text-xs text-gray-400 text-center">
                      {matchup.playerB.status === 'Scheduled' ? 'Proj' : 
                       matchup.playerB.status === 'InProgress' ? 'Live' : 'Final'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 relative flex items-center justify-center">
                  <p className="text-gray-500">No matched player</p>
                </div>
              )}
            </div>

            {/* Position label */}
            <div className="bg-zinc-800 text-center py-2 font-bold text-gray-400">
              {matchup.position}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 