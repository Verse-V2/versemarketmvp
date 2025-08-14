import { NextRequest, NextResponse } from 'next/server';

const THRIX_API_KEY = process.env.THRIX_API_KEY || '4ahFyzrENcUBMad53zmKbW0ENhP2g6HKtj6pv57n1fIIgh3rfFWDtzJPedAhcjL0';
const THRIX_VERIFY_URL = process.env.THRIX_VERIFY_URL || 'https://sandbox-api.3thix.com/invoice/issuer/get';

interface VerificationRequest {
  invoiceId: string;
  amount: number;
  points: number;
  bonusCash: number;
  userId: string;
}

interface ThrixInvoiceResponse {
  invoice: {
    id: string;
    order_id: string;
    status: string;
    amount: string;
    currency: string;
  };
  order: {
    id: string;
    status: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: VerificationRequest = await request.json();
    const { invoiceId, amount, points, bonusCash, userId } = body;

    // Validate required fields
    if (!invoiceId || !amount || !points || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Call 3thix API to verify payment
    const verifyResponse = await fetch(THRIX_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': THRIX_API_KEY,
      },
      body: JSON.stringify({
        id: invoiceId,
      }),
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('3thix verification error:', errorText);
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 500 }
      );
    }

    const invoiceData: ThrixInvoiceResponse = await verifyResponse.json();
    
    // Check if payment was successful
    const isPaid = invoiceData.invoice.status === 'PAID' || invoiceData.order.status === 'COMPLETED';
    const amountMatches = parseFloat(invoiceData.invoice.amount) === amount;

    if (!isPaid) {
      return NextResponse.json(
        { error: 'Payment not completed', status: invoiceData.invoice.status },
        { status: 400 }
      );
    }

    if (!amountMatches) {
      return NextResponse.json(
        { error: 'Payment amount mismatch' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      invoice: {
        id: invoiceData.invoice.id,
        status: invoiceData.invoice.status,
        amount: invoiceData.invoice.amount,
      },
    });

  } catch (error) {
    console.error('Error verifying 3thix payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
