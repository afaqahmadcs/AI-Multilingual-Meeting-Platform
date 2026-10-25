import { SupportedLanguage } from './user.js';

export interface CaptionFrame {
  id: string;
  meetingId: string;
  speakerId: string;
  speakerName: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  isFinal: boolean;
  timestamp: number;
}

export interface AudioTranslationPayload {
  speakerId: string;
  targetLanguage: SupportedLanguage;
  audioBase64: string;
  mimeType: string;
  durationMs: number;
  timestamp: number;
}

export interface TranslationMetrics {
  sttLatencyMs: number;
  translationLatencyMs: number;
  ttsLatencyMs: number;
  totalLatencyMs: number;
  provider: {
    stt: string;
    translation: string;
    tts: string;
  };
}
