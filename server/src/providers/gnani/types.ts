import { z } from 'zod'

export const SUPPORTED_LOCALES = [
  'hi-IN',
  'en-IN',
  'auto',
  'ta-IN',
  'te-IN',
  'kn-IN',
  'ml-IN',
  'mr-IN',
  'bn-IN',
  'gu-IN',
  'pa-IN',
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const AudioConfigSchema = z.object({
  sample_rate: z.union([
    z.literal(8000),
    z.literal(16000),
    z.literal(22050),
    z.literal(24000),
    z.literal(44100),
    z.literal(48000),
  ]).default(48000),
  encoding: z.enum(['linear_pcm', 'oggopus', 'pcm_mulaw', 'pcm_alaw']).default('linear_pcm'),
  num_channels: z.number().int().min(1).max(8).default(1),
  sample_width: z.number().int().min(1).max(4).default(2),
  container: z.enum(['raw', 'mp3', 'wav', 'ogg', 'mulaw', 'alaw']).default('wav'),
})

export type AudioConfig = z.infer<typeof AudioConfigSchema>

export const SpeakerEmbeddingSchema = z.object({
  embedding: z.string().min(1, 'Embedding string cannot be empty'),
  shape: z.array(z.number().int()).default([1, 768]),
  dtype: z.string().default('torch.bfloat16'),
})

export type SpeakerEmbedding = z.infer<typeof SpeakerEmbeddingSchema>

export const TimbreSynthesisPayloadSchema = z.object({
  text: z.string().min(1, 'Text to synthesize cannot be empty').max(1000, 'Text exceeds 1000 character limit'),
  voice: z.string().optional(),
  model: z.enum(['timbre-v2.5', 'timbre-v3.0', 'vachana-vc-v1']).default('timbre-v2.5'),
  language: z.enum(SUPPORTED_LOCALES).default('hi-IN'),
  speed: z.number().min(0.85).max(1.15).default(1.0),
  audio_config: AudioConfigSchema.default({}),
  speaker_embedding: SpeakerEmbeddingSchema.optional(),
})

export type TimbreSynthesisPayload = z.infer<typeof TimbreSynthesisPayloadSchema>

export interface SynthesisResult {
  audioBuffer: Buffer
  contentType: string
  durationEstimateSec: number
  characterCount: number
  modelUsed: string
  voiceMode: 'personal' | 'standard'
}

export interface ProviderCapability {
  provider: 'gnani'
  hasApiKey: boolean
  standardTTSAvailable: boolean
  customVoiceEnrollmentAvailable: boolean
  supportedLocales: readonly string[]
  supportedVoices: readonly string[]
  notes: string[]
}

