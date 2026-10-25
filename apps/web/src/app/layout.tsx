import type { Metadata } from 'next';
import '@livekit/components-styles';
import './globals.css';

export const metadata: Metadata = {
  title: 'LinguaMeet - AI-Powered Multilingual Video Meetings',
  description:
    'Real-time low-budget video conferencing with instant Urdu ⇄ English speech translation, subtitles, screen sharing, and chat.',
  keywords: [
    'LinguaMeet',
    'Urdu English Translation',
    'AI Meeting',
    'LiveKit WebRTC',
    'Multilingual Video Call',
    'Realtime Subtitles',
  ],
  authors: [{ name: 'Afaq Ahmad' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0B0F19] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
