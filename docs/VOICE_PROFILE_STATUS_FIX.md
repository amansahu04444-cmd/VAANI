# VAANI — VOICE PROFILE STATUS & SPEAKER EMBEDDING INCONSISTENCY RESOLUTION

**Document:** `docs/VOICE_PROFILE_STATUS_FIX.md`  
**Date:** November 6, 2026  
**Status:** Verified, Resolved & Integrated (11/11 Test Suites Passing, 88/88 Tests Green)  

---

## 1. Observed Problem & Visual Diagnosis

### The Inconsistency
In the VAANI user interface, the following contradictory states were simultaneously observed:
1. **Header / Navbar:** Displayed `VOICE: ACTIVE` (with green active pulse badge).
2. **Speech Studio Emitter Toggle:** Displayed `Cloned Voice Active` (Personal Mode enabled).
3. **Speech Studio Generation Attempt:** Displayed the error banner:
   > *"Your enrolled voice profile is missing an active speaker embedding tensor. Please re-record your voice sample."*

This revealed a critical architectural discrepancy: **the frontend was assuming that a user possessed an active voice profile when the backend had no usable speaker embedding tensor for speech synthesis.**

---

## 2. Root Cause Analysis

### A. Naive Substring Matching in `GET /api/voice/me`
In `server/src/modules/voice/voice.routes.ts`, `GET /api/voice/me` previously calculated `hasSpeakerEmbedding` via:
```typescript
hasSpeakerEmbedding: Boolean(profile.provider_voice_ref && profile.provider_voice_ref.includes('embedding'))
```
When historical prototyping code seeded or saved:
```typescript
provider_voice_ref: 'enc_embedding_vector_sample'
```
Because the static string `'enc_embedding_vector_sample'` contained the substring `'embedding'`, `hasSpeakerEmbedding` evaluated to **`true`**. The backend returned `hasSpeakerEmbedding: true` to the client despite the database holding a fake string instead of a 768-dimensional float tensor.

### B. Inconsistent Database Record in Supabase
Direct inspection of the live Supabase PostgreSQL database revealed:
```
Table: public.voice_profiles
Row: id = '660e88df-035b-4e1b-a5b3-573b636e8ed9'
user_id = 'b7a16921-798d-4eec-ae1f-9f3957d5d818'
status = 'ready'
provider_voice_ref = 'enc_embedding_vector_sample'
```
The database column `status` had been set to `'ready'` during a previous mock run without an actual embedding. Furthermore, Supabase private bucket `voice-samples` contained no audio file for this user.

### C. Simplistic Frontend Boolean Evaluation
In `client/src/App.tsx`, the frontend state was derived from a single binary check:
```typescript
setHasVoiceProfile(Boolean(profile && profile.status === 'ready'))
```
Because `profile.status === 'ready'` and `hasSpeakerEmbedding === true` were returned by the API, `hasVoiceProfile` was set to `true`. This cascaded across the UI:
- `BlockNavbar.tsx` displayed `VOICE: ACTIVE`.
- `SpeechStudio.tsx` enabled the `PERSONAL` voice mode toggle and rendered `Cloned Voice Active`.

When the user submitted a script, `POST /api/speech/generate` attempted to parse `provider_voice_ref` as JSON (`JSON.parse('enc_embedding_vector_sample')`), failed, and threw `VOICE_EMBEDDING_INVALID`.

---

## 3. Architecture & State Model Redesign

To permanently prevent this inconsistency, the simplistic binary status was replaced with an authoritative, backend-verified state machine across both client and server.

