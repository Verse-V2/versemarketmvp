"use client"

import { Badge } from "@/components/ui/badge"
import Image from "next/image"

// Mock data - in real app this would come from an API
const challenges = [
  {
    id: 1,
    title: "Place a prediction market entry with Verse Coins",
    completed: false
  },
  {
    id: 2,
    title: "Place a prediction market entry with Verse Coins",
    completed: true
  },
  {
    id: 3,
    title: "Place a prediction market entry with Verse Coins",
    completed: false
  }
]

export function DailyChallenges() {
  const completedChallenges = challenges.filter(c => c.completed).length
  const totalChallenges = challenges.length
  const progressPercentage = (completedChallenges / totalChallenges) * 100

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Daily Challenges</h2>
        <Badge variant="outline">
          {completedChallenges}/{totalChallenges} Completed
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Daily reward info */}
      <div className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
        Complete all challenges to earn 
        <div className="flex items-center gap-1">
          <div className="relative w-4 h-4">
            <Image
              src="/cash-icon.png"
              alt="Verse Cash"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-primary font-medium">$0.10 Verse Cash</span>
        </div>
      </div>

      {/* Challenge list */}
      <div className="space-y-2">
        {challenges.map(challenge => (
          <div 
            key={challenge.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${challenge.completed 
                ? "bg-primary border-primary" 
                : "border-muted-foreground"
              }`}
            >
              {challenge.completed && (
                <svg 
                  className="w-3 h-3 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              )}
            </div>
            <span className={challenge.completed ? "text-muted-foreground line-through" : ""}>
              {challenge.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
} 