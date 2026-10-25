import { AccessToken } from 'livekit-server-sdk';
import type { SupportedLanguage } from '@linguameet/types';

export interface TokenRequestParams {
  roomCode: string;
  displayName: string;
  preferredLanguage?: SupportedLanguage;
  isHost?: boolean;
}

export interface TokenAuthResult {
  token: string;
  livekitUrl: string;
  participantId: string;
  roomCode: string;
  displayName: string;
  isHost: boolean;
  ttlSeconds: number;
}

/**
 * Validates room code format (must be 3 to 64 alphanumeric characters, hyphens, or underscores).
 */
export function isValidRoomCode(roomCode: string): boolean {
  if (!roomCode || typeof roomCode !== 'string') return false;
  const regex = /^[a-zA-Z0-9_-]{3,64}$/;
  return regex.test(roomCode.trim());
}

/**
 * Validates participant display name (1 to 50 characters, trimmed).
 */
export function isValidDisplayName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 50;
}

/**
 * Authorizes a user to join a room and issues a short-lived LiveKit JWT token.
 * 
 * SECURITY GUARANTEES:
 * 1. The LIVEKIT_API_SECRET is strictly used on the server to sign the JWT.
 * 2. The API Secret is NEVER returned to the client or embedded in metadata.
 * 3. Tokens are short-lived (default 3600 seconds / 1 hour).
 */
export async function createAuthorizedToken(
  params: TokenRequestParams
): Promise<TokenAuthResult> {
  const { roomCode, displayName, preferredLanguage = 'en', isHost = false } = params;

  // 1. Validate inputs
  if (!isValidRoomCode(roomCode)) {
    throw new Error(
      `Invalid room code: "${roomCode}". Room codes must be 3-64 alphanumeric characters, dashes, or underscores.`
    );
  }

  if (!isValidDisplayName(displayName)) {
    throw new Error(
      'Invalid display name. Name must be between 1 and 50 characters.'
    );
  }

  // 2. Validate environment credentials
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    throw new Error(
      'LiveKit credentials not configured. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL in your server environment.'
    );
  }

  // 3. Generate unique participant identity
  const sanitizedName = displayName.trim();
  const participantId = `usr_${Math.random().toString(36).substring(2, 9)}`;
  const ttl = 3600; // 1 hour (short-lived)

  // 4. Create AccessToken with permissions
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: sanitizedName,
    metadata: JSON.stringify({
      preferredLanguage,
      isHost,
      joinedAt: new Date().toISOString(),
    }),
    ttl: `${ttl}s`,
  });

  // 5. Add Room Grant (Permissions)
  at.addGrant({
    room: roomCode.trim(),
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isHost,
  });

  const token = await at.toJwt();

  // Return ONLY public client-safe fields. NEVER include apiSecret.
  return {
    token,
    livekitUrl,
    participantId,
    roomCode: roomCode.trim(),
    displayName: sanitizedName,
    isHost,
    ttlSeconds: ttl,
  };
}
