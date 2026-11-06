import { VoiceProfileRecord } from '../../db/repository.js'
import { EvaluatedVoiceProfile, SpeakerEmbeddingTensor } from './voice.types.js'

/**
 * Validates whether a raw string or object contains a real, uncorrupted [1, 768] speaker embedding tensor.
 */
export function validateSpeakerEmbeddingTensor(rawRef: string | null | undefined): SpeakerEmbeddingTensor | null {
  if (!rawRef) return null

  try {
    const trimmed = typeof rawRef === 'string' ? rawRef.trim() : JSON.stringify(rawRef)

    // Must be a valid JSON object string
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return null
    }

    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    // Must have a non-trivial base64 embedding string (> 50 chars)
    if (typeof parsed.embedding !== 'string' || parsed.embedding.length < 50) {
      return null
    }

    // Must have shape [1, 768]
    if (
      !Array.isArray(parsed.shape) ||
      parsed.shape.length !== 2 ||
      parsed.shape[0] !== 1 ||
      parsed.shape[1] !== 768
    ) {
      return null
    }

    return {
      embedding: parsed.embedding,
      shape: [1, 768],
      dtype: parsed.dtype || 'torch.bfloat16',
    }
  } catch {
    return null
  }
}

/**
 * Evaluates the authoritative, backend-verified enrollment and embedding state of a voice profile.
 * Never marks a profile READY if its embedding tensor is missing or corrupted.
 */
export function evaluateVoiceProfile(profile: VoiceProfileRecord | null): EvaluatedVoiceProfile {
  if (!profile || profile.deleted_at !== null || profile.status === 'revoked') {
    return {
      enrollmentStatus: 'NOT_ENROLLED',
      embeddingStatus: 'NONE',
      isReadyForSynthesis: false,
      hasSpeakerEmbedding: false,
      embeddingPayload: null,
      errorMessage: null,
    }
  }

  // 1. Verify actual speaker embedding tensor
  const validTensor = validateSpeakerEmbeddingTensor(profile.provider_voice_ref)

  if (validTensor) {
    return {
      enrollmentStatus: 'READY',
      embeddingStatus: 'ACTIVE',
      isReadyForSynthesis: true,
      hasSpeakerEmbedding: true,
      embeddingPayload: validTensor,
      errorMessage: null,
    }
  }

  // 2. Profile exists, but tensor is missing or corrupted
  if (profile.status === 'failed') {
    return {
      enrollmentStatus: 'EMBEDDING_FAILED',
      embeddingStatus: 'FAILED',
      isReadyForSynthesis: false,
      hasSpeakerEmbedding: false,
      embeddingPayload: null,
      errorMessage: 'Voice embedding extraction failed. Please re-record your voice sample.',
    }
  }

  if (profile.status === 'pending' && !profile.sample_object_key) {
    return {
      enrollmentStatus: 'NOT_ENROLLED',
      embeddingStatus: 'NONE',
      isReadyForSynthesis: false,
      hasSpeakerEmbedding: false,
      embeddingPayload: null,
      errorMessage: null,
    }
  }

  // Audio sample or legacy profile exists, but embedding tensor is absent
  return {
    enrollmentStatus: 'EMBEDDING_MISSING',
    embeddingStatus: 'MISSING',
    isReadyForSynthesis: false,
    hasSpeakerEmbedding: false,
    embeddingPayload: null,
    errorMessage: 'Your enrolled voice profile is missing an active speaker embedding tensor. Please re-record your voice sample in Voice Setup.',
  }
}

