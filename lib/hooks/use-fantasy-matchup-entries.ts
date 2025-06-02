import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, Timestamp, doc, getDoc, getFirestore, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { entryService } from '@/lib/entry-service';

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
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const user = useAuth();
  const { currency } = useCurrency();
  
  // Ref to track if component is mounted
  const mounted = useRef(true);

  // First effect to fetch the user's ID from their document
  useEffect(() => {
    async function fetchUserId() {
      console.log('useFantasyMatchupEntries: fetchUserId called, user?.uid:', user?.uid);
      
      if (!user?.uid) {
        console.log('useFantasyMatchupEntries: No user UID, setting userId to null');
        setUserId(null);
        return;
      }

      try {
        console.log('useFantasyMatchupEntries: Fetching user document from Firestore...');
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('useFantasyMatchupEntries: User document found, userData.id:', userData.id);
          setUserId(userData.id);
        } else {
          console.log('useFantasyMatchupEntries: User document does not exist');
          setUserId(null);
        }
      } catch (err) {
        console.error('useFantasyMatchupEntries: Error fetching user document:', err);
        setUserId(null);
      }
    }

    fetchUserId();
  }, [user?.uid]);

  // Check and update entries if needed (matching iOS implementation)
  const checkAndUpdateEntriesIfNeeded = useCallback(async () => {
    console.log('useFantasyMatchupEntries: checkAndUpdateEntriesIfNeeded called');
    console.log('useFantasyMatchupEntries: Current state:', { 
      userUid: user?.uid, 
      userId, 
      mounted: mounted.current 
    });

    if (!user?.uid || !userId) {
      console.log('useFantasyMatchupEntries: Missing user or userId, skipping update');
      return;
    }

    try {
      console.log('useFantasyMatchupEntries: Starting entry update process');
      setUpdateStatus('updating');
      setUpdateMessage('Checking for entry updates...');

      console.log('useFantasyMatchupEntries: Getting Firebase auth token...');
      // Get Firebase auth token (force refresh)
      const authToken = await user.getIdToken(true);
      console.log('useFantasyMatchupEntries: Got auth token, length:', authToken?.length || 0);
      
      console.log('useFantasyMatchupEntries: Initializing entry service from storage...');
      // Initialize storage and check for updates
      entryService.initializeFromStorage(userId);
      
      console.log('useFantasyMatchupEntries: Calling entryService.checkAndUpdateEntriesIfNeeded...');
      const updateResult = await entryService.checkAndUpdateEntriesIfNeeded(userId, authToken);
      console.log('useFantasyMatchupEntries: Entry service returned result:', updateResult);

      if (mounted.current) {
        console.log('useFantasyMatchupEntries: Component still mounted, updating state');
        if (updateResult.success) {
          console.log('useFantasyMatchupEntries: Update successful, setting success status');
          setUpdateStatus('success');
          setUpdateMessage(updateResult.message || 'Entries checked successfully');
          
          // If it was skipped due to cooldown, clear the message faster
          const clearDelay = updateResult.message?.includes('recently updated') ? 1500 : 3000;
          
          // Clear status messages after a delay
          setTimeout(() => {
            if (mounted.current) {
              console.log('useFantasyMatchupEntries: Clearing status messages after timeout');
              setUpdateStatus('idle');
              setUpdateMessage('');
            } else {
              console.log('useFantasyMatchupEntries: Component unmounted during timeout, not clearing status');
            }
          }, clearDelay);
        } else {
          console.log('useFantasyMatchupEntries: Update failed, setting error status');
          setUpdateStatus('error');
          setUpdateMessage(updateResult.message || 'Failed to update entries');
          
          // Clear error messages after standard delay
          setTimeout(() => {
            if (mounted.current) {
              console.log('useFantasyMatchupEntries: Clearing error status after timeout');
              setUpdateStatus('idle');
              setUpdateMessage('');
            }
          }, 3000);
        }
      } else {
        console.log('useFantasyMatchupEntries: Component unmounted, skipping state updates');
      }
    } catch (error) {
      console.error('useFantasyMatchupEntries: Error in checkAndUpdateEntriesIfNeeded:', error);
      console.error('useFantasyMatchupEntries: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      if (mounted.current) {
        console.log('useFantasyMatchupEntries: Setting error status after exception');
        setUpdateStatus('error');
        setUpdateMessage('Failed to check for updates');
      }
    }
  }, [user, userId]);

  // Manual refresh function (bypasses cooldown)
  const refreshEntries = useCallback(async () => {
    if (!user?.uid || !userId) return;

    try {
      setUpdateStatus('updating');
      setUpdateMessage('Refreshing entries...');

      // Get Firebase auth token (force refresh)
      const authToken = await user.getIdToken(true);
      
      const updateResult = await entryService.refreshEntries(userId, authToken);

      if (mounted.current) {
        if (updateResult.success) {
          setUpdateStatus('success');
          setUpdateMessage('Entries refreshed successfully');
        } else {
          setUpdateStatus('error');
          setUpdateMessage(updateResult.message || 'Failed to refresh entries');
        }

        // Clear status messages after a delay
        setTimeout(() => {
          if (mounted.current) {
            setUpdateStatus('idle');
            setUpdateMessage('');
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error refreshing entries:', error);
      if (mounted.current) {
        setUpdateStatus('error');
        setUpdateMessage('Failed to refresh entries');
      }
    }
  }, [user, userId]);

  // Second effect to fetch entries using the user's ID and set up cloud function integration
  useEffect(() => {
    if (!userId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Check for updates when entries are first loaded
    checkAndUpdateEntriesIfNeeded();

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
  }, [userId, currency, checkAndUpdateEntriesIfNeeded]);

  // Auto-refresh timer setup and cleanup (matching iOS startAutoRefreshTimer)
  useEffect(() => {
    mounted.current = true; // Ensure it's set to true on mount
    
    if (!user?.uid || !userId) return;

    // Start auto-refresh timer
    entryService.startAutoRefreshTimer(userId, async () => {
      return await user.getIdToken(true);
    });

    return () => {
      console.log('useFantasyMatchupEntries: Component unmounting, setting mounted to false');
      mounted.current = false;
      entryService.stopAutoRefreshTimer();
    };
  }, [user, userId]);

  return { 
    entries, 
    isLoading, 
    error, 
    updateStatus, 
    updateMessage, 
    refreshEntries 
  };
} 