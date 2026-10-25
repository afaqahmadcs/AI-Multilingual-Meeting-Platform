import { SupportedLanguage } from '@linguameet/types';
import { AudioInput, STTResult } from './stt.interface.js';
import { TranslationResult } from './translation.interface.js';
import { TTSResult, TTSOptions } from './tts.interface.js';

export interface FullPipelineResult {
  stt: STTResult;
  translation: TranslationResult;
  tts?: TTSResult;
  totalLatencyMs: number;
}

export interface ITranslationPipeline {
  processSpeechToSpeech(
    audio: AudioInput,
    targetLanguage: SupportedLanguage,
    ttsOptions?: TTSOptions
  ): Promise<FullPipelineResult>;

  processSpeechToSubtitle(
    audio: AudioInput,
    targetLanguage: SupportedLanguage
  ): Promise<Omit<FullPipelineResult, 'tts'>>;
}
