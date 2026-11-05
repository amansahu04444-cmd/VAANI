import type { AudioAsset, UserVoiceProfile, VoiceMode } from '../types'

const TOKEN_KEY = 'vaani_auth_token'

export function getAuthToken(): string {
  const stored = localStorage.getItem(TOKEN_KEY)
  if (stored) return stored

  // Generate a fallback evaluation JWT payload signed for local dev
  const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6ImFtYW5AdmFhbmkuYWkiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.fake_sig'
  localStorage.setItem(TOKEN_KEY, mockJwt)
  return mockJwt
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})

  if (!headers.has('Authorization') && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorJson: any = {}
    try {
      errorJson = await response.json()
    } catch {
      errorJson = { message: response.statusText }
    }
    throw new Error(errorJson.message || `API request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
export const authApi = {
  async getMe() {
    return apiRequest<{ user: { id: string; email: string; display_name: string; full_name?: string } }>('/auth/me')
  },

  async signupViaStudio(payload: { email: string; password: string; fullName: string }) {
    return apiRequest<{ ok: boolean; message: string; user: { id: string; email: string } }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async syncProfile(payload: { fullName?: string; displayName?: string }) {
    return apiRequest<{ ok: boolean; message: string; user: any }>('/auth/sync-profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

// ---------------------------------------------------------------------------
// Voice Profile API
// ---------------------------------------------------------------------------
export const voiceApi = {
  async getProfile(): Promise<UserVoiceProfile | null> {
    try {
      const data = await apiRequest<any>('/voice/me')
      return {
        id: data.id,
        userId: data.userId,
        status: data.status,
        enrollmentLanguage: data.enrollmentLanguage,
        supportedLanguages: data.supportedLanguages || [],
        sampleDurationSec: data.sampleDurationSec,
        consentedAt: data.consentedAt,
        consentVersion: data.consentVersion,
        hasSpeakerEmbedding: data.hasSpeakerEmbedding,
        createdAt: data.createdAt,
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('404') || err.message.includes('NOT_FOUND'))) {
        return null
      }
      throw err
    }
  },

  async enroll(payload: {
    consentAccepted: true
    consentVersion?: string
    enrollmentLanguage?: string
    sampleDurationSec?: number
    sampleObjectKey?: string
  }) {
    return apiRequest<{ message: string; profile: { id: string; status: string } }>('/voice/enroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async revoke() {
    return apiRequest<{ message: string; deletedAt: string }>('/voice/me', {
      method: 'DELETE',
    })
  },
}

// ---------------------------------------------------------------------------
// Speech Studio API
// ---------------------------------------------------------------------------
export const speechApi = {
  async generate(payload: {
    text: string
    title?: string
    targetLanguage: string
    voiceMode: VoiceMode
    standardVoiceId?: string
    speed?: number
  }) {
    return apiRequest<{
      jobId: string
      status: string
      asset: AudioAsset
    }>('/speech/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async pollJob(jobId: string) {
    return apiRequest<{
      jobId: string
      status: string
      assetId: string
      durationMs: number
    }>(`/speech/${jobId}`)
  },
}

// ---------------------------------------------------------------------------
// Audio Library API
// ---------------------------------------------------------------------------
export const audioApi = {
  async list(): Promise<AudioAsset[]> {
    const data = await apiRequest<{ assets: any[]; totalCount: number }>('/audio')
    return data.assets.map((a) => ({
      id: a.id,
      userId: a.user_id,
      title: a.title,
      textPreview: a.title,
      languageCode: 'hi-IN',
      languageName: 'Hindi / Hinglish',
      voiceMode: 'personal' as VoiceMode,
      voiceLabel: 'Enrolled Voice',
      durationSeconds: Math.max(1, Math.round((a.duration_ms || 14000) / 1000)),
      fileSizeBytes: a.file_size || 1344044,
      createdAt: a.created_at,
      audioUrl: undefined, // Fresh signed URL requested on-demand when user clicks Play
    }))
  },

  async getSignedUrl(assetId: string) {
    return apiRequest<{
      assetId: string
      title: string
      signedUrl: string
      audioUrl?: string
      expiresAt: string
      durationMs: number
    }>(`/audio/${assetId}/url`)
  },

  async downloadAudio(assetId: string, filename?: string): Promise<void> {
    const token = getAuthToken()
    const cleanName = filename
      ? (filename.endsWith('.wav') ? filename : `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.wav`)
      : `vaani-audio-${assetId}.wav`

    try {
      const response = await fetch(`/api/audio/${assetId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) {
        throw new Error(`Direct download returned ${response.status}`)
      }
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = cleanName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch {
      // Fallback: request signed URL and fetch blob
      const urlData = await audioApi.getSignedUrl(assetId)
      const targetUrl = urlData.signedUrl || urlData.audioUrl
      if (!targetUrl) throw new Error('No audio URL available for download')

      const directResp = await fetch(targetUrl)
      if (!directResp.ok) throw new Error('Failed to fetch audio stream')
      const blob = await directResp.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = cleanName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    }
  },

  async delete(assetId: string) {
    return apiRequest<{ message: string; deletedId: string }>(`/audio/${assetId}`, {
      method: 'DELETE',
    })
  },
}

