import { useState, useEffect } from 'react';
import { collection, query, where, Timestamp, doc, getDoc, getFirestore, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';

export interface FantasyMatchupTeam {
  fantasyPoints: number;
  logoUrl: string;
  name: string;
  ownerDisplayName: string;
  ownerId: string;
  projectedFantasyPoints: number;
  starters: string[];
  teamId: string;
  startersPoints?: { playerId: string; statsBasedPoints: number }[];
}

export interface FantasyMatchupPick {
  Teams: FantasyMatchupTeam[];
  decimalOdds: number;
  id: string;
  isOver: boolean;
  isSpreadPositive: boolean;
  leagueId: string;
  matchupId: string;
  moneylineOdds: number;
  multiplierOdds: number;
  pickType: 'spread' | 'moneyline' | 'total';
  pointSpread: number;
  season: string;
  seasonWeek: string;
  selectedTeamId: string;
  serviceProvider: string;
  status: string;
  timestamp: Timestamp;
  totalPoints: number;
}

export interface FantasyMatchupEntry {
  createdAt: Timestamp;
  decimalOdds: number;
  entryType: 'single' | 'parlay';
  id: string;
  isCash: boolean;
  moneylineOdds: number;
  picks: FantasyMatchupPick[];
  status: string;
  totalPayout: number;
  transactionId: string;
  userId: string;
  vsHouse: boolean;
  wager: number;
}

export function useFantasyMatchupEntries() {
  const [entries, setEntries] = useState<FantasyMatchupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const user = useAuth();
  const { currency } = useCurrency();

  // First effect to fetch the user's ID from their document
  useEffect(() => {
    async function fetchUserId() {
      if (!user?.uid) {
        setUserId(null);
        return;
      }

      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserId(userData.id);
        } else {
          setUserId(null);
        }
      } catch (err) {
        console.error('Error fetching user document:', err);
        setUserId(null);
      }
    }

    fetchUserId();
  }, [user?.uid]);

  // Second effect to fetch entries using the user's ID
  useEffect(() => {
    if (!userId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const entriesRef = collection(db, 'fantasyMatchupEntries');
    const userEntriesQuery = query(
      entriesRef,
      where('userId', '==', userId),
      where('isCash', '==', currency === 'cash'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      userEntriesQuery,
      (snapshot) => {
        const fetchedEntries = snapshot.docs.map(doc => {
          const entry = doc.data() as FantasyMatchupEntry;
          // Transform moneyline odds to include "+" for positive values
          if (entry.moneylineOdds > 0) {
            entry.moneylineOdds = Number(`+${entry.moneylineOdds}`);
          }
          return {
            ...entry,
            id: doc.id,
          };
        }) as FantasyMatchupEntry[];
        
        setEntries(fetchedEntries);
        setIsLoading(false);
      },
      (err) => {
        setError(err as Error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, currency]);

  return { entries, isLoading, error };
} 