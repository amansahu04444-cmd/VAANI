import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { mockDb } from '../db/repository.js'
import { createTestToken } from './helpers.js'
import { GnaniTimbreClient } from '../providers/gnani/timbre.client.js'
import { gnaniProvider } from '../providers/gnani/index.js'

describe('VAANI — Gnani Speech Synthesis Timeout & Resilience Suite', () => {
  const fakeApiKey = 'vach_test_participant_key_xyz123'
  const mockBaseUrl = 'https://mock.vachana.ai'
  const tokenUserA = createTestToken('user-a', 'usera@example.com')

  beforeEach(() => {
    mockDb.reset()
    mockDb.seedInitialData()
    vi.restoreAllMocks()
  })

  // Helper to generate a valid WAV header buffer of arbitrary size
  function createMockWavBuffer(sizeBytes: number): Buffer {
    const buf = Buffer.alloc(Math.max(44, sizeBytes))
    buf.write('RIFF', 0)
    buf.writeUInt32LE(buf.length - 8, 4)
    buf.write('WAVE', 8)
    buf.write('fmt ', 12)
    buf.writeUInt32LE(16, 16)
    buf.writeUInt16LE(1, 20) // PCM
    buf.writeUInt16LE(1, 22) // mono
    buf.writeUInt32LE(48000, 24) // sample rate
    buf.writeUInt32LE(96000, 28) // byte rate
    buf.writeUInt16LE(2, 32)
    buf.writeUInt16LE(16, 34)
    buf.write('data', 36)
    buf.writeUInt32LE(buf.length - 44, 40)
    return buf
  }

  // =========================================================================
  // 1. Short Hindi Speech
  // =========================================================================
  it('1. synthesizes Short Hindi Speech within default 60s timeout', async () => {
    const client = new GnaniTimbreClient(fakeApiKey, mockBaseUrl)
    const shortHindiText = 'नमस्ते, वाणी में आपका स्वागत है।'
    expect(client.calculateTimeoutMs(shortHindiText.length, false)).toBe(60000)

    const mockWav = createMockWavBuffer(1024)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'audio/wav',
        'x-request-id': 'req-short-hindi-001',
      }),
      arrayBuffer: async () => mockWav.buffer,
    } as any)

    const result = await client.synthesize({
      text: shortHindiText,
      language: 'hi-IN',
      voice: 'Nalini',
      model: 'timbre-v2.5',
      speed: 1.0,
      audio_config: {
        encoding: 'linear_pcm',
        container: 'wav',
        num_channels: 1,
        sample_rate: 48000,
        sample_width: 2,
      },
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result.contentType).toBe('audio/wav')
    expect(result.audioBuffer.length).toBe(1024)
    expect(result.voiceMode).toBe('standard')
  })

  // =========================================================================
  // 2. Long Hindi Speech
  // =========================================================================
  it('2. synthesizes Long Hindi Speech activating extended 120s timeout', async () => {
    const client = new GnaniTimbreClient(fakeApiKey, mockBaseUrl)
    // Long text > 200 chars triggers 120s timeout
    const longHindiText =
      'वाणी स्टूडियो में आपका स्वागत है। अब आप एक बार अपनी आवाज़ रिकॉर्ड करके किसी भी भारतीय भाषा में बोल सकते हैं। हमारी तकनीक आपकी आवाज़ की मौलिक पिच और मॉड्यूलेशन को सुरक्षित रखते हुए हिंदी, तमिल, तेलुगु, बंगाली और मराठी जैसी कई भाषाओं में सहज संवाद संभव बनाती है।'
    expect(longHindiText.length).toBeGreaterThan(200)
    expect(client.calculateTimeoutMs(longHindiText.length, false)).toBe(120000)

    const mockWav = createMockWavBuffer(8192)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'audio/wav',
        'x-request-id': 'req-long-hindi-002',
      }),
      arrayBuffer: async () => mockWav.buffer,
    } as any)

    const result = await client.synthesize({
      text: longHindiText,
      language: 'hi-IN',
      voice: 'Deepak',
      model: 'timbre-v2.5',
      speed: 1.0,
      audio_config: {
        encoding: 'linear_pcm',
        container: 'wav',
        num_channels: 1,
        sample_rate: 48000,
        sample_width: 2,
      },
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result.audioBuffer.length).toBe(8192)
    expect(result.durationEstimateSec).toBeGreaterThan(10)
  })

  // =========================================================================
  // 3. English Speech
  // =========================================================================
  it('3. synthesizes English Speech with Pranav standard voice and preserves content-type', async () => {
    const client = new GnaniTimbreClient(fakeApiKey, mockBaseUrl)
    const englishText = 'Welcome to VAANI. High quality multilingual synthesis is ready.'

    const mockWav = createMockWavBuffer(2048)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'audio/wav',
        'x-request-id': 'req-en-003',
      }),
      arrayBuffer: async () => mockWav.buffer,
    } as any)

    const result = await client.synthesize({
      text: englishText,
      language: 'en-IN',
      voice: 'Pranav',
      model: 'timbre-v2.5',
      speed: 1.0,
      audio_config: {
        encoding: 'linear_pcm',
        container: 'wav',
        num_channels: 1,
        sample_rate: 48000,
        sample_width: 2,
      },
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      `${mockBaseUrl}/api/v1/tts/inference`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-Key-ID': fakeApiKey,
          'X-Source': 'mcp',
        }),
      })
    )
    expect(result.contentType).toBe('audio/wav')
    expect(result.audioBuffer.length).toBe(2048)
  })

  // =========================================================================
  // 4. Cross-Language Cloned Speech
  // =========================================================================
  it('4. synthesizes Cross-Language Cloned Speech using 768-dim speaker embedding and extended timeout', async () => {
    const client = new GnaniTimbreClient(fakeApiKey, mockBaseUrl)
    const translatedTamilText = 'வணக்கம், உங்கள் புதிய குரல் தயார்.'
    const speakerEmbedding = {
      embedding: 'VGVzdEVtYmVkZGluZ1ZlY3Rvcjc2OERpbQ==',
      shape: [1, 768],
      dtype: 'torch.bfloat16',
    }

    // Personal voice cloning always activates extended 120s timeout
    expect(client.calculateTimeoutMs(translatedTamilText.length, true)).toBe(120000)

    const mockWav = createMockWavBuffer(4096)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init: any) => {
      const body = JSON.parse(init.body)
      expect(body.model).toBe('vachana-vc-v1')
      expect(body.speaker_embedding).toBeDefined()
      expect(body.speaker_embedding.shape).toEqual([1, 768])
      return {
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'audio/wav',
          'x-request-id': 'req-cloned-004',
        }),
        arrayBuffer: async () => mockWav.buffer,
      } as any
    })

    const result = await client.synthesize({
      text: translatedTamilText,
      language: 'ta-IN',
      model: 'vachana-vc-v1',
      speaker_embedding: speakerEmbedding,
      audio_config: {
        encoding: 'linear_pcm',
        container: 'wav',
        num_channels: 1,
        sample_rate: 48000,
        sample_width: 2,
      },
    })

    expect(result.voiceMode).toBe('personal')
    expect(result.modelUsed).toBe('vachana-vc-v1')
    expect(result.audioBuffer.length).toBe(4096)
  })

  // =========================================================================
  // 5. Large Audio Response Handling & Integrity
  // =========================================================================
  it('5. safely handles Large Audio Responses and rejects truncated or empty audio', async () => {
    const client = new GnaniTimbreClient(fakeApiKey, mockBaseUrl)

    // Test A: 2MB large WAV audio response
    const largeWav = createMockWavBuffer(2 * 1024 * 1024)
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'audio/wav' }),
      arrayBuffer: async () => largeWav.buffer,
    } as any)

    const resLarge = await client.synthesize({
      text: 'Large audio response test',
      language: 'hi-IN',
      voice: 'Nalini',
      model: 'timbre-v2.5',
      audio_config: {
        encoding: 'linear_pcm',
        container: 'wav',
        num_channels: 1,
        sample_rate: 48000,
        sample_width: 2,
      },
    })
    expect(resLarge.audioBuffer.length).toBe(2 * 1024 * 1024)

    // Test B: Rejects 0-byte empty audio with GNANI_EMPTY_AUDIO
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'audio/wav' }),
      arrayBuffer: async () => new ArrayBuffer(0),
    } as any)

    await expect(
      client.synthesize({
        text: 'Empty audio test',
        language: 'hi-IN',
        voice: 'Nalini',
        model: 'timbre-v2.5',
      })
    ).rejects.toThrow('GNANI_EMPTY_AUDIO')

    // Test C: Rejects incomplete audio (< 44 bytes) with GNANI_INCOMPLETE_AUDIO
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'audio/wav' }),
      arrayBuffer: async () => new ArrayBuffer(20),
    } as any)

    await expect(
      client.synthesize({
        text: 'Incomplete audio test',
        language: 'hi-IN',
        voice: 'Nalini',
        model: 'timbre-v2.5',
      })
    ).rejects.toThrow('GNANI_INCOMPLETE_AUDIO')
  })

  // =========================================================================
  // 6. Provider Timeout Lifecycle & Distinctions
  // =========================================================================
  it('6. handles Provider Timeout and distinguishes upstream 504 from client abort', async () => {
    const client = new GnaniTimbreClient(fakeApiKey, mockBaseUrl)

    // Test A: Client-side timeout abort during request
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init: any) => {
      // Simulate delay exceeding custom 50ms timeout
      return new Promise((_, reject) => {
        const signal = init.signal
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted.')
            err.name = 'AbortError'
            reject(err)
          })
        }
      })
    })

    const timeoutPromise = client.synthesize(
      {
        text: 'Timeout test',
        language: 'hi-IN',
        voice: 'Nalini',
        model: 'timbre-v2.5',
      },
      50 // 50ms timeout
    )

    await expect(timeoutPromise).rejects.toThrow('GNANI_TIMEOUT')
    try {
      await timeoutPromise
    } catch (err: any) {
      expect(err.code).toBe('GNANI_TIMEOUT')
      expect(err.status).toBe(504)
    }

    // Test B: Upstream provider returns HTTP 504 gateway timeout
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 504,
      statusText: 'Gateway Timeout',
      headers: new Headers(),
      text: async () => '{"error":"Upstream GPU worker timed out"}',
    } as any)

    await expect(
      client.synthesize({
        text: 'Provider 504 test',
        language: 'hi-IN',
        voice: 'Nalini',
        model: 'timbre-v2.5',
      })
    ).rejects.toThrow('GNANI_PROVIDER_TIMEOUT')
  })

  // =========================================================================
  // 7. Network Interruption & Error Handling
  // =========================================================================
  it('7. maps network interruption to GNANI_NETWORK_ERROR with HTTP 502 status', async () => {
    const client = new GnaniTimbreClient(fakeApiKey, mockBaseUrl)

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new TypeError('fetch failed: connect ECONNREFUSED 127.0.0.1:443')
    )

    const netPromise = client.synthesize({
      text: 'Network error test',
      language: 'hi-IN',
      voice: 'Nalini',
      model: 'timbre-v2.5',
    })

    await expect(netPromise).rejects.toThrow('GNANI_NETWORK_ERROR')
    try {
      await netPromise
    } catch (err: any) {
      expect(err.code).toBe('GNANI_NETWORK_ERROR')
      expect(err.status).toBe(502)
    }
  })

  // =========================================================================
  // 8. End-to-End Supabase Persistence After Successful Generation
  // =========================================================================
  it('8. preserves Supabase storage upload and audio library persistence after generation', async () => {
    // Authenticated user generates speech via POST /api/speech/generate
    const res = await request(app)
      .post('/api/speech/generate')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        text: 'परीक्षण संदेश, ऑडियो लाइब्रेरी में स्वतः सुरक्षित होगा।',
        title: 'Persistence Test Output',
        targetLanguage: 'hi-IN',
        voiceMode: 'standard',
        standardVoiceId: 'Nalini',
        speed: 1.0,
      })

    expect(res.status).toBe(201)
    expect(res.body.asset).toBeDefined()
    expect(res.body.asset.id).toBeDefined()
    expect(res.body.asset.title).toBe('Persistence Test Output')

    // Verify record in database
    const assetId = res.body.asset.id
    const dbAsset = mockDb.audioAssets.get(assetId)
    expect(dbAsset).toBeDefined()
    expect(dbAsset?.user_id).toBe('user-a')
    expect(dbAsset?.target_language).toBe('hi-IN')
    expect(dbAsset?.file_size).toBeGreaterThan(0)

    // Verify audio retrieval from library
    const libRes = await request(app)
      .get('/api/audio')
      .set('Authorization', `Bearer ${tokenUserA}`)

    expect(libRes.status).toBe(200)
    const found = libRes.body.assets.find((a: any) => a.id === assetId)
    expect(found).toBeDefined()
  })
})

