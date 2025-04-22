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
import { Trophy, ChevronRight } from "lucide-react";
import { DocumentData } from "firebase/firestore";

export default function Home() {
  const router = useRouter();
  const user = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTag, setActiveTag] = useState('All');
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [predictionFilters, setPredictionFilters] = useState<string[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);

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
    const tagFilter = activeTag !== 'All' ? activeTag : undefined;

    const unsubscribe = firebaseService.onEventsUpdate(tagFilter, 12, lastVisible, (newMarkets, lastDoc) => {
      setMarkets(prev => [...prev, ...newMarkets]);
      setLastVisible(lastDoc);
      setLoadingMore(false);
      setHasMore(newMarkets.length === 12);
      unsubscribe(); // Unsubscribe immediately since we don't need real-time updates for older content
    });
  }, [lastVisible, hasMore, loadingMore, activeTag]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setMarkets([]);
    setLastVisible(null);
    setHasMore(true);
    
    // Use tag filter if not "All"
    const tagFilter = activeTag !== 'All' ? activeTag : undefined;
    
    // Set up real-time listener for market updates
    const unsubscribe = firebaseService.onEventsUpdate(tagFilter, 12, null, (updatedMarkets, lastDoc) => {
      setMarkets(updatedMarkets);
      setLastVisible(lastDoc);
      setLoading(false);
      setHasMore(updatedMarkets.length === 12);
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
        <div className="flex overflow-x-auto pb-1 -mx-4 px-4 mb-4 no-scrollbar">
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

        {/* LeagueSync Promotional Header */}
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

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-[300px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : markets.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market) => (
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
            <div ref={observerTarget} className="h-4 mt-4" />
            
            {/* No more content indicator */}
            {!hasMore && markets.length > 0 && (
              <div className="text-center mt-6 text-gray-500 dark:text-gray-400">
                No more markets to load
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No markets found for the selected category.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
