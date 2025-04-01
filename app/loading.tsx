import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Loading() {
  const categories = [
    "All", "New", "Sports", "Politics", "Crypto", 
    "Tech", "Culture", "World", "Trump", "Economy"
  ];

  return (
    <main className="flex min-h-screen flex-col items-center bg-white dark:bg-black p-4 md:p-8 lg:p-24">
      <div className="w-full max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Timeline</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Explore the latest markets from Verse</p>
          
          <div className="relative mb-4">
            <div className="flex overflow-x-auto pb-2 no-scrollbar space-x-2 -mx-4 px-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="py-2 flex-grow">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
              <CardFooter className="pt-2 flex justify-between">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/3" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
} 