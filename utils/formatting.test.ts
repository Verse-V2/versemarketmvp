import { describe, it, expect } from 'vitest'
import { formatDate, formatVolume } from './formatting'

describe('formatting utilities', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = formatDate('2024-01-15T00:00:00Z')
      expect(result).toBe('Jan 14, 2024') // Date is converted to local timezone
    })
  })

  describe('formatVolume', () => {
    it('should format billions correctly', () => {
      expect(formatVolume('1500000000')).toBe('$1.5B')
      expect(formatVolume('2000000000')).toBe('$2.0B')
    })

    it('should format millions correctly', () => {
      expect(formatVolume('1500000')).toBe('$1.5M')
      expect(formatVolume('2000000')).toBe('$2.0M')
    })

    it('should format thousands correctly', () => {
      expect(formatVolume('1500')).toBe('$1.5K')
      expect(formatVolume('2000')).toBe('$2.0K')
    })

    it('should format small amounts correctly', () => {
      expect(formatVolume('500')).toBe('$500')
      expect(formatVolume('100.5')).toBe('$101')
    })
  })
}) 