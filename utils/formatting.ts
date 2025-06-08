/**
 * Format an ISO date string like "2025-06-23T12:00:00Z" 
 * into "Jun 23, 2025".
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Convert a raw volume number string into human-readable form.
 * e.g. "1234500" → "$1.2M"
 */
export function formatVolume(volume: string): string {
  const num = parseFloat(volume)
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`
  return `$${num.toFixed(0)}`
} 