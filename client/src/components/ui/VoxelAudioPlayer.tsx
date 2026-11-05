/* oxlint-disable react/set-state-in-effect */
import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Download, Volume2, RotateCcw, Loader2, AlertCircle, RefreshCw, Check } from 'lucide-react'
import { BlockButton } from './BlockButton'
import { VoxelWaveform } from './VoxelWaveform'
import { CubeIllustration } from './CubeIllustration'
import { BlockBadge } from './BlockBadge'
import { formatDuration } from '../../lib/utils'
import { useAudioEngine } from '../../context/AudioContext'
import { audioApi } from '../../lib/api'

export interface VoxelAudioPlayerProps {
  assetId?: string
  title: string
  voiceLabel: string
  languageName: string
  durationSeconds?: number
  audioUrl?: string
  voiceMode?: 'personal' | 'standard'
  isActive?: boolean
  onStartPlayback?: () => void
  onDownload?: () => void
  onRequestSignedUrl?: (assetId: string) => Promise<{ signedUrl: string; audioUrl?: string; expiresAt?: string; durationMs?: number }>
}

export const VoxelAudioPlayer: React.FC<VoxelAudioPlayerProps> = ({
  assetId,
  title,
  voiceLabel,
  languageName,
  durationSeconds = 14,
  audioUrl,
  voiceMode = 'personal',
  isActive,
  onStartPlayback,
  onDownload,
  onRequestSignedUrl,
}) => {
  const { playUiSound } = useAudioEngine()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState<number>(durationSeconds || 14)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(audioUrl)
  const [urlExpiresAt, setUrlExpiresAt] = useState<number | null>(null)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Sync prop changes
  useEffect(() => {
    if (audioUrl) {
      setResolvedUrl(audioUrl)
      setPlaybackError(null)
    }
  }, [audioUrl])

  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setTotalDuration(durationSeconds)
    }
  }, [durationSeconds])

  // Mutual exclusion: pause if parent deactivates this player card
  useEffect(() => {
    if (isActive === false && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setIsPlaying(false)
    }
  }, [isActive, isPlaying])

  const handleTogglePlay = async () => {
    playUiSound('click')
    setPlaybackError(null)

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setIsPlaying(false)
      return
    }

    // Inform parent that this player is starting (stops others)
    onStartPlayback?.()

    let urlToPlay = resolvedUrl
    const isUrlExpired = urlExpiresAt ? Date.now() >= urlExpiresAt - 30000 : false

    if (!urlToPlay || isUrlExpired) {
      if (!assetId && !audioUrl) {
        setPlaybackError('No audio asset source available.')
        return
      }

      setIsLoadingUrl(true)
      try {
        if (onRequestSignedUrl && assetId) {
          const res = await onRequestSignedUrl(assetId)
          urlToPlay = res.signedUrl || res.audioUrl
          if (res.expiresAt) {
            setUrlExpiresAt(new Date(res.expiresAt).getTime())
          }
          if (res.durationMs && res.durationMs > 0) {
            setTotalDuration(Math.round(res.durationMs / 1000))
          }
        } else if (assetId) {
          const res = await audioApi.getSignedUrl(assetId)
          urlToPlay = res.signedUrl || res.audioUrl
          if (res.expiresAt) {
            setUrlExpiresAt(new Date(res.expiresAt).getTime())
          }
          if (res.durationMs && res.durationMs > 0) {
            setTotalDuration(Math.round(res.durationMs / 1000))
          }
        } else {
          urlToPlay = audioUrl
        }

        if (!urlToPlay) {
          throw new Error('Failed to retrieve playable audio URL from storage.')
        }

        setResolvedUrl(urlToPlay)
      } catch (err: any) {
        setIsLoadingUrl(false)
        setPlaybackError(err.message || 'Unable to secure playback token from storage.')
        return
      } finally {
        setIsLoadingUrl(false)
      }
    }

    if (audioRef.current) {
      if (audioRef.current.src !== urlToPlay) {
        audioRef.current.src = urlToPlay
        audioRef.current.load()
      }
      audioRef.current.playbackRate = playbackSpeed
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (playErr: any) {
        if (playErr.name === 'NotAllowedError') {
          setPlaybackError('Autoplay blocked. Press PLAY to enable audio.')
        } else {
          setPlaybackError(playErr.message || 'Audio playback failed.')
        }
        setIsPlaying(false)
      }
    }
  }

  const handleRefreshToken = async () => {
    playUiSound('click')
    setPlaybackError(null)
    setResolvedUrl(undefined)
    setUrlExpiresAt(null)
    await handleTogglePlay()
  }

  const resetAudio = () => {
    playUiSound('click')
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const cycleSpeed = () => {
    playUiSound('click')
    let nextSpeed = 1.0
    if (playbackSpeed === 1.0) nextSpeed = 1.15
    else if (playbackSpeed === 1.15) nextSpeed = 0.85
    else nextSpeed = 1.0

    setPlaybackSpeed(nextSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    playUiSound('click')
    const rect = e.currentTarget.getBoundingClientRect()
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const targetTime = clickRatio * totalDuration
    setCurrentTime(targetTime)
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime
    }
  }

  const handleDownload = async () => {
    playUiSound('click')
    if (onDownload) {
      onDownload()
      return
    }

    if (assetId) {
      setIsDownloading(true)
      try {
        await audioApi.downloadAudio(assetId, title)
        setDownloadSuccess(true)
        setTimeout(() => setDownloadSuccess(false), 2500)
      } catch (err: any) {
        setPlaybackError(err.message || 'Failed to download audio file.')
      } finally {
        setIsDownloading(false)
      }
      return
    }

    if (resolvedUrl) {
      setIsDownloading(true)
      try {
        const resp = await fetch(resolvedUrl)
        if (!resp.ok) throw new Error(`Download failed with status ${resp.status}`)
        const blob = await resp.blob()
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_')
        a.download = `${cleanTitle}.wav`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(objectUrl)
        setDownloadSuccess(true)
        setTimeout(() => setDownloadSuccess(false), 2500)
      } catch (err: any) {
        setPlaybackError(err.message || 'Failed to download audio file.')
      } finally {
        setIsDownloading(false)
      }
    }
  }

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div className="bg-[#171A1E] border-2 border-[#3D434A] p-4 shadow-voxel relative">
      {/* Real audio element for direct, reliable native browser playback */}
      <audio
        ref={audioRef}
        src={resolvedUrl}
        crossOrigin="anonymous"
        preload="metadata"
        onLoadedMetadata={() => {
          if (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
            setTotalDuration(Math.round(audioRef.current.duration))
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
          }
        }}
        onPlay={() => {
          setIsPlaying(true)
          setPlaybackError(null)
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={() => {
          const err = audioRef.current?.error
          let msg = 'Audio playback error.'
          if (err?.code === 1) msg = 'Playback aborted.'
          else if (err?.code === 2) msg = 'Network error during audio playback.'
          else if (err?.code === 3) msg = 'Audio decode error.'
          else if (err?.code === 4) msg = 'Signed URL expired or audio asset missing.'
          setPlaybackError(msg)
          setIsPlaying(false)
        }}
      />

      {/* Top pixel highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/10 pointer-events-none" />

      {/* Jukebox / Note Block Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-voxel-stone-dark/80">
        <div className="flex items-center gap-3 min-w-0">
          <CubeIllustration biome="sound" size={36} className="shrink-0" />
          <div className="min-w-0">
            <h4 className="text-sm font-pixel text-voxel-cloud truncate uppercase">{title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <BlockBadge
                variant={voiceMode === 'personal' ? 'emerald' : 'lapis'}
                size="sm"
              >
                {voiceLabel}
              </BlockBadge>
              <span className="text-[10px] font-mono text-voxel-sand font-semibold">
                [{languageName}]
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={cycleSpeed}
            className="px-2 py-1 bg-voxel-bedrock hover:bg-voxel-stone-dark text-[10px] font-pixel text-voxel-gold border-2 border-voxel-stone-dark block-pressable"
            title="Gnani Timbre Speed Step"
          >
            {playbackSpeed}x SPEED
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-1.5 bg-voxel-bedrock hover:bg-voxel-stone-dark text-voxel-cloud border-2 border-voxel-stone-dark block-pressable disabled:opacity-50"
            title="Download 48kHz WAV Block"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 text-voxel-gold animate-spin" />
            ) : downloadSuccess ? (
              <Check className="w-4 h-4 text-voxel-grass" />
            ) : (
              <Download className="w-4 h-4 text-voxel-grass" />
            )}
          </button>
        </div>
      </div>

      {/* Loading or Buffering Banner */}
      {isLoadingUrl && (
        <div className="bg-voxel-bedrock/90 border border-voxel-gold/60 p-2 my-2 flex items-center gap-2 text-[10px] font-mono text-voxel-gold">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>SECURING 15-MIN SIGNED PLAYBACK TOKEN FROM SUPABASE...</span>
        </div>
      )}

      {/* Playback Error Alert Banner */}
      {playbackError && (
        <div className="bg-[#2A1010] border-2 border-voxel-redstone p-2 my-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-voxel-redstone font-sans">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-mono">{playbackError}</span>
          </div>
          <button
            onClick={handleRefreshToken}
            className="px-2 py-1 bg-voxel-bedrock hover:bg-voxel-stone-dark text-[10px] font-pixel text-voxel-cloud border border-voxel-stone-dark flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="w-3 h-3 text-voxel-gold" /> RETRY
          </button>
        </div>
      )}

      {/* Waveform & Scrubber */}
      <div className="space-y-1.5 my-3">
        <div className="flex items-center justify-between text-[10px] font-mono text-voxel-stone-light">
          <span>TIME: {formatDuration(currentTime)}</span>
          {isBuffering && (
            <span className="text-voxel-gold flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> BUFFERING
            </span>
          )}
          <span>TOTAL: {formatDuration(totalDuration)}</span>
        </div>
        <div
          className="cursor-pointer bg-voxel-bedrock p-1 border-2 border-voxel-stone-dark/80 hover:border-voxel-gold transition-colors"
          onClick={handleSeek}
          title="Click to seek position"
        >
          <VoxelWaveform
            isPlaying={isPlaying}
            progressPercent={progressPercent}
            barCount={42}
            height={36}
            variant={voiceMode === 'personal' ? 'emerald' : 'gold'}
            className="w-full justify-between"
          />
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <BlockButton
            variant={isPlaying ? 'redstone' : 'primary'}
            size="sm"
            onClick={handleTogglePlay}
            disabled={isLoadingUrl}
            className="min-w-[70px] min-h-[34px]"
          >
            {isLoadingUrl ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> LOAD
              </span>
            ) : isPlaying ? (
              <span className="flex items-center gap-1">
                <Pause className="w-3.5 h-3.5" /> STOP
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Play className="w-3.5 h-3.5 fill-current" /> PLAY
              </span>
            )}
          </BlockButton>

          <button
            onClick={resetAudio}
            className="p-2 bg-voxel-bedrock hover:bg-voxel-stone-dark text-voxel-stone-light hover:text-white border-2 border-voxel-stone-dark block-pressable"
            title="Reset to 0:00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-voxel-stone-light">
          <Volume2 className="w-4 h-4 text-voxel-gold" />
          <span className="font-mono text-[10px] text-voxel-sand">48kHz TIMBRE PCM</span>
        </div>
      </div>
    </div>
  )
}

export const AudioPlayer = VoxelAudioPlayer
