-- ==============================================================================
-- VAANI — Supabase PostgreSQL Schema & Row-Level Security (RLS) Migration
-- Target: Great Indian AI Internship Challenge (Deadline: 10 Nov 2026)
-- Phase: Phase 2 (Authentication, Database & Private Storage)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on profiles email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. VOICE_PROFILES TABLE (Biometric Embedding & Speaker Identity)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'gnani',
    provider_voice_ref TEXT, -- Encrypted [1, 768] embedding payload or provider voice ID
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed', 'revoked')),
    enrollment_language TEXT NOT NULL DEFAULT 'hi-IN',
    supported_languages JSONB NOT NULL DEFAULT '["hi-IN", "en-IN", "auto"]'::JSONB,
    sample_object_key TEXT, -- Path in private bucket 'voice-samples'
    sample_duration_sec NUMERIC(5, 2),
    consent_version TEXT NOT NULL DEFAULT 'v1.0-2026',
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for voice profiles
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user ON public.voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_profiles_status ON public.voice_profiles(status);

-- Enable RLS on voice_profiles
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_profiles_all_own"
    ON public.voice_profiles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. SPEECH_JOBS TABLE (Synthesis Requests & Execution Status)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.speech_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    voice_profile_id UUID REFERENCES public.voice_profiles(id) ON DELETE SET NULL,
    input_text TEXT NOT NULL,
    source_language TEXT NOT NULL DEFAULT 'auto',
    target_language TEXT NOT NULL DEFAULT 'hi-IN',
    provider_model TEXT NOT NULL DEFAULT 'timbre-v2.5',
    voice_mode TEXT NOT NULL DEFAULT 'personal' CHECK (voice_mode IN ('personal', 'standard')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    provider_request_id TEXT,
    duration_ms INTEGER,
    error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for speech jobs
CREATE INDEX IF NOT EXISTS idx_speech_jobs_user ON public.speech_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_speech_jobs_created ON public.speech_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_speech_jobs_status ON public.speech_jobs(status);

-- Enable RLS on speech_jobs
ALTER TABLE public.speech_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "speech_jobs_all_own"
    ON public.speech_jobs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. AUDIO_ASSETS TABLE (Generated Audio Metadata & Private Storage Keys)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    speech_job_id UUID REFERENCES public.speech_jobs(id) ON DELETE SET NULL,
    object_key TEXT NOT NULL, -- Path in private bucket 'generated-audio'
    mime_type TEXT NOT NULL DEFAULT 'audio/wav',
    file_size INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for audio assets
CREATE INDEX IF NOT EXISTS idx_audio_assets_user ON public.audio_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_assets_created ON public.audio_assets(created_at DESC);

-- Enable RLS on audio_assets
ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audio_assets_all_own"
    ON public.audio_assets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. CONSENT_EVENTS TABLE (DPDP Audit Log for Biometric Rights)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('granted', 'revoked')),
    consent_version TEXT NOT NULL DEFAULT 'v1.0-2026',
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    details JSONB
);

-- Indexes for consent events
CREATE INDEX IF NOT EXISTS idx_consent_events_user ON public.consent_events(user_id);

-- Enable RLS on consent_events
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_events_all_own"
    ON public.consent_events FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. PRIVATE STORAGE BUCKETS CONFIGURATION (Supabase Storage)
-- ------------------------------------------------------------------------------
-- Insert private storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('voice-samples', 'voice-samples', false, 10485760, ARRAY['audio/wav', 'audio/mpeg', 'audio/mp3']),
    ('generated-audio', 'generated-audio', false, 20971520, ARRAY['audio/wav', 'audio/mpeg', 'audio/mp3'])
ON CONFLICT (id) DO UPDATE 
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: Users can only upload and read objects within their own user_id directory
CREATE POLICY "voice_samples_user_isolation"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'voice-samples' 
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    )
    WITH CHECK (
        bucket_id = 'voice-samples' 
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

CREATE POLICY "generated_audio_user_isolation"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'generated-audio' 
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    )
    WITH CHECK (
        bucket_id = 'generated-audio' 
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

