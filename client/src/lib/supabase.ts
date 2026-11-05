import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://signitgzdfbvvzamarkj.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ25pdGd6ZGZidnZ6YW1hcmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4NjQwMzUsImV4cCI6MjEwOTQ0MDAzNX0.RsDrFiimA9juLB0lbGLZs0jhgbxqiJzc1rS1Vh0u_i4'

/**
 * Frontend Supabase Client
 * Initialized exclusively with anon public key.
 * Service role key is NEVER bundled or exposed to the client.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
