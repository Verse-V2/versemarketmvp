'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MarketCard } from "@/components/ui/market-card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { useAuth } from "@/lib/auth-context";
import type { Market } from "@/lib/polymarket-api";
import { firebaseService } from "@/lib/firebase-service";
import { Trophy, ChevronRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const user = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('All');

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (user === null) {
      router.push('/auth');
    }
  }, [user, router]);

  // All possible tag options
  const categories = [
    "All", "NBA", "NFL", "Sports", "Politics", "Crypto", 
    "Tech", "Culture", "World", "Trump", "Economy"
  ];

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    // Use tag filter if not "All"
    const tagFilter = activeTag !== 'All' ? activeTag : undefined;
    
    // Set up real-time listener for market updates
    const unsubscribe = firebaseService.onEventsUpdate(tagFilter, 300, (updatedMarkets) => {
      setMarkets(updatedMarkets);
      setLoading(false);
    });

    // Cleanup listener when component unmounts or filter changes
    return () => {
      unsubscribe();
    };
  }, [activeTag, user]);

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
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((tag) => (
            <Button
              key={tag}
              variant={activeTag === tag ? "default" : "outline"}
              onClick={() => handleTagClick(tag)}
              className="text-sm"
            >
              {tag}
            </Button>
          ))}
        </div>

        {/* LeagueSync Promotional Header */}
        <Link href="/leagueSyncHome" className="block mb-8 group">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg flex items-center justify-between transition-all duration-300 ease-in-out hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transform hover:-translate-y-1 relative overflow-hidden">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-full p-2">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <span className="font-semibold text-lg">Play League Sync</span>
            </div>
            <ChevronRight className="h-6 w-6 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
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
