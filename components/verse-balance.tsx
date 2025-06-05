"use client";

import { useUserBalance } from "@/lib/user-balance-context";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function VerseBalance() {
  const { coinBalance, cashBalance, isLoading: isBalanceLoading } = useUserBalance();

  return (
    <>
      {/* Verse Balance Title */}
      <h2 className="text-lg font-semibold mb-2">Verse Balance</h2>

      {/* Verse Balance Card */}
      <div className="bg-[#18181B] rounded-2xl p-5 mb-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Image src="/verse-coin.png" alt="Verse Coin" width={32} height={32} className="object-contain" />
            <div>
              <div className="text-xs text-white font-bold">Verse Coins</div>
              <div className="text-xl font-bold text-[#E9ED05]">{isBalanceLoading ? "-" : coinBalance.toLocaleString()}</div>
            </div>
          </div>
          <div className="w-px h-8 bg-[#232323] mx-2" />
          <div className="flex items-center gap-2">
            <Image src="/cash-icon.png" alt="Verse Cash" width={32} height={32} className="object-contain" />
            <div>
              <div className="text-xs text-white font-bold">Verse Cash</div>
              <div className="text-xl font-bold text-[#0BC700]">{isBalanceLoading ? "-" : cashBalance.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <Button className="w-full bg-[#0BC700] hover:bg-[#0AB100] text-black rounded-full font-semibold shadow-md transition-all" style={{ height: 47, fontSize: 16 }}>
          Redeem Cash
        </Button>
      </div>
    </>
  );
} 