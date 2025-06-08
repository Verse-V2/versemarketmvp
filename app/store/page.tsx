"use client";

import { useState, useEffect } from "react";
import { PackageCard } from "@/components/ui/package-card";
import { PurchaseSheet } from "@/components/ui/purchase-sheet";
import { Header } from "@/components/ui/header";
import { VerseBalance } from "@/components/verse-balance";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { CoinPurchasePackage, getActiveCoinPurchasePackages } from "@/lib/coin-purchase-service";

export default function StorePage() {
  const [selectedPackage, setSelectedPackage] = useState<CoinPurchasePackage | null>(null);
  const [packages, setPackages] = useState<CoinPurchasePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchPackages = async () => {
      try {
        const activePackages = await getActiveCoinPurchasePackages();
        setPackages(activePackages);
      } catch (error) {
        console.error('Error fetching packages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackages();
  }, [user, router]);

  // If not authenticated, show nothing while redirecting
  if (!user) {
    return null;
  }

  const handlePurchase = (pkg: CoinPurchasePackage) => {
    setSelectedPackage(pkg);
  };

  return (
    <>
      <Header title="Wallet" />
      <main className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto p-6 pb-24">
          <VerseBalance />
          
          <div className="space-y-1.5 mb-6">
            <h1 className="text-lg font-semibold">Store</h1>
            <p className="text-sm text-muted-foreground">
              Purchase Verse Coins to place bets and earn rewards. Each package includes bonus Verse Cash.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0BC700]"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  points={pkg.coinAmount}
                  bonusCash={pkg.cashAmount}
                  price={pkg.price}
                  isDiscounted={pkg.isDiscounted}
                  discountPercentage={pkg.discountPercentage}
                  onClick={() => handlePurchase(pkg)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedPackage && (
        <PurchaseSheet
          isOpen={true}
          onClose={() => setSelectedPackage(null)}
          points={selectedPackage.coinAmount}
          bonusCash={selectedPackage.cashAmount}
          price={selectedPackage.price}
        />
      )}
    </>
  );
} 