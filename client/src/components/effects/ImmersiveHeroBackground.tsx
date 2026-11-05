import React, { useEffect, useRef } from 'react'
import { AmbientLighting } from './AmbientLighting'
import { AudioHalo } from './AudioHalo'
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
  const haloRef = useRef<HTMLDivElement>(null)

  const engineRef = useRef<ParticleEngine | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const freqArrayRef = useRef(new Uint8Array(64))

  // 3D Perspective Tilt for Audio Halo (managed in refs for 60fps)
  const targetTiltXRef = useRef(0)
  const targetTiltYRef = useRef(0)
  const currTiltXRef = useRef(0)
  const currTiltYRef = useRef(0)
  const currScaleRef = useRef(1.0)
  const haloPhaseRef = useRef(0)

  // Scroll-reactive state (managed in refs for zero React re-renders)
  const targetScrollYRef = useRef(0)
  const currScrollYRef = useRef(0)

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
    const isReduced = motionQuery.matches

    // 3. Shared Single Pointer Listener for Particles + Audio Halo
    const handlePointerMove = (e: PointerEvent) => {
      if (isTouch || isReduced) return
      const rect = heroEl.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const relX = e.clientX - rect.left
      const relY = e.clientY - rect.top

      // Update particle physics
      engine.setPointer(relX, relY)

      // Calculate 3D perspective tilt for the Audio Halo
      const centerX = rect.width / 2
      const centerY = rect.height * 0.35
      const normX = (relX - centerX) / (rect.width / 2)
      const normY = (relY - centerY) / (rect.height / 2)

      // Maximum 8-degree subtle 3D tilt
      targetTiltYRef.current = Math.max(-8, Math.min(8, normX * 8))
      targetTiltXRef.current = Math.max(-8, Math.min(8, -normY * 8))
    }

    const handlePointerLeave = () => {
      engine.clearPointer()
      targetTiltXRef.current = 0
      targetTiltYRef.current = 0
    }

    const handlePointerEnter = (e: PointerEvent) => {
      if (isTouch || isReduced) return
      handlePointerMove(e)
    }

    if (!isTouch) {
      heroEl.addEventListener('pointermove', handlePointerMove as EventListener, { passive: true })
      heroEl.addEventListener('pointerleave', handlePointerLeave as EventListener, { passive: true })
      heroEl.addEventListener('pointerenter', handlePointerEnter as EventListener, { passive: true })
    }

    // 4. Passive Scroll Listener for Scroll-Linked Halo 3D Motion
    const handleScroll = () => {
      targetScrollYRef.current = window.scrollY || window.pageYOffset || 0
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    // 5. ResizeObserver for Adaptive Particle Density
    const resizeObserver = new ResizeObserver(() => {
      engine.resize(heroEl)
    })
    resizeObserver.observe(heroEl)

    // 6. Coordinated 60 FPS Render Loop (Single Loop for Particles + Audio Halo)
    const renderLoop = () => {
      const isLive = isLiveRef.current
      const isReduced = motionQuery.matches

      // Damped scroll interpolation (settles smoothly when scrolling stops)
      currScrollYRef.current += (targetScrollYRef.current - currScrollYRef.current) * 0.09

      const heroRect = heroEl.getBoundingClientRect()
      const heroHeight = heroEl.offsetHeight || 550
      const isMobile = heroRect.width < 768
      const isTablet = heroRect.width >= 768 && heroRect.width < 1024

      // Max scroll effect across the first 500px of page scroll
      const rawScrollProgress = Math.max(0, currScrollYRef.current / (heroHeight * 0.8))
      const scrollProgress = isReduced ? 0 : Math.min(1.0, rawScrollProgress)

      // Responsive scroll-reactive values:
      // Desktop: max rotation 24°, max translateY -38px, max tiltX -6°, scale reduction 0.12 (1.0 -> 0.88)
      // Tablet: max rotation 14°, max translateY -22px, max tiltX -3°, scale reduction 0.08 (1.0 -> 0.92)
      // Mobile: max rotation 6°, max translateY -10px, max tiltX 0°, scale reduction 0.05 (1.0 -> 0.95)
      const maxRotation = isMobile ? 6 : isTablet ? 14 : 24
      const maxTranslateY = isMobile ? -10 : isTablet ? -22 : -38
      const maxTiltX = isMobile ? 0 : isTablet ? -3 : -6
      const maxScaleReduction = isMobile ? 0.05 : isTablet ? 0.08 : 0.12

      const scrollRotation = scrollProgress * maxRotation
      const scrollTranslateY = scrollProgress * maxTranslateY
      const scrollTiltX = scrollProgress * maxTiltX
      const scrollScale = 1.0 - scrollProgress * maxScaleReduction

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

      // Smooth exponential smoothing (eliminates jitter)
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

      // C. Update Audio Halo (3D Perspective Tilt, Scroll Response & Audio Pulse)
      if (haloRef.current) {
        currTiltXRef.current += (targetTiltXRef.current - currTiltXRef.current) * 0.1
        currTiltYRef.current += (targetTiltYRef.current - currTiltYRef.current) * 0.1

        haloPhaseRef.current += 0.02
        const breathing = Math.sin(haloPhaseRef.current) * 0.015
        const targetScale = 1.0 + bass * 0.06 + breathing
        currScaleRef.current += (targetScale - currScaleRef.current) * 0.1

        const totalTiltX = (currTiltXRef.current + scrollTiltX).toFixed(2)
        const totalTiltY = currTiltYRef.current.toFixed(2)
        const totalRotation = scrollRotation.toFixed(2)
        const totalTranslateY = scrollTranslateY.toFixed(1)
        const totalScale = (scrollScale * currScaleRef.current).toFixed(3)

        haloRef.current.style.transform = `perspective(800px) translate3d(0, ${totalTranslateY}px, 0) rotateX(${totalTiltX}deg) rotateY(${totalTiltY}deg) rotateZ(${totalRotation}deg) scale(${totalScale})`
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
      {/* Layer 1: Ambient Lighting */}
      <AmbientLighting intensityMultiplier={isAmbientPlaying ? 1.15 : 0.95} />

      {/* Layer 2: Concentric Audio Halo (Behind Hero Heading) */}
      <AudioHalo ref={haloRef} />

      {/* Layer 3: 3-Layer Canvas Particle Field */}
      <CinematicParticleField ref={canvasRef} />
    </div>
  )
}

