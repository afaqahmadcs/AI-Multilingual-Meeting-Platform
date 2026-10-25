import { SupportedLanguage } from '@linguameet/types';
import { ISTTProvider, AudioInput } from './interfaces/stt.interface.js';
import { ITranslationProvider } from './interfaces/translation.interface.js';
import { ITTSProvider, TTSOptions } from './interfaces/tts.interface.js';
import {
  ITranslationPipeline,
  FullPipelineResult,
} from './interfaces/pipeline.interface.js';

export interface PipelineConfig {
  stt: ISTTProvider;
  translation: ITranslationProvider;
  tts: ITTSProvider;
}

export class TranslationPipeline implements ITranslationPipeline {
  private stt: ISTTProvider;
  private translation: ITranslationProvider;
  private tts: ITTSProvider;

  constructor(config: PipelineConfig) {
    this.stt = config.stt;
    this.translation = config.translation;
    this.tts = config.tts;
  }

  async processSpeechToSpeech(
    audio: AudioInput,
    targetLanguage: SupportedLanguage,
    ttsOptions?: TTSOptions
  ): Promise<FullPipelineResult> {
    const pipelineStart = Date.now();

    // 1. STT (Speech to Text)
    const sttResult = await this.stt.transcribe(audio);

    // If no speech detected, short-circuit
    if (!sttResult.text || sttResult.text.trim().length === 0) {
      return {
        stt: sttResult,
        translation: {
          originalText: '',
          translatedText: '',
          sourceLanguage: sttResult.detectedLanguage,
          targetLanguage,
          latencyMs: 0,
        },
        totalLatencyMs: Date.now() - pipelineStart,
      };
    }

    // 2. MT (Machine Translation)
    const translationResult = await this.translation.translate(
      sttResult.text,
      sttResult.detectedLanguage,
      targetLanguage
    );

    // 3. TTS (Text to Speech in target language)
    let ttsResult;
    if (this.tts.isLanguageSupported(targetLanguage)) {
      ttsResult = await this.tts.synthesize(
        translationResult.translatedText,
        targetLanguage,
        ttsOptions
      );
    }

    const totalLatencyMs = Date.now() - pipelineStart;

    return {
      stt: sttResult,
      translation: translationResult,
      tts: ttsResult,
      totalLatencyMs,
    };
  }

  async processSpeechToSubtitle(
    audio: AudioInput,
    targetLanguage: SupportedLanguage
  ): Promise<Omit<FullPipelineResult, 'tts'>> {
    const pipelineStart = Date.now();

    const sttResult = await this.stt.transcribe(audio);

    if (!sttResult.text || sttResult.text.trim().length === 0) {
      return {
        stt: sttResult,
        translation: {
          originalText: '',
          translatedText: '',
          sourceLanguage: sttResult.detectedLanguage,
          targetLanguage,
          latencyMs: 0,
        },
        totalLatencyMs: Date.now() - pipelineStart,
      };
    }

    const translationResult = await this.translation.translate(
      sttResult.text,
      sttResult.detectedLanguage,
      targetLanguage
    );

    return {
      stt: sttResult,
      translation: translationResult,
      totalLatencyMs: Date.now() - pipelineStart,
    };
  }
}
