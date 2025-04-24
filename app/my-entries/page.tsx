"use client";

import { Header } from "@/components/ui/header";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePolymarketEntries } from "@/lib/hooks/use-polymarket-entries";
import { useFantasyMatchupEntries } from "@/lib/hooks/use-fantasy-matchup-entries";
import EntryCard from "@/components/ui/entry-card";
import FantasyMatchupEntryCard from "@/components/ui/fantasy-matchup-entry-card";

type EntryStatus = 'all' | 'open' | 'won' | 'lost';

export default function EntriesPage() {
  const { entries: polymarketEntries, isLoading: isLoadingPolymarket, error: polymarketError } = usePolymarketEntries();
  const { entries: fantasyEntries, isLoading: isLoadingFantasy, error: fantasyError } = useFantasyMatchupEntries();
  const [activeTab, setActiveTab] = useState<EntryStatus>('all');
  const user = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
    }
  }, [user, router]);

  // If not authenticated, show nothing while redirecting
  if (!user) {
    return null;
  }

  const isLoading = isLoadingPolymarket || isLoadingFantasy;
  const error = polymarketError || fantasyError;

  // Combine and sort entries by date
  const allEntries = [
    ...polymarketEntries.map(entry => ({ ...entry, type: 'polymarket' as const })),
    ...fantasyEntries.map(entry => ({ ...entry, type: 'fantasy' as const }))
  ].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

  // Filter entries based on active tab
  const filteredEntries = allEntries.filter(entry => {
    switch (activeTab) {
      case 'open':
        return entry.status === 'submitted';
      case 'won':
        return entry.status === 'won';
      case 'lost':
        return entry.status === 'lost';
      default:
        return true;
    }
  });

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-2xl mx-auto px-6 pt-2 pb-24">
        <div className="flex w-full border-b border-[#2A2A2D] mb-4">
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-6 py-2 text-sm font-medium ${
              activeTab === 'all' 
                ? 'text-white border-b-2 border-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setActiveTab('open')}
            className={`flex-1 px-6 py-2 text-sm font-medium ${
              activeTab === 'open' 
                ? 'text-white border-b-2 border-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Open
          </button>
          <button 
            onClick={() => setActiveTab('won')}
            className={`flex-1 px-6 py-2 text-sm font-medium ${
              activeTab === 'won' 
                ? 'text-white border-b-2 border-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Won
          </button>
          <button 
            onClick={() => setActiveTab('lost')}
            className={`flex-1 px-6 py-2 text-sm font-medium ${
              activeTab === 'lost' 
                ? 'text-white border-b-2 border-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Lost
          </button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading entries...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Error loading entries: {error.message}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No entries found for the selected filter.
            </div>
          ) : (
            filteredEntries.map((entry) => (
              entry.type === 'polymarket' ? (
                <EntryCard key={entry.id} entry={entry} />
              ) : (
                <FantasyMatchupEntryCard key={entry.id} entry={entry} />
              )
            ))
          )}
        </div>
      </div>
    </main>
  );
} 