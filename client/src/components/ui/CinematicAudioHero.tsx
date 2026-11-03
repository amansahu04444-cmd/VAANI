import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Volume2, VolumeX, Sparkles, Radio } from 'lucide-react'
import { useAudioEngine } from '../../context/AudioContext'
import { BlockButton } from './BlockButton'
import { BlockBadge } from './BlockBadge'

export interface CinematicAudioHeroProps {
  className?: string
  isGenerating?: boolean
}

export const CinematicAudioHero: React.FC<CinematicAudioHeroProps> = ({
  className,
  isGenerating = false,
}) => {
  const {
    isAmbientPlaying,
    toggleAmbient,
    isMuted,
    toggleMute,
    getFrequencyData,
    playUiSound,
  } = useAudioEngine()

  const [activeFrequencies, setActiveFrequencies] = useState<number[]>(() => new Array(32).fill(12))
  const [svgPathPrimary, setSvgPathPrimary] = useState('')
  const [svgPathSecondary, setSvgPathSecondary] = useState('')
  const [peakDb, setPeakDb] = useState('-38 dB')

  const freqArrayRef = useRef(new Uint8Array(64))
  const animFrameRef = useRef<number | null>(null)
  const idlePhaseRef = useRef(0)

  // Subtle ambient floating dust particles in background
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: (i * 5.2 + 3) % 100,
      y: (i * 7.1 + 10) % 85,
      size: (i % 3) + 2,
      duration: (i % 4) + 6,
      delay: (i % 5) * 0.8,
    }))
  }, [])

  useEffect(() => {
    const barCount = 32
    const width = 800
    const height = 180
    const centerY = height / 2

    const renderLoop = () => {
      // 1. Fetch real frequency data from Web Audio AnalyserNode
      getFrequencyData(freqArrayRef.current)

      const isLive = isAmbientPlaying || isGenerating
      let totalEnergy = 0

      // Map frequency bins to 32 bars
      const nextBars: number[] = []
      for (let i = 0; i < barCount; i++) {
        let val: number
        if (isLive) {
          // Bin index mapped across 64 FFT bands with mid-range emphasis
          const binIndex = Math.min(63, Math.floor((i / barCount) * 48) + 1)
          const raw = freqArrayRef.current[binIndex] || 0
          totalEnergy += raw
          // Scale to 6px - 110px
          val = Math.max(6, Math.floor((raw / 255) * 110))
        } else {
          // Idle breathing wave
          const phase = idlePhaseRef.current + i * 0.22
          const wave = Math.sin(phase) * 0.5 + Math.cos(phase * 0.5) * 0.3
          val = Math.max(8, Math.floor((wave + 0.8) * 16))
        }
        nextBars.push(val)
      }

      idlePhaseRef.current += isLive ? 0.05 : 0.02
      setActiveFrequencies(nextBars)

      // Calculate peak dB for HUD readout
      if (isLive && totalEnergy > 0) {
        const avg = totalEnergy / barCount
        const db = Math.round((avg / 255) * 42 - 42)
        setPeakDb(`${db} dB`)
      } else {
        setPeakDb('IDLE')
      }

      // 2. Generate smooth flowing multi-layered SVG bezier curves
      const pointsPrimary: string[] = []
      const pointsSecondary: string[] = []
      const step = width / (barCount - 1)

      for (let i = 0; i < barCount; i++) {
        const x = i * step
        const barHeight = nextBars[i]

        // Alternate curves with phase offset for multi-layered depth
        const yPrimary = centerY - barHeight * 0.65
        const ySecondary = centerY + barHeight * 0.5

        if (i === 0) {
          pointsPrimary.push(`M ${x} ${yPrimary}`)
          pointsSecondary.push(`M ${x} ${ySecondary}`)
        } else {
          const prevX = (i - 1) * step
          const cpX = (prevX + x) / 2
          pointsPrimary.push(`S ${cpX} ${yPrimary}, ${x} ${yPrimary}`)
          pointsSecondary.push(`S ${cpX} ${ySecondary}, ${x} ${ySecondary}`)
        }
      }

      setSvgPathPrimary(pointsPrimary.join(' '))
      setSvgPathSecondary(pointsSecondary.join(' '))

      animFrameRef.current = requestAnimationFrame(renderLoop)
    }

    animFrameRef.current = requestAnimationFrame(renderLoop)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [getFrequencyData, isAmbientPlaying, isGenerating])

  const handleToggleSoundtrack = () => {
    playUiSound('click')
    toggleAmbient()
  }

  return (
    <div
      className={`relative w-full max-w-4xl mx-auto rounded-none bg-[#111317] border-4 border-[#353B42] shadow-voxel-xl overflow-hidden select-none ${className || ''}`}
    >
      {/* 3D Corner Pixel Accents */}
      <div className="absolute top-0 left-0 w-3 h-3 bg-voxel-grass z-30" />
      <div className="absolute top-0 right-0 w-3 h-3 bg-voxel-grass z-30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 bg-voxel-gold z-30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 bg-voxel-gold z-30" />

      {/* Layer 1: Ambient Background Lighting & Particles */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: isAmbientPlaying
            ? 'radial-gradient(ellipse at 50% 50%, rgba(103, 169, 75, 0.22) 0%, rgba(245, 213, 71, 0.08) 50%, #111317 80%)'
            : 'radial-gradient(ellipse at 50% 50%, rgba(103, 169, 75, 0.1) 0%, #111317 75%)',
        }}
      />

      {/* Floating Ambient Acoustic Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `floatCubeSlow ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
          className={`absolute rounded-none pointer-events-none transition-colors duration-500 ${
            isAmbientPlaying
              ? 'bg-voxel-gold/60 shadow-[0_0_6px_#F5D547]'
              : 'bg-voxel-grass/30'
          }`}
        />
      ))}

      {/* HUD Header Bar */}
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 border-b-2 border-voxel-stone-dark/80 bg-[#16191E]/90 text-[10px] font-pixel text-voxel-sand">
        <div className="flex items-center gap-2">
          <Radio className={`w-3.5 h-3.5 ${isAmbientPlaying ? 'text-voxel-grass animate-pulse' : 'text-voxel-stone-light'}`} />
          <span className="tracking-wider">
            {isGenerating
              ? 'SYNTHESIZING ACOUSTIC STREAM...'
              : isAmbientPlaying
              ? 'REAL-TIME FFT FREQUENCY RESPONSE'
              : 'VAANI CINEMATIC ACOUSTIC MATRIX'}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span className="hidden sm:inline text-voxel-stone-light">
            SPECTRUM: 48,000 HZ
          </span>
          <BlockBadge
            variant={isAmbientPlaying ? 'grass' : isGenerating ? 'gold' : 'stone'}
            size="sm"
          >
            {peakDb}
          </BlockBadge>
        </div>
      </div>

      {/* Layer 2 & 3: Central Waveform & Layered Frequency Visualizer */}
      <div className="relative z-10 h-56 sm:h-64 px-4 sm:px-8 flex items-center justify-center overflow-hidden">
        {/* Flowing SVG Bezier Waves */}
        <svg
          viewBox="0 0 800 180"
          preserveAspectRatio="none"
          className="absolute inset-x-0 inset-y-4 w-full h-48 pointer-events-none opacity-85"
        >
          <defs>
            <linearGradient id="primaryWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4D8236" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#67A94B" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#55C755" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="secondaryWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D1B02B" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#F5D547" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#E6D2A5" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Primary Green Wave */}
          {svgPathPrimary && (
            <path
              d={svgPathPrimary}
              fill="none"
              stroke="url(#primaryWaveGrad)"
              strokeWidth="3.5"
              strokeLinecap="square"
              className="transition-all duration-75"
            />
          )}

          {/* Secondary Gold Wave */}
          {svgPathSecondary && (
            <path
              d={svgPathSecondary}
              fill="none"
              stroke="url(#secondaryWaveGrad)"
              strokeWidth="2"
              strokeLinecap="square"
              className="transition-all duration-75 opacity-75"
            />
          )}
        </svg>

        {/* Layer 4: Layered 32-Column Frequency Amphitheater */}
        <div className="relative z-10 w-full h-40 flex items-center justify-between gap-1 sm:gap-1.5">
          {activeFrequencies.map((barHeight, idx) => {
            const isPeak = barHeight > 65
            const isMid = barHeight > 30

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-center transition-all duration-75"
              >
                {/* Stepped Voxel Bar */}
                <div
                  style={{
                    height: `${barHeight}px`,
                  }}
                  className={`w-full max-w-[12px] border transition-all duration-75 ${
                    isPeak
                      ? 'bg-gradient-to-t from-voxel-grass to-voxel-gold border-voxel-gold shadow-[0_0_8px_#F5D547]'
                      : isMid
                      ? 'bg-gradient-to-t from-voxel-forest to-voxel-grass border-voxel-grass shadow-[0_0_6px_#67A94B]'
                      : 'bg-voxel-forest-deep border-voxel-stone-dark'
                  }`}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Layer 5: Studio Interactive Controls Footer */}
      <div className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t-2 border-voxel-stone-dark/80 bg-[#14171C]">
        <div className="flex items-center gap-3">
          <BlockButton
            variant={isAmbientPlaying ? 'redstone' : 'primary'}
            size="sm"
            onClick={handleToggleSoundtrack}
            className="min-w-[170px]"
          >
            {isAmbientPlaying ? (
              <span className="flex items-center gap-1.5">
                <VolumeX className="w-3.5 h-3.5" />
                <span>PAUSE AMBIENT</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                <span>START AMBIENT SOUNDSCAPE</span>
              </span>
            )}
          </BlockButton>

          <button
            onClick={() => {
              playUiSound('click')
              toggleMute()
            }}
            className={`p-2 border-2 block-pressable transition-colors ${
              isMuted
                ? 'bg-[#2E1010] border-voxel-redstone text-voxel-redstone'
                : 'bg-voxel-bedrock hover:bg-voxel-stone-dark border-voxel-stone-dark text-voxel-cloud'
            }`}
            title={isMuted ? 'Unmute All Audio' : 'Mute Master Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-voxel-gold" />}
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-voxel-stone-light">
          <Sparkles className="w-3 h-3 text-voxel-gold" />
          <span>ORIGINAL PROCEDURAL AMBIENT SYNTH • C MINOR HARMONICS</span>
        </div>
      </div>
    </div>
  )
}

