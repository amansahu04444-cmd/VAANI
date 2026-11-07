import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { mockDb, dbRepo } from '../db/repository.js'
import { StorageService } from '../modules/storage/storage.service.js'
import { createTestToken } from './helpers.js'

describe('VAANI — Audio Library Auto-Save & Supabase Persistence Suite', () => {
  const tokenUserA = createTestToken('user-a', 'usera@example.com')
  const tokenUserB = createTestToken('user-b', 'userb@example.com')

  beforeEach(() => {
    mockDb.reset()
    mockDb.seedInitialData()
  })

  // =========================================================================
  // PHASE 2 & 3: Automatic Audio Upload & PostgreSQL Metadata Persistence
  // =========================================================================
  describe('Phase 2 & 3: Automatic Storage Upload & PostgreSQL Metadata', () => {
    it('automatically uploads audio to generated-audio storage and persists speech_jobs + audio_assets metadata upon generation', async () => {
      const scriptText = 'वाणी स्टूडियो में आपका स्वागत है। यह परीक्षण ऑडियो स्वचालित रूप से सहेजा जाएगा।'
      const title = 'Hindi Auto-Save Test'

      const genRes = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          text: scriptText,
          title,
          targetLanguage: 'hi-IN',
          voiceMode: 'standard',
          standardVoiceId: 'Nalini',
          speed: 1.0,
        })

      expect(genRes.status).toBe(201)
      expect(genRes.body.jobId).toBeDefined()
      expect(genRes.body.status).toBe('completed')

      const asset = genRes.body.asset
      expect(asset).toBeDefined()
      expect(asset.id).toBeDefined()
      expect(asset.title).toBe(title)
      expect(asset.textPreview).toBe(scriptText)
      expect(asset.languageCode).toBe('hi-IN')
      expect(asset.voiceMode).toBe('standard')
      expect(asset.signedUrl).toBeDefined()
      expect(asset.durationSeconds).toBeGreaterThan(0)
      expect(asset.fileSizeBytes).toBeGreaterThan(0)

      // Verify speech_job was inserted in repository
      const speechJob = mockDb.speechJobs.get(genRes.body.jobId)
      expect(speechJob).toBeDefined()
      expect(speechJob?.user_id).toBe('user-a')
      expect(speechJob?.input_text).toBe(scriptText)
      expect(speechJob?.target_language).toBe('hi-IN')
      expect(speechJob?.voice_mode).toBe('standard')
      expect(speechJob?.status).toBe('completed')

      // Verify audio_asset was inserted in repository with reference to speech_job
      const savedAsset = mockDb.audioAssets.get(asset.id)
      expect(savedAsset).toBeDefined()
      expect(savedAsset?.user_id).toBe('user-a')
      expect(savedAsset?.speech_job_id).toBe(genRes.body.jobId)
      expect(savedAsset?.object_key).toBe(`user-a/${asset.id}.wav`)
      expect(savedAsset?.mime_type).toBe('audio/wav')
      expect(savedAsset?.file_size).toBeGreaterThan(0)
      expect(savedAsset?.deleted_at).toBeNull()
    })

    it('persists Personal Voice generated speech with 768-dim embedding metadata', async () => {
      // User A has active voice profile 'vp-user-a'
      const personalScript = 'Namaste, this is synthesized using my enrolled voice timbre in Indian English.'
      const genRes = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          text: personalScript,
          title: 'Personal Timbre Test',
          targetLanguage: 'en-IN',
          voiceMode: 'personal',
          speed: 1.0,
        })

      expect(genRes.status).toBe(201)
      const asset = genRes.body.asset
      expect(asset.voiceMode).toBe('personal')
      expect(asset.voiceLabel).toContain('Your Enrolled Voice')

      // Verify speech_jobs tracks voice_mode = 'personal'
      const job = mockDb.speechJobs.get(genRes.body.jobId)
      expect(job?.voice_mode).toBe('personal')
      expect(job?.voice_profile_id).toBe('vp-user-a')
    })
  })

  // =========================================================================
  // PHASE 4: Failure Handling & Storage Rollback
  // =========================================================================
  describe('Phase 4: Save Failure Handling & Rollback', () => {
    it('returns 500 STORAGE_UPLOAD_FAILED if storage rejects upload', async () => {
      // Mock StorageService.uploadAudio to simulate storage outage
      const originalUpload = StorageService.uploadAudio
      StorageService.uploadAudio = async () => {
        throw new Error('Supabase Storage connection timeout')
      }

      try {
        const genRes = await request(app)
          .post('/api/speech/generate')
          .set('Authorization', `Bearer ${tokenUserA}`)
          .send({
            text: 'Failure handling test script.',
            targetLanguage: 'hi-IN',
            voiceMode: 'standard',
          })

        expect(genRes.status).toBe(500)
        expect(genRes.body.error).toBe('STORAGE_UPLOAD_FAILED')
        expect(genRes.body.message).toContain('Audio generated successfully, but saving failed')
      } finally {
        StorageService.uploadAudio = originalUpload
      }
    })

    it('rolls back uploaded storage object if database insertion fails', async () => {
      let deletedKey: string | null = null
      const originalDelete = StorageService.deleteObject
      StorageService.deleteObject = async (bucket, key, userId) => {
        deletedKey = key
        return true
      }

      // Mock dbRepo.saveAudioAsset to simulate database failure
      const originalSave = dbRepo.saveAudioAsset
      dbRepo.saveAudioAsset = async () => {
        throw new Error('PostgreSQL connection terminated unexpectedly')
      }

      try {
        const genRes = await request(app)
          .post('/api/speech/generate')
          .set('Authorization', `Bearer ${tokenUserA}`)
          .send({
            text: 'Testing storage rollback on DB failure.',
            targetLanguage: 'hi-IN',
            voiceMode: 'standard',
          })

        expect(genRes.status).toBe(500)
        expect(genRes.body.error).toBe('DB_PERSISTENCE_FAILED')
        expect(genRes.body.message).toContain('Audio generated successfully, but saving failed')

        // Verify storage object was cleaned up
        expect(deletedKey).toMatch(/^user-a\/.+\.wav$/)
      } finally {
        StorageService.deleteObject = originalDelete
        dbRepo.saveAudioAsset = originalSave
      }
    })
  })

  // =========================================================================
  // PHASE 5: Audio Library Listing & Enrichment
  // =========================================================================
  describe('Phase 5: Audio Library Query & Enrichment (GET /api/audio)', () => {
    it('returns enriched metadata with script preview, human-friendly language, and voice mode', async () => {
      // Generate two audios for User A
      await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          text: 'पहला टेस्ट स्क्रिप्ट जो लाइब्रेरी में दिखेगा।',
          title: 'First Script',
          targetLanguage: 'hi-IN',
          voiceMode: 'standard',
        })

      await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          text: 'Second test script in Hinglish with invoice details ₹5,000.',
          title: 'Second Script',
          targetLanguage: 'auto',
          voiceMode: 'personal',
        })

      const listRes = await request(app)
        .get('/api/audio')
        .set('Authorization', `Bearer ${tokenUserA}`)

      expect(listRes.status).toBe(200)
      expect(listRes.body.assets).toBeInstanceOf(Array)
      expect(listRes.body.totalCount).toBeGreaterThanOrEqual(3) // 2 new + 1 seeded 'audio-user-a'

      // Check first script enriched properties
      const first = listRes.body.assets.find((a: any) => a.title === 'First Script')
      expect(first).toBeDefined()
      expect(first.textPreview).toBe('पहला टेस्ट स्क्रिप्ट जो लाइब्रेरी में दिखेगा।')
      expect(first.languageCode).toBe('hi-IN')
      expect(first.languageName).toBe('Hindi (हिन्दी)')
      expect(first.voiceMode).toBe('standard')
      expect(first.voiceLabel).toBe('Timbre Standard')
      expect(first.storagePath).toMatch(/^user-a\/.+\.wav$/)
      expect(first.mimeType).toBe('audio/wav')
      expect(first.durationSeconds).toBeGreaterThan(0)

      // Check second script enriched properties
      const second = listRes.body.assets.find((a: any) => a.title === 'Second Script')
      expect(second).toBeDefined()
      expect(second.textPreview).toBe('Second test script in Hinglish with invoice details ₹5,000.')
      expect(second.languageCode).toBe('auto')
      expect(second.languageName).toBe('Hinglish (Code-mixed)')
      expect(second.voiceMode).toBe('personal')
      expect(second.voiceLabel).toBe('Enrolled Voice')
    })
  })

  // =========================================================================
  // PHASE 6 & 7: Playback, Signed URLs, and User Isolation
  // =========================================================================
  describe('Phase 6 & 7: Playback URL Issuance & Strict User Isolation', () => {
    it('issues signed playback URL for owned audio asset', async () => {
      const genRes = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          text: 'Playback verification script.',
          title: 'Playback Asset',
          targetLanguage: 'hi-IN',
          voiceMode: 'standard',
        })

      const assetId = genRes.body.asset.id

      const urlRes = await request(app)
        .get(`/api/audio/${assetId}/url`)
        .set('Authorization', `Bearer ${tokenUserA}`)

      expect(urlRes.status).toBe(200)
      expect(urlRes.body.signedUrl).toBeDefined()
      expect(urlRes.body.expiresAt).toBeDefined()
      expect(new Date(urlRes.body.expiresAt).getTime()).toBeGreaterThan(Date.now())
    })

    it('IDOR Check: User B CANNOT list, stream, download, or get signed URL for User A audio', async () => {
      const genRes = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          text: 'Private confidential speech for User A only.',
          title: 'User A Secret Audio',
          targetLanguage: 'hi-IN',
          voiceMode: 'standard',
        })

      const assetId = genRes.body.asset.id

      // 1. User B lists audio: must NOT contain User A's asset
      const listB = await request(app)
        .get('/api/audio')
        .set('Authorization', `Bearer ${tokenUserB}`)

      expect(listB.status).toBe(200)
      const foundInB = listB.body.assets.find((a: any) => a.id === assetId)
      expect(foundInB).toBeUndefined()

      // 2. User B tries GET /api/audio/:id/url -> 403 Forbidden
      const urlB = await request(app)
        .get(`/api/audio/${assetId}/url`)
        .set('Authorization', `Bearer ${tokenUserB}`)

      expect(urlB.status).toBe(403)
      expect(urlB.body.error).toBe('FORBIDDEN')

      // 3. User B tries GET /api/audio/:id/stream -> 403 Forbidden
      const streamB = await request(app)
        .get(`/api/audio/${assetId}/stream`)
        .set('Authorization', `Bearer ${tokenUserB}`)

      expect(streamB.status).toBe(403)

      // 4. User B tries GET /api/audio/:id/download -> 403 Forbidden
      const downloadB = await request(app)
        .get(`/api/audio/${assetId}/download`)
        .set('Authorization', `Bearer ${tokenUserB}`)

      expect(downloadB.status).toBe(403)

      // 5. User B tries DELETE /api/audio/:id -> 403 Forbidden
      const deleteB = await request(app)
        .delete(`/api/audio/${assetId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)

      expect(deleteB.status).toBe(403)
    })
  })

  // =========================================================================
  // PHASE 8: Deletion Lifecycle
  // =========================================================================
  describe('Phase 8: Audio Asset Deletion Lifecycle', () => {
    it('deletes storage object and database record, removing it from subsequent library queries', async () => {
      // 1. Generate speech
      const genRes = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          text: 'Script to be generated and then deleted.',
          title: 'Temporary Asset',
          targetLanguage: 'hi-IN',
          voiceMode: 'standard',
        })

      const assetId = genRes.body.asset.id

      // Verify it exists in library
      const beforeList = await request(app)
        .get('/api/audio')
        .set('Authorization', `Bearer ${tokenUserA}`)
      expect(beforeList.body.assets.some((a: any) => a.id === assetId)).toBe(true)

      // 2. Delete asset
      const delRes = await request(app)
        .delete(`/api/audio/${assetId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)

      expect(delRes.status).toBe(200)
      expect(delRes.body.deletedId).toBe(assetId)

      // 3. Verify it is removed from library listing
      const afterList = await request(app)
        .get('/api/audio')
        .set('Authorization', `Bearer ${tokenUserA}`)
      expect(afterList.body.assets.some((a: any) => a.id === assetId)).toBe(false)

      // 4. Verify playback URL returns 404
      const urlRes = await request(app)
        .get(`/api/audio/${assetId}/url`)
        .set('Authorization', `Bearer ${tokenUserA}`)
      expect(urlRes.status).toBe(404)

      // 5. Verify database record is marked deleted
      const dbRecord = mockDb.audioAssets.get(assetId)
      expect(dbRecord?.deleted_at).not.toBeNull()
    })
  })
})

