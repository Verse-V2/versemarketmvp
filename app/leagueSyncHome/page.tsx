'use client';

import { useState, useEffect, useRef, useTransition, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/header";
import { useAuth } from "@/lib/auth-context";
import { Plus, RefreshCw } from "lucide-react";
import { firebaseService } from "@/lib/firebase-service";
import Image from "next/image";
import { useCurrency } from "@/lib/currency-context";

/**──────────────────────────────────────────────────────────
 * REUSABLE HELPERS
 *─────────────────────────────────────────────────────────**/
const getLeagueLogoUrl = (type: string) =>
  ({
    sleeper: '/league-logos/sleeper-logo.jpeg',
    espn: '/league-logos/espn-logo.png',
    yahoo: '/league-logos/yahoo-logo.png',
  }[type as never] ?? '/league-logos/generic-league-logo.svg');

const safeImage = (url?: string | null) =>
  !url ||
  (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/'))
    ? '/league-logos/generic-league-logo.svg'
    : url;

const moneyline = (n?: number) => (!n ? '–' : n > 0 ? `+${n}` : `${n}`);

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

  /* UI state */
  const [activeTab, setActiveTab] = useState<'Matchups' | 'Roster' | 'Futures' | 'Stats'>('Matchups');
  const [syncedLeagues, setSyncedLeagues] = useState<LeagueDetails[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<LeagueDetails | null>(null);

  /* data state */
  const [config, setConfig] = useState<Config | null>(null);
  const [matchups, setMatchups] = useState<FantasyMatchup[]>([]);
  const [matchupsLoading, setMatchupsLoading] = useState(false);

  /* transition keeps old matchups visible until new ones arrive */
  const [isPending, startTransition] = useTransition();

  /*───────────────── Auth redirect ─────────────────*/
  useEffect(() => {
    if (user === null) router.push('/auth');
  }, [user, router]);

  /*───────────────── Config fetch (once) ───────────*/
  useEffect(() => {
    firebaseService
      .getConfig()
      .then(setConfig)
      .catch((e) => console.error('config', e));
  }, []);

  /*───────────────── Initial league list (once) ────*/
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const userData = await firebaseService.getUserData(user.uid);
        if (!userData?.syncedLeagues?.length) return;

        const leagues = await Promise.all(
          userData.syncedLeagues.map(async (l: SyncedLeague) => {
            try {
              const det = await firebaseService.getFantasyLeagueById(l.leagueId);
              const last = det?.lastUpdated?.__time__ ?? Date.now();
              const mins = Math.floor((Date.now() - last) / 60000);
              return {
                id: l.leagueId,
                name: l.leagueName,
                type: l.leagueType,
                sport: det?.sport ?? 'unknown',
                logoUrl: getLeagueLogoUrl(l.leagueType),
                description: l.leagueName,
                teamsCount: det?.totalRosters ?? 0,
                syncedTeams: det?.syncedUsers?.length ?? 0,
                lastSynced: mins < 60 ? `${mins} mins ago` : `${Math.floor(mins / 60)} hours ago`,
              } as LeagueDetails;
            } catch (err) {
              console.error('league fetch', err);
              return {
                id: l.leagueId,
                name: l.leagueName,
                type: l.leagueType,
                sport: 'unknown',
                logoUrl: getLeagueLogoUrl(l.leagueType),
                description: l.leagueName,
                teamsCount: 0,
                syncedTeams: 0,
                lastSynced: 'unknown',
              } as LeagueDetails;
            }
          })
        );

        setSyncedLeagues(leagues);
        if (!selectedLeague && leagues.length) setSelectedLeague(leagues[0]);
      } catch (e) {
        console.error('synced leagues', e);
      }
    })();
    // ❌ DO NOT depend on selectedLeague here – that was causing the flash
  }, [user?.uid]);

  /*───────────────── Matchups fetch ────────────────*/
  const fetchMatchups = useCallback(
    async (league: LeagueDetails) => {
      if (!config) return;
      setMatchupsLoading(true);
      try {
        const data = await firebaseService.getFantasyMatchups(
          league.id,
          config.currentSeason,
          config.currentNFLWeek
        );
        setMatchups(data);
      } catch (e) {
        console.error('matchups', e);
      } finally {
        setMatchupsLoading(false);
      }
    },
    [config]
  );

  /* refetch when league or config changes */
  useEffect(() => {
    if (selectedLeague && config) fetchMatchups(selectedLeague);
  }, [selectedLeague, config, fetchMatchups]);

  /*───────────────── UI handlers ───────────────────*/
  const onSelectLeague = (l: LeagueDetails) =>
    startTransition(() => setSelectedLeague(l)); // keeps old UI stable while fetching

  const oddsColor = currency === 'cash' ? 'text-green-500' : 'text-[#FFCC00]';

  /*───────────────── RENDER ────────────────────────*/
  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }

  const tabs = [
    { name: 'Matchups', label: config ? `Matchups (Week ${config.currentNFLWeek})` : 'Matchups' },
    { name: 'Roster', label: 'Roster' },
    { name: 'Futures', label: 'Futures' },
    { name: 'Stats', label: 'Stats' },
  ] as const;

  /**──────────────────────────────────────────────────────────
   * CAROUSEL – memoised so it never re-renders
   *─────────────────────────────────────────────────────────**/
  interface CarouselProps {
    leagues: LeagueDetails[];
    currentId?: string;
    onSelect: (l: LeagueDetails) => void;
  }

  const Carousel = memo(({ leagues, currentId, onSelect }: CarouselProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [drag, setDrag] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const begin = (e: React.MouseEvent | React.TouchEvent) => {
      setDrag(true);
      if (!ref.current) return;
      setScrollLeft(ref.current.scrollLeft);
      setStartX('clientX' in e ? e.clientX : e.touches[0].clientX);
      ref.current.style.cursor = 'grabbing';
      ref.current.style.userSelect = 'none';
    };

    const move = (e: React.MouseEvent | React.TouchEvent) => {
      if (!drag || !ref.current) return;
      const x = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      ref.current.scrollLeft = scrollLeft - (x - startX);
    };

    const end = () => {
      setDrag(false);
      if (ref.current) {
        ref.current.style.cursor = 'grab';
        ref.current.style.removeProperty('user-select');
      }
    };

    return (
      <div className="px-2 sm:px-4 mb-4 overflow-hidden">
        <div
          ref={ref}
          className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar cursor-grab"
          onMouseDown={begin}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={begin}
          onTouchMove={move}
          onTouchEnd={end}
        >
          {leagues.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelect(l)}
              className={`min-w-56 sm:min-w-64 p-2 rounded-lg transition-colors ${
                currentId === l.id
                  ? 'bg-zinc-800 border-l-4 border-green-500'
                  : 'bg-zinc-900 hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative size-8 sm:size-10 bg-black rounded-full overflow-hidden flex items-center justify-center">
                  <Image
                    src={safeImage(l.logoUrl)}
                    alt={l.name}
                    fill
                    className="object-cover p-1"
                    style={{ borderRadius: '50%' }}
                  />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm sm:text-base truncate max-w-32 sm:max-w-40">
                    {l.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate max-w-32 sm:max-w-40">
                    {l.syncedTeams}/{l.teamsCount} Teams • {l.type}
                  </p>
                </div>
              </div>
            </button>
          ))}

          {/* "Add" tile */}
          <button className="min-w-36 sm:min-w-48 bg-zinc-900 hover:bg-zinc-800 p-2 rounded-lg flex items-center justify-center gap-1 sm:gap-2 text-green-500 border border-dashed border-zinc-700 text-sm sm:text-base">
            <Plus size={16} className="sm:size-[18px]" />
            <span>Add League</span>
          </button>
        </div>
      </div>
    );
  });
  Carousel.displayName = 'Carousel';

  /**──────────────────────────────────────────────────────────
   * SKELETON ROW (keeps layout stable)
   *─────────────────────────────────────────────────────────**/
  const SkeletonRow = () => (
    <div className="bg-zinc-900 rounded-lg mb-2 px-4 py-4 animate-pulse">
      <div className="h-4 bg-zinc-700 rounded w-1/2 mb-2" />
      <div className="h-4 bg-zinc-700 rounded w-1/3" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="pb-20">
        {/*──────────── Header for selected league ────────────*/}
        {selectedLeague && (
          <div className="px-4 py-4 sm:py-6 mb-4">
            <div className="bg-zinc-900 rounded-lg p-3 sm:p-5 shadow-lg flex items-center gap-2 sm:gap-4">
              <div className="relative size-12 sm:size-16 bg-black rounded-full p-1 sm:p-2 border-2 border-green-500 overflow-hidden flex items-center justify-center">
                <Image
                  src={safeImage(selectedLeague.logoUrl)}
                  alt={selectedLeague.name}
                  fill
                  className="object-cover p-1"
                  style={{ borderRadius: '50%' }}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold truncate">{selectedLeague.name}</h2>
                <p className="text-gray-400 text-xs sm:text-sm truncate">
                  {selectedLeague.description || selectedLeague.type}
                </p>
                <div className="flex items-center text-xs sm:text-sm mt-1 text-gray-500">
                  <span className="truncate">
                    {selectedLeague.syncedTeams}/{selectedLeague.teamsCount} teams synced{' '}
                    {selectedLeague.lastSynced}
                  </span>
                  <button
                    onClick={() => fetchMatchups(selectedLeague)}
                    className="ml-2 text-green-500 hover:text-green-400 flex-shrink-0"
                  >
                    <RefreshCw size={14} className="sm:size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/*──────────── Carousel (memoised) ────────────*/}
        <Carousel
          leagues={syncedLeagues}
          currentId={selectedLeague?.id}
          onSelect={onSelectLeague}
        />

        {/*──────────── Tabs ────────────*/}
        <div className="border-b border-zinc-800 flex overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.name}
              onClick={() => setActiveTab(t.name as any)}
              className={`px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                activeTab === t.name
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/*──────────── Matchups tab ────────────*/}
        {activeTab === 'Matchups' && selectedLeague && (
          <div className="px-2 sm:px-4 mt-4">
            {/* Table header */}
            <div className="grid grid-cols-[3fr_0.7fr_1.4fr] text-[10px] sm:text-sm text-gray-500 px-2 sm:px-4 py-2">
              <div>Proj. Pts / Team</div>
              <div className="text-center">Line</div>
              <div className="grid grid-cols-2">
                <div className="text-center">Spread</div>
                <div className="text-center">Total</div>
              </div>
            </div>

            {/* Skeleton while loading */}
            {matchupsLoading || isPending ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : matchups.length ? (
              matchups.map((m) => (
                <div key={m.id} className="bg-zinc-900 rounded-lg mb-2 overflow-hidden">
                  {/* team A */}
                  <div className="grid grid-cols-[3fr_0.7fr_1.4fr] items-center py-2.5 sm:py-3 px-2 sm:px-4 border-b-2 border-black/40">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="text-sm sm:text-lg font-semibold text-green-500">
                        {m.teamA.projectedFantasyPoints.toFixed(1)}
                      </div>
                      <div className="relative size-5 sm:size-8 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ml-1">
                        <Image
                          src={safeImage(m.teamA.logoUrl)}
                          alt={m.teamA.teamName}
                          fill
                          className="object-cover p-0.5 sm:p-1"
                          style={{ borderRadius: '50%' }}
                        />
                      </div>
                      <span className="truncate text-[11px] sm:text-base">{m.teamA.teamName}</span>
                    </div>

                    <div className={`text-center text-[11px] sm:text-base relative ${oddsColor}`}>
                      <div className="absolute left-0 top-0 h-full w-[2px] bg-black/40" />
                      {moneyline(m.teamA.moneylineOdds)}
                    </div>

                    <div className="grid grid-cols-2 relative">
                      <div className="absolute left-0 top-0 h-full w-[2px] bg-black/40" />
                      <div className={`text-center text-[11px] sm:text-base relative ${oddsColor}`}>
                        {m.teamA.spreadFantasyPoints
                          ? `-${m.teamA.spreadFantasyPoints.toFixed(1)}`
                          : '–'}
                        <div className="absolute right-0 top-0 h-full w-[2px] bg-black/40" />
                      </div>
                      <div className={`text-center text-[11px] sm:text-base ${oddsColor}`}>
                        O {m.total.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  {/* team B */}
                  <div className="grid grid-cols-[3fr_0.7fr_1.4fr] items-center py-2.5 sm:py-3 px-2 sm:px-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="text-sm sm:text-lg font-semibold text-gray-400">
                        {m.teamB.projectedFantasyPoints.toFixed(1)}
                      </div>
                      <div className="relative size-5 sm:size-8 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ml-1">
                        <Image
                          src={safeImage(m.teamB.logoUrl)}
                          alt={m.teamB.teamName}
                          fill
                          className="object-cover p-0.5 sm:p-1"
                          style={{ borderRadius: '50%' }}
                        />
                      </div>
                      <span className="truncate text-[11px] sm:text-base">{m.teamB.teamName}</span>
                    </div>

                    <div className={`text-center text-[11px] sm:text-base relative ${oddsColor}`}>
                      <div className="absolute left-0 top-0 h-full w-[2px] bg-black/40" />
                      {moneyline(m.teamB.moneylineOdds)}
                    </div>

                    <div className="grid grid-cols-2 relative">
                      <div className="absolute left-0 top-0 h-full w-[2px] bg-black/40" />
                      <div className={`text-center text-[11px] sm:text-base relative ${oddsColor}`}>
                        {m.teamB.spreadFantasyPoints
                          ? `+${m.teamB.spreadFantasyPoints.toFixed(1)}`
                          : '–'}
                        <div className="absolute right-0 top-0 h-full w-[2px] bg-black/40" />
                      </div>
                      <div className={`text-center text-[11px] sm:text-base ${oddsColor}`}>
                        U {m.total.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No matchups found for Week {config?.currentNFLWeek}.</p>
              </div>
            )}
          </div>
        )}

        {/*────────────  Other tabs unclipped for brevity  ────────────*/}
        {activeTab !== 'Matchups' && (
          <div className="px-2 sm:px-4 mt-20 text-center text-gray-500">
            <p>{activeTab} coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
} 