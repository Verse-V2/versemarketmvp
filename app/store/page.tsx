"use client";

import { PackageCard } from "@/components/ui/package-card";

const packages = [
  { points: 50000, bonusCash: 5.00, price: 5.00 },
  { points: 75000, bonusCash: 7.50, price: 7.50 },
  { points: 100000, bonusCash: 10.00, price: 10.00 },
  { points: 150000, bonusCash: 15.00, price: 15.00 },
  { points: 200000, bonusCash: 20.00, price: 20.00 },
  { points: 250000, bonusCash: 25.00, price: 25.00 },
];

export default function StorePage() {
  const handlePurchase = (pkg: typeof packages[0]) => {
    // TODO: Implement purchase flow
    console.log('Purchase package:', pkg);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto p-6 pb-24">
        <div className="space-y-2 mb-8">
          <h1 className="text-2xl font-bold">Store</h1>
          <p className="text-muted-foreground">
            Purchase Verse Coins to place bets and earn rewards. Each package includes bonus Verse Cash.
          </p>
        </div>

        <div className="space-y-4">
          {packages.map((pkg, index) => (
            <PackageCard
              key={index}
              points={pkg.points}
              bonusCash={pkg.bonusCash}
              price={pkg.price}
              onClick={() => handlePurchase(pkg)}
            />
          ))}
        </div>
      </div>
    </main>
  );
} 