import React from 'react'
import { cn } from '../../lib/utils'

export interface VoxelWaveformProps {
  isPlaying?: boolean
  isRecording?: boolean
  barCount?: number
  className?: string
  progressPercent?: number
  height?: number
  variant?: 'grass' | 'emerald' | 'gold' | 'redstone'
}

export const VoxelWaveform: React.FC<VoxelWaveformProps> = ({
  isPlaying = false,
  isRecording = false,
  barCount = 28,
  className,
  progressPercent = 0,
  height = 40,
  variant = 'emerald',
}) => {
  // Deterministic heights for aesthetic block equalizer display
  const bars = Array.from({ length: barCount }, (_, i) => {
    const seed = Math.sin(i * 0.45) * 0.5 + 0.5
    // Quantize into discrete 4px voxel steps (8, 12, 16, 20, 24, 28, 32, 36)
    const baseHeight = Math.floor((seed * (height - 8)) / 4) * 4 + 8
    return baseHeight
  })

  const getBarColor = (isPassed: boolean) => {
    if (isRecording) {
      return 'bg-voxel-redstone border-voxel-redstone-dark shadow-[0_0_6px_rgba(224,62,62,0.6)]'
    }
    if (isPassed) {
      if (variant === 'gold') return 'bg-voxel-gold border-voxel-gold-dark shadow-[0_0_6px_rgba(245,213,71,0.5)]'
      if (variant === 'grass') return 'bg-voxel-grass border-voxel-forest'
      return 'bg-voxel-emerald border-voxel-forest-deep shadow-[0_0_6px_rgba(85,199,85,0.4)]'
    }
    return 'bg-voxel-stone-dark border-voxel-bedrock'
  }

  return (
    <div
      style={{ height: `${height}px` }}
      className={cn('flex items-end gap-[3px] select-none p-1 bg-voxel-bedrock/70 border border-voxel-stone-dark/50 shadow-voxel-inset', className)}
    >
      {bars.map((barHeight, idx) => {
        const isPassed = (idx / barCount) * 100 <= progressPercent
        const recHeight = Math.floor((Math.sin(idx * 0.75) * 0.5 + 0.5) * (height - 8) / 4) * 4 + 8
        const liveHeight = isRecording ? recHeight : barHeight

        return (
          <div
            key={idx}
            style={{
              height: isPlaying ? undefined : `${liveHeight}px`,
            }}
            className={cn(
              'w-[6px] border transition-all duration-100 flex-1',
              isPlaying ? 'animate-waveform' : '',
              getBarColor(isPassed)
            )}
          />
        )
      })}
    </div>
  )
}

// Keep backward compatibility
export const AudioWaveform = VoxelWaveform
