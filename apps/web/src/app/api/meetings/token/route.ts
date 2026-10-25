import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomCode, displayName, preferredLanguage } = body;

    if (!roomCode || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: roomCode and displayName' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        {
          error:
            'LiveKit credentials are not configured in the server environment. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL in apps/web/.env.local',
          isConfigured: false,
        },
        { status: 503 }
      );
    }

    // Generate unique participant identity
    const participantId = `usr_${Math.random().toString(36).substring(2, 9)}`;

    // Create LiveKit Access Token with participant grants
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantId,
      name: displayName,
      metadata: JSON.stringify({
        preferredLanguage: preferredLanguage || 'en',
      }),
      ttl: '4h',
    });

    at.addGrant({
      room: roomCode,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      success: true,
      token,
      livekitUrl,
      participantId,
      roomCode,
      displayName,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to mint LiveKit access token' },
      { status: 500 }
    );
  }
}
