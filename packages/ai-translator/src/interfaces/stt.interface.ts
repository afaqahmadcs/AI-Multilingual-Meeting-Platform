import { SupportedLanguage } from '@linguameet/types';

export interface AudioInput {
  buffer: Buffer;
  mimeType: string;
  languageHint?: SupportedLanguage;
}

export interface STTResult {
  text: string;
  detectedLanguage: SupportedLanguage;
  confidence: number;
  durationMs: number;
  latencyMs: number;
}

export interface ISTTProvider {
  readonly providerName: string;
  transcribe(input: AudioInput): Promise<STTResult>;
  isLanguageSupported(language: SupportedLanguage): boolean;
}
