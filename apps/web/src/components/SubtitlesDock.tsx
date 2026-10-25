'use client';

import React from 'react';
import { CaptionFrame } from '@linguameet/types';
import { Languages, Volume2, X } from 'lucide-react';

interface SubtitlesDockProps {
  caption: CaptionFrame | null;
  onClose?: () => void;
  isAudioTranslationActive?: boolean;
}

export const SubtitlesDock: React.FC<SubtitlesDockProps> = ({
  caption,
  onClose,
  isAudioTranslationActive,
}) => {
  if (!caption) return null;

  const isUrduTarget = caption.targetLanguage === 'ur';

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-3xl animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="glass-panel rounded-2xl p-4 shadow-2xl border border-indigo-500/30 bg-[#0F172A]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">{caption.speakerName}</span>
            <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800">
              {caption.sourceLanguage} → {caption.targetLanguage}
            </span>
            {isAudioTranslationActive && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <Volume2 className="w-3 h-3" /> Audio Active
              </span>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dual Language Captions Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Original Speech */}
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="block text-[10px] text-slate-400 uppercase font-medium mb-1">
              Original ({caption.sourceLanguage === 'ur' ? 'اردو' : 'English'})
            </span>
            <p
              className={`text-sm text-slate-200 ${
                caption.sourceLanguage === 'ur' ? 'urdu-text text-base' : 'ltr-text'
              }`}
            >
              {caption.originalText}
            </p>
          </div>

          {/* Translated Speech */}
          <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
            <span className="block text-[10px] text-indigo-400 uppercase font-medium mb-1">
              Translated ({caption.targetLanguage === 'ur' ? 'اردو' : 'English'})
            </span>
            <p
              className={`text-sm font-medium ${
                isUrduTarget
                  ? 'urdu-text text-base text-emerald-300'
                  : 'ltr-text text-indigo-200'
              }`}
            >
              {caption.translatedText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
