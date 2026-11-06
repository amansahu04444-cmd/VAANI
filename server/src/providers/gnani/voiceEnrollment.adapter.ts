import { config } from '../../config/env.js'
import { SpeakerEmbedding, SpeakerEmbeddingSchema } from './types.js'
import { inspectAudioBuffer } from '../../modules/audio/audio.utils.js'

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

    // 1. Audio format inspection & validation
    const inspection = inspectAudioBuffer(audioBuffer)
    if (inspection.format === 'webm') {
      throw new Error(
        'UNSUPPORTED_AUDIO_FORMAT: Gnani Voice Cloning requires PCM WAV, MP3, or OGG audio. WebM format is not accepted by the provider decoder.'
      )
    }

    const endpoint = `${this.baseUrl}/api/v1/tts/voice-clone/embeddings`

    // Determine clean upload filename matching format
    const cleanFileName = fileName.endsWith('.wav') || fileName.endsWith('.mp3')
      ? fileName
      : inspection.format === 'mp3'
      ? 'reference_voice.mp3'
      : 'reference_voice.wav'

    const cleanMimeType = inspection.format === 'mp3' ? 'audio/mpeg' : 'audio/wav'

    // Prepare multipart/form-data with native Node 24 FormData & Blob
    // Official Gnani schema requires field name "audio_file"
    const formData = new FormData()
    const blob = new Blob([audioBuffer], { type: cleanMimeType })
    formData.append('audio_file', blob, cleanFileName)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for audio analysis

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key-ID': this.apiKey,
          'X-Source': 'mcp',
        },
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        let parsedMessage = ''
        try {
          const json = JSON.parse(errorText)
          parsedMessage = json.message || json.detail || json.error || ''
        } catch {}

        if (response.status === 404 || response.status === 403) {
          throw new Error(
            `PROVIDER_CAPABILITY_UNAVAILABLE (${response.status}): Voice cloning embedding endpoint is not enabled or accessible with this participant API key tier. Details: ${parsedMessage || errorText}`
          )
        }
        if (response.status === 500) {
          throw new Error(
            `GNANI_ENROLLMENT_ERROR (500): ${parsedMessage || 'We are facing technical difficulties. Please try again later.'}. Provider internal error processing audio embedding. Ensure audio is clean 16-bit PCM WAV (5-30s).`
          )
        }
        throw new Error(`GNANI_ENROLLMENT_ERROR (${response.status}): ${response.statusText} - ${parsedMessage || errorText}`)
      }

      const json = (await response.json()) as any
      const embeddingPayload = json.data?.voice_clone_embedding || json.speaker_embedding || json

      // Validate output shape ([1, 768])
      const validated = SpeakerEmbeddingSchema.parse(embeddingPayload)
      return validated
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new Error('GNANI_TIMEOUT: Voice embedding extraction timed out after 30 seconds.')
      }
      throw err
    }
  }
}
