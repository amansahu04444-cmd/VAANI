import { config } from '../../config/env.js'
import {
  TimbreSynthesisPayload,
  TimbreSynthesisPayloadSchema,
  SynthesisResult,
} from './types.js'

export class GnaniTimbreClient {
  private readonly baseUrl: string
  private readonly apiKey: string | undefined

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey !== undefined ? apiKey : process.env.GNANI_API_KEY
    this.baseUrl = baseUrl !== undefined && baseUrl !== '' ? baseUrl : (process.env.GNANI_API_BASE_URL || 'https://api.vachana.ai')
  }

  /**
   * Synthesize text into speech using Gnani Timbre REST endpoint.
   * Target endpoint: POST https://api.vachana.ai/api/v1/tts/inference
   */
  async synthesize(input: TimbreSynthesisPayload): Promise<SynthesisResult> {
    if (!this.apiKey) {
      throw new Error(
        'GNANI_CREDENTIALS_MISSING: GNANI_API_KEY is not configured in server environment. Please obtain credits and set GNANI_API_KEY in server/.env.'
      )
    }

    // 1. Validate request payload against official Timbre schema
    const validated = TimbreSynthesisPayloadSchema.parse(input)

    // Ensure either voice OR speaker_embedding is provided
    if (!validated.voice && !validated.speaker_embedding) {
      validated.voice = 'Nalini' // Default fallback to standard female Hindi voice
    }

    const endpoint = `${this.baseUrl}/api/v1/tts/inference`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15-second timeout

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key-ID': this.apiKey,
        },
        body: JSON.stringify(validated),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        let parsedError: any = {}
        try {
          parsedError = JSON.parse(errorText)
        } catch {
          parsedError = { raw: errorText }
        }

        if (response.status === 401) {
          throw new Error(`GNANI_AUTH_FAILED (401): Invalid or expired X-API-Key-ID. Details: ${JSON.stringify(parsedError)}`)
        }
        if (response.status === 403) {
          throw new Error(`GNANI_FORBIDDEN (403): Account does not have entitlement for model ${validated.model}. Details: ${JSON.stringify(parsedError)}`)
        }
        if (response.status === 429) {
          throw new Error(`GNANI_QUOTA_EXCEEDED (429): API rate limit or challenge credits exhausted.`)
        }
        if (response.status === 400) {
          throw new Error(`GNANI_INVALID_REQUEST (400): Provider rejected schema parameters. Details: ${JSON.stringify(parsedError)}`)
        }

        throw new Error(`GNANI_ERROR (${response.status}): ${response.statusText}. Details: ${JSON.stringify(parsedError)}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = Buffer.from(arrayBuffer)
      const contentType = response.headers.get('content-type') || 'audio/wav'

      // Duration estimate: approx 15 chars per second for speech
      const durationEstimateSec = Math.max(2, Math.round(validated.text.length / 15))

      return {
        audioBuffer,
        contentType,
        durationEstimateSec,
        characterCount: validated.text.length,
        modelUsed: validated.model,
        voiceMode: validated.speaker_embedding ? 'personal' : 'standard',
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new Error('GNANI_TIMEOUT: Speech synthesis request timed out after 15 seconds.')
      }
      throw err
    }
  }
}

