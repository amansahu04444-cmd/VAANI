import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AudioProvider } from './context/AudioContext'
import { AppLayout } from './components/layout/AppLayout'
import { Landing } from './pages/Landing'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { VoiceSetup } from './pages/VoiceSetup'
import { SpeechStudio } from './pages/SpeechStudio'
import { AudioLibrary } from './pages/AudioLibrary'
import { Settings } from './pages/Settings'
import type { AudioAsset, EnrollmentStatus, VoiceEnrollmentState } from './types'
import { voiceApi } from './lib/api'

const INITIAL_AUDIOS: AudioAsset[] = [
  {
    id: 'aud-001',
    userId: 'user-1',
    title: 'Hinglish Project Meeting & Invoice Reminder',
    textPreview: 'Namaste, kal subah 10 baje project review meeting hai. Kripya ₹2,500 ka invoice aur presentation saath lekar aayein.',
    languageCode: 'auto',
    languageName: 'Hinglish (Code-mixed)',
    voiceMode: 'personal',
    voiceLabel: 'Enrolled Voice (Aman)',
    durationSeconds: 12,
    fileSizeBytes: 1152000,
    createdAt: '2026-11-03T18:00:00.000Z',
  },
  {
    id: 'aud-002',
    userId: 'user-1',
    title: 'Hindi Customer Welcome Note',
    textPreview: 'वाणी स्टूडियो में आपका स्वागत है। अब आप एक बार अपनी आवाज़ रिकॉर्ड करके किसी भी भारतीय भाषा में बोल सकते हैं।',
    languageCode: 'hi-IN',
    languageName: 'Hindi',
    voiceMode: 'standard',
    voiceLabel: 'Timbre Nalini',
    durationSeconds: 14,
    fileSizeBytes: 1344000,
    createdAt: '2026-11-03T15:00:00.000Z',
  },
  {
    id: 'aud-003',
    userId: 'user-1',
    title: 'English Accessibility Audio Briefing',
    textPreview: 'Welcome to VAANI. This audio was generated using your personalized voice profile powered by Gnani AI Timbre.',
    languageCode: 'en-IN',
    languageName: 'Indian English',
    voiceMode: 'personal',
    voiceLabel: 'Enrolled Voice (Aman)',
    durationSeconds: 9,
    fileSizeBytes: 864000,
    createdAt: '2026-11-02T18:00:00.000Z',
  },
]

export function App() {
  const [voiceStatus, setVoiceStatus] = useState<VoiceEnrollmentState>('NOT_ENROLLED')
  const [userEmail, setUserEmail] = useState<string>('aman@vaani.ai')
  const [libraryAudios, setLibraryAudios] = useState<AudioAsset[]>(INITIAL_AUDIOS)

  const isVoiceActive = voiceStatus === 'READY'

  const refreshVoiceProfile = useCallback(async () => {
    try {
      const profile = await voiceApi.getProfile()
      if (profile && profile.status === 'READY' && profile.isReadyForSynthesis && profile.hasSpeakerEmbedding) {
        setVoiceStatus('READY')
      } else if (profile) {
        setVoiceStatus(profile.enrollmentStatus || (profile.status as VoiceEnrollmentState))
      } else {
        setVoiceStatus('NOT_ENROLLED')
      }
    } catch {
      setVoiceStatus('NOT_ENROLLED')
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    voiceApi
      .getProfile()
      .then((profile) => {
        if (!isMounted) return
        if (profile && profile.status === 'READY' && profile.isReadyForSynthesis && profile.hasSpeakerEmbedding) {
          setVoiceStatus('READY')
        } else if (profile) {
          setVoiceStatus(profile.enrollmentStatus || (profile.status as VoiceEnrollmentState))
        } else {
          setVoiceStatus('NOT_ENROLLED')
        }
      })
      .catch(() => {
        if (isMounted) setVoiceStatus('NOT_ENROLLED')
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleAudioGenerated = (newAudio: AudioAsset) => {
    setLibraryAudios((prev) => [newAudio, ...prev])
  }

  const handleVoiceStatusChange = (status: VoiceEnrollmentState | EnrollmentStatus) => {
    const norm =
      status === 'ready'
        ? 'READY'
        : status === 'not_enrolled'
        ? 'NOT_ENROLLED'
        : status === 'processing'
        ? 'EMBEDDING_PROCESSING'
        : status === 'failed'
        ? 'EMBEDDING_FAILED'
        : (status as VoiceEnrollmentState)
    setVoiceStatus(norm)
    refreshVoiceProfile()
  }

  const handleRevokeProfile = () => {
    setVoiceStatus('NOT_ENROLLED')
  }

  return (
    <AudioProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route element={<AppLayout hasVoiceProfile={isVoiceActive} voiceStatus={voiceStatus} userEmail={userEmail} />}>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth onLoginSuccess={(email) => setUserEmail(email)} />} />
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  hasVoiceProfile={isVoiceActive}
                  voiceStatus={voiceStatus}
                  recentAudios={libraryAudios}
                />
              }
            />
            <Route
              path="/voice-setup"
              element={
                <VoiceSetup
                  currentStatus={voiceStatus}
                  onStatusChange={handleVoiceStatusChange}
                />
              }
            />
            <Route
              path="/studio"
              element={
                <SpeechStudio
                  hasVoiceProfile={isVoiceActive}
                  voiceStatus={voiceStatus}
                  onAudioGenerated={handleAudioGenerated}
                />
              }
            />
            <Route
              path="/library"
              element={<AudioLibrary initialAudios={libraryAudios} />}
            />
            <Route
              path="/settings"
              element={
                <Settings
                  hasVoiceProfile={isVoiceActive}
                  voiceStatus={voiceStatus}
                  onRevokeProfile={handleRevokeProfile}
                />
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AudioProvider>
  )
}

export default App
