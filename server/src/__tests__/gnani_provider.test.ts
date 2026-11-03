import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GnaniTimbreClient } from '../providers/gnani/timbre.client.js'
import { GnaniVoiceEnrollmentAdapter } from '../providers/gnani/voiceEnrollment.adapter.js'
import { GnaniProvider } from '../providers/gnani/index.js'
import { TimbreSynthesisPayloadSchema, SpeakerEmbeddingSchema } from '../providers/gnani/types.js'

describe('Gnani Timbre Provider Adapter & Contract Verification', () => {
  describe('Official Schema & Parameter Validation', () => {
    it('accepts valid official Timbre v2.5 synthesis payload', () => {
      const payload = {
        text: 'नमस्ते, आप कैसे हैं?',
        voice: 'Nalini',
        model: 'timbre-v2.5',
        language: 'hi-IN',
        speed: 1.0,
        audio_config: {
          encoding: 'linear_pcm',
          container: 'wav',
          num_channels: 1,
          sample_rate: 48000,
          sample_width: 2,
        },
      }

      const parsed = TimbreSynthesisPayloadSchema.parse(payload)
      expect(parsed.voice).toBe('Nalini')
      expect(parsed.language).toBe('hi-IN')
      expect(parsed.speed).toBe(1.0)
      expect(parsed.audio_config.sample_rate).toBe(48000)
    })

    it('rejects synthesis text exceeding 1000 characters', () => {
      const longText = 'A'.repeat(1001)
      expect(() =>
        TimbreSynthesisPayloadSchema.parse({
          text: longText,
          language: 'hi-IN',
        })
      ).toThrow('1000 character limit')
    })

    it('rejects unsupported language locale codes', () => {
      expect(() =>
        TimbreSynthesisPayloadSchema.parse({
          text: 'Hello world',
          language: 'fr-FR' as any, // Unsupported locale
        })
      ).toThrow()
    })

    it('rejects speech rates outside official bounds [0.85, 1.15]', () => {
      expect(() =>
        TimbreSynthesisPayloadSchema.parse({
          text: 'Speed test',
          speed: 1.5, // Too fast
        })
      ).toThrow()

      expect(() =>
        TimbreSynthesisPayloadSchema.parse({
          text: 'Speed test',
          speed: 0.5, // Too slow
        })
      ).toThrow()
    })

    it('validates speaker embedding tensor shape and dtype', () => {
      const validEmbedding = {
        embedding: 'VGVzdEVtYmVkZGluZ0RhdGExMjM=',
        shape: [1, 768],
        dtype: 'torch.bfloat16',
      }
      const parsed = SpeakerEmbeddingSchema.parse(validEmbedding)
      expect(parsed.shape).toEqual([1, 768])
      expect(parsed.dtype).toBe('torch.bfloat16')
    })
  })

  describe('Client Authentication & Error Envelopes', () => {
    it('throws GNANI_CREDENTIALS_MISSING when GNANI_API_KEY is not configured', async () => {
      const client = new GnaniTimbreClient('')

      await expect(
        client.synthesize({
          text: 'Test speech',
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
      ).rejects.toThrow('GNANI_CREDENTIALS_MISSING')
    })

    it('correctly constructs request with X-API-Key-ID and parses audio response', async () => {
      const fakeApiKey = 'gnani_test_key_abc123'
      const client = new GnaniTimbreClient(fakeApiKey, 'https://mock.gnani.ai')

      // Mock native global fetch
      const mockWavBytes = Buffer.from('RIFF....WAVEfmt ....data....')
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'audio/wav' }),
        arrayBuffer: async () => mockWavBytes.buffer,
      } as any)

      const result = await client.synthesize({
        text: 'नमस्ते परीक्षण',
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

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://mock.gnani.ai/api/v1/tts/inference',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key-ID': fakeApiKey,
          },
        })
      )

      expect(result.contentType).toBe('audio/wav')
      expect(result.audioBuffer).toBeDefined()
      expect(result.voiceMode).toBe('standard')

      fetchSpy.mockRestore()
    })

    it('maps HTTP 401 response to GNANI_AUTH_FAILED error', async () => {
      const client = new GnaniTimbreClient('invalid-key', 'https://mock.gnani.ai')

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"error":"Invalid API Key"}',
      } as any)

      await expect(
        client.synthesize({
          text: 'Auth failure test',
          language: 'hi-IN',
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
      ).rejects.toThrow('GNANI_AUTH_FAILED (401)')

      fetchSpy.mockRestore()
    })
  })

  describe('Voice Enrollment & Capability Guard', () => {
    it('returns PROVIDER_CAPABILITY_UNAVAILABLE when endpoint returns 404 or 403', async () => {
      const adapter = new GnaniVoiceEnrollmentAdapter('test-key', 'https://mock.gnani.ai')

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => '{"error":"Voice cloning not entitled on participant tier"}',
      } as any)

      const dummyAudio = Buffer.alloc(100)
      await expect(adapter.extractSpeakerEmbedding(dummyAudio)).rejects.toThrow(
        'PROVIDER_CAPABILITY_UNAVAILABLE (403)'
      )

      fetchSpy.mockRestore()
    })

    it('reports truthful capability status through GnaniProvider', () => {
      const provider = new GnaniProvider()
      const capability = provider.getCapability()

      expect(capability.provider).toBe('gnani')
      expect(capability.supportedLocales).toContain('hi-IN')
      expect(capability.supportedLocales).toContain('en-IN')
      expect(capability.supportedLocales).toContain('auto')
      expect(capability.supportedVoices).toContain('Nalini')
      expect(capability.supportedVoices).toContain('Pranav')
    })
  })
})

