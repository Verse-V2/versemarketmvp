"use client";

import { CurrencyToggle } from "@/components/currency-toggle";
import Link from "next/link";
import { useCurrency } from "@/lib/currency-context";
import { useUserBalance } from "@/lib/user-balance-context";
import React from "react";

interface HeaderProps {
  title?: string;
}

export const Header = React.memo(function Header({ title }: HeaderProps) {
  const { currency } = useCurrency();
  const { coinBalance, cashBalance, isLoading } = useUserBalance();

  const displayBalance = isLoading
    ? "..."
    : currency === 'cash'
    ? cashBalance.toFixed(2)
    : coinBalance.toFixed(2);
    
  const currencyName = currency === 'cash' ? "Verse Cash" : "Verse Coins";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-0">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="font-bold">{title || "Verse"}</span>
          </Link>
          <div className="flex items-center justify-end space-x-4">
            <div className="flex flex-col items-end mr-2">
              <span className={`text-sm font-medium ${
                currency === 'cash' ? 'text-[#0BC700]' : 'text-[#E9ED05]'
              }`}>
                {isLoading ? '...' : currency === 'cash' ? '$' : '₡'}
                {displayBalance}
              </span>
              <span className={`text-xs ${currency === 'cash' ? 'text-[#0BC700]' : 'text-[#E9ED05]'}`}>
                {currencyName}
              </span>
            </div>
            <CurrencyToggle />
          </div>
        </div>
      </div>
    </header>
  );
}); 