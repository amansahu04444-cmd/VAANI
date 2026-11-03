# Gnani AI Provider Capability & Feasibility Audit

**Project:** VAANI (Voice Accessibility & Multilingual Studio)  
**Date:** 03 November 2026  
**Auditor:** Antigravity Engineering Agent  
**Challenge Target:** Great Indian AI Internship Challenge (Deadline: 10 Nov 2026, 11:59 PM IST)

---

## 1. Executive Summary

This document establishes the verified technical feasibility of **Gnani AI** speech APIs for the VAANI project. Specifically, it resolves the **Gate A Critical Feasibility Question** identified in the project blueprint:

> *Can a participant upload an arbitrary user audio sample, create a custom speaker embedding, and synthesize speech from text using that speaker profile in supported languages?*

### Feasibility Verdict: **FEASIBLE (Documented Official API Workflow)**
Our inspection of the official Gnani AI developer documentation (`docs.gnani.ai`), the official Python SDK (`gnani-vachana` v0.9.0 on PyPI / GitHub), and official API endpoints confirms that **Gnani AI provides a dedicated zero-shot Voice Cloning (VC) embedding extraction and synthesis pipeline**:
1. **Voice Embedding Extraction:** Supported via `POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`
2. **Custom Voice Speech Synthesis:** Supported via `POST https://api.vachana.ai/api/v1/tts/inference` by supplying the `speaker_embedding` payload instead of a static `voice` identifier.

---

## 2. Official Provider Evidence & Proof Table

| Feature / Claim | Official Source | Verified via Docs/Code | Status / Evidence |
| :--- | :--- | :--- | :--- |
| **API Base URL** | `docs.gnani.ai` / `gnani-vachana` SDK | YES | `https://api.vachana.ai` |
| **Authentication Header** | `docs.gnani.ai` REST specification | YES | `X-API-Key-ID: <api_key>` |
| **Standard TTS Model** | `docs.gnani.ai/api/TTS/tts-inference` | YES | `timbre-v2.5` (42 voices) and `timbre-v3.0` (expressive audio tags) |
| **Voice Clone Embedding Extraction** | `https://docs.gnani.ai/api/VC/voice-clone-embeddings` | YES | `POST /api/v1/tts/voice-clone/embeddings`<br>Payload: `multipart/form-data` with reference audio (5–30s clean WAV/MP3) |
| **Speaker Embedding Output Schema** | `gnani/tts/client.py` (`SpeakerEmbedding` class) | YES | Returns object: `{"embedding": "<base64_string>", "shape": [1, 768], "dtype": "torch.bfloat16"}` |
| **Synthesis with Speaker Embedding** | `gnani/tts/client.py` (lines 201–221, 264–265) | YES | Passing `speaker_embedding` into TTS inference ignores `voice` and conditions synthesis on the user's vocal tract/timbre |
| **Supported TTS Locales** | `docs.gnani.ai/api/TTS/available-voices` | YES | 10 Indian locales + English + Hinglish: `hi-IN`, `en-IN`, `ta-IN`, `te-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `bn-IN`, `gu-IN`, `pa-IN`, `auto` |
| **Cross-Language Cloning** | Architecture Inference | PENDING SMOKE TEST | The `speaker_embedding` is independent of language code in the synthesis payload. Needs empirical audio QA during Phase 3 spike |
| **Participant API Credentials** | Environment Check (`Get-ChildItem Env:`) | NOT CONFIGURED | Participant must obtain API Key from Gnani Challenge Registration flow and populate `server/.env` |

---

## 3. Detailed API Request & Response Contracts

### 3.1 Voice Enrollment: Embedding Extraction Endpoint

- **Endpoint:** `POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`
- **Headers:**
  - `X-API-Key-ID: <GNANI_API_KEY>`
  - `Content-Type: multipart/form-data`
- **Request Form Data:**
  - `file`: Binary audio file (recommended: 16kHz or 48kHz WAV/MP3, mono, 5–30 seconds clean speech, minimal background noise).
- **Response Payload (200 OK):**
  ```json
  {
    "speaker_embedding": {
      "embedding": "VGVzdCBzdHJpbmcgZXhhbXBsZSBmb3IgYmFzZTY0...",
      "shape": [1, 768],
      "dtype": "torch.bfloat16"
    }
  }
  ```

### 3.2 Multilingual Synthesis Endpoint with Custom Voice

- **Endpoint:** `POST https://api.vachana.ai/api/v1/tts/inference`
- **Headers:**
  - `X-API-Key-ID: <GNANI_API_KEY>`
  - `Content-Type: application/json`
- **Request JSON Body:**
  ```json
  {
    "text": "नमस्ते, यह आपकी अपनी आवाज़ में एक संदेश है।",
    "model": "timbre-v2.5",
    "language": "hi-IN",
    "speed": 1.0,
    "speaker_embedding": {
      "embedding": "<base64_string_from_enrollment>",
      "shape": [1, 768],
      "dtype": "torch.bfloat16"
    },
    "audio_config": {
      "sample_rate": 48000,
      "encoding": "linear_pcm",
      "container": "wav",
      "num_channels": 1,
      "sample_width": 2
    }
  }
  ```
- **Response:** Binary audio stream (WAV container with 48kHz Linear PCM audio).

---

## 4. Architectural Implications for VAANI

1. **Storage of Enrolled Voices:**
   - Because the embedding output is a compact numerical vector (`[1, 768]` in `torch.bfloat16` serialized as base64 string), VAANI **does not need to retain raw user voice recordings** after enrollment unless the user explicitly opts in.
   - The base64 embedding vector should be encrypted at rest in the `voice_profiles` table (`provider_voice_ref` / `embedding_payload` column).
   - This provides a massive privacy and compliance advantage under Indian Digital Personal Data Protection (DPDP) standards: raw biometric voice samples can be discarded immediately post-extraction.

2. **Security & Server-Side Boundary:**
   - The client application (React SPA) must **never** communicate directly with `api.vachana.ai`.
   - All calls pass through the Express backend `SpeechProviderAdapter`.
   - `GNANI_API_KEY` remains strictly in `server/.env`.

3. **Fallback & Capability Flagging (Gates A/B/C):**
   - In accordance with master prompts, the backend will feature a capability flag: `GNANI_CUSTOM_VOICE_ENABLED=true` (or `false` if credentials lack VC entitlement).
   - If the API key returns an entitlement error (e.g., 403 Forbidden on VC endpoints), the system gracefully reports `PROVIDER_CAPABILITY_UNAVAILABLE` and falls back to standard Timbre synthetic voices (`Nalini`, `Pranav`, `Poorvi`) clearly labelled as *"Selected VAANI Voice"*.

---

## 5. Next Actions for API Spike (Phase 3)

1. Participant enters `GNANI_API_KEY` into `server/.env`.
2. Execute an automated smoke test script calling:
   - `GET /api/v1/tts/available-voices` or standard inference with voice `Nalini`.
   - `POST /api/v1/tts/voice-clone/embeddings` with a 10-second reference voice sample.
   - `POST /api/v1/tts/inference` with the resulting `speaker_embedding` across Hindi (`hi-IN`), Indian English (`en-IN`), and Hinglish (`auto`).
3. Conduct auditory QA to assess identity consistency and intelligibility across languages.

