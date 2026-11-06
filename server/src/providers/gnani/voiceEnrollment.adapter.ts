import { config } from '../../config/env.js'
import { SpeakerEmbedding, SpeakerEmbeddingSchema } from './types.js'

export class GnaniVoiceEnrollmentAdapter {
  private readonly baseUrl: string
  private readonly apiKey: string | undefined

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.GNANI_API_KEY
    this.baseUrl = baseUrl || process.env.GNANI_API_BASE_URL || 'https://api.vachana.ai'
  }

  /**
   * Calls official Gnani Voice Cloning Embedding Extraction endpoint.
   * Target endpoint: POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings
   */
  async extractSpeakerEmbedding(
    audioBuffer: Buffer,
    fileName: string = 'reference_voice.wav',
    mimeType: string = 'audio/wav'
  ): Promise<SpeakerEmbedding> {
    if (!this.apiKey) {
      throw new Error(
        'GNANI_CREDENTIALS_MISSING: GNANI_API_KEY is not configured in server environment.'
      )
    }

    // Safety gate: Check whether custom voice is enabled
    if (!config.GNANI_CUSTOM_VOICE_ENABLED && process.env.NODE_ENV !== 'test' && !process.env.GNANI_API_KEY) {
      throw new Error(
        'PROVIDER_CAPABILITY_UNAVAILABLE: Custom speaker enrollment (VC) is currently gated pending participant account entitlement verification. Standard Timbre TTS remains fully operational.'
      )
    }

    const endpoint = `${this.baseUrl}/api/v1/tts/voice-clone/embeddings`

    // Prepare multipart/form-data with native Node 24 FormData & Blob
    // Official Gnani schema requires field name "audio_file"
    const formData = new FormData()
    const blob = new Blob([audioBuffer], { type: mimeType })
    formData.append('audio_file', blob, fileName)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s timeout for audio analysis

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key-ID': this.apiKey,
        },
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        if (response.status === 404 || response.status === 403) {
          throw new Error(
            `PROVIDER_CAPABILITY_UNAVAILABLE (${response.status}): Voice cloning embedding endpoint is not enabled or accessible with this participant API key tier. Details: ${errorText}`
          )
        }
        throw new Error(`GNANI_ENROLLMENT_ERROR (${response.status}): ${response.statusText} - ${errorText}`)
      }

      const json = (await response.json()) as any
      const embeddingPayload = json.data?.voice_clone_embedding || json.speaker_embedding || json

      // Validate output shape ([1, 768])
      const validated = SpeakerEmbeddingSchema.parse(embeddingPayload)
      return validated
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new Error('GNANI_TIMEOUT: Voice embedding extraction timed out after 20 seconds.')
      }
      throw err
    }
  }
}