### Supported Voice States
```
                      ┌──────────────────────┐
                      │     NOT_ENROLLED     │
                      └──────────┬───────────┘
                                 │ Audio uploaded
                                 ▼
                      ┌──────────────────────┐
                      │  RECORDING_UPLOADED  │
                      └──────────┬───────────┘
                                 │ Extraction invoked
                                 ▼
                      ┌──────────────────────┐
                      │ EMBEDDING_PROCESSING │
                      └─────┬──────────┬─────┘
           Extraction fails │          │ Verified [1, 768] tensor
                            ▼          ▼
┌────────────────────┐   ┌───────┐   ┌────────────────┐
│ EMBEDDING_MISSING  │   │FAILED │   │     READY      │
│ (Legacy / No Ref)  │   └───────┘   │ (VOICE ACTIVE) │
└────────────────────┘               └────────────────┘
```

1. **`NOT_ENROLLED`**: User has no registered profile or has revoked consent.
2. **`RECORDING_UPLOADED`**: Audio sample uploaded to `voice-samples` storage, pending vector extraction.
3. **`EMBEDDING_PROCESSING`**: Currently extracting 768-dim tensor from Gnani Vachana AI.
4. **`EMBEDDING_FAILED`**: Audio noisy, too short, or extraction failed at provider.
5. **`EMBEDDING_MISSING`**: Voice profile record exists in DB, but has no valid `[1, 768]` tensor.
6. **`READY`**: Authoritative verified state. Speaker embedding tensor is validated and active. **Only in this state is `VOICE: ACTIVE` displayed.**

---

## 4. Implementation Details

### A. Authoritative Voice Service (`server/src/modules/voice/voice.service.ts`)
Created a dedicated evaluation engine that validates speaker embedding tensors:
```typescript
export function validateSpeakerEmbeddingTensor(rawRef: string | null | undefined): SpeakerEmbeddingTensor | null {
  if (!rawRef) return null
  try {
    const trimmed = typeof rawRef === 'string' ? rawRef.trim() : JSON.stringify(rawRef)
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null
    const parsed = JSON.parse(trimmed)
    if (typeof parsed.embedding !== 'string' || parsed.embedding.length < 50) return null
    if (!Array.isArray(parsed.shape) || parsed.shape[0] !== 1 || parsed.shape[1] !== 768) return null
    return {
      embedding: parsed.embedding,
      shape: [1, 768],
      dtype: parsed.dtype || 'torch.bfloat16',
    }
  } catch {
    return null
  }
}
```
`evaluateVoiceProfile(profile)` verifies that a profile has a real tensor before declaring `READY`. If a record has `status === 'ready'` in the database but lacks a valid tensor, it is categorized as `EMBEDDING_MISSING`, and the database row is auto-healed (`status = 'failed'`).

### B. Backend Route Guards
- **`GET /api/voice/me`**: Returns `status`, `enrollmentStatus`, `embeddingStatus`, and `isReadyForSynthesis`.
- **`POST /api/voice/enroll`**: Validates DPDP consent, uploads buffer to private Supabase storage (`voice-samples`), calls Gnani AI (`POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`), strictly validates `[1, 768]` tensor shape, and only then marks `READY`. Implements the **Safe Update Rule** preserving previous working profiles if re-recording fails.
- **`POST /api/speech/generate`**: Uses `evaluateVoiceProfile(profile)` to block personal synthesis with `400 VOICE_EMBEDDING_INVALID` if `isReadyForSynthesis` is false.

### C. Database Sanitization
Executed database sanitization across Supabase `voice_profiles` table, transitioning inconsistent legacy rows with dummy string references (`enc_embedding_vector_sample`) to `status: 'failed'`.

