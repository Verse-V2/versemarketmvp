'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MarketCard } from "@/components/ui/market-card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { useAuth } from "@/lib/auth-context";
import type { Market } from "@/lib/polymarket-api";
import { firebaseService } from "@/lib/firebase-service";
import { getPredictionsFilters } from "@/lib/predictions-config";
import { Trophy, ChevronRight, Search, X } from "lucide-react";
import { DocumentData } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { LeagueSyncContent } from "@/components/ui/league-sync-content";

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
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    setMarkets([]);
    setLastVisible(null);
    setHasMore(true);
    
    // Use tag filter if not "All" or "Trending" (both show all markets)
    const tagFilter = activeTag !== 'All' && activeTag !== 'Trending' ? activeTag : undefined;
    
    // Set up real-time listener for market updates
    const unsubscribe = firebaseService.onEventsUpdate(tagFilter, 50, null, (updatedMarkets, lastDoc) => {
      setMarkets(updatedMarkets);
      setLastVisible(lastDoc);
      setLoading(false);
      setHasMore(updatedMarkets.length > 0); // If we got any markets, there might be more
    });

    // Cleanup listener when component unmounts or filter changes
    return () => {
      unsubscribe();
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

  // Filtered markets for search
  const filteredMarkets = searchMode && searchQuery
    ? markets.filter((market) =>
        market.question?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : markets;

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-4 pb-6">
        <div className={`flex overflow-x-auto pb-1 -mx-4 px-4 ${activeTag === 'Fantasy Football' ? 'mb-2' : 'mb-4'} no-scrollbar items-center`}>
          {/* Search Icon */}
          {!searchMode && (
            <button
              className="mr-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => setSearchMode(true)}
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-gray-500" />
            </button>
          )}
          {/* Search Bar */}
          {searchMode && (
            <div className="flex items-center w-full max-w-md md:max-w-2xl lg:max-w-3xl bg-transparent rounded-lg px-0 py-0 mr-0 md:mr-4">
              <Search className="h-5 w-5 text-gray-400 mr-2" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1"
              />
              <button
                className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => { setSearchMode(false); setSearchQuery(""); }}
                aria-label="Close search"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          )}
          {/* Choice chips: hide on mobile if searchMode, show always on md+ */}
          <div className={`flex flex-1 items-center ${searchMode ? 'hidden' : ''} md:flex md:items-center md:space-x-0`}>
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

        {/* LeagueSync Promotional Header - Hidden when Fantasy Football tab is active */}
        {activeTag !== 'Fantasy Football' && (
          <Link href="/leagueSyncHome" className="block mb-6 group">
            <div className="bg-[#0BC700] text-white p-3 rounded-lg flex items-center justify-between transition-all duration-300 ease-in-out hover:opacity-90 shadow-sm hover:shadow transform hover:-translate-y-0.5 relative overflow-hidden">
              <div className="flex items-center space-x-2">
                <div className="bg-white/20 rounded-full p-1.5">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold text-base">Play League Sync</span>
              </div>
              <ChevronRight className="h-5 w-5 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        )}

        {/* Show League Sync Content when Fantasy Football is selected */}
        {activeTag === 'Fantasy Football' ? (
          <div className="bg-black rounded-lg overflow-hidden">
            <LeagueSyncContent embedded={true} />
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-[300px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"
              />
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
            {!searchMode && <div ref={observerTarget} className="h-4 mt-4" />}
            
            {/* No more content indicator */}
            {!hasMore && filteredMarkets.length > 0 && !searchMode && (
              <div className="text-center mt-6 text-gray-500 dark:text-gray-400">
                No more markets to load
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No markets found{searchMode && searchQuery ? ' for your search.' : ' for the selected category.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
