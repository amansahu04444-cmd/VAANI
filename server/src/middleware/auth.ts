import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { supabaseAnon, createUserClient } from '../db/supabase.js'
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
 * Verifies Supabase access tokens server-side using supabase.auth.getUser(token).
 * Extracts authenticated user identity, binds req.user.id,
 * and instantiates a user-scoped database client ensuring strict PostgreSQL RLS.
 * Never trusts user IDs supplied directly by the frontend.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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
    let authenticatedUser: AuthenticatedUser | null = null

    // 1. Fast local verification: Check if token is signed with SUPABASE_JWT_SECRET
    if (config.SUPABASE_JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, config.SUPABASE_JWT_SECRET) as jwt.JwtPayload
        const userId = decoded.sub || decoded.id
        if (userId && typeof userId === 'string') {
          authenticatedUser = {
            id: userId,
            email: decoded.email || 'user@vaani.ai',
            role: decoded.role || 'authenticated',
          }
        }
      } catch (jwtErr: any) {
        if (jwtErr.name === 'TokenExpiredError') {
          res.status(401).json({
            error: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired. Please refresh your session.',
          })
          return
        }
        // If signature mismatch, token might be an asymmetric Supabase token; fall through to getUser
      }
    }

    // 2. Server-side Supabase Auth verification:
    // Verify token directly against Supabase Auth service using supabase.auth.getUser(token)
    if (!authenticatedUser) {
      try {
        const { data, error } = await supabaseAnon.auth.getUser(token)
        if (!error && data?.user?.id) {
          authenticatedUser = {
            id: data.user.id,
            email: data.user.email || 'user@vaani.ai',
            role: data.user.role || 'authenticated',
          }
        }
      } catch {
        // Supabase Auth unreachable or network failure
      }
    }

    // If neither local secret nor Supabase Auth verified the token, reject
    if (!authenticatedUser) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or forged authentication token.',
      })
      return
    }

    // Bind securely extracted user identity
    req.user = authenticatedUser

    // Attach RLS-scoped Supabase client
    req.userClient = createUserClient(token)

    next()
  } catch (err: any) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: err.message || 'Authentication failed: unable to verify credentials.',
    })
  }
}
