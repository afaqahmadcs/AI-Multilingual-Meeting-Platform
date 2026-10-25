                                                                                                                                                                                                                                                                                                                                                                                                                                    import { SupportedLanguage } from '@linguameet/types';
import { ISTTProvider, AudioInput, STTResult } from '../interfaces/stt.interface.js';
import { ITranslationProvider, TranslationResult } from '../interfaces/translation.interface.js';
import { ITTSProvider, TTSResult, TTSOptions } from '../interfaces/tts.interface.js';

export interface AzureOptions {
  subscriptionKey?: string;
  region?: string;
}

export class AzureAdapter implements ISTTProvider, ITranslationProvider, ITTSProvider {
  readonly providerName = 'Microsoft-Azure';
  private key: string;
  private region: string;

  constructor(options?: AzureOptions) {
    this.key = options?.subscriptionKey || process.env.AZURE_SPEECH_KEY || '';
    this.region = options?.region || process.env.AZURE_SPEECH_REGION || 'eastus';
  }

  // --- STT: Azure Cognitive Speech REST API ---
  async transcribe(input: AudioInput): Promise<STTResult> {
    if (!this.key) {
      throw new Error('[AzureAdapter] Missing AZURE_SPEECH_KEY');
    }

    const start = Date.now();
    const langCode = input.languageHint === 'ur' ? 'ur-PK' : 'en-US';
    const endpoint = `https://${this.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${langCode}&format=detailed`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.key,
        'Content-Type': input.mimeType || 'audio/wav; codecs=audio/pcm; samplerate=16000',
        Accept: 'application/json',
      },
      body: new Uint8Array(input.buffer),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[Azure STT Error ${response.status}]: ${errText}`);
    }

    const data = (await response.json()) as {
      RecognitionStatus: string;
      DisplayText?: string;
      Duration?: number;
    };

    if (data.RecognitionStatus !== 'Success') {
      return {
        text: '',
        detectedLanguage: input.languageHint || 'en',
        confidence: 0,
        durationMs: 0,
        latencyMs: Date.now() - start,
      };
    }

    return {
      text: data.DisplayText || '',
      detectedLanguage: input.languageHint || 'en',
      confidence: 0.98,
      durationMs: data.Duration ? Math.round(data.Duration / 10000) : 0,
      latencyMs: Date.now() - start,
    };
  }

  // --- MT: Azure Translator Text API ---
  async translate(
    text: string,
    from: SupportedLanguage,
    to: SupportedLanguage
  ): Promise<TranslationResult> {
    if (!this.key) {
      throw new Error('[AzureAdapter] Missing AZURE_SPEECH_KEY');
    }

    const start = Date.now();
    const endpoint = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${from}&to=${to}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.key,
        'Ocp-Apim-Subscription-Region': this.region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ Text: text }]),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[Azure Translation Error ${response.status}]: ${errText}`);
    }

    const data = (await response.json()) as Array<{
      translations: Array<{ text: string; to: string }>;
    }>;

    const translatedText = data[0]?.translations[0]?.text || '';

    return {
      originalText: text,
      translatedText,
      sourceLanguage: from,
      targetLanguage: to,
      latencyMs: Date.now() - start,
    };
  }

  // --- TTS: Azure Neural Urdu & English Voices ---
  async synthesize(
    text: string,
    language: SupportedLanguage,
    options?: TTSOptions
  ): Promise<TTSResult> {
    if (!this.key) {
      throw new Error('[AzureAdapter] Missing AZURE_SPEECH_KEY');
    }

    const start = Date.now();
    let voiceName = options?.voiceName;

    if (!voiceName) {
      if (language === 'ur') {
        // Industry standard neural Urdu voices
        voiceName = options?.gender === 'male' ? 'ur-PK-AsadNeural' : 'ur-PK-UzmaNeural';
      } else {
        voiceName = options?.gender === 'male' ? 'en-US-GuyNeural' : 'en-US-JennyNeural';
      }
    }

    const ssml = `
<speak version='1.0' xml:lang='${language === 'ur' ? 'ur-PK' : 'en-US'}'>
  <voice xml:lang='${language === 'ur' ? 'ur-PK' : 'en-US'}' name='${voiceName}'>
    ${escapeXml(text)}
  </voice>
</speak>`.trim();

    const endpoint = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'User-Agent': 'LinguaMeet-Translator',
      },
      body: ssml,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[Azure TTS Error ${response.status}]: ${errText}`);
    }

    const arrayBuf = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuf);

    return {
      audioBuffer,
      mimeType: 'audio/mpeg',
      durationMs: 0,
      latencyMs: Date.now() - start,
    };
  }

  isLanguageSupported(language: SupportedLanguage): boolean {
    return language === 'en' || language === 'ur';
  }

  isLanguagePairSupported(from: SupportedLanguage, to: SupportedLanguage): boolean {
    return (from === 'en' && to === 'ur') || (from === 'ur' && to === 'en');
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
