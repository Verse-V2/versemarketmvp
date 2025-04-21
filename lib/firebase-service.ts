import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, limit, orderBy, onSnapshot, DocumentData, startAfter } from 'firebase/firestore';
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

// Define interfaces for our Firebase data structure
interface FirebaseMarket {
  id: string;
  question?: string;
  outcomes?: string;
  outcomePrices?: string;
  active?: boolean;
  groupItemTitle?: string;
  description?: string;
}

interface FirebaseEvent extends DocumentData {
  id: string;
  title?: string;
  slug?: string;
  description?: string;
  volume?: number;
  liquidity?: number;
  endDate?: string;
  startDate?: string;
  image?: string;
  active?: boolean;
  closed?: boolean;
  markets?: FirebaseMarket[];
  tags?: Array<{ id?: string; label?: string; slug?: string }>;
  commentCount?: number;
}

// User and Fantasy League interfaces
interface SyncedLeague {
  leagueId: string;
  leagueName: string;
  leagueType: 'sleeper' | 'espn' | 'yahoo';
}

interface UserData extends DocumentData {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  userName?: string;
  phoneNumber?: string;
  syncedLeagues?: SyncedLeague[];
  cashBalance?: number;
  coinBalance?: number;
}

interface FantasyLeague extends DocumentData {
  id: string;
  name?: string;
  type?: string;
  sport?: string;
  season?: string;
  status?: string;
  teams?: Record<string, { name: string; logoUrl: string; teamId: string }>;
}

interface Config {
  currentNFLWeek: string;
  currentSeason: string;
  seasonStatus: string;
  lastUpdated?: {
    __time__: number;
  };
  [key: string]: string | { __time__: number } | undefined;
}

// Updated to match the actual structure from Firestore
interface FantasyTeamMatchup {
  id: string;
  leagueId: string;
  season: string;
  seasonWeek: string;
  teamId: string;
  teamName: string;
  logoUrl: string;
  projectedFantasyPoints: number;
  fantasyPoints: number;
  moneylineOdds: number;
  spreadFantasyPoints: number;
  matchupTotalFantasyPoints: number;
  winProbability: number;
  decimalOdds: number;
  serviceProvider: string;
}

// A paired matchup with both teams
interface FantasyMatchup {
  id: string;
  teamA: FantasyTeamMatchup;
  teamB: FantasyTeamMatchup;
  leagueId: string;
  season: string;
  week: string;
  total: number;
}

