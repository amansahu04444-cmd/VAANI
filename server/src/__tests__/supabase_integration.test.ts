import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { config, validateSupabaseConfig } from '../config/env.js'
import { supabaseAdmin, supabaseAnon, checkSupabaseHealth } from '../db/supabase.js'
import { StorageService, STORAGE_LIMITS } from '../modules/storage/storage.service.js'
import { createTestToken, createExpiredToken, createForgedToken } from './helpers.js'

describe('Supabase Backend Integration Suite', () => {
  describe('1. Configuration & Client Setup', () => {
    it('validates Supabase configuration at startup without exposing secrets', () => {
      const conf = validateSupabaseConfig()
      expect(conf.isValid).toBe(true)
      expect(conf.urlHost).toBe('signitgzdfbvvzamarkj.supabase.co')
      expect(conf.hasAnonKey).toBe(true)
      expect(conf.hasServiceRoleKey).toBe(true)
      expect(conf.hasJwtSecret).toBe(true)

      // Ensure secret keys are not contained in the configuration check object
      const json = JSON.stringify(conf)
      expect(json).not.toContain(config.SUPABASE_ANON_KEY)
      expect(json).not.toContain(config.SUPABASE_SERVICE_ROLE_KEY)
      expect(json).not.toContain(config.SUPABASE_JWT_SECRET)
    })

    it('initializes both admin and anon clients with proper configurations', () => {
      expect(supabaseAdmin).toBeDefined()
      expect(supabaseAnon).toBeDefined()
      expect(typeof supabaseAdmin.from).toBe('function')
      expect(typeof supabaseAnon.from).toBe('function')
      expect(typeof supabaseAdmin.storage.from).toBe('function')
    })
  })

  describe('2. Health Endpoints & Connectivity', () => {
    it('GET /health returns 200 with ok status and live Supabase diagnostics', async () => {
      const res = await request(app).get('/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.service).toBe('VAANI Speech Studio API')
      expect(res.body.supabase).toBeDefined()
      expect(res.body.supabase.status).toBe('healthy')
      expect(res.body.supabase.database).toBe(true)
      expect(res.body.supabase.storage).toBe(true)
      expect(res.body.supabase.url).toBe('signitgzdfbvvzamarkj.supabase.co')
    })

    it('GET /api/health returns 200 with service information', async () => {
      const res = await request(app).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.supabase.status).toBe('healthy')
    })

    it('checkSupabaseHealth() verifies database, storage and auth services', async () => {
      const health = await checkSupabaseHealth()
      expect(health.status).toBe('healthy')
      expect(health.database).toBe(true)
      expect(health.storage).toBe(true)
      expect(health.latencyMs).toBeGreaterThan(0)
    })
  })

  describe('3. Authentication Middleware & Security Boundaries', () => {
    it('rejects unauthenticated requests to protected routes with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('UNAUTHORIZED')
      expect(res.body.message).toContain('Missing Authorization header')
    })

    it('rejects malformed authorization header with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormatHeader')
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('UNAUTHORIZED')
    })

    it('rejects expired tokens with 401 TOKEN_EXPIRED', async () => {
      const expiredToken = createExpiredToken('user-a', 'usera@example.com')
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('TOKEN_EXPIRED')
    })

    it('rejects forged/tampered tokens with 401 UNAUTHORIZED', async () => {
      const forgedToken = createForgedToken('user-a', 'usera@example.com')
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`)
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('UNAUTHORIZED')
    })

    it('authenticates valid tokens and extracts user ID server-side without trusting client params', async () => {
      const token = createTestToken('user-a', 'usera@example.com')
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.user).toBeDefined()
      expect(res.body.user.id).toBe('user-a')
      expect(res.body.user.email).toBe('usera@example.com')
    })
  })

  describe('4. Storage Service & Security Controls', () => {
    it('validates path ownership and prevents directory traversal attacks', () => {
      // Valid path within user directory
      expect(() => {
        StorageService.validatePathOwnership('voice-samples', 'user-123/recording.wav', 'user-123')
      }).not.toThrow()

      // Directory traversal via ..
      expect(() => {
        StorageService.validatePathOwnership('voice-samples', 'user-123/../admin/key.pem', 'user-123')
      }).toThrow('FORBIDDEN_OBJECT_ACCESS')

      // Backslash traversal
      expect(() => {
        StorageService.validatePathOwnership('voice-samples', 'user-123\\..\\other.wav', 'user-123')
      }).toThrow('FORBIDDEN_OBJECT_ACCESS')

      // Cross-user path attempt
      expect(() => {
        StorageService.validatePathOwnership('voice-samples', 'victim-user/sample.wav', 'attacker-user')
      }).toThrow('FORBIDDEN_OBJECT_ACCESS')
    })

    it('enforces MIME type restrictions for private audio uploads', async () => {
      const buffer = Buffer.from('dummy data')
      await expect(
        StorageService.uploadAudio(
          'voice-samples',
          'user-123/test.exe',
          buffer,
          'application/x-msdownload',
          'user-123'
        )
      ).rejects.toThrow('INVALID_FILE_TYPE')
    })

    it('enforces file size limits for audio uploads', async () => {
      // 11MB buffer exceeds 10MB limit for voice-samples
      const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024)
      await expect(
        StorageService.uploadAudio(
          'voice-samples',
          'user-123/large.wav',
          oversizedBuffer,
          'audio/wav',
          'user-123'
        )
      ).rejects.toThrow('FILE_SIZE_EXCEEDED')
    })

    it('generates short-lived signed URLs with expiration timestamps', async () => {
      const res = await StorageService.getSignedUrl(
        'generated-audio',
        'user-123/speech.wav',
        'user-123',
        300
      )
      expect(res.signedUrl).toBeDefined()
      expect(res.expiresAt).toBeDefined()
      expect(new Date(res.expiresAt).getTime()).toBeGreaterThan(Date.now())
    })

    it('prevents generating signed URLs for objects belonging to another user', async () => {
      await expect(
        StorageService.getSignedUrl('generated-audio', 'user-other/secret.wav', 'user-123', 300)
      ).rejects.toThrow('FORBIDDEN_OBJECT_ACCESS')
    })
  })

  describe('5. Database Multi-Tenant Isolation & IDOR Protection', () => {
    it('prevents User A from generating playback signed URL for User B audio (403 FORBIDDEN)', async () => {
      const tokenA = createTestToken('user-a', 'usera@example.com')
      // audio-user-b belongs to user-b
      const res = await request(app)
        .get('/api/audio/audio-user-b/url')
        .set('Authorization', `Bearer ${tokenA}`)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('FORBIDDEN')
    })

    it('prevents User A from deleting User B audio asset (403 FORBIDDEN)', async () => {
      const tokenA = createTestToken('user-a', 'usera@example.com')
      const res = await request(app)
        .delete('/api/audio/audio-user-b')
        .set('Authorization', `Bearer ${tokenA}`)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('FORBIDDEN')
    })
  })
})

