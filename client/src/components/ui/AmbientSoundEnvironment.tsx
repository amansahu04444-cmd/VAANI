import React, { useEffect, useRef, useMemo } from 'react'
import { useAudioEngine } from '../../context/AudioContext'

export interface AmbientSoundEnvironmentProps {
  className?: string
  isGenerating?: boolean
}

/**
 * Catmull-Rom to Cubic Bezier path generator for ultra-smooth organic curves.
 * Zero kinks or angular steps.
 */
function generateSmoothCurvePath(
  points: Array<{ x: number; y: number }>,
  closeToBottom = true,
  canvasHeight = 520
): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2

    // Catmull-Rom to Cubic Bezier control points (tension = 0.5)
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }

  if (closeToBottom) {
    const lastX = points[points.length - 1].x
    d += ` L ${lastX.toFixed(1)} ${canvasHeight} L 0 ${canvasHeight} Z`
  }

  return d
}

export const AmbientSoundEnvironment: React.FC<AmbientSoundEnvironmentProps> = ({
  className,
  isGenerating = false,
}) => {
  const { isAmbientPlaying, getFrequencyData } = useAudioEngine()

  // Direct SVG element refs for 60fps manipulation WITHOUT triggering React state or re-renders
  const ribbon1Ref = useRef<SVGPathElement>(null)
  const ribbon2Ref = useRef<SVGPathElement>(null)
  const ribbon3Ref = useRef<SVGPathElement>(null)
  const radialGlowRef = useRef<HTMLDivElement>(null)

  // Audio frequency buffer & smoothed physics refs
  const freqArrayRef = useRef(new Uint8Array(64))
  const animFrameRef = useRef<number | null>(null)
  const isPlayingRef = useRef(isAmbientPlaying)
  const isGeneratingRef = useRef(isGenerating)

  // Mathematical wave phases & smooth interpolators
  const phase1Ref = useRef(0)
  const phase2Ref = useRef(1.8)
  const phase3Ref = useRef(3.4)

  const smoothBassRef = useRef(0)
  const smoothMidRef = useRef(0)
  const smoothTrebleRef = useRef(0)

  // Keep refs synchronized with props/context without restarting the animation loop
  useEffect(() => {
    isPlayingRef.current = isAmbientPlaying
  }, [isAmbientPlaying])

  useEffect(() => {
    isGeneratingRef.current = isGenerating
  }, [isGenerating])

  // Sparse particles with lightweight deterministic layout (only 8 particles total, half hidden on mobile)
  const sparseParticles = useMemo(
    () => [
      { id: 1, left: 10, top: 35, size: 3, dur: 7, del: 0, mobile: true },
      { id: 2, left: 24, top: 68, size: 2, dur: 9, del: 1.2, mobile: false },
      { id: 3, left: 38, top: 22, size: 3.5, dur: 8, del: 2.1, mobile: true },
      { id: 4, left: 52, top: 78, size: 2, dur: 10, del: 0.5, mobile: false },
      { id: 5, left: 68, top: 38, size: 3, dur: 7.5, del: 1.8, mobile: true },
      { id: 6, left: 82, top: 62, size: 2.5, dur: 8.5, del: 2.8, mobile: false },
      { id: 7, left: 91, top: 28, size: 3.5, dur: 9.5, del: 0.9, mobile: true },
      { id: 8, left: 16, top: 82, size: 2, dur: 11, del: 3.2, mobile: false },
    ],
    []
  )

  useEffect(() => {
    // 1. Accessibility: Detect prefers-reduced-motion query
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const totalWidth = 1440
    const canvasHeight = 520
    const numPoints = 22
    const stepX = totalWidth / (numPoints - 1)

    // Animation render loop
    const renderLoop = () => {
      const isLive = isPlayingRef.current || isGeneratingRef.current
      const isReducedMotion = reducedMotionQuery.matches

      // Fetch actual FFT frequency data from Web Audio AnalyserNode
      let targetBass = 0
      let targetMid = 0
      let targetTreble = 0

      if (isLive) {
        getFrequencyData(freqArrayRef.current)
        const arr = freqArrayRef.current

        // Bins 1-6: Bass / Fundamental
        let bSum = 0
        for (let i = 1; i <= 6; i++) bSum += arr[i] || 0
        targetBass = bSum / 6 / 255

        // Bins 7-20: Midrange / Vocal Harmonics
        let mSum = 0
        for (let i = 7; i <= 20; i++) mSum += arr[i] || 0
        targetMid = mSum / 14 / 255

        // Bins 21-48: Treble / Shimmer
        let tSum = 0
        for (let i = 21; i <= 48; i++) tSum += arr[i] || 0
        targetTreble = tSum / 28 / 255
      }

      // Smooth exponential interpolation to eliminate ANY jitter or stuttering
      const lerpSpeed = isLive ? 0.08 : 0.03
      smoothBassRef.current += (targetBass - smoothBassRef.current) * lerpSpeed
      smoothMidRef.current += (targetMid - smoothMidRef.current) * lerpSpeed
      smoothTrebleRef.current += (targetTreble - smoothTrebleRef.current) * lerpSpeed

      const bass = smoothBassRef.current
      const mid = smoothMidRef.current
      const treble = smoothTrebleRef.current

      // Phase progression (slowed to near static if reduced-motion)
      const speedMult = isReducedMotion ? 0.05 : isLive ? 1.25 : 0.75
      phase1Ref.current += 0.007 * speedMult
      phase2Ref.current += 0.012 * speedMult
      phase3Ref.current += 0.017 * speedMult

      const p1 = phase1Ref.current
      const p2 = phase2Ref.current
      const p3 = phase3Ref.current

      // Generate points for 3 distinct flowing soundwave ribbons
      const points1: Array<{ x: number; y: number }> = []
      const points2: Array<{ x: number; y: number }> = []
      const points3: Array<{ x: number; y: number }> = []

      for (let i = 0; i < numPoints; i++) {
        const x = i * stepX
        const norm = i / (numPoints - 1)

        // Ribbon 1 (Deep Forest / Back Layer - broad sweeping fundamental)
        const wave1A = Math.sin(p1 + norm * 3.8) * (28 + bass * 48)
        const wave1B = Math.cos(p1 * 0.7 + norm * 2.2) * 16
        const y1 = 280 + wave1A + wave1B
        points1.push({ x, y: y1 })

        // Ribbon 2 (Emerald / Mid Layer - primary vocal ribbon)
        const wave2A = Math.sin(p2 + norm * 5.2) * (32 + mid * 64)
        const wave2B = Math.sin(p2 * 1.3 + norm * 3.4) * 18
        const y2 = 250 + wave2A + wave2B
        points2.push({ x, y: y2 })

        // Ribbon 3 (Gold Accent / Fore Layer - delicate high-frequency harmonic filament)
        const wave3A = Math.cos(p3 + norm * 6.5) * (18 + treble * 38)
        const wave3B = Math.sin(p3 * 1.5 + norm * 4.2) * 14
        const y3 = 235 + wave3A + wave3B
        points3.push({ x, y: y3 })
      }

      // Convert point arrays into smooth cubic Bezier paths
      const d1 = generateSmoothCurvePath(points1, true, canvasHeight)
      const d2 = generateSmoothCurvePath(points2, true, canvasHeight)
      const d3 = generateSmoothCurvePath(points3, true, canvasHeight)

      // Direct DOM attribute mutation - ZERO React renders during 60 FPS animation
      if (ribbon1Ref.current) ribbon1Ref.current.setAttribute('d', d1)
      if (ribbon2Ref.current) ribbon2Ref.current.setAttribute('d', d2)
      if (ribbon3Ref.current) ribbon3Ref.current.setAttribute('d', d3)

      // Dynamic radial lighting reactivity
      if (radialGlowRef.current) {
        const glowOpacity = isLive ? 0.35 + mid * 0.45 : 0.16
        radialGlowRef.current.style.opacity = glowOpacity.toFixed(2)
      }

      animFrameRef.current = requestAnimationFrame(renderLoop)
    }

    // 2. Tab Visibility Management: Pause loop when tab is hidden to save CPU/battery
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = null
        }
      } else {
        if (!animFrameRef.current) {
          animFrameRef.current = requestAnimationFrame(renderLoop)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    animFrameRef.current = requestAnimationFrame(renderLoop)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [getFrequencyData])

  return (
    <div
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none bg-[#0B0D10] ${
        className || ''
      }`}
    >
      {/* 1. Base Layer: Deep Charcoal & Soft Radial Light Gradients */}
      <div
        ref={radialGlowRef}
        className="absolute inset-0 transition-opacity duration-700 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 85% 65% at 50% 28%, rgba(103, 169, 75, 0.28) 0%, rgba(245, 213, 71, 0.07) 38%, rgba(11, 13, 16, 0.95) 75%, #14171A 100%)',
          opacity: 0.18,
        }}
      />

      {/* 2. Multiple Smooth Flowing Soundwave Ribbons (Full-Width SVG) */}
      <svg
        viewBox="0 0 1440 520"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          {/* Ribbon 1: Deep Forest Green Atmospheric Gradient */}
          <linearGradient id="ribbon1Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#142B1A" stopOpacity="0.1" />
            <stop offset="30%" stopColor="#224E2B" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#285C35" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#142B1A" stopOpacity="0.1" />
          </linearGradient>

          {/* Ribbon 2: Emerald Primary Vocal Wave Gradient */}
          <linearGradient id="ribbon2Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#285C35" stopOpacity="0.15" />
            <stop offset="25%" stopColor="#4D8236" stopOpacity="0.65" />
            <stop offset="55%" stopColor="#67A94B" stopOpacity="0.75" />
            <stop offset="85%" stopColor="#4D8236" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1E3E25" stopOpacity="0.15" />
          </linearGradient>

          {/* Ribbon 2 Stroke Highlight */}
          <linearGradient id="ribbon2Stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4D8236" stopOpacity="0.2" />
            <stop offset="40%" stopColor="#67A94B" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#8AD16A" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#4D8236" stopOpacity="0.2" />
          </linearGradient>

          {/* Ribbon 3: Gold Shimmer Harmonic Filament Gradient */}
          <linearGradient id="ribbon3Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A68822" stopOpacity="0.05" />
            <stop offset="45%" stopColor="#F5D547" stopOpacity="0.4" />
            <stop offset="55%" stopColor="#F5D547" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#8C7314" stopOpacity="0.05" />
          </linearGradient>

          {/* Ribbon 3 Stroke Highlight */}
          <linearGradient id="ribbon3Stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8C7314" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#F5D547" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#D1B02B" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Depth Layer 1: Deep Forest Ribbon */}
        <path
          ref={ribbon1Ref}
          fill="url(#ribbon1Gradient)"
          className="transition-opacity duration-300 opacity-70"
        />

        {/* Depth Layer 2: Emerald Primary Vocal Ribbon */}
        <path
          ref={ribbon2Ref}
          fill="url(#ribbon2Gradient)"
          stroke="url(#ribbon2Stroke)"
          strokeWidth="2.5"
          className="transition-opacity duration-300 opacity-85"
        />

        {/* Depth Layer 3: Gold Harmonic Accent Ribbon */}
        <path
          ref={ribbon3Ref}
          fill="url(#ribbon3Gradient)"
          stroke="url(#ribbon3Stroke)"
          strokeWidth="1.8"
          className="transition-opacity duration-300 opacity-90"
        />
      </svg>

      {/* 3. Sparse Ambient Acoustic Light Motes (Pure CSS Compositor Animation) */}
      <div className="absolute inset-0 pointer-events-none">
        {sparseParticles.map((p) => (
          <div
            key={p.id}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.del}s`,
            }}
            className={`absolute bg-voxel-grass/40 shadow-[0_0_4px_#67A94B] animate-float-acoustic ${
              !p.mobile ? 'hidden sm:block' : ''
            }`}
          />
        ))}
      </div>

      {/* 4. Atmospheric Horizon Fade: Seamlessly blends wave bottom into page background */}
      <div
        className="absolute inset-x-0 bottom-0 h-36 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(20, 23, 26, 0.8) 60%, #14171A 100%)',
        }}
      />
    </div>
  )
}

