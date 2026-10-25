import { NextResponse } from 'next/server';
import { createAuthorizedToken, isValidRoomCode, isValidDisplayName } from '@/lib/livekit';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { roomCode, displayName, preferredLanguage, isHost } = body;

    if (!roomCode || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: roomCode and displayName' },
        { status: 400 }
      );
    }

    if (!isValidRoomCode(roomCode)) {
      return NextResponse.json(
        {
          error:
            'Invalid room code format. Room code must be 3-64 alphanumeric characters, hyphens or underscores.',
        },
        { status: 400 }
      );
    }

    if (!isValidDisplayName(displayName)) {
      return NextResponse.json(
        { error: 'Display name must be between 1 and 50 characters.' },
        { status: 400 }
      );
    }

    // Check if LiveKit credentials exist
    const hasLiveKit = Boolean(
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      process.env.NEXT_PUBLIC_LIVEKIT_URL
    );

    if (!hasLiveKit) {
      return NextResponse.json(
        {
          error:
            'LiveKit server credentials are not configured. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL in your server environment.',
          isConfigured: false,
        },
        { status: 503 }
      );
    }

    // Generate short-lived authorized token
    const result = await createAuthorizedToken({
      roomCode,
      displayName,
      preferredLanguage: preferredLanguage || 'en',
      isHost: Boolean(isHost),
    });

    // Return safe client payload (Notice: LIVEKIT_API_SECRET is NEVER returned)
    return NextResponse.json({
      success: true,
      token: result.token,
      livekitUrl: result.livekitUrl,
      participantId: result.participantId,
      roomCode: result.roomCode,
      displayName: result.displayName,
      isHost: result.isHost,
      ttl: result.ttlSeconds,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to authorize and mint LiveKit access token' },
      { status: 500 }
    );
  }
}
