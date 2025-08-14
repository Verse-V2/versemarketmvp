"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, CreditCard, Check } from "lucide-react";
import Image from "next/image";
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | '3thix'>('card');
  const user = useAuth();
  const db = getFirestore();

  const handlePurchase = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      if (selectedPaymentMethod === '3thix') {
        // Handle 3thix payment
        const response = await fetch('/api/payment/3thix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: price,
            points,
            bonusCash,
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          // Redirect to 3thix payment widget in the same window
          window.location.href = data.payment_url;
        } else {
          console.error('3thix payment error:', data.error);
        }
      } else {
        // Handle regular card payment (existing logic)
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
      }
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
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
                  
                  {/* Credit Card Option */}
                  <div 
                    className={`group flex items-center gap-4 bg-[#27272A] rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      selectedPaymentMethod === 'card' 
                        ? 'ring-2 ring-[#0BC700] bg-[#0BC700]/10 border border-[#0BC700]/30' 
                        : 'hover:bg-[#323235] border border-transparent'
                    }`}
                    onClick={() => setSelectedPaymentMethod('card')}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedPaymentMethod === 'card' ? 'border-[#0BC700]' : 'border-gray-500 group-hover:border-gray-400'
                    }`}>
                      {selectedPaymentMethod === 'card' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0BC700]" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-md transition-colors ${
                        selectedPaymentMethod === 'card' ? 'bg-[#0BC700]/20' : 'bg-gray-700'
                      }`}>
                        <CreditCard className={`h-5 w-5 transition-colors ${
                          selectedPaymentMethod === 'card' ? 'text-[#0BC700]' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-medium transition-colors ${
                          selectedPaymentMethod === 'card' ? 'text-white' : 'text-gray-300'
                        }`}>
                          Credit Card
                        </span>
                        <span className="text-sm text-gray-400">Mastercard ••••6335</span>
                      </div>
                    </div>
                    {selectedPaymentMethod === 'card' && (
                      <div className="text-[#0BC700] text-sm font-medium">Selected</div>
                    )}
                  </div>

                  {/* 3thix Option */}
                  <div 
                    className={`group flex items-center gap-4 bg-[#27272A] rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      selectedPaymentMethod === '3thix' 
                        ? 'ring-2 ring-[#0BC700] bg-[#0BC700]/10 border border-[#0BC700]/30' 
                        : 'hover:bg-[#323235] border border-transparent'
                    }`}
                    onClick={() => setSelectedPaymentMethod('3thix')}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedPaymentMethod === '3thix' ? 'border-[#0BC700]' : 'border-gray-500 group-hover:border-gray-400'
                    }`}>
                      {selectedPaymentMethod === '3thix' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0BC700]" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative w-8 h-8">
                        <Image
                          src="/3thix.ico"
                          alt="3thix"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-medium transition-colors ${
                          selectedPaymentMethod === '3thix' ? 'text-white' : 'text-gray-300'
                        }`}>
                          3thix Payment
                        </span>
                        <span className="text-sm text-gray-400">Credit, Debit, ACH, Crypto & Apple Pay</span>
                      </div>
                    </div>
                    {selectedPaymentMethod === '3thix' && (
                      <div className="text-[#0BC700] text-sm font-medium">Selected</div>
                    )}
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
                  {isLoading 
                    ? 'Processing...' 
                    : selectedPaymentMethod === '3thix' 
                      ? `Pay with 3thix ($${price.toFixed(2)})` 
                      : `Complete Purchase ($${price.toFixed(2)})`
                  }
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 