"use client";

import { useCurrency } from "@/lib/currency-context";
import Image from "next/image";
import React from "react";

export const CurrencyToggle = React.memo(function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  const toggleCurrency = () => {
    setCurrency(currency === 'cash' ? 'coins' : 'cash');
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className="relative flex items-center bg-black rounded-full cursor-pointer transition-all duration-200 w-16 h-8 border border-border"
        onClick={toggleCurrency}
      >
        {/* Background track */}
        <div className="absolute inset-0 bg-black rounded-full" />
        
        {/* Sliding thumb */}
        <div 
          className={`absolute top-1/2 left-0 w-8 h-8 rounded-full transition-transform duration-200 ease-in-out flex items-center justify-center -translate-y-1/2
            ${currency === 'cash'
              ? 'bg-[#00ff85]/40 shadow-[0_0_12px_4px_rgba(0,255,133,0.5)] translate-x-8'
              : 'bg-[#ffe066]/40 shadow-[0_0_12px_4px_rgba(255,224,102,0.5)] translate-x-0'
            }
          `}
        >
          <div className="relative w-8 h-8">
            {/* Preload both images to prevent flashing */}
            <Image
              src="/cash-icon.png"
              alt="Verse Cash"
              fill
              className={`object-contain transition-opacity duration-200 ${
                currency === 'cash' ? 'opacity-100' : 'opacity-0'
              }`}
              priority
              sizes="32px"
            />
            <Image
              src="/verse-coin.png"
              alt="Verse Coin"
              fill
              className={`object-contain transition-opacity duration-200 ${
                currency === 'coins' ? 'opacity-100' : 'opacity-0'
              }`}
              priority
              sizes="32px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}); 