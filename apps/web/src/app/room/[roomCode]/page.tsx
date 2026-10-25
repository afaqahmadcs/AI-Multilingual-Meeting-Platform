'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { MeetingRoom } from '@/components/MeetingRoom';
import { SupportedLanguage } from '@linguameet/types';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Languages,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomCode as string) || '';

  // Pre-join state
  const [displayName, setDisplayName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>('en');
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  // LiveKit Connection data
  const [tokenData, setTokenData] = useState<{
    token: string;
    livekitUrl: string;
  } | null>(null);

  const [joinError, setJoinError] = useState<string | null>(null);

  // Default guest name
  useEffect(() => {
    const savedName = localStorage.getItem('linguameet_name');
    if (savedName) {
      setDisplayName(savedName);
    } else {
      setDisplayName(`Guest_${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!displayName.trim()) return;

    localStorage.setItem('linguameet_name', displayName.trim());
    setIsLoadingToken(true);

    try {
      const res = await fetch('/api/meetings/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          displayName: displayName.trim(),
          preferredLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Failed to authorize meeting access');
      }

      setTokenData({
        token: data.token,
        livekitUrl: data.livekitUrl,
      });
      setHasJoined(true);
    } catch (err: any) {
      console.error('Token authorization error:', err);
      setJoinError(err.message || 'Unable to join meeting');
    } finally {
      setIsLoadingToken(false);
    }
  };

  if (hasJoined && tokenData) {
    return (
      <MeetingRoom
        roomCode={roomCode}
        token={tokenData.token}
        livekitUrl={tokenData.livekitUrl}
        displayName={displayName}
        preferredLanguage={preferredLanguage}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col justify-between">
      <Header
        currentLang={preferredLanguage}
        onLanguageChange={setPreferredLanguage}
        showBackHome
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-700/60 shadow-2xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Room: {roomCode}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Ready to join the meeting?
            </h1>
            <p className="text-sm text-slate-400">
              Configure your name, language, and devices before entering.
            </p>
          </div>

          {/* Join Error Banner */}
          {joinError && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-3 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping flex-shrink-0" />
              <div className="flex-1 font-medium">{joinError}</div>
            </div>
          )}

          {/* Device & Camera Preview Tile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Camera Preview Simulator */}
            <div className="relative aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
              {isVideoEnabled ? (
                <div className="flex flex-col items-center gap-2 text-indigo-400">
                  <Video className="w-12 h-12 text-indigo-500 animate-pulse" />
                  <span className="text-xs text-slate-400">Camera Active</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <VideoOff className="w-12 h-12" />
                  <span className="text-xs">Camera Turned Off</span>
                </div>
              )}

              {/* Mic & Cam Quick Controls */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMicEnabled((m) => !m)}
                  className={`p-3 rounded-xl transition-all ${
                    isMicEnabled
                      ? 'bg-slate-800 text-white hover:bg-slate-700'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  }`}
                  title={isMicEnabled ? 'Mute' : 'Unmute'}
                >
                  {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsVideoEnabled((v) => !v)}
                  className={`p-3 rounded-xl transition-all ${
                    isVideoEnabled
                      ? 'bg-slate-800 text-white hover:bg-slate-700'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  }`}
                  title={isVideoEnabled ? 'Disable Camera' : 'Enable Camera'}
                >
                  {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Form Settings */}
            <form onSubmit={handleJoin} className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Your Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Afaq Ahmad"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Language Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Preferred Meeting Language</span>
                  <span className="text-[10px] text-emerald-400 font-normal">
                    AI translates into this language
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('en')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      preferredLanguage === 'en'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-xs font-bold">English</span>
                    <span className="text-[11px] text-slate-400">Translate to English</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredLanguage('ur')}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      preferredLanguage === 'ur'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white ring-1 ring-emerald-500'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-xs font-bold urdu-text leading-tight">اردو</span>
                    <span className="text-[11px] text-slate-400 urdu-text leading-tight">
                      اردو میں ترجمہ سنیں
                    </span>
                  </button>
                </div>
              </div>

              {/* Join Action */}
              <button
                type="submit"
                disabled={isLoadingToken || !displayName.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <span>{isLoadingToken ? 'Connecting...' : 'Join Meeting Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-500">
        LinguaMeet • Real-time Urdu ⇄ English Meeting Platform
      </footer>
    </div>
  );
}
