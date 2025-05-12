'use client';

import { useSearchParams } from 'next/navigation';
import { Header } from "@/components/ui/header";
import Image from "next/image";
import { useEffect, useState } from "react";
import { firebaseService } from "@/lib/firebase-service";
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase";

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
  status: 'Live' | 'Proj.';
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

export default function MatchupView() {
  const searchParams = useSearchParams();
  const matchupId = searchParams.get('id');

  const [teamA, setTeamA] = useState<TeamData | null>(null);
  const [teamB, setTeamB] = useState<TeamData | null>(null);
  const [playerMatchups, setPlayerMatchups] = useState<Array<{position: string, playerA: Player, playerB: Player}>>([]);
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
        // Get current season from config
        const configData = await firebaseService.getConfig();
        if (!configData || !configData.currentSeason) {
          setError("Failed to get current season");
          setLoading(false);
          return;
        }
        const season = configData.currentSeason;

        console.log("Fetching matchups with:", { leagueId, season, week });
        const matchups = await firebaseService.getFantasyMatchups(leagueId, season, week);
        
        // Find the specific matchup
        const matchup = matchups.find(m => m.id === matchupId);
        
        if (!matchup) {
          console.log("Matchups found:", matchups.length);
          console.log("Matchup IDs:", matchups.map(m => m.id));
          setError("Matchup not found");
          setLoading(false);
          return;
        }

        console.log("Matchup data:", matchup);
        console.log("Team A starters:", matchup.teamA.starters);
        console.log("Team B starters:", matchup.teamB.starters);

        // Set team data directly from the matchup data
        setTeamA({
          id: matchup.teamA.teamId,
          teamName: matchup.teamA.teamName,
          owner: matchup.teamA.serviceProvider, // Using serviceProvider as owner for now
          logoUrl: matchup.teamA.logoUrl,
          points: matchup.teamA.fantasyPoints,
          projectedPoints: matchup.teamA.projectedFantasyPoints,
          winProbability: matchup.teamA.winProbability,
          moneylineOdds: matchup.teamA.moneylineOdds
        });
        
        setTeamB({
          id: matchup.teamB.teamId,
          teamName: matchup.teamB.teamName,
          owner: matchup.teamB.serviceProvider, // Using serviceProvider as owner for now
          logoUrl: matchup.teamB.logoUrl,
          points: matchup.teamB.fantasyPoints,
          projectedPoints: matchup.teamB.projectedFantasyPoints,
          winProbability: matchup.teamB.winProbability,
          moneylineOdds: matchup.teamB.moneylineOdds
        });

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
            
            // Check if the game is finished
            if (event.status === 'Final') {
              const result = teamScore > opposingScore ? 'W' : (teamScore < opposingScore ? 'L' : 'T');
              return `${event.quarterDescription} ${result} ${teamScore}-${opposingScore}`;
            } else {
              return event.quarterDescription || event.status;
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

        // Fetch player data with game results
        const playerMatchups = await Promise.all([
          {
            position: "QB",
            playerA: await firebaseService.getPlayerById(matchup.teamA.starters[0]),
            playerAGameResult: await getPlayerGameResult(matchup.teamA.starters[0]),
            playerAGameStats: await getPlayerGameStats(matchup.teamA.starters[0]),
            playerB: await firebaseService.getPlayerById(matchup.teamB.starters[0]),
            playerBGameResult: await getPlayerGameResult(matchup.teamB.starters[0]),
            playerBGameStats: await getPlayerGameStats(matchup.teamB.starters[0])
          },
          {
            position: "RB",
            playerA: await firebaseService.getPlayerById(matchup.teamA.starters[1]),
            playerAGameResult: await getPlayerGameResult(matchup.teamA.starters[1]),
            playerAGameStats: await getPlayerGameStats(matchup.teamA.starters[1]),
            playerB: await firebaseService.getPlayerById(matchup.teamB.starters[1]),
            playerBGameResult: await getPlayerGameResult(matchup.teamB.starters[1]),
            playerBGameStats: await getPlayerGameStats(matchup.teamB.starters[1])
          },
          {
            position: "RB",
            playerA: await firebaseService.getPlayerById(matchup.teamA.starters[2]),
            playerAGameResult: await getPlayerGameResult(matchup.teamA.starters[2]),
            playerAGameStats: await getPlayerGameStats(matchup.teamA.starters[2]),
            playerB: await firebaseService.getPlayerById(matchup.teamB.starters[2]),
            playerBGameResult: await getPlayerGameResult(matchup.teamB.starters[2]),
            playerBGameStats: await getPlayerGameStats(matchup.teamB.starters[2])
          },
          {
            position: "WR",
            playerA: await firebaseService.getPlayerById(matchup.teamA.starters[3]),
            playerAGameResult: await getPlayerGameResult(matchup.teamA.starters[3]),
            playerAGameStats: await getPlayerGameStats(matchup.teamA.starters[3]),
            playerB: await firebaseService.getPlayerById(matchup.teamB.starters[3]),
            playerBGameResult: await getPlayerGameResult(matchup.teamB.starters[3]),
            playerBGameStats: await getPlayerGameStats(matchup.teamB.starters[3])
          }
        ]);

        setPlayerMatchups(playerMatchups.map(matchup => ({
          position: matchup.position,
          playerA: {
            id: matchup.playerA?.id || "",
            name: matchup.playerA?.name || "",
            firstName: matchup.playerA?.firstName || "",
            lastName: matchup.playerA?.lastName || "",
            team: matchup.playerA?.team || "",
            position: matchup.playerA?.position || "",
            points: 0,
            projectedPoints: 0,
            status: "Proj.",
            lastGameStats: matchup.playerAGameResult || "Game Details",
            gameStats: matchup.playerAGameStats || "Player Stats",
            imageUrl: matchup.playerA?.photoUrl || "/player-images/default.png"
          },
          playerB: {
            id: matchup.playerB?.id || "",
            name: matchup.playerB?.name || "",
            firstName: matchup.playerB?.firstName || "",
            lastName: matchup.playerB?.lastName || "",
            team: matchup.playerB?.team || "",
            position: matchup.playerB?.position || "",
            points: 0,
            projectedPoints: 0,
            status: "Proj.",
            lastGameStats: matchup.playerBGameResult || "Game Details",
            gameStats: matchup.playerBGameStats || "Player Stats",
            imageUrl: matchup.playerB?.photoUrl || "/player-images/default.png"
          }
        })));

        setLoading(false);
      } catch (error) {
        console.error('Error fetching matchup data:', error);
        setError("Failed to load matchup data");
        setLoading(false);
      }
    }

    fetchMatchupData();
  }, [matchupId]);

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
              {teamA.points !== undefined ? teamA.points.toFixed(1) : teamA.projectedPoints.toFixed(1)}
            </p>
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
              {teamB.points !== undefined ? teamB.points.toFixed(1) : teamB.projectedPoints.toFixed(1)}
            </p>
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
                  <p>{matchup.playerA.gameStats}</p>
                </div>
                {/* Points */}
                <div className="absolute top-4 right-4 text-xl font-bold text-green-500">
                  {matchup.playerA.points.toFixed(1)}
                  <div className="text-xs text-gray-400 text-center">{matchup.playerA.status}</div>
                </div>
              </div>

              {/* Player B */}
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
                  <p>{matchup.playerB.gameStats}</p>
                </div>
                {/* Points */}
                <div className="absolute top-4 left-4 text-xl font-bold text-green-500">
                  {matchup.playerB.points.toFixed(1)}
                  <div className="text-xs text-gray-400 text-center">{matchup.playerB.status}</div>
                </div>
              </div>
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