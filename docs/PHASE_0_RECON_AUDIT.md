# VAANI — Phase 0 Repository Reconnaissance & System Audit

**Project:** VAANI — Personal Multilingual Voice Studio  
**Date:** 03 November 2026  
**Auditor:** Senior Staff Engineer / Antigravity Agent  
**Context:** Great Indian AI Internship Challenge (Submission Target: 10 Nov 2026, 11:59 PM IST)  
**Execution Phase:** Phase 0 (Reconnaissance Only — Zero application code modified)

---

## 1. Workspace & Repository State

### 1.1 Root Directory Inspection
- **Path:** `C:\Users\amans\OneDrive\Desktop\VAANI`
- **Initial State:** Greenfield workspace.
- **Discovered Documentation:**
  - `VAANI_Project_Blueprint_Gnani_AI_Challenge.docx` (in project root)
  - `VAANI_Final_Architecture_and_Antigravity_Prompts.docx` (located in `C:\Users\amans\Downloads`)
- **Git Repository Audit:**
  - An accidental git repository exists at the user root level (`C:\Users\amans\.git`). Consequently, `VAANI` was viewed as an untracked subdirectory within the user profile.
  - **Required Action in Phase 1:** Initialize an isolated Git repository directly inside `C:\Users\amans\OneDrive\Desktop\VAANI` (`git init`), configure `.gitignore` (ignoring `.env`, `node_modules`, `dist`, `.DS_Store`, build files), and keep it cleanly detached from the parent directory.

### 1.2 System Environment & Toolchains
- **Node.js:** `v24.13.0` (Verified available)
- **npm:** `11.6.2` (Verified available)
- **Python:** `3.14.2` (Verified available)
- **Git:** `2.52.0.windows.1` (Verified available)
- **OS:** Windows 11 (PowerShell environment)

---

## 2. Technical Stack & Component Architecture

In alignment with the VAANI Blueprint and Master Prompts, the approved target architecture is partitioned into strict separation of concerns:

```
VAANI System Architecture
┌────────────────────────────────────────────────────────┐
│                   React + Vite SPA                     │
│  (Tailwind CSS + shadcn/ui + Lucide + Audio Recorder)  │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / JSON / FormData
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js / Express API                  │
│   (TypeScript + Zod + JWT Auth Middleware + RateLimit) │
└─────────────┬──────────────────────────┬───────────────┘
              │                          │
┌─────────────▼──────────┐ ┌─────────────▼───────────────┐
│  Supabase PostgreSQL   │ │    Gnani AI Cloud Platform  │
│  - profiles            │ │    - timbre-v2.5 (TTS)      │
│  - voice_profiles      │ │    - voice-clone/embeddings │
│  - speech_jobs         │ │    - vachana-vc-v1          │
│  - audio_assets        │ │    - prisma-v2.5 (STT opt)  │
│  - consent_events      │ └─────────────────────────────┘
│  - Private RLS Storage │
└────────────────────────┘
```

### 2.1 Frontend Specifications (`client/`)
- **Framework:** React 18 / 19 with Vite and TypeScript.
- **UI & Design Direction:** Clean, calm audio productivity studio (Dark navy/indigo `#0B0F19` base, restrained teal `#0D9488` accent, high contrast, accessible typography). No generic neon gradients.
- **Pages / Views Required:**
  1. `LandingPage`: Product promise, audio samples, consent disclosure, CTA.
  2. `AuthPage`: Supabase email/password or magic link authentication.
  3. `Dashboard`: Voice status widget, quick create CTA, recent generation previews.
  4. `VoiceSetup`: Explicit consent gate, microphone recorder with waveform/timer, sample audio player, submit/delete profile.
  5. `SpeechStudio`: Script editor, character limit indicator, target language selector, voice profile badge (Personal vs Standard), synthesis action.
  6. `AudioLibrary`: Generated audio list, player with seek/speed, download WAV/MP3, delete action.
  7. `SettingsPage`: Data privacy policies, consent revocation, profile wipe.

### 2.2 Backend Specifications (`server/`)
- **Runtime:** Node.js with Express & TypeScript.
- **Validation:** Zod schemas for all inbound payloads, audio file MIME types, and environment configs.
- **Auth & Authorization:** Supabase JWT verification middleware (`requireAuth`). Every database query and storage access strictly scopes by `req.user.id`.
- **Security:**
  - Zero client exposure of `GNANI_API_KEY` or Supabase service role keys.
  - Helmet for security headers, CORS restricted to frontend origin.
  - Short-lived signed URLs for audio playback (15-minute expiry).
  - Voice biometric data protection: Immediate discard or private encryption of reference audio.

### 2.3 Database & Storage Schema (`Supabase`)
Five core relational tables with Row-Level Security (RLS) enabled:
1. `profiles`: `id` (FK to `auth.users`), `display_name`, `created_at`.
2. `voice_profiles`: `id`, `user_id`, `provider`, `provider_voice_ref` (encrypted embedding vector), `status` (`pending`, `ready`, `failed`), `enrollment_language`, `supported_languages` (JSON), `consent_version`, `consented_at`, `deleted_at`.
3. `speech_jobs`: `id`, `user_id`, `voice_profile_id`, `input_text`, `target_language`, `provider_model`, `voice_mode`, `status`, `provider_request_id`, `duration_ms`, `error_code`, `created_at`.
4. `audio_assets`: `id`, `user_id`, `speech_job_id`, `object_key`, `mime_type`, `file_size`, `duration_ms`, `title`, `created_at`, `deleted_at`.
5. `consent_events`: `id`, `user_id`, `event_type` (`granted`, `revoked`), `consent_version`, `accepted_at`, `revoked_at`, `details` (JSON audit).
- **Storage Buckets:**
  - `voice-samples` (private, strictly internal access).
  - `generated-audio` (private, signed URL downloads only).