### D. Frontend Synchronized State
- **[`types/index.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/types/index.ts)**: Added `VoiceEnrollmentState` and `EmbeddingStatus`.
- **[`lib/api.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/lib/api.ts)**: Normalized `voiceApi.getProfile()` to parse `enrollmentStatus` and `isReadyForSynthesis`.
- **[`BlockNavbar.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/layout/BlockNavbar.tsx)**:
  - If `READY`: `<BlockBadge variant="grass">VOICE: ACTIVE</BlockBadge>`
  - If `EMBEDDING_MISSING`: `<BlockBadge variant="redstone">VOICE: MISSING TENSOR</BlockBadge>`
  - If `EMBEDDING_PROCESSING`: `<BlockBadge variant="lapis">VOICE: PROCESSING</BlockBadge>`
  - If `NOT_ENROLLED`: `<BlockBadge variant="gold">VOICE: NOT SET</BlockBadge>`
- **[`SpeechStudio.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/SpeechStudio.tsx)**:
  - Personal Mode toggle enabled **only** when `voiceStatus === 'READY'`.
  - When `EMBEDDING_MISSING`: Displays button label `Embedding Tensor Missing`, disables Personal Mode, and displays a prominent warning banner directing user to Voice Setup.
- **[`VoiceSetup.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/VoiceSetup.tsx)**:
  - When `EMBEDDING_MISSING`: Renders an incomplete enrollment notice informing the user that their profile lacks a 768-dim tensor, with the audio ingestion station immediately ready.
  - Active profile card is hidden until a real embedding tensor is validated.

---

## 5. Gnani AI Integration Verification

1. **Custom Speaker Enrollment Endpoint:**
   - **URL:** `POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`
   - **Headers:** `X-API-Key-ID: <GNANI_API_KEY>`
   - **Form Field:** `audio_file` (WAV audio buffer).
   - **Response Structure:** `{ success: true, data: { voice_clone_embedding: { embedding: "...", shape: [1, 768], dtype: "torch.bfloat16" } } }`
2. **Personal Voice Inference Contract:**
   - **URL:** `POST https://api.vachana.ai/api/v1/tts/inference`
   - **Model:** `vachana-vc-v1` (Mandatory; Gnani rejects `timbre-v2.5` when passing `speaker_embedding`).
   - **Body:** `{ model: "vachana-vc-v1", speaker_embedding: { embedding: "...", shape: [1, 768], dtype: "torch.bfloat16" }, ... }`
3. **Standard Voice Inference Contract:**
   - **Model:** `timbre-v2.5`
   - **Voice:** `Nalini`, `Pranav`, `Manish`, `Gowri`, etc.

---

## 6. Verification & Test Results

Executed the full automated test suite covering all 7 required scenarios:
```bash
npx vitest run server/src/__tests__/voice_embedding_e2e.test.ts
```

| # | Test Scenario | Verified Behavior | Status |
|---|:---|:---|:---:|
| 1 | **Existing profile without embedding** | Returns `enrollmentStatus: 'EMBEDDING_MISSING'`, `isReadyForSynthesis: false`, auto-heals DB status | **PASSED** |
| 2 | **New voice enrollment** | Uploads audio, extracts 768-dim tensor, validates shape, activates `READY` | **PASSED** |
| 3 | **Voice re-recording** | Updates existing profile with new verified tensor, refreshes active state | **PASSED** |
| 4 | **Safe Update Rule** | Preserves existing working profile if re-recording audio extraction fails | **PASSED** |
| 5 | **Missing embedding guard** | Blocks personal synthesis with `400 VOICE_EMBEDDING_INVALID` when tensor is null | **PASSED** |
| 6 | **Personal voice synthesis** | Successfully generates personalized speech using verified tensor | **PASSED** |
| 7 | **Standard voice synthesis** | Successfully synthesizes standard voices (`Nalini`, `Pranav`) without requiring embedding | **PASSED** |
| 8 | **Biometric revocation** | Revokes profile, logs DPDP audit, immediately reverts to `NOT_ENROLLED` | **PASSED** |

### Suite-Wide Results
- **Vitest:** 11 / 11 test suites passed (**88 / 88 unit & integration tests passed**).
- **Client Linting:** Oxlint passed with **0 warnings and 0 errors** across all 56 client files.
- **Production Builds:** Both Vite (`client:build`) and TypeScript (`server:build`) succeeded with code 0.

