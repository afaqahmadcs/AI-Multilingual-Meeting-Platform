'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useConnectionState,
  useRoomContext,
  VideoTrack,
  isTrackReference,
  TrackReference,
} from '@livekit/components-react';
import {
  Track,
  ConnectionState,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
} from 'livekit-client';
import { ControlsBar } from './ControlsBar';
import { ChatDrawer } from './ChatDrawer';
import { ParticipantsDrawer } from './ParticipantsDrawer';
import { InviteModal } from './InviteModal';
import { SubtitlesDock } from './SubtitlesDock';
import {
  SupportedLanguage,
  ChatMessage,
  MeetingParticipant,
  CaptionFrame,
} from '@linguameet/types';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  ScreenShare,
  Crown,
  AlertTriangle,
  RotateCcw,
  Wifi,
  WifiOff,
  Share2,
} from 'lucide-react';

interface MeetingRoomProps {
  roomCode: string;
  token: string;
  livekitUrl: string;
  displayName: string;
  preferredLanguage: SupportedLanguage;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = (props) => {
  const router = useRouter();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleDisconnected = useCallback(() => {
    console.log('[LiveKit] Room disconnected');
    router.push('/');
  }, [router]);

  const handleError = useCallback((error: Error) => {
    console.error('[LiveKit Error]:', error);
    if (error.name === 'NotAllowedError') {
      setConnectionError(
        'Permission denied: Please allow microphone and camera access in your browser address bar.'
      );
    } else {
      setConnectionError(error.message || 'LiveKit connection error occurred.');
    }
  }, []);

  return (
    <LiveKitRoom
      serverUrl={props.livekitUrl}
      token={props.token}
      connect={true}
      video={true}
      audio={true}
      onDisconnected={handleDisconnected}
      onError={handleError}
      className="relative w-screen h-screen bg-[#0B0F19] overflow-hidden flex flex-col select-none text-slate-100"
    >
      <ActiveMeetingContent {...props} connectionError={connectionError} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};

interface ActiveMeetingContentProps extends MeetingRoomProps {
  connectionError: string | null;
}

const ActiveMeetingContent: React.FC<ActiveMeetingContentProps> = ({
  roomCode,
  displayName,
  preferredLanguage,
  connectionError,
}) => {
  const router = useRouter();
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  // Feature Flag: Keep translation locked behind Phase 1 validation
  const translationFeatureEnabled =
    process.env.NEXT_PUBLIC_ENABLE_TRANSLATION === 'true';

  // Subscribed Media Tracks (Camera and Screen Share)
  const trackRefs = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  // Drawer and Modal States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [audioTranslationEnabled, setAudioTranslationEnabled] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // In-meeting Chat messages over LiveKit Data Channel
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen for LiveKit Data Channel messages (Chat topic: lk.chat)
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant | LocalParticipant,
      _kind?: any,
      topic?: string
    ) => {
      if (topic === 'lk.chat') {
        try {
          const str = new TextDecoder().decode(payload);
          const parsed = JSON.parse(str);
          const senderName = participant?.name || 'Participant';
          const senderId = participant?.identity || 'unknown';

          const newMsg: ChatMessage = {
            id: parsed.id || `msg_${Date.now()}`,
            meetingId: roomCode,
            senderId,
            senderName,
            message: parsed.message || '',
            timestamp: parsed.timestamp || Date.now(),
          };

          setMessages((prev) => [...prev, newMsg]);
          if (!isChatOpen) {
            setUnreadCount((c) => c + 1);
          }
        } catch (err) {
          console.error('Failed to parse incoming chat payload:', err);
        }
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, roomCode, isChatOpen]);

  // Send message over LiveKit Data Channel
  const handleSendMessage = async (text: string) => {
    if (!room || !localParticipant) return;

    const msgId = `msg_${Date.now()}`;
    const payload = {
      id: msgId,
      message: text,
      timestamp: Date.now(),
    };

    try {
      const encoded = new TextEncoder().encode(JSON.stringify(payload));
      await localParticipant.publishData(encoded, { topic: 'lk.chat' });

      // Add to local state immediately
      const localMsg: ChatMessage = {
        id: msgId,
        meetingId: roomCode,
        senderId: localParticipant.identity,
        senderName: displayName,
        message: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, localMsg]);
    } catch (err) {
      console.error('Failed to send data channel message:', err);
    }
  };

