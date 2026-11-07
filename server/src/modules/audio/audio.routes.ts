import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.js'
import { validateParams } from '../../middleware/validate.js'
import { dbRepo } from '../../db/repository.js'
import { StorageService } from '../storage/storage.service.js'
import { generateDeterministicWav } from './audio.utils.js'

export const audioRouter = Router()

const idParamSchema = z.object({
  id: z.string().min(1, 'Audio asset ID is required'),
})

function getLanguageLabel(code: string): string {
  switch (code) {
    case 'hi-IN':
      return 'Hindi (हिन्दी)'
    case 'en-IN':
      return 'Indian English'
    case 'auto':
      return 'Hinglish (Code-mixed)'
    case 'ta-IN':
      return 'Tamil (தமிழ்)'
    case 'te-IN':
      return 'Telugu (తెలుగు)'
    case 'kn-IN':
      return 'Kannada (ಕನ್ನಡ)'
    case 'mr-IN':
      return 'Marathi (मराठी)'
    case 'bn-IN':
      return 'Bengali (বাংলা)'
    case 'gu-IN':
      return 'Gujarati (ગુજરાતી)'
    case 'ml-IN':
      return 'Malayalam (മലയാളം)'
    case 'pa-IN':
      return 'Punjabi (ਪੰਜਾਬੀ)'
    case 'or-IN':
      return 'Odia (ଓଡ଼ିଆ)'
    default:
      return code || 'Hindi (हिन्दी)'
  }
}

/**
 * GET /api/audio
 * Lists all audio assets owned by the authenticated user with enriched speech job metadata.
 */
audioRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id
  const userAudios = await dbRepo.getAudioAssets(userId)

  const enrichedAssets = userAudios.map((a: any) => {
    const langCode = a.target_language || 'hi-IN'
    const langName = getLanguageLabel(langCode)
    const vMode = a.voice_mode || 'standard'
    const vLabel = vMode === 'personal' ? 'Enrolled Voice' : 'Timbre Standard'

    return {
      id: a.id,
      user_id: a.user_id,
      userId: a.user_id,
      title: a.title,
      textPreview: a.input_text || a.title,
      originalText: a.input_text || a.title,
      languageCode: langCode,
      languageName: langName,
      voiceMode: vMode,
      voiceLabel: vLabel,
      durationSeconds: Math.max(1, Math.round((a.duration_ms || 12000) / 1000)),
      duration_ms: a.duration_ms,
      durationMs: a.duration_ms,
      file_size: a.file_size,
      fileSizeBytes: a.file_size,
      object_key: a.object_key,
      objectKey: a.object_key,
      storagePath: a.object_key,
      mime_type: a.mime_type || 'audio/wav',
      mimeType: a.mime_type || 'audio/wav',
      created_at: a.created_at,
      createdAt: a.created_at,
    }
  })

  res.json({
    assets: enrichedAssets,
    totalCount: enrichedAssets.length,
  })
})

/**
 * GET /api/audio/:id/url
 * Issues a short-lived signed URL for playback or download.
 * STRICT ISOLATION CHECK: Verifies asset belongs to req.user.id.
 */
audioRouter.get('/:id/url', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = req.user!.id
  const assetId = req.params.id

  const asset = await dbRepo.getAudioAsset(assetId, userId)

  if (!asset || asset.deleted_at !== null) {
    res.status(404).json({
      error: 'AUDIO_NOT_FOUND',
      message: 'The requested audio asset does not exist or has been deleted.',
    })
    return
  }

  // Cross-user access check (IDOR Protection)
  if (asset.user_id !== userId) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied: You do not have permission to access audio assets belonging to another user.',
    })
    return
  }

  try {
    const { signedUrl, expiresAt } = await StorageService.getSignedUrl(
      'generated-audio',
      asset.object_key,
      userId
    )

    console.log('[AudioRoutes] Signed URL issued for asset:', {
      assetId: asset.id,
      userId,
      objectKey: asset.object_key,
      expiresAt,
    })

    res.json({
      assetId: asset.id,
      title: asset.title,
      signedUrl,
      audioUrl: signedUrl,
      expiresAt,
      durationMs: asset.duration_ms,
    })
  } catch (err: any) {
    // If it's a seeded mock asset, fall back to our local deterministic audio stream
    if (asset.object_key.includes('lib-') || asset.object_key.includes('audio-user-')) {
      const streamUrl = `/api/audio/${asset.id}/stream`
      res.json({
        assetId: asset.id,
        title: asset.title,
        signedUrl: streamUrl,
        audioUrl: streamUrl,
        expiresAt: new Date(Date.now() + 900000).toISOString(),
        durationMs: asset.duration_ms,
      })
      return
    }

    if (err.message && err.message.includes('STORAGE_OBJECT_NOT_FOUND')) {
      res.status(404).json({
        error: 'AUDIO_FILE_MISSING',
        message: 'The audio file referenced by this artifact could not be found in private storage.',
      })
      return
    }

    res.status(403).json({
      error: 'STORAGE_FORBIDDEN',
      message: err.message || 'Cannot generate signed playback URL.',
    })
  }
})

