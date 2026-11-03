import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'

export function createTestToken(userId: string, email: string, expiresIn: string = '1h'): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      role: 'authenticated',
      aud: 'authenticated',
    },
    config.SUPABASE_JWT_SECRET,
    { expiresIn } as any
  )
}

export function createExpiredToken(userId: string, email: string): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      role: 'authenticated',
      aud: 'authenticated',
    },
    config.SUPABASE_JWT_SECRET,
    { expiresIn: '-10s' } as any
  )
}

export function createForgedToken(userId: string, email: string): string {
  return jwt.sign(
    {
      sub: userId,
      email,
      role: 'authenticated',
    },
    'completely-wrong-fake-secret-key-12345',
    { expiresIn: '1h' } as any
  )
}

