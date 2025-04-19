import '@testing-library/jest-dom';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/mock-path',
  })),
  usePathname: vi.fn(() => '/mock-path'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Add any additional global mocks here 