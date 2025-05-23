"use client";

import { useCurrency } from "@/lib/currency-context";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-muted rounded-lg p-0.5">
        <Button
          size="sm"
          variant={currency === 'cash' ? 'default' : 'ghost'}
          className="relative flex items-center gap-1.5 h-8 px-3"
          onClick={() => setCurrency('cash')}
        >
          <div className="relative w-4 h-4">
            <Image
              src="/cash-icon.png"
              alt="Verse Cash"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-sm">Cash</span>
        </Button>
        <Button
          size="sm"
          variant={currency === 'coins' ? 'default' : 'ghost'}
          className="relative flex items-center gap-1.5 h-8 px-3"
          onClick={() => setCurrency('coins')}
        >
          <div className="relative w-4 h-4">
            <Image
              src="/verse-coin.png"
              alt="Verse Coin"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-sm">Coins</span>
        </Button>
      </div>
    </div>
  );
} 