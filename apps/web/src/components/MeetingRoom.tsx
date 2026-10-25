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
import { AudioSettingsDrawer, TranslationStatus, QualityReview } from './AudioSettingsDrawer';
import { TranslationConsentModal } from './TranslationConsentModal';
import {
  SupportedLanguage,
  ChatMessage,
  MeetingParticipant,
  CaptionFrame,
  AudioTranslationPayload,
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
  Sparkles,
  Sliders,
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

  // Feature Flag: Validated Urdu <-> English translation enabled
  const translationFeatureEnabled =
    process.env.NEXT_PUBLIC_ENABLE_TRANSLATION !== 'false';

  // Subscribed Media Tracks (Camera and Screen Share)
  const trackRefs = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  // Drawer and Modal States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Translation & Subtitles States
  const [hasConsent, setHasConsent] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [consentTargetFeature, setConsentTargetFeature] = useState<'subtitles' | 'audio' | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [audioTranslationEnabled, setAudioTranslationEnabled] = useState(false);
  const [currentCaption, setCurrentCaption] = useState<CaptionFrame | null>(null);

  // Independent Volume & Ducking Controls
  const [originalVolume, setOriginalVolume] = useState(1.0);
  const [translatedVolume, setTranslatedVolume] = useState(1.0);
  const [autoDucking, setAutoDucking] = useState(true);

  // Live AI Status & Latency Tracking
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>('idle');
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | undefined>(undefined);
  const [firstAudioLatencyMs, setFirstAudioLatencyMs] = useState<number | undefined>(undefined);
  const [qualityReviews, setQualityReviews] = useState<QualityReview[]>([]);

  // Refs for audio processing and playback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const currentPlayingAudioRef = useRef<HTMLAudioElement | null>(null);
  const captionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // In-meeting Chat messages over LiveKit Data Channel
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Adjust volume of all remote WebRTC audio elements when originalVolume changes
  useEffect(() => {
    document.querySelectorAll('audio').forEach((el) => {
      if (el !== currentPlayingAudioRef.current) {
        el.volume = originalVolume;
      }
    });
  }, [originalVolume]);

  // Listen for LiveKit Data Channel messages (lk.chat, lk.captions, lk.tts_audio)
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant | LocalParticipant,
      _kind?: any,
      topic?: string
    ) => {
      // 1. In-Meeting Chat
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

      // 2. Translated Subtitles Frame
      else if (topic === 'lk.captions') {
        try {
          const str = new TextDecoder().decode(payload);
          const caption: CaptionFrame = JSON.parse(str);
          setCurrentCaption(caption);

          // Clear previous timer and auto-hide caption after 7 seconds of inactivity
          if (captionTimerRef.current) {
            clearTimeout(captionTimerRef.current);
          }
          captionTimerRef.current = setTimeout(() => {
            setCurrentCaption(null);
          }, 7000);
        } catch (err) {
          console.error('Failed to parse caption payload:', err);
        }
      }

      // 3. Translated Audio Payload (Targeted Playback & Feedback Loop Prevention)
      else if (topic === 'lk.tts_audio') {
        try {
          const str = new TextDecoder().decode(payload);
          const audioPayload: AudioTranslationPayload = JSON.parse(str);

          // CRITICAL SAFETY CHECK: NEVER play translated audio back to the speaker (prevents echo loop)
          if (audioPayload.speakerId === localParticipant?.identity) {
            return;
          }

          // TARGETED LISTENER CHECK: Only play if translated into current participant's selected language
          if (audioPayload.targetLanguage !== preferredLanguage) {
            return;
          }

          // If audio translation is not enabled locally by this listener, skip playback
          if (!audioTranslationEnabled) {
            return;
          }

          // Interruption handling: Stop any active voice playback immediately
          if (currentPlayingAudioRef.current) {
            currentPlayingAudioRef.current.pause();
            currentPlayingAudioRef.current = null;
          }

          // Smart Audio Ducking: Lower remote participant's original voice during AI playback
          if (autoDucking) {
            document.querySelectorAll('audio').forEach((el) => {
              if (el !== currentPlayingAudioRef.current) {
                el.volume = originalVolume * 0.2;
              }
            });
          }

          setTranslationStatus('speaking');
          const ttsAudio = new Audio(
            `data:${audioPayload.mimeType};base64,${audioPayload.audioBase64}`
          );
          ttsAudio.volume = translatedVolume;
          currentPlayingAudioRef.current = ttsAudio;

          const restoreAfterPlayback = () => {
            // Restore original audio volume
            document.querySelectorAll('audio').forEach((el) => {
              if (el !== currentPlayingAudioRef.current) {
                el.volume = originalVolume;
              }
            });
            setTranslationStatus('idle');
            currentPlayingAudioRef.current = null;
          };

          ttsAudio.onended = restoreAfterPlayback;
          ttsAudio.onerror = restoreAfterPlayback;

          ttsAudio.play().catch((playErr) => {
            console.warn('[TTS Playback Warning]:', playErr);
            restoreAfterPlayback();
          });
        } catch (err) {
          console.error('Failed to parse audio translation payload:', err);
        }
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      if (captionTimerRef.current) {
        clearTimeout(captionTimerRef.current);
      }
    };
  }, [
    room,
    roomCode,
    isChatOpen,
    localParticipant,
    preferredLanguage,
    audioTranslationEnabled,
    autoDucking,
    originalVolume,
    translatedVolume,
  ]);

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

  // Participant AI Consent Handlers
  const handleConsentAccept = () => {
    setHasConsent(true);
    setIsConsentModalOpen(false);
    if (consentTargetFeature === 'subtitles') {
      setSubtitlesEnabled(true);
    } else if (consentTargetFeature === 'audio') {
      setAudioTranslationEnabled(true);
    }
    setConsentTargetFeature(null);
  };

  const handleConsentDecline = () => {
    setHasConsent(false);
    setIsConsentModalOpen(false);
    setSubtitlesEnabled(false);
    setAudioTranslationEnabled(false);
    setConsentTargetFeature(null);
  };

  const handleToggleSubtitles = () => {
    if (!subtitlesEnabled && !hasConsent) {
      setConsentTargetFeature('subtitles');
      setIsConsentModalOpen(true);
      return;
    }
    setSubtitlesEnabled((prev) => !prev);
  };

  const handleToggleAudioTranslation = () => {
    if (!audioTranslationEnabled && !hasConsent) {
      setConsentTargetFeature('audio');
      setIsConsentModalOpen(true);
      return;
    }
    setAudioTranslationEnabled((prev) => !prev);
  };

  // Process recorded audio slice through /api/meetings/translate and broadcast over LiveKit Data Channel
  const processAudioChunk = useCallback(
    async (chunkBlob: Blob) => {
      if (!room || !localParticipant) return;
      if (!hasConsent) return;
      if (!isMicrophoneEnabled) return;
      if (chunkBlob.size < 1500) return; // Discard tiny noise fragments

      // Determine target peer language for 2-person meeting
      const remotePeer = participants.find((p) => !p.isLocal);
      let targetLang: SupportedLanguage = preferredLanguage === 'ur' ? 'en' : 'ur';
      if (remotePeer?.metadata) {
        try {
          const meta = JSON.parse(remotePeer.metadata);
          if (meta.preferredLanguage === 'ur' || meta.preferredLanguage === 'en') {
            targetLang = meta.preferredLanguage;
          }
        } catch {}
      }

      // Check language pair: Validated pairs are ur <-> en only!
      if (preferredLanguage === targetLang) {
        return;
      }

      setTranslationStatus('translating');

      try {
        const formData = new FormData();
        formData.append('audio', chunkBlob, 'speech_chunk.webm');
        formData.append('consentGranted', 'true');
        formData.append('sourceLanguage', preferredLanguage);
        formData.append('targetLanguage', targetLang);
        formData.append('speakerId', localParticipant.identity);
        formData.append('speakerName', displayName);
        formData.append('meetingId', roomCode);

        const response = await fetch('/api/meetings/translate', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          if (response.status === 429) {
            setTranslationStatus('rate_limited');
            setTranslationError(
              'AI rate limit reached. Backing off temporarily. Original audio uninterrupted.'
            );
          } else {
            const errJson = await response.json().catch(() => ({}));
            setTranslationStatus('error');
            setTranslationError(
              errJson.error || 'Translation request failed. Original speech preserved.'
            );
          }
          return;
        }

        const data = await response.json();
        setTranslationError(null);

        // Update latency metrics
        if (data.metrics?.totalLatencyMs) {
          setLastLatencyMs(data.metrics.totalLatencyMs);
          if (!firstAudioLatencyMs && data.audioPayload) {
            setFirstAudioLatencyMs(data.metrics.totalLatencyMs);
          }
        }

        // 1. Broadcast Subtitle Caption Frame over Data Channel (lk.captions)
        if (data.caption) {
          const enc = new TextEncoder().encode(JSON.stringify(data.caption));
          await localParticipant.publishData(enc, { topic: 'lk.captions' });
          setCurrentCaption(data.caption);
        }

        // 2. Broadcast Translated Audio Payload for target listener (lk.tts_audio)
        if (data.audioPayload) {
          const enc = new TextEncoder().encode(JSON.stringify(data.audioPayload));
          await localParticipant.publishData(enc, { topic: 'lk.tts_audio' });
        }

        setTranslationStatus('idle');
      } catch (err: any) {
        console.error('[Translation Pipeline Error]:', err);
        setTranslationStatus('error');
        setTranslationError(
          'Speech translation network error. Original audio preserved.'
        );
      }
    },
    [
      room,
      localParticipant,
      hasConsent,
      isMicrophoneEnabled,
      preferredLanguage,
      participants,
      displayName,
      roomCode,
      firstAudioLatencyMs,
    ]
  );

  // Microphone audio slice recorder
  useEffect(() => {
    // Only capture when mic is unmuted, participant granted consent, and translation or subtitles is active
    const shouldRecord =
      isMicrophoneEnabled &&
      hasConsent &&
      (subtitlesEnabled || audioTranslationEnabled) &&
      connectionState === ConnectionState.Connected;

    if (!shouldRecord) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      if (translationStatus === 'listening' || translationStatus === 'translating') {
        setTranslationStatus('idle');
      }
      return;
    }

    let isCancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        audioStreamRef.current = stream;
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 2000) {
            processAudioChunk(e.data);
          }
        };

        recorder.onstart = () => {
          setTranslationStatus('listening');
        };

        // Slice audio into 3500ms chunks for responsive live translation
        recorder.start(3500);
      })
      .catch((err) => {
        console.warn('Speech translation mic capture error:', err);
      });

    return () => {
      isCancelled = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
    };
  }, [
    isMicrophoneEnabled,
    hasConsent,
    subtitlesEnabled,
    audioTranslationEnabled,
    connectionState,
    processAudioChunk,
    translationStatus,
  ]);

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
          {/* Realtime AI Translation Status Pill */}
          {translationFeatureEnabled && (
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen((s) => !s);
                setIsChatOpen(false);
                setIsParticipantsOpen(false);
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-slate-900 border border-indigo-500/30 hover:border-indigo-400 text-slate-300 transition-colors"
              title="Click to open Audio & Translation Controls"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{preferredLanguage === 'ur' ? 'اردو ↔ EN' : 'EN ↔ اردو'}</span>
              {translationStatus === 'listening' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              ) : translationStatus === 'translating' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping ml-0.5" />
              ) : translationStatus === 'speaking' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse ml-0.5" />
              ) : translationStatus === 'rate_limited' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />
              ) : translationStatus === 'error' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 ml-0.5" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 ml-0.5" />
              )}
            </button>
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
        isSettingsOpen={isSettingsOpen}
        unreadCount={unreadCount}
        userLanguage={preferredLanguage}
        translationFeatureEnabled={translationFeatureEnabled}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleSubtitles={handleToggleSubtitles}
        onToggleAudioTranslation={handleToggleAudioTranslation}
        onToggleChat={() => {
          setIsChatOpen((c) => !c);
          setIsParticipantsOpen(false);
          setIsSettingsOpen(false);
          setUnreadCount(0);
        }}
        onToggleParticipants={() => {
          setIsParticipantsOpen((p) => !p);
          setIsChatOpen(false);
          setIsSettingsOpen(false);
        }}
        onToggleSettings={() => {
          setIsSettingsOpen((s) => !s);
          setIsChatOpen(false);
          setIsParticipantsOpen(false);
        }}
        onOpenInvite={() => setIsInviteOpen(true)}
        onLeaveMeeting={handleLeaveMeeting}
      />

      {/* Subtitles Overlay */}
      {subtitlesEnabled && currentCaption && (
        <SubtitlesDock
          caption={currentCaption}
          onClose={() => setCurrentCaption(null)}
          isAudioTranslationActive={audioTranslationEnabled}
        />
      )}

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

      <AudioSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        originalVolume={originalVolume}
        translatedVolume={translatedVolume}
        autoDucking={autoDucking}
        userLanguage={preferredLanguage}
        translationStatus={translationStatus}
        lastLatencyMs={lastLatencyMs}
        firstAudioLatencyMs={firstAudioLatencyMs}
        errorMessage={translationError}
        hasConsent={hasConsent}
        onUpdateOriginalVolume={setOriginalVolume}
        onUpdateTranslatedVolume={setTranslatedVolume}
        onToggleAutoDucking={() => setAutoDucking((d) => !d)}
        onRequestConsent={() => setIsConsentModalOpen(true)}
        onLogQualityReview={(review) => {
          setQualityReviews((prev) => [...prev, review]);
          console.log('[Quality Audit Review Logged]:', review);
        }}
      />

      <TranslationConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onConsent={(granted) => {
          if (granted) {
            handleConsentAccept();
          } else {
            handleConsentDecline();
          }
        }}
      />

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        roomCode={roomCode}
      />
    </>
  );
};
