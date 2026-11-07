-- ==============================================================================
-- VAANI — Master Production Security Hardening & RLS Isolation Migration
-- Migration: 004_security_hardening_rls.sql
-- Target: Supabase PostgreSQL (Production Deployment)
-- Compliance: DPDP (Digital Personal Data Protection Act 2023) & OWASP Top 10 API
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. STRICT ROW LEVEL SECURITY (RLS) ENFORCEMENT
-- ------------------------------------------------------------------------------
-- Ensure RLS is enabled and forced on all sensitive tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.speech_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speech_jobs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_assets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. PRINCIPLE OF LEAST PRIVILEGE: REVOKE UNNECESSARY ANON DML PERMISSIONS
-- ------------------------------------------------------------------------------
-- The 'anon' role must NOT possess direct INSERT, UPDATE, or DELETE privileges
-- on user data or entity views. All client mutations require authenticated JWT
-- or server-assisted administrative action.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.voice_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.speech_jobs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.audio_assets FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.consent_events FROM anon;

REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.generation_jobs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.audio_generations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_consents FROM anon;

-- Grant authenticated role strictly scoped DML privileges
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.speech_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_assets TO authenticated;
GRANT SELECT, INSERT ON public.consent_events TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. VERIFY AND RE-APPLY IDEMPOTENT RLS POLICIES WITH STRICT SCOPES
-- ------------------------------------------------------------------------------

-- Profiles: Users can only read, insert, and update their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Voice Profiles: Users can only access and manage their own voice embeddings
DROP POLICY IF EXISTS "voice_profiles_all_own" ON public.voice_profiles;
CREATE POLICY "voice_profiles_all_own"
    ON public.voice_profiles FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Speech Jobs: Users can only view and manage their own synthesis jobs
DROP POLICY IF EXISTS "speech_jobs_all_own" ON public.speech_jobs;
CREATE POLICY "speech_jobs_all_own"
    ON public.speech_jobs FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Audio Assets: Users can only view, create, and soft-delete their own audio artifacts
DROP POLICY IF EXISTS "audio_assets_all_own" ON public.audio_assets;
CREATE POLICY "audio_assets_all_own"
    ON public.audio_assets FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Consent Events: DPDP Audit log (Read own, Append own; Revocations create new records or update revoked_at)
DROP POLICY IF EXISTS "consent_events_all_own" ON public.consent_events;
CREATE POLICY "consent_events_all_own"
    ON public.consent_events FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. STORAGE ISOLATION POLICIES (Supabase Storage: voice-samples & generated-audio)
-- ------------------------------------------------------------------------------
-- Ensure buckets are strictly private
UPDATE storage.buckets SET public = false WHERE id IN ('voice-samples', 'generated-audio');

-- Voice Samples user isolation policy
DROP POLICY IF EXISTS "voice_samples_user_isolation" ON storage.objects;
CREATE POLICY "voice_samples_user_isolation"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
        bucket_id = 'voice-samples' 
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    )
    WITH CHECK (
        bucket_id = 'voice-samples' 
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Generated Audio user isolation policy
DROP POLICY IF EXISTS "generated_audio_user_isolation" ON storage.objects;
CREATE POLICY "generated_audio_user_isolation"
    ON storage.objects FOR ALL
    TO authenticated
    USING (
        bucket_id = 'generated-audio' 
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    )
    WITH CHECK (
        bucket_id = 'generated-audio' 
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- ------------------------------------------------------------------------------
-- 5. PERFORMANCE AND SECURITY INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_status ON public.voice_profiles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audio_assets_user_created ON public.audio_assets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_speech_jobs_user_status ON public.speech_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_consent_events_user_type ON public.consent_events(user_id, event_type);

