import { NextResponse } from 'next/server';
import axios from 'axios';

const POLYMARKET_API_URL = 'https://gamma-api.polymarket.com';

export async function GET() {
  try {
    const response = await axios.get(`${POLYMARKET_API_URL}/events`, {
      params: {
        limit: 100,
        order: 'volume',
        ascending: false,
        active: true,
        closed: false,
        include_tags: true,
        include_outcomes: true
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    const eventsWithFormattedTags = response.data.map((event: any) => {
      const formattedTags = event.tags ? event.tags.map((tag: any) => ({
        id: tag.id,
        label: tag.name || tag.label,
        slug: tag.slug || tag.name?.toLowerCase().replace(/\s+/g, '-') || ''
      })) : [];
      
      return {
        ...event,
        tags: formattedTags
      };
    });

    return NextResponse.json(eventsWithFormattedTags);
  } catch (error) {
    console.error('Error fetching from Polymarket API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
} 