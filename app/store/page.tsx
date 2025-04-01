"use client";

import { PackageCard } from "@/components/ui/package-card";

const packages = [
  { points: 50000, bonusCash: 5.00, price: 10.00 },
  { points: 75000, bonusCash: 7.50, price: 15.00 },
  { points: 100000, bonusCash: 10.00, price: 20.00 },
  { points: 150000, bonusCash: 15.00, price: 30.00 },
  { points: 200000, bonusCash: 20.00, price: 40.00 },
  { points: 250000, bonusCash: 25.00, price: 50.00 },
];

export default function StorePage() {
  const handlePurchase = (pkg: typeof packages[0]) => {
    // TODO: Implement purchase flow
    console.log('Purchase package:', pkg);
  };

  return (
    <main className="container max-w-2xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6">Store</h1>
      <div className="space-y-3">
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
    </main>
  );
} 