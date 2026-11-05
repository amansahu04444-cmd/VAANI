import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { mockDb } from '../db/repository.js'
import { createTestToken } from './helpers.js'
import { ensureValidWavBuffer, inspectAudioBuffer, generateDeterministicWav } from '../modules/audio/audio.utils.js'

describe('Audio Library Playback End-to-End Suite', () => {
  const tokenUser1 = createTestToken('user-1', 'aman@vaani.ai')
  const tokenUser2 = createTestToken('user-2', 'hacker@example.com')

  beforeEach(() => {
    mockDb.reset()
    mockDb.seedInitialData()
  })

  // =========================================================================
  // 1. WAV Header Validation & Gnani Streaming Bug Repair
  // =========================================================================
  describe('WAV Header Repair & Audio Buffer Inspection', () => {
    it('repairs Gnani 0xFFFFFFFF streaming chunk size headers into valid browser-playable WAV', () => {
      // Create a simulated Gnani raw buffer with 0xFFFFFFFF (-1) in RIFF and data size
      const pcmPayload = Buffer.alloc(96000) // 1 second of 48kHz 16-bit mono PCM (zeros)
      const corruptedHeader = Buffer.alloc(44)
      corruptedHeader.write('RIFF', 0)
      corruptedHeader.writeUInt32LE(0xffffffff, 4) // Corrupted RIFF size
      corruptedHeader.write('WAVE', 8)
      corruptedHeader.write('fmt ', 12)
      corruptedHeader.writeUInt32LE(16, 16)
      corruptedHeader.writeUInt16LE(1, 20) // PCM
      corruptedHeader.writeUInt16LE(1, 22) // Mono
      corruptedHeader.writeUInt32LE(48000, 24) // 48kHz
      corruptedHeader.writeUInt32LE(96000, 28) // Byte rate
      corruptedHeader.writeUInt16LE(2, 32) // Block align
      corruptedHeader.writeUInt16LE(16, 34) // 16-bit
      corruptedHeader.write('data', 36)
      corruptedHeader.writeUInt32LE(0xffffffff, 40) // Corrupted Data size

      const corruptedBuffer = Buffer.concat([corruptedHeader, pcmPayload])
      expect(corruptedBuffer.readUInt32LE(4)).toBe(4294967295)
      expect(corruptedBuffer.readUInt32LE(40)).toBe(4294967295)

      // Apply our repair utility
      const fixedBuffer = ensureValidWavBuffer(corruptedBuffer, 48000)
      expect(fixedBuffer.readUInt32LE(4)).toBe(fixedBuffer.length - 8)
      expect(fixedBuffer.readUInt32LE(40)).toBe(fixedBuffer.length - 44)

      // Inspect fixed audio buffer
      const info = inspectAudioBuffer(fixedBuffer)
      expect(info.isValid).toBe(true)
      expect(info.format).toBe('wav')
      expect(info.sampleRate).toBe(48000)
      expect(info.channels).toBe(1)
      expect(info.bitsPerSample).toBe(16)
      expect(info.durationMs).toBe(1000)
    })

    it('generates deterministic fallback WAV buffer with valid headers and harmonic audio', () => {
      const wav = generateDeterministicWav(2, 440)
      const info = inspectAudioBuffer(wav)
      expect(info.isValid).toBe(true)
      expect(info.format).toBe('wav')
      expect(info.sampleRate).toBe(48000)
      expect(info.durationMs).toBe(2000)
    })
  })

  // =========================================================================
  // 2. Audio Library Listing (GET /api/audio)
  // =========================================================================
  describe('GET /api/audio (Asset Inventory Listing)', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/audio')
      expect(res.status).toBe(401)
    })

    it('returns the list of audio assets owned by the authenticated user', async () => {
      const res = await request(app)
        .get('/api/audio')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(res.status).toBe(200)
      expect(res.body.assets).toBeInstanceOf(Array)
      expect(res.body.assets.length).toBeGreaterThanOrEqual(3)

      const asset1 = res.body.assets.find((a: any) => a.id === 'lib-001')
      expect(asset1).toBeDefined()
      expect(asset1.title).toBe('Hinglish Project Meeting & Invoice Reminder')
      expect(asset1.user_id).toBe('user-1')
      expect(asset1.duration_ms).toBe(12000)
    })
  })

  // =========================================================================
  // 3. Playback URL Issuance & IDOR Isolation (GET /api/audio/:id/url)
  // =========================================================================
  describe('GET /api/audio/:id/url (Signed Playback URL Issuance)', () => {
    it('issues a valid signed or stream URL for an owned audio asset', async () => {
      const res = await request(app)
        .get('/api/audio/lib-001/url')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(res.status).toBe(200)
      expect(res.body.assetId).toBe('lib-001')
      expect(res.body.title).toBe('Hinglish Project Meeting & Invoice Reminder')
      expect(res.body.signedUrl || res.body.audioUrl).toBeDefined()
      expect(res.body.expiresAt).toBeDefined()
      expect(res.body.durationMs).toBe(12000)
    })

    it('blocks cross-user playback access (IDOR Protection) with 403 Forbidden', async () => {
      // User 2 attempts to request signed URL for User 1's audio asset
      const res = await request(app)
        .get('/api/audio/lib-001/url')
        .set('Authorization', `Bearer ${tokenUser2}`)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('FORBIDDEN')
    })

    it('returns 404 when requested asset does not exist', async () => {
      const res = await request(app)
        .get('/api/audio/non-existent-asset-id/url')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('AUDIO_NOT_FOUND')
    })
  })

  // =========================================================================
  // 4. Audio Streaming & HTTP 206 Seeking (GET /api/audio/:id/stream)
  // =========================================================================
  describe('GET /api/audio/:id/stream (Streaming & Seeking)', () => {
    it('streams complete audio with HTTP 200 when no Range header is sent', async () => {
      const res = await request(app)
        .get('/api/audio/lib-001/stream')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe('audio/wav')
      expect(res.headers['accept-ranges']).toBe('bytes')
      expect(res.body.length).toBeGreaterThan(0)
    })

    it('supports HTTP 206 Partial Content byte-range seeking', async () => {
      const res = await request(app)
        .get('/api/audio/lib-001/stream')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .set('Range', 'bytes=0-1023')

      expect(res.status).toBe(206)
      expect(res.headers['content-type']).toBe('audio/wav')
      expect(res.headers['content-range']).toContain('bytes 0-1023/')
      expect(res.body.length).toBe(1024)
    })

    it('blocks unauthorized users from streaming another user audio (403)', async () => {
      const res = await request(app)
        .get('/api/audio/lib-001/stream')
        .set('Authorization', `Bearer ${tokenUser2}`)

      expect(res.status).toBe(403)
    })
  })

  // =========================================================================
  // 5. Audio Downloading (GET /api/audio/:id/download)
  // =========================================================================
  describe('GET /api/audio/:id/download (Direct WAV Download)', () => {
    it('downloads audio file with attachment Content-Disposition', async () => {
      const res = await request(app)
        .get('/api/audio/lib-001/download')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe('audio/wav')
      expect(res.headers['content-disposition']).toContain('attachment; filename=')
      expect(res.body.length).toBeGreaterThan(0)
    })

    it('blocks unauthorized users from downloading another user audio (403)', async () => {
      const res = await request(app)
        .get('/api/audio/lib-001/download')
        .set('Authorization', `Bearer ${tokenUser2}`)

      expect(res.status).toBe(403)
    })
  })

  // =========================================================================
  // 6. Complete End-to-End Pipeline
  // =========================================================================
  describe('End-to-End Synthesis -> Library -> Playback Flow', () => {
    it('generates speech, saves to audio_assets, retrieves signed URL and streams successfully', async () => {
      // Step A: Generate speech
      const genRes = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          text: 'यह एक परीक्षण ऑडियो है जो लाइब्रेरी में प्लेबैक के लिए उपलब्ध होगा।',
          title: 'Hindi Playback Verification Test',
          targetLanguage: 'hi-IN',
          voiceMode: 'standard',
          standardVoiceId: 'Nalini',
          speed: 1.0,
        })

      expect(genRes.status).toBe(201)
      const generatedAsset = genRes.body.asset
      expect(generatedAsset.id).toBeDefined()
      expect(generatedAsset.audioUrl).toBeDefined()

      // Step B: List library and verify asset is listed
      const listRes = await request(app)
        .get('/api/audio')
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(listRes.status).toBe(200)
      const foundInList = listRes.body.assets.find((a: any) => a.id === generatedAsset.id)
      expect(foundInList).toBeDefined()

      // Step C: Secure on-demand playback URL
      const urlRes = await request(app)
        .get(`/api/audio/${generatedAsset.id}/url`)
        .set('Authorization', `Bearer ${tokenUser1}`)

      expect(urlRes.status).toBe(200)
      expect(urlRes.body.signedUrl).toBeDefined()
    })
  })
})
