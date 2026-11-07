import { config } from '../../config/env.js'
import {
  TimbreSynthesisPayload,
  TimbreSynthesisPayloadSchema,
  SynthesisResult,
} from './types.js'

export interface GnaniClientOptions {
  apiKey?: string
  baseUrl?: string
  defaultTimeoutMs?: number
  longTimeoutMs?: number
}

export class GnaniTimbreClient {
  private readonly baseUrl: string
  private readonly apiKey: string | undefined
  public readonly defaultTimeoutMs: number
  public readonly longTimeoutMs: number

  constructor(apiKey?: string, baseUrl?: string, options?: { defaultTimeoutMs?: number; longTimeoutMs?: number }) {
    this.apiKey = apiKey !== undefined ? apiKey : process.env.GNANI_API_KEY
    this.baseUrl = baseUrl !== undefined && baseUrl !== '' ? baseUrl : (process.env.GNANI_API_BASE_URL || 'https://api.vachana.ai')
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? config.GNANI_TTS_TIMEOUT_MS ?? 60000
    this.longTimeoutMs = options?.longTimeoutMs ?? config.GNANI_TTS_LONG_TIMEOUT_MS ?? 120000
  }

  /**
   * Calculates the synthesis timeout based on text length and voice mode.
   * Long scripts (> 200 chars) or personal voice cloning get up to 120s timeout.
   */
  public calculateTimeoutMs(textLength: number, isVoiceCloning: boolean): number {
    if (isVoiceCloning || textLength > 200) {
      return this.longTimeoutMs
    }
    return this.defaultTimeoutMs
  }

  /**
   * Synthesize text into speech using Gnani Timbre REST endpoint.
   * Target endpoint: POST https://api.vachana.ai/api/v1/tts/inference
   */
  async synthesize(input: TimbreSynthesisPayload, customTimeoutMs?: number): Promise<SynthesisResult> {
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

    const isVoiceCloning = Boolean(validated.speaker_embedding)
    const effectiveTimeoutMs = customTimeoutMs ?? this.calculateTimeoutMs(validated.text.length, isVoiceCloning)

    const controller = new AbortController()
    let timeoutFired = false
    const timeoutId = setTimeout(() => {
      timeoutFired = true
      controller.abort()
    }, effectiveTimeoutMs)

    const startTime = Date.now()

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key-ID': this.apiKey,
          'X-Source': 'mcp',
        },
        body: JSON.stringify(validated),
        signal: controller.signal,
      })

      const requestId = response.headers?.get ? (response.headers.get('x-request-id') || response.headers.get('request-id') || undefined) : undefined
      const durationMs = Date.now() - startTime

      if (!response.ok) {
        console.error(
          `[Gnani Client] Provider returned HTTP ${response.status} in ${durationMs}ms${requestId ? ` (request-id: ${requestId})` : ''}`
        )

        const errorText = await response.text().catch(() => '')
        let parsedError: any = {}
        try {
          parsedError = JSON.parse(errorText)
        } catch {
          parsedError = { raw: errorText }
        }

        let errCode = 'GNANI_ERROR'
        let errMsg = `GNANI_ERROR (${response.status}): ${response.statusText}. Details: ${JSON.stringify(parsedError)}`

        if (response.status === 401) {
          errCode = 'GNANI_AUTH_FAILED'
          errMsg = `GNANI_AUTH_FAILED (401): Invalid or expired X-API-Key-ID. Details: ${JSON.stringify(parsedError)}`
        } else if (response.status === 403) {
          errCode = 'GNANI_FORBIDDEN'
          errMsg = `GNANI_FORBIDDEN (403): Account does not have entitlement for model ${validated.model}. Details: ${JSON.stringify(parsedError)}`
        } else if (response.status === 429) {
          errCode = 'GNANI_QUOTA_EXCEEDED'
          errMsg = `GNANI_QUOTA_EXCEEDED (429): API rate limit or challenge credits exhausted.`
        } else if (response.status === 400) {
          errCode = 'GNANI_INVALID_REQUEST'
          errMsg = `GNANI_INVALID_REQUEST (400): Provider rejected schema parameters. Details: ${JSON.stringify(parsedError)}`
        } else if (response.status === 504) {
          errCode = 'GNANI_PROVIDER_TIMEOUT'
          errMsg = `GNANI_PROVIDER_TIMEOUT (504): Upstream provider timed out rendering audio.`
        } else if (response.status >= 500) {
          errCode = 'GNANI_PROVIDER_UNAVAILABLE'
          errMsg = `GNANI_PROVIDER_UNAVAILABLE (${response.status}): Upstream Gnani service error: ${response.statusText}`
        }

        const err: any = new Error(errMsg)
        err.status = response.status
        err.code = errCode
        err.providerDetails = parsedError
        err.requestId = requestId
        err.durationMs = durationMs
        throw err
      }

      // Download complete array buffer under the active AbortController signal
      const arrayBuffer = await response.arrayBuffer()

      // Validate audio response is complete and non-empty
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        const emptyErr: any = new Error('GNANI_EMPTY_AUDIO: Provider returned empty audio response (0 bytes).')
        emptyErr.code = 'GNANI_EMPTY_AUDIO'
        emptyErr.status = 502
        throw emptyErr
      }

      if (arrayBuffer.byteLength < 44) {
        const incompleteErr: any = new Error(
          `GNANI_INCOMPLETE_AUDIO: Provider returned incomplete audio (${arrayBuffer.byteLength} bytes). Minimum valid WAV header is 44 bytes.`
        )
        incompleteErr.code = 'GNANI_INCOMPLETE_AUDIO'
        incompleteErr.status = 502
        throw incompleteErr
      }

      const audioBuffer = Buffer.from(arrayBuffer)
      const contentType = response.headers?.get ? (response.headers.get('content-type') || 'audio/wav') : 'audio/wav'
      const totalElapsedMs = Date.now() - startTime

      // Safe logging without leaking API keys or speaker embedding tensors
      console.log(
        `[Gnani Client] Synthesis completed in ${totalElapsedMs}ms | status: ${response.status} | model: ${validated.model} | bytes: ${audioBuffer.length}${requestId ? ` | reqId: ${requestId}` : ''}`
      )

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
      if (timeoutFired || err.name === 'AbortError' || controller.signal.aborted) {
        const timeoutSec = Math.round(effectiveTimeoutMs / 1000)
        const timeoutErr: any = new Error(
          `GNANI_TIMEOUT: Speech synthesis request timed out after ${timeoutSec} seconds. The neural audio generation took longer than expected.`
        )
        timeoutErr.code = 'GNANI_TIMEOUT'
        timeoutErr.status = 504
        timeoutErr.durationMs = Date.now() - startTime
        throw timeoutErr
      }

      const isNetworkError =
        err instanceof TypeError ||
        err.name === 'FetchError' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ENOTFOUND' ||
        err.code === 'ECONNREFUSED' ||
        (typeof err.message === 'string' &&
          (err.message.includes('fetch failed') || err.message.includes('network') || err.message.includes('ENOTFOUND')))

      if (isNetworkError && !err.status) {
        const netErr: any = new Error(
          `GNANI_NETWORK_ERROR: Network connection failed while communicating with Gnani AI endpoint (${err.message}).`
        )
        netErr.code = 'GNANI_NETWORK_ERROR'
        netErr.status = 502
        netErr.durationMs = Date.now() - startTime
        throw netErr
      }

      throw err
    } finally {
      // Clear timeout in finally block so timer is guaranteed to be cleaned up
      clearTimeout(timeoutId)
    }
  }
}
