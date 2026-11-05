import React, { forwardRef, useImperativeHandle, useRef } from 'react'

export interface AudioHaloProps {
  className?: string
}

export interface AudioHaloTransformParams {
  translateX: number // Horizontal translation in px relative to hero center
  translateY: number // Vertical translation in px
  tiltX: number // 3D Perspective tilt X in degrees
  tiltY: number // 3D Perspective tilt Y in degrees
  rotation: number // Subtle z-rotation in degrees
  scale: number // Audio energy scale + breathing
  layerParallax: number // Normalized horizontal displacement ratio (-1.0 to 1.0)
}

export interface AudioHaloHandle {
  updateTransform: (params: AudioHaloTransformParams) => void
  getElement: () => HTMLDivElement | null
}

export const AudioHalo = forwardRef<AudioHaloHandle, AudioHaloProps>(({ className }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const ringAuraRef = useRef<HTMLDivElement>(null)
  const ringResonanceRef = useRef<HTMLDivElement>(null)
  const ringGoldRef = useRef<HTMLDivElement>(null)
  const ringPulseRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(
    ref,
    () => ({
      updateTransform: ({
        translateX,
        translateY,
        tiltX,
        tiltY,
        rotation,
        scale,
        layerParallax,
      }) => {
        const container = containerRef.current
        if (!container) return

        // 1. Root Group Translation & Perspective Tilt
        container.style.transform = `perspective(1000px) translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) rotateZ(${rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`

        // 2. Multi-Layer 3D Depth & Optical Parallax
        // Outermost Aura (500px): moves slightly slower (lagging behind)
        if (ringAuraRef.current) {
          const auraOffset = -layerParallax * 22
          ringAuraRef.current.style.transform = `translate3d(${auraOffset.toFixed(1)}px, 0px, 0px)`
        }

        // Outer Resonance Ring (400px): moves slightly slower
        if (ringResonanceRef.current) {
          const resOffset = -layerParallax * 12
          ringResonanceRef.current.style.transform = `translate3d(${resOffset.toFixed(1)}px, 0px, 15px)`
        }

        // Mid Harmonic Gold Ring (300px): moves slightly faster
        if (ringGoldRef.current) {
          const goldOffset = layerParallax * 10
          ringGoldRef.current.style.transform = `translate3d(${goldOffset.toFixed(1)}px, 0px, 30px)`
        }

        // Inner Core Pulse Ring (200px): moves visibly faster (leading in 3D space)
        if (ringPulseRef.current) {
          const pulseOffset = layerParallax * 24
          ringPulseRef.current.style.transform = `translate3d(${pulseOffset.toFixed(1)}px, 0px, 45px)`
        }

        // Radial Glow Core: atmospheric depth lag
        if (glowRef.current) {
          const glowOffset = -layerParallax * 16
          glowRef.current.style.transform = `translate3d(${glowOffset.toFixed(1)}px, 0px, -20px)`
        }
      },
      getElement: () => containerRef.current,
    }),
    []
  )

  return (
    <div
      ref={containerRef}
      className={`absolute left-1/2 top-[32%] sm:top-[28%] -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-[2] will-change-transform ${
        className || ''
      }`}
      style={{
        width: 'min(92vw, 560px)',
        height: 'min(92vw, 560px)',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 1. Subtle Radial Glow Core (Layer 0, Z = -20px) */}
      <div
        ref={glowRef}
        className="absolute inset-0 rounded-full pointer-events-none will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(103, 169, 75, 0.14) 0%, rgba(245, 213, 71, 0.04) 40%, transparent 70%)',
          transformStyle: 'preserve-3d',
        }}
      />

      {/* SVG Definitions */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
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
      </svg>

      {/* Ring 4: Outermost Delicate Aura Boundary (500px dia, Z = 0px) */}
      <div
        ref={ringAuraRef}
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <svg viewBox="0 0 560 560" className="w-full h-full pointer-events-none overflow-visible">
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
            <rect x="278" y="28" width="4" height="4" fill="#F5D547" opacity="0.6" />
            <rect x="278" y="528" width="4" height="4" fill="#F5D547" opacity="0.6" />
          </g>
        </svg>
      </div>

      {/* Ring 3: Outer Resonance Ring (400px dia, Z = 15px) */}
      <div
        ref={ringResonanceRef}
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <svg viewBox="0 0 560 560" className="w-full h-full pointer-events-none overflow-visible">
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
            <circle cx="80" cy="280" r="2.5" fill="#67A94B" />
            <circle cx="480" cy="280" r="2.5" fill="#67A94B" />
          </g>
        </svg>
      </div>

      {/* Ring 2: Mid Harmonic Core Ring with Golden Voxel Nodes (300px dia, Z = 30px) */}
      <div
        ref={ringGoldRef}
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <svg viewBox="0 0 560 560" className="w-full h-full pointer-events-none overflow-visible">
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
        </svg>
      </div>

      {/* Ring 1: Inner Core Pulse Ring (200px dia, Z = 45px) */}
      <div
        ref={ringPulseRef}
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <svg viewBox="0 0 560 560" className="w-full h-full pointer-events-none overflow-visible">
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
    </div>
  )
})

AudioHalo.displayName = 'AudioHalo'
