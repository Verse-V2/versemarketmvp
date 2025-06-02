import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leagueId, leagueType, userId, espnSWID, espnSWID2, yahooRefreshToken } = body;

    // Extract auth token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    const authToken = authHeader.replace('Bearer ', '');

    // Validate required parameters
    if (!leagueId || !leagueType || !userId) {
      return NextResponse.json(
        { message: 'Missing required parameters: leagueId, leagueType, and userId are required' },
        { status: 400 }
      );
    }

    // Use the same API Gateway URL as iOS app (from Configuration/Staging.xcconfig)
    const cloudFunctionUrl = 'https://verse-fantasy-v2-staging-api-gateway-57gmu9tf.uc.gateway.dev/leagueSync_syncNewLeague';
    console.log('Attempting to call league sync cloud function at:', cloudFunctionUrl);
    console.log('Request parameters:', { leagueId, leagueType, userId });
    
    // Build query parameters (matching iOS QueryParamConverter.swift format)
    const queryParams = new URLSearchParams();
    queryParams.append('leagueId', leagueId);
    queryParams.append('leagueType', leagueType);
    queryParams.append('userId', userId);
    if (espnSWID) queryParams.append('espnSWID', espnSWID);
    if (espnSWID2) queryParams.append('espnSWID2', espnSWID2);
    if (yahooRefreshToken) queryParams.append('yahooRefreshToken', yahooRefreshToken);

    const response = await fetch(`${cloudFunctionUrl}?${queryParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      console.error('League sync cloud function error:', {
        status: response.status,
        statusText: response.statusText,
        error
      });
      return NextResponse.json(
        { message: error?.message || `League sync failed with status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('League sync completed successfully for league:', leagueId);
    return NextResponse.json(data);
  } catch (error) {
    // Log the full error details
    console.error('Detailed error in league sync route:', {
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