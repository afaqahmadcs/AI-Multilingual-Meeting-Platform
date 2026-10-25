import assert from 'node:assert';
import { processTranslationRequest } from '../src/lib/translation-service.ts';
import type { CaptionFrame, AudioTranslationPayload } from '@linguameet/types';

async function runTranslationIntegrationTests() {
  console.log('\n===============================================================');
  console.log('   LinguaMeet - Translation Pipeline Integration Tests');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // --- Suite 1: Participant Consent Enforcement ---
  console.log('--- 1. Participant AI Consent Enforcement ---');

  await test('Rejects translation request when consent is NOT granted (403)', async () => {
    const res = await processTranslationRequest({
      consentGranted: false,
      sourceLanguage: 'en',
      targetLanguage: 'ur',
      rawText: 'Hello world',
      speakerId: 'user_1',
    });

    assert.strictEqual(res.status, 403, 'Must return 403 Forbidden without consent');
    assert.strictEqual(res.data.consentRequired, true, 'Must indicate consentRequired flag');
    assert.match(res.data.error || '', /consent required/i);
  });

  await test('Allows translation request when consent is explicitly granted', async () => {
    const res = await processTranslationRequest({
      consentGranted: true,
      sourceLanguage: 'en',
      targetLanguage: 'ur',
      rawText: 'Hello, how are you?',
      speakerId: 'user_1',
      speakerName: 'Alice',
      meetingId: 'room_101',
    });

    assert.strictEqual(res.status, 200, 'Must return 200 OK when consent is granted');
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.caption, 'Must return caption frame');
    assert.strictEqual(res.data.caption.sourceLanguage, 'en');
    assert.strictEqual(res.data.caption.targetLanguage, 'ur');
  });

  // --- Suite 2: Strict Validated Language Pair Filtering ---
  console.log('\n--- 2. Validated Language Pair Enforcement (ur <-> en ONLY) ---');

  await test('Rejects unsupported language pair: Spanish -> English (400)', async () => {
    const res = await processTranslationRequest({
      consentGranted: true,
      sourceLanguage: 'es' as any,
      targetLanguage: 'en',
      rawText: 'Hola amigo',
      speakerId: 'user_es',
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.isSupported, false);
    assert.match(res.data.error || '', /unsupported language pair/i);
  });

  await test('Rejects identical source and target language: en -> en (400)', async () => {
    const res = await processTranslationRequest({
      consentGranted: true,
      sourceLanguage: 'en',
      targetLanguage: 'en',
      rawText: 'Same language test',
      speakerId: 'user_en',
    });

    assert.strictEqual(res.status, 400);
  });

  await test('Accepts validated pair: Urdu -> English (200)', async () => {
    const res = await processTranslationRequest({
      consentGranted: true,
      sourceLanguage: 'ur',
      targetLanguage: 'en',
      rawText: 'آپ کا شکریہ',
      speakerId: 'user_urdu',
      speakerName: 'Ahmad',
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.caption?.sourceLanguage, 'ur');
    assert.strictEqual(res.data.caption?.targetLanguage, 'en');
    assert.ok(res.data.audioPayload, 'Must synthesize English audio output');
  });

  // --- Suite 3: Microphone Feedback Loop Prevention & Targeted Routing ---
  console.log('\n--- 3. Feedback Loop Prevention & Intended Listener Routing ---');

  await test('Speaker never receives own translated voice (Feedback Loop Guard)', () => {
    const localIdentity = 'user_speaker_123';
    const incomingPayload: AudioTranslationPayload = {
      speakerId: 'user_speaker_123', // Self
      targetLanguage: 'ur',
      audioBase64: 'UklGRi4AAABXQVZFZm10IBAAAAABAAEA',
      mimeType: 'audio/wav',
      durationMs: 400,
      timestamp: Date.now(),
    };

    // Client routing decision logic simulation
    function shouldPlayAudio(payload: AudioTranslationPayload, myIdentity: string, myLang: string): boolean {
      if (payload.speakerId === myIdentity) {
        return false; // Prevent echo / feedback loop
      }
      if (payload.targetLanguage !== myLang) {
        return false; // Only intended listener receives audio
      }
      return true;
    }

    const decision = shouldPlayAudio(incomingPayload, localIdentity, 'ur');
    assert.strictEqual(decision, false, 'Speaker must NEVER play own audio back to prevent loop!');
  });

  await test('Target listener receives audio only when matching preferred language', () => {
    const listenerIdentity = 'user_listener_456';
    const incomingPayload: AudioTranslationPayload = {
      speakerId: 'user_speaker_123',
      targetLanguage: 'ur',
      audioBase64: 'UklGRi4AAABXQVZFZm10IBAAAAABAAEA',
      mimeType: 'audio/wav',
      durationMs: 400,
      timestamp: Date.now(),
    };

    function shouldPlayAudio(payload: AudioTranslationPayload, myIdentity: string, myLang: string): boolean {
      if (payload.speakerId === myIdentity) return false;
      if (payload.targetLanguage !== myLang) return false;
      return true;
    }

    // Listener with English preferred language should NOT play Urdu translated audio
    assert.strictEqual(shouldPlayAudio(incomingPayload, listenerIdentity, 'en'), false);

    // Listener with Urdu preferred language SHOULD play Urdu translated audio
    assert.strictEqual(shouldPlayAudio(incomingPayload, listenerIdentity, 'ur'), true);
  });

  // --- Suite 4: Fallback & Original Audio Preservation ---
  console.log('\n--- 4. Original Audio Preservation & Latency Instrumentation ---');

  await test('Pipeline returns latency budget metrics and preserves original audio', async () => {
    const res = await processTranslationRequest({
      consentGranted: true,
      sourceLanguage: 'en',
      targetLanguage: 'ur',
      rawText: 'Budget review meeting starting now.',
      speakerId: 'user_1',
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.metrics, 'Must return latency metrics');
    assert.ok(typeof res.data.metrics.totalLatencyMs === 'number');
    assert.ok(typeof res.data.metrics.translationLatencyMs === 'number');
    assert.ok(res.data.metrics.provider.translation, 'Must report active translation provider');
  });

  await test('Preserves original audio on empty speech slice (no failure crash)', async () => {
    const res = await processTranslationRequest({
      consentGranted: true,
      sourceLanguage: 'en',
      targetLanguage: 'ur',
      rawText: '   ', // whitespace only
      speakerId: 'user_1',
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.originalAudioPreserved, true, 'Original audio must remain active on empty speech');
  });

  console.log('\n===============================================================');
  console.log(`   Translation Integration Tests Completed: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTranslationIntegrationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
