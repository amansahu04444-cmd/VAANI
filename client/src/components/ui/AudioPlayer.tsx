import React, { useState, useEffect } from 'react'
import { Play, Pause, Download, Volume2, RotateCcw } from 'lucide-react'
import { Button } from './Button'
import { AudioWaveform } from './AudioWaveform'
import { formatDuration } from '../../lib/utils'

export interface AudioPlayerProps {
  title: string
  voiceLabel: string
  languageName: string
  durationSeconds?: number
  audioUrl?: string
  onDownload?: () => void
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  title,
  voiceLabel,
  languageName,
  durationSeconds = 14,
  onDownload,
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
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
    return () => clearInterval(interval)
  }, [isPlaying, durationSeconds, playbackSpeed])

  const togglePlay = () => setIsPlaying(!isPlaying)
  const resetAudio = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const cycleSpeed = () => {
    if (playbackSpeed === 1.0) setPlaybackSpeed(1.15)
    else if (playbackSpeed === 1.15) setPlaybackSpeed(0.85)
    else setPlaybackSpeed(1.0)
  }

  const progressPercent = (currentTime / durationSeconds) * 100

  return (
    <div className="bg-studio-900 border border-studio-700 rounded-xl p-4 shadow-lg space-y-3">
      {/* Track Header */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-studio-800">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">{title}</h4>
          <p className="text-[11px] text-studio-400 flex items-center gap-2 mt-0.5">
            <span className="text-teal-soft font-medium">{voiceLabel}</span>
            <span>•</span>
            <span>{languageName}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleSpeed}
            className="text-xs font-mono text-studio-300 hover:text-white px-2"
            title="Gnani Timbre Speed"
          >
            {playbackSpeed}x
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload || (() => alert('Downloading audio file (WAV)...'))}
            className="text-studio-300 hover:text-white p-1.5"
            title="Download Audio"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Waveform & Scrubbing */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-studio-400">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(durationSeconds)}</span>
        </div>
        <div
          className="relative bg-studio-800 rounded-lg p-1.5 cursor-pointer hover:bg-studio-750 transition-colors"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickPos = (e.clientX - rect.left) / rect.width
            setCurrentTime(clickPos * durationSeconds)
          }}
        >
          <AudioWaveform
            isPlaying={isPlaying}
            progressPercent={progressPercent}
            barCount={42}
            className="w-full justify-between"
          />
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={togglePlay}
            className="w-9 h-9 p-0 rounded-full flex items-center justify-center shadow-teal-glow/30"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAudio}
            className="text-studio-400 hover:text-white p-1.5"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-studio-400">
          <Volume2 className="w-4 h-4 text-studio-500" />
          <span className="font-mono text-[11px] text-studio-400">48kHz PCM WAV</span>
        </div>
      </div>
    </div>
  )
}

