"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

interface PackageCardProps {
  points: number;
  bonusCash: number;
  price: number;
  onClick?: () => void;
}

export function PackageCard({ points, bonusCash, price, onClick }: PackageCardProps) {
  const formattedPoints = points.toLocaleString();
  
  return (
    <Button
      variant="ghost"
      className="w-full bg-[#18181B] hover:bg-[#27272A] rounded-3xl py-5 px-6 flex items-center justify-between group transition-all duration-200 border-0 h-auto"
      onClick={onClick}
    >
      <div className="flex items-center gap-5">
        <div className="relative w-10 h-10 shrink-0">
          <Image
            src="/verse-coin.png"
            alt="Verse Coin"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-left">
          <div className="text-xl font-semibold text-white tracking-tight">
            {formattedPoints} Verse Coins
          </div>
          <div className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
            + Bonus
            <Image
              src="/cash-icon.png"
              alt="Verse Cash"
              width={14}
              height={14}
              className="inline-block"
            />
            <span className="text-gray-300">{bonusCash.toFixed(2)} Verse Cash</span>
          </div>
        </div>
      </div>
      <div className="text-2xl font-bold text-[#0BC700] group-hover:scale-105 transition-transform duration-200 pl-4">
        ${price.toFixed(2)}
      </div>
    </Button>
  );
} 