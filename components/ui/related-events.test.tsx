import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RelatedEvents } from './related-events'

// Mock Next.js components
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <div data-testid="mock-image" data-src={src} data-alt={alt} {...props} />
  )
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props} data-testid="mock-link">
      {children}
    </a>
  )
}))

// Mock utils functions
vi.mock('@/utils', () => ({
  toAmericanOdds: vi.fn((prob: number) => `+${Math.round(100 / prob - 100)}`),
  formatDate: vi.fn(() => '2024-01-15'),
  formatVolume: vi.fn((volume: string) => `$${parseFloat(volume).toLocaleString()}`)
}))

const mockEvents = [
  {
    id: 'event1',
    slug: 'event-1',
    title: 'Will Bitcoin reach $100k by 2024?',
    image: '/bitcoin.jpg',
    probability: 0.75,
    endDate: '2024-12-31T23:59:59Z',
    volume: '1500000'
  },
  {
    id: 'event2',
    slug: 'event-2', 
    title: 'Will Tesla stock hit $300?',
    image: '/tesla.jpg',
    endDate: '2024-06-30T23:59:59Z',
    volume: '500000'
  },
  {
    id: 'event3',
    slug: 'event-3',
    title: 'Will AI surpass human intelligence?',
    image: '/ai.jpg'
  }
]

describe('RelatedEvents', () => {
  const defaultProps = {
    events: mockEvents,
    loading: false
  }

  it('renders loading state correctly', () => {
    render(<RelatedEvents {...defaultProps} events={[]} loading={true} />)
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    
    // Should show 4 skeleton items
    const skeletonItems = screen.getAllByRole('generic').filter(
      el => el.classList.contains('animate-pulse')
    )
    expect(skeletonItems).toHaveLength(4)
  })

  it('renders empty state when no events', () => {
    render(<RelatedEvents {...defaultProps} events={[]} />)
    
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('No related events found.')).toBeInTheDocument()
  })

  it('renders events list correctly', () => {
    render(<RelatedEvents {...defaultProps} />)
    
    expect(screen.getByTestId('events-list')).toBeInTheDocument()
    
    // Should render all event cards
    const eventCards = screen.getAllByTestId('event-card')
    expect(eventCards).toHaveLength(3)
    
    // Check event titles
    expect(screen.getByText('Will Bitcoin reach $100k by 2024?')).toBeInTheDocument()
    expect(screen.getByText('Will Tesla stock hit $300?')).toBeInTheDocument()
    expect(screen.getByText('Will AI surpass human intelligence?')).toBeInTheDocument()
  })

  it('renders event with probability correctly', () => {
    const eventWithProb = [mockEvents[0]]
    render(<RelatedEvents {...defaultProps} events={eventWithProb} />)
    
    expect(screen.getByText('75.0% Yes')).toBeInTheDocument()
    expect(screen.getByText('+33')).toBeInTheDocument() // Mocked odds calculation
  })

  it('renders event with date and volume correctly', () => {
    const eventWithDateVolume = [mockEvents[1]]
    render(<RelatedEvents {...defaultProps} events={eventWithDateVolume} />)
    
    expect(screen.getByText('2024-01-15')).toBeInTheDocument() // Mocked date format
    expect(screen.getByText('$500,000')).toBeInTheDocument() // Mocked volume format
  })

  it('renders fallback text for events without prob/date/volume', () => {
    const basicEvent = [mockEvents[2]]
    render(<RelatedEvents {...defaultProps} events={basicEvent} />)
    
    expect(screen.getByText('Related market')).toBeInTheDocument()
  })

  it('renders images when provided', () => {
    render(<RelatedEvents {...defaultProps} />)
    
    const images = screen.getAllByTestId('mock-image')
    expect(images).toHaveLength(3)
    
    expect(images[0]).toHaveAttribute('data-src', '/bitcoin.jpg')
    expect(images[0]).toHaveAttribute('data-alt', 'Will Bitcoin reach $100k by 2024?')
  })

  it('renders links correctly', () => {
    render(<RelatedEvents {...defaultProps} />)
    
    const links = screen.getAllByTestId('mock-link')
    expect(links).toHaveLength(3)
    
    expect(links[0]).toHaveAttribute('href', '/events/event1')
    expect(links[1]).toHaveAttribute('href', '/events/event2')
    expect(links[2]).toHaveAttribute('href', '/events/event3')
  })

  it('accepts custom title', () => {
    render(<RelatedEvents {...defaultProps} title="Similar Markets" />)
    
    expect(screen.getByText('Similar Markets')).toBeInTheDocument()
    expect(screen.queryByText('Related Events')).not.toBeInTheDocument()
  })

  it('uses default title when not provided', () => {
    render(<RelatedEvents {...defaultProps} />)
    
    expect(screen.getByText('Related Events')).toBeInTheDocument()
  })
}) 