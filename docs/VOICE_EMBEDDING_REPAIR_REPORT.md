# VAANI — VOICE CLONING & SPEAKER EMBEDDING REPAIR REPORT
**Task:** Permanent Resolution for "Missing Speaker Embedding Tensor" in Personal Voice Synthesis  
**Date:** November 6, 2026  
**Status:** Verified & Resolved (11/11 Test Suites Passing, 86/86 Unit & E2E Tests Green)  

---

## 1. Executive Summary

When attempting speech synthesis in **Personal Voice** mode using an enrolled custom voice, the VAANI platform surfaced the error:
> *"Your enrolled voice profile is missing an active speaker embedding tensor. Please re-record your voice sample."*

Despite re-recording voice samples in the `VoiceSetup` interface, users were caught in an endless loop where re-recording consistently reproduced the same error. 

A thorough root-cause audit revealed architectural breaks spanning the frontend audio ingestion pipeline, backend enrollment routing, provider adapter schemas, and Gnani AI model contracts. All defects have now been completely diagnosed, resolved, verified against Gnani AI's live `vachana.ai` production API, covered by automated end-to-end regression tests, and fully integrated with zero client/server compilation errors.

---

## 2. Root Cause Analysis

### A. Frontend Audio Ingestion & Fake Success Loop (`VoiceSetup.tsx`)
1. **Mock Timer instead of Audio Capture:** `VoiceSetup.tsx` previously utilized a mock `setInterval` counter without invoking `navigator.mediaDevices.getUserMedia` or instantiating a `MediaRecorder`. No actual audio data was captured from the user's microphone.
2. **Missing Binary Serialization for Uploaded Files:** When users uploaded a `.wav` or `.mp3` file, only `file.name` was stored in React state. The actual file buffer was never converted into base64 or transferred to the backend.
3. **Empty Payload in API Invocation:** The client called `voiceApi.enroll({ consentAccepted: true, ... })` without providing any `audioBase64` or `mimeType` payload.
4. **Silent Mock Fallback Masking Errors:** A generic `try...catch` block in `handleSubmitEnrollment()` caught errors and silently updated UI state to `status: 'ready'` with an artificial notice (`"Profile active in studio session"`), misleading users into believing their voice had been enrolled when no audio had ever left their browser.

### B. Backend Mock Voice Profile Persistence (`voice.routes.ts`)
1. In `server/src/modules/voice/voice.routes.ts`, `POST /api/voice/enroll` previously hardcoded:
   ```typescript
   provider_voice_ref: 'enc_embedding_vector_sample'
   ```
2. Because this value was a dummy static string rather than a serialized JSON structure with an `embedding` tensor, subsequent requests in `speech.routes.ts` failed JSON validation and threw:
   ```json
   {
     "error": "VOICE_EMBEDDING_INVALID",
     "message": "Your enrolled voice profile is missing an active speaker embedding tensor. Please re-record your voice sample in Voice Setup."
   }
   ```
   Re-recording merely re-invoked the same mock save, creating the infinite loop.

### C. Gnani AI Voice Clone Schema Nuances
1. **FastAPI Multipart Field Name:** Gnani AI's voice clone embedding extraction endpoint (`POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`) rejects payloads with field name `file` (returning `400 Field required at body -> audio_file`). The form field name must strictly be `audio_file`.
2. **Response Envelope Structure:** Gnani's embedding API wraps the tensor inside `response.data.voice_clone_embedding`, containing:
   - `embedding`: Base64-encoded float vector.
   - `shape`: `[1, 768]`.
   - `dtype`: `torch.bfloat16`.
3. **Inference Model Selection Contract:** When invoking `POST https://api.vachana.ai/api/v1/tts/inference` with `speaker_embedding`, passing `model: 'timbre-v2.5'` triggers an immediate FastAPI `400 Value error: speaker_embedding is only supported with models: vachana-vc-v1`. The synthesis request must specify `model: 'vachana-vc-v1'`.

