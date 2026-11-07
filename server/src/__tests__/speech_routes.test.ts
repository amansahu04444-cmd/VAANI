import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { mockDb } from '../db/repository.js'
import { createTestToken } from './helpers.js'

describe('Speech Studio Backend API Routes (POST /api/speech/generate)', () => {
  const tokenUserA = createTestToken('user-a', 'usera@example.com')
  const tokenUserB = createTestToken('user-b', 'userb@example.com')

  beforeEach(() => {
    mockDb.reset()
    mockDb.seedInitialData()
  })

  it('synthesizes speech with standard Timbre voice and creates a signed audio asset (201)', async () => {
    const res = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        text: 'नमस्ते, कल सुबह 10 बजे मीटिंग है।',
        title: 'Meeting Notice',
        targetLanguage: 'hi-IN',
        voiceMode: 'standard',
        standardVoiceId: 'Nalini',
        speed: 1.0,
      })

    expect(res.status).toBe(201)
    expect(res.body.jobId).toBeDefined()
    expect(res.body.status).toBe('completed')
    expect(res.body.asset).toBeDefined()
    expect(res.body.asset.title).toBe('Meeting Notice')
    expect(res.body.asset.languageCode).toBe('hi-IN')
    expect(res.body.asset.voiceMode).toBe('standard')
    expect(res.body.asset.signedUrl).toBeDefined()
    expect(res.body.asset.durationSeconds).toBeGreaterThan(0)

    // Verify asset persists in database
    const savedAsset = mockDb.audioAssets.get(res.body.asset.id)
    expect(savedAsset).toBeDefined()
    expect(savedAsset?.user_id).toBe('user-a')
  })

  it('synthesizes speech with Personal Voice when user has an active voice profile', async () => {
    // User A has active voice profile 'vp-user-a'
    const res = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        text: 'This is my personal voice profile speaking in Indian English.',
        title: 'Personal English Note',
        targetLanguage: 'en-IN',
        voiceMode: 'personal',
      })

    expect(res.status).toBe(201)
    expect(res.body.asset.voiceMode).toBe('personal')
    expect(res.body.asset.voiceLabel).toContain('Your Enrolled Voice')
  })

  it('blocks Personal Voice generation if user has no voice profile (400 Bad Request)', async () => {
    // User B has NO voice profile in initial seed
    const res = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        text: 'Attempting personal voice without enrollment.',
        targetLanguage: 'en-IN',
        voiceMode: 'personal',
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VOICE_PROFILE_REQUIRED')
    expect(res.body.message).toContain('You must first enroll your voice profile')
  })

  it('rejects empty script with 400 validation error', async () => {
    const res = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        text: '',
        targetLanguage: 'hi-IN',
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('rejects script exceeding 1,000 characters with 400 validation error', async () => {
    const res = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        text: 'X'.repeat(1005),
        targetLanguage: 'hi-IN',
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('rejects unsupported language locale with 400 validation error', async () => {
    const res = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        text: 'Test speech',
        targetLanguage: 'fr-FR', // Unsupported
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('allows polling job status via GET /api/speech/:id', async () => {
    // 1. Generate speech
    const genRes = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        text: 'Polling job test script.',
        targetLanguage: 'auto',
      })

    const jobId = genRes.body.jobId

    // 2. Poll job
    const pollRes = await request(app)
      .get(`/api/speech/${jobId}`)
      .set('Authorization', `Bearer ${tokenUserA}`)

    expect(pollRes.status).toBe(200)
    expect(pollRes.body.jobId).toBe(jobId)
    expect(pollRes.body.status).toBe('completed')
  })

  it('prevents User B from polling or accessing User A speech jobs (404 Not Found)', async () => {
    // User A generates speech
    const genRes = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        text: 'Confidential audio for User A.',
        targetLanguage: 'hi-IN',
      })

    const jobId = genRes.body.jobId

    // User B tries to poll User A's job
    const res = await request(app)
      .get(`/api/speech/${jobId}`)
      .set('Authorization', `Bearer ${tokenUserB}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('JOB_NOT_FOUND')
  })

  describe('Public Demo Speech Endpoint (POST /api/speech/demo-generate)', () => {
    it('synthesizes speech without any Authorization header and leaves database untouched (200)', async () => {
      const initialAssetCount = mockDb.audioAssets.size

      const res = await request(app)
        .post('/api/speech/demo-generate')
        .send({
          text: 'नमस्ते, यह वाणी डेमो मोड का भाषण संश्लेषण परीक्षण है।',
          title: 'Public Demo Test',
          targetLanguage: 'hi-IN',
          standardVoiceId: 'Nalini',
          speed: 1.0,
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.isDemo).toBe(true)
      expect(res.body.audioBase64).toBeDefined()
      expect(res.body.asset).toBeDefined()
      expect(res.body.asset.voiceMode).toBe('standard')
      expect(res.body.asset.audioBase64).toBeDefined()
      expect(res.body.asset.durationSeconds).toBeGreaterThan(0)

      // Strict isolation: ZERO database mutations
      expect(mockDb.audioAssets.size).toBe(initialAssetCount)
    })

    it('rejects demo script exceeding 300 character limit (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/speech/demo-generate')
        .send({
          text: 'A'.repeat(305),
          targetLanguage: 'hi-IN',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('VALIDATION_ERROR')
      expect(res.body.details?.[0]?.message).toContain('300')
    })

    it('rejects empty script with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/speech/demo-generate')
        .send({
          text: '',
          targetLanguage: 'en-IN',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('VALIDATION_ERROR')
    })
  })
})

