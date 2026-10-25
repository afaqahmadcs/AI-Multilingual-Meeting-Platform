'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2, Smartphone, Globe } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  roomCode,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${roomCode}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 bg-[#0F172A] border border-slate-700 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-base text-white">Invite Participants</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meeting Link Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Meeting Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={joinUrl}
              className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-300 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Room Code Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Direct Room Code</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={roomCode}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-300 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Cross-Platform Guidance */}
        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Web Browser:</span>
          </div>
          <p className="pl-6 text-[11px]">Click the link above to join immediately from Chrome, Firefox, Safari, or Edge.</p>

          <div className="flex items-center gap-2 text-slate-300 font-medium pt-1">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Android App:</span>
          </div>
          <p className="pl-6 text-[11px]">Open the LinguaMeet Android App and enter the room code <strong className="text-white font-mono">{roomCode}</strong>.</p>
        </div>
      </div>
    </div>
  );
};
