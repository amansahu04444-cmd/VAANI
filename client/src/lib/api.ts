import type { AudioAsset, UserVoiceProfile, VoiceMode } from '../types'
import { supabase } from './supabase'

const TOKEN_KEY = 'vaani_auth_token'

const RAW_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  ''
).trim()

// Strip trailing slashes and trailing /api from base URL to prevent duplicate /api/api prefixes
const API_BASE_ORIGIN = RAW_BASE.replace(/\/+$/, '').replace(/\/api$/, '')

/**
 * Resolves API endpoints against custom backend origin (VITE_API_BASE_URL / VITE_API_URL)
 * or defaults to relative '/api' path.
 * Guaranteed to produce exactly one '/api' prefix and never create duplicate '/api/api' or missing '/api'.
 */
export function getFullApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint
  }
  // Ensure leading slash
  let cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  // Strip duplicate leading /api/api/ if present
  cleanPath = cleanPath.replace(/^\/api\/api\//, '/api/')
  // Ensure exactly one /api prefix
  const apiPath = cleanPath.startsWith('/api/') || cleanPath === '/api'
    ? cleanPath
    : `/api${cleanPath}`

  return `${API_BASE_ORIGIN}${apiPath}`
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = getAuthToken()
  if (!token) {
    try {
      const { data } = await supabase.auth.getSession()
      if (data.session?.access_token) {
        token = data.session.access_token
        setAuthToken(token)
      }
    } catch {}
  }

  const headers = new Headers(options.headers || {})

  if (!headers.has('Authorization') && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const url = getFullApiUrl(endpoint)

  const response = await fetch(url, {
    credentials: options.credentials || 'include',
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
    const err: any = new Error(errorJson.message || `API request failed with status ${response.status}`)
    err.status = response.status
    err.code = errorJson.error
    err.details = errorJson.details
    throw err
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
      if (!data || data.status === 'not_enrolled' || data.status === 'NOT_ENROLLED') {
        return null
      }
      const rawStatus = data.enrollmentStatus || data.status
      const normStatus =
        rawStatus === 'ready'
          ? 'READY'
          : rawStatus === 'not_enrolled'
          ? 'NOT_ENROLLED'
          : rawStatus === 'processing'
          ? 'EMBEDDING_PROCESSING'
          : rawStatus === 'failed'
          ? 'EMBEDDING_FAILED'
          : rawStatus

      return {
        id: data.id,
        userId: data.userId,
        status: normStatus,
        enrollmentStatus: normStatus,
        embeddingStatus: data.embeddingStatus || (data.hasSpeakerEmbedding ? 'ACTIVE' : 'MISSING'),
        isReadyForSynthesis: Boolean(data.isReadyForSynthesis && normStatus === 'READY'),
        hasSpeakerEmbedding: Boolean(data.hasSpeakerEmbedding),
        enrollmentLanguage: data.enrollmentLanguage,
        supportedLanguages: data.supportedLanguages || [],
        sampleDurationSec: data.sampleDurationSec,
        sampleObjectKey: data.sampleObjectKey,
        consentedAt: data.consentedAt,
        consentVersion: data.consentVersion,
        createdAt: data.createdAt,
        errorMessage: data.errorMessage,
      }
    } catch (err: any) {
      if (err.status === 404 || (err.message && (err.message.includes('404') || err.message.includes('NOT_FOUND') || err.message.includes('No active voice profile')))) {
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
    audioBase64?: string
    mimeType?: string
  }) {
    return apiRequest<{
      message: string
      profile: {
        id: string
        status: string
        supportedLanguages?: string[]
        hasSpeakerEmbedding?: boolean
        consentedAt?: string
        sampleObjectKey?: string
      }
    }>('/voice/enroll', {
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
// Translation API
// ---------------------------------------------------------------------------
export const translationApi = {
  async detect(text: string) {
    return apiRequest<{
      detectedLanguage: string
      languageName: string
      confidence: number
      isCodeMixed: boolean
    }>('/translation/detect', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  },

  async translate(payload: { text: string; targetLanguage: string; sourceLanguage?: string }) {
    return apiRequest<{
      originalText: string
      translatedText: string
      sourceLanguage: string
      sourceLanguageName: string
      targetLanguage: string
      targetLanguageName: string
      isIdentical: boolean
      characterCount: number
      provider: string
    }>('/translation/translate', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

// ---------------------------------------------------------------------------
// Speech Studio API
// ---------------------------------------------------------------------------
export const speechApi = {
  async generate(payload: {
    text: string
    translatedText?: string
    sourceLanguage?: string
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

  async generateDemo(payload: {
    text: string
    translatedText?: string
    sourceLanguage?: string
    title?: string
    targetLanguage?: string
    standardVoiceId?: string
    speed?: number
  }) {
    return apiRequest<{
      success: boolean
      isDemo: boolean
      audioBase64?: string
      durationSeconds?: number
      asset: AudioAsset & { audioBase64?: string; mimeType?: string }
      notice: string
    }>('/speech/demo-generate', {
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
    return (data.assets || []).map((a) => ({
      id: a.id,
      userId: a.userId || a.user_id,
      title: a.title,
      textPreview: a.textPreview || a.originalText || a.title,
      languageCode: a.languageCode || a.target_language || 'hi-IN',
      languageName:
        a.languageName ||
        (a.languageCode === 'en-IN'
          ? 'Indian English'
          : a.languageCode === 'auto'
          ? 'Hinglish (Code-mixed)'
          : 'Hindi (हिन्दी)'),
      voiceMode: (a.voiceMode || a.voice_mode || 'standard') as VoiceMode,
      voiceLabel: a.voiceLabel || (a.voiceMode === 'personal' ? 'Enrolled Voice' : 'Timbre Standard'),
      durationSeconds:
        a.durationSeconds || Math.max(1, Math.round((a.duration_ms || a.durationMs || 12000) / 1000)),
      fileSizeBytes: a.fileSizeBytes || a.file_size || 1152000,
      createdAt: a.createdAt || a.created_at,
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
      const response = await fetch(getFullApiUrl(`/audio/${assetId}/download`), {
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

