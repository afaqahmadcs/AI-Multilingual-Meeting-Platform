import { NextResponse } from 'next/server';
import {
  OpenAIAdapter,
  AzureAdapter,
  MockSTTProvider,
  MockTranslationProvider,
  MockTTSProvider,
} from '@linguameet/ai-translator';
import { SupportedLanguage } from '@linguameet/types';

export async function POST(request: Request) {
  const pipelineStart = Date.now();
  let sttLatencyMs = 0;
  let translationLatencyMs = 0;
  let ttsLatencyMs = 0;

  try {
    const contentType = request.headers.get('content-type') || '';
    let sourceText = '';
    let audioBuffer: Buffer | null = null;
    let audioMimeType = 'audio/wav';
    let from: SupportedLanguage = 'ur';
    let to: SupportedLanguage = 'en';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      from = (formData.get('from') as SupportedLanguage) || 'ur';
      to = (formData.get('to') as SupportedLanguage) || 'en';
      sourceText = (formData.get('text') as string) || '';

      const audioFile = formData.get('audio') as File | null;
      if (audioFile) {
        const arrayBuf = await audioFile.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuf);
        audioMimeType = audioFile.type || 'audio/webm';
      }
    } else {
      const json = await request.json().catch(() => ({}));
      from = json.from || 'ur';
      to = json.to || 'en';
      sourceText = json.text || '';
      if (json.audioBase64) {
        audioBuffer = Buffer.from(json.audioBase64, 'base64');
        audioMimeType = json.mimeType || 'audio/wav';
      }
    }

    // 1. Validate Language Pairs Honestly
    const validLangs: SupportedLanguage[] = ['ur', 'en'];
    if (!validLangs.includes(from) || !validLangs.includes(to)) {
      return NextResponse.json(
        {
          error: `Unsupported language pair: "${from}" -> "${to}". LinguaMeet Phase 1 strictly supports Urdu ('ur') and English ('en').`,
          isSupported: false,
        },
        { status: 400 }
      );
    }

    if (from === to) {
      return NextResponse.json(
        {
          error: `Source and target language cannot be the same (${from} -> ${to}). Choose either ur -> en or en -> ur.`,
          isSupported: false,
        },
        { status: 400 }
      );
    }

    // Provider Resolution
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

    const ttsProvider = hasAzure ? new AzureAdapter() : new MockTTSProvider();

    // 2. Speech-to-Text (STT) Step
    if (audioBuffer && audioBuffer.length > 0) {
      const sttStart = Date.now();
      try {
        const sttResult = await sttProvider.transcribe({
          buffer: audioBuffer,
          mimeType: audioMimeType,
          languageHint: from,
        });
        sourceText = sttResult.text;
        sttLatencyMs = sttResult.latencyMs || Date.now() - sttStart;
      } catch (sttErr: any) {
        return NextResponse.json(
          {
            error: `STT Failure (${sttProvider.providerName}): ${sttErr.message}`,
            stage: 'stt',
          },
          { status: 502 }
        );
      }
    }

    if (!sourceText || sourceText.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'No speech or text was detected. Please record clearly or enter text.',
          stage: 'input',
        },
        { status: 400 }
      );
    }

    // 3. Machine Translation (MT) Step with Fallback Requirement
    let translatedText = '';
    let fallbackTriggered = false;
    let translationWarning = '';
    const mtStart = Date.now();

    try {
      const transResult = await translationProvider.translate(sourceText, from, to);
      translatedText = transResult.translatedText;
      translationLatencyMs = transResult.latencyMs || Date.now() - mtStart;
    } catch (mtErr: any) {
      // Fallback requirement: On translation failure, preserve and show source transcript
      fallbackTriggered = true;
      translatedText = sourceText;
      translationWarning = `Translation failed (${translationProvider.providerName}): ${mtErr.message}. Fallback to source transcript displayed.`;
      translationLatencyMs = Date.now() - mtStart;
    }

    // 4. Text-to-Speech (TTS) Step
    let audioOutputBase64 = '';
    let audioOutputMime = 'audio/wav';
    const ttsStart = Date.now();

    try {
      const ttsResult = await ttsProvider.synthesize(translatedText, to, {
        gender: 'female',
      });
      audioOutputBase64 = ttsResult.audioBuffer.toString('base64');
      audioOutputMime = ttsResult.mimeType;
      ttsLatencyMs = ttsResult.latencyMs || Date.now() - ttsStart;
    } catch (ttsErr: any) {
      console.warn('[PoC TTS Warning]:', ttsErr.message);
      // TTS warning does not fail the whole request
    }

    const totalLatencyMs = Date.now() - pipelineStart;

    return NextResponse.json({
      success: true,
      from,
      to,
      sourceTranscript: sourceText,
      translatedTranscript: translatedText,
      fallbackTriggered,
      warning: translationWarning || undefined,
      audioBase64: audioOutputBase64 || undefined,
      audioMime: audioOutputMime,
      latency: {
        sttMs: sttLatencyMs,
        translationMs: translationLatencyMs,
        ttsMs: ttsLatencyMs,
        totalMs: totalLatencyMs,
      },
      providers: {
        stt: sttProvider.providerName,
        translation: translationProvider.providerName,
        tts: ttsProvider.providerName,
      },
      pipelineMode: 'chunked_prototype', // Clearly labelled prototype
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Pipeline processing failed', stage: 'unknown' },
      { status: 500 }
    );
  }
}
