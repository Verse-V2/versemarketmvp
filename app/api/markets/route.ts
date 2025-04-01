import { NextResponse } from 'next/server';
import axios from 'axios';

const POLYMARKET_API_URL = 'https://gamma-api.polymarket.com';

export async function GET() {
  try {
    const response = await axios.get(`${POLYMARKET_API_URL}/events`, {
      params: {
        limit: 50,
        order: 'volume',
        ascending: false,
        active: true,
        closed: false
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching from Polymarket API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
} 