import { supabaseAdmin } from './supabase.js'

export interface ProfileRecord {
  id: string
  email: string
  display_name: string
  created_at: string
}

export interface VoiceProfileRecord {
  id: string
  user_id: string
  provider: string
  provider_voice_ref: string | null
  status: 'pending' | 'ready' | 'failed' | 'revoked'
  enrollment_language: string
  supported_languages: string[]
  sample_object_key: string | null
  sample_duration_sec: number | null
  consent_version: string
  consented_at: string
  deleted_at: string | null
  created_at: string
}

export interface AudioAssetRecord {
  id: string
  user_id: string
  speech_job_id: string | null
  object_key: string
  mime_type: string
  file_size: number
  duration_ms: number
  title: string
  created_at: string
  deleted_at: string | null
}

export interface ConsentEventRecord {
  id: string
  user_id: string
  event_type: 'granted' | 'revoked'
  consent_version: string
  accepted_at: string
  revoked_at: string | null
  details: Record<string, any>
}

// In-memory test store for deterministic offline unit and integration tests
export class MockDatabaseStore {
  profiles: Map<string, ProfileRecord> = new Map()
  voiceProfiles: Map<string, VoiceProfileRecord> = new Map()
  audioAssets: Map<string, AudioAssetRecord> = new Map()
  consentEvents: Map<string, ConsentEventRecord> = new Map()

  reset() {
    this.profiles.clear()
    this.voiceProfiles.clear()
    this.audioAssets.clear()
    this.consentEvents.clear()
  }

  seedInitialData() {
    this.profiles.set('user-a', {
      id: 'user-a',
      email: 'usera@example.com',
      display_name: 'User A',
      created_at: new Date().toISOString(),
    })

    this.profiles.set('user-b', {
      id: 'user-b',
      email: 'userb@example.com',
      display_name: 'User B',
      created_at: new Date().toISOString(),
    })

    this.voiceProfiles.set('vp-user-a', {
      id: 'vp-user-a',
      user_id: 'user-a',
      provider: 'gnani',
      provider_voice_ref: 'enc_embedding_vector_user_a',
      status: 'ready',
      enrollment_language: 'hi-IN',
      supported_languages: ['hi-IN', 'en-IN', 'auto'],
      sample_object_key: 'user-a/voice-sample.wav',
      sample_duration_sec: 14.5,
      consent_version: 'v1.0-2026',
      consented_at: new Date().toISOString(),
      deleted_at: null,
      created_at: new Date().toISOString(),
    })

    this.audioAssets.set('audio-user-a', {
      id: 'audio-user-a',
      user_id: 'user-a',
      speech_job_id: null,
      object_key: 'user-a/generated-meeting.wav',
      mime_type: 'audio/wav',
      file_size: 1048576,
      duration_ms: 12000,
      title: 'User A Confidential Script',
      created_at: new Date().toISOString(),
      deleted_at: null,
    })

    this.audioAssets.set('audio-user-b', {
      id: 'audio-user-b',
      user_id: 'user-b',
      speech_job_id: null,
      object_key: 'user-b/generated-private.wav',
      mime_type: 'audio/wav',
      file_size: 2048576,
      duration_ms: 18000,
      title: 'User B Secret Audio',
      created_at: new Date().toISOString(),
      deleted_at: null,
    })
  }
}

export const mockDb = new MockDatabaseStore()
mockDb.seedInitialData()

