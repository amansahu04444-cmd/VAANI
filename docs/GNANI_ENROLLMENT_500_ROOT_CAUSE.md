# VAANI — Root Cause Analysis & Permanent Fix: Gnani Voice Enrollment HTTP 500

## 1. Executive Summary

When attempting to enroll a personal voice in VAANI by recording a 5–30 second voice sample, the user encountered the following provider error:

```json
GNANI_ENROLLMENT_ERROR (500)
{
  "success": false,
  "message": "We are facing technical difficulties. Please try again later.",
  "status_code": 500
}
```

This error blocked the extraction of the 768-dimensional speaker embedding tensor, leaving voice profiles inactive and preventing personal voice synthesis.

Investigation revealed that **Gnani's Voice Clone Embedding API (`https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`) is fully operational**, but its Python backend audio loader (`torchaudio` / `libsndfile`) crashes with an unhandled server exception when presented with **WebM/Opus compressed audio** produced by standard browser `MediaRecorder` APIs.

We resolved this permanently by introducing an in-browser 16-bit Linear PCM WAV audio engine (`AudioContext`), standardizing audio normalization to 16,000 Hz Mono WAV across both microphone recordings and file uploads, adding backend container inspection, and implementing the official Gnani MCP API contract.

---

## 2. Root Cause Analysis

### 2.1 Technical Investigation & Error Reproduction

1. **Browser Recording Format Mismatch:**
   - Chrome, Edge, and modern browsers implement `MediaRecorder` with `audio/webm;codecs=opus` as the default container format.
   - Browsers do not support direct WAV recording via `MediaRecorder` (`MediaRecorder.isTypeSupported('audio/wav')` evaluates to `false`).
   - `VoiceSetup.tsx` recorded microphone input via `MediaRecorder` and transmitted the WebM container payload with MIME type `audio/webm;codecs=opus`.

2. **Malformed WAV Wrapping on Backend:**
   - In `audio.utils.ts`, `ensureValidWavBuffer` checked for `RIFF`, `ID3/MP3`, and `OggS` magic byte signatures.
   - Because WebM begins with EBML signature bytes `\x1A\x45\xDF\xA3`, it fell through to the "raw PCM" branch.
   - The utility prepended a 44-byte RIFF WAVE header directly onto the raw WebM/Opus container data.

3. **Provider Crash at Gnani (`api.vachana.ai`):**
   - The official Gnani Voice Clone API expects standard uncompressed PCM audio (WAV, MP3, OGG, FLAC, M4A).
   - When Gnani's backend loader attempts to decode this file as a WAV, the EBML chunk data causes an unhandled decoding crash.
   - FastAPI catches the unhandled exception and yields HTTP 500:
     ```json
     {"success": false, "message": "We are facing technical difficulties. Please try again later.", "status_code": 500}
     ```

### 2.2 Live Reproduction Test Results

| Audio Payload Sent to `api.vachana.ai/api/v1/tts/voice-clone/embeddings` | HTTP Status | Response |
| :--- | :---: | :--- |
| **WebM EBML Payload** (`audio/webm`) | **500 Internal Server Error** | `{"success":false,"message":"We are facing technical difficulties. Please try again later.","status_code":500}` |
| **WebM wrapped with RIFF header** (`audio/wav`) | **500 Internal Server Error** | `{"success":false,"message":"We are facing technical difficulties. Please try again later.","status_code":500}` |
| **16kHz 16-bit Linear PCM WAV** (`audio/wav`) | **200 OK** | `{"success":true,"hasData":true,"shape":[1, 768]}` |
| **44.1kHz 16-bit Linear PCM WAV** (`audio/wav`) | **200 OK** | `{"success":true,"hasData":true,"shape":[1, 768]}` |

---

## 3. Official Gnani Voice Cloning Contract

Inspecting the official `gnani-mcp` (v0.2.1) specification confirmed the exact two-stage workflow:

### Step 1 — Speaker Embedding Extraction
- **Endpoint:** `POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`
- **Headers:**
  - `X-API-Key-ID: <GNANI_API_KEY>`
  - `X-Source: mcp` (identifies client channel for routing and attribution)
- **Multipart Form Field:** `audio_file: (<filename>, <bytes>, <mime_type>)`
- **Response Payload:**
  ```json
  {
    "success": true,
    "message": "Voice embeddings generated successfully",
    "data": {
      "voice_clone_embedding": {
        "embedding": "<base64_encoded_bfloat16_vector>",
        "shape": [1, 768],
        "dtype": "torch.bfloat16"
      }
    }
  }
  ```

### Step 2 — Cloned Speech Synthesis
- **Endpoint:** `POST https://api.vachana.ai/api/v1/tts/inference`
- **Headers:**
  - `X-API-Key-ID: <GNANI_API_KEY>`
  - `X-Source: mcp`
  - `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "text": "नमस्ते! वाणी वॉइस क्लोनिंग अब पूरी तरह से सक्रिय है।",
    "model": "vachana-vc-v1",
    "speaker_embedding": {
      "embedding": "<base64>",
      "shape": [1, 768],
      "dtype": "torch.bfloat16"
    },
    "audio_config": {
      "container": "wav",
      "encoding": "linear_pcm",
      "sample_rate": 16000
    }
  }
  ```
