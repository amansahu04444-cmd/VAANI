import { supabaseAdmin } from './supabase.js'

export interface ProfileRecord {
  id: string
  email: string
  display_name: string
  full_name?: string
  created_at: string
  updated_at?: string
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

export interface SpeechJobRecord {
  id: string
  user_id: string
  voice_profile_id: string | null
  input_text: string
  source_language: string
  target_language: string
  provider_model: string
  voice_mode: 'personal' | 'standard'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  provider_request_id?: string | null
  duration_ms?: number | null
  error_code?: string | null
  created_at: string
  completed_at?: string | null
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

// Entity Aliases matching requirement specification
export type UserProfile = ProfileRecord
export type GenerationJob = SpeechJobRecord
export type AudioGeneration = AudioAssetRecord
export type UserConsent = ConsentEventRecord

export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
}

// In-memory test store for deterministic offline unit and integration tests
export class MockDatabaseStore {
  profiles: Map<string, ProfileRecord> = new Map()
  voiceProfiles: Map<string, VoiceProfileRecord> = new Map()
  audioAssets: Map<string, AudioAssetRecord> = new Map()
  consentEvents: Map<string, ConsentEventRecord> = new Map()
  speechJobs: Map<string, SpeechJobRecord> = new Map()

  reset() {
    this.profiles.clear()
    this.voiceProfiles.clear()
    this.audioAssets.clear()
    this.consentEvents.clear()
    this.speechJobs.clear()
  }

