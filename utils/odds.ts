/**
 * Convert a probability [0–1] into American odds.
 * Returns strings like "+150", "-200", or "N/A"/"-∞" for edge cases.
 */
export function toAmericanOdds(prob: number): string {
  if (prob <= 0) return 'N/A' // Handle edge cases
  if (prob >= 1) return '-∞'  // Very close to certainty
  
  // First convert probability to decimal odds
  const decimalOdds = 1 / prob;
  
  // Then convert decimal odds to American odds
  if (decimalOdds < 2.0) {
    // Favorite: negative odds
    // For decimal < 2.0, use formula: (-100)/(decimal-1)
    const americanOdds = Math.round(-100 / (decimalOdds - 1));
    return `-${Math.abs(americanOdds).toLocaleString()}`;
  } else {
    // Underdog: positive odds
    // For decimal >= 2.0, use formula: (decimal-1)*100
    const americanOdds = Math.round((decimalOdds - 1) * 100);
    return `+${americanOdds.toLocaleString()}`;
  }
} 