import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { createTestToken, createExpiredToken, createForgedToken } from './helpers.js'

describe('Authentication & Session Handling Middleware', () => {
  it('rejects requests with missing Authorization header (401)', async () => {
    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('UNAUTHORIZED')
    expect(res.body.message).toContain('Missing Authorization header')
  })

  it('rejects requests with invalid authorization header format (401)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('UNAUTHORIZED')
    expect(res.body.message).toContain('Expected "Bearer <token>"')
  })

  it('rejects forged tokens signed with an invalid secret (401)', async () => {
    const forgedToken = createForgedToken('attacker', 'attacker@malicious.com')

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forgedToken}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('UNAUTHORIZED')
  })

  it('rejects expired tokens with explicit TOKEN_EXPIRED code (401)', async () => {
    const expiredToken = createExpiredToken('user-a', 'usera@example.com')

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('TOKEN_EXPIRED')
  })

  it('accepts valid tokens and successfully returns user profile', async () => {
    const validToken = createTestToken('user-a', 'usera@example.com')

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validToken}`)

    expect(res.status).toBe(200)
    expect(res.body.user).toBeDefined()
    expect(res.body.user.id).toBe('user-a')
    expect(res.body.user.email).toBe('usera@example.com')
  })
})

