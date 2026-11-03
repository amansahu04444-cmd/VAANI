# VAANI — Production Quality Assurance (QA) Checklist

**Target:** Great Indian AI Internship Challenge  
**Application:** VAANI (Multilingual Personal Voice Studio)  
**Execution Phase:** Phase 9 (QA, Observability & Verification)

---

## 1. Authentication & Session Security
- [x] Unauthenticated requests to `/api/voice/*`, `/api/speech/*`, `/api/audio/*` return `401 Unauthorized`.
- [x] Bearer tokens with invalid signatures or forged secrets return `401 Unauthorized`.
- [x] Expired tokens return `401 TOKEN_EXPIRED`.
- [x] User identity is strictly derived from verified JWT subject (`sub`); body `user_id` values are ignored.

## 2. Voice Enrollment & Consent (DPDP Compliance)
- [x] Enrolling without checking the explicit consent statement is rejected with `400 Validation Error`.
- [x] Microphone recording enforces 5 to 30 seconds minimum/maximum length.
- [x] Audio files upload validates MIME type (`audio/wav`, `audio/mp3`) and 10MB size limit.
- [x] Consent grant events are permanently logged in `consent_events` table.
- [x] Deleting a voice profile permanently purges the `[1, 768]` speaker embedding and logs a revocation audit event.
- [x] After revocation, attempting Personal Voice generation immediately fails with `VOICE_PROFILE_REQUIRED`.

## 3. Speech Studio & Multilingual Output
- [x] Script editor enforces a 1,000 character maximum limit.
- [x] All 11 supported Indian language locales (`hi-IN`, `en-IN`, `auto`, `ta-IN`, `te-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `bn-IN`, `gu-IN`, `pa-IN`) are selectable and validated against the official schema.
- [x] Speech rate slider enforces official Gnani speed boundaries ($0.85\times$ to $1.15\times$).
- [x] Personal Voice mode requires an active enrolled profile; standard mode falls back cleanly to the Timbre voice catalogue (`Nalini`, `Pranav`, `Poorvi`).
- [x] Multi-stage progress indicators accurately reflect synthesis state without false completion.

## 4. Private Audio Storage & Playback
- [x] Storage buckets `voice-samples` and `generated-audio` are marked non-public.
- [x] Playback and download URLs are time-bounded signed URLs with a 15-minute (900s) expiration.
- [x] Path traversal attacks (e.g. `../`, `..\\`) are strictly blocked.
- [x] User A cannot obtain signed URLs or delete audio assets belonging to User B (HTTP 403 Forbidden).

## 5. Security & Rate Limiting
- [x] Rate limiting active on `/api/speech/generate` (30 requests/minute) and `/api/voice/enroll` (5 requests/10 minutes).
- [x] Exceeding rate limits returns `429 RATE_LIMIT_EXCEEDED` with `Retry-After` header.
- [x] Internal server errors (500) sanitize stack traces and never leak database secrets or API keys.
- [x] Helmet security headers and CORS domain restrictions enabled.

## 6. Device & Browser Compatibility
- [x] Chrome / Chromium (Desktop & Mobile)
- [x] Safari (iOS & macOS)
- [x] Firefox (Desktop)
- [x] Responsive layout tested on 360px mobile viewport, tablet, and 1440px desktop.

