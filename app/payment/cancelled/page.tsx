"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";

export default function PaymentCancelledPage() {
  const router = useRouter();

  const handleReturnToStore = () => {
    router.push('/store');
  };

  const handleTryAgain = () => {
    router.push('/store');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0D0F] to-[#1A1A1F] flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md mx-auto px-6">
        <div className="flex justify-center">
          <div className="bg-gray-500/20 rounded-full p-4">
            <X className="h-16 w-16 text-gray-400" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">Payment Cancelled</h1>
          <p className="text-gray-400">
            Your payment was cancelled. No charges were made to your account. 
            You can try again or return to the store.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleTryAgain}
            className="w-full bg-[#0BC700] hover:bg-[#0AB100] text-white rounded-xl py-4 text-lg font-semibold"
          >
            Try Again
          </Button>
          
          <Button
            onClick={handleReturnToStore}
            variant="outline"
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 rounded-xl py-4 text-lg"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Return to Store
          </Button>
        </div>
      </div>
    </div>
  );
}
