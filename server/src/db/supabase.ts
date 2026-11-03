import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

// Admin client with service role key (for migrations / internal tasks only)
export const supabaseAdmin: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Creates an authenticated Supabase client scoped to the user's JWT.
 * Any query executed with this client strictly enforces PostgreSQL Row-Level Security (RLS).
 */
export function createUserClient(token: string): SupabaseClient {
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

