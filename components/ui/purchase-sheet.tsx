"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, CreditCard, Check } from "lucide-react";
import Image from "next/image";
import { useUserBalance } from "@/lib/user-balance-context";
import { useAuth } from "@/lib/auth-context";
import { doc, getFirestore, runTransaction } from "firebase/firestore";

interface PurchaseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  points: number;
  bonusCash: number;
  price: number;
}

export function PurchaseSheet({ isOpen, onClose, points, bonusCash, price }: PurchaseSheetProps) {
  const formattedPoints = points.toLocaleString();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { coinBalance, cashBalance } = useUserBalance();
  const user = useAuth();
  const db = getFirestore();

  const handlePurchase = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        
        // Get current balances or use 0 if not set
        const currentCoinBalance = userDoc.exists() ? (userDoc.data().coinBalance || 0) : 0;
        const currentCashBalance = userDoc.exists() ? (userDoc.data().cashBalance || 0) : 0;
        
        // Calculate new balances
        const newCoinBalance = currentCoinBalance + points;
        const newCashBalance = currentCashBalance + bonusCash;
        
        // Update the document
        transaction.set(userRef, {
          coinBalance: newCoinBalance,
          cashBalance: newCashBalance,
        }, { merge: true });
      });

      setIsSuccess(true);
      // Auto close after success
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error processing purchase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-[#18181B]">
        <div className="relative w-full h-1 flex justify-center mt-4">
          <div className="w-12 h-1 rounded-full bg-gray-600" />
        </div>
        
        <button
          onClick={() => !isLoading && onClose()}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          <X className="h-6 w-6" />
        </button>

        <div className="px-6 pt-8 pb-6">
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-[#0BC700] rounded-full p-3">
                  <Check className="h-8 w-8 text-white" />
                </div>
              </div>
              <DialogTitle className="text-2xl font-semibold">
                Purchase Complete!
              </DialogTitle>
              <p className="text-gray-300">
                {formattedPoints} Verse Coins and ${bonusCash.toFixed(2)} Verse Cash have been added to your account.
              </p>
            </div>
          ) : (
            <>
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
                  disabled={isLoading}
                >
                  + Add New Method
                </Button>

                <Button
                  className="w-full bg-[#0BC700] hover:bg-[#0AB100] text-white rounded-xl py-6 h-auto text-lg font-semibold disabled:opacity-50"
                  onClick={handlePurchase}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : `Complete Purchase ($${price.toFixed(2)})`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 