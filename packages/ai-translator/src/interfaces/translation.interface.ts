import { SupportedLanguage } from '@linguameet/types';

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  latencyMs: number;
}

export interface ITranslationProvider {
  readonly providerName: string;
  translate(
    text: string,
    from: SupportedLanguage,
    to: SupportedLanguage
  ): Promise<TranslationResult>;
  isLanguagePairSupported(from: SupportedLanguage, to: SupportedLanguage): boolean;
}
