import { SupportedLanguage } from '@linguameet/types';

export interface TTSOptions {
  gender?: 'male' | 'female';
  voiceName?: string;
  speed?: number; // 1.0 = normal
}

export interface TTSResult {
  audioBuffer: Buffer;
  mimeType: string;
  durationMs: number;
  latencyMs: number;
}

export interface ITTSProvider {
  readonly providerName: string;
  synthesize(
    text: string,
    language: SupportedLanguage,
    options?: TTSOptions
  ): Promise<TTSResult>;
  isLanguageSupported(language: SupportedLanguage): boolean;
}