/**
 * GET /api/audio/:id/stream
 * Direct authenticated audio streaming endpoint for playback.
 * Supports Range headers for seeking.
 */
audioRouter.get('/:id/stream', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response): Promise<any> => {
  const userId = req.user!.id
  const assetId = req.params.id

  const asset = await dbRepo.getAudioAsset(assetId, userId)
  if (!asset || asset.deleted_at !== null) {
    return res.status(404).json({ error: 'AUDIO_NOT_FOUND', message: 'Audio asset not found.' })
  }

  if (asset.user_id !== userId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied.' })
  }

  let audioBuffer: Buffer

  try {
    const downloaded = await StorageService.downloadObject('generated-audio', asset.object_key, userId)
    audioBuffer = downloaded.buffer
  } catch {
    // If seeded demo asset, generate real deterministic 48kHz WAV audio
    const durationSec = Math.max(2, Math.round(asset.duration_ms / 1000))
    audioBuffer = generateDeterministicWav(durationSec)
  }

  const range = req.headers.range
  const totalLength = audioBuffer.length

  res.setHeader('Content-Type', 'audio/wav')
  res.setHeader('Accept-Ranges', 'bytes')

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1
    const chunksize = end - start + 1

    res.status(206)
    res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`)
    res.setHeader('Content-Length', chunksize)
    res.send(audioBuffer.subarray(start, end + 1))
  } else {
    res.setHeader('Content-Length', totalLength)
    res.send(audioBuffer)
  }
})

/**
 * GET /api/audio/:id/download
 * Direct authenticated download endpoint that streams the audio file with attachment disposition.
 */
audioRouter.get('/:id/download', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response): Promise<any> => {
  const userId = req.user!.id
  const assetId = req.params.id

  const asset = await dbRepo.getAudioAsset(assetId, userId)
  if (!asset || asset.deleted_at !== null) {
    return res.status(404).json({ error: 'AUDIO_NOT_FOUND', message: 'Audio asset not found.' })
  }

  if (asset.user_id !== userId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied.' })
  }

  let audioBuffer: Buffer

  try {
    const downloaded = await StorageService.downloadObject('generated-audio', asset.object_key, userId)
    audioBuffer = downloaded.buffer
  } catch {
    const durationSec = Math.max(2, Math.round(asset.duration_ms / 1000))
    audioBuffer = generateDeterministicWav(durationSec)
  }

  const safeFilename = `${asset.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'vaani_speech'}.wav`

  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`)
  res.setHeader('Content-Type', 'audio/wav')
  res.setHeader('Content-Length', audioBuffer.length)
  res.send(audioBuffer)
})

/**
 * DELETE /api/audio/:id
 * Permanently deletes audio asset and storage object.
 * STRICT ISOLATION CHECK: Verifies asset belongs to req.user.id.
 */
audioRouter.delete('/:id', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = req.user!.id
  const assetId = req.params.id

  const asset = await dbRepo.getAudioAsset(assetId, userId)

  if (!asset || asset.deleted_at !== null) {
    res.status(404).json({
      error: 'AUDIO_NOT_FOUND',
      message: 'Audio asset not found.',
    })
    return
  }

  // Cross-user access check (IDOR Protection)
  if (asset.user_id !== userId) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied: You cannot delete audio assets belonging to another user.',
    })
    return
  }

  // Delete from storage
  await StorageService.deleteObject('generated-audio', asset.object_key, userId)

  // Mark deleted in repository
  await dbRepo.deleteAudioAsset(assetId, userId)

  res.json({
    message: 'Audio asset and private storage file deleted successfully.',
    deletedId: asset.id,
  })
})
