import { NextResponse } from 'next/server';
import { processTranslationRequest } from '@/lib/translation-service';
import { SupportedLanguage } from '@linguameet/types';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let consentGranted = false;
    let sourceLanguage: SupportedLanguage = 'en';
    let targetLanguage: SupportedLanguage = 'ur';
    let speakerId = '';
    let speakerName = '';
    let meetingId = '';
    let audioBuffer: Buffer | null = null;
    let audioMimeType = 'audio/webm';
    let rawText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      consentGranted = formData.get('consentGranted') === 'true';
      sourceLanguage = (formData.get('sourceLanguage') as SupportedLanguage) || 'en';
      targetLanguage = (formData.get('targetLanguage') as SupportedLanguage) || 'ur';
      speakerId = (formData.get('speakerId') as string) || 'unknown_speaker';
      speakerName = (formData.get('speakerName') as string) || 'Speaker';
      meetingId = (formData.get('meetingId') as string) || 'default_room';
      rawText = (formData.get('text') as string) || '';

      const audioFile = formData.get('audio') as File | null;
      if (audioFile) {
        const arrayBuf = await audioFile.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuf);
        audioMimeType = audioFile.type || 'audio/webm';
      }
    } else {
      const json = await request.json().catch(() => ({}));
      consentGranted = Boolean(json.consentGranted);
      sourceLanguage = json.sourceLanguage || 'en';
      targetLanguage = json.targetLanguage || 'ur';
      speakerId = json.speakerId || 'unknown_speaker';
      speakerName = json.speakerName || 'Speaker';
      meetingId = json.meetingId || 'default_room';
      rawText = json.text || '';
      if (json.audioBase64) {
        audioBuffer = Buffer.from(json.audioBase64, 'base64');
        audioMimeType = json.mimeType || 'audio/webm';
      }
    }

    const result = await processTranslationRequest({
      consentGranted,
      sourceLanguage,
      targetLanguage,
      speakerId,
      speakerName,
      meetingId,
      rawText,
      audioBuffer,
      audioMimeType,
    });

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || 'Meeting translation pipeline error',
        originalAudioPreserved: true,
      },
      { status: 500 }
    );
  }
}
