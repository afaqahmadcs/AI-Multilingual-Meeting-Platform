                                                                           import { SupportedLanguage } from '@linguameet/types';
import { ISTTProvider, AudioInput, STTResult } from '../interfaces/stt.interface.js';
import { ITranslationProvider, TranslationResult } from '../interfaces/translation.interface.js';
import { ITTSProvider, TTSResult, TTSOptions } from '../interfaces/tts.interface.js';

export class MockSTTProvider implements ISTTProvider {
  readonly providerName = 'Mock-STT';

  async transcribe(input: AudioInput): Promise<STTResult> {
    const start = Date.now();
    await new Promise((res) => setTimeout(res, 80)); // Simulated latency

    const detected = input.languageHint || 'en';
    const text =
      detected === 'ur'
        ? 'السلام علیکم، آپ سب کا میٹنگ میں خیر مقدم ہے۔'
        : 'Hello everyone, welcome to the meeting.';

    return {
      text,
      detectedLanguage: detected,
      confidence: 0.98,
      durationMs: 2500,
      latencyMs: Date.now() - start,
    };
  }

  isLanguageSupported(language: SupportedLanguage): boolean {
    return language === 'en' || language === 'ur';
  }
}

export class MockTranslationProvider implements ITranslationProvider {
  readonly providerName = 'Mock-MT';

  private static readonly DICTIONARY: Record<string, string> = {
    'hello everyone, welcome to the meeting.': 'السلام علیکم، آپ سب کا میٹنگ میں خیر مقدم ہے۔',
    'how are you today?': 'آج آپ کیسے ہیں؟',
    'can you hear my voice clearly?': 'کیا آپ کو میری آواز صاف سنائی دے رہی ہے؟',
    'السلام علیکم، آپ سب کا میٹنگ میں خیر مقدم ہے۔': 'Hello everyone, welcome to the meeting.',
    'آج آپ کیسے ہیں؟': 'How are you today?',
    'کیا آپ کو میری آواز صاف سنائی دے رہی ہے؟': 'Can you hear my voice clearly?',
  };

  async translate(
    text: string,
    from: SupportedLanguage,
    to: SupportedLanguage
  ): Promise<TranslationResult> {
    const start = Date.now();
    await new Promise((res) => setTimeout(res, 50)); // Simulated latency

    const normalized = text.trim().toLowerCase();
    let translated = MockTranslationProvider.DICTIONARY[normalized];

    if (!translated) {
      if (from === 'en' && to === 'ur') {
        translated = `[اردو ترجمہ] ${text}`;
      } else if (from === 'ur' && to === 'en') {
        translated = `[English Translation] ${text}`;
      } else {
        translated = text;
      }
    }

    return {
      originalText: text,
      translatedText: translated,
      sourceLanguage: from,
      targetLanguage: to,
      latencyMs: Date.now() - start,
    };
  }

  isLanguagePairSupported(from: SupportedLanguage, to: SupportedLanguage): boolean {
    return (from === 'en' && to === 'ur') || (from === 'ur' && to === 'en');
  }
}

export class MockTTSProvider implements ITTSProvider {
  readonly providerName = 'Mock-TTS';

  async synthesize(
    text: string,
    language: SupportedLanguage,
    _options?: TTSOptions
  ): Promise<TTSResult> {
    const start = Date.now();
    await new Promise((res) => setTimeout(res, 60)); // Simulated latency

    // Create a mock silent/synthetic WAV header buffer for testing
    const sampleWavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
      0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00, 0x02, 0x00, 0x10, 0x00,
      0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00,
    ]);

    return {
      audioBuffer: sampleWavHeader,
      mimeType: 'audio/wav',
      durationMs: 1500,
      latencyMs: Date.now() - start,
    };
  }

  isLanguageSupported(language: SupportedLanguage): boolean {
    return language === 'en' || language === 'ur';
  }
}
