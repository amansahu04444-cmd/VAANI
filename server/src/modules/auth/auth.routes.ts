import { Router, Request, Response } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { rateLimiter } from '../../middleware/rateLimit.js'
import { dbRepo } from '../../db/repository.js'
import { supabaseAdmin } from '../../db/supabase.js'

export const authRouter = Router()

/**
 * Helper to mask emails in logs
 */
function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!user || !domain) return '***'
  const masked = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`
  return `${masked}@${domain}`
}

/**
 * GET /api/auth/me
 * Returns authenticated user profile scoped to JWT.
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const profile = (await dbRepo.getProfile(userId)) || {
    id: userId,
    email: req.user!.email,
    display_name: 'VAANI Studio User',
    created_at: new Date().toISOString(),
  }

  res.json({
    user: profile,
  })
})

/**
 * POST /api/auth/signup
 * Server-assisted signup endpoint that provisions the user inside Supabase Auth (auth.users)
 * with pre-confirmed email. Bypasses Supabase SMTP 3/hour email send rate limit (HTTP 429)
 * without exposing service_role keys, disabling RLS, or bypassing Supabase Auth.
 * Client immediately authenticates via standard supabase.auth.signInWithPassword.
 */
authRouter.post(
  '/signup',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'auth_signup',
    message: 'Too many signup attempts. Please try again after 15 minutes.',
  }),
  async (req: Request, res: Response): Promise<any> => {
    const { email, password, fullName } = req.body || {}

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' })
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' })
    }

    const rawName = typeof fullName === 'string' && fullName.trim() ? fullName.trim() : email.split('@')[0]
    const name = rawName.replace(/[\x00-\x1F\x7F<>]/g, '').slice(0, 100)

    console.log('[AuthRoutes] Processing Studio user provisioning request', {
      email: maskEmail(email),
      nameLength: name.length,
      timestamp: new Date().toISOString(),
    })

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        display_name: name,
      },
    })

    if (error) {
      console.warn('[AuthRoutes] Supabase admin user creation warning:', {
        status: error.status,
        code: error.code,
        message: error.message,
      })

      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already been registered')) {
        return res.status(409).json({ error: 'An account with this email is already registered. Please sign in.' })
      }

      return res.status(error.status || 400).json({ error: error.message })
    }

    console.log('[AuthRoutes] User successfully created in Supabase auth.users', {
      userId: data.user?.id,
      email: maskEmail(email),
      timestamp: new Date().toISOString(),
    })

    return res.status(201).json({
      ok: true,
      message: 'Account successfully created in Supabase Auth.',
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    })
  } catch (err: any) {
    console.error('[AuthRoutes] Internal server error creating user:', err)
    return res.status(500).json({ error: 'Failed to create user account.' })
  }
})

/**
 * POST /api/auth/sync-profile
 * Authenticated endpoint for active user session to update or sync profile.
 * Fulfills Task 8: Profile creation/updates occur ONLY after successful authentication.
 */
authRouter.post(
  '/sync-profile',
  requireAuth,
  rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'auth_sync',
    message: 'Too many profile update requests. Please try again shortly.',
  }),
  async (req: Request, res: Response): Promise<any> => {
    const userId = req.user!.id
    const email = req.user!.email
    const { fullName, displayName } = req.body || {}

    const rawName = displayName || fullName || email.split('@')[0]
    const name = String(rawName).replace(/[\x00-\x1F\x7F<>]/g, '').slice(0, 100)

  console.log('[AuthRoutes] Synchronizing profile for authenticated user', {
    userId,
    email: maskEmail(email),
    timestamp: new Date().toISOString(),
  })

  try {
    const profile = await dbRepo.upsertProfile({
      id: userId,
      email,
      display_name: name,
      full_name: name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return res.json({
      ok: true,
      message: 'Profile synchronized successfully.',
      user: profile,
    })
  } catch (err: any) {
    console.error('[AuthRoutes] Failed to sync profile:', err)
    return res.status(500).json({ error: 'Failed to sync profile.' })
  }
})
