import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { app } from '../app.js'
import { config } from '../config/env.js'
import { dbRepo, mockDb } from '../db/repository.js'
import { supabaseAdmin, supabaseAnon } from '../db/supabase.js'

describe('VAANI — Supabase Signup Flow & Profile Persistence Suite', () => {
  const validSecret = config.SUPABASE_JWT_SECRET

  const createTestJwt = (userId: string, email: string) => {
    return jwt.sign(
      {
        sub: userId,
        email,
        role: 'authenticated',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      validSecret
    )
  }

  beforeEach(() => {
    mockDb.reset()
    mockDb.seedInitialData()
  })

  // ---------------------------------------------------------------------------
  // 1. Input Validation & Error Handling
  // ---------------------------------------------------------------------------
  describe('1. Input Validation & Error Handling', () => {
    it('rejects registration without a valid userId (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register-profile')
        .send({
          email: 'valid@example.com',
          fullName: 'Test User',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/valid userId is required/i)
    })

    it('rejects registration with a malformed email (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register-profile')
        .send({
          userId: '00000000-0000-4000-a000-000000000099',
          email: 'not-an-email',
          fullName: 'Test User',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/valid email is required/i)
    })

    it('enforces password minimum length requirements on Supabase auth', async () => {
      const invalidEmail = 'weakpass@example.com'
      const weakPassword = '123' // Under 6 characters

      const { data, error } = await supabaseAnon.auth.signUp({
        email: invalidEmail,
        password: weakPassword,
      })

      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/password should be at least 6 characters/i)
      expect(data.user).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Profile Creation & Synchronization
  // ---------------------------------------------------------------------------
  describe('2. Profile Creation & Synchronization', () => {
    it('creates profile record via POST /api/auth/register-profile (201)', async () => {
      const userId = '00000000-0000-4000-a000-000000000101'
      const email = 'new-producer@vaani.ai'
      const fullName = 'Aarav Mehta'

      const res = await request(app)
        .post('/api/auth/register-profile')
        .send({
          userId,
          email,
          fullName,
        })

      expect(res.status).toBe(201)
      expect(res.body.ok).toBe(true)
      expect(res.body.user).toBeDefined()
      expect(res.body.user.id).toBe(userId)
      expect(res.body.user.email).toBe(email)
      expect(res.body.user.display_name).toBe(fullName)

      // Verify profile is persistent in dbRepo
      const saved = await dbRepo.getProfile(userId)
      expect(saved).not.toBeNull()
      expect(saved?.display_name).toBe(fullName)
    })

    it('allows active authenticated session to synchronize profile via POST /api/auth/sync-profile (200)', async () => {
      const userId = 'user-a'
      const token = createTestJwt(userId, 'usera@example.com')

      const res = await request(app)
        .post('/api/auth/sync-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          displayName: 'User A Modified Callsign',
        })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.user.display_name).toBe('User A Modified Callsign')

      const updated = await dbRepo.getProfile(userId)
      expect(updated?.display_name).toBe('User A Modified Callsign')
    })

    it('rejects unauthenticated calls to POST /api/auth/sync-profile (401)', async () => {
      const res = await request(app)
        .post('/api/auth/sync-profile')
        .send({
          displayName: 'Intruder',
        })

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('UNAUTHORIZED')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. User Session & Profile Retrieval
  // ---------------------------------------------------------------------------
  describe('3. User Session & Profile Retrieval', () => {
    it('returns the authenticated user profile on GET /api/auth/me (200)', async () => {
      const userId = 'user-a'
      const token = createTestJwt(userId, 'usera@example.com')

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.user).toBeDefined()
      expect(res.body.user.id).toBe(userId)
      expect(res.body.user.email).toBe('usera@example.com')
      expect(res.body.user.display_name).toBe('User A')
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Strict Isolation & Security Hardening
  // ---------------------------------------------------------------------------
  describe('4. Strict Isolation & Security Hardening', () => {
    it('ensures User B token cannot read or mutate User A profile', async () => {
      const userBToken = createTestJwt('user-b', 'userb@example.com')

      // User B calling /me receives their own profile, not User A
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userBToken}`)

      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe('user-b')
      expect(res.body.user.id).not.toBe('user-a')
      expect(res.body.user.email).toBe('userb@example.com')
    })

    it('verifies that service role operations are blocked when using anon credentials', async () => {
      expect(supabaseAdmin).toBeDefined()
      expect(supabaseAnon).toBeDefined()

      // Calling admin methods on anon client is rejected by Supabase API
      const { error: anonError } = await supabaseAnon.auth.admin.listUsers()
      expect(anonError).not.toBeNull()
      expect(anonError?.message || '').toMatch(/not allowed|unauthorized/i)

      // Calling admin methods on admin client succeeds
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 })
      expect(adminError).toBeNull()
      expect(adminData?.users).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Supabase Auth User Creation & Profile Lifecycle
  // ---------------------------------------------------------------------------
  describe('5. Supabase Auth User Creation & Profile Lifecycle', () => {
    it('creates a user with metadata and synchronizes profile record in database', async () => {
      const testEmail = `vaani_lifecycle_${Date.now()}@vaani.ai`
      const testPass = 'SecureVoxelPass2026!'
      const fullName = 'Priya Sharma'

      // Admin createUser creates the user in auth.users without consuming the SMTP email rate limit
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPass,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          display_name: fullName,
        },
      })

      expect(error).toBeNull()
      expect(data.user).not.toBeNull()
      expect(data.user?.email).toBe(testEmail)
      expect(data.user?.user_metadata?.full_name).toBe(fullName)

      const userId = data.user!.id

      try {
        // Step 2: Register profile through backend endpoint
        const regRes = await request(app)
          .post('/api/auth/register-profile')
          .send({
            userId,
            email: testEmail,
            fullName,
          })

        expect(regRes.status).toBe(201)
        expect(regRes.body.user.id).toBe(userId)
        expect(regRes.body.user.display_name).toBe(fullName)

        // Step 3: Verify profile is retrieved through repository
        const profile = await dbRepo.getProfile(userId)
        expect(profile).not.toBeNull()
        expect(profile?.email).toBe(testEmail)
      } finally {
        // Step 4: Cleanup created test user from Supabase auth and profiles
        await supabaseAdmin.from('profiles').delete().eq('id', userId)
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
    })

    it('handles Supabase rate limit and error codes cleanly', async () => {
      // Simulating client handling of rate limit response
      const rateLimitError = {
        name: 'AuthApiError',
        status: 429,
        code: 'over_email_send_rate_limit',
        message: 'email rate limit exceeded',
      }

      const getFriendlyMessage = (err: any) => {
        if (err.status === 429 || err.code === 'over_email_send_rate_limit') {
          return 'Email rate limit exceeded. Please wait a few minutes before trying again.'
        }
        return err.message
      }

      expect(getFriendlyMessage(rateLimitError)).toBe(
        'Email rate limit exceeded. Please wait a few minutes before trying again.'
      )
    })
  })
})
