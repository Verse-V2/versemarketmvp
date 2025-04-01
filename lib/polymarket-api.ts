export interface Market {
  id: string;
  question: string;
  slug: string;
  outcomes: {
    name: string;
    probability: number;
  }[];
  volume: string;
  liquidity: string;
  endDate: string;
  category?: string;
  imageUrl?: string;
  status: string;
  marketsCount?: number; // Number of submarkets
  commentCount?: number; // Number of comments
  description?: string; // Market description/rules
  topSubmarkets?: Array<{
    id: string;
    question: string;
    probability: number;
    groupItemTitle?: string;
  }>;
  tags?: Array<{ id?: string; label?: string; slug?: string }>;
}

// Event interface based on actual API response structure
interface PolymarketEvent {
  id: string;
  ticker?: string;
  slug?: string;
  title?: string;
  description?: string;
  endDate?: string;
  image?: string;
  icon?: string;
  active?: boolean;
  closed?: boolean;
  restricted?: boolean;
  liquidity?: number;
  volume?: number;
  commentCount?: number;
  tags?: Array<{ id?: string; label?: string; slug?: string }>;
  markets?: Array<{
    id?: string;
    question?: string;
    active?: boolean;
    outcomes?: string; // JSON string of outcome names
    outcomePrices?: string; // JSON string of outcome prices
    groupItemTitle?: string; // Team or item name for display
  }>;
}

export async function getMarkets(limit: number = 10, tagFilter?: string): Promise<Market[]> {
  try {
    // Use our internal API route to fetch data with an absolute URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    const response = await fetch(`${baseUrl}/api/markets`, {
      next: { revalidate: 60 } // Revalidate data every 60 seconds
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // The API returns an array of event objects directly
    const events: PolymarketEvent[] = Array.isArray(data) ? data : 
                  (data.results && Array.isArray(data.results)) ? data.results : [];
    
    if (events.length === 0) {
      console.error('No events found in API response');
      return [];
    }
    
    // Filter events by tag if a tag filter is provided
    let filteredEvents = events;
    if (tagFilter && tagFilter.toLowerCase() !== 'all') {
      filteredEvents = events.filter(event => 
        event.tags && 
        Array.isArray(event.tags) && 
        event.tags.some(tag => 
          tag.label && tag.label.toLowerCase() === tagFilter.toLowerCase() || 
          tag.slug && tag.slug.toLowerCase() === tagFilter.toLowerCase()
        )
      );
      
      // If no events match the tag filter, return empty array
      if (filteredEvents.length === 0) {
        console.log(`No events found with tag: ${tagFilter}`);
        return [];
      }
    }
    
    // Transform events data to match our interface
    return filteredEvents.slice(0, limit).map((event: PolymarketEvent) => {
      // Get outcomes from the first active market in the event that has outcomes
      let outcomes: { name: string; probability: number }[] = [];
      let marketWithOutcomes = null;
      let topSubmarkets: { id: string; question: string; probability: number; groupItemTitle?: string }[] = [];
      
      if (event.markets && Array.isArray(event.markets)) {
        // Find first active market with outcomes
        marketWithOutcomes = event.markets.find((m) => 
          m.active !== false && m.outcomes && m.outcomePrices);
        
        // Process submarkets for events with multiple markets
        if (event.markets.length > 1) {
          const processedSubmarkets = event.markets
            .filter(m => m.active !== false && m.outcomes && m.outcomePrices)
            .map(market => {
              try {
                const outcomePrices = JSON.parse(market.outcomePrices || '[]');
                // Get the "Yes" probability (first item in outcomePrices array)
                const yesProbability = parseFloat(outcomePrices[0] || "0");
                
                return {
                  id: market.id || "",
                  question: market.question || "",
                  probability: yesProbability,
                  groupItemTitle: market.groupItemTitle
                };
              } catch (error) {
                console.error('Error parsing submarkets:', error);
                return null;
              }
            })
            .filter(m => m !== null)
            .sort((a, b) => b!.probability - a!.probability) // Sort by highest yes probability
            .slice(0, 4); // Take top 4 submarkets
          
          topSubmarkets = processedSubmarkets as { id: string; question: string; probability: number; groupItemTitle?: string }[];
        }
      }
      
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
    console.error("Failed to fetch markets from Polymarket:", error);
    return [];
  }
} 