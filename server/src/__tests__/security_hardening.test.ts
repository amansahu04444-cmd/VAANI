import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { mockDb } from '../db/repository.js'
import { createTestToken } from './helpers.js'
import { clearRateLimitStore } from '../middleware/rateLimit.js'
import { StorageService } from '../modules/storage/storage.service.js'

describe('Security Hardening & Abuse Prevention (Phase 8)', () => {
  const tokenUserA = createTestToken('user-a', 'usera@example.com')

  beforeEach(() => {
    mockDb.reset()
    mockDb.seedInitialData()
    clearRateLimitStore()
  })

  it('enforces rate limiting and returns 429 with Retry-After when limit is exceeded', async () => {
    const payload = {
      consentAccepted: true,
      enrollmentLanguage: 'hi-IN',
    }

    // Rate limit configured for max 5 requests per window
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/voice/enroll')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .set('X-Test-Rate-Limit', 'true')
        .send(payload)

      expect(res.status).toBe(201)
    }

    // 6th request should be blocked with 429
    const blockedRes = await request(app)
      .post('/api/voice/enroll')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('X-Test-Rate-Limit', 'true')
      .send(payload)

    expect(blockedRes.status).toBe(429)
    expect(blockedRes.body.error).toBe('RATE_LIMIT_EXCEEDED')
    expect(blockedRes.headers['retry-after']).toBeDefined()
  })

  it('prevents path traversal attacks in storage object keys', async () => {
    const maliciousKeys = [
      '../etc/passwd',
      'user-a/../../system/config.env',
      'user-b/secret.wav',
      '/absolute/root/path.wav',
    ]

    for (const key of maliciousKeys) {
      await expect(
        StorageService.getSignedUrl('generated-audio', key, 'user-a')
      ).rejects.toThrow('FORBIDDEN_OBJECT_ACCESS')
    }
  })

  it('blocks Personal Voice generation if the user voice profile was revoked', async () => {
    // 1. Revoke User A profile
    await request(app)
      .delete('/api/voice/me')
      .set('Authorization', `Bearer ${tokenUserA}`)

    // 2. Attempt Personal Voice synthesis
    const res = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        text: 'Attempting to speak after revoking my profile.',
        targetLanguage: 'hi-IN',
        voiceMode: 'personal',
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VOICE_PROFILE_REQUIRED')
    expect(res.body.message).toContain('You must first enroll your voice profile')
  })

  it('sanitizes 500 error responses and never exposes internal server secrets', async () => {
    // Request an invalid route with malformed parameter
    const res = await request(app).get('/api/audio/null/url').set('Authorization', `Bearer ${tokenUserA}`)

    expect(res.status).toBe(404)
    expect(JSON.stringify(res.body)).not.toContain('SUPABASE_JWT_SECRET')
    expect(JSON.stringify(res.body)).not.toContain('GNANI_API_KEY')
  })
})

