import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge tailwind classes correctly', () => {
      const result = cn('text-red-500', 'bg-blue-200', 'p-4');
      expect(result).toBe('text-red-500 bg-blue-200 p-4');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      
      const result = cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      );
      
      expect(result).toBe('base-class active-class');
    });

    it('should handle object syntax for conditional classes', () => {
      const result = cn(
        'base-class',
        { 
          'active-class': true,
          'hidden-class': false,
          'disabled-class': true
        }
      );
      
      expect(result).toBe('base-class active-class disabled-class');
    });

    it('should properly merge conflicting classes using tailwind-merge', () => {
      const result = cn('p-4', 'p-6');
      // tailwind-merge should keep the last conflicting class
      expect(result).toBe('p-6');
    });
  });
}); 