"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

interface PackageCardProps {
  points: number;
  bonusCash: number;
  price: number;
  isDiscounted?: boolean;
  discountPercentage?: number;
  onClick?: () => void;
}

export function PackageCard({ 
  points, 
  bonusCash, 
  price, 
  isDiscounted = false,
  discountPercentage = 0,
  onClick 
}: PackageCardProps) {
  const formattedPoints = points.toLocaleString();
  const originalPrice = isDiscounted ? price / (1 - discountPercentage) : price;
  
  return (
    <Button
      variant="ghost"
      className="w-full bg-[#18181B] hover:bg-[#27272A] rounded-3xl py-4 px-5 flex items-center justify-between group transition-all duration-200 border-0 h-auto"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="relative w-8 h-8 shrink-0">
          <Image
            src="/verse-coin.png"
            alt="Verse Coin"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-left">
          <div className="text-base font-semibold text-white tracking-tight">
            {formattedPoints} Verse Coins
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            + Bonus
            <Image
              src="/cash-icon.png"
              alt="Verse Cash"
              width={12}
              height={12}
              className="inline-block"
            />
            <span className="text-gray-300">{bonusCash.toFixed(2)} Verse Cash</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end">
        {isDiscounted && (
          <div className="text-sm text-gray-400 line-through">
            ${originalPrice.toFixed(2)}
          </div>
        )}
        <div className="text-lg font-bold text-[#0BC700] group-hover:scale-105 transition-transform duration-200">
          ${price.toFixed(2)}
        </div>
      </div>
    </Button>
  );
} 