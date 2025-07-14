'use client';

import { useSearchParams } from 'next/navigation';
import { Header } from "@/components/ui/header";
import Image from "next/image";
import { useEffect, useState } from "react";
import { firebaseService } from "@/lib/firebase-service";
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { User } from 'lucide-react';

// Helper function to ensure image URLs are safe
const safeImage = (url?: string | null) =>
  !url ||
  (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/'))
    ? '/league-logos/generic-league-logo.svg'
    : url;

// Component for player image with icon fallback
interface PlayerImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

const PlayerImage = ({ src, alt, className }: PlayerImageProps) => {
  const [imageError, setImageError] = useState(false);
  
  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
  }, [src]);
  
  if (!src || imageError) {
    return (
      <div className="absolute inset-0 bg-zinc-700 rounded-full flex items-center justify-center">
        <User className="w-7 h-7 text-gray-300" aria-label={`${alt} placeholder`} />
      </div>
    );
  }
  
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`object-cover rounded-full ${className || ''}`}
      onError={() => setImageError(true)}
    />
  );
};

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
  starterProjectedPoints?: Array<{
    playerId: string;
    projectedPoints: number;
  }>;
  starterPositions?: string[];
}

// Add this type near your FantasyTeamMatchup interface
interface MatchupTeam extends FantasyTeamMatchup {
  startersPoints: StarterPoint[];
  starterProjectedPoints?: Array<{
    playerId: string;
    projectedPoints: number;
  }>;
}

