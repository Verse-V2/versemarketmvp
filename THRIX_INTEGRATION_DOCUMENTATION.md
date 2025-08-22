# 3thix Payment Integration - Technical Documentation

## Overview
This document provides a comprehensive technical overview of the 3thix payment integration implementation on the web platform. This serves as a knowledge base for implementing the same functionality on mobile platforms.

## Architecture Overview

```
[User] → [Purchase Modal] → [Payment API] → [3thix API] → [3thix Widget] → [Callback] → [Verification] → [Success/Error]
```

## Core Components

### 1. Payment Initiation Flow

#### Frontend Component: `components/ui/purchase-sheet.tsx`
**Purpose**: User interface for selecting payment method and initiating payment

**Key Features**:
- Two payment method options: Credit/Debit Cards and ACH Bank Transfer
- Both options are powered by 3thix (unified payment processor)
- Custom branded UI with 3thix logo attribution
- Payment method selection state management

**Payment Methods**:
```typescript
type PaymentMethod = 'card' | 'ach';
```

**User Flow**:
1. User opens purchase modal
2. Selects payment method (Card or ACH)
3. Clicks purchase button
4. Frontend makes API call to initiate payment
5. User is redirected to 3thix payment widget

#### API Call Structure:
```typescript
POST /api/payment/3thix
{
  amount: number,
  points: number,
  bonusCash: number,
  paymentMethod: 'card' | 'ach'
}
```

### 2. Payment Creation API

#### Endpoint: `app/api/payment/3thix/route.ts`
**Purpose**: Creates payment order with 3thix and returns customized payment widget URL

**Environment Variables**:
```bash
THRIX_API_KEY=your_api_key
THRIX_API_URL=https://sandbox-api.3thix.com/order/payment/create
```

**Request Flow**:
1. Validates required fields (amount, points)
2. Creates product description for cart
3. Determines payment rail based on method selection
4. Makes API call to 3thix payment creation endpoint
5. Constructs callback URL with payment data
6. Applies custom theme parameters
7. Returns payment widget URL

#### 3thix API Request:
```typescript
POST https://sandbox-api.3thix.com/order/payment/create
Headers: {
  'Content-Type': 'application/json',
  'X-Api-Key': THRIX_API_KEY
}
Body: {
  rail: 'CREDIT_CARD' | 'ACH',  // Based on paymentMethod
  currency: 'USD',
  amount: string,
  cart: [{
    product_name: string,
    qty_unit: 1,
    price_unit: string
  }]
}
```

#### Theme Customization:
The payment widget is customized with brand colors:
```typescript
const themeParams = [
  `logo_url=${encodedLogoUrl}`,
  `primary_color=%230BC700`,              // Main green
  `secondary_color=%23FFB800`,            // Gold/yellow
  `background_primary_color=%2318181B`,   // Dark background
  `background_secondary_color=%2327272A`, // Secondary dark
  `background_card_color=%2327272A`,      // Card background
  `text_primary_color=%23FFFFFF`,         // White text
  `text_secondary_color=%239CA3AF`,       // Gray text
  `button_background_color=%230BC700`,    // Green buttons
  `button_background_hover_color=%230AB100`, // Hover green
  `button_text_color=%23FFFFFF`,          // White button text
  `success_color=%230BC700`,              // Green success
  `input_background_color=%23374151`,     // Input background
  `input_focus_border_color=%230BC700`,   // Green focus border
  `input_text_color=%23FFFFFF`,           // White input text
  `input_border_color=%236B7280`          // Gray border
].join('&');
```

#### Final Payment URL Structure:
```
https://sandbox-pay.3thix.com/?invoiceId={invoice_id}&callbackUrl={encoded_callback_url}&{theme_params}
```

#### Callback URL Structure:
```
{base_url}/payment/success?amount={amount}&points={points}&bonus_cash={bonus_cash}&invoice_id={invoice_id}
```

### 3. Payment Widget Interaction

**User Experience**:
1. User is redirected to branded 3thix payment widget
2. Widget displays with custom theme matching app branding
3. User completes payment (card details or bank account info)
4. 3thix processes payment
5. 3thix redirects user back to app via callback URL

**Callback Parameters Added by 3thix**:
- `status=ORDER_COMPLETED` (on success)
- Original parameters are preserved from callback URL

### 4. Payment Verification & Success Handling

#### Success Page: `app/payment/success/page.tsx`
**Purpose**: Handles payment completion, verifies with 3thix, and updates user account

**Flow**:
1. Extracts parameters from callback URL
2. Validates required parameters and success status
3. Calls verification API to double-check with 3thix
4. Updates user balance in Firestore
5. Shows success confirmation

#### Verification API: `app/api/payment/3thix/verify/route.ts`
**Purpose**: Server-side verification of payment completion with 3thix

**Security Features**:
- Double verification with 3thix API
- Amount validation
- Status validation
- Prevents fraudulent balance updates

**Verification Flow**:
```typescript
POST /api/payment/3thix/verify
{
  invoiceId: string,
  amount: number,
  points: number,
  bonusCash: number,
  userId: string
}
```

**3thix Verification API Call**:
```typescript
POST https://sandbox-api.3thix.com/invoice/issuer/get
Headers: {
  'Content-Type': 'application/json',
  'x-api-key': THRIX_API_KEY
}
Body: {
  id: invoiceId
}
```

