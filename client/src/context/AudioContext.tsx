/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { audioEngine } from '../lib/audioEngine'

export interface AudioContextType {
  isAmbientPlaying: boolean
  ambientVolume: number
  isMuted: boolean
  uiSoundsEnabled: boolean
  toggleAmbient: () => void
  setVolume: (val: number) => void
  toggleMute: () => void
  toggleUiSounds: () => void
  playUiSound: (type: 'click' | 'success' | 'generate' | 'nav') => void
  connectMediaElement: (el: HTMLAudioElement) => void
  getFrequencyData: (arr: Uint8Array) => void
  getTimeDomainData: (arr: Uint8Array) => void
}

const AudioContext = createContext<AudioContextType | null>(null)

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false)
  const [ambientVolume, setAmbientVolumeState] = useState(0.35)
  const [isMuted, setIsMuted] = useState(false)
  const [uiSoundsEnabled, setUiSoundsEnabled] = useState(true)

  const toggleAmbient = useCallback(() => {
    if (audioEngine.isAmbientPlaying()) {
      audioEngine.stopAmbient()
      setIsAmbientPlaying(false)
    } else {
      audioEngine.startAmbient()
      setIsAmbientPlaying(true)
    }
  }, [])

  const setVolume = useCallback((val: number) => {
    audioEngine.setVolume(val)
    setAmbientVolumeState(val)
  }, [])

  const toggleMute = useCallback(() => {
    const muted = audioEngine.toggleMute()
    setIsMuted(muted)
  }, [])

  const toggleUiSounds = useCallback(() => {
    const enabled = audioEngine.toggleUiSounds()
    setUiSoundsEnabled(enabled)
  }, [])

  const playUiSound = useCallback((type: 'click' | 'success' | 'generate' | 'nav') => {
    audioEngine.playUiSound(type)
  }, [])

  const connectMediaElement = useCallback((el: HTMLAudioElement) => {
    audioEngine.connectMediaElement(el)
  }, [])

  const getFrequencyData = useCallback((arr: Uint8Array) => {
    audioEngine.getFrequencyData(arr)
  }, [])

  const getTimeDomainData = useCallback((arr: Uint8Array) => {
    audioEngine.getTimeDomainData(arr)
  }, [])

  const value = useMemo(
    () => ({
      isAmbientPlaying,
      ambientVolume,
      isMuted,
      uiSoundsEnabled,
      toggleAmbient,
      setVolume,
      toggleMute,
      toggleUiSounds,
      playUiSound,
      connectMediaElement,
      getFrequencyData,
      getTimeDomainData,
    }),
    [
      isAmbientPlaying,
      ambientVolume,
      isMuted,
      uiSoundsEnabled,
      toggleAmbient,
      setVolume,
      toggleMute,
      toggleUiSounds,
      playUiSound,
      connectMediaElement,
      getFrequencyData,
      getTimeDomainData,
    ]
  )

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

export const useAudioEngine = (): AudioContextType => {
  const ctx = useContext(AudioContext)
  if (!ctx) {
    throw new Error('useAudioEngine must be used within an AudioProvider')
  }
  return ctx
}
