"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function VerseCoinClaim() {
  // In a real app, these would come from an API/backend
  const [canClaim, setCanClaim] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState("23:45:12")

  const handleClaim = () => {
    if (!canClaim) return
    
    // In a real app, this would make an API call
    setCanClaim(false)
    // Reset timer to 24 hours
    setTimeRemaining("24:00:00")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Free Verse Coins</h2>
        {!canClaim && (
          <div className="text-sm text-muted-foreground">
            Next claim in: <span className="font-mono">{timeRemaining}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center text-center space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image
              src="/verse-coin.png"
              alt="Verse Coin"
              fill
              className="object-contain"
            />
          </div>
          <div className="text-3xl font-bold text-[#FFCC00]">1,000</div>
        </div>
        <div className="text-sm text-muted-foreground">Verse Coins Available</div>
        
        <Button 
          className="w-full mt-4" 
          onClick={handleClaim}
          disabled={!canClaim}
        >
          {canClaim ? "Claim Now" : "Already Claimed"}
        </Button>
      </div>
    </div>
  )
} 