---

## 3. Implemented Engineering Fixes

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      VAANI VOICE CLONING PIPELINE                         │
└───────────────────────────────────────────────────────────────────────────┘
   [Microphone Capture] / [WAV/MP3 Upload]
              │
              ▼
   Base64 Audio Packaging (`VoiceSetup.tsx`)
              │
              ▼ (POST /api/voice/enroll)
   Supabase Storage Upload (`voice-samples/${userId}/...`)
              │
              ▼ (audio_file: WAV buffer)
   Gnani AI Voice Clone (`/api/v1/tts/voice-clone/embeddings`)
              │
              ▼
   Tensor Validation: shape [1, 768], dtype 'torch.bfloat16'
              │
              ▼
   Supabase DB Persistence (`voice_profiles.provider_voice_ref`)
              │
              ▼ (POST /api/speech/generate, voiceMode: 'personal')
   Gnani Inference Engine (`/api/v1/tts/inference`, model: 'vachana-vc-v1')
              │
              ▼
   High-Fidelity Personalized Synthesized Speech (WAV)
```

### 1. Frontend Audio Engine Overhaul (`client/src/pages/VoiceSetup.tsx`)
- Integrated native `MediaRecorder` API backed by `navigator.mediaDevices.getUserMedia` with fallback codec detection (`audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`, `audio/wav`).
- Added lossless `.wav` and `.mp3` file reader with metadata inspection to determine exact recording duration.
- Created local audio preview player (`HTMLAudioElement`) with interactive play/pause controls so users can review their voice recording before biometric enrollment.
- Implemented real multi-stage progress indicators (`"Packaging reference audio buffer"`, `"Uploading sample to private Supabase bucket"`, `"Extracting 768-dim speaker embedding tensor via Gnani Vachana"`).
- Completely eliminated mock silent fallbacks. Real server error codes and actionable recovery instructions are surfaced to the user.

### 2. Client API Contract Update (`client/src/lib/api.ts`)
- Updated `voiceApi.enroll` to accept `audioBase64?: string` and `mimeType?: string`.
- Added `hasSpeakerEmbedding` boolean check to `UserVoiceProfile` to guard against corrupted or un-embedded profiles.

### 3. Backend Route & Safe Update Rule (`server/src/modules/voice/voice.routes.ts`)
- Accepted base64 audio and decoded it into an audio buffer.
- Enforced upload of the raw voice sample to private Supabase Storage (`voice-samples/${userId}/...`).
- Invoked `gnaniProvider.enrollVoice(...)` to extract the 768-dimensional tensor.
- **Safe Update Rule:** If an enrolled user with an already working voice profile re-records, but the new audio sample fails quality checks or provider extraction, their existing active profile is **preserved** and a `502` error is returned with specific guidance. The user's active profile is never corrupted.
- Persisted verified tensor JSON string in `voice_profiles.provider_voice_ref`.

### 4. Gnani Provider Adapter Fixes (`server/src/providers/gnani/`)
- In `voiceEnrollment.adapter.ts`, updated multipart field to `audio_file` and unwrapped `json.data?.voice_clone_embedding`.
- In `providers/gnani/index.ts`, updated `synthesizeWithSpeakerEmbedding` to use `model: 'vachana-vc-v1'`.
- In `providers/gnani/timbre.client.ts`, refined error handling to preserve upstream HTTP statuses (`400`, `401`, `403`, `429`).

### 5. Speech Synthesis Route Guard (`server/src/modules/speech/speech.routes.ts`)
- Validates that `voiceMode: 'personal'` has an active voice profile containing a valid `{ embedding: "..." }` tensor prior to synthesis.
- Throws specific `400 VOICE_EMBEDDING_INVALID` if tensor is absent or corrupted.
- Successfully routes personal voice synthesis to `gnaniProvider.synthesizeWithSpeakerEmbedding` using `model: 'vachana-vc-v1'`.

---

## 4. Verification & Testing

### A. Live Provider Verification (Gnani AI Production API)
- Tested live voice cloning embedding extraction:
  - **Endpoint:** `POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`
  - **Result:** `HTTP 200 OK`, returned shape `[1, 768]`, dtype `torch.bfloat16`.
- Tested live personal voice synthesis:
  - **Endpoint:** `POST https://api.vachana.ai/api/v1/tts/inference`
  - **Model:** `vachana-vc-v1`
  - **Result:** `HTTP 200 OK`, synthesized 326KB audio stream.

