import { config } from '../../config/env.js'
import { GnaniTimbreClient } from './timbre.client.js'
import { GnaniVoiceEnrollmentAdapter } from './voiceEnrollment.adapter.js'
import {
  SUPPORTED_LOCALES,
  SupportedLocale,
  SpeakerEmbedding,
  SynthesisResult,
  ProviderCapability,
} from './types.js'

export const STANDARD_TIMBRE_VOICES = [
  'Nalini',
  'Bhavna',
  'Yashvi',
  'Urmila',
  'Deepak',
  'Roopesh',
  'Vikrant',
  'Kaveri',
  'Trupti',
  'Pranav',
  'Shlok',
  'Poorvi',
  'Asmita',
  'Trisha',
  'Suhana',
  'Lavanya',
  'Saanvi',
  'Reshma',
  'Zahira',
  'Kirra',
  'Falak',
  'Mehuli',
] as const

export class GnaniProvider {
  private timbreClient: GnaniTimbreClient
  private enrollmentAdapter: GnaniVoiceEnrollmentAdapter

  constructor(apiKey?: string, baseUrl?: string) {
    this.timbreClient = new GnaniTimbreClient(apiKey, baseUrl)
    this.enrollmentAdapter = new GnaniVoiceEnrollmentAdapter(apiKey, baseUrl)
  }

  listSupportedLanguages(): readonly string[] {
    return SUPPORTED_LOCALES
  }

  listStandardVoices(): readonly string[] {
    return STANDARD_TIMBRE_VOICES
  }

  getCapability(): ProviderCapability {
    const hasKey = Boolean(process.env.GNANI_API_KEY)
    return {
      provider: 'gnani',
      hasApiKey: hasKey,
      standardTTSAvailable: hasKey,
      customVoiceEnrollmentAvailable: hasKey && config.GNANI_CUSTOM_VOICE_ENABLED,
      supportedLocales: SUPPORTED_LOCALES,
      supportedVoices: STANDARD_TIMBRE_VOICES,
      notes: [
        'Timbre v2.5 REST synthesis verified at https://api.vachana.ai/api/v1/tts/inference',
        'Custom voice cloning embedding endpoint is /api/v1/tts/voice-clone/embeddings',
        hasKey
          ? 'API Key is detected in server environment.'
          : 'BLOCKER: GNANI_API_KEY is not configured in server/.env.',
      ],
    }
  }

  /**
   * Synthesize speech using a standard Timbre voice from the catalogue.
   */
  async synthesizeWithStandardVoice(params: {
    text: string
    language?: SupportedLocale
    voice?: string
    speed?: number
  }): Promise<SynthesisResult> {
    return this.timbreClient.synthesize({
      text: params.text,
      language: params.language || 'hi-IN',
      voice: params.voice || 'Nalini',
      model: 'timbre-v2.5',
      speed: params.speed || 1.0,
      audio_config: {
        encoding: 'linear_pcm',
        container: 'wav',
        num_channels: 1,
        sample_rate: 48000,
        sample_width: 2,
      },
    })
  }

  /**
   * Synthesize speech using an enrolled custom speaker embedding.
   */
  async synthesizeWithSpeakerEmbedding(params: {
    text: string
    language?: SupportedLocale
    speakerEmbedding: SpeakerEmbedding
    speed?: number
  }): Promise<SynthesisResult> {
    return this.timbreClient.synthesize({
      text: params.text,
      language: params.language || 'hi-IN',
      model: 'vachana-vc-v1',
      speed: params.speed || 1.0,
      speaker_embedding: params.speakerEmbedding,
      audio_config: {
        encoding: 'linear_pcm',
        container: 'wav',
        num_channels: 1,
        sample_rate: 48000,
        sample_width: 2,
      },
    })
  }

  /**
   * Extract speaker embedding from a reference audio file.
   */
  async enrollVoice(audioBuffer: Buffer, fileName?: string, mimeType?: string): Promise<SpeakerEmbedding> {
    return this.enrollmentAdapter.extractSpeakerEmbedding(audioBuffer, fileName, mimeType)
  }
}

export const gnaniProvider = new GnaniProvider()

