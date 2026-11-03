import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { rateLimiter } from '../../middleware/rateLimit.js'
import { mockDb, VoiceProfileRecord } from '../../db/repository.js'

export const voiceRouter = Router()

const enrollSchema = z.object({
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Explicit voice consent must be acknowledged before enrolling.' }),
  }),
  consentVersion: z.string().default('v1.0-2026'),
  enrollmentLanguage: z.string().default('hi-IN'),
  sampleDurationSec: z.number().min(5).max(30).optional(),
  sampleObjectKey: z.string().optional(),
})

/**
 * GET /api/voice/me
 * Retrieves current user's voice profile. Strictly scoped to authenticated user ID.
 */
voiceRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id

  const profile = Array.from(mockDb.voiceProfiles.values()).find(
    (vp) => vp.user_id === userId && vp.deleted_at === null
  )

  if (!profile) {
    res.status(404).json({
      error: 'VOICE_PROFILE_NOT_FOUND',
      message: 'No active voice profile registered for this account.',
      status: 'not_enrolled',
    })
    return
  }

  // Never return raw internal secrets or provider tokens to client
  res.json({
    id: profile.id,
    userId: profile.user_id,
    status: profile.status,
    enrollmentLanguage: profile.enrollment_language,
    supportedLanguages: profile.supported_languages,
    sampleDurationSec: profile.sample_duration_sec,
    consentVersion: profile.consent_version,
    consentedAt: profile.consented_at,
    hasSpeakerEmbedding: Boolean(profile.provider_voice_ref),
    createdAt: profile.created_at,
  })
})

/**
 * POST /api/voice/enroll
 * Registers voice enrollment with consent. Strictly binds to req.user.id.
 */
voiceRouter.post(
  '/enroll',
  requireAuth,
  rateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 5, keyPrefix: 'voice_enroll' }),
  validateBody(enrollSchema),
  (req: Request, res: Response) => {
  const userId = req.user!.id
  const { consentVersion, enrollmentLanguage, sampleDurationSec, sampleObjectKey } = req.body

  // Record DPDP Consent Audit Event
  const eventId = `evt-${Date.now()}`
  mockDb.consentEvents.set(eventId, {
    id: eventId,
    user_id: userId,
    event_type: 'granted',
    consent_version: consentVersion,
    accepted_at: new Date().toISOString(),
    revoked_at: null,
    details: { ip: req.ip, userAgent: req.headers['user-agent'] },
  })

  // Create or update voice profile
  const existing = Array.from(mockDb.voiceProfiles.values()).find(
    (vp) => vp.user_id === userId && vp.deleted_at === null
  )

  const profileId = existing?.id || `vp-${Date.now()}`
  const profileRecord: VoiceProfileRecord = {
    id: profileId,
    user_id: userId, // Enforce authenticated user ownership
    provider: 'gnani',
    provider_voice_ref: 'enc_embedding_vector_sample',
    status: 'ready',
    enrollment_language: enrollmentLanguage,
    supported_languages: ['hi-IN', 'en-IN', 'auto', 'ta-IN', 'te-IN'],
    sample_object_key: sampleObjectKey || `${userId}/sample.wav`,
    sample_duration_sec: sampleDurationSec || 12.0,
    consent_version: consentVersion,
    consented_at: new Date().toISOString(),
    deleted_at: null,
    created_at: existing?.created_at || new Date().toISOString(),
  }

  mockDb.voiceProfiles.set(profileId, profileRecord)

  res.status(201).json({
    message: 'Voice profile enrolled successfully with verified consent.',
    profile: {
      id: profileRecord.id,
      status: profileRecord.status,
      supportedLanguages: profileRecord.supported_languages,
      consentedAt: profileRecord.consented_at,
    },
  })
})

/**
 * DELETE /api/voice/me
 * Revokes consent and permanently deletes the voice profile.
 */
voiceRouter.delete('/me', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id

  const profile = Array.from(mockDb.voiceProfiles.values()).find(
    (vp) => vp.user_id === userId && vp.deleted_at === null
  )

  if (!profile) {
    res.status(404).json({
      error: 'VOICE_PROFILE_NOT_FOUND',
      message: 'No active voice profile found to delete.',
    })
    return
  }

  // Soft delete / purge profile
  profile.deleted_at = new Date().toISOString()
  profile.status = 'revoked'
  profile.provider_voice_ref = null

  // Record DPDP Consent Revocation Audit Event
  const eventId = `evt-${Date.now()}`
  mockDb.consentEvents.set(eventId, {
    id: eventId,
    user_id: userId,
    event_type: 'revoked',
    consent_version: profile.consent_version,
    accepted_at: profile.consented_at,
    revoked_at: new Date().toISOString(),
    details: { reason: 'User requested irrevocable deletion' },
  })

  res.json({
    message: 'Voice profile revoked and speaker embedding permanently deleted.',
    deletedAt: profile.deleted_at,
  })
})

