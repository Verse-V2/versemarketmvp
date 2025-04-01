"use client";

import { useState } from "react";
import { PackageCard } from "@/components/ui/package-card";
import { PurchaseSheet } from "@/components/ui/purchase-sheet";

const packages = [
  { points: 5000, bonusCash: 5.00, price: 5.00 },
  { points: 7500, bonusCash: 7.50, price: 7.50 },
  { points: 10000, bonusCash: 10.00, price: 10.00 },
  { points: 15000, bonusCash: 15.00, price: 15.00 },
  { points: 20000, bonusCash: 20.00, price: 20.00 },
  { points: 25000, bonusCash: 25.00, price: 25.00 },
];

export default function StorePage() {
  const [selectedPackage, setSelectedPackage] = useState<typeof packages[0] | null>(null);

  const handlePurchase = (pkg: typeof packages[0]) => {
    setSelectedPackage(pkg);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto p-6 pb-24">
        <div className="space-y-1.5 mb-6">
          <h1 className="text-lg font-semibold">Store</h1>
          <p className="text-sm text-muted-foreground">
            Purchase Verse Coins to place bets and earn rewards. Each package includes bonus Verse Cash.
          </p>
        </div>

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
      </div>

      {selectedPackage && (
        <PurchaseSheet
          isOpen={true}
          onClose={() => setSelectedPackage(null)}
          points={selectedPackage.points}
          bonusCash={selectedPackage.bonusCash}
          price={selectedPackage.price}
        />
      )}
    </main>
  );
} 