"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, CreditCard } from "lucide-react";
import Image from "next/image";

interface PurchaseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  points: number;
  bonusCash: number;
  price: number;
}

export function PurchaseSheet({ isOpen, onClose, points, bonusCash, price }: PurchaseSheetProps) {
  const formattedPoints = points.toLocaleString();

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-[#18181B]">
        <div className="relative w-full h-1 flex justify-center mt-4">
          <div className="w-12 h-1 rounded-full bg-gray-600" />
        </div>
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-300 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="px-6 pt-8 pb-6">
          <DialogTitle className="text-2xl font-semibold text-center mb-4">
            Purchase
          </DialogTitle>
          
          <p className="text-center text-gray-300 mb-8">
            You are purchasing {formattedPoints} Verse Coins and receiving
            {" "}{bonusCash.toFixed(2)} Verse Cash with 1x play-through as a promotion.
          </p>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg text-gray-300">Your Purchase</span>
              <span className="text-2xl font-bold">${price.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-8 bg-[#27272A] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <Image
                    src="/verse-coin.png"
                    alt="Verse Coin"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Verse Coins</div>
                  <div className="text-xl font-bold text-[#FFB800]">{formattedPoints}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <Image
                    src="/cash-icon.png"
                    alt="Verse Cash"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Verse Cash</div>
                  <div className="text-xl font-bold text-[#0BC700]">{bonusCash.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg mb-4">Payment Methods</h3>
              <div className="flex items-center gap-4 bg-[#27272A] rounded-xl p-4">
                <div className="w-6 h-6 rounded-full border-2 border-[#0BC700] flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#0BC700]" />
                </div>
                <CreditCard className="h-6 w-6 text-gray-400" />
                <span className="text-gray-300">Mastercard ******6335</span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full bg-[#27272A] hover:bg-[#323235] text-[#0BC700] border-2 border-[#0BC700] rounded-xl py-3 h-auto"
            >
              + Add New Method
            </Button>

            <Button
              className="w-full bg-[#0BC700] hover:bg-[#0AB100] text-white rounded-xl py-6 h-auto text-lg font-semibold"
            >
              Complete Purchase (${price.toFixed(2)})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 