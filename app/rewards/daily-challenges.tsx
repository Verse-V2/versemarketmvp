"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { dailyChallengesService, type DailyChallenge } from "@/lib/daily-challenges-service"

export function DailyChallenges() {
  const user = useAuth()
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchDailyChallenge = async () => {
      try {
        // Get today&apos;s date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0]
        
        // Fetch today&apos;s challenge
        const challengeData = await dailyChallengesService.getDailyChallenge(today)
        setChallenge(challengeData)

        // Fetch user&apos;s progress
        const progress = await dailyChallengesService.getUserChallengeProgress(user.uid, today)
        setCompletedTasks(progress)
      } catch (error) {
        console.error('Error fetching daily challenge:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDailyChallenge()
  }, [user])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Daily Challenges</h2>
          <Badge variant="outline">Loading...</Badge>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300 ease-in-out" style={{ width: '0%' }} />
        </div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Daily Challenges</h2>
          <Badge variant="outline">No challenges available</Badge>
        </div>
      </div>
    )
  }

  const completedCount = Object.values(completedTasks).filter(Boolean).length
  const progressPercentage = (completedCount / challenge.tasks.length) * 100

  return (
    <div className="space-y-6">
      {/* Card-style header */}
      <div className="rounded-2xl bg-secondary/80 p-4 flex flex-row items-center gap-4 shadow-md">
        <div className="flex-shrink-0 flex items-center justify-center bg-primary/10 rounded-xl w-14 h-14">
          <Image src="/cash-icon.png" alt="Verse Cash" width={40} height={40} className="object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg text-white">Make Picks !</span>
            <span className="font-bold text-green-400 text-xl">${challenge.rewardAmount.toFixed(2)}</span>
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">
            With <span className="text-yellow-400 font-semibold">Verse Coins</span> to complete today&apos;s challenges.<br />
            <span className="text-xs text-muted-foreground">Complete all {challenge.tasks.length} challenges to earn ${challenge.rewardAmount.toFixed(2)} Verse Cash</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2 bg-background/30 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300 ease-in-out" style={{ width: `${progressPercentage}%` }} />
            </div>
            <span className="text-xs text-white font-medium whitespace-nowrap">{completedCount}/{challenge.tasks.length} Challenges</span>
          </div>
        </div>
      </div>

      {/* Today&apos;s Challenges */}
      <div>
        <div className="text-base font-semibold text-white mb-2">Today&apos;s Challenges</div>
        <div className="space-y-3">
          {challenge.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 shadow-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium text-white text-sm">
                  {task.title}
                </span>
                {task.description && (
                  <span className="text-xs text-muted-foreground mt-0.5">{task.description}</span>
                )}
              </div>
              <div className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ml-4 ${completedTasks[task.id] ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                {completedTasks[task.id] ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-3 h-3 rounded-full border border-muted-foreground bg-background" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 