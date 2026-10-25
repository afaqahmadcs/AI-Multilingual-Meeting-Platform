import {
  OpenAIAdapter,
  AzureAdapter,
  MockSTTProvider,
  MockTranslationProvider,
  MockTTSProvider,
} from '@linguameet/ai-translator';
import type { SupportedLanguage, CaptionFrame, AudioTranslationPayload } from '@linguameet/types';

export interface TranslationServiceInput {
  consentGranted: boolean;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  speakerId: string;
  speakerName?: string;
  meetingId?: string;
  rawText?: string;
  audioBuffer?: Buffer | null;
  audioMimeType?: string;
}

export interface TranslationServiceOutput {
  status: number;
  data: {
    success?: boolean;
    error?: string;
    consentRequired?: boolean;
    isSupported?: boolean;
    originalAudioPreserved?: boolean;
    stage?: string;
    caption?: CaptionFrame;
    audioPayload?: AudioTranslationPayload;
    fallbackTriggered?: boolean;
    warning?: string;
    metrics?: {
      sttLatencyMs: number;
      translationLatencyMs: number;
      ttsLatencyMs: number;
      totalLatencyMs: number;
      provider: {
        stt: string;
        translation: string;
        tts: string;
      };
    };
  };
}

export async function processTranslationRequest(
  input: TranslationServiceInput
): Promise<TranslationServiceOutput> {
  const start = Date.now();
  let sttLatencyMs = 0;
  let translationLatencyMs = 0;
  let ttsLatencyMs = 0;

  const {
    consentGranted,
    sourceLanguage,
    targetLanguage,
    speakerId = 'unknown_speaker',
    speakerName = 'Speaker',
    meetingId = 'default_room',
    rawText = '',
    audioBuffer = null,
    audioMimeType = 'audio/webm',
  } = input;

  // 1. Mandatory Participant Consent Check
  if (!consentGranted) {
    return {
      status: 403,
      data: {
        error:
          'Consent required: Audio cannot be processed with AI services without explicit participant consent.',
        consentRequired: true,
      },
    };
  }

  // 2. Strict Validated Language Pair Check (Phase 1 validated: ur <-> en ONLY)
  const validPairs = [
    { from: 'ur', to: 'en' },
    { from: 'en', to: 'ur' },
  ];
  const isPairAllowed = validPairs.some(
    (p) => p.from === sourceLanguage && p.to === targetLanguage
  );

  if (!isPairAllowed) {
    return {
      status: 400,
      data: {
        error: `Unsupported language pair: "${sourceLanguage}" -> "${targetLanguage}". Only validated pairs (Urdu <-> English) are permitted.`,
        isSupported: false,
      },
    };
  }

  // 3. Provider Resolution (Server-side keys strictly isolated)
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasAzure = Boolean(process.env.AZURE_SPEECH_KEY);

  const sttProvider = hasOpenAI
    ? new OpenAIAdapter()
    : hasAzure
    ? new AzureAdapter()
    : new MockSTTProvider();

  const translationProvider = hasOpenAI
    ? new OpenAIAdapter()
    : hasAzure
    ? new AzureAdapter()
    : new MockTranslationProvider();

  // OpenAI TTS rejected for Urdu voice: enforce Azure or Mock
  const ttsProvider = hasAzure ? new AzureAdapter() : new MockTTSProvider();

  // 4. Speech to Text (if audio chunk is provided)
  let transcriptText = rawText;
  if (audioBuffer && audioBuffer.length > 0) {
    const sttStart = Date.now();
    try {
      const sttResult = await sttProvider.transcribe({
        buffer: audioBuffer,
        mimeType: audioMimeType,
        languageHint: sourceLanguage,
      });
      transcriptText = sttResult.text;
      sttLatencyMs = sttResult.latencyMs || Date.now() - sttStart;
    } catch (sttErr: any) {
      return {
        status: 502,
        data: {
          error: `STT Failure: ${sttErr.message}`,
          originalAudioPreserved: true,
          stage: 'stt',
        },
      };
    }
  }

  if (!transcriptText || transcriptText.trim().length === 0) {
    return {
      status: 400,
      data: {
        error: 'No intelligible speech detected in audio slice.',
        originalAudioPreserved: true,
        stage: 'empty_input',
      },
    };
  }

  // 5. Machine Translation (with fallback requirement)
  let translatedText = '';
  let fallbackTriggered = false;
  let translationWarning = '';
  const mtStart = Date.now();

  try {
    const transResult = await translationProvider.translate(
      transcriptText,
      sourceLanguage,
      targetLanguage
    );
    translatedText = transResult.translatedText;
    translationLatencyMs = transResult.latencyMs || Date.now() - mtStart;
  } catch (mtErr: any) {
    // REQUIREMENT: Preserve access to original transcript/audio when translation fails
    fallbackTriggered = true;
    translatedText = transcriptText; // Fallback to original text
    translationWarning = `Translation failed (${translationProvider.providerName}): ${mtErr.message}. Original speech preserved.`;
    translationLatencyMs = Date.now() - mtStart;
  }

  // 6. Text to Speech Synthesis (Target Language Voice)
  let audioOutputBase64 = '';
  let audioOutputMime = 'audio/mpeg';
  const ttsStart = Date.now();

  try {
    const ttsResult = await ttsProvider.synthesize(translatedText, targetLanguage, {
      gender: 'female',
    });
    audioOutputBase64 = ttsResult.audioBuffer.toString('base64');
    audioOutputMime = ttsResult.mimeType;
    ttsLatencyMs = ttsResult.latencyMs || Date.now() - ttsStart;
  } catch (ttsErr: any) {
    console.warn('[Meeting Translation TTS Warning]:', ttsErr.message);
  }

  const totalLatencyMs = Date.now() - start;

  // Structured Caption Frame for broadcast over LiveKit Data Channel (lk.captions)
  const captionFrame: CaptionFrame = {
    id: `cap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    meetingId,
    speakerId,
    speakerName,
    originalText: transcriptText,
    translatedText,
    sourceLanguage,
    targetLanguage,
    isFinal: true,
    timestamp: Date.now(),
  };

  // Structured Audio Payload for targeted recipient playback (lk.tts_audio)
  const audioPayload: AudioTranslationPayload | undefined = audioOutputBase64
    ? {
        speakerId,
        targetLanguage,
        audioBase64: audioOutputBase64,
        mimeType: audioOutputMime,
        durationMs: ttsLatencyMs,
        timestamp: Date.now(),
      }
    : undefined;

  return {
    status: 200,
    data: {
      success: true,
      caption: captionFrame,
      audioPayload,
      fallbackTriggered,
      warning: translationWarning || undefined,
      metrics: {
        sttLatencyMs,
        translationLatencyMs,
        ttsLatencyMs,
        totalLatencyMs,
        provider: {
          stt: sttProvider.providerName,
          translation: translationProvider.providerName,
          tts: ttsProvider.providerName,
        },
      },
    },
  };
}
