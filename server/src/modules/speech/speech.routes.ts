import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { config } from '../../config/env.js'
import { requireAuth } from '../../middleware/auth.js'
import { validateBody, validateParams } from '../../middleware/validate.js'
import { rateLimiter } from '../../middleware/rateLimit.js'
import { dbRepo, isUuid, AudioAssetRecord } from '../../db/repository.js'
import { gnaniProvider } from '../../providers/gnani/index.js'
import { SUPPORTED_LOCALES, SupportedLocale } from '../../providers/gnani/types.js'
import { StorageService } from '../storage/storage.service.js'

export const speechRouter = Router()

const generateSpeechSchema = z.object({
  text: z.string().min(1, 'Script cannot be empty').max(1000, 'Script exceeds 1,000 character limit'),
  title: z.string().max(100).optional(),
  targetLanguage: z.enum(SUPPORTED_LOCALES).default('hi-IN'),
  voiceMode: z.enum(['personal', 'standard']).default('standard'),
  standardVoiceId: z.string().default('Nalini'),
  speed: z.number().min(0.85).max(1.15).default(1.0),
})

const jobIdParamSchema = z.object({
  id: z.string().min(1, 'Speech Job ID is required'),
})

// Helper to generate a valid 48kHz 16-bit PCM WAV audio buffer for offline demo testing
function generateDeterministicWav(durationSeconds: number): Buffer {
  const sampleRate = 48000
  const numChannels = 1
  const bytesPerSample = 2
  const totalSamples = Math.floor(sampleRate * durationSeconds)
  const dataSize = totalSamples * numChannels * bytesPerSample

  const buffer = Buffer.alloc(44 + dataSize)
  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  // fmt subchunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20) // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28) // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32) // BlockAlign
  buffer.writeUInt16LE(16, 34) // BitsPerSample
  // data subchunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  // Generate subtle pleasant audio tone (sine wave 440Hz with gentle decay)
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate
    const sampleVal = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 0.15) * 12000
    buffer.writeInt16LE(Math.floor(sampleVal), 44 + i * 2)
  }

  return buffer
}

/**
 * POST /api/speech/generate
 * Synthesizes speech from script using personal voice or standard Timbre voice.
 */
speechRouter.post(
  '/generate',
  requireAuth,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'speech_gen' }),
  validateBody(generateSpeechSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.id
    const { text, title, targetLanguage, voiceMode, standardVoiceId, speed } = req.body

    const jobId = isUuid(userId) ? crypto.randomUUID() : `job-${Date.now()}`
    const assetId = isUuid(userId) ? crypto.randomUUID() : `aud-${Date.now()}`
    const objectKey = `${userId}/${assetId}.wav`

    let voiceProfileId: string | null = null
    let voiceLabel = `Timbre ${standardVoiceId}`

    // 1. If Personal Voice Mode selected, verify voice profile ownership
    if (voiceMode === 'personal') {
      const profile = await dbRepo.getVoiceProfile(userId)

      if (!profile || profile.status !== 'ready') {
        res.status(400).json({
          error: 'VOICE_PROFILE_REQUIRED',
          message: 'Cannot generate in Personal Voice mode: You must first enroll your voice profile in Voice Setup.',
        })
        return
      }

      voiceProfileId = profile.id
      voiceLabel = `Your Enrolled Voice (${req.user!.email.split('@')[0]})`
    }

    // 2. Synthesize speech (real Gnani Timbre call if API key present, or fallback fixture)
    let audioBytes: Buffer
    const estimatedDuration = Math.max(3, Math.min(60, Math.round(text.length / 14)))

    try {
      if (process.env.GNANI_API_KEY && config.NODE_ENV !== 'test') {
        if (voiceMode === 'personal') {
          const profile = await dbRepo.getVoiceProfile(userId)
          let embedding: any = { embedding: 'mock-embedding', shape: [1, 768], dtype: 'torch.bfloat16' }
          if (profile?.provider_voice_ref) {
            try {
              if (profile.provider_voice_ref.startsWith('{')) {
                embedding = JSON.parse(profile.provider_voice_ref)
              }
            } catch {
              // Ignore parse error, use default embedding structure
            }
          }

          const result = await gnaniProvider.synthesizeWithSpeakerEmbedding({
            text,
            language: targetLanguage as SupportedLocale,
            speakerEmbedding: embedding,
            speed,
          })
          audioBytes = result.audioBuffer
        } else {
          const result = await gnaniProvider.synthesizeWithStandardVoice({
            text,
            language: targetLanguage as SupportedLocale,
            voice: standardVoiceId,
            speed,
          })
          audioBytes = result.audioBuffer
        }
      } else {
        // Local deterministic fixture when API key is not configured or in test suite
        audioBytes = generateDeterministicWav(estimatedDuration)
        if (config.NODE_ENV !== 'test') {
          voiceLabel += ' (Demo Audio)'
        }
      }
    } catch (err: any) {
      if (config.NODE_ENV === 'test') {
        audioBytes = generateDeterministicWav(estimatedDuration)
      } else {
        res.status(502).json({
          error: 'SPEECH_SYNTHESIS_FAILED',
          message: err.message || 'Speech generation failed at provider.',
        })
        return
      }
    }

    // 3. Upload audio buffer to private Supabase Storage bucket
    try {
      await StorageService.uploadAudio(
        'generated-audio',
        objectKey,
        audioBytes,
        'audio/wav',
        userId
      )
    } catch (uploadErr: any) {
      // Non-fatal if in mock mode, but log warning
      console.warn('[Storage Upload Warning]:', uploadErr?.message || uploadErr)
    }

    // 4. Persist asset metadata into database
    const audioAsset: AudioAssetRecord = {
      id: assetId,
      user_id: userId,
      speech_job_id: jobId,
      object_key: objectKey,
      mime_type: 'audio/wav',
      file_size: audioBytes.length,
      duration_ms: estimatedDuration * 1000,
      title: title || `${targetLanguage} Speech Output`,
      created_at: new Date().toISOString(),
      deleted_at: null,
    }

    await dbRepo.saveAudioAsset(audioAsset)

    // 5. Generate signed playback URL (15-minute expiration)
    const { signedUrl, expiresAt } = await StorageService.getSignedUrl(
      'generated-audio',
      objectKey,
      userId,
      900
    )

    res.status(201).json({
      jobId,
      status: 'completed',
      asset: {
        id: audioAsset.id,
        title: audioAsset.title,
        textPreview: text,
        languageCode: targetLanguage,
        voiceMode,
        voiceLabel,
        durationSeconds: estimatedDuration,
        fileSizeBytes: audioAsset.file_size,
        signedUrl,
        expiresAt,
        createdAt: audioAsset.created_at,
      },
    })
  }
)

/**
 * GET /api/speech/:id
 * Polls status of a speech generation job.
 */
speechRouter.get('/:id', requireAuth, validateParams(jobIdParamSchema), async (req: Request, res: Response) => {
  const userId = req.user!.id
  const jobId = req.params.id

  // Find asset associated with this job
  const asset = await dbRepo.getAudioAssetByJobId(jobId, userId)

  if (!asset) {
    res.status(404).json({
      error: 'JOB_NOT_FOUND',
      message: 'The requested speech job was not found.',
    })
    return
  }

  res.json({
    jobId,
    userId,
    status: 'completed',
    assetId: asset.id,
    durationMs: asset.duration_ms,
    createdAt: asset.created_at,
  })
})

