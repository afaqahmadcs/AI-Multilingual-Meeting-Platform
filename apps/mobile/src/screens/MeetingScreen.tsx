import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { SupportedLanguage, CaptionFrame, ChatMessage } from '@linguameet/types';

interface MeetingScreenProps {
  roomCode: string;
  displayName: string;
  preferredLanguage: SupportedLanguage;
  onLeave: () => void;
}

export const MeetingScreen: React.FC<MeetingScreenProps> = ({
  roomCode,
  displayName,
  preferredLanguage,
  onLeave,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [audioTranslationEnabled, setAudioTranslationEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // Captions state
  const [currentCaption, setCurrentCaption] = useState<CaptionFrame | null>(null);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      meetingId: roomCode,
      senderId: 'remote_user',
      senderName: 'Tariq Mehmood',
      message: 'Assalam o Alaikum! کیا آپ مجھے سن سکتے ہیں؟',
      timestamp: Date.now() - 10000,
    },
  ]);

  // Periodic demo subtitle simulation
  useEffect(() => {
    if (!subtitlesEnabled) return;

    const timer = setTimeout(() => {
      const isUrduSrc = preferredLanguage === 'en';
      setCurrentCaption({
        id: 'cap_mob_1',
        meetingId: roomCode,
        speakerId: 'remote_peer_1',
        speakerName: 'Tariq Mehmood',
        originalText: isUrduSrc
          ? 'ہم میٹنگ کے ایجنڈے پر بات کر سکتے ہیں۔'
          : 'We can now discuss the meeting agenda.',
        translatedText: isUrduSrc
          ? 'We can now discuss the meeting agenda.'
          : 'ہم اب میٹنگ کے ایجنڈے پر بات کر سکتے ہیں۔',
        sourceLanguage: isUrduSrc ? 'ur' : 'en',
        targetLanguage: preferredLanguage,
        isFinal: true,
        timestamp: Date.now(),
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [subtitlesEnabled, preferredLanguage, roomCode]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      meetingId: roomCode,
      senderId: 'local_user',
      senderName: displayName,
      message: chatInput.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.roomBadge}>
          <Text style={styles.roomCodeText}>{roomCode}</Text>
        </View>
        <View style={styles.langBadge}>
          <Text style={styles.langBadgeText}>
            Lang: {preferredLanguage.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity style={styles.leaveButton} onPress={onLeave}>
          <Text style={styles.leaveButtonText}>Leave</Text>
        </TouchableOpacity>
      </View>

      {/* Video Grid */}
      <View style={styles.gridContainer}>
        {/* Remote Video Tile */}
        <View style={styles.videoCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>TM</Text>
          </View>
          <View style={styles.participantTag}>
            <Text style={styles.participantName}>Tariq Mehmood (UR)</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>Speaking (Urdu)</Text>
          </View>
        </View>

        {/* Local Video Tile */}
        <View style={styles.videoCard}>
          {isVideoOff ? (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {displayName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          ) : (
            <View style={styles.cameraActiveView}>
              <Text style={styles.cameraText}>Local HD Camera</Text>
            </View>
          )}
          <View style={styles.participantTag}>
            <Text style={styles.participantName}>
              {displayName} (You) {isMuted ? '🔇' : '🎙️'}
            </Text>
          </View>
        </View>
      </View>

      {/* Subtitles Overlay */}
      {subtitlesEnabled && currentCaption && (
        <View style={styles.subtitlesContainer}>
          <Text style={styles.subtitleSpeaker}>
            {currentCaption.speakerName} ({currentCaption.sourceLanguage} →{' '}
            {currentCaption.targetLanguage}):
          </Text>
          <Text style={styles.subtitleOriginal}>
            {currentCaption.originalText}
          </Text>
          <Text
            style={[
              styles.subtitleTranslated,
              currentCaption.targetLanguage === 'ur' && styles.urduText,
            ]}
          >
            {currentCaption.translatedText}
          </Text>
        </View>
      )}

      {/* Floating Bottom Controls */}
      <View style={styles.controlsBar}>
        {/* Mic Toggle */}
        <TouchableOpacity
          style={[styles.ctrlBtn, isMuted && styles.ctrlBtnOff]}
          onPress={() => setIsMuted((m) => !m)}
        >
          <Text style={styles.ctrlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
          <Text style={styles.ctrlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        {/* Video Toggle */}
        <TouchableOpacity
          style={[styles.ctrlBtn, isVideoOff && styles.ctrlBtnOff]}
          onPress={() => setIsVideoOff((v) => !v)}
        >
          <Text style={styles.ctrlIcon}>{isVideoOff ? '🚫' : '📹'}</Text>
          <Text style={styles.ctrlLabel}>{isVideoOff ? 'Start' : 'Stop'}</Text>
        </TouchableOpacity>

        {/* Subtitles Toggle */}
        <TouchableOpacity
          style={[styles.ctrlBtn, subtitlesEnabled && styles.ctrlBtnActive]}
          onPress={() => setSubtitlesEnabled((s) => !s)}
        >
          <Text style={styles.ctrlIcon}>💬</Text>
          <Text style={styles.ctrlLabel}>Subtitles</Text>
        </TouchableOpacity>

        {/* Audio Translation Toggle */}
        <TouchableOpacity
          style={[styles.ctrlBtn, audioTranslationEnabled && styles.ctrlBtnActive]}
          onPress={() => setAudioTranslationEnabled((a) => !a)}
        >
          <Text style={styles.ctrlIcon}>🔊</Text>
          <Text style={styles.ctrlLabel}>AI Voice</Text>
        </TouchableOpacity>

        {/* Chat Toggle */}
        <TouchableOpacity
          style={styles.ctrlBtn}
          onPress={() => setIsChatOpen(true)}
        >
          <Text style={styles.ctrlIcon}>✉️</Text>
          <Text style={styles.ctrlLabel}>Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Modal */}
      <Modal
        visible={isChatOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsChatOpen(false)}
      >
        <SafeAreaView style={styles.chatModalContainer}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatHeaderTitle}>In-Meeting Chat</Text>
            <TouchableOpacity onPress={() => setIsChatOpen(false)}>
              <Text style={styles.chatCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatList}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.chatBubble,
                  item.senderId === 'local_user'
                    ? styles.chatBubbleMe
                    : styles.chatBubbleRemote,
                ]}
              >
                <Text style={styles.chatSender}>{item.senderName}</Text>
                <Text style={styles.chatMessageText}>{item.message}</Text>
              </View>
            )}
          />

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type message in English or Urdu..."
              placeholderTextColor="#64748B"
              value={chatInput}
              onChangeText={setChatInput}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendChat}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  roomBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roomCodeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  langBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langBadgeText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  leaveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  gridContainer: {
    flex: 1,
    padding: 12,
    gap: 12,
  },
  videoCard: {
    flex: 1,
    backgroundColor: '#151C2D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#312E81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#C7D2FE',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cameraActiveView: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraText: {
    color: '#818CF8',
    fontSize: 13,
  },
  participantTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  participantName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  statusPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusPillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  subtitlesContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  subtitleSpeaker: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitleOriginal: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  subtitleTranslated: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  urduText: {
    textAlign: 'right',
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  ctrlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 54,
  },
  ctrlBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  ctrlBtnOff: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  ctrlIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  ctrlLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  chatModalContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  chatHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  chatCloseText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  chatList: {
    padding: 16,
    gap: 12,
  },
  chatBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
  },
  chatBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#4F46E5',
  },
  chatBubbleRemote: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
  },
  chatSender: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  chatMessageText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  chatInputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#151C2D',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
