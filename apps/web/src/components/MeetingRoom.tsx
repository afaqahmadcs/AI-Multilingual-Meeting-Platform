'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { ControlsBar } from './ControlsBar';
import { SubtitlesDock } from './SubtitlesDock';
import { ChatDrawer } from './ChatDrawer';
import { ParticipantsDrawer } from './ParticipantsDrawer';
import { InviteModal } from './InviteModal';
import {
  SupportedLanguage,
  CaptionFrame,
  ChatMessage,
  MeetingParticipant,
} from '@linguameet/types';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  ScreenShare,
  Crown,
  Languages,
  Sparkles,
} from 'lucide-react';

interface MeetingRoomProps {
  roomCode: string;
  token: string;
  livekitUrl: string;
  displayName: string;
  preferredLanguage: SupportedLanguage;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  roomCode,
  token,
  livekitUrl,
  displayName,
  preferredLanguage,
}) => {
  const router = useRouter();

  // Control bar toggles
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [audioTranslationEnabled, setAudioTranslationEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Realtime Data Channel State
  const [currentCaption, setCurrentCaption] = useState<CaptionFrame | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Simulated / Mock Active Participant List for responsive UI demonstration
  const [participantsList, setParticipantsList] = useState<MeetingParticipant[]>([
    {
      id: 'local_user',
      displayName,
      preferredLanguage,
      isHost: true,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      joinedAt: new Date().toISOString(),
      meetingId: roomCode,
    },
    {
      id: 'remote_peer_1',
      displayName: 'Tariq Mehmood',
      preferredLanguage: preferredLanguage === 'en' ? 'ur' : 'en',
      isHost: false,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      joinedAt: new Date().toISOString(),
      meetingId: roomCode,
    },
  ]);

  // Demo periodic subtitle generator to demonstrate real-time Urdu <-> English translation
  useEffect(() => {
    if (!subtitlesEnabled) return;

    const timer = setTimeout(() => {
      const isUrduSrc = preferredLanguage === 'en';
      setCurrentCaption({
        id: 'cap_1',
        meetingId: roomCode,
        speakerId: 'remote_peer_1',
        speakerName: 'Tariq Mehmood',
        originalText: isUrduSrc
          ? 'السلام علیکم، ہم سب آج کے پروجیکٹ کے لائحہ عمل پر متفق ہیں۔'
          : 'Hello team, we all agree on the project timeline for today.',
        translatedText: isUrduSrc
          ? 'Assalam-o-Alaikum, we all agree on the project agenda today.'
          : 'السلام علیکم، ہم سب آج کے پروجیکٹ کے شیڈول پر متفق ہیں۔',
        sourceLanguage: isUrduSrc ? 'ur' : 'en',
        targetLanguage: preferredLanguage,
        isFinal: true,
        timestamp: Date.now(),
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [subtitlesEnabled, preferredLanguage, roomCode]);

  const handleSendMessage = async (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      meetingId: roomCode,
      senderId: 'local_user',
      senderName: displayName,
      message: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);

    // If chat drawer closed, bump unread badge
    if (!isChatOpen) {
      setUnreadCount((c) => c + 1);
    }
  };

  const handleLeaveMeeting = () => {
    router.push('/');
  };

  // If livekitUrl is a real WebSocket, render LiveKitRoom; otherwise provide rich development view
  const isRealLiveKit = livekitUrl.startsWith('ws://') || livekitUrl.startsWith('wss://');

  return (
    <div className="relative w-screen h-screen bg-[#0B0F19] overflow-hidden flex flex-col select-none">
      {/* Top Meeting Info Bar */}
      <header className="h-14 px-6 border-b border-slate-800/80 bg-[#0F172A]/70 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white tracking-wide">
            LinguaMeet Session
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700/80">
            {roomCode}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target Lang:</span>
            <strong className="text-emerald-400 uppercase font-semibold">
              {preferredLanguage}
            </strong>
          </div>
        </div>
      </header>

      {/* Main Video Call Area */}
      <main className="flex-1 relative p-4 pb-28 flex items-center justify-center overflow-hidden">
        {/* Video Grid */}
        <div className="w-full h-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center">
          {/* Local Participant Card */}
          <div className="relative w-full h-full max-h-[460px] rounded-2xl overflow-hidden bg-slate-900/90 border border-slate-800 flex items-center justify-center shadow-xl group">
            {isVideoOff ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-2xl font-bold text-indigo-200">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-slate-400">Camera Turned Off</span>
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-center relative">
                <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <Video className="w-10 h-10 text-indigo-400/80" />
                </div>
                {/* Simulated active video indicator */}
                <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded bg-black/60 text-emerald-400 font-mono">
                  1080p HD
                </span>
              </div>
            )}

            {/* Local User Badge */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs text-white">
              <span className="font-medium">{displayName} (You)</span>
              {isMuted ? (
                <MicOff className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
          </div>

          {/* Remote Participant Card */}
          <div className="relative w-full h-full max-h-[460px] rounded-2xl overflow-hidden bg-slate-900/90 border border-emerald-500/40 flex items-center justify-center shadow-xl group ring-2 ring-emerald-500/30">
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 flex items-center justify-center relative">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-600/40 flex items-center justify-center text-xl font-bold text-emerald-200">
                  TM
                </div>
              </div>
              <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded bg-black/60 text-emerald-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Speaking (اردو)
              </span>
            </div>

            {/* Remote User Badge */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs text-white">
              <span className="font-medium">Tariq Mehmood</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                UR
              </span>
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Live Subtitles Dock Overlay */}
        {subtitlesEnabled && (
          <SubtitlesDock
            caption={currentCaption}
            onClose={() => setSubtitlesEnabled(false)}
            isAudioTranslationActive={audioTranslationEnabled}
          />
        )}
      </main>

      {/* Floating Control Bar */}
      <ControlsBar
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        subtitlesEnabled={subtitlesEnabled}
        audioTranslationEnabled={audioTranslationEnabled}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        unreadCount={unreadCount}
        userLanguage={preferredLanguage}
        onToggleMic={() => setIsMuted((m) => !m)}
        onToggleVideo={() => setIsVideoOff((v) => !v)}
        onToggleScreenShare={() => setIsScreenSharing((s) => !s)}
        onToggleSubtitles={() => setSubtitlesEnabled((s) => !s)}
        onToggleAudioTranslation={() => setAudioTranslationEnabled((a) => !a)}
        onToggleChat={() => {
          setIsChatOpen((c) => !c);
          setIsParticipantsOpen(false);
          setUnreadCount(0);
        }}
        onToggleParticipants={() => {
          setIsParticipantsOpen((p) => !p);
          setIsChatOpen(false);
        }}
        onOpenInvite={() => setIsInviteOpen(true)}
        onLeaveMeeting={handleLeaveMeeting}
      />

      {/* Slide-out Drawers & Modals */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        currentUserId="local_user"
        userLanguage={preferredLanguage}
        onSendMessage={handleSendMessage}
      />

      <ParticipantsDrawer
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={participantsList}
        currentUserId="local_user"
      />

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        roomCode={roomCode}
      />
    </div>
  );
};
