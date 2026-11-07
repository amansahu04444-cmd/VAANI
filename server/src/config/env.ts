import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config()

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().default('vaani-test-jwt-secret-minimum-32-characters-long'),
  STORAGE_SIGNED_URL_EXPIRY_SECONDS: z.coerce.number().default(900), // 15 minutes
  GNANI_API_KEY: z.string().optional(),
  GNANI_API_BASE_URL: z.string().url().default('https://api.vachana.ai'),
  GNANI_TTS_MODEL: z.string().default('timbre-v2.5'),
  GNANI_CUSTOM_VOICE_ENABLED: z.coerce.boolean().default(false),
  GNANI_TTS_TIMEOUT_MS: z.coerce.number().default(60000), // Default: 60 seconds
  GNANI_TTS_LONG_TIMEOUT_MS: z.coerce.number().default(120000), // Long audio / voice cloning: up to 120 seconds
})

export const config = envSchema.parse(process.env)

/**
 * Sanitized configuration check for startup logging.
 * NEVER prints secret tokens or raw keys.
 */
export function validateSupabaseConfig(): {
  isValid: boolean
  urlHost: string
  hasAnonKey: boolean
  hasServiceRoleKey: boolean
  hasJwtSecret: boolean
} {
  const urlObj = new URL(config.SUPABASE_URL)
  return {
    isValid: Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && config.SUPABASE_SERVICE_ROLE_KEY),
    urlHost: urlObj.hostname,
    hasAnonKey: Boolean(config.SUPABASE_ANON_KEY && config.SUPABASE_ANON_KEY.length > 20),
    hasServiceRoleKey: Boolean(config.SUPABASE_SERVICE_ROLE_KEY && config.SUPABASE_SERVICE_ROLE_KEY.length > 20),
    hasJwtSecret: Boolean(config.SUPABASE_JWT_SECRET),
  }
}