**Validation Checks**:
1. Payment status is 'PAID' or order status is 'COMPLETED'
2. Payment amount matches expected amount
3. Invoice exists and is valid

#### Database Update:
Upon successful verification, user balances are updated in Firestore:
```typescript
// Firestore transaction to update user balances
transaction.set(userRef, {
  coinBalance: currentCoinBalance + points,
  cashBalance: currentCashBalance + bonusCash,
}, { merge: true });
```

### 5. Error Handling

#### Cancelled Payments: `app/payment/cancelled/page.tsx`
**Purpose**: Handles when user cancels payment in 3thix widget

**Features**:
- User-friendly cancellation message
- Options to retry payment or return to store
- No balance changes occur

#### Error States:
1. **API Errors**: 3thix API failures, network issues
2. **Validation Errors**: Missing parameters, invalid amounts
3. **Verification Failures**: Payment not completed, amount mismatches
4. **User Cancellation**: User exits payment widget

## Mobile Implementation Considerations

### 1. Platform-Specific Adaptations

#### iOS Implementation:
- Use `SFSafariViewController` or `ASWebAuthenticationSession` for payment widget
- Handle deep link callbacks via URL schemes
- Implement proper app backgrounding/foregrounding

#### Android Implementation:
- Use `Custom Tabs` or `WebView` for payment widget
- Handle deep link callbacks via intent filters
- Manage activity lifecycle during payment flow

### 2. Deep Link Handling

**URL Scheme Registration**:
```
verse://payment/success?amount=7.50&points=7500&bonus_cash=7.5&invoice_id=abc123&status=ORDER_COMPLETED
verse://payment/cancelled
```

**Deep Link Processing**:
1. Parse callback URL parameters
2. Validate payment completion status
3. Call verification API
4. Update local user state
5. Navigate to appropriate screen

### 3. API Integration

**Base URL Configuration**:
```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://your-production-domain.com/api';
```

**API Endpoints to Implement**:
1. `POST {API_BASE_URL}/payment/3thix` - Payment initiation
2. `POST {API_BASE_URL}/payment/3thix/verify` - Payment verification

### 4. State Management

**Payment State Flow**:
```typescript
type PaymentState = 
  | 'idle'
  | 'initiating'
  | 'widget_open'
  | 'processing_callback'
  | 'verifying'
  | 'success'
  | 'error'
  | 'cancelled';
```

**Required State Variables**:
- Payment method selection
- Transaction amount and currency details
- Loading states
- Error messages
- Success confirmation data

### 5. Security Considerations

**Client-Side Security**:
- Validate all callback parameters
- Never trust client-side success indicators alone
- Always verify with server-side API

**Server-Side Security**:
- Implement rate limiting on payment APIs
- Validate all incoming requests
- Use secure API key management
- Implement proper error logging

### 6. User Experience Guidelines

**Loading States**:
- Show loading indicator during payment initiation
- Handle app backgrounding gracefully
- Provide clear feedback during verification

**Error Handling**:
- Provide clear error messages
- Offer retry mechanisms
- Allow users to contact support

**Success Flow**:
- Confirm payment completion immediately
- Update UI with new balance
- Provide transaction confirmation

## Environment Configuration

### Development Environment:
```bash
THRIX_API_KEY=sandbox_api_key
THRIX_API_URL=https://sandbox-api.3thix.com/order/payment/create
THRIX_VERIFY_URL=https://sandbox-api.3thix.com/invoice/issuer/get
```

### Production Environment:
```bash
THRIX_API_KEY=production_api_key
THRIX_API_URL=https://api.3thix.com/order/payment/create
THRIX_VERIFY_URL=https://api.3thix.com/invoice/issuer/get
```

## Testing Checklist

### Payment Flow Testing:
- [ ] Card payment initiation
- [ ] ACH payment initiation
- [ ] Payment widget customization
- [ ] Successful payment completion
- [ ] Payment cancellation
- [ ] Network error handling
- [ ] Invalid payment scenarios
- [ ] Amount verification
- [ ] Balance update verification

### Mobile-Specific Testing:
- [ ] Deep link handling
- [ ] App backgrounding/foregrounding
- [ ] WebView/Safari controller integration
- [ ] Payment state persistence
- [ ] Error state recovery

## Production Deployment Notes

1. **API Key Security**: Ensure 3thix API keys are stored securely
2. **HTTPS Requirements**: All callback URLs must use HTTPS in production
3. **Domain Verification**: Register production domains with 3thix
4. **Monitoring**: Implement payment success/failure rate monitoring
5. **Backup Plans**: Have fallback payment methods available

## Support & Troubleshooting

### Common Issues:
1. **Callback URL not working**: Check URL encoding and HTTPS
2. **Payment verification failing**: Verify API keys and endpoint URLs
3. **Theme not applying**: Check parameter encoding and values
4. **Balance not updating**: Verify Firestore permissions and transaction logic

### Debug Information to Collect:
- Payment amount and currency
- Selected payment method
- 3thix invoice ID
- Callback URL parameters
- API response codes and messages
- User authentication state

This documentation provides the foundation for implementing the same 3thix payment integration on mobile platforms while maintaining security, user experience, and functional parity with the web implementation.
