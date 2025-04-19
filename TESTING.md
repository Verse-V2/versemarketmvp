# Testing Strategy for Verse Prediction Market MVP

This document outlines the testing approach for the Verse Prediction Market MVP, including setup, implementation patterns, and best practices.

## Test Setup

The project uses the following testing tools:

- **Vitest**: A fast and lightweight testing framework that's compatible with the Jest API
- **React Testing Library**: For testing React components from a user-centric perspective
- **@testing-library/jest-dom**: For additional DOM element matchers

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Testing Structure

The test files are co-located with the code they're testing, using the `.test.ts` or `.test.tsx` naming convention.

### Unit Tests

Unit tests focus on testing isolated functions and small utilities:

- `/lib/utils.test.ts`: Tests for utility functions
- `/lib/polymarket-service.test.ts`: Tests for API service functions

### Component Tests

Component tests verify that UI components render correctly and respond appropriately to user interactions:

- `/components/currency-toggle.test.tsx`: Tests for the CurrencyToggle component
- `/components/ui/market-card.test.tsx`: Tests for the MarketCard component

## Test Patterns and Examples

### 1. Testing Utility Functions

```typescript
// Example from lib/utils.test.ts
describe('cn', () => {
  it('should merge tailwind classes correctly', () => {
    const result = cn('text-red-500', 'bg-blue-200', 'p-4');
    expect(result).toBe('text-red-500 bg-blue-200 p-4');
  });
});
```

### 2. Testing API Services with Mocks

```typescript
// Example from lib/polymarket-service.test.ts
it('should fetch and transform event data correctly', async () => {
  // Mock API response
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockEventData
  });

  const result = await polymarketService.getEventById('event-123');
  
  // Verify fetch was called correctly
  expect(mockFetch).toHaveBeenCalledWith('http://test-origin/api/markets/event-123', {
    next: { revalidate: 60 }
  });
  
  // Verify the returned data is transformed correctly
  expect(result).toEqual({
    // Expected transformed data
  });
});
```

### 3. Testing React Components with Mock Hooks

```typescript
// Example from components/currency-toggle.test.tsx
it('renders cash button as active when currency is cash', () => {
  // Mock hook return values
  (useCurrency as any).mockReturnValue({
    currency: 'cash',
    setCurrency: mockSetCurrency,
  });
  
  render(<CurrencyToggle />);
  
  // Assertions about UI state
  const cashButton = screen.getByText('Cash').closest('button');
  expect(cashButton).toHaveClass('bg-background text-foreground');
});
```

### 4. Testing User Interactions

```typescript
// Example from components/ui/market-card.test.tsx
it('adds a bet to the slip when outcome button is clicked', () => {
  render(<MarketCard market={mockMarket} />);
  
  // Find and click a button
  const yesButton = screen.getByText('+186').closest('button');
  fireEvent.click(yesButton);
  
  // Verify the expected function was called with correct args
  expect(mockAddBet).toHaveBeenCalledWith({
    // Expected arguments
  });
});
```

## Best Practices

1. **Mock External Dependencies**: Always mock hooks, API calls, and external services to isolate the test subject
2. **Test User Behavior**: Focus on testing what users actually see and do rather than implementation details
3. **Use Descriptive Test Names**: Tests should clearly describe what they're testing and expected behavior
4. **Keep Tests Isolated**: Each test should be independent and not rely on the state from other tests
5. **Test Edge Cases**: Include tests for loading states, error states, and boundary conditions

## Next Steps for Testing

Areas to expand test coverage:

1. Add comprehensive integration tests for key user flows
2. Add more component tests for complex UI elements (bet-slip.tsx, purchase-sheet.tsx)
3. Implement end-to-end tests with Playwright for critical user journeys
4. Set up CI/CD pipeline to run tests automatically on pull requests 