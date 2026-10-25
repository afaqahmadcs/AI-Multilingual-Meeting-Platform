import { SupportedLanguage } from './user.js';

export interface MeetingRoom {
  id: string;
  roomCode: string;
  title: string;
  hostId: string;
  isActive: boolean;
  createdAt: string;
  endedAt?: string;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId?: string;
  displayName: string;
  preferredLanguage: SupportedLanguage;
  isHost: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
  leftAt?: string;
}

export interface ChatMessage {
  id: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

export interface LiveKitTokenRequest {
  roomCode: string;
  displayName: string;
  preferredLanguage: SupportedLanguage;
}

export interface LiveKitTokenResponse {
  token: string;
  livekitUrl: string;
  participantId: string;
  roomCode: string;
  displayName: string;
}
