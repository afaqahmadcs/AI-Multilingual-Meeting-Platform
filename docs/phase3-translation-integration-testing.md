# LinguaMeet - Phase 3 Translation Integration & Audio Testing Runbook

This document details the architecture, automated verification, and manual two-device audio testing procedures for LinguaMeet's real-time speech translation system.

---

## 1. Architecture & Audio Routing Guarantees

```mermaid
flowchart TD
    subgraph Speaker_Client["Speaker Client (Browser A)"]
        Mic["Microphone Input"] -->|WebRTC Audio Track| LK_Audio["LiveKit Audio Stream"]
        Mic -->|Clean Speech Slices (3.5s)| Chunker["MediaRecorder Slicer"]
        Consent{"Consent Granted?"}
        Chunker -->|Only if true| Consent
        Consent -->|FormData POST| API["/api/meetings/translate"]
    end

    subgraph Server_Pipeline["Server (Zero Data Retention)"]
        API --> STT["Speech-to-Text (Whisper / Azure)"]
        STT --> MT["Machine Translation (GPT-4o-mini / Azure)"]
        MT --> TTS["Text-to-Speech (Azure Neural ur-PK / en-US)"]
        TTS --> Payload["CaptionFrame & AudioPayload (RAM Only)"]
    end

    subgraph Data_Channel["LiveKit Data Channel"]
        Payload -->|Topic: lk.captions| DC_Cap["Subtitle Frame"]
        Payload -->|Topic: lk.tts_audio| DC_Aud["TTS Audio Payload"]
    end

    subgraph Listener_Client["Listener Client (Browser B)"]
        LK_Audio -->|Direct LiveKit SFU| Remote_Audio["Natural Peer Voice (WebRTC)"]
        DC_Cap --> Subtitles["Subtitles Dock (Dual Urdu & English)"]
        DC_Aud --> Filter{"Speaker != Self AND TargetLang == MyLang?"}
        Filter -->|Yes| Ducking["Auto-Ducking: Duck Remote WebRTC Voice to 20%"]
        Ducking --> TTS_Player["Isolated HTML Audio Element (Speakers/Headphones)"]
        TTS_Player -->|onended / onerror| Restore["Restore Remote Voice to 100%"]
    end
```

### Safety & Isolation Guarantees
1. **Zero Microphone Feedback Loops**:
   - Translated AI audio is played strictly through an isolated HTML5 `<Audio>` element directed to the listener's local speakers.
   - The audio is **NEVER** routed into `localParticipant.publishTrack` or the local microphone `MediaStream`.
   - The speaker's client automatically discards its own `lk.tts_audio` payloads (`payload.speakerId === localParticipant.identity`).
2. **Targeted Recipient Delivery**:
   - Audio payloads specify `targetLanguage`. Only participants whose `preferredLanguage` matches the payload will play the translated voice.
3. **Smart Voice Ducking**:
   - When the AI translated voice speaks, remote WebRTC audio is automatically ducked by 80% (to 0.2 volume).
   - On completion (`audio.onended`), volume is restored to 100%.
4. **Preserved Original Audio on Failure**:
   - If AI translation encounters rate limits (HTTP 429), timeouts, or empty speech, the original WebRTC peer voice continues uninterrupted without degradation or disconnects.
5. **Zero Data Retention**:
   - Audio slices are processed ephemerally in RAM (`Buffer`) on the server. No raw audio, wav files, or transcripts are stored to disk or database.
6. **Explicit Participant Consent**:
   - Audio chunking and AI transmission are blocked until the user explicitly accepts the `TranslationConsentModal`.

---

## 2. Automated Test Verification Summary

Run all tests via:
```bash
npm run test:auth --workspace=@linguameet/web
npm run test:translate --workspace=@linguameet/web
```