- **Response:** Raw binary audio stream (`audio/wav`), successfully generating 94,684 bytes of cloned speech during live tests.

---

## 4. Architectural Fix & Implementation

### 4.1 In-Browser 16kHz PCM WAV Audio Engine (`client/src/lib/audioRecorder.ts`)
- **`BrowserPcmRecorder`:** Captures raw audio via Web Audio API (`AudioContext` and `ScriptProcessorNode`).
- **Downsampling Algorithm:** Dynamically resamples native browser hardware rates (e.g., 48,000 Hz or 44,100 Hz) down to 16,000 Hz mono via linear interpolation box filter.
- **`encodeWavBlob`:** Directly constructs the standard 44-byte RIFF header and encodes 16-bit signed PCM samples (`-32768` to `32767`).
- **`normalizeToWav`:** Uses browser native `decodeAudioData` to convert any uploaded file (`.wav`, `.mp3`, `.m4a`, `.ogg`) into 16,000 Hz mono 16-bit PCM WAV before transmission.

### 4.2 Studio Recording UI (`client/src/pages/VoiceSetup.tsx`)
- Integrated `BrowserPcmRecorder` to record directly into clean WAV format.
- Added live audio normalization on uploaded samples via `normalizeToWav`.
- Replaced optimistic success with explicit multi-step progress indicators and actionable error banners.

### 4.3 Audio Inspection & Validation (`server/src/modules/audio/audio.utils.ts`)
- Added magic-byte detection for WebM EBML containers (`\x1A\x45\xDF\xA3`), FLAC (`fLaC`), and M4A (`ftyp`).
- Updated `ensureValidWavBuffer` to explicitly reject WebM payloads with `AUDIO_FORMAT_UNSUPPORTED`, preventing corrupted WAV wrapping.

### 4.4 Gnani Provider Adapters (`server/src/providers/gnani/`)
- Updated `GnaniVoiceEnrollmentAdapter`:
  - Added `X-Source: mcp` header.
  - Added pre-flight audio buffer inspection.
  - Increased network timeout to 30s.
  - Added structured error mapping for provider 500, 401, 403, and 429 status codes.
- Updated `GnaniTimbreClient`:
  - Added `X-Source: mcp` header for unified client attribution.

### 4.5 Enrollment Pipeline & Guards (`server/src/modules/voice/voice.routes.ts`)
- Validates audio format (`inspectAudioBuffer`) and duration (5–30s) before contacting Gnani.
- Stores normalized WAV in Supabase Storage (`voice-samples`).
- Preserves existing active profiles if a re-recording attempt fails (Safe Update Rule).
- Validates 768-dim tensor shape before marking profile `ready`.

---

## 5. Verification & Test Results

### 5.1 Test Suite Coverage
All **11 test suites** comprising **91 tests** pass without error:

```
Test Files  11 passed (11)
     Tests  91 passed (91)
  Start at  21:17:48
  Duration  36.91s
```

1. `src/__tests__/voice_embedding_e2e.test.ts` (13 tests) — Auto-healing, new enrollment, safe update, tensor validation, WebM rejection, duration checks, provider 500 resilience.
2. `src/__tests__/gnani_provider.test.ts` (10 tests) — Official Timbre v2.5 schemas, `X-Source: mcp` headers, error envelopes, capability guards.
3. `src/__tests__/audio_library_playback.test.ts` (13 tests) — RIFF repair, playback URL issuance, range requests, signed streaming.
4. `src/__tests__/speech_routes.test.ts` (8 tests) — Standard Timbre synthesis, personal voice synthesis, polling, permissions.
5. `src/__tests__/signup_flow.test.ts` (11 tests) — Validation, auth provisioning, duplicate checks, profile sync.
6. `src/__tests__/supabase_integration.test.ts` (17 tests) — Health checks, auth middleware, connection diagnostics.
7. `src/__tests__/security_hardening.test.ts` (4 tests) — Rate limiting, revoked profile blocking, secret sanitization.
8. `src/__tests__/user_isolation.test.ts` (6 tests) — RLS boundaries, multi-tenant asset protection.
9. `src/__tests__/auth.test.ts` (5 tests) — JWT validation, token spoofing prevention.
10. `src/__tests__/storage.test.ts` (3 tests) — Private storage security, signed URL expiry.
11. `src/__tests__/e2e_user_journey.test.ts` (1 test) — Full user lifecycle verification.

### 5.2 Build & Lint Verification
- **Client Build (`tsc -b && vite build`):** Exit code `0` (clean production bundle).
- **Client Linter (`oxlint`):** `0 warnings, 0 errors` across 57 files.
- **Server Build (`tsc`):** Exit code `0` (clean TypeScript compilation).
