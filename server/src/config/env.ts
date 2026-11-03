import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url().default('https://mock-vaani.supabase.co'),
  SUPABASE_ANON_KEY: z.string().default('mock-anon-key-for-development'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default('mock-service-role-key'),
  SUPABASE_JWT_SECRET: z.string().default('vaani-test-jwt-secret-minimum-32-characters-long'),
  STORAGE_SIGNED_URL_EXPIRY_SECONDS: z.coerce.number().default(900), // 15 minutes
  GNANI_CUSTOM_VOICE_ENABLED: z.coerce.boolean().default(false),
})

export const config = envSchema.parse(process.env)

