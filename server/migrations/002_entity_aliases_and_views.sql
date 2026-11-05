-- ==============================================================================
-- VAANI — Supabase Entity Views & Schema Enhancements
-- Phase: Supabase Backend Integration
-- Target: VAANI Personal Multilingual Voice Studio
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENTITY ALIAS VIEWS (WITH ROW-LEVEL SECURITY ENFORCEMENT)
-- ------------------------------------------------------------------------------
-- These views provide standardized entity naming across the application while
-- preserving existing primary tables and enforcing PostgreSQL Row-Level Security
-- via security_invoker = true (supported in PostgreSQL 15+ / Supabase).

-- user_profiles -> profiles
CREATE OR REPLACE VIEW public.user_profiles WITH (security_invoker = true) AS
    SELECT 
        id,
        email,
        display_name,
        created_at,
        updated_at
    FROM public.profiles;

-- generation_jobs -> speech_jobs
CREATE OR REPLACE VIEW public.generation_jobs WITH (security_invoker = true) AS
    SELECT 
        id,
        user_id,
        voice_profile_id,
        input_text,
        source_language,
        target_language,
        provider_model,
        voice_mode,
        status,
        provider_request_id,
        duration_ms,
        error_code,
        created_at,
        completed_at
    FROM public.speech_jobs;

-- audio_generations -> audio_assets
CREATE OR REPLACE VIEW public.audio_generations WITH (security_invoker = true) AS
    SELECT 
        id,
        user_id,
        speech_job_id,
        object_key,
        mime_type,
        file_size,
        duration_ms,
        title,
        created_at,
        deleted_at
    FROM public.audio_assets;

-- user_consents -> consent_events
CREATE OR REPLACE VIEW public.user_consents WITH (security_invoker = true) AS
    SELECT 
        id,
        user_id,
        event_type,
        consent_version,
        accepted_at,
        revoked_at,
        details
    FROM public.consent_events;

-- ------------------------------------------------------------------------------
-- 2. AUTOMATIC UPDATED_AT TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles if not already present
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. PERMISSIONS GRANTING
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_jobs TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_generations TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_consents TO authenticated, anon;

