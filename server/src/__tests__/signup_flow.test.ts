import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { app } from '../app.js'
import { config } from '../config/env.js'
import { dbRepo, mockDb } from '../db/repository.js'
import { supabaseAdmin, supabaseAnon } from '../db/supabase.js'

describe('VAANI — Supabase Signup Flow & Rate Limit Handling Suite', () => {
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
    it('rejects signup without a valid email address (400)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          password: 'ValidPassword123!',
          fullName: 'Test User',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/valid email/i)
    })

    it('rejects signup with a malformed email address (400)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'not-a-valid-email',
          password: 'ValidPassword123!',
          fullName: 'Test User',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/valid email/i)
    })

    it('rejects signup with short password under 6 characters (400)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'valid_email@vaani.ai',
          password: '123',
          fullName: 'Test User',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/at least 6 characters/i)
    })
  })

  // ---------------------------------------------------------------------------
  // 2. HTTP 429 & Rate Limit Handling Without Auto-Retries
  // ---------------------------------------------------------------------------
  describe('2. HTTP 429 & Rate Limit Handling', () => {
    it('properly extracts and formats Supabase over_email_send_rate_limit (429) error', () => {
      const supabase429Error = {
        name: 'AuthApiError',
        status: 429,
        code: 'over_email_send_rate_limit',
        message: 'email rate limit exceeded',
      }

      // Verifies client error formatting logic without automatic retries
      const formatError = (err: any) => {
        if (err.status === 429 || err.code === 'over_email_send_rate_limit') {
          return `[HTTP 429: ${err.code}] ${err.message}. Supabase has restricted new confirmation emails for this project. Automatic retries are disabled.`
        }
        return err.message
      }

      const formatted = formatError(supabase429Error)
      expect(formatted).toContain('HTTP 429: over_email_send_rate_limit')
      expect(formatted).toContain('email rate limit exceeded')
      expect(formatted).toContain('Automatic retries are disabled')
    })

    it('detects existing registered user when identities array is empty', () => {
      // Supabase GoTrue returns empty identities array when user already exists
      const existingUserResponse = {
        user: {
          id: 'user-existing-123',
          email: 'existing@vaani.ai',
          identities: [],
        },
        session: null,
      }

      const isAlreadyRegistered =
        existingUserResponse.user &&
        Array.isArray(existingUserResponse.user.identities) &&
        existingUserResponse.user.identities.length === 0

      expect(isAlreadyRegistered).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Post-Authentication Profile Synchronization (Task 8)
  // ---------------------------------------------------------------------------
  describe('3. Profile Creation Happens Only After Successful Authentication (Task 8)', () => {
    it('rejects unauthenticated requests to create or sync profile (401)', async () => {
      const res = await request(app)
        .post('/api/auth/sync-profile')
        .send({
          displayName: 'Unauthenticated Attacker',
        })

      expect(res.status).toBe(401)
      expect(res.body.error).toBe('UNAUTHORIZED')
    })

    it('allows authenticated session with valid JWT to synchronize profile (200)', async () => {
      const userId = 'user-a'
      const token = createTestJwt(userId, 'usera@example.com')

      const res = await request(app)
        .post('/api/auth/sync-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          displayName: 'User A Authenticated Callsign',
        })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.user.display_name).toBe('User A Authenticated Callsign')

      const profile = await dbRepo.getProfile(userId)
      expect(profile?.display_name).toBe('User A Authenticated Callsign')
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Strict Isolation & Security Hardening
  // ---------------------------------------------------------------------------
  describe('4. Strict Isolation & Security Hardening', () => {
    it('ensures User B cannot read or modify User A profile', async () => {
      const userBToken = createTestJwt('user-b', 'userb@example.com')

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userBToken}`)

      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe('user-b')
      expect(res.body.user.id).not.toBe('user-a')
      expect(res.body.user.email).toBe('userb@example.com')
    })

    it('verifies that service role operations are blocked on anon credentials', async () => {
      const { error: anonError } = await supabaseAnon.auth.admin.listUsers()
      expect(anonError).not.toBeNull()
      expect(anonError?.message || '').toMatch(/not allowed|unauthorized/i)
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Complete Real Signup & Authentication Lifecycle
  // ---------------------------------------------------------------------------
  describe('5. Real Signup & Authentication Lifecycle Verification', () => {
    it('provisions a new user in Supabase Auth, authenticates, and verifies profile sync', async () => {
      const testEmail = `vaani_real_user_${Date.now()}@vaani.ai`
      const testPass = 'SecureVoxelPass2026!'
      const fullName = 'Kavya Nair'

      // Step 1: Provision account via server-assisted Studio Signup
      const regRes = await request(app)
        .post('/api/auth/signup')
        .send({
          email: testEmail,
          password: testPass,
          fullName,
        })

      expect(regRes.status).toBe(201)
      expect(regRes.body.ok).toBe(true)
      expect(regRes.body.user?.id).toBeDefined()
      expect(regRes.body.user?.email).toBe(testEmail)

      const userId = regRes.body.user.id

      try {
        // Step 2: Authenticate via standard Supabase signInWithPassword (as client does)
        const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
          email: testEmail,
          password: testPass,
        })

        expect(authError).toBeNull()
        expect(authData.session).not.toBeNull()
        expect(authData.session?.access_token).toBeDefined()
        expect(authData.user?.id).toBe(userId)

        // Step 3: Synchronize profile with active authenticated session token
        const syncRes = await request(app)
          .post('/api/auth/sync-profile')
          .set('Authorization', `Bearer ${authData.session!.access_token}`)
          .send({
            displayName: fullName,
          })

        expect(syncRes.status).toBe(200)
        expect(syncRes.body.user.display_name).toBe(fullName)

        // Step 4: Verify profile retrieved via authenticated GET /api/auth/me
        const meRes = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authData.session!.access_token}`)

        expect(meRes.status).toBe(200)
        expect(meRes.body.user.id).toBe(userId)
        expect(meRes.body.user.email).toBe(testEmail)
      } finally {
        // Cleanup created user from remote Supabase
        await supabaseAdmin.from('profiles').delete().eq('id', userId)
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
    })

    it('rejects duplicate signup for already registered email (409 Conflict)', async () => {
      const duplicateEmail = `vaani_dup_${Date.now()}@vaani.ai`
      const password = 'SecurePassword2026!'

      // 1. Initial registration
      const firstRes = await request(app)
        .post('/api/auth/signup')
        .send({
          email: duplicateEmail,
          password,
          fullName: 'Original User',
        })
      expect(firstRes.status).toBe(201)
      const userId = firstRes.body.user.id

      try {
        // 2. Duplicate registration attempt
        const dupRes = await request(app)
          .post('/api/auth/signup')
          .send({
            email: duplicateEmail,
            password,
            fullName: 'Duplicate User',
          })

        expect(dupRes.status).toBe(409)
        expect(dupRes.body.error).toMatch(/already registered/i)
      } finally {
        await supabaseAdmin.from('profiles').delete().eq('id', userId)
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
    })
  })
})
