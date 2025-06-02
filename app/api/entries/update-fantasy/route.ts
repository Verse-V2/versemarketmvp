import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const requestStart = Date.now();
  console.log('API Route: /api/entries/update-fantasy POST request received at:', new Date().toISOString());
  
  try {
    console.log('API Route: Parsing request body...');
    const body = await request.json();
    console.log('API Route: Request body parsed:', body);
    const { userId } = body;

    // Extract auth token from headers
    console.log('API Route: Extracting auth token from headers...');
    const authHeader = request.headers.get('authorization');
    console.log('API Route: Auth header present:', !!authHeader, 'starts with Bearer:', authHeader?.startsWith('Bearer '));
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('API Route: Missing or invalid authorization header');
      return NextResponse.json(
        { message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    const authToken = authHeader.replace('Bearer ', '');
    console.log('API Route: Auth token extracted, length:', authToken?.length || 0);

    // Validate required parameters
    console.log('API Route: Validating parameters...');
    if (!userId) {
      console.error('API Route: Missing userId parameter');
      return NextResponse.json(
        { message: 'Missing required parameter: userId is required' },
        { status: 400 }
      );
    }
    console.log('API Route: Parameters validated successfully, userId:', userId);

    // Use the same API Gateway URL as iOS app (matching EntryURLBuilder.swift)
    const cloudFunctionUrl = 'https://verse-fantasy-v2-staging-api-gateway-57gmu9tf.uc.gateway.dev/entry_updateFantasyMatchup';
    console.log('API Route: Attempting to call entry update cloud function at:', cloudFunctionUrl);
    console.log('API Route: Request parameters:', { userId });
    
    // Build query parameters (matching iOS implementation - userId as query param)
    console.log('API Route: Building query parameters...');
    const queryParams = new URLSearchParams();
    queryParams.append('userId', userId);
    const finalUrl = `${cloudFunctionUrl}?${queryParams}`;
    console.log('API Route: Final URL with query params:', finalUrl);

    console.log('API Route: Making fetch request to cloud function...');
    const cloudFunctionStart = Date.now();
    
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const cloudFunctionDuration = Date.now() - cloudFunctionStart;
    console.log('API Route: Cloud function request completed in', cloudFunctionDuration + 'ms');
    console.log('API Route: Cloud function response status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('API Route: Cloud function returned error status:', response.status);
      
      const error = await response.json().catch((e) => {
        console.error('API Route: Failed to parse error response as JSON:', e);
        return null;
      });
      
      console.error('API Route: Cloud function error details:', error);
      
      return NextResponse.json(
        { message: error?.message || `Entry update failed with status ${response.status}` },
        { status: response.status }
      );
    }

    console.log('API Route: Parsing successful cloud function response...');
    const data = await response.json();
    console.log('API Route: Cloud function response data:', data);
    
    const totalDuration = Date.now() - requestStart;
    console.log('API Route: Entry update completed successfully for user:', userId, 'in', totalDuration + 'ms');
    
    return NextResponse.json(data);
  } catch (error) {
    const totalDuration = Date.now() - requestStart;
    
    // Log the full error details
    console.error('API Route: Exception in entry update route after', totalDuration + 'ms:', {
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