### B. Automated Test Suite (11 Test Suites, 86 Tests)
- All 11 test suites passed with 0 failures:
  - `server/src/__tests__/voice_embedding_e2e.test.ts` (8 tests) — PASSED
  - `server/src/__tests__/speech_routes.test.ts` (8 tests) — PASSED
  - `server/src/__tests__/user_isolation.test.ts` (6 tests) — PASSED
  - `server/src/__tests__/e2e_user_journey.test.ts` (1 test) — PASSED
  - `server/src/__tests__/security_hardening.test.ts` (4 tests) — PASSED
  - `server/src/__tests__/audio_library_playback.test.ts` (13 tests) — PASSED
  - `server/src/__tests__/signup_flow.test.ts` (11 tests) — PASSED
  - `server/src/__tests__/supabase_integration.test.ts` (17 tests) — PASSED
  - `server/src/__tests__/auth.test.ts` (5 tests) — PASSED
  - `server/src/__tests__/gnani_provider.test.ts` (10 tests) — PASSED
  - `server/src/__tests__/storage.test.ts` (3 tests) — PASSED

### C. Build & Linting Verification
- `client:lint`: Oxlint passed with **0 warnings and 0 errors** across all 56 client files.
- `client:build`: Vite + TypeScript compiler built production assets cleanly.
- `server:build`: TypeScript compiler built server production bundle cleanly.

---

## 5. Modified Files Summary

| File | Changes Made |
|:---|:---|
| [`client/src/pages/VoiceSetup.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/VoiceSetup.tsx) | Implemented real `MediaRecorder` audio capture, audio file upload, base64 conversion, local preview player, multi-step progress, and real server error display. |
| [`client/src/lib/api.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/lib/api.ts) | Added `audioBase64` and `mimeType` parameters to `voiceApi.enroll`; added `hasSpeakerEmbedding` profile field. |
| [`client/src/App.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/App.tsx) | Checked `profile.hasSpeakerEmbedding` on initial load to prevent false positives. |
| [`server/src/app.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/app.ts) | Increased `express.json` limit to `25mb` for base64 audio sample uploads. |
| [`server/src/modules/voice/voice.routes.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/modules/voice/voice.routes.ts) | Accepted audio buffer, uploaded to Supabase storage, invoked Gnani VC extraction, implemented Safe Update Rule, and saved verified 768-dim tensor. |
| [`server/src/modules/speech/speech.routes.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/modules/speech/speech.routes.ts) | Validated `personalEmbedding.embedding` tensor and passed it to `vachana-vc-v1` synthesis. |
| [`server/src/providers/gnani/voiceEnrollment.adapter.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/providers/gnani/voiceEnrollment.adapter.ts) | Fixed multipart field name to `audio_file` and unwrapped `json.data.voice_clone_embedding`. |
| [`server/src/providers/gnani/index.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/providers/gnani/index.ts) | Set `model: 'vachana-vc-v1'` for `synthesizeWithSpeakerEmbedding`. |
| [`server/src/db/repository.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/db/repository.ts) | Seeded mock evaluation profiles with verified 768-dim tensors and added `getConsentEvents`. |
| [`server/src/__tests__/voice_embedding_e2e.test.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/__tests__/voice_embedding_e2e.test.ts) | Added 8 automated tests for enrollment, safe updates, profile retrieval, personal synthesis, and revocation. |
