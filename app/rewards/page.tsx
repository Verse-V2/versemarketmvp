"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { DailyChallenges } from "./daily-challenges"
import { VerseCoinClaim } from "./verse-coin-claim"
import { Header } from "@/components/ui/header"
import { useAuth } from "@/lib/auth-context"

export default function RewardsPage() {
  const user = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/auth')
    }
  }, [user, router])

  // If not authenticated, show nothing while redirecting
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Rewards" />
      <main className="container max-w-2xl mx-auto p-6 pb-24">
        <div className="space-y-1.5 mb-6">
          <p className="text-sm text-muted-foreground">
            Complete daily challenges and claim rewards
          </p>
        </div>
        
        <div className="space-y-4">
          <Card className="p-4">
            <DailyChallenges />
          </Card>

          <Card className="p-4">
            <VerseCoinClaim />
          </Card>
        </div>
      </main>
    </div>
  )
} 