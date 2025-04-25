"use client"

import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface CoinBurstProps {
  isVisible: boolean
}

export function CoinBurst({ isVisible }: CoinBurstProps) {
  // Create an array of 12 coins for the burst animation
  const coins = Array.from({ length: 12 }, (_, i) => i)

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {coins.map((coin, index) => {
            // Calculate the angle for each coin (30 degrees apart)
            const angle = (index * 30 * Math.PI) / 180
            // Calculate random distance for more natural look
            const distance = 100 + Math.random() * 50

            return (
              <motion.div
                key={index}
                className="absolute left-1/2 top-1/2 w-8 h-8"
                initial={{ 
                  scale: 0,
                  x: -16, // Half the width to center
                  y: -16, // Half the height to center
                  opacity: 1 
                }}
                animate={{
                  scale: [0, 1.5, 1],
                  x: [
                    -16,
                    Math.cos(angle) * distance - 16,
                    Math.cos(angle) * (distance + 50) - 16
                  ],
                  y: [
                    -16,
                    Math.sin(angle) * distance - 16,
                    Math.sin(angle) * (distance + 50) - 16
                  ],
                  opacity: [1, 1, 0]
                }}
                transition={{
                  duration: 1,
                  ease: [0.32, 0.72, 0, 1],
                  times: [0, 0.7, 1]
                }}
                exit={{ opacity: 0 }}
              >
                <div className="relative w-full h-full animate-spin-slow">
                  <Image
                    src="/verse-coin.png"
                    alt="Verse Coin"
                    fill
                    className="object-contain"
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </AnimatePresence>
  )
} 