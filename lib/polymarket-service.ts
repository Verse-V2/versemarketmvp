export interface Market {
  id: string;
  question: string;
  slug: string;
  description?: string;
  volume: string;
  liquidity: string;
  outcomes?: string;
  outcomePrices?: string;
  active?: boolean;
  closed?: boolean;
  marketType?: string;
  bestBid?: number;
  bestAsk?: number;
  lastTradePrice?: number;
  groupItemTitle?: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description?: string;
  volume: number;
  liquidity: number;
  endDate: string;
  startDate: string;
  image?: string;
  category?: string;
  active?: boolean;
  closed?: boolean;
  markets: Market[];
  tags?: Array<{ id?: string; label?: string; slug?: string }>;
}

class PolymarketService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  }
  
  async getEventById(id: string): Promise<Event | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/markets/${id}`, {
        next: { revalidate: 60 } // Revalidate data every 60 seconds
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the data to match our interface
      if (!data) return null;
      
      // Process the markets data
      const markets = Array.isArray(data.markets) 
        ? data.markets.map((market: any) => ({
            id: market.id,
            question: market.question || '',
            slug: market.slug || '',
            description: market.description || '',
            volume: market.volume || '0',
            liquidity: market.liquidity || '0',
            outcomes: market.outcomes,
            outcomePrices: market.outcomePrices,
            active: market.active,
            closed: market.closed,
            marketType: market.negRisk ? 'Negative Risk' : 'Standard',
            bestBid: market.bestBid || 0,
            bestAsk: market.bestAsk || 0,
            lastTradePrice: market.lastTradePrice || 0,
            groupItemTitle: market.groupItemTitle
          }))
        : [];

      return {
        id: data.id,
        title: data.title || '',
        slug: data.slug || '',
        description: data.description || '',
        volume: Number(data.volume) || 0,
        liquidity: Number(data.liquidity) || 0,
        endDate: data.endDate || '',
        startDate: data.startDate || '',
        image: data.image || '',
        category: data.tags?.[0]?.name,
        active: data.active,
        closed: data.closed,
        markets,
        tags: data.tags || []
      };
    } catch (error) {
      console.error("Failed to fetch event details:", error);
      return null;
    }
  }
  
  async getEventsByTags(tagSlugs: string[]): Promise<Event[]> {
    try {
      // Fetch all events from the API
      const response = await fetch(`${this.baseUrl}/api/markets`, {
        next: { revalidate: 60 }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const allEvents = Array.isArray(data) ? data : 
                     (data.results && Array.isArray(data.results)) ? data.results : [];
      
      // Filter events that have matching tags
      const relatedEvents = allEvents
        .filter((event: any) => {
          // Check if this event has any tags that match our tag slugs
          return event.tags && Array.isArray(event.tags) && 
                 event.tags.some((tag: any) => tag.slug && tagSlugs.includes(tag.slug));
        })
        .slice(0, 4) // Limit to 4 related events
        .map((event: any) => {
          // Format to match our Event interface
          const markets = Array.isArray(event.markets) 
            ? event.markets.map((market: any) => ({
                id: market.id,
                question: market.question || '',
                slug: market.slug || '',
                description: market.description || '',
                volume: market.volume || '0',
                liquidity: market.liquidity || '0',
                outcomes: market.outcomes,
                outcomePrices: market.outcomePrices,
                active: market.active,
                closed: market.closed,
                marketType: market.negRisk ? 'Negative Risk' : 'Standard',
                bestBid: market.bestBid || 0,
                bestAsk: market.bestAsk || 0,
                lastTradePrice: market.lastTradePrice || 0,
                groupItemTitle: market.groupItemTitle
              }))
            : [];

          return {
            id: event.id,
            title: event.title || '',
            slug: event.slug || '',
            description: event.description || '',
            volume: Number(event.volume) || 0,
            liquidity: Number(event.liquidity) || 0,
            endDate: event.endDate || '',
            startDate: event.startDate || '',
            image: event.image || '',
            category: event.tags?.[0]?.name,
            active: event.active,
            closed: event.closed,
            markets,
            tags: event.tags || []
          };
        });

      // If no related events found, return mock data as fallback
      return relatedEvents.length > 0 ? relatedEvents : mockRelatedEvents;
    } catch (error) {
      console.error("Failed to fetch events by tags:", error);
      return mockRelatedEvents;
    }
  }
}

// Mock data for getEventsByTags method
const mockRelatedEvents = [
  {
    id: "12815",
    title: "NBA Champion",
    slug: "nba-champion-2024-2025",
    volume: 1602633105,
    liquidity: 18071747,
    endDate: "2025-06-23T12:00:00Z",
    startDate: "2024-09-24T18:02:47.790446Z",
    image: "https://polymarket-upload.s3.us-east-2.amazonaws.com/nba-champion-2024-2025-NiYghxjb7928.png",
    active: true,
    markets: []
  },
  {
    id: "507871",
    title: "Will the Los Angeles Lakers win the 2025 NBA Finals?",
    slug: "will-the-los-angeles-lakers-win-the-2025-nba-finals",
    volume: 10354629,
    liquidity: 448418,
    endDate: "2025-06-23T12:00:00Z",
    startDate: "2024-09-24T17:34:15.684913Z",
    image: "https://polymarket-upload.s3.us-east-2.amazonaws.com/New+NBA+Team+Logos+/LAL.png",
    active: true,
    markets: [
      {
        id: "507871",
        question: "Will the Los Angeles Lakers win the 2025 NBA Finals?",
        slug: "will-the-los-angeles-lakers-win-the-2025-nba-finals",
        volume: "10354629",
        liquidity: "448418",
        outcomes: "[\"Yes\", \"No\"]",
        outcomePrices: "[\"0.0685\", \"0.9315\"]"
      }
    ]
  },
  {
    id: "507884",
    title: "Will the Oklahoma City Thunder win the 2025 NBA Finals?",
    slug: "will-the-oklahoma-city-thunder-win-the-2025-nba-finals",
    volume: 4002935,
    liquidity: 471840,
    endDate: "2025-06-23T12:00:00Z",
    startDate: "2024-09-24T17:38:13.165Z",
    image: "https://polymarket-upload.s3.us-east-2.amazonaws.com/New+NBA+Team+Logos+/OKC.png",
    active: true,
    markets: [
      {
        id: "507884",
        question: "Will the Oklahoma City Thunder win the 2025 NBA Finals?",
        slug: "will-the-oklahoma-city-thunder-win-the-2025-nba-finals",
        volume: "4002935",
        liquidity: "471840",
        outcomes: "[\"Yes\", \"No\"]",
        outcomePrices: "[\"0.325\", \"0.675\"]"
      }
    ]
  },
  {
    id: "507857",
    title: "Will the Boston Celtics win the 2025 NBA Finals?",
    slug: "will-the-boston-celtics-win-the-2025-nba-finals",
    volume: 4800018,
    liquidity: 386758,
    endDate: "2025-06-23T12:00:00Z",
    startDate: "2024-09-24T17:05:00.671Z",
    image: "https://polymarket-upload.s3.us-east-2.amazonaws.com/New+NBA+Team+Logos+/BOS.png",
    active: true,
    markets: [
      {
        id: "507857",
        question: "Will the Boston Celtics win the 2025 NBA Finals?",
        slug: "will-the-boston-celtics-win-the-2025-nba-finals",
        volume: "4800018",
        liquidity: "386758",
        outcomes: "[\"Yes\", \"No\"]",
        outcomePrices: "[\"0.285\", \"0.715\"]"
      }
    ]
  }
];

export const polymarketService = new PolymarketService(); 