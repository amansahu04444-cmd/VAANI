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
import { ensureValidWavBuffer, inspectAudioBuffer } from '../audio/audio.utils.js'
import { evaluateVoiceProfile } from '../voice/voice.service.js'

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
    let personalEmbedding: any = null

    // 1. If Personal Voice Mode selected, verify voice profile ownership & valid tensor
    if (voiceMode === 'personal') {
      const profile = await dbRepo.getVoiceProfile(userId)
      const evaluated = evaluateVoiceProfile(profile)

      if (evaluated.enrollmentStatus === 'NOT_ENROLLED') {
        res.status(400).json({
          error: 'VOICE_PROFILE_REQUIRED',
          status: 'NOT_ENROLLED',
          message: 'Cannot generate in Personal Voice mode: You must first enroll your voice profile in Voice Setup.',
        })
        return
      }

      if (!evaluated.isReadyForSynthesis || !evaluated.hasSpeakerEmbedding || !evaluated.embeddingPayload) {
        res.status(400).json({
          error: 'VOICE_EMBEDDING_INVALID',
          status: evaluated.enrollmentStatus,
          embeddingStatus: evaluated.embeddingStatus,
          message: evaluated.errorMessage || 'Your enrolled voice profile is missing an active speaker embedding tensor. Please re-record your voice sample in Voice Setup.',
        })
        return
      }

      voiceProfileId = profile!.id
      voiceLabel = `Your Enrolled Voice (${req.user!.email.split('@')[0]})`
      personalEmbedding = evaluated.embeddingPayload
    }

    // 2. Synthesize speech (real Gnani Timbre call if API key present, or fallback fixture)
    let audioBytes: Buffer
    const estimatedDuration = Math.max(3, Math.min(60, Math.round(text.length / 14)))

    try {
      if (process.env.GNANI_API_KEY && config.NODE_ENV !== 'test') {
        if (voiceMode === 'personal') {
          const result = await gnaniProvider.synthesizeWithSpeakerEmbedding({
            text,
            language: targetLanguage as SupportedLocale,
            speakerEmbedding: personalEmbedding,
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
        console.error('[Speech Synthesis Error]:', err?.message || err)
        const status = err.status && [400, 401, 403, 404, 429].includes(err.status) ? err.status : 502
        let errorCode = err.code || 'SPEECH_SYNTHESIS_FAILED'
        let userMessage = err.message || 'Speech generation failed at provider.'

        if (status === 401) {
          errorCode = 'GNANI_AUTH_FAILED'
          userMessage = 'Gnani API authentication failed: Invalid or expired API key.'
        } else if (status === 403) {
          errorCode = 'GNANI_FORBIDDEN'
          userMessage = 'Access forbidden: Your Gnani account does not have entitlement for this model.'
        } else if (status === 429) {
          errorCode = 'GNANI_QUOTA_EXCEEDED'
          userMessage = 'Gnani challenge credit quota exceeded or rate limit reached.'
        } else if (status === 400) {
          errorCode = 'GNANI_INVALID_REQUEST'
          userMessage = `Provider rejected request parameters: ${err.message}`
        }

        res.status(status).json({
          error: errorCode,
          message: userMessage,
          details: err.providerDetails || undefined,
        })
        return
      }
    }

    // 3. Ensure valid browser-playable WAV header (repairs streaming 0xFFFFFFFF sizes)
    const validWav = ensureValidWavBuffer(audioBytes)
    const inspection = inspectAudioBuffer(validWav)
    const exactDurationMs = inspection.durationMs > 0 ? inspection.durationMs : estimatedDuration * 1000

    // 4. Upload audio buffer to private Supabase Storage bucket
    try {
      await StorageService.uploadAudio(
        'generated-audio',
        objectKey,
        validWav,
        'audio/wav',
        userId
      )
    } catch (uploadErr: any) {
      console.error('[Storage Upload Error]:', uploadErr?.message || uploadErr)
      res.status(500).json({
        error: 'STORAGE_UPLOAD_FAILED',
        message: `Failed to store synthesized audio in private storage: ${uploadErr.message}`,
      })
      return
    }

    // 5. Persist asset metadata into database
    const audioAsset: AudioAssetRecord = {
      id: assetId,
      user_id: userId,
      speech_job_id: jobId,
      object_key: objectKey,
      mime_type: 'audio/wav',
      file_size: validWav.length,
      duration_ms: exactDurationMs,
      title: title || `${targetLanguage} Speech Output`,
      created_at: new Date().toISOString(),
      deleted_at: null,
    }

    await dbRepo.saveAudioAsset(audioAsset)

    // 6. Generate signed playback URL (15-minute expiration)
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
        durationSeconds: Math.max(1, Math.round(exactDurationMs / 1000)),
        fileSizeBytes: audioAsset.file_size,
        audioUrl: signedUrl,
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

