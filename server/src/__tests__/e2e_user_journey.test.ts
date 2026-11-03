import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { mockDb } from '../db/repository.js'
import { createTestToken } from './helpers.js'

describe('End-to-End User Journey (Signup -> Voice Setup -> Speech Studio -> Library -> Download -> Deletion)', () => {
  const testUserId = 'new-user-789'
  const testEmail = 'aman.new@vaani.ai'
  const authToken = createTestToken(testUserId, testEmail)

  beforeEach(() => {
    mockDb.reset()
    mockDb.seedInitialData()
  })

  it('completes the entire end-to-end user lifecycle successfully', async () => {
    // -------------------------------------------------------------------------
    // STEP 1: Authentication & Profile Verification
    // -------------------------------------------------------------------------
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`)

    expect(meRes.status).toBe(200)
    expect(meRes.body.user).toBeDefined()
    expect(meRes.body.user.id).toBe(testUserId)

    // Initially, user has no voice profile
    const initialVoiceRes = await request(app)
      .get('/api/voice/me')
      .set('Authorization', `Bearer ${authToken}`)

    expect(initialVoiceRes.status).toBe(404)
    expect(initialVoiceRes.body.status).toBe('not_enrolled')

    // -------------------------------------------------------------------------
    // STEP 2: Voice Setup & Consent-Driven Enrollment
    // -------------------------------------------------------------------------
    // 2a: Attempting enrollment without consent is strictly rejected
    const noConsentRes = await request(app)
      .post('/api/voice/enroll')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        consentAccepted: false, // User didn't accept consent
        enrollmentLanguage: 'hi-IN',
      })

    expect(noConsentRes.status).toBe(400)
    expect(noConsentRes.body.error).toBe('VALIDATION_ERROR')

    // 2b: Enrolling with explicit consent succeeds
    const enrollRes = await request(app)
      .post('/api/voice/enroll')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        consentAccepted: true,
        consentVersion: 'v1.0-2026',
        enrollmentLanguage: 'hi-IN',
        sampleDurationSec: 14.5,
      })

    expect(enrollRes.status).toBe(201)
    expect(enrollRes.body.profile.status).toBe('ready')

    // 2c: Verify active profile via GET /api/voice/me
    const activeVoiceRes = await request(app)
      .get('/api/voice/me')
      .set('Authorization', `Bearer ${authToken}`)

    expect(activeVoiceRes.status).toBe(200)
    expect(activeVoiceRes.body.hasSpeakerEmbedding).toBe(true)

    // -------------------------------------------------------------------------
    // STEP 3: Speech Studio Synthesis (Personal Voice Mode)
    // -------------------------------------------------------------------------
    const scriptPayload = {
      text: 'Namaste, kal subah 10 baje meeting hai. Kripya ₹2,500 ka invoice saath lekar aayein.',
      title: 'Hinglish Invoice Notification',
      targetLanguage: 'auto',
      voiceMode: 'personal',
      speed: 1.0,
    }

    const genRes = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send(scriptPayload)

    expect(genRes.status).toBe(201)
    expect(genRes.body.jobId).toBeDefined()
    expect(genRes.body.status).toBe('completed')
    expect(genRes.body.asset.voiceMode).toBe('personal')
    expect(genRes.body.asset.signedUrl).toBeDefined()

    const createdAssetId = genRes.body.asset.id

    // -------------------------------------------------------------------------
    // STEP 4: Persistent Audio Library Listing & Signed URL Access
    // -------------------------------------------------------------------------
    const libRes = await request(app)
      .get('/api/audio')
      .set('Authorization', `Bearer ${authToken}`)

    expect(libRes.status).toBe(200)
    expect(libRes.body.assets.some((a: any) => a.id === createdAssetId)).toBe(true)

    // Issue short-lived signed URL for download
    const urlRes = await request(app)
      .get(`/api/audio/${createdAssetId}/url`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(urlRes.status).toBe(200)
    expect(urlRes.body.signedUrl).toBeDefined()
    expect(urlRes.body.signedUrl).toContain(`${testUserId}/${createdAssetId}.wav`)

    // -------------------------------------------------------------------------
    // STEP 5: Asset Deletion & Voice Profile Revocation
    // -------------------------------------------------------------------------
    // Delete the generated audio asset
    const deleteAudioRes = await request(app)
      .delete(`/api/audio/${createdAssetId}`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(deleteAudioRes.status).toBe(200)

    // Verify it is no longer listed in active library
    const libAfterDelete = await request(app)
      .get('/api/audio')
      .set('Authorization', `Bearer ${authToken}`)

    expect(libAfterDelete.body.assets.some((a: any) => a.id === createdAssetId)).toBe(false)

    // Revoke voice profile and purge speaker embedding
    const revokeRes = await request(app)
      .delete('/api/voice/me')
      .set('Authorization', `Bearer ${authToken}`)

    expect(revokeRes.status).toBe(200)
    expect(revokeRes.body.message).toContain('Voice profile revoked')

    // Profile is now gone
    const finalVoiceRes = await request(app)
      .get('/api/voice/me')
      .set('Authorization', `Bearer ${authToken}`)

    expect(finalVoiceRes.status).toBe(404)
  })
})

