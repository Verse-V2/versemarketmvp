import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, limit, orderBy, onSnapshot } from 'firebase/firestore';
import type { Market } from './polymarket-api';
import type { Event } from './polymarket-service';

// Your web app's Firebase configuration
const firebaseConfig = {
  // TODO: Replace with your Firebase config
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

class FirebaseService {
  // Get a single event by ID
  async getEventById(id: string): Promise<Event | null> {
    try {
      const docRef = doc(db, 'predictionEvents', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return docSnap.data() as Event;
    } catch (error) {
      console.error("Error fetching event from Firebase:", error);
      return null;
    }
  }

  // Get events with optional tag filter and limit
  async getEvents(tagFilter?: string, eventLimit: number = 300): Promise<Market[]> {
    try {
      let q = query(
        collection(db, 'predictionEvents'),
        where('active', '==', true),
        where('closed', '==', false),
        orderBy('volume', 'desc'),
        limit(eventLimit)
      );

      if (tagFilter && tagFilter.toLowerCase() !== 'all') {
        // Adjust the query to filter by tag
        q = query(
          collection(db, 'predictionEvents'),
          where('active', '==', true),
          where('closed', '==', false),
          where('tags', 'array-contains', { label: tagFilter }),
          orderBy('volume', 'desc'),
          limit(eventLimit)
        );
      }

      const querySnapshot = await getDocs(q);
      const events = querySnapshot.docs.map(doc => doc.data());

      // Transform events to Market interface (similar to existing getMarkets function)
      return events.map((event: any) => {
        let outcomes: { name: string; probability: number }[] = [];
        let topSubmarkets: { id: string; question: string; probability: number; groupItemTitle?: string }[] = [];

        if (event.markets && Array.isArray(event.markets)) {
          const marketWithOutcomes = event.markets.find((m: any) => 
            m.active !== false && m.outcomes && m.outcomePrices);

          if (marketWithOutcomes) {
            try {
              const outcomeNames = JSON.parse(marketWithOutcomes.outcomes);
              const outcomePrices = JSON.parse(marketWithOutcomes.outcomePrices);
              
              outcomes = outcomeNames.map((name: string, index: number) => ({
                name: name,
                probability: parseFloat(outcomePrices[index] || "0")
              }));
            } catch (error) {
              console.error('Error parsing outcomes:', error);
            }
          }

          // Process submarkets if there are multiple markets
          if (event.markets.length > 1) {
            const processedSubmarkets = event.markets
              .filter((m: any) => m.active !== false && m.outcomes && m.outcomePrices)
              .map((market: any) => {
                try {
                  const outcomePrices = JSON.parse(market.outcomePrices);
                  return {
                    id: market.id || "",
                    question: market.question || "",
                    probability: parseFloat(outcomePrices[0] || "0"),
                    groupItemTitle: market.groupItemTitle
                  };
                } catch (error) {
                  console.error('Error parsing submarkets:', error);
                  return null;
                }
              })
              .filter((m: any) => m !== null)
              .sort((a: any, b: any) => b.probability - a.probability)
              .slice(0, 4);

            topSubmarkets = processedSubmarkets;
          }
        }

        return {
          id: event.id,
          question: event.title || "Unknown Market",
          slug: event.slug || `market-${event.id}`,
          outcomes,
          volume: event.volume?.toString() || "0",
          liquidity: event.liquidity?.toString() || "0",
          endDate: event.endDate || "",
          category: event.tags?.[0]?.label,
          imageUrl: event.image,
          status: event.active ? "active" : "inactive",
          marketsCount: Array.isArray(event.markets) ? event.markets.length : 1,
          commentCount: event.commentCount,
          description: event.description,
          topSubmarkets: topSubmarkets.length > 0 ? topSubmarkets : undefined,
          tags: event.tags
        };
      });
    } catch (error) {
      console.error("Error fetching events from Firebase:", error);
      return [];
    }
  }

  // Get events by tag slugs (for related events)
  async getEventsByTags(tagSlugs: string[]): Promise<Event[]> {
    try {
      const q = query(
        collection(db, 'predictionEvents'),
        where('active', '==', true),
        where('closed', '==', false),
        limit(300) // Get a larger set to filter from
      );

      const querySnapshot = await getDocs(q);
      const events = querySnapshot.docs.map(doc => doc.data() as Event);

      // Filter events that have matching tags
      return events
        .filter(event => 
          event.tags && 
          Array.isArray(event.tags) && 
          event.tags.some(tag => tag.slug && tagSlugs.includes(tag.slug))
        )
        .slice(0, 4); // Limit to 4 related events
    } catch (error) {
      console.error("Error fetching events by tags from Firebase:", error);
      return [];
    }
  }

  // Set up a real-time listener for a specific market
  onMarketUpdate(marketId: string, callback: (market: Market) => void): () => void {
    const docRef = doc(db, 'predictionEvents', marketId);
    
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const event = doc.data();
        // Transform the event data to Market format (similar to getEvents transformation)
        const market = this.transformEventToMarket(event);
        callback(market);
      }
    }, (error) => {
      console.error("Error in market listener:", error);
    });

    return unsubscribe;
  }

  // Set up a real-time listener for the events list
  onEventsUpdate(tagFilter: string | undefined, eventLimit: number, callback: (markets: Market[]) => void): () => void {
    let q = query(
      collection(db, 'predictionEvents'),
      where('active', '==', true),
      where('closed', '==', false),
      orderBy('volume', 'desc'),
      limit(eventLimit)
    );

    if (tagFilter && tagFilter.toLowerCase() !== 'all') {
      q = query(
        collection(db, 'predictionEvents'),
        where('active', '==', true),
        where('closed', '==', false),
        where('tags', 'array-contains', { label: tagFilter }),
        orderBy('volume', 'desc'),
        limit(eventLimit)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => doc.data());
      const markets = events.map(event => this.transformEventToMarket(event));
      callback(markets);
    }, (error) => {
      console.error("Error in events listener:", error);
    });

    return unsubscribe;
  }

  // Helper function to transform event data to Market format
  private transformEventToMarket(event: any): Market {
    let outcomes: { name: string; probability: number }[] = [];
    let topSubmarkets: { id: string; question: string; probability: number; groupItemTitle?: string }[] = [];

    if (event.markets && Array.isArray(event.markets)) {
      const marketWithOutcomes = event.markets.find((m: any) => 
        m.active !== false && m.outcomes && m.outcomePrices);

      if (marketWithOutcomes) {
        try {
          const outcomeNames = JSON.parse(marketWithOutcomes.outcomes);
          const outcomePrices = JSON.parse(marketWithOutcomes.outcomePrices);
          
          outcomes = outcomeNames.map((name: string, index: number) => ({
            name: name,
            probability: parseFloat(outcomePrices[index] || "0")
          }));
        } catch (error) {
          console.error('Error parsing outcomes:', error);
        }
      }

      // Process submarkets if there are multiple markets
      if (event.markets.length > 1) {
        const processedSubmarkets = event.markets
          .filter((m: any) => m.active !== false && m.outcomes && m.outcomePrices)
          .map((market: any) => {
            try {
              const outcomePrices = JSON.parse(market.outcomePrices);
              return {
                id: market.id || "",
                question: market.question || "",
                probability: parseFloat(outcomePrices[0] || "0"),
                groupItemTitle: market.groupItemTitle
              };
            } catch (error) {
              console.error('Error parsing submarkets:', error);
              return null;
            }
          })
          .filter((m: any) => m !== null)
          .sort((a: any, b: any) => b.probability - a.probability)
          .slice(0, 4);

        topSubmarkets = processedSubmarkets;
      }
    }

    return {
      id: event.id,
      question: event.title || "Unknown Market",
      slug: event.slug || `market-${event.id}`,
      outcomes,
      volume: event.volume?.toString() || "0",
      liquidity: event.liquidity?.toString() || "0",
      endDate: event.endDate || "",
      category: event.tags?.[0]?.label,
      imageUrl: event.image,
      status: event.active ? "active" : "inactive",
      marketsCount: Array.isArray(event.markets) ? event.markets.length : 1,
      commentCount: event.commentCount,
      description: event.description,
      topSubmarkets: topSubmarkets.length > 0 ? topSubmarkets : undefined,
      tags: event.tags
    };
  }
}

export const firebaseService = new FirebaseService(); 