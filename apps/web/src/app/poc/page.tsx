'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Mic,
  Square,
  Volume2,
  Languages,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRightLeft,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { SupportedLanguage } from '@linguameet/types';

interface PipelineResponse {
  success: boolean;
  from: SupportedLanguage;
  to: SupportedLanguage;
  sourceTranscript: string;
  translatedTranscript: string;
  fallbackTriggered: boolean;
  warning?: string;
  error?: string;
  audioBase64?: string;
  audioMime?: string;
  latency: {
    sttMs: number;
    translationMs: number;
    ttsMs: number;
    totalMs: number;
  };
  providers: {
    stt: string;
    translation: string;
    tts: string;
  };
  pipelineMode: string;
}

export default function PoCWorkbenchPage() {
  // Direction toggle
  const [direction, setDirection] = useState<'ur-to-en' | 'en-to-ur'>('ur-to-en');

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual text & Preset state
  const [manualText, setManualText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Audio Playback
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const fromLang: SupportedLanguage = direction === 'ur-to-en' ? 'ur' : 'en';
  const toLang: SupportedLanguage = direction === 'ur-to-en' ? 'en' : 'ur';

  // Preset quick-test phrases
  const presets = {
    'ur-to-en': [
      { label: 'Name & Tech', text: 'آفاق احمد نے نئی گٹ ریپوزٹری بنا دی ہے۔' },
      { label: 'Price & Discount', text: 'اس سرور کا ماہانہ خرچ پانچ ہزار روپے ہے۔' },
      { label: 'Date & Time', text: 'اگلی اسپرنٹ میٹنگ پچیس اکتوبر بروز اتوار کو ہوگی۔' },
      { label: 'Urdish / Mixed', text: 'پلیز اپنی اسکرین شیئر کر دیں، مجھے کوڈ دیکھنا ہے۔' },
    ],
    'en-to-ur': [
      { label: 'Name & Architecture', text: 'Afaq will present the architectural diagram to the engineering team.' },
      { label: 'Price & Cloud', text: 'The total cloud infrastructure cost is ninety-nine dollars per month.' },
      { label: 'Date & Deadline', text: 'The product release is scheduled for November 15th.' },
      { label: 'Meeting Etiquette', text: 'Could everyone please mute their microphones while others are speaking?' },
    ],
  };

  // Timer effect for recording
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // 1. Start Microphone Recording
  const startRecording = async () => {
    setErrorBanner(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        // Stop audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
        await processAudioPayload(audioBlob);
      };

      mediaRecorder.start(250); // 250ms chunks
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setErrorBanner(
        `Microphone Error: ${err.message || 'Permission denied. You can still test using preset phrases below.'}`
      );
    }
  };

  // 2. Stop Microphone Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 3. Send Audio Blob to Server Pipeline
  const processAudioPayload = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setErrorBanner(null);
    setResult(null);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('from', fromLang);
    formData.append('to', toLang);

    try {
      const res = await fetch('/api/poc/pipeline', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server pipeline error');
      }

      setResult(data);
      if (data.audioBase64) {
        setupAudioPlayer(data.audioBase64, data.audioMime || 'audio/wav');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Test with Text Input / Preset Phrase
  const processTextPayload = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    setIsProcessing(true);
    setErrorBanner(null);
    setResult(null);

    try {
      const res = await fetch('/api/poc/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToProcess.trim(),
          from: fromLang,
          to: toLang,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server pipeline error');
      }

      setResult(data);
      if (data.audioBase64) {
        setupAudioPlayer(data.audioBase64, data.audioMime || 'audio/wav');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to process translation');
    } finally {
      setIsProcessing(false);
    }
  };

  const setupAudioPlayer = (base64: string, mime: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
  };

  const playSynthesizedAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.play();
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              ← Back to LinguaMeet
            </Link>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Phase 1 PoC</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Chunked Prototype
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Isolated Speech Translation Testbed
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Banner Alert if any */}
        {errorBanner && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">{errorBanner}</div>
          </div>
        )}

        {/* Direction Switcher Card */}
        <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Translation Direction
            </span>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {direction === 'ur-to-en' ? (
                <>
                  <span className="text-emerald-400 urdu-text leading-tight text-xl">
                    اردو (Urdu)
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="text-indigo-400 font-sans">English</span>
                </>
              ) : (
                <>
                  <span className="text-indigo-400 font-sans">English</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="text-emerald-400 urdu-text leading-tight text-xl">
                    اردو (Urdu)
                  </span>
                </>
              )}
            </h2>
          </div>

          <button
            type="button"
            id="btn-toggle-direction"
            onClick={() => {
              setDirection((d) => (d === 'ur-to-en' ? 'en-to-ur' : 'ur-to-en'));
              setResult(null);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-2 transition-all shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
            <span>Switch Direction</span>
          </button>
        </div>

        {/* Audio Recording & Input Workbench */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Microphone Control */}
          <div className="md:col-span-5 glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col items-center justify-center text-center space-y-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Microphone Input</h3>
              <p className="text-xs text-slate-400">
                Speak in {fromLang === 'ur' ? 'Urdu (اردو)' : 'English'}
              </p>
            </div>

            {/* Mic Button */}
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
              )}
              <button
                type="button"
                id="btn-record-mic"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-xl ${
                  isRecording
                    ? 'bg-red-600 text-white shadow-red-600/40 ring-4 ring-red-500/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-105'
                } disabled:opacity-50`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-7 h-7 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Stop
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-7 h-7 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Record
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Recording Timer / Status */}
            <div className="min-h-[24px]">
              {isRecording ? (
                <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Recording: {recordingSeconds}s
                </span>
              ) : isProcessing ? (
                <span className="text-xs text-indigo-400 font-mono flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Running STT ➔ MT ➔ TTS...
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">
                  Click Record, speak a sentence, then click Stop.
                </span>
              )}
            </div>

            {/* Audio Mode Disclaimer */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 font-mono w-full">
              Mode: <strong>MediaRecorder WebM Chunk</strong>
            </div>
          </div>

          {/* Right Column: Preset Sentences & Manual Test */}
          <div className="md:col-span-7 glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Quick Benchmark Sentences
                </h3>
                <span className="text-[10px] text-indigo-400">1-Click Test</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presets[direction].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setManualText(p.text);
                      processTextPayload(p.text);
                    }}
                    disabled={isProcessing || isRecording}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left transition-all hover:border-indigo-500/50 disabled:opacity-40"
                  >
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase mb-0.5">
                      {p.label}
                    </span>
                    <span
                      className={`text-xs text-slate-300 line-clamp-1 ${
                        fromLang === 'ur' ? 'urdu-text text-sm' : ''
                      }`}
                    >
                      {p.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Text Fallback Input */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Or Enter Custom Text</span>
                <span className="text-[10px] text-slate-500">
                  {fromLang === 'ur' ? 'اردو لکھیں' : 'English Text'}
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={
                    fromLang === 'ur'
                      ? 'یہاں جملہ لکھیں یا پیسٹ کریں...'
                      : 'Type or paste a test sentence here...'
                  }
                  className={`flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    fromLang === 'ur' ? 'urdu-text text-sm' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => processTextPayload(manualText)}
                  disabled={isProcessing || !manualText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors disabled:opacity-40"
                >
                  Run
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results & Latency Dashboard */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Fallback Warning if translation failed */}
            {result.fallbackTriggered && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <strong>Fallback Triggered:</strong> {result.warning}
                </div>
              </div>
            )}

            {/* Transcripts Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Transcript */}
              <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                    Source Transcript ({result.from.toUpperCase()})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Provider: {result.providers.stt}
                  </span>
                </div>
                <p
                  className={`text-sm text-slate-200 min-h-[50px] p-2 rounded-lg bg-slate-900/60 ${
                    result.from === 'ur' ? 'urdu-text text-base' : 'font-sans'
                  }`}
                >
                  {result.sourceTranscript}
                </p>
              </div>

              {/* Translated Transcript */}
              <div className="glass-panel rounded-2xl p-5 border border-indigo-500/30 bg-indigo-950/20 space-y-2">
                <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Translated Transcript ({result.to.toUpperCase()})
                  </span>
                  <span className="text-[10px] text-indigo-300 font-mono">
                    Provider: {result.providers.translation}
                  </span>
                </div>
                <p
                  className={`text-sm font-medium min-h-[50px] p-2 rounded-lg bg-slate-900/60 ${
                    result.to === 'ur'
                      ? 'urdu-text text-base text-emerald-300'
                      : 'font-sans text-indigo-200'
                  }`}
                >
                  {result.translatedTranscript}
                </p>
              </div>
            </div>

            {/* Generated Speech Playback */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Generated Speech Playback ({result.to === 'ur' ? 'Urdu Voice' : 'English Voice'})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Synthesized with {result.providers.tts}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {audioUrl ? (
                  <>
                    <audio ref={audioPlayerRef} src={audioUrl} autoPlay />
                    <button
                      type="button"
                      id="btn-play-audio"
                      onClick={playSynthesizedAudio}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/30"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Replay Audio</span>
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">
                    Audio unavailable for this output
                  </span>
                )}
              </div>
            </div>

            {/* Latency Measurement Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  1. STT Latency
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  {result.latency.sttMs}ms
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  2. Translation Latency
                </span>
                <span className="text-lg font-bold text-indigo-400 font-mono">
                  {result.latency.translationMs}ms
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  3. TTS Latency
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {result.latency.ttsMs}ms
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                <span className="text-[10px] text-indigo-300 uppercase font-semibold block">
                  Total End-to-End
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  {result.latency.totalMs}ms
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        LinguaMeet Phase 1 PoC • Separate STT, MT, and TTS Provider Interfaces • Tested with 100 Sentences
      </footer>
    </div>
  );
}
