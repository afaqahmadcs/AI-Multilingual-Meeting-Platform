'use client';

import React, { useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  AlertTriangle,
  RotateCcw,
  Star,
  Check,
} from 'lucide-react';
import { SupportedLanguage } from '@linguameet/types';

export type TranslationStatus =
  | 'idle'
  | 'listening'
  | 'translating'
  | 'speaking'
  | 'rate_limited'
  | 'error';

export interface QualityReview {
  rating: number; // 1 to 5
  note: string;
  timestamp: number;
}

interface AudioSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  originalVolume: number; // 0.0 to 1.0
  translatedVolume: number; // 0.0 to 1.0
  autoDucking: boolean;
  userLanguage: SupportedLanguage;
  translationStatus: TranslationStatus;
  lastLatencyMs?: number;
  firstAudioLatencyMs?: number;
  errorMessage?: string | null;
  hasConsent: boolean;
  onUpdateOriginalVolume: (vol: number) => void;
  onUpdateTranslatedVolume: (vol: number) => void;
  onToggleAutoDucking: () => void;
  onRequestConsent: () => void;
  onLogQualityReview?: (review: QualityReview) => void;
}

export const AudioSettingsDrawer: React.FC<AudioSettingsDrawerProps> = ({
  isOpen,
  onClose,
  originalVolume,
  translatedVolume,
  autoDucking,
  userLanguage,
  translationStatus,
  lastLatencyMs,
  firstAudioLatencyMs,
  errorMessage,
  hasConsent,
  onUpdateOriginalVolume,
  onUpdateTranslatedVolume,
  onToggleAutoDucking,
  onRequestConsent,
  onLogQualityReview,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogQualityReview) {
      onLogQualityReview({
        rating,
        note: feedbackNote,
        timestamp: Date.now(),
      });
    }
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 3000);
    setFeedbackNote('');
  };

  const getStatusBadge = () => {
    switch (translationStatus) {
      case 'listening':
        return (
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Listening to Speech...
          </span>
        );
      case 'translating':
        return (
          <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            AI Translating...
          </span>
        );
      case 'speaking':
        return (
          <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
            <Volume2 className="w-3 h-3 text-sky-400" />
            Playing Translated Voice
          </span>
        );
      case 'rate_limited':
        return (
          <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Rate Limit / Backoff Active
          </span>
        );
      case 'error':
        return (
          <span className="text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Translation Error (Fallback active)
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            Idle / Standby
          </span>
        );
    }
  };

  return (
    <aside className="fixed top-0 right-0 w-80 sm:w-96 h-full z-50 bg-[#0F172A]/95 border-l border-slate-800 shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-sm text-slate-100">Audio & Translation Controls</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Translation Status Pill & Consent Status */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Live AI Status</span>
            {getStatusBadge()}
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">AI Speech Consent:</span>
            {hasConsent ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                ✓ Granted
              </span>
            ) : (
              <button
                type="button"
                onClick={onRequestConsent}
                className="text-xs text-indigo-400 hover:underline font-semibold"
              >
                Click to Grant Consent
              </button>
            )}
          </div>
        </div>

        {/* Error message banner if any */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice:</p>
              <p className="text-[11px] text-slate-300">{errorMessage}</p>
              <p className="text-[10px] text-emerald-400 mt-1">
                Original microphone audio remains completely active and uninterrupted.
              </p>
            </div>
          </div>
        )}

        {/* Dual Audio Volume Controls */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Independent Volume Mixers
          </h4>

          {/* 1. Original Speaker Audio */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-200 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                Original Speaker Audio
              </span>
              <span className="font-mono text-slate-400">
                {Math.round(originalVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={originalVolume}
              onChange={(e) => onUpdateOriginalVolume(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <p className="text-[10px] text-slate-500">
              Control loudness of peer&apos;s natural voice.
            </p>
          </div>

          {/* 2. Translated AI Speech Audio */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-emerald-500/30">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Translated AI Voice ({userLanguage === 'en' ? 'English' : 'اردو'})
              </span>
              <span className="font-mono text-emerald-400">
                {Math.round(translatedVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={translatedVolume}
              onChange={(e) => onUpdateTranslatedVolume(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <p className="text-[10px] text-slate-500">
              Played privately to your speakers. Never fed back to your mic.
            </p>
          </div>
        </div>

        {/* Audio Ducking Option */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              Smart Voice Ducking
            </span>
            <span className="text-[11px] text-slate-400 block leading-tight">
              Automatically lower original peer volume to 20% while the AI translated voice speaks.
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleAutoDucking}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 flex-shrink-0 ${
              autoDucking ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                autoDucking ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Latency Instrumentation Metrics */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Performance & Latency Budget
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">First-Audio Latency</span>
              <span className="font-mono font-bold text-slate-200">
                {firstAudioLatencyMs ? `${firstAudioLatencyMs}ms` : 'Awaiting speech'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Last Utterance Latency</span>
              <span className="font-mono font-bold text-indigo-300">
                {lastLatencyMs ? `${lastLatencyMs}ms` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Manual Quality Review (User Feedback & Accuracy Auditing) */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Manual Quality Review
            </h4>
            {reviewSubmitted && (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Logged!
              </span>
            )}
          </div>
          <form onSubmit={handleSubmitReview} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        s <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600 hover:text-slate-500'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Add observation (pronunciation, grammar, latency)..."
              rows={2}
              className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="w-full py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              Submit Quality Audit
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
};
