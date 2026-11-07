import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { mockDb, dbRepo, VoiceProfileRecord } from '../db/repository.js'
import { gnaniProvider } from '../providers/gnani/index.js'
import { createTestToken } from './helpers.js'
import { generateDeterministicWav } from '../modules/audio/audio.utils.js'

describe('VAANI — Voice Profile Status & Speaker Embedding Verification Suite', () => {
  const tokenUser1 = createTestToken('user-1', 'user1@example.com')
  const tokenUserNew = createTestToken('user-new', 'newuser@example.com')
  const tokenUserLegacy = createTestToken('user-legacy', 'legacy@example.com')

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

  describe('1. Existing Profile Without Embedding (Inconsistency Detection & Auto-Healing)', () => {
    it('detects profile with placeholder string and returns EMBEDDING_MISSING with isReadyForSynthesis: false', async () => {
      // Seed a legacy profile with the old mock string 'enc_embedding_vector_sample' and status: 'ready'
      const legacyProfile: VoiceProfileRecord = {
        id: 'vp-legacy-1',
        user_id: 'user-legacy',
        provider: 'gnani',
        provider_voice_ref: 'enc_embedding_vector_sample', // Old fake placeholder
        status: 'ready', // Old fake status in DB
        enrollment_language: 'hi-IN',
        supported_languages: ['hi-IN', 'en-IN'],
        sample_object_key: 'user-legacy/sample.wav',
        sample_duration_sec: 15,
        consent_version: 'v1.0-2026',
        consented_at: new Date().toISOString(),
        deleted_at: null,
        created_at: new Date().toISOString(),
      }
      mockDb.voiceProfiles.set('vp-legacy-1', legacyProfile)

      const res = await request(app)
        .get('/api/voice/me')
        .set('Authorization', `Bearer ${tokenUserLegacy}`)

      expect(res.status).toBe(200)
      expect(res.body.enrollmentStatus).toBe('EMBEDDING_MISSING')
      expect(res.body.embeddingStatus).toBe('MISSING')
      expect(res.body.isReadyForSynthesis).toBe(false)
      expect(res.body.hasSpeakerEmbedding).toBe(false)
      expect(res.body.errorMessage).toContain('missing an active speaker embedding tensor')

      // Verify that the database record was auto-healed so DB status is no longer falsely 'ready'
      const healedProfile = await dbRepo.getVoiceProfile('user-legacy')
      expect(healedProfile?.status).not.toBe('ready')
    })
  })

  describe('2. New Voice Enrollment Workflow', () => {
    it('records consent, uploads audio, extracts 768-dim tensor, and activates profile (READY)', async () => {
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
      expect(res.body.profile.enrollmentStatus).toBe('READY')
      expect(res.body.profile.embeddingStatus).toBe('ACTIVE')
      expect(res.body.profile.isReadyForSynthesis).toBe(true)
      expect(res.body.profile.hasSpeakerEmbedding).toBe(true)

      // Verify DB persistence
      const saved = await dbRepo.getVoiceProfile('user-new')
      expect(saved?.status).toBe('ready')
      const parsedRef = JSON.parse(saved!.provider_voice_ref!)
      expect(parsedRef.shape).toEqual([1, 768])
      expect(parsedRef.embedding).toBeDefined()
    })
  })

  describe('3. Voice Re-recording & Safe Update Workflow', () => {
    it('successfully re-records and updates to a new 768-dim embedding tensor', async () => {
      // User 1 already has a profile; re-record with new audio
      const updatedTensor = {
        embedding: Buffer.alloc(768 * 2, 99).toString('base64'),
        shape: [1, 768],
        dtype: 'torch.bfloat16',
      }
      vi.spyOn(gnaniProvider, 'enrollVoice').mockResolvedValueOnce(updatedTensor as any)

      const dummyWav = generateDeterministicWav(12, 220)
      const res = await request(app)
        .post('/api/voice/enroll')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          consentAccepted: true,
          consentVersion: 'v1.0-2026',
          enrollmentLanguage: 'hi-IN',
          sampleDurationSec: 12,
          audioBase64: dummyWav.toString('base64'),
          mimeType: 'audio/wav',
        })

      expect(res.status).toBe(201)
      expect(res.body.profile.isReadyForSynthesis).toBe(true)

      // Verify GET /api/voice/me reflects the updated profile
      const meRes = await request(app)
        .get('/api/voice/me')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(meRes.status).toBe(200)
      expect(meRes.body.enrollmentStatus).toBe('READY')
      expect(meRes.body.isReadyForSynthesis).toBe(true)
    })

    it('Safe Update Rule: preserves previous active profile if re-recording extraction fails', async () => {
      const initialProfile = await dbRepo.getVoiceProfile('user-1')
      expect(initialProfile?.status).toBe('ready')

      // Simulate noisy sample failure at provider
      vi.spyOn(gnaniProvider, 'enrollVoice').mockRejectedValueOnce(
        new Error('GNANI_AUDIO_TOO_NOISY: Background noise detected')
      )

      const dummyWav = generateDeterministicWav(6, 200)
      const res = await request(app)
        .post('/api/voice/enroll')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          consentAccepted: true,
          consentVersion: 'v1.0-2026',
          enrollmentLanguage: 'hi-IN',
          sampleDurationSec: 6,
          audioBase64: dummyWav.toString('base64'),
          mimeType: 'audio/wav',
        })

      expect(res.status).toBe(502)
      expect(res.body.error).toBe('GNANI_ENROLLMENT_FAILED')
      expect(res.body.message).toContain('previously active voice profile has been preserved')

      // Profile remains untouched and active
      const afterProfile = await dbRepo.getVoiceProfile('user-1')
      expect(afterProfile?.status).toBe('ready')
      expect(afterProfile?.provider_voice_ref).toBe(initialProfile?.provider_voice_ref)
    })
  })

  describe('4. Verified Speaker Embedding Inspection (GET /api/voice/me)', () => {
    it('returns authoritative READY status when valid 768-dim tensor exists', async () => {
      const res = await request(app)
        .get('/api/voice/me')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(res.status).toBe(200)
      expect(res.body.enrollmentStatus).toBe('READY')
      expect(res.body.embeddingStatus).toBe('ACTIVE')
      expect(res.body.isReadyForSynthesis).toBe(true)
      expect(res.body.hasSpeakerEmbedding).toBe(true)
      // Confidential raw tensor is never leaked in status envelope
      expect(res.body.provider_voice_ref).toBeUndefined()
    })

    it('returns NOT_ENROLLED for user with no record', async () => {
      const res = await request(app)
        .get('/api/voice/me')
        .set('Authorization', `Bearer ${tokenUserNew}`)

      expect(res.status).toBe(404)
      expect(res.body.enrollmentStatus).toBe('NOT_ENROLLED')
      expect(res.body.isReadyForSynthesis).toBe(false)
    })
  })

  describe('5. Personal Voice Speech Generation Guard', () => {
    it('synthesizes personal speech successfully when profile is verified READY', async () => {
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
    })

    it('blocks personal synthesis with 400 VOICE_EMBEDDING_INVALID if embedding is missing', async () => {
      // Corrupt user 1 profile
      const profile = await dbRepo.getVoiceProfile('user-1')
      if (profile) {
        profile.provider_voice_ref = null
        await dbRepo.saveVoiceProfile(profile)
      }

      const res = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          text: 'Attempting personal synthesis without tensor.',
          targetLanguage: 'hi-IN',
          voiceMode: 'personal',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('VOICE_EMBEDDING_INVALID')
      expect(res.body.embeddingStatus).toBe('MISSING')
      expect(res.body.message).toContain('missing an active speaker embedding tensor')
    })
  })

  describe('6. Standard Voice Speech Generation (Timbre v2.5)', () => {
    it('synthesizes standard voice speech without requiring custom embedding', async () => {
      const res = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserNew}`)
        .send({
          text: 'Hello from standard Timbre voice.',
          title: 'Standard English',
          targetLanguage: 'en-IN',
          voiceMode: 'standard',
          standardVoiceId: 'Pranav',
        })

      expect(res.status).toBe(201)
      expect(res.body.asset.voiceMode).toBe('standard')
      expect(res.body.asset.voiceLabel).toContain('Pranav')
    })
  })

  describe('7. Biometric Revocation Workflow', () => {
    it('revokes profile, logs DPDP audit, and immediately reverts user status to NOT_ENROLLED', async () => {
      const delRes = await request(app)
        .delete('/api/voice/me')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(delRes.status).toBe(200)

      const meRes = await request(app)
        .get('/api/voice/me')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(meRes.status).toBe(404)
      expect(meRes.body.enrollmentStatus).toBe('NOT_ENROLLED')
      expect(meRes.body.isReadyForSynthesis).toBe(false)
    })
  })

  describe('8. Audio Format & Gnani HTTP 500 Root Cause Safeguards', () => {
    it('rejects WebM audio format with 400 UNSUPPORTED_AUDIO_FORMAT before calling provider', async () => {
      // Simulate WebM container header bytes: 0x1A 0x45 0xDF 0xA3
      const fakeWebm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, ...new Array(2000).fill(0)])
      const base64Webm = fakeWebm.toString('base64')

      const res = await request(app)
        .post('/api/voice/enroll')
        .set('Authorization', `Bearer ${tokenUserNew}`)
        .send({
          consentAccepted: true,
          consentVersion: 'v1.0-2026',
          enrollmentLanguage: 'hi-IN',
          sampleDurationSec: 10,
          audioBase64: base64Webm,
          mimeType: 'audio/webm',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('UNSUPPORTED_AUDIO_FORMAT')
      expect(res.body.message).toContain('WebM')
    })

    it('rejects audio samples shorter than 5 seconds with 400 AUDIO_TOO_SHORT', async () => {
      // 2-second WAV
      const shortWav = generateDeterministicWav(2, 300)
      const base64Short = shortWav.toString('base64')

      const res = await request(app)
        .post('/api/voice/enroll')
        .set('Authorization', `Bearer ${tokenUserNew}`)
        .send({
          consentAccepted: true,
          consentVersion: 'v1.0-2026',
          enrollmentLanguage: 'hi-IN',
          sampleDurationSec: 3,
          audioBase64: base64Short,
          mimeType: 'audio/wav',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('AUDIO_TOO_SHORT')
      expect(res.body.message).toContain('too short')
    })

    it('handles provider HTTP 500 gracefully without converting to fake success', async () => {
      const validWav = generateDeterministicWav(8, 220)
      const base64Valid = validWav.toString('base64')

      // Mock gnaniProvider.enrollVoice to throw provider 500
      vi.spyOn(gnaniProvider, 'enrollVoice').mockRejectedValueOnce(
        new Error('GNANI_ENROLLMENT_ERROR (500): We are facing technical difficulties. Please try again later.')
      )

      const res = await request(app)
        .post('/api/voice/enroll')
        .set('Authorization', `Bearer ${tokenUserNew}`)
        .send({
          consentAccepted: true,
          consentVersion: 'v1.0-2026',
          enrollmentLanguage: 'hi-IN',
          sampleDurationSec: 8,
          audioBase64: base64Valid,
          mimeType: 'audio/wav',
        })

      expect(res.status).toBe(502)
      expect(res.body.error).toBe('GNANI_ENROLLMENT_FAILED')
      expect(res.body.message).toContain('GNANI_ENROLLMENT_ERROR (500)')

      // Verify profile is NOT marked ready
      const profile = await dbRepo.getVoiceProfile('user-new')
      expect(profile?.status).not.toBe('ready')
    })
  })
})
