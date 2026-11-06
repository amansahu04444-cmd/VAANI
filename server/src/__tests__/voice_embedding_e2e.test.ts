import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { mockDb, dbRepo, VoiceProfileRecord } from '../db/repository.js'
import { gnaniProvider } from '../providers/gnani/index.js'
import { createTestToken } from './helpers.js'
import { generateDeterministicWav } from '../modules/audio/audio.utils.js'

describe('End-to-End Voice Cloning & Speaker Embedding Tensor Pipeline', () => {
  const tokenUser1 = createTestToken('user-1', 'user1@example.com')
  const tokenUserNew = createTestToken('user-new', 'newuser@example.com')

  // Sample 768-dimensional float embedding tensor
  const mockTensor768 = {
    embedding: Buffer.alloc(768 * 2, 42).toString('base64'),
    shape: [1, 768],
    dtype: 'torch.bfloat16',
  }

  beforeEach(() => {
    mockDb.reset()
    mockDb.seedInitialData()
    vi.restoreAllMocks()
  })

  describe('Voice Enrollment & Speaker Embedding Extraction (POST /api/voice/enroll)', () => {
    it('rejects enrollment without explicit DPDP affirmative consent (400)', async () => {
      const res = await request(app)
        .post('/api/voice/enroll')
        .set('Authorization', `Bearer ${tokenUserNew}`)
        .send({
          consentAccepted: false,
          enrollmentLanguage: 'hi-IN',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('VALIDATION_ERROR')
    })

    it('successfully extracts 768-dim tensor, saves profile, and audits DPDP consent', async () => {
      const dummyWav = generateDeterministicWav(10, 200)
      const base64Audio = dummyWav.toString('base64')

      // Mock gnaniProvider.enrollVoice to return verified tensor
      vi.spyOn(gnaniProvider, 'enrollVoice').mockResolvedValueOnce(mockTensor768 as any)

      const res = await request(app)
        .post('/api/voice/enroll')
        .set('Authorization', `Bearer ${tokenUserNew}`)
        .send({
          consentAccepted: true,
          consentVersion: 'v1.0-2026',
          enrollmentLanguage: 'hi-IN',
          sampleDurationSec: 10,
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
        })

      expect(res.status).toBe(201)
      expect(res.body.message).toContain('768-dim speaker embedding generated successfully')
      expect(res.body.profile.hasSpeakerEmbedding).toBe(true)
      expect(res.body.profile.status).toBe('ready')

      // Verify persistence in repository
      const saved = await dbRepo.getVoiceProfile('user-new')
      expect(saved).toBeDefined()
      expect(saved?.status).toBe('ready')
      expect(saved?.provider_voice_ref).toBeDefined()

      const parsedRef = JSON.parse(saved!.provider_voice_ref)
      expect(parsedRef.shape).toEqual([1, 768])
      expect(parsedRef.dtype).toBe('torch.bfloat16')
      expect(parsedRef.embedding).toBeDefined()

      // Verify DPDP consent log
      const consentLogs = await dbRepo.getConsentEvents('user-new')
      expect(consentLogs.length).toBeGreaterThan(0)
      expect(consentLogs[0].event_type).toBe('granted')
    })

    it('Safe Update Rule: preserves existing working profile if re-recording extraction fails', async () => {
      // User 1 already has an active working voice profile seeded
      const initialProfile = await dbRepo.getVoiceProfile('user-1')
      expect(initialProfile).toBeDefined()
      expect(initialProfile?.status).toBe('ready')

      // Simulate provider error during re-recording
      vi.spyOn(gnaniProvider, 'enrollVoice').mockRejectedValueOnce(
        new Error('GNANI_AUDIO_TOO_NOISY: Signal to noise ratio too low')
      )

      const dummyWav = generateDeterministicWav(8, 200)
      const res = await request(app)
        .post('/api/voice/enroll')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          consentAccepted: true,
          consentVersion: 'v1.0-2026',
          enrollmentLanguage: 'hi-IN',
          sampleDurationSec: 8,
          audioBase64: dummyWav.toString('base64'),
          mimeType: 'audio/wav',
        })

      expect(res.status).toBe(502)
      expect(res.body.error).toBe('GNANI_ENROLLMENT_FAILED')
      expect(res.body.message).toContain('previously active voice profile has been preserved')

      // Verify the profile was NOT corrupted or removed
      const currentProfile = await dbRepo.getVoiceProfile('user-1')
      expect(currentProfile?.status).toBe('ready')
      expect(currentProfile?.provider_voice_ref).toBe(initialProfile?.provider_voice_ref)
    })
  })

  describe('Voice Profile Inspection (GET /api/voice/me)', () => {
    it('returns truthful profile metadata and hasSpeakerEmbedding: true without leaking secrets', async () => {
      const res = await request(app)
        .get('/api/voice/me')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ready')
      expect(res.body.hasSpeakerEmbedding).toBe(true)
      expect(res.body.enrollmentLanguage).toBe('hi-IN')
      // Ensure raw tensor or internal secrets are not dumped in the status envelope
      expect(res.body.provider_voice_ref).toBeUndefined()
    })

    it('returns 404 status not_enrolled for un-enrolled user', async () => {
      const res = await request(app)
        .get('/api/voice/me')
        .set('Authorization', `Bearer ${tokenUserNew}`)

      expect(res.status).toBe(404)
      expect(res.body.status).toBe('not_enrolled')
    })
  })

  describe('Personal Voice Speech Generation (POST /api/speech/generate)', () => {
    it('synthesizes speech in personal voice using the active 768-dim tensor', async () => {
      const res = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          text: 'नमस्ते, यह मेरी अपनी आवाज़ में व्यक्तिगत भाषण संश्लेषण है।',
          title: 'Personal Hindi Note',
          targetLanguage: 'hi-IN',
          voiceMode: 'personal',
          speed: 1.0,
        })

      expect(res.status).toBe(201)
      expect(res.body.status).toBe('completed')
      expect(res.body.asset.voiceMode).toBe('personal')
      expect(res.body.asset.voiceLabel).toContain('Your Enrolled Voice')
      expect(res.body.asset.signedUrl).toBeDefined()
    })

    it('returns VOICE_EMBEDDING_INVALID if stored voice profile is corrupted or missing tensor', async () => {
      // Corrupt user 1 profile to simulate the old bug
      const profile = await dbRepo.getVoiceProfile('user-1')
      if (profile) {
        profile.provider_voice_ref = 'legacy_corrupted_string_without_embedding'
        await dbRepo.saveVoiceProfile(profile)
      }

      const res = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          text: 'Trying to generate with corrupted tensor.',
          targetLanguage: 'en-IN',
          voiceMode: 'personal',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('VOICE_EMBEDDING_INVALID')
      expect(res.body.message).toContain('missing an active speaker embedding tensor')
    })
  })

  describe('Biometric Revocation (DELETE /api/voice/me)', () => {
    it('revokes profile, logs DPDP revocation, and reverts user to not_enrolled', async () => {
      const delRes = await request(app)
        .delete('/api/voice/me')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(delRes.status).toBe(200)
      expect(delRes.body.message).toContain('revoked')

      // Verify GET /api/voice/me returns 404
      const checkRes = await request(app)
        .get('/api/voice/me')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(checkRes.status).toBe(404)
      expect(checkRes.body.status).toBe('not_enrolled')

      // Verify consent audit event was recorded
      const consentLogs = await dbRepo.getConsentEvents('user-1')
      expect(consentLogs.some((e) => e.event_type === 'revoked')).toBe(true)
    })
  })
})
