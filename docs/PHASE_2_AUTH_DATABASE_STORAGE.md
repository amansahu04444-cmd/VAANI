# VAANI — Phase 2 Authentication, Database & Private Storage Report

**Project:** VAANI (Multilingual Personal Voice Studio)  
**Date:** 03 November 2026  
**Execution Phase:** Phase 2 (Supabase Auth, PostgreSQL RLS, Migrations, Private Storage & User Isolation)  
**Status:** Complete & Fully Tested (14/14 automated tests passed, Server & Client builds pass with 0 errors)

---

## 1. Executive Summary

Phase 2 implements the robust persistence, authentication, authorization, and private object storage layers for VAANI. In strict compliance with the **Master Development Instructions**:
* **Supabase Authentication & JWT Middleware:** Authenticated sessions are parsed and validated via `requireAuth`. Missing, malformed, expired, or forged tokens are rejected with HTTP 401.
* **PostgreSQL Schema & Migrations:** 5 core relational tables (`profiles`, `voice_profiles`, `speech_jobs`, `audio_assets`, `consent_events`) with foreign keys, check constraints, and performance indexes.
* **Row-Level Security (RLS):** Policies enforce that users can only select, insert, update, and delete rows where `auth.uid() = user_id` (or `id` for profiles).
* **Private Storage Buckets:** `voice-samples` and `generated-audio` are marked non-public. Access is granted exclusively through short-lived (15-minute) signed URLs after strictly verifying user folder prefix ownership.
* **Zero Trust on Client Identity:** The server never trusts `user_id` provided in request bodies or query parameters. Identity is strictly derived from verified JWT claims (`req.user.id`).
* **Zero Secret Exposure:** `.env.example` committed with variable names only.

---

## 2. PostgreSQL Schema & RLS Architecture

The migration is defined in [`server/migrations/001_initial_schema.sql`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/migrations/001_initial_schema.sql):

### 2.1 Table Specifications
1. **`public.profiles`**:
   - `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
   - `email TEXT NOT NULL`
   - `display_name TEXT`
   - `created_at / updated_at TIMESTAMPTZ`
   - *RLS:* `auth.uid() = id`
2. **`public.voice_profiles`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
   - `provider TEXT NOT NULL DEFAULT 'gnani'`
   - `provider_voice_ref TEXT` (Encrypted `[1, 768]` `torch.bfloat16` speaker embedding)
   - `status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'failed', 'revoked'))`
   - `enrollment_language TEXT NOT NULL DEFAULT 'hi-IN'`
   - `supported_languages JSONB NOT NULL DEFAULT '["hi-IN", "en-IN", "auto"]'`
   - `sample_object_key TEXT`
   - `sample_duration_sec NUMERIC(5, 2)`
   - `consent_version TEXT NOT NULL DEFAULT 'v1.0-2026'`
   - `consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `deleted_at TIMESTAMPTZ`
   - *RLS:* `auth.uid() = user_id`
3. **`public.speech_jobs`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
   - `voice_profile_id UUID REFERENCES public.voice_profiles(id) ON DELETE SET NULL`
   - `input_text TEXT NOT NULL`
   - `target_language TEXT NOT NULL`
   - `provider_model TEXT NOT NULL DEFAULT 'timbre-v2.5'`
   - `voice_mode TEXT NOT NULL CHECK (voice_mode IN ('personal', 'standard'))`
   - `status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed'))`
   - *RLS:* `auth.uid() = user_id`
4. **`public.audio_assets`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
   - `speech_job_id UUID REFERENCES public.speech_jobs(id) ON DELETE SET NULL`
   - `object_key TEXT NOT NULL` (Format: `{user_id}/{filename}`)
   - `mime_type TEXT NOT NULL DEFAULT 'audio/wav'`
   - `file_size INTEGER NOT NULL`, `duration_ms INTEGER NOT NULL`
   - `title TEXT NOT NULL`
   - *RLS:* `auth.uid() = user_id`
5. **`public.consent_events`** (DPDP Compliance Audit Log):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
   - `event_type TEXT NOT NULL CHECK (event_type IN ('granted', 'revoked'))`
   - `consent_version TEXT NOT NULL DEFAULT 'v1.0-2026'`
   - `accepted_at TIMESTAMPTZ`, `revoked_at TIMESTAMPTZ`, `details JSONB`
   - *RLS:* `auth.uid() = user_id`

### 2.2 Storage Buckets & Policies
- **`voice-samples`**: `public = false`, limit 10MB, MIME: `audio/wav`, `audio/mp3`, `audio/mpeg`
- **`generated-audio`**: `public = false`, limit 20MB, MIME: `audio/wav`, `audio/mp3`, `audio/mpeg`
- **Storage Policy:**
  ```sql
  CREATE POLICY "storage_user_isolation"
      ON storage.objects FOR ALL
      USING ((storage.foldername(name))[1] = auth.uid()::TEXT)
      WITH CHECK ((storage.foldername(name))[1] = auth.uid()::TEXT);
  ```

---

## 3. Server Architecture & API Endpoints

```
server/
  src/
    config/env.ts              # Zod environment variable parsing
    db/
      supabase.ts              # Scoped client factory (createUserClient)
      repository.ts            # Type-safe repository & test fixture store
    middleware/
      auth.ts                  # JWT validation & user attachment
      validate.ts              # Zod request body & param validation
    modules/
      auth/auth.routes.ts      # GET /api/auth/me
      voice/voice.routes.ts    # GET, POST, DELETE /api/voice/me & enroll
      audio/audio.routes.ts    # GET, DELETE /api/audio, GET /api/audio/:id/url
      storage/storage.service.ts # 15-min signed URLs with prefix verification
    app.ts                     # Express app setup (helmet, cors, routes, error handler)
    server.ts                  # Server bootstrap
```

---

## 4. Automated Test Verification Results

All 14 tests executed via Vitest and passed synchronously:

```text
 ✓ src/__tests__/auth.test.ts (5 tests)
   ✓ rejects requests with missing Authorization header (401)
   ✓ rejects requests with invalid authorization header format (401)
   ✓ rejects forged tokens signed with an invalid secret (401)
   ✓ rejects expired tokens with explicit TOKEN_EXPIRED code (401)
   ✓ accepts valid tokens and successfully returns user profile (200)

 ✓ src/__tests__/user_isolation.test.ts (6 tests)
   ✓ proves User A only sees User A audio assets and NEVER User B assets
   ✓ proves User B only sees User B audio assets and NEVER User A assets
   ✓ blocks User A from obtaining a signed playback URL for User B audio asset (403 Forbidden)
   ✓ blocks User A from deleting User B audio asset (403 Forbidden)
   ✓ prevents body spoofing: User A cannot enroll or overwrite a profile for User B
   ✓ allows User A to access their own audio asset signed URL (200 OK)

 ✓ src/__tests__/storage.test.ts (3 tests)
   ✓ generates a 15-minute signed URL for valid user-owned object path
   ✓ strictly blocks signed URL generation if object key belongs to another user
   ✓ blocks deletion of storage objects belonging to another user

Test Files  3 passed (3)
     Tests  14 passed (14)
  Duration  3.03s
```

---

## 5. Live Supabase Deployment Setup Steps

When deploying to a live Supabase project:
1. Create a Supabase project at [database.new](https://database.new).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Paste and run [`server/migrations/001_initial_schema.sql`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/migrations/001_initial_schema.sql).
4. Copy `Project URL`, `anon key`, `service_role key`, and `JWT secret` into `server/.env`.
5. Start server: `cd server && npm run dev`.

