import { Router, Request, Response } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { dbRepo } from '../../db/repository.js'

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

