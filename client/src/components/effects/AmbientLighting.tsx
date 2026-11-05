import React from 'react'

export interface AmbientLightingProps {
  className?: string
  intensityMultiplier?: number
}

export const AmbientLighting: React.FC<AmbientLightingProps> = ({
  className,
  intensityMultiplier = 1.0,
}) => {
  return (
    <div
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none bg-[#0B0D10] z-0 ${
        className || ''
      }`}
    >
      {/* 1. Primary Central-Top Emerald Radial Illumination */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000 animate-pulse-slow"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 26%, rgba(103, 169, 75, 0.18) 0%, rgba(40, 92, 53, 0.08) 48%, transparent 75%)',
          opacity: 0.9 * intensityMultiplier,
        }}
      />

      {/* 2. Left-Flank Deep Forest Ambient Light Source */}
      <div
        className="absolute inset-0 pointer-events-none animate-ambient-drift"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 18% 68%, rgba(40, 92, 53, 0.15) 0%, rgba(20, 50, 28, 0.05) 50%, transparent 70%)',
          opacity: 0.85 * intensityMultiplier,
        }}
      />

      {/* 3. Right-Flank Warm Gold Accent Highlight */}
      <div
        className="absolute inset-0 pointer-events-none animate-[ambientDriftSlow_22s_ease-in-out_infinite_reverse]"
        style={{
          background:
            'radial-gradient(ellipse 45% 35% at 82% 42%, rgba(245, 213, 71, 0.08) 0%, rgba(209, 176, 43, 0.02) 45%, transparent 65%)',
          opacity: 0.8 * intensityMultiplier,
        }}
      />

      {/* 4. Atmospheric Horizon Fade - Seamlessly melts into page body (#14171A) */}
      <div
        className="absolute inset-x-0 bottom-0 h-56 sm:h-72 pointer-events-none z-[1]"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(11, 13, 16, 0.2) 20%, rgba(16, 19, 23, 0.6) 50%, rgba(20, 23, 26, 0.9) 78%, #14171A 100%)',
        }}
      />
    </div>
  )
}

