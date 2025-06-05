'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MarketCard } from "@/components/ui/market-card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { useAuth } from "@/lib/auth-context";
import type { Market } from "@/lib/polymarket-api";
import { firebaseService } from "@/lib/firebase-service";
import { getPredictionsFilters } from "@/lib/predictions-config";
import { Trophy, Search, X, SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { DocumentData } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { LeagueSyncContent } from "@/components/ui/league-sync-content";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function Home() {
  const router = useRouter();
  const user = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTag, setActiveTag] = useState('Trending');
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [predictionFilters, setPredictionFilters] = useState<string[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Volume");
  const [showFilters, setShowFilters] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadingDebounceTimer, setLoadingDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showLeagueSyncBanner, setShowLeagueSyncBanner] = useState(false);

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (user === null) {
      router.push('/auth');
    }
  }, [user, router]);

  // Load categories from config
  useEffect(() => {
    const loadCategories = async () => {
      const filters = await getPredictionsFilters();
      setPredictionFilters(filters);
    };
    loadCategories();
  }, []);

  // Check if LeagueSync banner should be shown
  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return;
    
    const sessionId = sessionStorage.getItem('sessionId') || Date.now().toString();
    const dismissedSession = localStorage.getItem('leagueSyncBannerDismissed');
    
    // If no session ID exists, create one
    if (!sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', sessionId);
    }
    
    // Show banner if it wasn't dismissed in this session
    setShowLeagueSyncBanner(dismissedSession !== sessionId);
  }, []);

  // Load more markets when user scrolls to bottom
  const loadMoreMarkets = useCallback(() => {
    if (!lastVisible || !hasMore || loadingMore) return;

    setLoadingMore(true);
    const tagFilter = activeTag !== 'All' && activeTag !== 'Trending' ? activeTag : undefined;

    const unsubscribe = firebaseService.onEventsUpdate(tagFilter, 50, lastVisible, (newMarkets, lastDoc) => {
      // Append only markets that are not already in the list to avoid duplicate keys
      setMarkets(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const uniqueToAdd = newMarkets.filter(m => !existingIds.has(m.id));
        return [...prev, ...uniqueToAdd];
      });
      setLastVisible(lastDoc);
      setLoadingMore(false);
      setHasMore(newMarkets.length > 0); // If we got any markets, there might be more
      unsubscribe(); // Unsubscribe immediately since we don't need real-time updates for older content
    });
  }, [lastVisible, hasMore, loadingMore, activeTag]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setIsTransitioning(true);
    setMarkets([]);
    setLastVisible(null);
    setHasMore(true);
    
    // Use tag filter if not "All" or "Trending" (both show all markets)
    const tagFilter = activeTag !== 'All' && activeTag !== 'Trending' ? activeTag : undefined;
    
    // Set up real-time listener for market updates
    const unsubscribe = firebaseService.onEventsUpdate(tagFilter, 50, null, (updatedMarkets, lastDoc) => {
      setMarkets(updatedMarkets);
      setLastVisible(lastDoc);
      setHasMore(updatedMarkets.length > 0); // If we got any markets, there might be more
      
      // Clear any existing debounce timer
      if (loadingDebounceTimer) {
        clearTimeout(loadingDebounceTimer);
      }
      
      // Set a new timer to end loading state after data has stabilized
      const newTimer = setTimeout(() => {
        setLoading(false);
        setIsTransitioning(false);
      }, 300); // Wait 300ms after last update to ensure data has stabilized
      
      setLoadingDebounceTimer(newTimer);
    });

    // Cleanup listener when component unmounts or filter changes
    return () => {
      unsubscribe();
      if (loadingDebounceTimer) {
        clearTimeout(loadingDebounceTimer);
      }
    };
  }, [activeTag, user]);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!user || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreMarkets();
        }
      },
      { threshold: 0.1 }
    );

    const currentObserverTarget = observerTarget.current;
    
    if (currentObserverTarget) {
      observer.observe(currentObserverTarget);
    }

    return () => {
      if (currentObserverTarget) {
        observer.unobserve(currentObserverTarget);
      }
    };
  }, [user, loading, hasMore, loadingMore, lastVisible, loadMoreMarkets]);

  // Filtered and sorted markets for search
  const filteredMarkets = useMemo(() => {
    // First filter out closed/ended events globally with double protection
    let result = markets.filter((market) => {
      // Check if market is not closed
      if (market.closed) return false;
      
      // Additional protection: check if endDate is in the future
      if (market.endDate) {
        const endDate = new Date(market.endDate);
        const now = new Date();
        return endDate > now;
      }
      
      // If no endDate, rely on closed status only
      return true;
    });
    
    // Then apply search filter if needed
    if (searchQuery) {
      result = result.filter((market) =>
        market.question?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting based on sortBy state
    if (sortBy === "Newest") {
      result = [...result].sort((a, b) => {
        const dateA = new Date(a.endDate || 0);
        const dateB = new Date(b.endDate || 0);
        return dateB.getTime() - dateA.getTime(); // Newest end dates first
      });
    } else if (sortBy === "Ending Soon") {
      result = [...result].sort((a, b) => {
        const dateA = new Date(a.endDate || 0);
        const dateB = new Date(b.endDate || 0);
        return dateA.getTime() - dateB.getTime(); // Earliest end dates first
      });
    }
    // Volume sorting can be added here if needed in the future

    return result;
  }, [markets, searchQuery, sortBy]);

  // Show loading state while checking auth
  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const handleTagClick = (tag: string) => {
    setActiveTag(tag);
  };

  const dismissLeagueSyncBanner = () => {
    const sessionId = sessionStorage.getItem('sessionId') || Date.now().toString();
    localStorage.setItem('leagueSyncBannerDismissed', sessionId);
    setShowLeagueSyncBanner(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Choice chips container - Sticky below header */}
      <div className="sticky top-14 z-40 bg-background border-b border-border/10">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto pb-1 -mx-4 px-4 py-2 no-scrollbar items-center">
            <div className="flex flex-1 items-center space-x-0">
              {predictionFilters.map((filter) => (
                <Button
                  key={filter}
                  variant={activeTag === filter ? "default" : "outline"}
                  onClick={() => handleTagClick(filter)}
                  className="text-sm whitespace-nowrap flex-shrink-0 mr-2"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-4 pt-4 pb-6">

        {/* Search container - Hidden when Fantasy Football is selected */}
        {activeTag !== 'Fantasy Football' && (
          <div className="mb-4 space-y-3">
            {/* Search Bar with Filter Icon */}
            <div className="flex items-center w-full bg-transparent rounded-lg px-0 py-0 gap-2">
              <Search className="h-5 w-5 text-gray-400 mr-2" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                {searchQuery && (
                  <button
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                )}
                <button
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setShowFilters(!showFilters)}
                  aria-label="Toggle filters"
                >
                  <SlidersHorizontal className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Sort and Filter Controls - Only shown when filter icon is clicked */}
            {showFilters && (
              <div className="flex items-center justify-end gap-3 text-sm">
                {/* Sort By Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                    Sort by: <span className="font-medium">{sortBy}</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setSortBy("Volume")} className="flex items-center justify-between">
                      Volume
                      {sortBy === "Volume" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("Newest")} className="flex items-center justify-between">
                      Newest
                      {sortBy === "Newest" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("Ending Soon")} className="flex items-center justify-between">
                      Ending Soon
                      {sortBy === "Ending Soon" && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}

        {/* LeagueSync Promotional Header - Hidden when Fantasy Football tab is active or dismissed */}
        {activeTag !== 'Fantasy Football' && showLeagueSyncBanner && (
          <div className="relative mb-6">
            <Link href="/leagueSyncHome" className="block group">
              <div className="bg-[#0BC700] text-white p-3 rounded-lg flex items-center transition-all duration-300 ease-in-out hover:opacity-90 shadow-sm hover:shadow transform hover:-translate-y-0.5 relative overflow-hidden">
                <div className="flex items-center space-x-2">
                  <div className="bg-white/20 rounded-full p-1.5">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-base">Play League Sync</span>
                </div>
              </div>
            </Link>
            {/* Dismiss button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismissLeagueSyncBanner();
              }}
              className="absolute top-1 right-1 p-1 rounded-full hover:bg-white/20 transition-colors z-10"
              aria-label="Dismiss League Sync banner"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        )}

        {/* Show League Sync Content when Fantasy Football is selected */}
        {activeTag === 'Fantasy Football' ? (
          <div className="bg-black rounded-lg overflow-hidden">
            <LeagueSyncContent embedded={true} />
          </div>
        ) : loading || isTransitioning || (markets.length === 0 && !searchQuery) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-full">
                <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm animate-pulse">
                  {/* Header with image and title */}
                  <div className="p-6 pb-0">
                    <div className="flex gap-4 items-start">
                      {/* Image skeleton */}
                      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-md shrink-0"></div>
                      {/* Title and date skeleton */}
                      <div className="flex-1 min-w-0">
                        <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mt-2"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content with betting options */}
                  <div className="p-6 py-1 flex-grow">
                    <div className="space-y-2">
                      {/* Betting option 1 */}
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                      </div>
                      {/* Betting option 2 */}
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="p-6 pt-0">
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
                      <div className="h-9 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMarkets.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMarkets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
            
            {/* Loading more indicator */}
            {loadingMore && (
              <div className="mt-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
              </div>
            )}
            
            {/* Intersection observer target */}
            {!searchQuery && <div ref={observerTarget} className="h-4 mt-4" />}
            
            {/* No more content indicator */}
            {!hasMore && filteredMarkets.length > 0 && !searchQuery && (
              <div className="text-center mt-6 text-gray-500 dark:text-gray-400">
                No more markets to load
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No markets found{searchQuery ? ' for your search.' : ' for the selected category.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