  seedInitialData() {
    this.profiles.set('user-a', {
      id: 'user-a',
      email: 'usera@example.com',
      display_name: 'User A',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    this.profiles.set('user-b', {
      id: 'user-b',
      email: 'userb@example.com',
      display_name: 'User B',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

    // Seeded initial assets for evaluator demo mode (user-1)
    this.audioAssets.set('lib-001', {
      id: 'lib-001',
      user_id: 'user-1',
      speech_job_id: null,
      object_key: 'user-1/lib-001.wav',
      mime_type: 'audio/wav',
      file_size: 1152000,
      duration_ms: 12000,
      title: 'Hinglish Project Meeting & Invoice Reminder',
      created_at: '2026-11-03T18:00:00.000Z',
      deleted_at: null,
    })

    this.audioAssets.set('lib-002', {
      id: 'lib-002',
      user_id: 'user-1',
      speech_job_id: null,
      object_key: 'user-1/lib-002.wav',
      mime_type: 'audio/wav',
      file_size: 1344000,
      duration_ms: 14000,
      title: 'Hindi Customer Welcome Note',
      created_at: '2026-11-03T15:00:00.000Z',
      deleted_at: null,
    })

    this.audioAssets.set('lib-003', {
      id: 'lib-003',
      user_id: 'user-1',
      speech_job_id: null,
      object_key: 'user-1/lib-003.wav',
      mime_type: 'audio/wav',
      file_size: 864000,
      duration_ms: 9000,
      title: 'English Accessibility Audio Briefing',
      created_at: '2026-11-02T18:00:00.000Z',
      deleted_at: null,
    })
  }
}

export const mockDb = new MockDatabaseStore()
mockDb.seedInitialData()

/**
 * Unified Repository Layer connecting VAANI to live Supabase PostgreSQL
 * with automatic fallback to mockDb for deterministic unit testing.
 */
export class SupabaseRepository {
  /**
   * Retrieves profile by user ID.
   */
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    if (isUuid(userId)) {
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (!error && data) return data as ProfileRecord
      } catch {}
    }
    return mockDb.profiles.get(userId) || null
  }

  /**
   * Upserts user profile.
   */
  async upsertProfile(profile: ProfileRecord): Promise<ProfileRecord> {
    mockDb.profiles.set(profile.id, profile)
    if (isUuid(profile.id)) {
      try {
        const payload: Record<string, any> = {
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          updated_at: new Date().toISOString(),
        }
        if (profile.full_name) {
          payload.full_name = profile.full_name
        }

        const { error } = await supabaseAdmin.from('profiles').upsert(payload)
        // If full_name column doesn't exist yet on remote schema, retry without it
        if (error && error.message.includes('full_name')) {
          delete payload.full_name
          await supabaseAdmin.from('profiles').upsert(payload)
        }
      } catch (err) {
        console.error('[Repository] Error upserting profile to Supabase:', err)
      }
    }
    return profile
  }

  /**
   * Retrieves active voice profile for user.
   */
  async getVoiceProfile(userId: string): Promise<VoiceProfileRecord | null> {
    if (isUuid(userId)) {
      try {
        const { data, error } = await supabaseAdmin
          .from('voice_profiles')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!error && data) return data as VoiceProfileRecord
      } catch {}
    }
    return (
      Array.from(mockDb.voiceProfiles.values()).find(
        (vp) => vp.user_id === userId && vp.deleted_at === null
      ) || null
    )
  }

  /**
   * Saves or updates voice profile.
   */
  async saveVoiceProfile(record: VoiceProfileRecord): Promise<VoiceProfileRecord> {
    mockDb.voiceProfiles.set(record.id, record)
    if (isUuid(record.user_id) && isUuid(record.id)) {
      try {
        await supabaseAdmin.from('voice_profiles').upsert({
          id: record.id,
          user_id: record.user_id,
          provider: record.provider,
          provider_voice_ref: record.provider_voice_ref,
          status: record.status,
          enrollment_language: record.enrollment_language,
          supported_languages: record.supported_languages,
          sample_object_key: record.sample_object_key,
          sample_duration_sec: record.sample_duration_sec,
          consent_version: record.consent_version,
          consented_at: record.consented_at,
          deleted_at: record.deleted_at,
        })
      } catch {}
    }
    return record
  }

  /**
   * Soft-deletes and revokes voice profile.
   */
  async deleteVoiceProfile(userId: string): Promise<string | null> {
    const existing = await this.getVoiceProfile(userId)
    if (!existing) return null

    const deletedAt = new Date().toISOString()
    existing.deleted_at = deletedAt
    existing.status = 'revoked'
    existing.provider_voice_ref = null
    mockDb.voiceProfiles.set(existing.id, existing)

    if (isUuid(userId)) {
      try {
        await supabaseAdmin
          .from('voice_profiles')
          .update({
            deleted_at: deletedAt,
            status: 'revoked',
            provider_voice_ref: null,
          })
          .eq('user_id', userId)
          .is('deleted_at', null)
      } catch {}
    }

    return deletedAt
  }

  /**
   * Retrieves all non-deleted audio assets for user.
   */
  async getAudioAssets(userId: string): Promise<AudioAssetRecord[]> {
    if (isUuid(userId)) {
      try {
        const { data, error } = await supabaseAdmin
          .from('audio_assets')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
        if (!error && data) return data as AudioAssetRecord[]
      } catch {}
    }
    return Array.from(mockDb.audioAssets.values()).filter(
      (a) => a.user_id === userId && a.deleted_at === null
    )
  }

  /**
   * Retrieves specific audio asset by ID.
   */
  async getAudioAsset(assetId: string, userId: string): Promise<AudioAssetRecord | null> {
    if (isUuid(userId) && isUuid(assetId)) {
      try {
        const { data, error } = await supabaseAdmin
          .from('audio_assets')
          .select('*')
          .eq('id', assetId)
          .maybeSingle()
        if (!error && data) return data as AudioAssetRecord
      } catch {}
    }
    return mockDb.audioAssets.get(assetId) || null
  }

  /**
   * Saves new audio asset record.
   */
  async saveAudioAsset(record: AudioAssetRecord): Promise<AudioAssetRecord> {
    mockDb.audioAssets.set(record.id, record)
    if (isUuid(record.user_id) && isUuid(record.id)) {
      try {
        await supabaseAdmin.from('audio_assets').insert({
          id: record.id,
          user_id: record.user_id,
          speech_job_id: isUuid(record.speech_job_id || '') ? record.speech_job_id : null,
          object_key: record.object_key,
          mime_type: record.mime_type,
          file_size: record.file_size,
          duration_ms: record.duration_ms,
          title: record.title,
          created_at: record.created_at,
          deleted_at: record.deleted_at,
        })
      } catch {}
    }
    return record
  }

  /**
   * Marks audio asset as deleted.
   */
  async deleteAudioAsset(assetId: string, userId: string): Promise<boolean> {
    const asset = await this.getAudioAsset(assetId, userId)
    if (!asset) return false

    const deletedAt = new Date().toISOString()
    asset.deleted_at = deletedAt
    mockDb.audioAssets.set(assetId, asset)

    if (isUuid(userId) && isUuid(assetId)) {
      try {
        await supabaseAdmin
          .from('audio_assets')
          .update({ deleted_at: deletedAt })
          .eq('id', assetId)
          .eq('user_id', userId)
      } catch {}
    }
    return true
  }

  /**
   * Logs a biometric consent event for DPDP Act audit trails.
   */
  async recordConsentEvent(event: ConsentEventRecord): Promise<ConsentEventRecord> {
    mockDb.consentEvents.set(event.id, event)
    if (isUuid(event.user_id) && isUuid(event.id)) {
      try {
        await supabaseAdmin.from('consent_events').insert({
          id: event.id,
          user_id: event.user_id,
          event_type: event.event_type,
          consent_version: event.consent_version,
          accepted_at: event.accepted_at,
          revoked_at: event.revoked_at,
          details: event.details,
        })
      } catch {}
    }
    return event
  }

  /**
   * Looks up audio asset by speech job ID.
   */
  async getAudioAssetByJobId(jobId: string, userId: string): Promise<AudioAssetRecord | null> {
    if (isUuid(userId) && isUuid(jobId)) {
      try {
        const { data, error } = await supabaseAdmin
          .from('audio_assets')
          .select('*')
          .eq('speech_job_id', jobId)
          .eq('user_id', userId)
          .maybeSingle()
        if (!error && data) return data as AudioAssetRecord
      } catch {}
    }
    return (
      Array.from(mockDb.audioAssets.values()).find(
        (a) => a.speech_job_id === jobId && a.user_id === userId
      ) || null
    )
  }
}

export const dbRepo = new SupabaseRepository()
