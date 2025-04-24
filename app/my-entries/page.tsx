"use client";

import { Header } from "@/components/ui/header";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePolymarketEntries } from "@/lib/hooks/use-polymarket-entries";
import { useFantasyMatchupEntries } from "@/lib/hooks/use-fantasy-matchup-entries";
import EntryCard from "@/components/ui/entry-card";
import FantasyMatchupEntryCard from "@/components/ui/fantasy-matchup-entry-card";

export default function EntriesPage() {
  const { entries: polymarketEntries, isLoading: isLoadingPolymarket, error: polymarketError } = usePolymarketEntries();
  const { entries: fantasyEntries, isLoading: isLoadingFantasy, error: fantasyError } = useFantasyMatchupEntries();
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

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-2xl mx-auto p-6 pb-24">
        <div className="space-y-1.5 mb-6">
          <h1 className="text-lg font-semibold">My Entries</h1>
          <p className="text-sm text-muted-foreground">
            View your active and settled entries
          </p>
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
          ) : allEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No entries yet. Place your first bet to get started!
            </div>
          ) : (
            allEntries.map((entry) => (
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