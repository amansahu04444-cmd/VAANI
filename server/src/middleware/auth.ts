import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { createUserClient } from '../db/supabase.js'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuthenticatedUser {
  id: string
  email: string
  role?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
      userClient?: SupabaseClient
    }
  }
}

/**
 * Authentication Middleware:
 * Validates Supabase JWT, extracts authenticated user identity,
 * and instantiates a user-scoped database client ensuring strict RLS.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing Authorization header. Bearer token required.',
    })
    return
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid Authorization header format. Expected "Bearer <token>".',
    })
    return
  }

  const token = parts[1]

  try {
    // Verify JWT signature with Supabase JWT secret
    const decoded = jwt.verify(token, config.SUPABASE_JWT_SECRET) as jwt.JwtPayload

    const userId = decoded.sub || decoded.id
    if (!userId || typeof userId !== 'string') {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid token claims: missing subject identifier (sub).',
      })
      return
    }

    req.user = {
      id: userId,
      email: decoded.email || 'user@vaani.ai',
      role: decoded.role || 'authenticated',
    }

    // Attach RLS-scoped Supabase client
    req.userClient = createUserClient(token)

    next()
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired. Please refresh your session.',
      })
      return
    }

    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or forged authentication token.',
    })
  }
}

