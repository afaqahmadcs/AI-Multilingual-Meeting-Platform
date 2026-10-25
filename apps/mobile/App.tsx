import React, { useState } from 'react';
import { HomeScreen } from './src/screens/HomeScreen';
import { MeetingScreen } from './src/screens/MeetingScreen';
import { SupportedLanguage } from '@linguameet/types';

interface MeetingState {
  roomCode: string;
  displayName: string;
  preferredLanguage: SupportedLanguage;
}

export default function App() {
  const [activeMeeting, setActiveMeeting] = useState<MeetingState | null>(null);

  if (activeMeeting) {
    return (
      <MeetingScreen
        roomCode={activeMeeting.roomCode}
        displayName={activeMeeting.displayName}
        preferredLanguage={activeMeeting.preferredLanguage}
        onLeave={() => setActiveMeeting(null)}
      />
    );
  }

  return <HomeScreen onJoinMeeting={(params) => setActiveMeeting(params)} />;
}
