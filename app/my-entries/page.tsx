"use client";

import { Header } from "@/components/ui/header";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePolymarketEntries } from "@/lib/hooks/use-polymarket-entries";
import { useFantasyMatchupEntries } from "@/lib/hooks/use-fantasy-matchup-entries";
import EntryCard from "@/components/ui/entry-card";
import FantasyMatchupEntryCard from "@/components/ui/fantasy-matchup-entry-card";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

type EntryStatus = 'all' | 'open' | 'settled' | 'won' | 'lost';

export default function EntriesPage() {
  const { entries: polymarketEntries, isLoading: isLoadingPolymarket, error: polymarketError } = usePolymarketEntries();
  const { 
    entries: fantasyEntries, 
    isLoading: isLoadingFantasy, 
    error: fantasyError,
    updateStatus,
    updateMessage
  } = useFantasyMatchupEntries();
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
      case 'settled':
        return entry.status === 'won' || entry.status === 'lost';
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
        {/* Update Status Banner */}
        {updateStatus !== 'idle' && updateMessage && (
          <div className="mb-4">
            <div className={`
              rounded-lg p-3 flex items-center gap-2 text-sm
              ${updateStatus === 'updating' ? 'bg-blue-900/30 text-blue-300 border border-blue-500/30' : ''}
              ${updateStatus === 'success' ? 'bg-green-900/30 text-green-300 border border-green-500/30' : ''}
              ${updateStatus === 'error' ? 'bg-red-900/30 text-red-300 border border-red-500/30' : ''}
            `}>
              {updateStatus === 'updating' && <RefreshCw size={16} className="animate-spin flex-shrink-0" />}
              {updateStatus === 'success' && <CheckCircle size={16} className="flex-shrink-0" />}
              {updateStatus === 'error' && <AlertCircle size={16} className="flex-shrink-0" />}
              <span>{updateMessage}</span>
            </div>
          </div>
        )}



        <div className="flex w-full border-b border-[#2A2A2D] mb-4">
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-2 py-2 text-xs font-medium ${
              activeTab === 'all' 
                ? 'text-white border-b-2 border-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setActiveTab('open')}
            className={`flex-1 px-2 py-2 text-xs font-medium ${
              activeTab === 'open' 
                ? 'text-white border-b-2 border-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Open
          </button>
          <button 
            onClick={() => setActiveTab('settled')}
            className={`flex-1 px-2 py-2 text-xs font-medium ${
              activeTab === 'settled' 
                ? 'text-white border-b-2 border-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Settled
          </button>
          <button 
            onClick={() => setActiveTab('won')}
            className={`flex-1 px-2 py-2 text-xs font-medium ${
              activeTab === 'won' 
                ? 'text-white border-b-2 border-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Won
          </button>
          <button 
            onClick={() => setActiveTab('lost')}
            className={`flex-1 px-2 py-2 text-xs font-medium ${
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