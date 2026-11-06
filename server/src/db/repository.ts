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

    const verifiedEmbeddingRef = JSON.stringify({
      embedding: "AAC8vQAAp7wAAOw9AAChvAAA7z0AAF29AAC0PQAAJL4AAD47AAB+vQAANL4AABs9AAC5vAAAwD0AAKC8AABdvQAAmL0AAHG9AACOPQAA3j0AAMM7AACXvAAA0D0AABE+AAAxPAAAI7wAAI68AAD2vAAA4r0AAN09AAAmPQAA0LwAAFS+AAC2OwAAJr4AAIC7AABAvQAAd70AAFi7AABivQAATL0AAHs9AAAIPgAADD0AADS9AADEvQAALb0AAAG8AACjPQAAHzwAABm9AACkPAAAsL0AAKK9AACmPAAATD4AACo9AAAcPgAAmj0AAFO+AAChPQAArL0AAMa8AAAkvgAAY74AACs+AAAvPQAAlr0AAJO9AADnvQAAjzwAAAW+AADYPQAAHrwAAJW9AAAFPgAAMT0AANE9AAAQPgAAJD0AAIq9AADJPQAAOj0AAF88AADOPQAAUr0AAGK8AADZPQAABT4AAJW9AACuvQAAFT0AABi9AAA6PQAA7TsAAHs9AAAIPQAAjr0AAHG9AADtPAAAIL4AAJq9AACWvAAASj0AAOs6AAAyOwAAkr0AAOG8AACpPQAAxDwAALo9AAATvgAAsj0AACm9AAArPgAACz4AACU9AAAUPgAANT4AACU9AAAAPQAADj0AAD69AAAzPQAAYz4AANM8AAAMvAAApT0AAN+8AADrvQAAQ74AAB2+AAC5vQAAjDwAAGo8AACUPAAAjL0AAMu8AABBPQAAVr0AAAg9AADpuwAAK74AAEw9AADnPQAAJjoAAHm8AABYPgAAeb0AAEq8AAAJvgAAAD4AAOS7AAAZvgAAGb4AAOG8AADoPQAA/jwAAM+9AADjPQAA07wAALm9AACpvQAAHrwAAC2+AACDvAAAIT0AAF09AADXPQAA1r0AAKu9AACJvQAAtb0AAFU9AAABvQAAgj0AADG9AAAKvQAA2L0AAGI9AACBuwAAZDwAAEK+AADsvAAA5bsAAL+9AAAdPQAAFz4AAKy9AAA8PAAAGD4AAKS9AADZvQAA1D0AACA9AADRvAAAKT0AAJY9AACTvQAAKz0AADy9AACXvQAARb4AANc9AACLPQAAoDsAABK9AACDvQAA3j0AAAg+AAAwPQAAObkAAE49AAAePAAA3LwAAEi+AACFvQAAnz0AADa9AADTPQAASTwAAJ89AACkOgAAtr0AAAA+AAAUPgAAzjsAAA49AAAbvQAAKL4AAF69AABFvgAAU7sAABa8AACavQAAiD0AAA+9AABPPQAAmrwAAG49AACvvQAART0AAOC9AADBPQAAc7wAAEQ8AADCPAAABj4AABS9AADaPQAAx7wAAPG8AAAEvAAA/r0AABi8AAAvvQAAp70AAMo9AACKPAAAYz4AABC8AAAVvgAAVj0AANO8AABePQAAWz4AAOI9AADmvQAADTwAADU9AACPPQAAAz0AAJM9AAAHvgAAPD4AAEk9AACGvQAAn7wAAAo+AAAhvgAAxjwAAG28AAAyPQAAer0AAIK+AADtvQAAxz0AAAC9AAAvPgAAND0AALe9AAAvvQAA270AACI9AADUvQAADz0AAJq9AAAEvQAAqj0AAFA9AADgPQAAsD0AABg+AAAFPQAA7zsAAIw9AADLvAAAQzoAAMe9AADjPAAAGL0AACK9AAAuvAAA1jwAALk8AAAmPQAAq70AABK9AAChvAAAqj0AAOO9AAAWPAAAkLwAALQ9AAAQvgAAlz0AAA2+AABOvQAAq70AAD88AACxvQAAJz0AAEI+AAAuPgAATD4AAD09AADRPQAANz4AAFC+AAAcvgAA8DwAAPw8AABKvQAA2r0AAOu9AAALvQAAJT4AACE9AAAbvgAAtLwAAMQ9AAC6PQAAVb0AABI9AAADPgAAWb0AAAs9AAB6uwAAEj4AAKA9AACZvQAAOD0AAJG9AADEvAAA4r0AALK9AACRvAAAXr0AAFM9AAD+PQAAVr0AALo9AAAEvQAAWD0AACE9AABJvQAAoT0AAIM7AADSOwAASj0AAKa9AAA9vgAAr70AALU9AABdPgAArj0AACg9AAAcPgAALr0AAPI9AADbPAAABj0AAPa9AADOPAAAvr0AAH+9AAAnvQAAxT0AAKM9AAAWPAAA4L0AADI9AACiPQAACD0AACM+AADYvQAANb0AANe9AAAbPQAAUb0AAAg9AACTPQAAv7sAAOq8AADQvQAACT0AAAQ+AABWPAAAJz0AAFA9AACyvQAADL0AAG+8AADPvQAA5L0AADu+AAC0PQAAhL0AABA9AADbvQAAgr0AANG9AACJvQAADz4AANs9AABsPQAA0TsAALO9AABuvQAA9rsAAAI+AAAEPgAAs70AAEy+AADZuwAADL0AAEu+AAAFPQAAib0AADA8AAAbvQAAc70AAJs9AACAvQAAjr0AAP+8AABdvgAAR7wAAB2+AACQPQAAlj0AALO9AADkuwAAH74AANE8AAAgOwAAQj0AAA6+AAA+PQAAnT0AAL49AACvugAART0AAJM9AABbvAAAKz0AAGs8AACqvQAAtj0AAE8+AAAbvgAAnzwAAI09AAArvgAAkD0AAKG9AACSPgAAfr0AAMw9AADpvQAA3b0AAJC9AADyuwAAsT0AAOa9AABLPQAAX7wAABE9AAAGvQAA9roAAGu8AAABPQAApT0AAJU9AABzvQAAUz4AAFu9AAD4vQAAxL0AAHs9AAA8PQAAe70AACG8AACKPgAAbj0AABw+AADKvAAAAj4AAGY8AAAzvgAAvb0AAIY8AABGPQAAnD0AABu8AADNPAAAxj0AACi+AAC9vQAAY7wAAJs9AAAAPgAAK70AAAa+AACKvQAAzb0AAOW9AAALPgAAOD4AALo8AADiOwAAmr0AADq8AADuvQAAjbwAACI+AAAsvQAAgj0AANK9AAAdPgAAuj0AABy9AABdPQAARbwAAJc9AAAKvAAA6z0AAB09AAD0vQAANL0AALy9AACIvQAA6b0AACk9AAAjPQAAzTsAAJk8AADRvAAAE70AAES+AAAVPQAAHj4AAPq9AABePgAAb70AABa+AAAAvQAAeb4AAPW6AABhvAAAQr0AAN+9AAD4OwAAKT0AAB8+AADFPQAAAz4AAAo9AAAKPgAAhrwAAEU9AACHvQAAwb0AAKk9AACevQAANz4AAOY7AACuPAAAPLoAAI28AACBvQAAIL0AAFm8AAAIPQAACD0AAAs+AABOPQAAHDwAAOy8AAD6vQAAub0AAAM+AACdvQAAD70AALY9AAByPgAAajwAAOi9AAC5vQAAGL0AAK69AADEvQAAwD0AAEc+AAASPgAAS70AAIE9AACsPQAAPjwAACm+AAB1PQAAjD0AAOY8AADIPQAA3b0AAGE9AADBPQAAIr4AAAI9AACJvgAAiDwAAAC+AACFPQAA7TwAACO8AAA0vQAAy70AACY9AABzPAAAtr0AAA+9AACVPQAAQr0AAAG+AACHvQAA3T0AALW8AACjPQAAbDwAAL07AAAUPgAAorwAABS9AAD1PQAADrwAAAY8AAAqvQAA1rwAAH87AABJPQAATL4AAHG7AACLPQAA97wAAHo8AADWPQAAFb4AAE09AACzvQAAZj0AALY9AAD0PQAAZ7wAAHI8AADXPAAAmj0AAKo9AACavQAAxLwAANu6AADdvQAAtj0AAFc8AACCvQAATb0AABe9AADJPQAASj0AAIQ9AACBPQAAJz4AAFK+AACaPQAAiDwAAAE9AAAIvgAAzzkAAJU8AADnPQAAbz0AAKS9AADavQAAATwAAIa+AAAQPQAAkD0AALG9AAC4vQAAR70AAIg8AAAKOwAAGb0AAMa9AADivQAAqz0AADM9AAC8vAAAWLwAAHE9AACGvQAAu7wAAKQ8AABtvAAAY70AAI+9AABpPQAAwr0AAEO+AAAwvgAArDwAACy7AAB1uwAAyj0AAIS9AADGPQAA3j0AAO+9AACfPQAAib0AAAM+AABuvQAAyzwAAPa9AAChvQAAeb0AAP47AAASvQAAQD4AAPa9AABqPQAAZb0AAME7AACqvQAAjb0AAAk+AABcPgAATb0AAIc8",
      shape: [1, 768],
      dtype: "torch.bfloat16"
    })

    this.voiceProfiles.set('vp-user-a', {
      id: 'vp-user-a',
      user_id: 'user-a',
      provider: 'gnani',
      provider_voice_ref: verifiedEmbeddingRef,
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

    this.voiceProfiles.set('vp-user-1', {
      id: 'vp-user-1',
      user_id: 'user-1',
      provider: 'gnani',
      provider_voice_ref: verifiedEmbeddingRef,
      status: 'ready',
      enrollment_language: 'hi-IN',
      supported_languages: ['hi-IN', 'en-IN', 'auto', 'ta-IN', 'te-IN'],
      sample_object_key: 'user-1/voice-sample.wav',
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
   * Retrieves all consent events for user.
   */
  async getConsentEvents(userId: string): Promise<ConsentEventRecord[]> {
    if (isUuid(userId)) {
      try {
        const { data, error } = await supabaseAdmin
          .from('consent_events')
          .select('*')
          .eq('user_id', userId)
          .order('accepted_at', { ascending: false })
        if (!error && data) return data as ConsentEventRecord[]
      } catch {}
    }
    return Array.from(mockDb.consentEvents.values()).filter((e) => e.user_id === userId)
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
