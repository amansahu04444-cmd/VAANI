# VAANI — Phase 3 Gnani Timbre Integration Spike & Capability Report

**Project:** VAANI (Multilingual Personal Voice Studio)  
**Date:** 03 November 2026  
**Execution Phase:** Phase 3 (Gnani Timbre TTS Integration, Schema Verification & Capability Spike)  
**Status:** Architecture Implemented & 24/24 Automated Tests Passed  
**Live Credential Status:** **ACTION REQUIRED / BLOCKER** (Participant `GNANI_API_KEY` must be populated in `server/.env`)

---

## 1. Executive Summary

Phase 3 establishes the official **Gnani AI Timbre v2.5** backend integration layer for speech synthesis, along with an isolated adapter for voice cloning embedding extraction.

In strict adherence to the **Master Development Instructions**:
* **Never invent an endpoint:** All requests map directly to official Gnani API routes:
  - Standard TTS: `POST https://api.vachana.ai/api/v1/tts/inference`
  - Voice Clone Embeddings: `POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`
* **Never fake a voice clone:** If `GNANI_CUSTOM_VOICE_ENABLED` is `false` or if the participant key lacks VC entitlements (403/404), the adapter raises a typed `PROVIDER_CAPABILITY_UNAVAILABLE` error and falls back to standard Timbre voices without falsifying the user's vocal identity.
* **Reproducible Test Suite:** 24 automated tests verify parameter constraints, authentication headers, error envelopes, and user isolation.
* **Standalone CLI Spike:** `npm run spike:gnani` provides one-command execution of live API calls.

---

## 2. Verified Capabilities & Proof Table

| Feature / Claim | Official Source | Code Implemented | Tested | Status / Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **TTS Base URL** | `docs.gnani.ai/api/TTS` | `https://api.vachana.ai` | YES | Verified in `GnaniTimbreClient` |
| **Authentication Header** | Gnani REST Spec | `X-API-Key-ID: <key>` | YES | Tested in `gnani_provider.test.ts` |
| **Synthesis Schema** | Official Documentation | `TimbreSynthesisPayloadSchema` | YES | Text (1–1000 chars), language, speed (0.85–1.15), 48kHz WAV |
| **Supported Locales** | `docs.gnani.ai/api/TTS` | 11 Locales | YES | `hi-IN`, `en-IN`, `auto` (Hinglish), `ta-IN`, `te-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `bn-IN`, `gu-IN`, `pa-IN` |
| **Standard Voice Roster** | Timbre v2.5 catalogue | 22 voices (`Nalini`, `Pranav`, etc.) | YES | Verified in `STANDARD_TIMBRE_VOICES` |
| **Voice Clone Embedding** | `docs.gnani.ai/api/VC` | `GnaniVoiceEnrollmentAdapter` | YES | `multipart/form-data` audio -> `[1, 768]` `torch.bfloat16` |
| **Custom Voice Synthesis** | `gnani-vachana` SDK | `speaker_embedding` object | YES | Tested schema omitting `voice` when embedding supplied |
| **Live API Key Configured** | Local Environment | `server/.env` | **PENDING** | **BLOCKER:** Participant must enter key into `server/.env` |

---

## 3. Official Request & Response Contracts

### 3.1 Standard Timbre Speech Synthesis
- **Endpoint:** `POST https://api.vachana.ai/api/v1/tts/inference`
- **Headers:**
  ```http
  Content-Type: application/json
  X-API-Key-ID: <GNANI_API_KEY>
  ```
- **Request Payload:**
  ```json
  {
    "text": "नमस्ते, यह वाणी स्टूडियो का एक परीक्षण ऑडियो है।",
    "voice": "Nalini",
    "model": "timbre-v2.5",
    "language": "hi-IN",
    "speed": 1.0,
    "audio_config": {
      "encoding": "linear_pcm",
      "container": "wav",
      "num_channels": 1,
      "sample_rate": 48000,
      "sample_width": 2
    }
  }
  ```
- **Response:** Raw binary audio stream (`audio/wav`, 48,000 Hz, 16-bit Linear PCM).

### 3.2 Voice Cloning Speaker Embedding Extraction
- **Endpoint:** `POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`
- **Headers:** `X-API-Key-ID: <GNANI_API_KEY>`, `Content-Type: multipart/form-data`
- **Request Body:** Audio file (5–30s clean WAV/MP3, mono).
- **Expected Response (200 OK):**
  ```json
  {
    "speaker_embedding": {
      "embedding": "<base64_encoded_string>",
      "shape": [1, 768],
      "dtype": "torch.bfloat16"
    }
  }
  ```

---

## 4. Test Suite & Verification Results

```powershell
> cd server
> npm test
 ✓ src/__tests__/gnani_provider.test.ts (10 tests)
   ✓ accepts valid official Timbre v2.5 synthesis payload
   ✓ rejects synthesis text exceeding 1000 characters
   ✓ rejects unsupported language locale codes
   ✓ rejects speech rates outside official bounds [0.85, 1.15]
   ✓ validates speaker embedding tensor shape and dtype
   ✓ throws GNANI_CREDENTIALS_MISSING when GNANI_API_KEY is not configured
   ✓ correctly constructs request with X-API-Key-ID and parses audio response
   ✓ maps HTTP 401 response to GNANI_AUTH_FAILED error
   ✓ returns PROVIDER_CAPABILITY_UNAVAILABLE when endpoint returns 404 or 403
   ✓ reports truthful capability status through GnaniProvider

 ✓ src/__tests__/storage.test.ts (3 tests)
 ✓ src/__tests__/auth.test.ts (5 tests)
 ✓ src/__tests__/user_isolation.test.ts (6 tests)

Test Files  4 passed (4)
     Tests  24 passed (24)
  Duration  5.24s
```

---

## 5. Current Blockers & Next Actions for Participant

> [!IMPORTANT]
> **Action Required before Live Synthesis:**
> To execute live HTTP calls against the Gnani AI cloud:
> 1. Register for the Great Indian AI Internship Challenge at:
>    [https://www.gnani.ai/great-indian-ai-internship-registration-form](https://www.gnani.ai/great-indian-ai-internship-registration-form)
> 2. Copy your allocated API Key.
> 3. Create `server/.env` and add:
>    ```env
>    GNANI_API_KEY="your-actual-api-key"
>    ```
> 4. Run the live test command:
>    ```powershell
>    cd server
>    npm run spike:gnani
>    ```
>    This will make an actual live HTTP call to `https://api.vachana.ai/api/v1/tts/inference`, save a live `spike_output.wav` file to disk, and probe account entitlement for custom voice enrollment.

