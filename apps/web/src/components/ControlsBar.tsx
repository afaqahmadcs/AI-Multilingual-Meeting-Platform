'use client';

import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Subtitles,
  Volume2,
  VolumeX,
  MessageSquare,
  Users,
  Share2,
  PhoneOff,
} from 'lucide-react';
import { SupportedLanguage } from '@linguameet/types';

interface ControlsBarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  subtitlesEnabled: boolean;
  audioTranslationEnabled: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  unreadCount?: number;
  userLanguage: SupportedLanguage;
  translationFeatureEnabled?: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleSubtitles: () => void;
  onToggleAudioTranslation: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onOpenInvite: () => void;
  onLeaveMeeting: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  subtitlesEnabled,
  audioTranslationEnabled,
  isChatOpen,
  isParticipantsOpen,
  unreadCount = 0,
  userLanguage,
  translationFeatureEnabled = false,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onToggleSubtitles,
  onToggleAudioTranslation,
  onToggleChat,
  onToggleParticipants,
  onOpenInvite,
  onLeaveMeeting,
}) => {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
      <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-2 sm:gap-3 shadow-2xl border border-slate-700/60 bg-[#0F172A]/85 backdrop-blur-xl">
        {/* Mic Toggle */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-3 rounded-xl transition-all ${
            isMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          type="button"
          onClick={onToggleVideo}
          className={`p-3 rounded-xl transition-all ${
            isVideoOff
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
          }`}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          type="button"
          onClick={onToggleScreenShare}
          className={`p-3 rounded-xl transition-all ${
            isScreenSharing
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <ScreenShare className="w-5 h-5" />
        </button>

        {/* Subtitles & Audio Translation (Locked behind Phase 1 Feature Flag) */}
        {translationFeatureEnabled && (
          <>
            <div className="w-[1px] h-7 bg-slate-700/60 mx-1 hidden sm:block" />

            {/* Subtitles Toggle */}
            <button
              type="button"
              onClick={onToggleSubtitles}
              className={`p-3 rounded-xl transition-all flex items-center gap-1.5 ${
                subtitlesEnabled
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle Urdu/English Subtitles"
            >
              <Subtitles className="w-5 h-5" />
              <span className="text-[11px] font-semibold hidden md:inline">CC</span>
            </button>

            {/* Audio Translation Toggle */}
            <button
              type="button"
              onClick={onToggleAudioTranslation}
              className={`p-3 rounded-xl transition-all flex items-center gap-1.5 ${
                audioTranslationEnabled
                  ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={`Translated Voice (${userLanguage === 'en' ? 'Urdu to English' : 'English to Urdu'})`}
            >
              {audioTranslationEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-300" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
              <span className="text-[11px] font-semibold hidden md:inline">
                {userLanguage === 'en' ? 'Voice EN' : 'صدا UR'}
              </span>
            </button>
          </>
        )}

        <div className="w-[1px] h-7 bg-slate-700/60 mx-1 hidden sm:block" />

        {/* Chat Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleChat}
          className={`relative p-3 rounded-xl transition-all ${
            isChatOpen
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          title="In-Meeting Chat"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Participants Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleParticipants}
          className={`p-3 rounded-xl transition-all ${
            isParticipantsOpen
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          title="Participants List"
        >
          <Users className="w-5 h-5" />
        </button>

        {/* Share Invite Link */}
        <button
          type="button"
          onClick={onOpenInvite}
          className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
          title="Invite People"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Leave Meeting */}
        <button
          type="button"
          onClick={onLeaveMeeting}
          className="p-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/30"
          title="Leave Meeting"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
};
