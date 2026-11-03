import React, { useState, useEffect, useRef } from 'react'
import { Play, Pause, Download, Volume2, RotateCcw } from 'lucide-react'
import { BlockButton } from './BlockButton'
import { VoxelWaveform } from './VoxelWaveform'
import { CubeIllustration } from './CubeIllustration'
import { BlockBadge } from './BlockBadge'
import { formatDuration } from '../../lib/utils'
import { useAudioEngine } from '../../context/AudioContext'

export interface VoxelAudioPlayerProps {
  title: string
  voiceLabel: string
  languageName: string
  durationSeconds?: number
  audioUrl?: string
  voiceMode?: 'personal' | 'standard'
  onDownload?: () => void
}

export const VoxelAudioPlayer: React.FC<VoxelAudioPlayerProps> = ({
  title,
  voiceLabel,
  languageName,
  durationSeconds = 14,
  audioUrl,
  voiceMode = 'personal',
  onDownload,
}) => {
  const { playUiSound, connectMediaElement } = useAudioEngine()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      connectMediaElement(audioRef.current)
    }
  }, [audioUrl, connectMediaElement])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && !audioUrl) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= durationSeconds) {
            setIsPlaying(false)
            return 0
          }
          return prev + 0.2 * playbackSpeed
        })
      }, 200)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, durationSeconds, playbackSpeed, audioUrl])

  const togglePlay = () => {
    playUiSound('click')
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.playbackRate = playbackSpeed
        audioRef.current.play().catch(() => {
          // Playback interrupted or user interaction policy
        })
        setIsPlaying(true)
      }
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  const resetAudio = () => {
    playUiSound('click')
    if (audioUrl && audioRef.current) {
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

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const progressPercent = (currentTime / (durationSeconds || 1)) * 100

  return (
    <div className="bg-[#171A1E] border-2 border-[#3D434A] p-4 shadow-voxel relative">
      {/* Hidden real audio element if URL provided */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleAudioEnded}
          preload="metadata"
        />
      )}

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
            onClick={onDownload || (() => alert('Downloading 48kHz WAV audio...'))}
            className="p-1.5 bg-voxel-bedrock hover:bg-voxel-stone-dark text-voxel-cloud border-2 border-voxel-stone-dark block-pressable"
            title="Download Audio Block"
          >
            <Download className="w-4 h-4 text-voxel-grass" />
          </button>
        </div>
      </div>

      {/* Waveform & Scrubber */}
      <div className="space-y-1.5 my-3">
        <div className="flex items-center justify-between text-[10px] font-mono text-voxel-stone-light">
          <span>TIME: {formatDuration(currentTime)}</span>
          <span>TOTAL: {formatDuration(durationSeconds)}</span>
        </div>
        <div
          className="cursor-pointer bg-voxel-bedrock p-1 border-2 border-voxel-stone-dark/80 hover:border-voxel-gold transition-colors"
          onClick={(e) => {
            playUiSound('click')
            const rect = e.currentTarget.getBoundingClientRect()
            const clickPos = (e.clientX - rect.left) / rect.width
            const targetTime = clickPos * durationSeconds
            setCurrentTime(targetTime)
            if (audioRef.current) {
              audioRef.current.currentTime = targetTime
            }
          }}
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
            onClick={togglePlay}
            className="min-w-[70px] min-h-[34px]"
          >
            {isPlaying ? (
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

