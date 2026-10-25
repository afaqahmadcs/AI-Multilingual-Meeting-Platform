                                                           import { SupportedLanguage } from '@linguameet/types';
import { ISTTProvider, AudioInput, STTResult } from '../interfaces/stt.interface.js';
import { ITranslationProvider, TranslationResult } from '../interfaces/translation.interface.js';
import { ITTSProvider, TTSResult, TTSOptions } from '../interfaces/tts.interface.js';

export interface OpenAIOptions {
  apiKey?: string;
  baseUrl?: string;
  whisperModel?: string;
  translationModel?: string;
}

export class OpenAIAdapter implements ISTTProvider, ITranslationProvider, ITTSProvider {
  readonly providerName = 'OpenAI';
  private apiKey: string;
  private baseUrl: string;
  private whisperModel: string;
  private translationModel: string;

  constructor(options?: OpenAIOptions) {
    this.apiKey = options?.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = (options?.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    this.whisperModel = options?.whisperModel || 'whisper-1';
    this.translationModel = options?.translationModel || 'gpt-4o-mini';
  }

  // --- STT: OpenAI Whisper ---
  async transcribe(input: AudioInput): Promise<STTResult> {
    if (!this.apiKey) {
      throw new Error('[OpenAIAdapter] Missing OPENAI_API_KEY');
    }

    const start = Date.now();
    const formData = new FormData();
    const uint8 = new Uint8Array(input.buffer);
    const blob = new Blob([uint8], { type: input.mimeType });
    formData.append('file', blob, 'audio.wav');
    formData.append('model', this.whisperModel);

    if (input.languageHint) {
      formData.append('language', input.languageHint);
    }

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[OpenAI Whisper Error ${response.status}]: ${errText}`);
    }

    const data = (await response.json()) as { text: string };
    const latencyMs = Date.now() - start;

    return {
      text: data.text.trim(),
      detectedLanguage: input.languageHint || 'en',
      confidence: 0.95,
      durationMs: 0,
      latencyMs,
    };
  }

  // --- MT: OpenAI GPT-4o-mini ---
  async translate(
    text: string,
    from: SupportedLanguage,
    to: SupportedLanguage
  ): Promise<TranslationResult> {
    if (!this.apiKey) {
      throw new Error('[OpenAIAdapter] Missing OPENAI_API_KEY');
    }

    const start = Date.now();

    const systemPrompt = `You are a real-time conversational translator for live video meetings.
Translate the spoken input accurately between English and Urdu.
- Source language: ${from === 'ur' ? 'Urdu (اردو)' : 'English'}
- Target language: ${to === 'ur' ? 'Urdu (اردو)' : 'English'}
- Rules:
  1. Return ONLY the direct translated spoken text.
  2. Do not add quotes, notes, apologies, or markdown.
  3. Preserve conversational tone, honorifics (e.g. 'Aap', 'Janab' in Urdu), and technical meeting terms.
  4. Ensure natural colloquial phrasing rather than rigid literal word-for-word translation.`;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.translationModel,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[OpenAI Translation Error ${response.status}]: ${errText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const translatedText = data.choices[0]?.message?.content?.trim() || '';
    const latencyMs = Date.now() - start;

    return {
      originalText: text,
      translatedText,
      sourceLanguage: from,
      targetLanguage: to,
      latencyMs,
    };
  }

  // --- TTS: OpenAI (Note: Unsupported for natural Urdu) ---
  async synthesize(
    text: string,
    language: SupportedLanguage,
    options?: TTSOptions
  ): Promise<TTSResult> {
    if (language === 'ur') {
      throw new Error(
        '[OpenAIAdapter] OpenAI TTS-1 does NOT officially support native Urdu pronunciation (generates heavy Arabic or unnatural accents). Use Azure Neural or Edge-TTS adapter for Urdu voice synthesis.'
      );
    }

    if (!this.apiKey) {
      throw new Error('[OpenAIAdapter] Missing OPENAI_API_KEY');
    }

    const start = Date.now();
    const voice = options?.voiceName || (options?.gender === 'male' ? 'onyx' : 'nova');

    const response = await fetch(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice,
        input: text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[OpenAI TTS Error ${response.status}]: ${errText}`);
    }

    const arrayBuf = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuf);
    const latencyMs = Date.now() - start;

    return {
      audioBuffer,
      mimeType: 'audio/mpeg',
      durationMs: 0,
      latencyMs,
    };
  }

  isLanguageSupported(language: SupportedLanguage): boolean {
    return language === 'en' || language === 'ur';
  }

  isLanguagePairSupported(from: SupportedLanguage, to: SupportedLanguage): boolean {
    return (from === 'en' && to === 'ur') || (from === 'ur' && to === 'en');
  }
}