export default function MatchupView() {
  const searchParams = useSearchParams();
  const matchupId = searchParams.get('id');

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
        


        // Helper function to get player stats points
        const getPlayerStatsBasedPoints = (playerId: string) => {
          const teamA = matchup.teamA as unknown as MatchupTeam;
          const teamB = matchup.teamB as unknown as MatchupTeam;
          
          if (teamA.starters.includes(playerId) && teamA.startersPoints) {
            const starterPoints = teamA.startersPoints.find((p: StarterPoint) => p.playerId === playerId);
            return starterPoints ? starterPoints.statsBasedPoints : 0;
          } else if (teamB.starters.includes(playerId) && teamB.startersPoints) {
            const starterPoints = teamB.startersPoints.find((p: StarterPoint) => p.playerId === playerId);
            return starterPoints ? starterPoints.statsBasedPoints : 0;
          }
          return 0;
        };

        // Helper function to get player projected points
        const getPlayerProjectedPoints = (playerId: string) => {
          const teamA = matchup.teamA as unknown as MatchupTeam;
          const teamB = matchup.teamB as unknown as MatchupTeam;
          
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

        // Use starterPositions and starters from the backend for correct order and labels
        const starterPositions = (matchup.teamA as any).starterPositions || (matchup.teamB as any).starterPositions;
        if (!starterPositions) {
          setError("No starterPositions found in matchup data");
          setLoading(false);
          return;
        }

        // Helper to get projected points for a player by index
        const getProjectedPoints = (team: FantasyTeamMatchup, idx: number) => {
          if (team.starterProjectedPoints && team.starterProjectedPoints[idx]) {
            return team.starterProjectedPoints[idx].projectedPoints;
          }
          return 0;
        };

        // Helper to get stats-based points for a player by index
        const getStatsBasedPoints = (team: FantasyTeamMatchup, idx: number) => {
          if (team.startersPoints && team.startersPoints[idx]) {
            return team.startersPoints[idx].statsBasedPoints;
          }
          return 0;
        };

        // Build player matchups using backend order and columns
        const playerMatchups = await Promise.all(
          starterPositions.map(async (position: string, idx: number) => {
            const playerAId = matchup.teamA.starters[idx];
            const playerBId = matchup.teamB.starters[idx];

            const playerA = playerAId ? await firebaseService.getPlayerById(playerAId) : null;
            const playerB = playerBId ? await firebaseService.getPlayerById(playerBId) : null;

            // Fetch game status, result, and stats for playerA
            const playerAGameStatus = playerAId ? await getGameStatus(playerAId) : 'Scheduled';
            const playerAGameResult = playerAId ? await getPlayerGameResult(playerAId) : null;
            const playerAGameStats = playerAId ? await getPlayerGameStats(playerAId) : null;
            const playerAPoints = playerAGameStatus !== 'Scheduled' ? getStatsBasedPoints(matchup.teamA, idx) : 0;
            const playerAProjectedPoints = getProjectedPoints(matchup.teamA, idx);

            // Fetch game status, result, and stats for playerB
            const playerBGameStatus = playerBId ? await getGameStatus(playerBId) : 'Scheduled';
            const playerBGameResult = playerBId ? await getPlayerGameResult(playerBId) : null;
            const playerBGameStats = playerBId ? await getPlayerGameStats(playerBId) : null;
            const playerBPoints = playerBGameStatus !== 'Scheduled' ? getStatsBasedPoints(matchup.teamB, idx) : 0;
            const playerBProjectedPoints = getProjectedPoints(matchup.teamB, idx);

            return {
              position,
              playerA: playerA ? {
                id: playerA.id || '',
                name: playerA.name || '',
                firstName: playerA.firstName || '',
                lastName: playerA.lastName || '',
                team: playerA.team || '',
                position: playerA.position || position,
                points: playerAPoints,
                projectedPoints: playerAProjectedPoints,
                status: playerAGameStatus,
                lastGameStats: playerAGameResult || 'Game Details',
                gameStats: playerAGameStatus !== 'Scheduled' ? (playerAGameStats || 'Player Stats') : '',
                imageUrl: playerA.photoUrl || '/player-images/default.png',
              } : {
                id: '', name: '', firstName: '', lastName: '', team: '', position, points: 0, projectedPoints: 0, status: 'Scheduled', lastGameStats: '', gameStats: '', imageUrl: '/player-images/default.png'
              },
              playerB: playerB ? {
                id: playerB.id || '',
                name: playerB.name || '',
                firstName: playerB.firstName || '',
                lastName: playerB.lastName || '',
                team: playerB.team || '',
                position: playerB.position || position,
                points: playerBPoints,
                projectedPoints: playerBProjectedPoints,
                status: playerBGameStatus,
                lastGameStats: playerBGameResult || 'Game Details',
                gameStats: playerBGameStatus !== 'Scheduled' ? (playerBGameStats || 'Player Stats') : '',
                imageUrl: playerB.photoUrl || '/player-images/default.png',
              } : null
            };
          })
        );

        setPlayerMatchups(playerMatchups);

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
      <div className="rounded-lg mx-2 mt-4 overflow-hidden" style={{ backgroundColor: '#131415' }}>
        <div className="relative p-4">
          <div className="flex justify-between items-center">
            {/* Team A */}
            <div className="flex flex-col items-start flex-1 max-w-[40%]">
              <div className="relative size-16 bg-black rounded-full overflow-hidden flex items-center justify-center mb-2">
                <Image
                  src={safeImage(teamA.logoUrl)}
                  alt={teamA.teamName}
                  width={56}
                  height={56}
                  className="object-cover rounded-full"
                />
              </div>
              <h2 className="text-sm font-bold truncate w-full">{teamA.teamName}</h2>
              <p className="text-green-500 text-xl font-bold mt-1">
                {teamA.points > 0 ? teamA.points.toFixed(1) : <span className="text-white">{teamA.projectedPoints.toFixed(1)}</span>}
              </p>
              <div className="text-xs text-gray-400">
                {teamA.points > 0 ? 'Current' : 'Projected'}
              </div>
            </div>

            {/* Team B */}
            <div className="flex flex-col items-end flex-1 max-w-[40%]">
              <div className="relative size-16 bg-black rounded-full overflow-hidden flex items-center justify-center mb-2">
                <Image
                  src={safeImage(teamB.logoUrl)}
                  alt={teamB.teamName}
                  width={56}
                  height={56}
                  className="object-cover rounded-full"
                />
              </div>
              <h2 className="text-sm font-bold truncate w-full text-right">{teamB.teamName}</h2>
              <p className="text-yellow-500 text-xl font-bold mt-1">
                {teamB.points > 0 ? teamB.points.toFixed(1) : <span className="text-white">{teamB.projectedPoints.toFixed(1)}</span>}
              </p>
              <div className="text-xs text-gray-400 text-right">
                {teamB.points > 0 ? 'Current' : 'Projected'}
              </div>
            </div>
          </div>

          {/* Center Logo - Absolutely positioned to always be centered */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 size-10">
            <Image
              src="/Icon_Original@2x.png"
              alt="Verse"
              width={40}
              height={40}
              className="object-contain"
            />
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
          <div key={idx} className="bg-zinc-900 overflow-hidden">
            {/* Player A vs Player B with Position in Middle */}
            <div className="grid" style={{ gridTemplateColumns: '1fr 40px 1fr' }}>
              {/* Player A */}
              <div className="p-4 relative">
                <div className="flex flex-col items-start w-28">
                  <div className="relative bg-zinc-800 rounded-full overflow-hidden" style={{ width: '34px', height: '34px' }}>
                    <PlayerImage
                      src={matchup.playerA.imageUrl}
                      alt={matchup.playerA.name}
                    />
                  </div>
                  <h3 className="font-bold text-sm mt-1 truncate w-full">{matchup.playerA.name}</h3>
                  <p className="text-gray-400 text-xs truncate w-full" style={{ marginTop: '4px' }}>{matchup.playerA.team}</p>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {matchup.playerA.lastGameStats?.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                  {matchup.playerA.status !== 'Scheduled' && <p>{matchup.playerA.gameStats}</p>}
                </div>
                {/* Points */}
                <div className="absolute top-2 right-4 text-xl font-bold text-green-500">
                  {matchup.playerA.status === 'Scheduled' 
                    ? <span className="text-white">{matchup.playerA.projectedPoints.toFixed(1)}</span> 
                    : matchup.playerA.points.toFixed(1)}
                  <div className="text-xs text-gray-400 text-center">
                    {matchup.playerA.status === 'Scheduled' ? 'Proj' : 
                     matchup.playerA.status === 'InProgress' ? 'Live' : 'Final'}
                  </div>
                </div>
              </div>

              {/* Position rectangle - dedicated column */}
              <div className="flex items-center justify-center" style={{ backgroundColor: '#202425' }}>
                <span className="text-sm font-bold" style={{ color: '#ADB0BC' }}>{matchup.position}</span>
              </div>

              {/* Player B */}
              {matchup.playerB ? (
                <div className="p-4 relative">
                  <div className="flex flex-col items-end w-28 ml-auto">
                    <div className="relative bg-zinc-800 rounded-full overflow-hidden" style={{ width: '34px', height: '34px' }}>
                      <PlayerImage
                        src={matchup.playerB.imageUrl}
                        alt={matchup.playerB.name}
                      />
                    </div>
                    <h3 className="font-bold text-sm mt-1 truncate w-full text-right">{matchup.playerB.name}</h3>
                    <p className="text-gray-400 text-xs truncate w-full text-right" style={{ marginTop: '4px' }}>{matchup.playerB.team}</p>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 text-right">
                    {matchup.playerB.lastGameStats?.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                    {matchup.playerB.status !== 'Scheduled' && <p>{matchup.playerB.gameStats}</p>}
                  </div>
                  {/* Points */}
                  <div className="absolute top-2 left-4 text-xl font-bold text-green-500">
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
          </div>
        ))}
      </div>
    </div>
  );
} 