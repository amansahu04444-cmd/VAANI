-- ==============================================================================
-- VAANI — Supabase Migration 005: Profiles Schema Alignment & RLS Hardening
-- Resolves PostgREST 400 Bad Request (PostgreSQL 42703: column profiles.full_name does not exist)
-- Ensures strict auth.uid() = id row-level isolation and auto-provisioning
-- ==============================================================================

-- 1. Ensure full_name column exists on public.profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
        RAISE NOTICE 'Added full_name column to public.profiles';
    ELSE
        RAISE NOTICE 'full_name column already exists on public.profiles';
    END IF;
END $$;

-- 2. Backfill full_name from display_name where null
UPDATE public.profiles 
SET full_name = display_name 
WHERE full_name IS NULL AND display_name IS NOT NULL;

-- 3. Backfill display_name from email prefix if display_name is null
UPDATE public.profiles
SET display_name = split_part(email, '@', 1)
WHERE display_name IS NULL OR trim(display_name) = '';

-- 4. Enforce Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Revoke dangerous direct write access from anonymous clients
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 5. Strict User Ownership RLS Policies (auth.uid() = id)

-- SELECT: Authenticated users can read only their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- INSERT: Authenticated users can insert only with their own auth.uid()
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- UPDATE: Authenticated users can update only their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 6. Trigger to automatically provision profile record on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    resolved_name TEXT;
    resolved_full_name TEXT;
BEGIN
    resolved_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'VAANI User'
    );
    resolved_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        resolved_name
    );

    INSERT INTO public.profiles (id, email, display_name, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        resolved_name,
        resolved_full_name,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
