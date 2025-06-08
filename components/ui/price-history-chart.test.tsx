import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PriceHistoryChart } from './price-history-chart'

// Mock recharts components since they don't work well in test environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />
}))

const mockPriceHistories = [
  {
    id: 'market1',
    name: 'Yes',
    data: [
      { t: 1640995200, p: 0.6 },
      { t: 1641081600, p: 0.65 }
    ]
  },
  {
    id: 'market2', 
    name: 'Market 2',
    data: [
      { t: 1640995200, p: 0.4 },
      { t: 1641081600, p: 0.35 }
    ]
  }
]

describe('PriceHistoryChart', () => {
  const defaultProps = {
    priceHistories: mockPriceHistories,
    loading: false,
    isRateLimited: false,
    selectedTimeFrame: '1w',
    onTimeFrameChange: vi.fn()
  }

  it('renders loading state correctly', () => {
    render(<PriceHistoryChart {...defaultProps} loading={true} />)
    
    const loadingElement = screen.getByTestId('loading')
    expect(loadingElement).toBeInTheDocument()
    expect(loadingElement).toHaveClass('animate-pulse')
  })

  it('renders rate limited state correctly', () => {
    render(<PriceHistoryChart {...defaultProps} isRateLimited={true} />)
    
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
    expect(screen.getByText('Please try again in a few minutes')).toBeInTheDocument()
  })

  it('renders no data state correctly', () => {
    render(<PriceHistoryChart {...defaultProps} priceHistories={[]} />)
    
    expect(screen.getByText('No price history available')).toBeInTheDocument()
  })

  it('renders chart with data correctly', () => {
    render(<PriceHistoryChart {...defaultProps} />)
    
    // Check if chart components are rendered
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    
    // Check if legend items are rendered
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('Market 2')).toBeInTheDocument()
  })

  it('renders all time frame buttons', () => {
    render(<PriceHistoryChart {...defaultProps} />)
    
    const timeFrames = ['1h', '6h', '1d', '1w', '1m', 'All']
    timeFrames.forEach(timeFrame => {
      expect(screen.getByText(timeFrame)).toBeInTheDocument()
    })
  })

  it('calls onTimeFrameChange when time frame button is clicked', () => {
    const onTimeFrameChange = vi.fn()
    render(<PriceHistoryChart {...defaultProps} onTimeFrameChange={onTimeFrameChange} />)
    
    const oneDayButton = screen.getByText('1d')
    fireEvent.click(oneDayButton)
    
    expect(onTimeFrameChange).toHaveBeenCalledWith('1d')
  })

  it('highlights selected time frame', () => {
    render(<PriceHistoryChart {...defaultProps} selectedTimeFrame="1d" />)
    
    const oneDayButton = screen.getByText('1d')
    expect(oneDayButton).toHaveClass('bg-gray-200', 'dark:bg-gray-700')
  })

  it('handles empty data array gracefully', () => {
    const emptyDataHistories = [
      {
        id: 'market1',
        name: 'Yes',
        data: []
      }
    ]
    
    render(<PriceHistoryChart {...defaultProps} priceHistories={emptyDataHistories} />)
    
    expect(screen.getByText('No price history available')).toBeInTheDocument()
  })
}) 