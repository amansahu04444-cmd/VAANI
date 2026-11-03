import React from 'react'

export interface VoiceCoreProps {
  status?: 'not_enrolled' | 'ready' | 'processing' | 'recording'
  isPlaying?: boolean
  isGenerating?: boolean
  hasSucceeded?: boolean
  size?: number
  label?: string
  className?: string
}

export const VoiceCore: React.FC<VoiceCoreProps> = ({
  status = 'ready',
  isPlaying = false,
  isGenerating = false,
  hasSucceeded = false,
  size = 80,
  label,
  className,
}) => {
  const isInactive = status === 'not_enrolled'
  const isBusy = isGenerating || status === 'processing'
  const isRecording = status === 'recording'

  // Determine core face colors
  const topColor = isInactive
    ? '#777C80'
    : isRecording
    ? '#FF5E5E'
    : isBusy
    ? '#F5D547'
    : '#73E673'

  const leftColor = isInactive
    ? '#5A616A'
    : isRecording
    ? '#E03E3E'
    : isBusy
    ? '#D1B02B'
    : '#55C755'

  const rightColor = isInactive
    ? '#3D434A'
    : isRecording
    ? '#A82525'
    : isBusy
    ? '#8C7314'
    : '#389A38'

  const glowShadow = isInactive
    ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
    : isRecording
    ? 'drop-shadow(0 0 16px rgba(224,62,62,0.65))'
    : isBusy
    ? 'drop-shadow(0 0 20px rgba(245,213,71,0.7))'
    : 'drop-shadow(0 0 16px rgba(85,199,85,0.55))'

  return (
    <div className={`relative inline-flex flex-col items-center justify-center select-none ${className || ''}`}>
      {/* 1. Ambient Background Pulse */}
      {!isInactive && (
        <div
          className={`absolute inset-0 rounded-full blur-xl pointer-events-none transition-all duration-300 ${
            isRecording
              ? 'bg-voxel-redstone/30 animate-pulse'
              : isBusy
              ? 'bg-voxel-gold/35 animate-spin'
              : 'bg-voxel-grass/25 animate-pulse-voxel'
          }`}
        />
      )}

      {/* 2. Completion Flash Ring */}
      {hasSucceeded && (
        <div className="absolute inset-0 -m-4 border-4 border-voxel-gold rounded-full animate-ping pointer-events-none" />
      )}

      {/* 3. Rotating Voxel Ring during Generation / Processing */}
      {isBusy && (
        <div
          className="absolute inset-0 -m-4 border-2 border-dashed border-voxel-gold animate-spin pointer-events-none"
          style={{ animationDuration: '4s' }}
        >
          {/* Orbiting Gold Voxel Blocks */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-voxel-gold border border-voxel-bedrock shadow-[0_0_8px_#F5D547]" />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-voxel-gold border border-voxel-bedrock shadow-[0_0_8px_#F5D547]" />
        </div>
      )}

      {/* 4. The 3D Isometric Voxel Cube */}
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          filter: glowShadow,
        }}
        className={`relative transition-transform duration-200 ${
          isBusy ? 'scale-105' : isPlaying ? 'scale-105' : 'hover:scale-105'
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full pixelated"
        >
          {/* Top Face */}
          <path
            d="M50 5 L96 28 L50 52 L4 28 Z"
            fill={topColor}
            stroke="#101316"
            strokeWidth="3"
          />

          {/* Sound aperture on top face */}
          <path
            d="M50 20 L68 30 L50 40 L32 30 Z"
            fill="#101316"
            stroke={isInactive ? '#5A616A' : '#FFE5E5'}
            strokeWidth="1.5"
          />

          {/* Left Face */}
          <path
            d="M4 28 L50 52 L50 95 L4 71 Z"
            fill={leftColor}
            stroke="#101316"
            strokeWidth="3"
          />

          {/* Acoustic grille on left face */}
          <rect x="16" y="44" width="8" height="28" fill="#101316" opacity="0.65" />
          <rect x="28" y="50" width="8" height="28" fill="#101316" opacity="0.65" />

          {/* Right Face */}
          <path
            d="M50 52 L96 28 L96 71 L50 95 Z"
            fill={rightColor}
            stroke="#101316"
            strokeWidth="3"
          />

          {/* Acoustic grille on right face */}
          <rect x="64" y="50" width="8" height="28" fill="#101316" opacity="0.75" />
          <rect x="76" y="44" width="8" height="28" fill="#101316" opacity="0.75" />
        </svg>

        {/* 5. Mini Audio-Reactive Waveform during playback */}
        {isPlaying && (
          <div className="absolute inset-x-2 bottom-3 flex items-end justify-center gap-1 h-5 pointer-events-none">
            <div className="w-1.5 bg-voxel-gold animate-waveform h-4" />
            <div className="w-1.5 bg-voxel-grass animate-waveform h-6" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 bg-voxel-emerald animate-waveform h-3" style={{ animationDelay: '0.4s' }} />
            <div className="w-1.5 bg-voxel-gold animate-waveform h-5" style={{ animationDelay: '0.1s' }} />
          </div>
        )}
      </div>

      {/* Status Label Tag */}
      {label && (
        <span
          className={`mt-2 text-[9px] font-pixel tracking-wider uppercase px-2 py-0.5 border ${
            isInactive
              ? 'bg-[#181B1E] border-voxel-stone-dark text-voxel-stone-light'
              : isRecording
              ? 'bg-[#2E1010] border-voxel-redstone text-voxel-redstone shadow-[0_0_8px_rgba(224,62,62,0.5)]'
              : isBusy
              ? 'bg-[#2E2810] border-voxel-gold text-voxel-gold shadow-[0_0_8px_rgba(245,213,71,0.4)]'
              : 'bg-[#122A16] border-voxel-grass text-voxel-grass shadow-[0_0_8px_rgba(103,169,75,0.4)]'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  )
}

