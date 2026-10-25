# LinguaMeet Phase 2: Web Video Meeting MVP Verification & Two-Device Runbook

This document details the architecture, automated verification, and step-by-step test procedures for the Phase 2 functional web video meeting MVP built with **Next.js**, **TypeScript**, and **LiveKit WebRTC SFU**.

---

## 1. Architecture & Security Specifications

### Token Authorization & Protection
- **Endpoint**: `POST /api/meetings/token`
- **Validation**:
  - Room Code: Validated against `^[a-zA-Z0-9_-]{3,64}$`. Special characters, path traversals, or injections return `400 Bad Request`.
  - Display Name: Validated for length (1–50 characters) and non-whitespace content.
  - Role Assignment: Hosts receive `roomAdmin: true` grants in their signed JWT.
  - TTL (Token Lifetime): Strictly short-lived (`ttl: 3600` seconds / 1 hour).
- **Zero Secret Leakage**:
  - `LIVEKIT_API_SECRET` is used exclusively on the server to sign the JWT.
  - The secret is **never returned** to the client browser in response payloads or token metadata.
  - Verified by automated unit tests in `apps/web/test/token-auth.test.ts`.

### Translation Feature Flag
- In compliance with Phase 2 requirements, all AI translation features (subtitles dock and audio translation buttons) are guarded behind:
  ```env
  NEXT_PUBLIC_ENABLE_TRANSLATION=false
  ```
  Translation remains locked until Phase 1 validation is explicitly approved.

---

## 2. Automated Test Results

Run automated authorization and security verification:
```powershell
npm run test:auth --workspace=@linguameet/web
```

### Actual Output:
```text
===============================================================
   LinguaMeet - Phase 2: Token Authorization & Room Access Tests
===============================================================

--- 1. Room Code Validation ---
✅ [PASS] Valid room code formats are accepted
✅ [PASS] Invalid room codes are rejected

--- 2. Display Name Validation ---
✅ [PASS] Valid display names are accepted
✅ [PASS] Invalid display names are rejected

--- 3. Token Minting & Environment Validation ---
✅ [PASS] Throws error when LiveKit environment variables are missing

--- 4. Security Boundaries & Token Integrity ---
✅ [PASS] Issues valid short-lived JWT without exposing API secret
✅ [PASS] Host tokens correctly receive roomAdmin permissions

===============================================================
   TEST RESULTS: 7 PASSED | 0 FAILED
===============================================================
```

---

## 3. Two-Device Real-World Manual Test Runbook

While unit tests verify token generation, security isolation, and room authorization, full WebRTC SFU media routing requires two physical devices (or two distinct browser profiles on separate network interfaces) connected to a live LiveKit server instance.

### Prerequisites
1. Set up LiveKit credentials in `apps/web/.env.local`:
   ```env
   LIVEKIT_API_KEY=your_livekit_api_key
   LIVEKIT_API_SECRET=your_livekit_api_secret
   NEXT_PUBLIC_LIVEKIT_URL=wss://your-subdomain.livekit.cloud
   NEXT_PUBLIC_ENABLE_TRANSLATION=false
   ```
2. Start the dev server:
   ```powershell
   npm run dev --workspace=@linguameet/web
   ```

---

### Test Case 1: Multi-Peer Video and Audio Connection
- **Device A (Host - Laptop)**:
  1. Open `http://localhost:3005` in Chrome/Firefox.
  2. Click **New Meeting**.
  3. Enter name "Host Afaq" and click **Enter Room**.
  4. Verify camera and microphone publish successfully.
  5. Click the **Invite** button and copy the meeting URL.
- **Device B (Guest - Mobile/Second Browser)**:
  1. Open the copied meeting URL (e.g., `http://<LAN-IP>:3005/room/lingua-xxx-yyy` or incognito window).
  2. Enter name "Guest Tariq" and click **Join Meeting Now**.
- **Expected Outcome**:
  - Both Device A and Device B see each other's video stream within 1 second.
  - Audio from Device A is audible on Device B, and vice-versa.
  - Active speaker green ring illuminates when speaking.

---

### Test Case 2: In-Meeting Real-Time Chat over Data Channel
- **Device A**:
  1. Click the **Chat** icon in the bottom floating control bar.
  2. Send "Assalam-o-Alaikum, testing LiveKit data channel!".
- **Device B**:
  1. Observe the chat badge counter increment.
  2. Open chat drawer and verify the message appears with sender name "Host Afaq".
  3. Reply with "Walaikum Assalam, received loud and clear!".
- **Expected Outcome**:
  - Ultra-low latency (<50ms) message exchange via LiveKit Data Channel (`lk.chat`).

---

### Test Case 3: Desktop Screen Sharing
- **Device A (Laptop)**:
  1. Click **Screen Share** on the floating control bar.
  2. Select an application window or browser tab in the native OS prompt.
- **Device B (Mobile / Second Device)**:
  1. Observe screen share tile automatically appear in prominent layout.
- **Device A**:
  1. Click **Stop Screen Share**.
- **Expected Outcome**:
  - Screen share video renders smoothly in high resolution.
  - Removing screen share smoothly returns the video grid to standard camera view.

---

### Test Case 4: Mute and Camera Toggles
- **Procedure**:
  1. Toggle Microphone Mute on Device A. Observe mute badge on Device B's tile for Device A.
  2. Toggle Camera Off on Device A. Observe tile gracefully fall back to monogram avatar.
- **Expected Outcome**:
  - Remote peers immediately receive track muted/unmuted events without stream desynchronization.

---

### Test Case 5: Network Disconnection, Reconnection & Leave
- **Procedure**:
  1. Toggle Wi-Fi or disconnect network briefly on Device B.
  2. Observe the header pill transition: `Live` ➔ `Reconnecting...` (amber).
  3. Re-enable Wi-Fi.
  4. Observe the connection recover automatically to `Live` (emerald).
  5. Click **Leave Meeting** on Device B.
- **Expected Outcome**:
  - Device B disconnects cleanly, tracks stop, and user is redirected to `/`.
  - Device A immediately receives participant disconnected notification and updates roster count.
