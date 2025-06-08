import { describe, it, expect } from 'vitest'
import { toAmericanOdds } from './odds'

describe('odds utilities', () => {
  describe('toAmericanOdds', () => {
    it('should handle edge cases', () => {
      expect(toAmericanOdds(0)).toBe('N/A')
      expect(toAmericanOdds(-0.1)).toBe('N/A')
      expect(toAmericanOdds(1)).toBe('-∞')
    })

    it('should calculate negative odds for favorites (prob > 0.5)', () => {
      expect(toAmericanOdds(0.8)).toBe('-500')
      expect(toAmericanOdds(0.6)).toBe('-250')
    })

    it('should calculate positive odds for underdogs (prob < 0.5)', () => {
      expect(toAmericanOdds(0.4)).toBe('+150')
      expect(toAmericanOdds(0.2)).toBe('+400')
    })
  })
}) 