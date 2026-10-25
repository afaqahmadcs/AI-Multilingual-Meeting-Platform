import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { SupportedLanguage } from '@linguameet/types';

interface HomeScreenProps {
  onJoinMeeting: (params: {
    roomCode: string;
    displayName: string;
    preferredLanguage: SupportedLanguage;
  }) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onJoinMeeting }) => {
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>('en');

  const handleJoin = () => {
    if (!roomCode.trim()) {
      Alert.alert('Required', 'Please enter a meeting room code or link');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Required', 'Please enter your display name');
      return;
    }

    let code = roomCode.trim();
    if (code.includes('/room/')) {
      code = code.split('/room/')[1].split('?')[0];
    }

    onJoinMeeting({
      roomCode: code,
      displayName: displayName.trim(),
      preferredLanguage,
    });
  };

  const handleCreateInstant = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    const segment = (len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const newCode = `lingua-${segment(3)}-${segment(3)}`;
    setRoomCode(newCode);
    if (!displayName) {
      setDisplayName('Host');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>LM</Text>
          </View>
          <Text style={styles.title}>LinguaMeet</Text>
          <Text style={styles.subtitle}>
            AI-Powered Multilingual Meetings{'\n'}English ⇄ اردو
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join a Video Call</Text>

          {/* Room Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Room Code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. lingua-abc-xyz"
              placeholderTextColor="#64748B"
              value={roomCode}
              onChangeText={setRoomCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Display Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Afaq Ahmad"
              placeholderTextColor="#64748B"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          {/* Language Preference */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Translation Language</Text>
            <View style={styles.langRow}>
              <TouchableOpacity
                style={[
                  styles.langButton,
                  preferredLanguage === 'en' && styles.langButtonActive,
                ]}
                onPress={() => setPreferredLanguage('en')}
              >
                <Text
                  style={[
                    styles.langButtonText,
                    preferredLanguage === 'en' && styles.langButtonTextActive,
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.langButton,
                  preferredLanguage === 'ur' && styles.langButtonActiveUrdu,
                ]}
                onPress={() => setPreferredLanguage('ur')}
              >
                <Text
                  style={[
                    styles.langButtonText,
                    preferredLanguage === 'ur' && styles.langButtonTextActive,
                  ]}
                >
                  اردو (Urdu)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Join Button */}
          <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
            <Text style={styles.joinButtonText}>Join Meeting</Text>
          </TouchableOpacity>

          {/* Create New Room Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateInstant}
          >
            <Text style={styles.createButtonText}>Generate Instant Room</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Highlights */}
        <View style={styles.footerInfo}>
          <Text style={styles.infoText}>
            ✓ Real-time Urdu & English Subtitles
          </Text>
          <Text style={styles.infoText}>
            ✓ LiveKit Ultra-Low Latency SFU
          </Text>
          <Text style={styles.infoText}>
            ✓ Screen Share & Camera Switching
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#151C2D',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0B0F19',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  langRow: {
    flexDirection: 'row',
    gap: 12,
  },
  langButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0B0F19',
    alignItems: 'center',
  },
  langButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  langButtonActiveUrdu: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  langButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  langButtonTextActive: {
    color: '#FFFFFF',
  },
  joinButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  createButton: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  createButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  footerInfo: {
    marginTop: 32,
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#64748B',
    fontSize: 12,
  },
});
