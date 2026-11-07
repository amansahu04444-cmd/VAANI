import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { mockDb } from '../db/repository.js'
import { createTestToken } from './helpers.js'

describe('Strict User Isolation & Data Protection (RLS Enforcement)', () => {
  const tokenUserA = createTestToken('user-a', 'usera@example.com')
  const tokenUserB = createTestToken('user-b', 'userb@example.com')

  beforeEach(() => {
    mockDb.reset()
    mockDb.seedInitialData()
  })

  it('proves User A only sees User A audio assets and NEVER User B assets', async () => {
    const resA = await request(app)
      .get('/api/audio')
      .set('Authorization', `Bearer ${tokenUserA}`)

    expect(resA.status).toBe(200)
    expect(resA.body.assets).toHaveLength(1)
    expect(resA.body.assets[0].id).toBe('audio-user-a')
    expect(resA.body.assets[0].title).toBe('User A Confidential Script')

    // Verify User B's asset is NOT present in User A's result
    const hasUserBAsset = resA.body.assets.some((a: any) => a.id === 'audio-user-b')
    expect(hasUserBAsset).toBe(false)
  })

  it('proves User B only sees User B audio assets and NEVER User A assets', async () => {
    const resB = await request(app)
      .get('/api/audio')
      .set('Authorization', `Bearer ${tokenUserB}`)

    expect(resB.status).toBe(200)
    expect(resB.body.assets).toHaveLength(1)
    expect(resB.body.assets[0].id).toBe('audio-user-b')
    expect(resB.body.assets[0].title).toBe('User B Secret Audio')

    // Verify User A's asset is NOT present in User B's result
    const hasUserAAsset = resB.body.assets.some((a: any) => a.id === 'audio-user-a')
    expect(hasUserAAsset).toBe(false)
  })

  it('blocks User A from obtaining a signed playback URL for User B audio asset (403 Forbidden)', async () => {
    // User A directly targets User B's asset ID 'audio-user-b'
    const res = await request(app)
      .get('/api/audio/audio-user-b/url')
      .set('Authorization', `Bearer ${tokenUserA}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('FORBIDDEN')
    expect(res.body.message).toContain('Access denied')
    expect(res.body.signedUrl).toBeUndefined()
  })

  it('blocks User A from deleting User B audio asset (403 Forbidden)', async () => {
    // User A attempts to delete User B's asset
    const res = await request(app)
      .delete('/api/audio/audio-user-b')
      .set('Authorization', `Bearer ${tokenUserA}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('FORBIDDEN')

    // Verify User B's asset still exists intact
    const assetB = mockDb.audioAssets.get('audio-user-b')
    expect(assetB).toBeDefined()
    expect(assetB?.deleted_at).toBeNull()
  })

  it('prevents body spoofing: User A cannot enroll or overwrite a profile for User B', async () => {
    const res = await request(app)
      .post('/api/voice/enroll')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        consentAccepted: true,
        consentVersion: 'v1.0-2026',
        user_id: 'user-b', // Malicious attempt to spoof User B's identity
      })

    expect(res.status).toBe(201)

    // Verify that the newly created profile is strictly assigned to user-a
    const profileA = Array.from(mockDb.voiceProfiles.values()).find((vp) => vp.user_id === 'user-a')
    expect(profileA).toBeDefined()
    expect(profileA?.user_id).toBe('user-a')

    // Verify User B's profile was NOT overwritten
    const profileB = Array.from(mockDb.voiceProfiles.values()).find((vp) => vp.user_id === 'user-b')
    expect(profileB).toBeUndefined() // User B was never enrolled
  })

  it('allows User A to access their own audio asset signed URL (200 OK)', async () => {
    const res = await request(app)
      .get('/api/audio/audio-user-a/url')
      .set('Authorization', `Bearer ${tokenUserA}`)

    expect(res.status).toBe(200)
    expect(res.body.assetId).toBe('audio-user-a')
    expect(res.body.signedUrl).toBeDefined()
    expect(res.body.expiresAt).toBeDefined()
  })
})

