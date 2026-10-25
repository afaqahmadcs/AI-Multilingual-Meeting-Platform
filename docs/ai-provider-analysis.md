# LinguaMeet: AI Provider Analysis & Benchmarks for Urdu ⇄ English

This document provides verified information gathered from official documentation on speech recognition (STT), machine translation (MT), and text-to-speech (TTS) providers with specific focus on **Urdu (`ur-PK` / `ur`)** and **English (`en-US` / `en`)**.

---

## 1. Provider Capabilities Matrix for Urdu & English

| Provider | Service | Urdu (`ur`) Support Status | English (`en`) Support Status | Official Pricing | Limitations & Gotchas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **OpenAI Whisper** | STT | **Supported (`ur`)**<br/>Good transcription of standard Urdu, phonetics, and Nastaliq vocabulary. | **Tier-1 Native (`en`)**<br/>Ultra-high accuracy. | **$0.006 / minute** | • Chunked only via `/v1/audio/transcriptions` (25MB file limit).<br/>• Real-time WebSocket streaming requires the new Realtime API ($0.06/min audio input, 10x cost).<br/>• Tends to hallucinate during silent segments. |
| **OpenAI GPT-4o-mini** | MT | **Exceptional**<br/>Understands Urdu nuances, idioms, Nastaliq, and colloquial code-switching (Urdish). | **Tier-1 Native** | **$0.150 / 1M input tokens**<br/>**$0.600 / 1M output tokens** | • Chat completion latency ~250–500ms.<br/>• Must enforce system prompts to prevent conversational preamble ("Here is the translation:"). |
| **OpenAI TTS-1** | TTS | **UNSUPPORTED / FAILS**<br/>OpenAI does not train or optimize `tts-1` for Urdu. Urdu text is either read with an unnatural Arabic pronunciation, distorted, or rejected. | **Tier-1 Native**<br/>Natural voices (alloy, echo, fable, onyx, nova, shimmer). | **$15.00 / 1M characters** (standard)<br/>**$30.00 / 1M characters** (HD) | **CRITICAL BLOCKER FOR URDU**: Cannot be used for Urdu speech generation. Must use Azure or Google Cloud. |
| **Microsoft Azure Speech** | STT | **Supported (`ur-PK`, `ur-IN`)**<br/>High accuracy Pakistani Urdu acoustic model. | **Tier-1 Native (`en-US`)** | **$1.00 / hour** (Standard)<br/>**Free F0 Tier**: 5 hours/month | • Supports real-time WebSocket streaming via Azure Speech SDK.<br/>• Requires subscription key and region. |
| **Microsoft Azure Translator** | MT | **Supported (`ur` ⇄ `en`)**<br/>Fast neural machine translation. | **Tier-1 Native** | **$10.00 / 1M characters**<br/>**Free F0 Tier**: 2M characters/month | • Fast latency (~150ms).<br/>• Slightly less colloquial than GPT-4o-mini for code-mixed speech, but highly reliable. |
| **Microsoft Azure Neural TTS** | TTS | **INDUSTRY BEST FOR URDU**<br/>`ur-PK-UzmaNeural` (Female)<br/>`ur-PK-AsadNeural` (Male)<br/>`ur-IN-GulNeural`, `ur-IN-SalmanNeural` | **Tier-1 Native**<br/>`en-US-JennyNeural`, `en-US-GuyNeural` | **$15.00 / 1M characters**<br/>**Free F0 Tier**: 0.5M characters/month | • Crystal-clear natural Urdu cadence, stress, and pronunciation.<br/>• SSML customizable (pitch, rate, volume). |
| **Google Cloud Speech-to-Text v2** | STT | **Supported (`ur-PK`)** | **Tier-1 Native** | **$0.016 / minute** standard<br/>$300 new account credit | • Good Pakistani Urdu acoustic model.<br/>• Requires GCP service account JSON credentials. |
| **Google Cloud Text-to-Speech** | TTS | **Supported (`ur-PK-Wavenet-A`, `ur-PK-Standard-A`)** | **Tier-1 Native (Neural2, Journey)** | **$16.00 / 1M characters** (Wavenet)<br/>**$4.00 / 1M characters** (Standard) | • Good natural voice, though slightly less emotional expressiveness than Azure Uzma/Asad. |
| **Deepgram Nova-2** | STT | **BETA / LIMITED URDU**<br/>Nova-2 is trained predominantly on high-resource languages; Urdu word error rate is unacceptably high for production meetings. | **Ultra-Low Latency (<150ms)** | **$0.0043 / minute** | • Reject for Urdu. Excellent for English-only. |
| **ElevenLabs** | TTS | **Supported via Multilingual v2** | **Tier-1 Native** | **$0.30 / 1,000 characters** (high cost) | • Too expensive for low-budget meetings (~20x Azure cost). |

---

## 2. Selected Low-Budget Production Architecture

To maintain the lowest cost while delivering the highest Urdu pronunciation fidelity:

```
[Spoken Audio]
       │
       ▼
1. Speech-to-Text (STT)
   • Primary: OpenAI Whisper (or Azure Speech `ur-PK`)
   • Fallback: Mock STT for zero-credit test environments
       │
       ▼
2. Machine Translation (MT)
   • Primary: OpenAI GPT-4o-mini (Unbeatable on Pakistani code-mixed slang & idioms)
   • Alternative: Azure Translator (Free 2M chars/month)
       │
       ▼
3. Text-to-Speech (TTS)
   • Urdu Target: Microsoft Azure Neural (`ur-PK-UzmaNeural` / `ur-PK-AsadNeural`)
   • English Target: Azure Neural (`en-US-JennyNeural`) or OpenAI `tts-1` (`nova`)
```

---

## 3. Data Privacy & Handling
- Audio buffers uploaded to `/api/poc/pipeline` are processed in-memory (RAM buffer) and never written to permanent disk.
- Provider API calls use SSL/TLS encryption.
- No client-side permanent credentials: all keys (`OPENAI_API_KEY`, `AZURE_SPEECH_KEY`) reside strictly in server `.env.local`.
