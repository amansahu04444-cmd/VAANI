export type VoiceMode = 'personal' | 'standard'

export type EnrollmentStatus = 'not_enrolled' | 'recording' | 'processing' | 'ready' | 'failed'

export type JobStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'

export interface SupportedLanguage {
  code: string
  name: string
  nativeName: string
  category: 'primary' | 'regional'
  scriptExample: string
}

export interface StandardVoice {
  id: string
  name: string
  gender: 'Female' | 'Male'
  primaryLanguage: string
  styleDescription: string
}

export interface UserVoiceProfile {
  id: string
  userId: string
  status: EnrollmentStatus
  enrollmentLanguage: string
  supportedLanguages: string[]
  sampleDurationSec?: number
  consentedAt?: string
  consentVersion?: string
  hasSpeakerEmbedding: boolean
  createdAt: string
}

export interface AudioAsset {
  id: string
  userId: string
  title: string
  textPreview: string
  languageCode: string
  languageName: string
  voiceMode: VoiceMode
  voiceLabel: string
  durationSeconds: number
  fileSizeBytes: number
  createdAt: string
  audioUrl?: string
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  tier: string
  challengeCredits: number
}

