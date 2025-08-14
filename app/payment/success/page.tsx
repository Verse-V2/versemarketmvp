"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { doc, getFirestore, runTransaction } from "firebase/firestore";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuth();
  const db = getFirestore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentData, setPaymentData] = useState<{
    points: number;
    bonusCash: number;
    amount: number;
  } | null>(null);

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Get payment parameters from URL
        const amount = searchParams.get('amount');
        const points = searchParams.get('points');
        const bonusCash = searchParams.get('bonus_cash');
        const status = searchParams.get('status');

        // Check if we have the required parameters and payment was successful
        if (!amount || !points || !user || status !== 'ORDER_COMPLETED') {
          console.log('Payment validation failed:', { amount, points, user: !!user, status });
          setStatus('error');
          return;
        }

        // Parse the values
        const parsedAmount = parseFloat(amount);
        const parsedPoints = parseInt(points);
        const parsedBonusCash = parseFloat(bonusCash || '0');

        // Update user balance in Firestore
        const userRef = doc(db, 'users', user.uid);
        
        await runTransaction(db, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          
          // Get current balances or use 0 if not set
          const currentCoinBalance = userDoc.exists() ? (userDoc.data().coinBalance || 0) : 0;
          const currentCashBalance = userDoc.exists() ? (userDoc.data().cashBalance || 0) : 0;
          
          // Calculate new balances
          const newCoinBalance = currentCoinBalance + parsedPoints;
          const newCashBalance = currentCashBalance + parsedBonusCash;
          
          // Update the document
          transaction.set(userRef, {
            coinBalance: newCoinBalance,
            cashBalance: newCashBalance,
          }, { merge: true });
        });

        // Store payment data for display
        setPaymentData({
          points: parsedPoints,
          bonusCash: parsedBonusCash,
          amount: parsedAmount,
        });

        setStatus('success');
      } catch (error) {
        console.error('Error processing payment success:', error);
        setStatus('error');
      }
    };

    if (user) {
      processPayment();
    }
  }, [user, searchParams, db]);

  const handleContinue = () => {
    router.push('/store');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0D0D0F] to-[#1A1A1F] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#0BC700] mx-auto" />
          <h2 className="text-2xl font-semibold text-white">Processing Payment...</h2>
          <p className="text-gray-400">Please wait while we confirm your payment.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0D0D0F] to-[#1A1A1F] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="flex justify-center">
            <div className="bg-red-500/20 rounded-full p-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-white">Payment Error</h2>
          <p className="text-gray-400">
            There was an issue processing your payment. Please contact support if you believe this is an error.
          </p>
          <Button
            onClick={handleContinue}
            className="bg-[#0BC700] hover:bg-[#0AB100] text-white rounded-xl py-3 px-6"
          >
            Return to Store
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0D0F] to-[#1A1A1F] flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md mx-auto px-6">
        <div className="flex justify-center">
          <div className="bg-[#0BC700]/20 rounded-full p-4">
            <Check className="h-16 w-16 text-[#0BC700]" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>
          <p className="text-gray-400">
            Your payment has been processed successfully. Your account has been updated with your new balance.
          </p>
        </div>

        {paymentData && (
          <div className="bg-[#27272A] rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Purchase Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8">
                  <Image
                    src="/verse-coin.png"
                    alt="Verse Coin"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Verse Coins</div>
                  <div className="text-lg font-bold text-[#FFB800]">
                    {paymentData.points.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8">
                  <Image
                    src="/cash-icon.png"
                    alt="Verse Cash"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Verse Cash</div>
                  <div className="text-lg font-bold text-[#0BC700]">
                    ${paymentData.bonusCash.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Paid</span>
                <span className="text-xl font-bold text-white">
                  ${paymentData.amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleContinue}
          className="w-full bg-[#0BC700] hover:bg-[#0AB100] text-white rounded-xl py-4 text-lg font-semibold"
        >
          Continue to Store
        </Button>
      </div>
    </div>
  );
}
