'use client';

import React from 'react';
import { MeetingParticipant } from '@linguameet/types';
import { X, Mic, MicOff, Video, VideoOff, ScreenShare, Crown, Shield } from 'lucide-react';

interface ParticipantsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  participants: MeetingParticipant[];
  currentUserId: string;
}

export const ParticipantsDrawer: React.FC<ParticipantsDrawerProps> = ({
  isOpen,
  onClose,
  participants,
  currentUserId,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="fixed top-0 right-0 w-80 sm:w-96 h-full z-50 bg-[#0F172A]/95 border-l border-slate-800 shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-slate-100">Participants</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {participants.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {participants.map((p) => {
          const isMe = p.id === currentUserId;

          return (
            <div
              key={p.id}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3"
            >
              {/* Avatar & Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
                  {p.displayName.slice(0, 2)}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {p.displayName} {isMe && '(You)'}
                    </span>
                    {p.isHost && (
                      <span title="Host">
                        <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    Lang: <strong className="text-indigo-400 uppercase">{p.preferredLanguage}</strong>
                  </span>
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-2 text-slate-400">
                {p.isScreenSharing && (
                  <span title="Screen sharing">
                    <ScreenShare className="w-3.5 h-3.5 text-indigo-400" />
                  </span>
                )}
                {p.isMuted ? (
                  <span title="Muted">
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  </span>
                ) : (
                  <span title="Active mic">
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                )}
                {p.isCameraOff ? (
                  <span title="Camera off">
                    <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                  </span>
                ) : (
                  <span title="Camera on">
                    <Video className="w-3.5 h-3.5 text-indigo-400" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
