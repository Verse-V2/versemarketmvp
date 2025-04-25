"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { useUserBalance } from "@/lib/user-balance-context"
import { doc, getDoc, updateDoc, getFirestore, Timestamp } from "firebase/firestore"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { CoinBurst } from "./coin-burst-animation"

export function VerseCoinClaim() {
  const user = useAuth()
  const { coinBalance, setCoinBalance } = useUserBalance()
  const [canClaim, setCanClaim] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    if (!user) {
      setCanClaim(false)
      setTimeRemaining("")
      setIsLoading(false)
      return
    }

    const checkClaimStatus = async () => {
      try {
        const db = getFirestore()
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        
        if (!userDoc.exists()) {
          setCanClaim(false)
          setIsLoading(false)
          return
        }

        const data = userDoc.data()
        const lastClaim = data.lastFreeCoinsTime?.toDate() || new Date(0)
        const now = new Date()
        const timeDiff = now.getTime() - lastClaim.getTime()
        const hoursLeft = 24 - (timeDiff / (1000 * 60 * 60))

        if (hoursLeft <= 0) {
          setCanClaim(true)
          setTimeRemaining("")
        } else {
          setCanClaim(false)
          // Format remaining time as HH:MM:SS
          const hours = Math.floor(hoursLeft)
          const minutes = Math.floor((hoursLeft % 1) * 60)
          const seconds = Math.floor(((hoursLeft % 1) * 60 % 1) * 60)
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        }
        setIsLoading(false)
      } catch (error) {
        console.error("Error checking claim status:", error)
        toast.error("Failed to check claim status")
        setIsLoading(false)
      }
    }

    // Check initially
    checkClaimStatus()

    // Update timer every second
    const timer = setInterval(() => {
      checkClaimStatus()
    }, 1000)

    return () => clearInterval(timer)
  }, [user])

  const handleClaim = async () => {
    if (!canClaim || !user) return
    
    setIsLoading(true)
    try {
      const db = getFirestore()
      const userRef = doc(db, 'users', user.uid)
      
      // Update user document with new coin balance and last claim time
      await updateDoc(userRef, {
        coinBalance: (coinBalance || 0) + 1000,
        lastFreeCoinsTime: Timestamp.now()
      })

      // Update local state
      setCoinBalance((coinBalance || 0) + 1000)
      setCanClaim(false)
      
      // Show animation and toast
      setShowAnimation(true)
      setTimeout(() => setShowAnimation(false), 1000)
      toast.success("Successfully claimed 1,000 Verse Coins!")
    } catch (error) {
      console.error("Error claiming coins:", error)
      toast.error("Failed to claim coins")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 relative">
      <CoinBurst isVisible={showAnimation} />
      
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Free Coins</h2>
        {!canClaim && timeRemaining && (
          <div className="text-sm text-muted-foreground">
            Next claim in: <span className="font-mono">{timeRemaining}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center text-center space-y-2">
        <motion.div 
          className="flex items-center gap-2"
          animate={showAnimation ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          <div className="relative w-8 h-8">
            <Image
              src="/verse-coin.png"
              alt="Verse Coin"
              fill
              className="object-contain"
            />
          </div>
          <div className="text-3xl font-bold text-[#FFCC00]">1,000</div>
        </motion.div>
        <div className="text-sm text-muted-foreground">Verse Coins Available</div>
        
        <Button 
          className="w-full mt-4" 
          onClick={handleClaim}
          disabled={!canClaim || isLoading}
        >
          {isLoading ? "Loading..." : canClaim ? "Claim Now" : "Already Claimed"}
        </Button>
      </div>
    </div>
  )
} 