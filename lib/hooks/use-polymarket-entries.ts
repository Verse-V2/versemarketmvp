import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, getFirestore, Timestamp, doc, getDoc, addDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';

export interface PolymarketPick {
  eventId: string;
  id: string;
  marketId: string;
  outcomePrices: string;
  outcomes: string[];
  question: string;
  selectedOutcome: string;
  status: string;
  timestamp: Timestamp;
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
}

// Temporary function to create a test entry
export async function createTestEntry(userId: string) {
  const db = getFirestore();
  try {
    const testEntry = {
      createdAt: Timestamp.now(),
      userId: userId,
      picks: [
        {
          eventId: "test-event-1",
          id: "test-pick-1",
          marketId: "test-market-1",
          outcomePrices: "+150",
          outcomes: ["Yes", "No"],
          question: "Will this test entry work?",
          selectedOutcome: "Yes",
          status: "pending",
          timestamp: Timestamp.now()
        }
      ],
      status: "pending",
      totalPayout: 150,
      transactionId: "test-transaction-1",
      wager: 100
    };

    const docRef = await addDoc(collection(db, 'polymarketEntry'), testEntry);
    console.log('Test entry created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating test entry:', error);
    throw error;
  }
}

export function usePolymarketEntries() {
  const [entries, setEntries] = useState<PolymarketEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const user = useAuth();

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
    const entriesRef = collection(db, 'polymarketEntry');
    
    // Log the collection path
    console.log('Collection path:', entriesRef.path);

    const userEntriesQuery = query(
      entriesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // Log the query details
    console.log('Query details:', {
      collection: entriesRef.path,
      conditions: {
        userId: userId,
        orderBy: 'createdAt desc'
      }
    });

    const unsubscribe = onSnapshot(
      userEntriesQuery,
      (snapshot) => {
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
        
        console.log('Processed entries:', {
          count: entriesData.length,
          entries: entriesData.map(entry => ({
            id: entry.id,
            userId: entry.userId,
            createdAt: entry.createdAt,
            picksCount: entry.picks.length
          }))
        });
        
        setEntries(entriesData);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching entries:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { entries, isLoading, error };
} 