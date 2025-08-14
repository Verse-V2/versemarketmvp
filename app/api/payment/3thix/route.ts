import { NextRequest, NextResponse } from 'next/server';

// TODO: Move to environment variables for production
const THRIX_API_KEY = process.env.THRIX_API_KEY || '4ahFyzrENcUBMad53zmKbW0ENhP2g6HKtj6pv57n1fIIgh3rfFWDtzJPedAhcjL0';
const THRIX_API_URL = process.env.THRIX_API_URL || 'https://sandbox-api.3thix.com/order/payment/create';

interface PaymentRequest {
  amount: number;
  points: number;
  bonusCash: number;
}

interface ThrixPaymentResponse {
  order_id: string;
  invoice_id: string;
  invoice_amount: string;
  invoice_currency: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    const { amount, points, bonusCash } = body;

    // Validate required fields
    if (!amount || !points) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, points' },
        { status: 400 }
      );
    }

    // Create cart item description
    const productName = `${points.toLocaleString()} Verse Coins${bonusCash > 0 ? ` + $${bonusCash.toFixed(2)} Verse Cash` : ''}`;

    // Get the base URL for callbacks
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    
    // Make request to 3thix API
    const thrixResponse = await fetch(THRIX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': THRIX_API_KEY,
      },
      body: JSON.stringify({
        rail: 'CREDIT_CARD',
        currency: 'USD',
        amount: amount.toFixed(2),
        cart: [
          {
            product_name: productName,
            qty_unit: 1,
            price_unit: amount.toFixed(2),
          },
        ],

      }),
    });

    if (!thrixResponse.ok) {
      const errorText = await thrixResponse.text();
      console.error('3thix API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create payment request' },
        { status: 500 }
      );
    }

    const paymentData: ThrixPaymentResponse = await thrixResponse.json();

    // Construct callback URL with payment data
    const successCallbackUrl = `${baseUrl}/payment/success?amount=${amount.toFixed(2)}&points=${points}&bonus_cash=${bonusCash}`;
    const encodedCallbackUrl = encodeURIComponent(successCallbackUrl);

    return NextResponse.json({
      success: true,
      invoice_id: paymentData.invoice_id,
      order_id: paymentData.order_id,
      payment_url: `https://sandbox-pay.3thix.com/?invoiceId=${paymentData.invoice_id}&callbackUrl=${encodedCallbackUrl}`,
    });

  } catch (error) {
    console.error('Error creating 3thix payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}