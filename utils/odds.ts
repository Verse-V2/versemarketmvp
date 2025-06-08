/**
 * Convert a probability [0–1] into American odds.
 * Returns strings like "+150", "-200", or "N/A"/"-∞" for edge cases.
 */
export function toAmericanOdds(prob: number): string {
  if (prob <= 0) return 'N/A' // Handle edge cases
  if (prob >= 1) return '-∞'  // Very close to certainty
  
  if (prob > 0.5) {
    // Favorite: negative odds
    const odds = Math.round(-100 / (prob - 1))
    return `-${Math.abs(odds).toLocaleString()}`
  } else {
    // Underdog: positive odds
    const odds = Math.round(100 / prob - 100)
    return `+${odds.toLocaleString()}`
  }
} 