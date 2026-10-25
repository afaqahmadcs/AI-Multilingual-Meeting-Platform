import assert from 'node:assert';
import {
  isValidRoomCode,
  isValidDisplayName,
  createAuthorizedToken,
} from '../src/lib/livekit.ts';

function parseJwt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload);
}

async function runTokenAuthorizationTests() {
  console.log('\n===============================================================');
  console.log('   LinguaMeet - Phase 2: Token Authorization & Room Access Tests');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // --- Suite 1: Room Code Validation ---
  console.log('--- 1. Room Code Validation ---');
  test('Valid room code formats are accepted', () => {
    assert.strictEqual(isValidRoomCode('lingua-abc-xyz'), true);
    assert.strictEqual(isValidRoomCode('standup_2026'), true);
    assert.strictEqual(isValidRoomCode('room123'), true);
    assert.strictEqual(isValidRoomCode('team-sync-room-42'), true);
  });

  test('Invalid room codes are rejected', () => {
    assert.strictEqual(isValidRoomCode(''), false, 'Empty string must be rejected');
    assert.strictEqual(isValidRoomCode('ab'), false, 'Too short string must be rejected (<3 chars)');
    assert.strictEqual(isValidRoomCode('room with space'), false, 'Spaces must be rejected');
    assert.strictEqual(isValidRoomCode('room<script>'), false, 'Special characters must be rejected');
    assert.strictEqual(isValidRoomCode('../traversal'), false, 'Path traversal characters must be rejected');
    assert.strictEqual(isValidRoomCode(null as any), false, 'Null must be rejected');
  });

  // --- Suite 2: Display Name Validation ---
  console.log('\n--- 2. Display Name Validation ---');
  test('Valid display names are accepted', () => {
    assert.strictEqual(isValidDisplayName('Afaq Ahmad'), true);
    assert.strictEqual(isValidDisplayName('Guest'), true);
    assert.strictEqual(isValidDisplayName('Tariq_123'), true);
  });

  test('Invalid display names are rejected', () => {
    assert.strictEqual(isValidDisplayName(''), false, 'Empty name must be rejected');
    assert.strictEqual(isValidDisplayName('   '), false, 'Whitespace-only name must be rejected');
    assert.strictEqual(isValidDisplayName('a'.repeat(51)), false, 'Names > 50 chars must be rejected');
  });

  // --- Suite 3: Token Minting & Environment Validation ---
  console.log('\n--- 3. Token Minting & Environment Validation ---');
  await asyncTest('Throws error when LiveKit environment variables are missing', async () => {
    const origKey = process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_KEY;

    let threw = false;
    try {
      await createAuthorizedToken({
        roomCode: 'lingua-test-123',
        displayName: 'Afaq',
      });
    } catch (err: any) {
      threw = true;
      assert.match(err.message, /LiveKit credentials not configured/);
    } finally {
      process.env.LIVEKIT_API_KEY = origKey;
    }
    assert.strictEqual(threw, true);
  });

  // --- Suite 4: Security Boundaries & Secret Isolation ---
  console.log('\n--- 4. Security Boundaries & Token Integrity ---');
  await asyncTest('Issues valid short-lived JWT without exposing API secret', async () => {
    const testSecret = 'mock_secret_key_for_testing_purposes_only_at_least_32_chars!';
    process.env.LIVEKIT_API_KEY = 'test_api_key_123';
    process.env.LIVEKIT_API_SECRET = testSecret;
    process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://test.livekit.cloud';

    const result = await createAuthorizedToken({
      roomCode: 'lingua-security-test',
      displayName: 'Security Auditor',
      preferredLanguage: 'ur',
      isHost: false,
    });

    // 1. Secret is NOT returned in client response
    assert.strictEqual(
      Object.keys(result).includes('apiSecret'),
      false,
      'LIVEKIT_API_SECRET must not exist in returned auth result'
    );
    assert.strictEqual(
      JSON.stringify(result).includes(testSecret),
      false,
      'API secret must never be leaked anywhere in result payload'
    );

    // 2. Token format is valid JWT
    assert.ok(result.token.startsWith('eyJ'), 'Token must be a valid signed JWT');

    // 3. TTL is strictly short-lived (1 hour = 3600 seconds)
    assert.strictEqual(result.ttlSeconds, 3600, 'TTL must be 3600 seconds (1 hour)');

    // 4. Decode JWT claims to verify grants
    const claims = parseJwt(result.token);
    assert.strictEqual(claims.video.room, 'lingua-security-test');
    assert.strictEqual(claims.video.roomJoin, true);
    assert.strictEqual(claims.video.canPublish, true);
    assert.strictEqual(claims.video.canSubscribe, true);
    assert.strictEqual(claims.video.canPublishData, true);
    assert.strictEqual(claims.video.roomAdmin, false);

    // 5. Expiration claim strictly set
    const nowSec = Math.floor(Date.now() / 1000);
    assert.ok(claims.exp > nowSec, 'Token expiration must be in the future');
    assert.ok(claims.exp <= nowSec + 3605, 'Token expiration must not exceed 1 hour');
  });

  await asyncTest('Host tokens correctly receive roomAdmin permissions', async () => {
    process.env.LIVEKIT_API_KEY = 'test_api_key_123';
    process.env.LIVEKIT_API_SECRET = 'mock_secret_key_for_testing_purposes_only_at_least_32_chars!';
    process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://test.livekit.cloud';

    const hostResult = await createAuthorizedToken({
      roomCode: 'lingua-host-test',
      displayName: 'Host User',
      isHost: true,
    });

    const claims = parseJwt(hostResult.token);
    assert.strictEqual(claims.video.roomAdmin, true, 'Host must have roomAdmin grant');
  });

  console.log('\n===============================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTokenAuthorizationTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
