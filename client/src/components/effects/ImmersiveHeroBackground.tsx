import React, { useEffect, useRef } from 'react'
import { AmbientLighting } from './AmbientLighting'
import { AudioHalo, type AudioHaloHandle } from './AudioHalo'
import { CinematicParticleField } from './CinematicParticleField'
import { ParticleEngine } from './ParticleEngine'
import { useAudioEngine } from '../../context/AudioContext'

export interface ImmersiveHeroBackgroundProps {
  className?: string
  isGenerating?: boolean
}

export const ImmersiveHeroBackground: React.FC<ImmersiveHeroBackgroundProps> = ({
  className,
  isGenerating = false,
}) => {
  const { isAmbientPlaying, getFrequencyData } = useAudioEngine()

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const haloRef = useRef<AudioHaloHandle>(null)

  const engineRef = useRef<ParticleEngine | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const freqArrayRef = useRef(new Uint8Array(64))

  // 3D Perspective Tilt for Audio Halo (managed in refs for zero React re-renders)
  const targetTiltXRef = useRef(0)
  const targetTiltYRef = useRef(0)
  const currTiltXRef = useRef(0)
  const currTiltYRef = useRef(0)
  const currScaleRef = useRef(1.0)
  const haloPhaseRef = useRef(0)

  // Scroll-reactive horizontal translation & progress (managed in refs)
  const targetScrollProgressRef = useRef(0)
  const currScrollProgressRef = useRef(0)
  const currHaloXRef = useRef(0)

  const isLiveRef = useRef(isAmbientPlaying || isGenerating)
  const smoothBassRef = useRef(0)
  const smoothMidRef = useRef(0)
  const smoothTrebleRef = useRef(0)

  useEffect(() => {
    isLiveRef.current = isAmbientPlaying || isGenerating
  }, [isAmbientPlaying, isGenerating])

  useEffect(() => {
    const canvas = canvasRef.current
    const heroEl = rootRef.current?.parentElement || rootRef.current
    if (!canvas || !heroEl) return

    // 1. Initialize Particle Engine
    const engine = new ParticleEngine()
    engine.init(canvas, heroEl)
    engineRef.current = engine

    // 2. Accessibility & Touch Detection
    const touchQuery = window.matchMedia('(pointer: coarse)')
    const hoverQuery = window.matchMedia('(hover: hover)')
    const isTouch = touchQuery.matches || !hoverQuery.matches

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Helper: Compute travel amplitude based on hero width
    const getTravelAmplitude = (w: number, isReducedMotion: boolean): number => {
      if (isReducedMotion) return 0
      if (w < 768) {
        return Math.min(75, Math.max(35, w * 0.14)) // Mobile: compact displacement
      }
      if (w < 1024) {
        return Math.min(180, Math.max(110, w * 0.20)) // Tablet: moderate displacement
      }
      return Math.min(360, Math.max(220, w * 0.28)) // Desktop: full cinematic sweep
    }

    // Helper: Compute normalized hero scroll progress (0.0 to 1.0)
    const computeProgress = (): number => {
      const heroRect = heroEl.getBoundingClientRect()
      const heroHeight = heroEl.offsetHeight || 550
      const scrollDistance = -heroRect.top
      const maxScroll = Math.max(200, heroHeight * 0.75)
      return Math.min(1.0, Math.max(0, scrollDistance / maxScroll))
    }

    // Initial state setup: situated at left side on initial page open
    const initialProgress = computeProgress()
    targetScrollProgressRef.current = initialProgress
    currScrollProgressRef.current = initialProgress

    const initialWidth = heroEl.getBoundingClientRect().width || window.innerWidth
    const initialTravel = getTravelAmplitude(initialWidth, motionQuery.matches)
    // Progress 0.0 -> normProgress = -1.0 (Left)
    const initialNorm = (initialProgress - 0.5) * 2
    currHaloXRef.current = initialNorm * initialTravel

    // 3. Shared Single Pointer Listener for Particles + Audio Halo Tilt
    const handlePointerMove = (e: PointerEvent) => {
      if (isTouch || motionQuery.matches) return
      const rect = heroEl.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const relX = e.clientX - rect.left
      const relY = e.clientY - rect.top

      // Update particle physics
      engine.setPointer(relX, relY)

      // Calculate 3D perspective tilt
      const centerX = rect.width / 2
      const centerY = rect.height * 0.35
      const normX = (relX - centerX) / (rect.width / 2)
      const normY = (relY - centerY) / (rect.height / 2)

      // Maximum 6-degree subtle interactive 3D tilt
      targetTiltYRef.current = Math.max(-6, Math.min(6, normX * 6))
      targetTiltXRef.current = Math.max(-6, Math.min(6, -normY * 6))
    }

    const handlePointerLeave = () => {
      engine.clearPointer()
      targetTiltXRef.current = 0
      targetTiltYRef.current = 0
    }

    const handlePointerEnter = (e: PointerEvent) => {
      if (isTouch || motionQuery.matches) return
      handlePointerMove(e)
    }

    if (!isTouch) {
      heroEl.addEventListener('pointermove', handlePointerMove as EventListener, { passive: true })
      heroEl.addEventListener('pointerleave', handlePointerLeave as EventListener, { passive: true })
      heroEl.addEventListener('pointerenter', handlePointerEnter as EventListener, { passive: true })
    }

    // 4. Passive Scroll Listener: measures normalized progress relative to hero height
    const handleScroll = () => {
      targetScrollProgressRef.current = computeProgress()
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    // 5. ResizeObserver for Adaptive Geometry
    const resizeObserver = new ResizeObserver(() => {
      engine.resize(heroEl)
      handleScroll()
    })
    resizeObserver.observe(heroEl)

    // 6. Coordinated 60 FPS Render Loop (Single Loop for Particles + Audio Halo)
    const renderLoop = () => {
      const isLive = isLiveRef.current
      const isReduced = motionQuery.matches

      // Damped scroll progress interpolation (settles smoothly with cubic easing)
      currScrollProgressRef.current +=
        (targetScrollProgressRef.current - currScrollProgressRef.current) * 0.08
      const p = isReduced ? 0 : currScrollProgressRef.current

      // Calculate responsive horizontal displacement
      const heroRect = heroEl.getBoundingClientRect()
      const heroWidth = heroRect.width || window.innerWidth
      const travelAmp = getTravelAmplitude(heroWidth, isReduced)

      // Horizontal coordinate mapping:
      // At p = 0.00: norm = -1.0 (Left side of hero)
      // At p = 0.25: norm = -0.5 (Center-left)
      // At p = 0.50: norm =  0.0 (Center)
      // At p = 0.75: norm = +0.5 (Right-center)
      // At p = 1.00: norm = +1.0 (Right side of hero)
      const normProgress = (p - 0.5) * 2
      const targetHaloX = isReduced ? 0 : normProgress * travelAmp

      // Smooth horizontal travel interpolation
      currHaloXRef.current += (targetHaloX - currHaloXRef.current) * 0.08
      const curX = currHaloXRef.current
      const layerParallax = travelAmp > 0 ? Math.max(-1, Math.min(1, curX / travelAmp)) : 0

      // A. Fetch real FFT frequency spectrum
      let targetBass = 0
      let targetMid = 0
      let targetTreble = 0

      if (isLive) {
        getFrequencyData(freqArrayRef.current)
        const arr = freqArrayRef.current

        // Bass bins (1-6)
        let bSum = 0
        for (let i = 1; i <= 6; i++) bSum += arr[i] || 0
        targetBass = bSum / 6 / 255

        // Midrange bins (7-20)
        let mSum = 0
        for (let i = 7; i <= 20; i++) mSum += arr[i] || 0
        targetMid = mSum / 14 / 255

        // Treble bins (21-48)
        let tSum = 0
        for (let i = 21; i <= 48; i++) tSum += arr[i] || 0
        targetTreble = tSum / 28 / 255
      }

      // Smooth exponential audio smoothing
      const lerpSpeed = isLive ? 0.08 : 0.03
      smoothBassRef.current += (targetBass - smoothBassRef.current) * lerpSpeed
      smoothMidRef.current += (targetMid - smoothMidRef.current) * lerpSpeed
      smoothTrebleRef.current += (targetTreble - smoothTrebleRef.current) * lerpSpeed

      const bass = smoothBassRef.current
      const mid = smoothMidRef.current
      const treble = smoothTrebleRef.current

      // B. Update & Draw Particles
      engine.setAudioEnergy(bass, mid, treble)
      engine.update()
      engine.draw()

      // C. Update Audio Halo (Horizontal Travel, 3D Perspective Tilt & Multi-Layer Parallax)
      if (haloRef.current) {
        currTiltXRef.current += (targetTiltXRef.current - currTiltXRef.current) * 0.1
        currTiltYRef.current += (targetTiltYRef.current - currTiltYRef.current) * 0.1

        haloPhaseRef.current += 0.02
        const breathing = Math.sin(haloPhaseRef.current) * 0.015
        const targetScale = 1.0 + bass * 0.05 + breathing
        currScaleRef.current += (targetScale - currScaleRef.current) * 0.1

        // 3D Perspective Tilt: subtle banking and forward tilt during transit
        const scrollTiltY = isReduced ? 0 : layerParallax * 4.0
        const scrollTiltX = isReduced ? 0 : Math.sin(p * Math.PI) * -3.0
        const scrollRotation = isReduced ? 0 : layerParallax * 7.0
        const scrollTranslateY = isReduced ? 0 : Math.sin(p * Math.PI) * -16.0
        const scrollScale = isReduced ? 1.0 : 1.0 - p * 0.06

        const totalTiltX = currTiltXRef.current + scrollTiltX
        const totalTiltY = currTiltYRef.current + scrollTiltY
        const totalRotation = scrollRotation
        const totalTranslateY = scrollTranslateY
        const totalScale = scrollScale * currScaleRef.current

        haloRef.current.updateTransform({
          translateX: curX,
          translateY: totalTranslateY,
          tiltX: totalTiltX,
          tiltY: totalTiltY,
          rotation: totalRotation,
          scale: totalScale,
          layerParallax,
        })
      }

      animFrameRef.current = requestAnimationFrame(renderLoop)
    }

    // 7. Tab Visibility Auto-Pause
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

    // Cleanup on unmount
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('scroll', handleScroll)

      if (!isTouch) {
        heroEl.removeEventListener('pointermove', handlePointerMove as EventListener)
        heroEl.removeEventListener('pointerleave', handlePointerLeave as EventListener)
        heroEl.removeEventListener('pointerenter', handlePointerEnter as EventListener)
      }

      resizeObserver.disconnect()
      engine.destroy()
    }
  }, [getFrequencyData])

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0 ${
        className || ''
      }`}
    >
      {/* Layer 1: Ambient Lighting with Slow Drift */}
      <AmbientLighting intensityMultiplier={isAmbientPlaying ? 1.15 : 0.95} />

      {/* Layer 2: Concentric Audio Halo (Horizontal Scroll Travel & 3D Layer Parallax) */}
      <AudioHalo ref={haloRef} />

      {/* Layer 3: 3-Layer Canvas Particle Field */}
      <CinematicParticleField ref={canvasRef} />
    </div>
  )
}
