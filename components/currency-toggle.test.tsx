import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CurrencyToggle } from './currency-toggle';
import { useCurrency } from '@/lib/currency-context';
import { useUserBalance } from '@/lib/user-balance-context';
import { ImageProps } from 'next/image';
import type { Mock } from 'vitest';

// Define types for the mocked components
interface MockImageProps extends Omit<ImageProps, 'src' | 'alt' | 'className'> {
  src: string;
  alt: string;
  className?: string;
}

// Mock the hooks
vi.mock('@/lib/currency-context', () => ({
  useCurrency: vi.fn(),
}));

vi.mock('@/lib/user-balance-context', () => ({
  useUserBalance: vi.fn(),
}));

// Mock the Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, className }: MockImageProps) => (
    <img src={src} alt={alt} className={className} data-testid="mock-image" />
  ),
}));

describe('CurrencyToggle', () => {
  const mockSetCurrency = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock return values
    (useCurrency as Mock).mockReturnValue({
      currency: 'cash',
      setCurrency: mockSetCurrency,
    });
    
    (useUserBalance as Mock).mockReturnValue({
      coinBalance: 1000,
      cashBalance: 50.75,
      isLoading: false,
    });
  });

  it('renders cash button as active when currency is cash', () => {
    render(<CurrencyToggle />);
    
    // Check that cash button has the default variant (based on the actual component implementation)
    const cashButton = screen.getByText('Cash').closest('button');
    expect(cashButton).toHaveClass('bg-primary');
    
    // Check that coins button has the ghost variant
    const coinsButton = screen.getByText('Coins').closest('button');
    expect(coinsButton).not.toHaveClass('bg-primary');
    
    // Check if the balance is displayed correctly
    expect(screen.getByText('$50.75')).toBeInTheDocument();
  });

  it('renders coins button as active when currency is coins', () => {
    // Override the mock to return coins as currency
    (useCurrency as Mock).mockReturnValue({
      currency: 'coins',
      setCurrency: mockSetCurrency,
    });
    
    render(<CurrencyToggle />);
    
    // Check that coins button has the default variant
    const coinsButton = screen.getByText('Coins').closest('button');
    expect(coinsButton).toHaveClass('bg-primary');
    
    // Check that cash button has the ghost variant
    const cashButton = screen.getByText('Cash').closest('button');
    expect(cashButton).not.toHaveClass('bg-primary');
    
    // Check if the balance is displayed correctly
    expect(screen.getByText('₡1,000')).toBeInTheDocument();
  });

  it('calls setCurrency with "cash" when cash button is clicked', () => {
    // Set initial currency to coins
    (useCurrency as Mock).mockReturnValue({
      currency: 'coins',
      setCurrency: mockSetCurrency,
    });
    
    render(<CurrencyToggle />);
    
    // Click the cash button
    fireEvent.click(screen.getByText('Cash'));
    
    // Verify that setCurrency was called with 'cash'
    expect(mockSetCurrency).toHaveBeenCalledWith('cash');
  });

  it('calls setCurrency with "coins" when coins button is clicked', () => {
    render(<CurrencyToggle />);
    
    // Click the coins button
    fireEvent.click(screen.getByText('Coins'));
    
    // Verify that setCurrency was called with 'coins'
    expect(mockSetCurrency).toHaveBeenCalledWith('coins');
  });

  it('shows loading state when isLoading is true', () => {
    // Override the mock to set isLoading to true
    (useUserBalance as Mock).mockReturnValue({
      coinBalance: 0,
      cashBalance: 0,
      isLoading: true,
    });
    
    render(<CurrencyToggle />);
    
    // Check if loading indicator is displayed
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
}); 