---

## 3. API Contract Audit

| Method | Endpoint | Description | Auth Required | Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/voice/enroll` | Upload reference sample & extract embedding | Bearer JWT | Audio WAV/MP3, 5–30s, max 10MB; explicit consent boolean = true |
| `GET` | `/api/voice/me` | Fetch active voice profile and supported languages | Bearer JWT | Scoped to authenticated user |
| `DELETE` | `/api/voice/me` | Revoke consent and delete voice profile & embeddings | Bearer JWT | Scoped to authenticated user; deletes local record & storage |
| `POST` | `/api/speech/generate` | Synthesize script using personal or standard voice | Bearer JWT | Text max 1000 chars; targetLanguage in supported list; ownership verified |
| `GET` | `/api/speech/:id` | Poll generation status | Bearer JWT | Ownership verified |
| `GET` | `/api/audio` | Fetch user audio library | Bearer JWT | Paginated; ownership verified |
| `GET` | `/api/audio/:id/url` | Generate 15-minute signed URL for playback/download | Bearer JWT | Ownership verified; prevents IDOR |
| `DELETE` | `/api/audio/:id` | Delete audio asset and file object | Bearer JWT | Ownership verified |

---

## 4. Gnani AI Integration & Custom Voice Feasibility

See companion document [PROVIDER_CAPABILITY.md](file:///c:/Users/amans/OneDrive/Desktop/VAANI/docs/PROVIDER_CAPABILITY.md) for full details.

**Key Findings:**
1. **Feasibility Confirmed:** Gnani AI exposes `POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings` which converts 5–30s reference audio into a `speaker_embedding` (`[1, 768]`, `torch.bfloat16`).
2. **Synthesis Parameter:** Passing `speaker_embedding` into `POST https://api.vachana.ai/api/v1/tts/inference` synthesizes text in the target voice across supported Indic locales (`hi-IN`, `en-IN`, `ta-IN`, `te-IN`, `kn-IN`, etc.).
3. **Pending Gate:** Live participant API credentials (`GNANI_API_KEY`) must be supplied to execute the real smoke test in Phase 3.

---

## 5. Risk Assessment & Mitigations

| Risk | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **API Key Quota or Participant Latency** | Speech generation fails during live evaluation | Medium | Implement caching for demo scripts, request timeouts, and honest error handling |
| **Cross-Language Voice Degradation** | Voice loses identity when speaking English vs Hindi | Medium | Conduct blinded similarity evaluation in Phase 3; expose language-specific capability flags |
| **Unauthorized Voice Impersonation** | Legal and ethical violation | High | Strict consent checkbox with audit trail (`consent_events`); clear AI-generated watermarking/disclosure |
| **Accidental Git Nesting** | Untracked files in user directory | Medium | Initialize localized git repository in `C:\Users\amans\OneDrive\Desktop\VAANI` |
| **Missing Participant Credentials** | Cannot make live API calls | High | Provide `.env.example` immediately and guide participant to enter API key |

---

## 6. Phased Implementation Roadmap (Nov 3 – Nov 10)

| Phase | Target Date | Scope & Deliverables | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **Phase 0 (Current)** | Nov 3 | Repo reconnaissance, dependency check, Gnani documentation audit | Audit documents generated; no code modified; waiting for approval |
| **Phase 1** | Nov 3–4 | Frontend foundation & design system (React + Vite + Tailwind + shadcn) | App shell, responsive pages, navigation, build passes |
| **Phase 2** | Nov 4 | Backend setup, Supabase Auth, PostgreSQL schema, RLS, private storage | DB migrations pass, RLS tested, JWT verification working |
| **Phase 3** | Nov 5 | Gnani provider spike: real API calls, embedding extraction, TTS test | Live API smoke test script passes; proof recorded in docs |
| **Phase 4** | Nov 5 | Provider adapter & capability switching in Express | Clean abstraction, typed errors, mock fixtures for offline testing |
| **Phase 5** | Nov 6 | Voice enrollment UI & API (record/upload, consent, extraction) | Real profile enrollment flow operational with error states |
| **Phase 6** | Nov 6–7 | Speech Studio (script editor, language selection, synthesis) | Generates audio in Hindi, English, Hinglish with player |
| **Phase 7** | Nov 7 | Audio library, signed URLs, download, and deletion | Persistent private library, ownership enforced |
| **Phase 8** | Nov 8 | Security hardening, rate limiting, abuse controls, disclosure | Security scan, IDOR tests pass, sanitized error reporting |
| **Phase 9** | Nov 9 | Deployment (Vercel + Render + Supabase) & QA testing | Production smoke test verified on live URLs |
| **Phase 10** | Nov 10 | Demo recording, README documentation, hackathon submission | 60-second video recorded, post drafted, submitted before 11:59 PM IST |

---

## 7. Verification & Test Commands for Subsequent Phases

```powershell
# Frontend Verification (once created in client/)
cd client
npm run lint
npm run build

# Backend Verification (once created in server/)
cd ../server
npm run lint
npm run build
npm test

# Provider Spike Smoke Test (Phase 3)
npm run test:provider-spike
```

