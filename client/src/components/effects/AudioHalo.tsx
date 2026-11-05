import React, { forwardRef } from 'react'

export interface AudioHaloProps {
  className?: string
}

export interface AudioHaloHandle {
  update: (
    tiltX: number,
    tiltY: number,
    bassEnergy: number,
    midEnergy: number,
    trebleEnergy: number
  ) => void
}

export const AudioHalo = forwardRef<HTMLDivElement, AudioHaloProps>(({ className }, ref) => {
  return (
    <div
      ref={ref}
      className={`absolute left-1/2 top-[32%] sm:top-[28%] -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-[2] transition-transform duration-75 will-change-transform ${
        className || ''
      }`}
      style={{
        width: 'min(92vw, 560px)',
        height: 'min(92vw, 560px)',
      }}
    >
      {/* 1. Subtle Radial Glow Core */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(103, 169, 75, 0.12) 0%, rgba(245, 213, 71, 0.04) 40%, transparent 70%)',
        }}
      />

      {/* 2. Concentric SVG Ring Hierarchy */}
      <svg
        viewBox="0 0 560 560"
        className="w-full h-full pointer-events-none overflow-visible"
      >
        <defs>
          <linearGradient id="haloEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4D8236" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#67A94B" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#88D169" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="haloGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D1B02B" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#F5D547" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#E6D2A5" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Ring 4: Outermost Delicate Aura Boundary (500px dia) */}
        <g className="animate-[spin_90s_linear_infinite_reverse] origin-[280px_280px]">
          <circle
            cx="280"
            cy="280"
            r="250"
            fill="none"
            stroke="#67A94B"
            strokeWidth="0.75"
            strokeDasharray="2 12"
            opacity="0.35"
          />
          {/* Faint accent micro-dots */}
          <rect x="278" y="28" width="4" height="4" fill="#F5D547" opacity="0.6" />
          <rect x="278" y="528" width="4" height="4" fill="#F5D547" opacity="0.6" />
        </g>

        {/* Ring 3: Outer Resonance Ring (400px dia) */}
        <g className="animate-[spin_65s_linear_infinite] origin-[280px_280px]">
          <circle
            cx="280"
            cy="280"
            r="200"
            fill="none"
            stroke="url(#haloEmeraldGrad)"
            strokeWidth="1.2"
            strokeDasharray="16 20"
            opacity="0.55"
          />
          {/* Emerald orbiting nodes */}
          <circle cx="80" cy="280" r="2.5" fill="#67A94B" />
          <circle cx="480" cy="280" r="2.5" fill="#67A94B" />
        </g>

        {/* Ring 2: Mid Harmonic Core Ring with Golden Voxel Nodes (300px dia) */}
        <g className="animate-[spin_45s_linear_infinite_reverse] origin-[280px_280px]">
          <circle
            cx="280"
            cy="280"
            r="150"
            fill="none"
            stroke="url(#haloGoldGrad)"
            strokeWidth="1.5"
            opacity="0.65"
          />
          {/* Micro-voxel gold beads (Minecraft identity) */}
          <rect x="278" y="128" width="4" height="4" fill="#F5D547" />
          <rect x="428" y="278" width="4" height="4" fill="#F5D547" />
          <rect x="278" y="428" width="4" height="4" fill="#F5D547" />
          <rect x="128" y="278" width="4" height="4" fill="#F5D547" />
        </g>

        {/* Ring 1: Inner Core Pulse Ring (200px dia) */}
        <g className="animate-[spin_32s_linear_infinite] origin-[280px_280px]">
          <circle
            cx="280"
            cy="280"
            r="100"
            fill="none"
            stroke="#67A94B"
            strokeWidth="1"
            strokeDasharray="6 8"
            opacity="0.75"
          />
          <circle cx="280" cy="180" r="2" fill="#88D169" />
          <circle cx="280" cy="380" r="2" fill="#88D169" />
        </g>
      </svg>
    </div>
  )
})

AudioHalo.displayName = 'AudioHalo'
