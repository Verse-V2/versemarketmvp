import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketCard } from './market-card';
import { useBetSlip } from '@/lib/bet-slip-context';
import { useCurrency } from '@/lib/currency-context';

// Mock the hooks
vi.mock('@/lib/bet-slip-context', () => ({
  useBetSlip: vi.fn(),
}));

vi.mock('@/lib/currency-context', () => ({
  useCurrency: vi.fn(),
}));

// Mock date-fns to control the date output
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => 'in 2 days'),
}));

// Mock Next.js components
vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} data-testid="mock-image" />,
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

describe('MarketCard', () => {
  // Mock data for testing
  const mockMarket = {
    id: 'market-123',
    question: 'Will Bitcoin reach $100k by end of year?',
    slug: 'bitcoin-100k',
    volume: '5000000',
    liquidity: '1000000',
    endDate: '2023-12-31T00:00:00Z',
    imageUrl: '/test-image.jpg',
    outcomes: [
      { name: 'Yes', probability: 0.35 },
      { name: 'No', probability: 0.65 }
    ],
    topSubmarkets: undefined,
    marketsCount: 1
  };

  // Mock bet slip functions
  const mockAddBet = vi.fn();
  const mockRemoveBet = vi.fn();
  const mockIsBetInSlip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useBetSlip as any).mockReturnValue({
      addBet: mockAddBet,
      removeBet: mockRemoveBet,
      isBetInSlip: mockIsBetInSlip.mockReturnValue(false),
    });
    
    (useCurrency as any).mockReturnValue({
      currency: 'cash',
    });
  });

  it('renders market information correctly', () => {
    render(<MarketCard market={mockMarket} />);
    
    // Check if the market question is displayed
    expect(screen.getByText('Will Bitcoin reach $100k by end of year?')).toBeDefined();
    
    // Check if end date is displayed
    expect(screen.getByText('Ends in 2 days')).toBeDefined();
    
    // Check if image is rendered
    expect(screen.getByTestId('mock-image')).toBeDefined();
  });

  it('adds a bet to the slip when outcome button is clicked', () => {
    render(<MarketCard market={mockMarket} />);
    
    // Find and click the "Yes" outcome button
    const yesButton = screen.getByText('+186').closest('button');
    if (!yesButton) throw new Error('Yes button not found');
    
    fireEvent.click(yesButton);
    
    // Verify addBet was called with the correct arguments
    expect(mockAddBet).toHaveBeenCalledWith({
      marketId: 'market-123',
      marketQuestion: 'Will Bitcoin reach $100k by end of year?',
      outcomeId: 'market-123-Yes',
      outcomeName: 'Yes',
      odds: '+186',
      probability: 0.35,
      imageUrl: '/test-image.jpg',
    });
  });

  it('removes a bet from the slip when already selected outcome is clicked', () => {
    // Mock that the "Yes" outcome is already in the bet slip
    mockIsBetInSlip.mockImplementation((id) => id === 'market-123-Yes');
    
    render(<MarketCard market={mockMarket} />);
    
    // Find and click the "Yes" outcome button (which should now be selected)
    const yesButton = screen.getByText('+186').closest('button');
    if (!yesButton) throw new Error('Yes button not found');
    
    fireEvent.click(yesButton);
    
    // Verify removeBet was called with the correct argument
    expect(mockRemoveBet).toHaveBeenCalledWith('market-123-Yes');
  });

  it('displays different styling for selected outcomes', () => {
    // Mock that the "Yes" outcome is in the bet slip
    mockIsBetInSlip.mockImplementation((id) => id === 'market-123-Yes');
    
    render(<MarketCard market={mockMarket} />);
    
    // Get the buttons by their positions and outcome labels rather than odds values
    const yesLabel = screen.getByText('Yes');
    const noLabel = screen.getByText('No');
    
    const yesButton = yesLabel.closest('div')?.querySelector('button');
    const noButton = noLabel.closest('div')?.querySelector('button');
    
    if (!yesButton || !noButton) throw new Error('Buttons not found');
    
    // Check if the "Yes" button has the selected class
    expect(yesButton.className).toContain('bg-primary/10');
    
    // Check if the "No" button doesn't have the selected class
    expect(noButton.className).not.toContain('bg-primary/10');
  });

  it('hides the view details button when hideViewDetails is true', () => {
    render(<MarketCard market={mockMarket} hideViewDetails={true} />);
    
    // Check that the button with View Details is not present
    const viewDetailsButton = screen.queryByText('View Details');
    expect(viewDetailsButton).toBeNull();
  });

  it('displays the view details button when hideViewDetails is false', () => {
    render(<MarketCard market={mockMarket} hideViewDetails={false} />);
    
    // Check that the button with View Details is present
    const viewDetailsButton = screen.getByText('View Details');
    expect(viewDetailsButton).toBeDefined();
  });

  it('renders markets with multiple submarkets correctly', () => {
    const marketWithSubmarkets = {
      ...mockMarket,
      marketsCount: 3,
      topSubmarkets: [
        { 
          groupItemTitle: 'Team A', 
          question: 'Will Team A win?', 
          probability: 0.25 
        },
        { 
          groupItemTitle: 'Team B', 
          question: 'Will Team B win?', 
          probability: 0.35 
        },
        { 
          groupItemTitle: 'Team C', 
          question: 'Will Team C win?', 
          probability: 0.40 
        }
      ]
    };
    
    render(<MarketCard market={marketWithSubmarkets} />);
    
    // Check if "Top Markets:" label is displayed
    expect(screen.getByText('Top Markets:')).toBeDefined();
    
    // Check if submarket buttons are displayed
    expect(screen.getByText('Team A')).toBeDefined();
    expect(screen.getByText('Team B')).toBeDefined();
    expect(screen.getByText('Team C')).toBeDefined();
  });
}); 