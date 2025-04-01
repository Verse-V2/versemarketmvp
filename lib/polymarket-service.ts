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
            lastTradePrice: market.lastTradePrice || 0
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
        markets
      };
    } catch (error) {
      console.error("Failed to fetch event details:", error);
      return null;
    }
  }
}

export const polymarketService = new PolymarketService(); 