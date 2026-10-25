import { NextResponse } from 'next/server';
import {
  OpenAIAdapter,
  AzureAdapter,
  MockTranslationProvider,
  MockTTSProvider,
  TranslationPipeline,
  MockSTTProvider,
} from '@linguameet/ai-translator';
import { SupportedLanguage } from '@linguameet/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, from, to, synthesizeAudio } = body as {
      text: string;
      from: SupportedLanguage;
      to: SupportedLanguage;
      synthesizeAudio?: boolean;
    };

    if (!text || !from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: text, from, to' },
        { status: 400 }
      );
    }

    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const hasAzure = Boolean(process.env.AZURE_SPEECH_KEY);

    // Pick appropriate translation adapter
    const mtProvider = hasOpenAI
      ? new OpenAIAdapter()
      : hasAzure
      ? new AzureAdapter()
      : new MockTranslationProvider();

    // Pick appropriate TTS adapter (remember Urdu restriction)
    const ttsProvider = hasAzure ? new AzureAdapter() : new MockTTSProvider();

    const start = Date.now();
    const translationResult = await mtProvider.translate(text, from, to);

    let audioBase64: string | undefined;
    let mimeType: string | undefined;

    if (synthesizeAudio) {
      try {
        const ttsResult = await ttsProvider.synthesize(
          translationResult.translatedText,
          to,
          { gender: 'female' }
        );
        audioBase64 = ttsResult.audioBuffer.toString('base64');
        mimeType = ttsResult.mimeType;
      } catch (ttsErr: any) {
        console.warn('[Translate API] TTS synthesis warning:', ttsErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      originalText: text,
      translatedText: translationResult.translatedText,
      from,
      to,
      latencyMs: Date.now() - start,
      audioBase64,
      mimeType,
      provider: mtProvider.providerName,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Translation failed' },
      { status: 500 }
    );
  }
}