  // Toggle Microphone
  const handleToggleMic = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      setPermissionError(null);
    } catch (err: any) {
      console.error('Mic toggle error:', err);
      if (err.name === 'NotAllowedError') {
        setPermissionError('Microphone permission was denied by your browser.');
      }
    }
  };

  // Toggle Camera
  const handleToggleVideo = async () => {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
      setPermissionError(null);
    } catch (err: any) {
      console.error('Camera toggle error:', err);
      if (err.name === 'NotAllowedError') {
        setPermissionError('Camera permission was denied by your browser.');
      }
    }
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (err: any) {
      console.error('Screen share error:', err);
    }
  };

  // Leave meeting cleanly
  const handleLeaveMeeting = () => {
    if (room) {
      room.disconnect();
    }
    router.push('/');
  };

  // Build formatted participant roster for drawer
  const formattedParticipants: MeetingParticipant[] = participants.map((p) => {
    let isHost = false;
    let preferredLang: SupportedLanguage = 'en';
    if (p.metadata) {
      try {
        const meta = JSON.parse(p.metadata);
        if (meta.isHost) isHost = true;
        if (meta.preferredLanguage) preferredLang = meta.preferredLanguage;
      } catch {}
    }

    return {
      id: p.identity,
      meetingId: roomCode,
      displayName: p.name || p.identity,
      preferredLanguage: preferredLang,
      isHost,
      isMuted: !p.isMicrophoneEnabled,
      isCameraOff: !p.isCameraEnabled,
      isScreenSharing: p.isScreenShareEnabled,
      joinedAt: new Date().toISOString(),
    };
  });

  // Connection indicator helpers
  const isConnecting = connectionState === ConnectionState.Connecting;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;
  const isConnected = connectionState === ConnectionState.Connected;

  // Separate screen share track if someone is sharing
  const screenShareTrack = trackRefs.find(
    (t): t is TrackReference => isTrackReference(t) && t.source === Track.Source.ScreenShare
  );
  const cameraTracks = trackRefs.filter((t) => t.source === Track.Source.Camera);

  return (
    <>
      {/* Top Header Bar */}
      <header className="h-14 px-4 sm:px-6 border-b border-slate-800/80 bg-[#0F172A]/85 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            LinguaMeet
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700/80 hidden sm:inline">
            {roomCode}
          </span>

          {/* Realtime Connection Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border">
            {isConnected ? (
              <span className="text-emerald-400 bg-emerald-500/10 border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live ({participants.length})
              </span>
            ) : isReconnecting ? (
              <span className="text-amber-400 bg-amber-500/10 border-amber-500/30 flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3 animate-spin text-amber-400" />
                Reconnecting...
              </span>
            ) : isConnecting ? (
              <span className="text-sky-400 bg-sky-500/10 border-sky-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                Connecting...
              </span>
            ) : (
              <span className="text-red-400 bg-red-500/10 border-red-500/30 flex items-center gap-1.5">
                <WifiOff className="w-3 h-3" />
                Disconnected
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Feature Flag Notice Badge */}
          {!translationFeatureEnabled && (
            <span className="hidden md:inline text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
              Translation: Locked (Phase 1 Pending)
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        </div>
      </header>

      {/* Permission Warning Banner if media access was denied */}
      {(permissionError || connectionError) && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{permissionError || connectionError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPermissionError(null);
            }}
            className="text-amber-400 hover:text-white font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Call Video Viewport */}
      <main className="flex-1 relative p-3 sm:p-6 pb-28 flex flex-col items-center justify-center overflow-hidden">
        {/* If Screen Share is active, display prominent screen tile */}
        {screenShareTrack && (
          <div className="w-full max-w-5xl h-[55%] mb-4 rounded-2xl overflow-hidden border border-indigo-500/40 bg-slate-950 relative shadow-2xl">
            <VideoTrack
              trackRef={screenShareTrack}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3 bg-black/70 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-300 flex items-center gap-1.5">
              <ScreenShare className="w-3.5 h-3.5" />
              <span>{screenShareTrack.participant.name}&apos;s Screen</span>
            </div>
          </div>
        )}

        {/* Video Grid for Participants */}
        <div
          className={`w-full max-w-6xl grid gap-3 sm:gap-4 items-center justify-center ${
            cameraTracks.length <= 1
              ? 'grid-cols-1 max-w-2xl'
              : cameraTracks.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : cameraTracks.length <= 4
              ? 'grid-cols-2'
              : 'grid-cols-2 md:grid-cols-3'
          } ${screenShareTrack ? 'h-[40%]' : 'h-full max-h-[640px]'}`}
        >
          {cameraTracks.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <VideoOff className="w-12 h-12" />
              <p className="text-sm">Waiting for participants to connect...</p>
            </div>
          ) : (
            cameraTracks.map((trackRef) => {
              const p = trackRef.participant;
              const isLocal = p.isLocal;
              const hasVideo = p.isCameraEnabled && trackRef.publication?.isSubscribed !== false;
              const isSpeaking = p.isSpeaking;

              return (
                <div
                  key={trackRef.publication?.trackSid || p.identity}
                  className={`relative w-full h-full min-h-[180px] max-h-[460px] rounded-2xl overflow-hidden bg-slate-900 border transition-all flex items-center justify-center shadow-lg ${
                    isSpeaking
                      ? 'border-emerald-400 ring-2 ring-emerald-500/40'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Video Stream or Avatar Placeholder */}
                  {hasVideo && isTrackReference(trackRef) ? (
                    <VideoTrack
                      trackRef={trackRef}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xl sm:text-2xl font-bold text-indigo-200">
                        {(p.name || p.identity).slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[11px] text-slate-400">Camera Off</span>
                    </div>
                  )}

                  {/* Participant Name & Status Badge */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs text-white max-w-[85%]">
                    <span className="truncate font-medium">
                      {p.name || p.identity} {isLocal && '(You)'}
                    </span>
                    {p.isMicrophoneEnabled ? (
                      <Mic className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Bottom Meeting Controls */}
      <ControlsBar
        isMuted={!isMicrophoneEnabled}
        isVideoOff={!isCameraEnabled}
        isScreenSharing={isScreenShareEnabled}
        subtitlesEnabled={subtitlesEnabled}
        audioTranslationEnabled={audioTranslationEnabled}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        unreadCount={unreadCount}
        userLanguage={preferredLanguage}
        translationFeatureEnabled={translationFeatureEnabled}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
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

      {/* Drawers & Modals */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        currentUserId={localParticipant?.identity || ''}
        userLanguage={preferredLanguage}
        onSendMessage={handleSendMessage}
      />

      <ParticipantsDrawer
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={formattedParticipants}
        currentUserId={localParticipant?.identity || ''}
      />

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        roomCode={roomCode}
      />
    </>
  );
};
