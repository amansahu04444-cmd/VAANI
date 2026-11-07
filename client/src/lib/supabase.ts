import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[VAANI Configuration Warning] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from environment. Please populate client/.env with your public Supabase project credentials.'
  )
}

/**
 * Frontend Supabase Client
 * Initialized exclusively with anon public key.
 * Service role key is NEVER bundled or exposed to the client.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

