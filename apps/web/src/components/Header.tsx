'use client';

import React from 'react';
import Link from 'next/link';
import { Video, Languages, Github } from 'lucide-react';
import { SupportedLanguage } from '@linguameet/types';

interface HeaderProps {
  currentLang?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  showBackHome?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang = 'en',
  onLanguageChange,
  showBackHome = false,
}) => {
  return (
    <header className="w-full border-b border-slate-800/80 bg-[#0F172A]/70 backdrop-blur-md sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-[1.5px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0F172A] rounded-[10px] flex items-center justify-center">
              <Video className="w-5 h-5 text-indigo-400 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                LinguaMeet
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AI Live
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">English ⇄ اردو Real-Time Meetings</p>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/poc"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            <span>Phase 1 PoC Workbench</span>
          </Link>

          {/* Language Selector */}
          {onLanguageChange && (
            <div className="flex items-center bg-slate-900/80 p-1 rounded-lg border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  currentLang === 'en'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('ur')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all urdu-text leading-tight ${
                  currentLang === 'ur'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                اردو
              </button>
            </div>
          )}

          {/* GitHub Repo Link */}
          <a
            href="https://github.com/afaqahmadcs/AI-Multilingual-Meeting-Platform"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="GitHub Repository"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
};
