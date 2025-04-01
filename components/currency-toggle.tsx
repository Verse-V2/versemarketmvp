"use client";

import { useCurrency } from "@/lib/currency-context";
import { Button } from "@/components/ui/button";
import { Coins, DollarSign } from "lucide-react";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center bg-muted rounded-lg p-0.5">
      <Button
        size="sm"
        variant={currency === 'cash' ? 'default' : 'ghost'}
        className="relative flex items-center gap-1.5 h-8 px-3"
        onClick={() => setCurrency('cash')}
      >
        <DollarSign className="h-4 w-4" />
        <span className="text-sm">Cash</span>
      </Button>
      <Button
        size="sm"
        variant={currency === 'coins' ? 'default' : 'ghost'}
        className="relative flex items-center gap-1.5 h-8 px-3"
        onClick={() => setCurrency('coins')}
      >
        <Coins className="h-4 w-4" />
        <span className="text-sm">Coins</span>
      </Button>
    </div>
  );
} 