'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/header";
import { useAuth } from "@/lib/auth-context";
import { Plus, RefreshCw } from "lucide-react";
import { firebaseService } from "@/lib/firebase-service";
import Image from "next/image";
import { useCurrency } from "@/lib/currency-context";

// Types for synced leagues
interface SyncedLeague {
  leagueId: string;
  leagueName: string;
  leagueType: 'sleeper' | 'espn' | 'yahoo';
}

interface LeagueDetails {
  id: string;
  name: string;
  type: string;
  sport: string;
  logoUrl?: string;
  description?: string;
  teamsCount?: number;
  syncedTeams?: number;
  lastSynced?: string;
}

interface Config {
  currentNFLWeek: string;
  currentSeason: string;
  seasonStatus: string;
  lastUpdated?: {
    __time__: number;
  };
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
}

interface FantasyMatchup {
  id: string;
  teamA: FantasyTeamMatchup;
  teamB: FantasyTeamMatchup;
  leagueId: string;
  season: string;
  week: string;
  total: number;
}

export default function LeagueSyncHome() {
  const router = useRouter();
  const user = useAuth();
  const { currency } = useCurrency();
  const [activeTab, setActiveTab] = useState('Matchups');
  const [syncedLeagues, setSyncedLeagues] = useState<LeagueDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<LeagueDetails | null>(null);
  const [matchups, setMatchups] = useState<FantasyMatchup[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [isMatchupsLoading, setIsMatchupsLoading] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (user === null) {
      router.push('/auth');
    }
  }, [user, router]);

  // Fetch config data
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configData = await firebaseService.getConfig();
        if (configData) {
          setConfig(configData);
        }
      } catch (error) {
        console.error("Error fetching config:", error);
      }
    };

    fetchConfig();
  }, []);

  // Fetch user's synced leagues
  useEffect(() => {
    if (!user?.uid) return;

    const fetchSyncedLeagues = async () => {
      try {
        setIsLoading(true);
        // Get user document with synced leagues
        const userData = await firebaseService.getUserData(user.uid);
        
        if (!userData?.syncedLeagues?.length) {
          setIsLoading(false);
          return;
        }

        // For each synced league, get additional details
        const leaguePromises = userData.syncedLeagues.map(async (league: SyncedLeague) => {
          try {
            const leagueDetails = await firebaseService.getFantasyLeagueById(league.leagueId);
            
            // Calculate how long ago the league was synced
            const lastSyncTime = leagueDetails?.lastUpdated 
              ? new Date(leagueDetails.lastUpdated.__time__).getTime()
              : Date.now();
            const minutesAgo = Math.floor((Date.now() - lastSyncTime) / 60000);
            const syncedTimeText = minutesAgo < 60 
              ? `${minutesAgo} mins ago` 
              : `${Math.floor(minutesAgo / 60)} hours ago`;
            
            // Get team counts
            const totalTeams = leagueDetails?.totalRosters || 0;
            const syncedTeams = leagueDetails?.syncedUsers?.length || 0;
            
            return {
              id: league.leagueId,
              name: league.leagueName,
              type: league.leagueType,
              sport: leagueDetails?.sport || 'unknown',
              logoUrl: getLeagueLogoUrl(league.leagueType),
              description: league.leagueName, // Using league name as placeholder
              teamsCount: totalTeams,
              syncedTeams: syncedTeams,
              lastSynced: syncedTimeText
            };
          } catch (error) {
            console.error(`Error fetching league ${league.leagueId}:`, error);
            return {
              id: league.leagueId,
              name: league.leagueName,
              type: league.leagueType,
              sport: 'unknown',
              logoUrl: getLeagueLogoUrl(league.leagueType),
              description: league.leagueName,
              teamsCount: 0,
              syncedTeams: 0,
              lastSynced: 'unknown'
            };
          }
        });

        const leaguesWithDetails = await Promise.all(leaguePromises);
        setSyncedLeagues(leaguesWithDetails);
        
        // Select the first league by default if there are leagues
        if (leaguesWithDetails.length > 0 && !selectedLeague) {
          setSelectedLeague(leaguesWithDetails[0]);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching synced leagues:", error);
        setIsLoading(false);
      }
    };

    fetchSyncedLeagues();
  }, [user?.uid, selectedLeague]);

  // Fetch matchups when selected league or config changes
  useEffect(() => {
    if (!selectedLeague || !config) return;

    const fetchMatchups = async () => {
      setIsMatchupsLoading(true);
      try {
        const matchupData = await firebaseService.getFantasyMatchups(
          selectedLeague.id,
          config.currentSeason,
          config.currentNFLWeek
        );
        setMatchups(matchupData);
      } catch (error) {
        console.error("Error fetching matchups:", error);
      } finally {
        setIsMatchupsLoading(false);
      }
    };

    fetchMatchups();
  }, [selectedLeague, config]);

  // Helper function to get logo URL based on league type
  const getLeagueLogoUrl = (leagueType: string) => {
    switch (leagueType) {
      case 'sleeper':
        return '/league-logos/sleeper-logo.jpeg';
      case 'espn':
        return '/league-logos/espn-logo.png';
      case 'yahoo':
        return '/league-logos/yahoo-logo.png';
      default:
        return '/league-logos/generic-league-logo.svg';
    }
  };

  // Format moneyline odds for display
  const formatMoneylineOdds = (odds: number): string => {
    if (!odds) return '–';
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const handleSelectLeague = (league: LeagueDetails) => {
    setSelectedLeague(league);
  };

  // Function to handle refresh of league data
  const handleRefreshLeague = async () => {
    // Placeholder for league refresh logic
    // This would typically trigger a re-sync of the league data
    console.log("Refreshing league data...");
  };

  // Helper function to safely handle image URLs
  const getSafeImageUrl = (url: string | undefined | null): string => {
    if (!url) return '/league-logos/generic-league-logo.svg';
    
    // Allow all valid URLs now that Next.js is configured to accept all domains
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return url;
    }
    
    // For invalid URLs, use a fallback
    return '/league-logos/generic-league-logo.svg';
  };

  // Carousel drag handlers
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    
    if (carouselRef.current) {
      setScrollLeft(carouselRef.current.scrollLeft);
      
      if ('clientX' in e) {
        // Mouse event
        setStartX(e.clientX);
      } else {
        // Touch event
        setStartX(e.touches[0].clientX);
      }
      
      carouselRef.current.style.cursor = 'grabbing';
      carouselRef.current.style.userSelect = 'none';
    }
  };

  const handleDragMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !carouselRef.current) return;
    
    e.preventDefault();
    const x = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const distance = x - startX;
    carouselRef.current.scrollLeft = scrollLeft - distance;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    
    if (carouselRef.current) {
      carouselRef.current.style.cursor = 'grab';
      carouselRef.current.style.removeProperty('user-select');
    }
  };

  // Helper function to get the appropriate color class based on mode
  const getOddsColorClass = () => currency === 'cash' ? 'text-green-500' : 'text-[#FFCC00]';

  // Show loading state while checking auth
  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const tabs = [
    { name: 'Matchups', label: config ? `Matchups (Week ${config.currentNFLWeek})` : 'Matchups' },
    { name: 'Roster', label: 'Roster' },
    { name: 'Futures', label: 'Futures' },
    { name: 'Stats', label: 'Stats' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="pb-20">
        {isLoading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : syncedLeagues.length > 0 ? (
          <>
            {/* Selected League Header */}
            {selectedLeague && (
              <div className="px-4 py-4 sm:py-6 mb-4">
                <div className="bg-zinc-900 rounded-lg p-3 sm:p-5 shadow-lg">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="relative size-12 sm:size-16 bg-black rounded-full p-1 sm:p-2 border-2 border-green-500 overflow-hidden flex items-center justify-center">
                      {selectedLeague.logoUrl && (
                        <Image
                          src={getSafeImageUrl(selectedLeague.logoUrl)}
                          alt={selectedLeague.name}
                          fill
                          className="object-cover p-1"
                          style={{ borderRadius: '50%' }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg sm:text-xl font-bold truncate">{selectedLeague.name}</h2>
                      <p className="text-gray-400 text-xs sm:text-sm truncate">{selectedLeague.description || selectedLeague.type}</p>
                      <div className="flex items-center text-xs sm:text-sm mt-1 text-gray-500">
                        <span className="truncate">
                          {selectedLeague.syncedTeams}/{selectedLeague.teamsCount} teams synced {selectedLeague.lastSynced}
                        </span>
                        <button 
                          className="ml-2 text-green-500 hover:text-green-400 flex-shrink-0"
                          onClick={handleRefreshLeague}
                        >
                          <RefreshCw size={14} className="sm:size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Synced Leagues Carousel */}
            <div className="px-2 sm:px-4 mb-4 overflow-hidden">
              <div 
                ref={carouselRef}
                className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar cursor-grab"
                onMouseDown={handleDragStart}
                onMouseMove={isDragging ? handleDragMove : undefined}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={isDragging ? handleDragMove : undefined}
                onTouchEnd={handleDragEnd}
              >
                {syncedLeagues.map((league) => (
                  <button
                    key={league.id}
                    className={`min-w-56 sm:min-w-64 p-2 rounded-lg transition-colors ${
                      selectedLeague?.id === league.id 
                        ? 'bg-zinc-800 border-l-4 border-green-500' 
                        : 'bg-zinc-900 hover:bg-zinc-800'
                    }`}
                    onClick={() => handleSelectLeague(league)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative size-8 sm:size-10 bg-black rounded-full overflow-hidden flex items-center justify-center">
                        {league.logoUrl && (
                          <Image
                            src={getSafeImageUrl(league.logoUrl)}
                            alt={league.name}
                            fill
                            className="object-cover p-1"
                            style={{ borderRadius: '50%' }}
                          />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm sm:text-base truncate max-w-32 sm:max-w-40">{league.name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate max-w-32 sm:max-w-40">
                          {league.syncedTeams}/{league.teamsCount} Teams • {league.type}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                
                {/* Add New League Button */}
                <button className="min-w-36 sm:min-w-48 bg-zinc-900 hover:bg-zinc-800 p-2 rounded-lg flex items-center justify-center gap-1 sm:gap-2 text-green-500 border border-dashed border-zinc-700 text-sm sm:text-base">
                  <Plus size={16} className="sm:size-[18px]" />
                  <span>Add League</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-zinc-800 flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  className={`px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.name
                      ? 'text-white border-b-2 border-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab(tab.name)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Matchups Section */}
            {activeTab === 'Matchups' && selectedLeague && (
              <div className="px-2 sm:px-4 mt-4">
                {/* Table Headers */}
                <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr] text-xs sm:text-sm text-gray-500 px-4 py-2">
                  <div>Proj. Pts</div>
                  <div>Teams</div>
                  <div className="text-center">Moneyline</div>
                  <div className="grid grid-cols-2">
                    <div className="text-center">Spread</div>
                    <div className="text-center">Total</div>
                  </div>
                </div>

                {isMatchupsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
                  </div>
                ) : matchups.length > 0 ? (
                  /* Real Matchups */
                  matchups.map((matchup) => (
                    <div key={matchup.id} className="bg-zinc-900 rounded-lg mb-2 overflow-hidden">
                      {/* Favorite Team (Team A) */}
                      <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr] items-center py-3 px-4 border-b-2 border-black/40">
                        <div className="text-base sm:text-lg font-semibold text-green-500">
                          {matchup.teamA.projectedFantasyPoints.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative size-6 sm:size-8 bg-zinc-800 rounded-full overflow-hidden flex items-center justify-center">
                            <Image 
                              src={getSafeImageUrl(matchup.teamA.logoUrl)} 
                              alt={matchup.teamA.teamName} 
                              fill 
                              className="object-cover p-1"
                              style={{ borderRadius: '50%' }}
                            />
                          </div>
                          <span className="truncate text-xs sm:text-base">{matchup.teamA.teamName}</span>
                        </div>
                        <div className={`text-center text-xs sm:text-base relative ${getOddsColorClass()}`}>
                          <div className="absolute left-0 top-0 h-full w-[2px] bg-black/40"></div>
                          {formatMoneylineOdds(matchup.teamA.moneylineOdds)}
                        </div>
                        <div className="grid grid-cols-2 relative">
                          <div className="absolute left-0 top-0 h-full w-[2px] bg-black/40"></div>
                          <div className={`text-center text-xs sm:text-base relative ${getOddsColorClass()}`}>
                            {matchup.teamA.spreadFantasyPoints ? 
                              `-${matchup.teamA.spreadFantasyPoints.toFixed(1)}` : 
                              '–'}
                            <div className="absolute right-0 top-0 h-full w-[2px] bg-black/40"></div>
                          </div>
                          <div className={`text-center text-xs sm:text-base ${getOddsColorClass()}`}>
                            O {matchup.total.toFixed(1)}
                          </div>
                        </div>
                      </div>

                      {/* Underdog Team (Team B) */}
                      <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr] items-center py-3 px-4">
                        <div className="text-base sm:text-lg font-semibold text-gray-400">
                          {matchup.teamB.projectedFantasyPoints.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative size-6 sm:size-8 bg-zinc-800 rounded-full overflow-hidden flex items-center justify-center">
                            <Image 
                              src={getSafeImageUrl(matchup.teamB.logoUrl)} 
                              alt={matchup.teamB.teamName} 
                              fill 
                              className="object-cover p-1"
                              style={{ borderRadius: '50%' }}
                            />
                          </div>
                          <span className="truncate text-xs sm:text-base">{matchup.teamB.teamName}</span>
                        </div>
                        <div className={`text-center text-xs sm:text-base relative ${getOddsColorClass()}`}>
                          <div className="absolute left-0 top-0 h-full w-[2px] bg-black/40"></div>
                          {formatMoneylineOdds(matchup.teamB.moneylineOdds)}
                        </div>
                        <div className="grid grid-cols-2 relative">
                          <div className="absolute left-0 top-0 h-full w-[2px] bg-black/40"></div>
                          <div className={`text-center text-xs sm:text-base relative ${getOddsColorClass()}`}>
                            {matchup.teamB.spreadFantasyPoints ? 
                              `+${matchup.teamB.spreadFantasyPoints.toFixed(1)}` : 
                              '–'}
                            <div className="absolute right-0 top-0 h-full w-[2px] bg-black/40"></div>
                          </div>
                          <div className={`text-center text-xs sm:text-base ${getOddsColorClass()}`}>
                            U {matchup.total.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No matchups found for this league in Week {config?.currentNFLWeek}.</p>
                    <p className="mt-2 text-sm">Matchups will appear here when your league generates them.</p>
                  </div>
                )}
              </div>
            )}

            {/* Stats Section */}
            {activeTab === 'Stats' && (
              <div className="px-2 sm:px-4 overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {[1, 2, 3, 4, 5, 6].map((index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-700 rounded-full overflow-hidden flex items-center justify-center">
                          <Image 
                            src={'/placeholder.png'} 
                            alt="Player" 
                            width={48} 
                            height={48} 
                            className="object-cover" 
                            style={{ borderRadius: '50%' }}
                          />
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm sm:text-base">Player Name</div>
                          <div className="text-gray-400 text-xs sm:text-sm">Team - Position</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">Stat 1</div>
                          <div className="text-white font-medium text-sm sm:text-base">24.5</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">Stat 2</div>
                          <div className="text-white font-medium text-sm sm:text-base">8.2</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">Stat 3</div>
                          <div className="text-white font-medium text-sm sm:text-base">15.7</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Roster Section */}
            {activeTab === 'Roster' && (
              <div className="px-2 sm:px-4 overflow-hidden">
                <div className="text-center py-12 text-gray-500">
                  <p>Roster details coming soon</p>
                </div>
              </div>
            )}

            {/* Futures Section */}
            {activeTab === 'Futures' && (
              <div className="px-2 sm:px-4 overflow-hidden">
                <div className="text-center py-12 text-gray-500">
                  <p>Futures details coming soon</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Add new league button */}
            <div className="border border-dashed border-gray-600 rounded-lg p-4 sm:p-6 mx-4 mt-6 mb-6 sm:mb-8 flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors">
              <button className="flex items-center gap-2 text-green-500 font-medium">
                <Plus className="h-5 w-5" />
                <span className="text-sm sm:text-base">Add new league</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-800 flex overflow-x-auto mb-6 sm:mb-8">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  className={`px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.name
                      ? 'text-white border-b-2 border-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab(tab.name)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Empty state content */}
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4">
              <div className="text-gray-600 mb-4 sm:mb-6">
                <svg width="60" height="60" viewBox="0 0 80 80" className="sm:w-[80px] sm:h-[80px]" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M40 20C43.3137 20 46 17.3137 46 14C46 10.6863 43.3137 8 40 8C36.6863 8 34 10.6863 34 14C34 17.3137 36.6863 20 40 20Z" stroke="#555" strokeWidth="2"/>
                  <path d="M40 33V20" stroke="#555" strokeWidth="2"/>
                  <path d="M25 47H55" stroke="#555" strokeWidth="2"/>
                  <path d="M30 47V60" stroke="#555" strokeWidth="2"/>
                  <path d="M50 47V60" stroke="#555" strokeWidth="2"/>
                  <path d="M20 60H40" stroke="#555" strokeWidth="2"/>
                  <path d="M40 60H60" stroke="#555" strokeWidth="2"/>
                  <path d="M25 60V72" stroke="#555" strokeWidth="2"/>
                  <path d="M35 60V72" stroke="#555" strokeWidth="2"/>
                  <path d="M45 60V72" stroke="#555" strokeWidth="2"/>
                  <path d="M55 60V72" stroke="#555" strokeWidth="2"/>
                </svg>
              </div>
              <p className="text-gray-500 text-base sm:text-lg">
                The matchups will appear here<br />when you add a new league
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
} 