// Add a type for Firestore documents
type FirestoreDocumentReference = DocumentData;

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
      const q = query(
        collection(db, 'predictionEvents'),
        where('active', '==', true),
        where('closed', '==', false),
        orderBy('volume', 'desc'),
        limit(Math.max(eventLimit * 4, 100)) 
      );

      // Always fetch first, then filter in memory
      const querySnapshot = await getDocs(q);
      let events = querySnapshot.docs.map(doc => doc.data() as FirebaseEvent);
      
      console.log(`[DEBUG] Total events fetched before filtering: ${events.length}`);

      // Filter events in memory if a tag filter is provided
      if (tagFilter && tagFilter.toLowerCase() !== 'all') {
        const tagFilterLower = tagFilter.toLowerCase();
        console.log(`[DEBUG] Filtering by tag: "${tagFilterLower}"`);
        
        events = events.filter(event => {
          // Check tags array if it exists
          if (event.tags && Array.isArray(event.tags)) {
            const hasMatchingTag = event.tags.some(tag => 
              (tag.label && tag.label.toLowerCase().includes(tagFilterLower)) ||
              (tag.slug && tag.slug.toLowerCase().includes(tagFilterLower))
            );
            if (hasMatchingTag) return true;
          }
          
          // Check slug as fallback
          return event.slug && event.slug.toLowerCase().includes(tagFilterLower);
        });
        
        console.log(`[DEBUG] Events after filtering: ${events.length}`);
        
        // If we still have no results, log the filter details
        if (events.length === 0) {
          console.log('[DEBUG] No events found after filtering. Tag filter:', tagFilterLower);
        }
      }

      // Apply the final limit after filtering
      const limitedEvents = events.slice(0, eventLimit);
      console.log(`[DEBUG] Final events after limiting: ${limitedEvents.length}`);

      // Transform events to Market interface
      return limitedEvents.map(event => this.transformEventToMarket(event));
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
        const event = doc.data() as FirebaseEvent;
        const market = this.transformEventToMarket(event);
        callback(market);
      }
    }, (error) => {
      console.error("Error in market listener:", error);
    });

    return unsubscribe;
  }

  // Set up a real-time listener for the events list
  onEventsUpdate(
    tagFilter: string | undefined, 
    eventLimit: number,
    lastDoc: FirestoreDocumentReference | null,
    callback: (markets: Market[], lastVisible: FirestoreDocumentReference | null) => void
  ): () => void {
    let q = query(
      collection(db, 'predictionEvents'),
      where('active', '==', true),
      where('closed', '==', false),
      orderBy('volume', 'desc'),
      limit(eventLimit * 4) 
    );

    if (lastDoc) {
      q = query(
        collection(db, 'predictionEvents'),
        where('active', '==', true),
        where('closed', '==', false),
        orderBy('volume', 'desc'),
        startAfter(lastDoc),
        limit(eventLimit * 4)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allFetchedEvents = snapshot.docs.map(doc => doc.data() as FirebaseEvent);
      console.log(`[DEBUG] Total events fetched in onEventsUpdate: ${allFetchedEvents.length}`);
      
      let filteredEvents = allFetchedEvents;
      
      if (tagFilter && tagFilter.toLowerCase() !== 'all') {
        const tagFilterLower = tagFilter.toLowerCase();
        console.log(`[DEBUG] Filtering by tag in onEventsUpdate: "${tagFilterLower}"`);
        
        filteredEvents = allFetchedEvents.filter(event => {
          // Check tags array if it exists
          if (event.tags && Array.isArray(event.tags)) {
            const hasMatchingTag = event.tags.some(tag => 
              (tag.label && tag.label.toLowerCase().includes(tagFilterLower)) ||
              (tag.slug && tag.slug.toLowerCase().includes(tagFilterLower))
            );
            if (hasMatchingTag) return true;
          }
          
          // Check slug as fallback
          return event.slug && event.slug.toLowerCase().includes(tagFilterLower);
        });
        
        console.log(`[DEBUG] Events after filtering in onEventsUpdate: ${filteredEvents.length}`);
      }
      
      // Apply the limit *after* filtering
      const finalEvents = filteredEvents.slice(0, eventLimit);
      console.log(`[DEBUG] Final events after limiting in onEventsUpdate: ${finalEvents.length}`);

      const transformedMarkets = finalEvents.map(event => this.transformEventToMarket(event));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
      
      callback(transformedMarkets, lastVisible);
    }, (error) => {
      console.error("Error in events listener:", error);
      callback([], null); 
    });

    return unsubscribe;
  }

  // Get user data by UID
  async getUserData(uid: string): Promise<UserData | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return docSnap.data() as UserData;
    } catch (error) {
      console.error("Error fetching user data from Firebase:", error);
      return null;
    }
  }

  // Get fantasy league by ID
  async getFantasyLeagueById(leagueId: string): Promise<FantasyLeague | null> {
    try {
      const docRef = doc(db, 'fantasyLeague', leagueId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return docSnap.data() as FantasyLeague;
    } catch (error) {
      console.error("Error fetching fantasy league from Firebase:", error);
      return null;
    }
  }

  // Get all fantasy leagues for a user
  async getUserFantasyLeagues(uid: string): Promise<FantasyLeague[]> {
    try {
      // First get the user data to get the synced league IDs
      const userData = await this.getUserData(uid);
      
      if (!userData?.syncedLeagues?.length) {
        return [];
      }
      
      // Get all the league IDs
      const leagueIds = userData.syncedLeagues.map(league => league.leagueId);
      
      // Fetch each league document
      const leaguePromises = leagueIds.map(id => this.getFantasyLeagueById(id));
      const leaguesWithNulls = await Promise.all(leaguePromises);
      
      // Filter out null values
      return leaguesWithNulls.filter((league): league is FantasyLeague => league !== null);
    } catch (error) {
      console.error("Error fetching user fantasy leagues from Firebase:", error);
      return [];
    }
  }

  // Get config data
  async getConfig(): Promise<Config | null> {
    try {
      const configsRef = collection(db, 'configs');
      const querySnapshot = await getDocs(configsRef);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Just get the first config document - there should only be one
      return querySnapshot.docs[0].data() as Config;
    } catch (error) {
      console.error("Error fetching config from Firebase:", error);
      return null;
    }
  }

  // Get fantasy matchups for a specific league, season, and week
  async getFantasyMatchups(leagueId: string, season: string, week: string): Promise<FantasyMatchup[]> {
    try {
      // Get all team matchups for this league, season, and week
      const q = query(
        collection(db, 'fantasyMatchup'),
        where('leagueId', '==', leagueId),
        where('season', '==', season),
        where('seasonWeek', '==', week)
      );
      
      const querySnapshot = await getDocs(q);
      const teamMatchups = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as FantasyTeamMatchup[];
      
      // Group team matchups by the matchupTotalFantasyPoints which connects the two teams
      const matchupGroups = new Map<number, FantasyTeamMatchup[]>();
      
      teamMatchups.forEach(team => {
        if (!matchupGroups.has(team.matchupTotalFantasyPoints)) {
          matchupGroups.set(team.matchupTotalFantasyPoints, []);
        }
        matchupGroups.get(team.matchupTotalFantasyPoints)?.push(team);
      });
      
      // Create paired matchups
      const pairedMatchups: FantasyMatchup[] = [];
      
      matchupGroups.forEach((teams, totalPoints) => {
        // Skip if we don't have exactly 2 teams (which would be unusual but possible)
        if (teams.length !== 2) return;
        
        // Sort teams by probability - higher probability is the favorite
        const sortedTeams = [...teams].sort((a, b) => b.winProbability - a.winProbability);
        
        pairedMatchups.push({
          id: `${leagueId}-${week}-${sortedTeams[0].teamId}-${sortedTeams[1].teamId}`,
          teamA: sortedTeams[0],
          teamB: sortedTeams[1],
          leagueId,
          season,
          week,
          total: totalPoints
        });
      });
      
      return pairedMatchups;
    } catch (error) {
      console.error(`Error fetching fantasy matchups for league ${leagueId}:`, error);
      return [];
    }
  }

  // Helper function to transform event data to Market format
  private transformEventToMarket(event: FirebaseEvent): Market {
    let outcomes: { name: string; probability: number }[] = [];
    let topSubmarkets: { id: string; question: string; probability: number; groupItemTitle?: string }[] = [];

    if (event.markets && Array.isArray(event.markets)) {
      const marketWithOutcomes = event.markets.find((m: FirebaseMarket) => 
        m.active !== false && m.outcomes && m.outcomePrices);

      if (marketWithOutcomes) {
        try {
          const outcomeNames = JSON.parse(marketWithOutcomes.outcomes || '[]');
          const outcomePrices = JSON.parse(marketWithOutcomes.outcomePrices || '[]');
          
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
          .filter((m: FirebaseMarket) => m.active !== false && m.outcomes && m.outcomePrices)
          .map((market: FirebaseMarket) => {
            try {
              const outcomePrices = JSON.parse(market.outcomePrices || '[]');
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
          .filter((m): m is NonNullable<typeof m> => m !== null)
          .sort((a, b) => b.probability - a.probability)
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