import { Router, Request, Response } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { dbRepo, isUuid } from '../../db/repository.js'

export const authRouter = Router()

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
 * POST /api/auth/register-profile
 * Public endpoint called right after Supabase signUp to ensure a profile record
 * is created in public.profiles with service_role permissions, even if email confirmation
 * is pending and no client JWT session is available yet.
 */
authRouter.post('/register-profile', async (req: Request, res: Response): Promise<any> => {
  const { userId, email, fullName } = req.body || {}

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Valid userId is required.' })
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' })
  }

  const name = (typeof fullName === 'string' && fullName.trim()) ? fullName.trim() : email.split('@')[0]

  try {
    const profile = await dbRepo.upsertProfile({
      id: userId,
      email,
      display_name: name,
      full_name: name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return res.status(201).json({
      ok: true,
      message: 'Profile registered successfully.',
      user: profile,
    })
  } catch (err: any) {
    console.error('[AuthRoutes] Failed to register profile:', err)
    return res.status(500).json({ error: 'Failed to register profile record.' })
  }
})

/**
 * POST /api/auth/sync-profile
 * Authenticated endpoint for active user session to update or sync profile.
 */
authRouter.post('/sync-profile', requireAuth, async (req: Request, res: Response): Promise<any> => {
  const userId = req.user!.id
  const email = req.user!.email
  const { fullName, displayName } = req.body || {}

  const name = displayName || fullName || email.split('@')[0]

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