| Test Suite | Tests | Result | Features Verified |
| :--- | :---: | :---: | :--- |
| **Participant Consent** | 2 | ✅ PASS | Rejects 403 without consent; proceeds 200 with consent |
| **Language Pair Filtering** | 3 | ✅ PASS | Strictly restricts to `ur <-> en`; blocks `es -> en` (400) and `en -> en` (400) |
| **Feedback Loop Guard** | 2 | ✅ PASS | Self-speech payloads discarded; non-matching target language discarded |
| **Fallback & Latency** | 2 | ✅ PASS | Latency metrics returned; original audio preserved on empty or failed speech |
| **Token Authentication** | 7 | ✅ PASS | Room code regex, display name validation, short-lived tokens, zero secret leak |
| **Next.js Production Build** | 1 | ✅ PASS | Full production bundle compiles with zero TypeScript or bundling errors |

---

## 3. Manual Two-Device Audio Testing Protocol

The following real-world audio features require two physical devices or two separate browser profiles with distinct microphones and speakers/headphones:

### Prerequisites:
1. Two devices (e.g., Laptop A and Laptop B / Mobile) connected to the same local network or internet.
2. Device A user selects **English (`en`)** as preferred language.
3. Device B user selects **Urdu (`ur`)** as preferred language.
4. Set `.env.local`:
   ```bash
   NEXT_PUBLIC_ENABLE_TRANSLATION=true
   AI_TRANSLATOR_MODE=mock # Or provide AZURE_SPEECH_KEY and OPENAI_API_KEY
   ```

### Step-by-Step Test Scenarios:

#### Scenario A: Explicit Consent Opt-In
1. Device A joins the room.
2. Click **CC** (Subtitles) or **Voice Translation** on the bottom control bar.
3. **Verify**: `TranslationConsentModal` appears before any audio recording starts.
4. Click "Decline": Verify feature remains off, no microphone chunking occurs.
5. Click again and select "I Consent & Enable AI Translation": Verify consent is granted and status changes to "Listening".

#### Scenario B: English to Urdu Speech Translation
1. Device A (English) speaks into the microphone: *"Hello, welcome to our project review meeting."*
2. **Verify on Device A**:
   - Top header status switches from `Listening` -> `AI Translating` -> `Idle`.
   - Subtitles dock displays original English text and translated Urdu text.
   - **Crucial**: Device A hears NO translated audio (no feedback loop).
3. **Verify on Device B (Urdu)**:
   - Subtitles dock displays translated Urdu text with Urdu Nastaliq styling.
   - Translated Urdu speech plays through Device B's speakers.
   - Device A's original voice ducks to 20% while Urdu voice speaks, then restores to 100%.

#### Scenario C: Urdu to English Speech Translation
1. Device B (Urdu) speaks: *"ہماری میٹنگ کا ایجنڈا مکمل ہو چکا ہے"*
2. **Verify on Device B**:
   - No audio feedback loop occurs. Subtitles dock displays both transcripts.
3. **Verify on Device A (English)**:
   - Device A hears clear English speech output.
   - Device B's original voice ducks during English voice playback.

#### Scenario D: Independent Volume Mixers
1. Open the Audio Settings drawer (Sliders button in control bar).
2. Adjust "Original Speaker Audio" slider from 100% to 30%:
   - Verify remote WebRTC peer volume lowers.
3. Adjust "Translated AI Voice" slider to 100%:
   - Verify AI speech loudness remains high independently of the peer's natural voice.

#### Scenario E: Network / AI Error Resilience
1. Simulate provider timeout or disconnect internet on translation API.
2. Verify: Translation status shows error notice in drawer, but **LiveKit audio call remains connected** and original peer voices continue speaking without interruption.

#### Scenario F: Manual Quality Audit Feedback
1. In the Audio Settings drawer, select a star rating (1-5) and enter feedback: *"Clear pronunciation and low latency."*
2. Click "Submit Quality Audit".
3. Verify confirmation checkmark and review logged in session metrics.
