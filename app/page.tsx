'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMarkets } from "@/lib/polymarket-api";
import { MarketCard } from "@/components/ui/market-card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { useAuth } from "@/lib/auth-context";
import type { Market } from "@/lib/polymarket-api";

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
    async function fetchMarkets() {
      setLoading(true);
      try {
        // Use tag filter if not "All"
        const tagFilter = activeTag !== 'All' ? activeTag : undefined;
        const data = await getMarkets(300, tagFilter);
        setMarkets(data);
      } catch (error) {
        console.error("Failed to fetch markets:", error);
      } finally {
        setLoading(false);
      }
    }

    // Only fetch if user is authenticated
    if (user) {
      fetchMarkets();
    }
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
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center bg-white dark:bg-black p-4 md:p-8 lg:p-24">
        <div className="w-full max-w-7xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Timeline</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Welcome, {user.email}</p>
            
            <div className="relative mb-4">
              <div className="flex overflow-x-auto pb-2 space-x-2 -mx-4 px-4 no-scrollbar">
                {categories.map((category) => (
                  <Button 
                    key={category} 
                    variant={category === activeTag ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => handleTagClick(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-black to-transparent pointer-events-none"></div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : markets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl">No markets available for this category</p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Try selecting a different category</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
