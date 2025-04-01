import { getMarkets } from "@/lib/polymarket-api";
import { MarketCard } from "@/components/ui/market-card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";

export default async function Home() {
  // Fetch markets from Polymarket API
  const markets = await getMarkets(50);

  const categories = [
    "All", "New", "Sports", "Politics", "Crypto", 
    "Tech", "Culture", "World", "Trump", "Economy"
  ];

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col items-center bg-white dark:bg-black p-4 md:p-8 lg:p-24">
        <div className="w-full max-w-7xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Timeline</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Explore the latest markets from Verse</p>
            
            <div className="relative mb-4">
              <div className="flex overflow-x-auto pb-2 space-x-2 -mx-4 px-4 no-scrollbar">
                {categories.map((category, index) => (
                  <Button 
                    key={category} 
                    variant={index === 0 ? "default" : "outline"}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-black to-transparent pointer-events-none"></div>
            </div>
          </div>

          {markets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl">No markets available at the moment</p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Please check back later</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
