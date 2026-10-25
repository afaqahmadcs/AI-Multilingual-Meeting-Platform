# LinguaMeet 🌐🎙️
> Low-Budget AI-Powered Multilingual Meeting Platform featuring Real-Time Urdu ⇄ English Audio & Subtitle Translation.

---

## 📌 Overview

**LinguaMeet** is an open-source, scalable, and low-budget meeting platform designed to eliminate language barriers in real-time meetings. Featuring native support for **Urdu-to-English** and **English-to-Urdu** translated speech and subtitles, LinguaMeet delivers a seamless meeting experience across desktop web browsers and native Android devices.

### 🎯 Key Capabilities
- **Web & Mobile Ready**: Next.js 14 Web App + React Native (Expo Prebuild / Dev Client) Android App.
- **Ultra-Low Latency SFU**: LiveKit WebRTC for video, audio, and screen sharing.
- **Provider-Independent AI Translation**: Decoupled adapter layer for Speech-to-Text (STT), Machine Translation (MT), and Text-to-Speech (TTS).
- **RTL & Nastaliq Typography**: Native Urdu script rendering with Right-to-Left alignment.
- **Secure Architecture**: Server-side LiveKit JWT minting, Supabase Auth, and Row Level Security (RLS).

---

## 🏗️ Architecture & Monorepo Structure

```
AI Multilingual Meeting Platform/
├── apps/
│   ├── web/                     # Next.js 14 App Router (Web Client + Token API)
│   └── mobile/                  # React Native with Expo (Android Client)
├── packages/
│   ├── types/                   # Shared TypeScript models and event contracts
│   ├── ai-translator/           # Modular STT, MT, and TTS Adapter System & PoC
│   └── supabase-config/         # Database migrations and RLS policies
├── .env.example                 # Environment configuration template
├── package.json                 # Monorepo workspace configuration
└── turbo.json                   # Build & test task orchestrator
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- (For Android) Android Studio & JDK 17

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `apps/web/.env.local`:
```bash
cp .env.example apps/web/.env.local
```

### 4. Running the Translation PoC
Validate Urdu ⇄ English translation before launching meetings:
```bash
npm run test:poc --workspace=@linguameet/ai-translator
```

### 5. Running Web Development Server
```bash
npm run dev --workspace=@linguameet/web
```

---

## 🛡️ Security & Privacy
- API secrets (LiveKit Secret, OpenAI Key, Azure Key) are never shipped to client bundles.
- Meeting links use cryptographically signed tokens with expiring TTL.
- All database tables enforce strict Supabase Row Level Security (RLS).

---

## 📄 License
MIT License. Created by [Afaq Ahmad](https://github.com/afaqahmadcs).
