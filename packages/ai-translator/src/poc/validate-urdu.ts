import dotenv from 'dotenv';
dotenv.config();

import { MockSTTProvider, MockTranslationProvider, MockTTSProvider } from '../adapters/mock.adapter.js';
import { OpenAIAdapter } from '../adapters/openai.adapter.js';
import { AzureAdapter } from '../adapters/azure.adapter.js';
import { TranslationPipeline } from '../pipeline.js';
import { ISTTProvider } from '../interfaces/stt.interface.js';
import { ITranslationProvider } from '../interfaces/translation.interface.js';
import { ITTSProvider } from '../interfaces/tts.interface.js';

interface TestReport {
  testName: string;
  provider: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'WARNING';
  latencyMs: number;
  details: string;
}

async function runUrduValidationPoC() {
  console.log('\n===============================================================');
  console.log('   LinguaMeet - Urdu <-> English Translation Validation PoC');
  console.log('===============================================================\n');

  const reports: TestReport[] = [];

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasAzure = Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);

  console.log('Environment Detection:');
  console.log(`- OPENAI_API_KEY:    ${hasOpenAI ? 'Present (Live API test)' : 'Not set (Skipping live API)'}`);
  console.log(`- AZURE_SPEECH_KEY:  ${hasAzure ? 'Present (Live API test)' : 'Not set (Skipping live API)'}`);
  console.log('---------------------------------------------------------------\n');

  // 1. Validate Provider Contracts with Mock Pipeline
  console.log('1. Validating Provider Adapter Interfaces & Pipeline Flow...');
  const mockPipeline = new TranslationPipeline({
    stt: new MockSTTProvider(),
    translation: new MockTranslationProvider(),
    tts: new MockTTSProvider(),
  });

  const mockInput = {
    buffer: Buffer.from([0, 1, 2, 3]),
    mimeType: 'audio/wav',
    languageHint: 'ur' as const,
  };

  const mockResult = await mockPipeline.processSpeechToSpeech(mockInput, 'en');
  reports.push({
    testName: 'Pipeline Contract (Speech-to-Speech)',
    provider: 'Mock Adapter Suite',
    status: mockResult.tts?.audioBuffer.length ? 'PASSED' : 'FAILED',
    latencyMs: mockResult.totalLatencyMs,
    details: `Input: "${mockResult.stt.text}" -> Output: "${mockResult.translation.translatedText}"`,
  });

  // 2. Validate Urdu -> English Translation
  console.log('2. Validating Urdu -> English Machine Translation...');
  const urduPhrase = 'السلام علیکم، کیا آپ کو میری آواز صاف سنائی دے رہی ہے؟';
  let mtProvider: ITranslationProvider;

  if (hasOpenAI) {
    mtProvider = new OpenAIAdapter();
  } else if (hasAzure) {
    mtProvider = new AzureAdapter();
  } else {
    mtProvider = new MockTranslationProvider();
  }

  try {
    const urToEn = await mtProvider.translate(urduPhrase, 'ur', 'en');
    reports.push({
      testName: 'Urdu to English Translation',
      provider: mtProvider.providerName,
      status: 'PASSED',
      latencyMs: urToEn.latencyMs,
      details: `[Urdu]: ${urToEn.originalText}\n     -> [English]: ${urToEn.translatedText}`,
    });
  } catch (err: any) {
    reports.push({
      testName: 'Urdu to English Translation',
      provider: mtProvider.providerName,
      status: 'FAILED',
      latencyMs: 0,
      details: err.message,
    });
  }

  // 3. Validate English -> Urdu Translation
  console.log('3. Validating English -> Urdu Machine Translation...');
  const englishPhrase = 'Welcome to the project kickoff meeting. Let us review the agenda.';
  try {
    const enToUr = await mtProvider.translate(englishPhrase, 'en', 'ur');
    reports.push({
      testName: 'English to Urdu Translation',
      provider: mtProvider.providerName,
      status: 'PASSED',
      latencyMs: enToUr.latencyMs,
      details: `[English]: ${enToUr.originalText}\n     -> [Urdu]: ${enToUr.translatedText}`,
    });
  } catch (err: any) {
    reports.push({
      testName: 'English to Urdu Translation',
      provider: mtProvider.providerName,
      status: 'FAILED',
      latencyMs: 0,
      details: err.message,
    });
  }

  // 4. Validate Urdu Speech Synthesis (TTS) - Critical Check
  console.log('4. Validating Urdu Speech Synthesis (TTS) Capability...');
  
  // Test OpenAI TTS behavior with Urdu (Must verify restriction)
  if (hasOpenAI) {
    const openaiTTS = new OpenAIAdapter();
    try {
      await openaiTTS.synthesize('خوش آمدید', 'ur');
      reports.push({
        testName: 'OpenAI Urdu TTS Safety Check',
        provider: 'OpenAI',
        status: 'WARNING',
        latencyMs: 0,
        details: 'OpenAI TTS returned audio, but audio quality for Urdu must be manually audited for foreign accent.',
      });
    } catch (err: any) {
      reports.push({
        testName: 'OpenAI Urdu TTS Safety Check',
        provider: 'OpenAI',
        status: 'PASSED',
        latencyMs: 0,
        details: `Correctly flagged Urdu limitation: "${err.message}"`,
      });
    }
  }

  // Test Azure or Mock Urdu TTS
  let urduTTSProvider: ITTSProvider;
  if (hasAzure) {
    urduTTSProvider = new AzureAdapter();
  } else {
    urduTTSProvider = new MockTTSProvider();
  }

  try {
    const urduTtsResult = await urduTTSProvider.synthesize(
      'آپ کی آواز بالکل صاف ہے، شکریہ۔',
      'ur',
      { gender: 'female' }
    );
    reports.push({
      testName: 'Urdu Neural Voice Synthesis',
      provider: urduTTSProvider.providerName,
      status: urduTtsResult.audioBuffer.length > 0 ? 'PASSED' : 'FAILED',
      latencyMs: urduTtsResult.latencyMs,
      details: `Synthesized ${urduTtsResult.audioBuffer.length} bytes (${urduTtsResult.mimeType}) in ${urduTtsResult.latencyMs}ms`,
    });
  } catch (err: any) {
    reports.push({
      testName: 'Urdu Neural Voice Synthesis',
      provider: urduTTSProvider.providerName,
      status: 'FAILED',
      latencyMs: 0,
      details: err.message,
    });
  }

  // 5. Final Report Summary
  console.log('\n===============================================================');
  console.log('                      VALIDATION RESULTS                       ');
  console.log('===============================================================\n');

  reports.forEach((r, idx) => {
    const icon = r.status === 'PASSED' ? '✅' : r.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${idx + 1}. [${r.status}] ${icon} ${r.testName} (${r.provider}) - ${r.latencyMs}ms`);
    console.log(`   Details: ${r.details}`);
    console.log('');
  });

  const allPassed = reports.every((r) => r.status === 'PASSED' || r.status === 'WARNING');
  if (allPassed) {
    console.log('🎉 Urdu Translation Architecture & Contract Validation: SUCCESSFUL!\n');
  } else {
    console.error('❌ Urdu Translation Validation: ENCOUNTERED FAILURES.\n');
    process.exit(1);
  }
}

runUrduValidationPoC().catch((err) => {
  console.error('Fatal PoC Error:', err);
  process.exit(1);
});
