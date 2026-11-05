import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config/env.js'

/**
 * Admin client initialized with the service_role key.
 * STRICT SECURITY REQUIREMENT:
 * Used EXCLUSIVELY on the trusted backend for administrative tasks
 * (e.g., storage bucket provisioning, internal health checks, data persistence).
 * NEVER exposed to the client-side frontend.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Public client initialized with the anon key.
 * Used for verifying client-supplied access tokens via supabase.auth.getUser(token)
 * without utilizing administrative bypass privileges.
 */
export const supabaseAnon: SupabaseClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Creates an authenticated Supabase client scoped to the user's JWT.
 * Any query executed with this client strictly enforces PostgreSQL Row-Level Security (RLS)
 * under the authenticated auth.uid() context.
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

export interface SupabaseHealthStatus {
  status: 'healthy' | 'degraded'
  url: string
  database: boolean
  storage: boolean
  auth: boolean
  latencyMs: number
  error?: string
}

/**
 * Probes the live Supabase project services and returns a comprehensive health status.
 * Never leaks secret keys or authentication tokens.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const start = Date.now()
  let dbOk = false
  let storageOk = false
  let authOk = false
  let errorMsg: string | undefined

  try {
    // 1. Check Database connection via head select on profiles
    const { error: dbErr } = await supabaseAdmin
      .from('profiles')
      .select('count', { count: 'exact', head: true })
    dbOk = !dbErr
    if (dbErr) errorMsg = `DB: ${dbErr.message}`

    // 2. Check Storage buckets
    const { data: buckets, error: sErr } = await supabaseAdmin.storage.listBuckets()
    storageOk = !sErr && Boolean(buckets && buckets.some((b) => b.id === 'voice-samples' || b.id === 'generated-audio'))
    if (sErr && !errorMsg) errorMsg = `Storage: ${sErr.message}`

    // 3. Check Auth service availability
    const { error: aErr } = await supabaseAnon.auth.getSession()
    // getSession returning null session or no error means auth endpoint is reachable
    authOk = !aErr || aErr.message.toLowerCase().includes('session')
  } catch (err: any) {
    errorMsg = err.message || 'Connection timeout or network failure'
  }

  const latencyMs = Date.now() - start
  const isHealthy = dbOk && storageOk

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    url: new URL(config.SUPABASE_URL).hostname,
    database: dbOk,
    storage: storageOk,
    auth: authOk,
    latencyMs,
    error: isHealthy ? undefined : errorMsg,
  }
}
