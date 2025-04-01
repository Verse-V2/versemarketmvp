import { NextResponse } from 'next/server';
import axios from 'axios';
import { NextRequest } from 'next/server';

const POLYMARKET_API_URL = 'https://gamma-api.polymarket.com';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const eventId = context.params.id;

  if (!eventId) {
    return NextResponse.json(
      { error: 'Event ID is required' },
      { status: 400 }
    );
  }

  try {
    const response = await axios.get(`${POLYMARKET_API_URL}/events/${eventId}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching from Polymarket API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event details' },
      { status: 500 }
    );
  }
} 