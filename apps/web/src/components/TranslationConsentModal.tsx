'use client';

import React from 'react';
import { ShieldCheck, Lock, AlertCircle, Sparkles, X } from 'lucide-react';

interface TranslationConsentModalProps {
  isOpen: boolean;
  onConsent: (granted: boolean) => void;
  onClose: () => void;
}

export const TranslationConsentModal: React.FC<TranslationConsentModalProps> = ({
  isOpen,
  onConsent,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 bg-[#0F172A] border border-slate-700 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">AI Translation Consent</h3>
              <p className="text-xs text-slate-400">Privacy & Speech Processing Notice</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice Content */}
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>How AI Speech Translation Works</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              LinguaMeet processes your spoken audio in short in-memory chunks through
              an AI adapter to produce translated subtitles and voice in your partner&apos;s
              selected language (English ⇄ اردو).
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[10px]">
              Privacy & Data Guarantees
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Zero Permanent Audio Storage:</strong> Audio chunks are processed in-memory (RAM) and immediately discarded.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Separated Microphone Stream:</strong> Your original microphone track is never altered, preventing audio feedback loops.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Original Audio Preserved:</strong> If translation APIs experience delay or failure, your natural voice remains 100% audible.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Opt-out Anytime:</strong> You can revoke consent or mute translation at any moment during the call.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onConsent(false)}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Decline (Original Audio Only)
          </button>
          <button
            type="button"
            onClick={() => onConsent(true)}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            I Consent & Enable AI Translation
          </button>
        </div>
      </div>
    </div>
  );
};
