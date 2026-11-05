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

    // 4. ResizeObserver for Adaptive Particle Density
    const resizeObserver = new ResizeObserver(() => {
      engine.resize(heroEl)
    })
    resizeObserver.observe(heroEl)

    // 5. Coordinated 60 FPS Render Loop (Single Loop for Particles + Audio Halo)
    const renderLoop = () => {
      const isLive = isLiveRef.current

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

      // C. Update Audio Halo (3D Perspective Tilt & Pulse)
      if (haloRef.current) {
        currTiltXRef.current += (targetTiltXRef.current - currTiltXRef.current) * 0.1
        currTiltYRef.current += (targetTiltYRef.current - currTiltYRef.current) * 0.1

        haloPhaseRef.current += 0.02
        const breathing = Math.sin(haloPhaseRef.current) * 0.015
        const targetScale = 1.0 + bass * 0.06 + breathing
        currScaleRef.current += (targetScale - currScaleRef.current) * 0.1

        const tiltX = currTiltXRef.current.toFixed(2)
        const tiltY = currTiltYRef.current.toFixed(2)
        const scale = currScaleRef.current.toFixed(3)

        haloRef.current.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${scale})`
      }

      animFrameRef.current = requestAnimationFrame(renderLoop)
    }

    // 6. Tab Visibility Auto-Pause
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
