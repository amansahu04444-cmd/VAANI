import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { validateBody } from '../../middleware/validate.js'
import { rateLimiter } from '../../middleware/rateLimit.js'
import { LanguageDetectionService } from './languageDetection.service.js'
import { translationService } from './translation.service.js'
import { SUPPORTED_LOCALES } from '../../providers/gnani/types.js'

export const translationRouter = Router()

const detectSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').max(2000, 'Text exceeds 2,000 characters limit'),
})

const translateSchema = z.object({
  text: z.string().min(1, 'Script cannot be empty').max(2000, 'Script exceeds 2,000 characters limit'),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.enum(SUPPORTED_LOCALES).default('en-IN'),
})

/**
 * POST /api/translation/detect
 * Automatically detects the script and language of input text.
 */
translationRouter.post(
  '/detect',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'trans_detect' }),
  validateBody(detectSchema),
  (req: Request, res: Response) => {
    const { text } = req.body
    const result = LanguageDetectionService.detectLanguage(text)
    res.json(result)
  }
)

/**
 * POST /api/translation/translate
 * Translates input script into the chosen target language with context and entity preservation.
 */
translationRouter.post(
  '/translate',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'trans_exec' }),
  validateBody(translateSchema),
  async (req: Request, res: Response) => {
    const { text, sourceLanguage, targetLanguage } = req.body

    try {
      const result = await translationService.translateScript({
        text,
        sourceLanguage,
        targetLanguage,
      })
      res.json(result)
    } catch (err: any) {
      console.error('[Translation API Error]:', err?.message || err)
      res.status(500).json({
        error: 'TRANSLATION_FAILED',
        message: err?.message || 'Failed to translate script into target language.',
      })
    }
  }
)

