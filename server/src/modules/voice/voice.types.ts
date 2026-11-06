export type VoiceEnrollmentState =
  | 'NOT_ENROLLED'
  | 'RECORDING_UPLOADED'
  | 'EMBEDDING_PROCESSING'
  | 'EMBEDDING_FAILED'
  | 'EMBEDDING_MISSING'
  | 'READY'

export type EmbeddingStatus = 'NONE' | 'ACTIVE' | 'PROCESSING' | 'FAILED' | 'MISSING'

export interface SpeakerEmbeddingTensor {
  embedding: string
  shape: [1, 768] | number[]
  dtype?: string
}

export interface EvaluatedVoiceProfile {
  enrollmentStatus: VoiceEnrollmentState
  embeddingStatus: EmbeddingStatus
  isReadyForSynthesis: boolean
  hasSpeakerEmbedding: boolean
  embeddingPayload: SpeakerEmbeddingTensor | null
  errorMessage: string | null
}

