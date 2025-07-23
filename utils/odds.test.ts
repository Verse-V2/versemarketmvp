import { describe, it, expect } from 'vitest'
import { toAmericanOdds } from './odds'

describe('odds utilities', () => {
  describe('toAmericanOdds', () => {
    it('should handle edge cases', () => {
      expect(toAmericanOdds(0)).toBe('N/A')
      expect(toAmericanOdds(-0.1)).toBe('N/A')
      expect(toAmericanOdds(1)).toBe('-∞')
    })

    it('should calculate negative odds for favorites (decimal odds < 2.0)', () => {
      // probability 0.8 -> decimal odds 1.25 -> american odds -400
      expect(toAmericanOdds(0.8)).toBe('-400')
      // probability 0.67 -> decimal odds 1.49 -> american odds -204
      expect(toAmericanOdds(0.67)).toBe('-204')
      // probability 0.6 -> decimal odds 1.67 -> american odds -150
      expect(toAmericanOdds(0.6)).toBe('-150')
    })

    it('should calculate positive odds for underdogs (decimal odds >= 2.0)', () => {
      // probability 0.4 -> decimal odds 2.5 -> american odds +150
      expect(toAmericanOdds(0.4)).toBe('+150')
      // probability 0.25 -> decimal odds 4.0 -> american odds +300
      expect(toAmericanOdds(0.25)).toBe('+300')
      // probability 0.2 -> decimal odds 5.0 -> american odds +400
      expect(toAmericanOdds(0.2)).toBe('+400')
    })
  })
}) 