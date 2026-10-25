'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import {
  Video,
  PlusCircle,
  LogIn,
  Languages,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Copy,
  Check,
  Volume2,
} from 'lucide-react';
import { SupportedLanguage } from '@linguameet/types';

export default function HomePage() {
  const router = useRouter();
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const [roomInput, setRoomInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{
    roomCode: string;
    joinUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Playground state
  const [sampleText, setSampleText] = useState(
    'Assalam-o-Alaikum! Welcome to our multilingual video conference.'
  );
  const [translatedSample, setTranslatedSample] = useState(
    'السلام علیکم! ہماری کثیر لسانی ویڈیو کانفرنس میں خوش آمدید۔'
  );
  const [isTranslating, setIsTranslating] = useState(false);

  const handleCreateMeeting = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/meetings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'LinguaMeet Instant Session' }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedRoom({ roomCode: data.roomCode, joinUrl: data.joinUrl });
      }
    } catch (err) {
      console.error('Failed to create meeting:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;

    let cleanCode = roomInput.trim();
    if (cleanCode.includes('/room/')) {
      cleanCode = cleanCode.split('/room/')[1].split('?')[0];
    }
    router.push(`/room/${cleanCode}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestTranslation = async () => {
    setIsTranslating(true);
    try {
      const source = lang === 'en' ? 'en' : 'ur';
      const target = lang === 'en' ? 'ur' : 'en';
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          from: source,
          to: target,
          synthesizeAudio: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTranslatedSample(data.translatedText);
      }
    } catch (err) {
      console.error('Translation playground error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col">
      <Header currentLang={lang} onLanguageChange={setLang} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: CTA & Join */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Real-Time AI Voice & Subtitle Translation</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Break language barriers in{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
                  English & اردو
                </span>{' '}
                meetings.
              </h1>
              <p className="text-lg text-slate-300 max-w-xl font-normal leading-relaxed">
                Connect globally with zero latency. Speak naturally in English or Urdu while
                AI translates your voice, generates dual-language subtitles, and coordinates video
                and screen sharing.
              </p>
            </div>

            {/* Action Cards */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  id="btn-create-meeting"
                  onClick={handleCreateMeeting}
                  disabled={isCreating}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>{isCreating ? 'Creating Room...' : 'New Meeting'}</span>
                </button>

                <form onSubmit={handleJoinMeeting} className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="input-room-code"
                      placeholder="Enter room code or link..."
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value)}
                      className="w-full h-full px-4 py-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    id="btn-join-meeting"
                    disabled={!roomInput.trim()}
                    className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium border border-slate-700 text-sm flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Join</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Created Room Modal Card */}
              {createdRoom && (
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 glass-panel space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Room Ready
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Code: {createdRoom.roomCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdRoom.joinUrl}
                      className="flex-1 px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdRoom.joinUrl)}
                      className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/room/${createdRoom.roomCode}`)}
                      className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <span>Enter Room</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">LiveKit WebRTC</h4>
                  <p className="text-[11px] text-slate-400">Sub-second video latency</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Urdu ⇄ English</h4>
                  <p className="text-[11px] text-slate-400">Speech & Subtitles</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">End-to-End Secure</h4>
                  <p className="text-[11px] text-slate-400">Supabase & JWT Guarded</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Translation Interactive Card */}
          <div className="lg:col-span-5">
            <div className="glass-panel rounded-2xl p-6 border border-slate-700/60 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">
                    Live Translation Preview
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                  PoC Active
                </span>
              </div>

              {/* Input Spoken Text */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 flex items-center justify-between mb-1.5">
                    <span>Source (English Input)</span>
                    <span className="text-[10px] text-indigo-400">Spoken Speech</span>
                  </label>
                  <textarea
                    rows={2}
                    value={sampleText}
                    onChange={(e) => setSampleText(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                  />
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleTestTranslation}
                    disabled={isTranslating}
                    className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-indigo-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isTranslating ? 'Translating...' : 'Translate Live'}</span>
                  </button>
                </div>

                {/* Translated Output in Urdu Nastaliq */}
                <div>
                  <label className="text-xs font-medium text-slate-400 flex items-center justify-between mb-1.5">
                    <span>Target Output (اردو Nastaliq)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Neural Voice & Text</span>
                  </label>
                  <div className="w-full p-3.5 bg-slate-900/90 border border-slate-700 rounded-xl text-emerald-300 urdu-text text-base select-text min-h-[70px]">
                    {translatedSample}
                  </div>
                </div>

                {/* Architecture Pipeline Flow Diagram */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Realtime Audio Pipeline:</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 px-1 pt-1">
                    <span className="text-indigo-300">1. Whisper STT</span>
                    <span>→</span>
                    <span className="text-emerald-300">2. GPT-4o-mini MT</span>
                    <span>→</span>
                    <span className="text-sky-300">3. Azure Neural TTS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0B0F19] py-6 text-center text-xs text-slate-500">
        <p>
          LinguaMeet Platform • Built with Next.js, LiveKit SFU, React Native Expo, and Replaceable AI
          Adapters.
        </p>
      </footer>
    </div>
  );
}
