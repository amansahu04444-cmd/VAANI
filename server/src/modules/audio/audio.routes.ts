import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.js'
import { validateParams } from '../../middleware/validate.js'
import { mockDb, AudioAssetRecord } from '../../db/repository.js'
import { StorageService } from '../storage/storage.service.js'

export const audioRouter = Router()

const idParamSchema = z.object({
  id: z.string().min(1, 'Audio asset ID is required'),
})

/**
 * GET /api/audio
 * Lists all audio assets owned by the authenticated user.
 */
audioRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id

  const userAudios = Array.from(mockDb.audioAssets.values()).filter(
    (a) => a.user_id === userId && a.deleted_at === null
  )

  res.json({
    assets: userAudios,
    totalCount: userAudios.length,
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

  const asset = mockDb.audioAssets.get(assetId)

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

    res.json({
      assetId: asset.id,
      title: asset.title,
      signedUrl,
      expiresAt,
      durationMs: asset.duration_ms,
    })
  } catch (err: any) {
    res.status(403).json({
      error: 'STORAGE_FORBIDDEN',
      message: err.message || 'Cannot generate signed playback URL.',
    })
  }
})

/**
 * DELETE /api/audio/:id
 * Permanently deletes audio asset and storage object.
 * STRICT ISOLATION CHECK: Verifies asset belongs to req.user.id.
 */
audioRouter.delete('/:id', requireAuth, validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = req.user!.id
  const assetId = req.params.id

  const asset = mockDb.audioAssets.get(assetId)

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

  // Mark deleted
  asset.deleted_at = new Date().toISOString()

  res.json({
    message: 'Audio asset and private storage file deleted successfully.',
    deletedId: asset.id,
  })
})

