import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const cloudFunctionUrl = 'https://us-central1-verse-fantasy-v2-staging.cloudfunctions.net/web-polymarket-placeEntry';
    console.log('Attempting to call cloud function at:', cloudFunctionUrl);
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const response = await fetch(cloudFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Cloud function error:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to place entry' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // Log the full error details
    console.error('Detailed error in place-entry route:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 