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
      className="w-full bg-[#18181B] hover:bg-[#27272A] rounded-3xl p-4 flex items-center justify-between group transition-all duration-200 border-0"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12">
          <Image
            src="/verse-coin.png"
            alt="Verse Coin"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-left">
          <div className="text-xl font-semibold text-white">
            {formattedPoints} Points
          </div>
          <div className="text-sm text-gray-400 flex items-center gap-1.5">
            + Bonus
            <Image
              src="/cash-icon.png"
              alt="Cash"
              width={16}
              height={16}
              className="inline-block"
            />
            {bonusCash.toFixed(2)} Cash
          </div>
        </div>
      </div>
      <div className="text-2xl font-bold text-[#0BC700] group-hover:scale-105 transition-transform duration-200">
        ${price.toFixed(2)}
      </div>
    </Button>
  );
} 