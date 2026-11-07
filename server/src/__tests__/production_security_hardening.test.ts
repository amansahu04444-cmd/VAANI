import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { clearRateLimitStore } from '../middleware/rateLimit.js'
import { createTestToken } from './helpers.js'

describe('VAANI Production Security & Infrastructure Hardening', () => {
  beforeEach(() => {
    clearRateLimitStore()
  })

  describe('1. HTTP Security Headers & Helmet Configuration', () => {
    it('sets Cross-Origin-Resource-Policy to cross-origin for HTML5 audio streaming', async () => {
      const res = await request(app).get('/api/health')

      expect(res.status).toBe(200)
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin')
      expect(res.headers['x-content-type-options']).toBe('nosniff')
    })

    it('sets secure frame and download headers', async () => {
      const res = await request(app).get('/api/health')

      // Helmet defaults
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(res.headers['x-download-options']).toBe('noopen')
    })
  })

  describe('2. CORS Origin Isolation & Validation', () => {
    it('allows requests with matching client origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173')

      expect(res.status).toBe(200)
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('permits requests without an Origin header (curl, mobile, backend-to-backend)', async () => {
      const res = await request(app).get('/api/health')

      expect(res.status).toBe(200)
      expect(res.body.status).toBeDefined()
    })

    it('does not set access-control-allow-origin for unauthorized origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-attacker-domain.com')

      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })
  })

  describe('3. Rate Limiting Protection (DDoS & Brute-Force Defense)', () => {
    it('blocks rapid brute-force signup attempts with HTTP 429 when rate limit is exceeded', async () => {
      const testIp = '198.51.100.12'

      // Send 5 rapid signup requests (limit is 5 requests per 15 min window)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/signup')
          .set('x-test-rate-limit', 'true')
          .set('X-Forwarded-For', testIp)
          .send({
            email: 'bad-email-test', // Will trigger 400 validation, but counts towards rate limiter
            password: 'pwd',
          })
      }

      // The 6th request must be intercepted and rejected with 429 Too Many Requests
      const blockedRes = await request(app)
        .post('/api/auth/signup')
        .set('x-test-rate-limit', 'true')
        .set('X-Forwarded-For', testIp)
        .send({
          email: 'another@example.com',
          password: 'ValidPassword123!',
        })

      expect(blockedRes.status).toBe(429)
      expect(blockedRes.body.error).toBe('RATE_LIMIT_EXCEEDED')
      expect(blockedRes.headers['retry-after']).toBeDefined()
      expect(Number(blockedRes.headers['retry-after'])).toBeGreaterThan(0)
    })

    it('enforces rate limits on public demo speech generation', async () => {
      const demoIp = '198.51.100.44'

      // Max 10 requests allowed
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/speech/demo-generate')
          .set('x-test-rate-limit', 'true')
          .set('X-Forwarded-For', demoIp)
          .send({
            text: 'Test demo phrase',
            targetLanguage: 'hi-IN',
          })
      }

      const blockedDemo = await request(app)
        .post('/api/speech/demo-generate')
        .set('x-test-rate-limit', 'true')
        .set('X-Forwarded-For', demoIp)
        .send({
          text: 'Excess demo phrase',
          targetLanguage: 'hi-IN',
        })

      expect(blockedDemo.status).toBe(429)
      expect(blockedDemo.body.error).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('4. Input Validation & Parameter Boundaries', () => {
    it('rejects speech generation requests with oversized script (> 1,000 chars)', async () => {
      const token = createTestToken('user-sec', 'sec@vaani.ai')
      const oversizedText = 'A'.repeat(1005)

      const res = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: oversizedText,
          targetLanguage: 'hi-IN',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('VALIDATION_ERROR')
    })

    it('rejects speech synthesis with out-of-range speed multipliers', async () => {
      const token = createTestToken('user-sec', 'sec@vaani.ai')

      const res = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'Valid text for synthesis',
          targetLanguage: 'hi-IN',
          speed: 2.5, // Exceeds max 1.15
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('VALIDATION_ERROR')
    })

    it('rejects translation requests with oversized text (> 2,000 chars)', async () => {
      const oversizedScript = 'B'.repeat(2005)

      const res = await request(app)
        .post('/api/translation/translate')
        .send({
          text: oversizedScript,
          targetLanguage: 'en-IN',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('VALIDATION_ERROR')
    })
  })

  describe('5. Error Handling & Information Leakage Prevention', () => {
    it('returns sanitized 404 response without leaking stack traces or framework info', async () => {
      const res = await request(app).get('/api/non-existent-secret-endpoint')

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('NOT_FOUND')
      expect(res.body.stack).toBeUndefined()
      expect(res.headers['x-powered-by']).toBeUndefined()
    })

    it('returns structured health response with healthy Supabase status', async () => {
      const res = await request(app).get('/api/health')

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
      expect(res.body.service).toBe('VAANI Speech Studio API')
      expect(res.body.supabase).toBeDefined()
    })
  })
})
