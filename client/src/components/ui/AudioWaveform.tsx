import React from 'react'
import { cn } from '../../lib/utils'

export interface AudioWaveformProps {
  isPlaying?: boolean
  isRecording?: boolean
  barCount?: number
  className?: string
  progressPercent?: number
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isPlaying = false,
  isRecording = false,
  barCount = 28,
  className,
  progressPercent = 0
}) => {
  // Generate deterministic heights for aesthetic audio waveform display
  const bars = Array.from({ length: barCount }, (_, i) => {
    const seed = Math.sin(i * 0.45) * 0.5 + 0.5
    const baseHeight = Math.floor(seed * 28) + 8
    return baseHeight
  })

  return (
    <div className={cn('flex items-center gap-[3px] h-10 px-2 py-1 select-none', className)}>
      {bars.map((height, idx) => {
        const isPassed = (idx / barCount) * 100 <= progressPercent
        const animatedHeight = isRecording
          ? `${Math.max(6, Math.floor(Math.sin(idx * 0.5) * 26 + 10))}px`
          : `${height}px`

        return (
          <div
            key={idx}
            style={{
              height: isPlaying ? undefined : animatedHeight,
            }}
            className={cn(
              'w-[3px] rounded-full transition-all duration-150',
              isPlaying ? 'animate-waveform' : '',
              isRecording
                ? 'bg-rose-500 animate-pulse'
                : isPassed
                ? 'bg-teal-accent'
                : 'bg-studio-700 hover:bg-studio-600'
            )}
          />
        )
      })}
    </div>
  )
}
