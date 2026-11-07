/* oxlint-disable react/set-state-in-effect */
import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AudioProvider } from './context/AudioContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { Landing } from './pages/Landing'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { VoiceSetup } from './pages/VoiceSetup'
import { SpeechStudio } from './pages/SpeechStudio'
import { AudioLibrary } from './pages/AudioLibrary'
import { Settings } from './pages/Settings'
import type { AudioAsset, EnrollmentStatus, VoiceEnrollmentState } from './types'
import { voiceApi, audioApi } from './lib/api'

/**
 * Route protection wrapper: ensures only authenticated users can access private routes
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-voxel-stone-dark border-t-voxel-grass animate-spin" />
        <span className="font-pixel text-xs text-voxel-sand">LOADING VAULT SESSION...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth?mode=login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

/**
 * Public route wrapper for /auth: redirects already authenticated users directly to /dashboard
 */
function PublicAuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-voxel-stone-dark border-t-voxel-grass animate-spin" />
        <span className="font-pixel text-xs text-voxel-sand">VERIFYING SESSION...</span>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function AppContent() {
  const { isAuthenticated, user } = useAuth()
  const [voiceStatus, setVoiceStatus] = useState<VoiceEnrollmentState>('NOT_ENROLLED')
  const [userEmail, setUserEmail] = useState<string>('')
  const [libraryAudios, setLibraryAudios] = useState<AudioAsset[]>([])

  useEffect(() => {
    if (!isAuthenticated) {
      setLibraryAudios([])
      return
    }
    audioApi
      .list()
      .then((serverAudios) => {
        setLibraryAudios(serverAudios)
      })
      .catch((err) => {
        console.warn('[App] Could not fetch initial audio library:', err)
      })
  }, [isAuthenticated])

  const isVoiceActive = voiceStatus === 'READY'

  const refreshVoiceProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setVoiceStatus('NOT_ENROLLED')
      return
    }
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
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      setVoiceStatus('NOT_ENROLLED')
      return
    }
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
  }, [isAuthenticated])

  useEffect(() => {
    if (user?.email) {
      setUserEmail(user.email)
    }
  }, [user])

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
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <AppLayout
              hasVoiceProfile={isVoiceActive}
              voiceStatus={voiceStatus}
              userEmail={userEmail || user?.email}
            />
          }
        >
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route
            path="/auth"
            element={
              <PublicAuthRoute>
                <Auth onLoginSuccess={(email) => setUserEmail(email)} />
              </PublicAuthRoute>
            }
          />
          <Route path="/demo" element={<SpeechStudio isDemoMode={true} />} />

          {/* Authenticated Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard
                  hasVoiceProfile={isVoiceActive}
                  voiceStatus={voiceStatus}
                  recentAudios={libraryAudios}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/voice-setup"
            element={
              <ProtectedRoute>
                <VoiceSetup
                  currentStatus={voiceStatus}
                  onStatusChange={handleVoiceStatusChange}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/studio"
            element={
              <ProtectedRoute>
                <SpeechStudio
                  hasVoiceProfile={isVoiceActive}
                  voiceStatus={voiceStatus}
                  onAudioGenerated={handleAudioGenerated}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <AudioLibrary initialAudios={libraryAudios} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings
                  hasVoiceProfile={isVoiceActive}
                  voiceStatus={voiceStatus}
                  onRevokeProfile={handleRevokeProfile}
                />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export function App() {
  return (
    <AudioProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AudioProvider>
  )
}

export default App
