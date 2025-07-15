import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, getFirestore, Timestamp, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { firebaseService } from '@/lib/firebase-service';

export interface PolymarketPick {
  eventId: string;
  id: string;
  marketId: string;
  outcomePrices: string;
  outcomes: string[];
  question?: string;
  selectedOutcome?: string;
  eventTitle?: string;
  marketTitle?: string;
  outcome?: string;
  decimalOdds?: string;
  moneylineOdds?: string;
  status: string;
  timestamp: Timestamp;
  imageUrl?: string;
}

export interface PolymarketEntry {
  createdAt: Timestamp;
  id: string;
  picks: PolymarketPick[];
  status: string;
  totalPayout: number;
  transactionId: string;
  userId: string;
  wager: number;
  moneylineOdds: string | null;
  decimalOdds: number;
  isCash: boolean;
}


export function usewebPredictionEntries() {
  const [entries, setEntries] = useState<PolymarketEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const user = useAuth();
  const { currency } = useCurrency();

  // First effect to fetch the user's ID from their document
  useEffect(() => {
    async function fetchUserId() {
      if (!user?.uid) {
        console.log('No auth user, clearing userId');
        setUserId(null);
        return;
      }

      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('Found user document:', { 
            uid: user.uid, 
            id: userData.id,
            docData: userData 
          });
          setUserId(userData.id);
        } else {
          console.log('No user document found for uid:', user.uid);
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
    console.log('Current userId for entries query:', userId);
    
    if (!userId) {
      console.log('No userId available, clearing entries');
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const db = getFirestore();
    const entriesRef = collection(db, 'webPredictionEntries');
    
    // Log the collection path
    console.log('Collection path:', entriesRef.path);

    const userEntriesQuery = query(
      entriesRef,
      where('userId', '==', userId),
      where('isCash', '==', currency === 'cash'),
      orderBy('createdAt', 'desc')
    );

    // Log the query details
    console.log('Query details:', {
      collection: entriesRef.path,
      conditions: {
        userId: userId,
        isCash: currency === 'cash',
        orderBy: 'createdAt desc'
      }
    });

    const unsubscribe = onSnapshot(
      userEntriesQuery,
      async (snapshot) => {
        // Log raw snapshot data
        console.log('Raw snapshot data:', snapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        })));

        console.log('Query snapshot received:', {
          empty: snapshot.empty,
          size: snapshot.size,
          metadata: {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites
          },
          docs: snapshot.docs.map(doc => ({ 
            id: doc.id, 
            userId: doc.data().userId,
            createdAt: doc.data().createdAt,
            picks: doc.data().picks?.length || 0
          }))
        });
        
        const entriesData = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })) as PolymarketEntry[];
        
        // Fetch event images for each pick in each entry
        const enhancedEntries = await Promise.all(entriesData.map(async (entry) => {
          const enhancedPicks = await Promise.all(entry.picks.map(async (pick) => {
            // Only fetch if we have an eventId and don't already have an imageUrl
            if (pick.eventId && !pick.imageUrl) {
              try {
                // Use the firebaseService to fetch the event by ID
                const event = await firebaseService.getEventById(pick.eventId);
                if (event && event.image) {
                  return {
                    ...pick,
                    imageUrl: event.image
                  };
                }
              } catch (error) {
                console.error(`Error fetching image for event ${pick.eventId}:`, error);
              }
            }
            return pick;
          }));
          
          return {
            ...entry,
            picks: enhancedPicks
          };
        }));
        
        console.log('Processed entries with images:', {
          count: enhancedEntries.length,
          entries: enhancedEntries.map(entry => ({
            id: entry.id,
            userId: entry.userId,
            createdAt: entry.createdAt,
            picksCount: entry.picks.length,
            picksWithImages: entry.picks.filter(p => p.imageUrl).length
          }))
        });
        
        setEntries(enhancedEntries);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching entries:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, currency]);

  return { entries, isLoading, error };
} 