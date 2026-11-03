import React, { useState, useEffect } from 'react'

export interface VoxelSoundwaveSculptureProps {
  isPlaying?: boolean
  className?: string
}

const GLYPHS = [
  { text: 'हिंदी', lang: 'Hindi', x: '10%', y: '15%', delay: '0s', biome: 'border-voxel-grass text-voxel-grass' },
  { text: 'বাংলা', lang: 'Bengali', x: '82%', y: '18%', delay: '1.2s', biome: 'border-voxel-gold text-voxel-gold' },
  { text: 'தமிழ்', lang: 'Tamil', x: '6%', y: '68%', delay: '2.5s', biome: 'border-voxel-sky text-voxel-sky' },
  { text: 'తెలుగు', lang: 'Telugu', x: '86%', y: '64%', delay: '0.8s', biome: 'border-voxel-grass text-voxel-grass' },
  { text: 'ಕನ್ನಡ', lang: 'Kannada', x: '24%', y: '88%', delay: '3.1s', biome: 'border-voxel-gold text-voxel-gold' },
  { text: 'मराठी', lang: 'Marathi', x: '72%', y: '88%', delay: '1.8s', biome: 'border-voxel-sand text-voxel-sand' },
]

export const VoxelSoundwaveSculpture: React.FC<VoxelSoundwaveSculptureProps> = ({
  isPlaying = false,
  className,
}) => {
  const [frame, setFrame] = useState(0)
  const columnCount = 18

  useEffect(() => {
    let animId: number
    const speed = isPlaying ? 0.08 : 0.03
    let current = 0

    const loop = () => {
      current += speed
      setFrame(current)
      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [isPlaying])

  return (
    <div className={`relative w-full max-w-2xl mx-auto h-72 sm:h-80 select-none flex items-center justify-center ${className || ''}`}>
      {/* 1. Ambient Lighting Glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-full blur-3xl opacity-40 transition-opacity duration-500"
        style={{
          background: isPlaying
            ? 'radial-gradient(circle at 50% 50%, rgba(103, 169, 75, 0.45) 0%, rgba(245, 213, 71, 0.2) 40%, transparent 70%)'
            : 'radial-gradient(circle at 50% 50%, rgba(103, 169, 75, 0.25) 0%, transparent 60%)',
        }}
      />

      {/* 2. Floating Indic Language Glyphs */}
      {GLYPHS.map((g, idx) => (
        <div
          key={idx}
          style={{
            left: g.x,
            top: g.y,
            animationDelay: g.delay,
          }}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#121417]/90 border-2 ${g.biome} text-xs font-semibold shadow-voxel-sm animate-float-cube transition-transform hover:scale-110 cursor-default z-20`}
          title={`${g.lang} Indic Biome`}
        >
          <span className="font-sans">{g.text}</span>
        </div>
      ))}

      {/* 3. Voxel Soundwave 3D Stage */}
      <div
        className="relative z-10 w-full max-w-lg h-52 flex items-end justify-center gap-1.5 sm:gap-2 px-6"
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Base Obsidian Pedestal */}
        <div
          className="absolute bottom-0 w-full h-4 bg-[#181B1E] border-2 border-voxel-stone-dark shadow-voxel-lg"
          style={{
            transform: 'rotateX(45deg) translateZ(-10px)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-voxel-grass/20 to-transparent" />
        </div>

        {/* 3D Voxel Soundwave Columns */}
        {Array.from({ length: columnCount }).map((_, idx) => {
          // Calculate wave height using mathematical sine wave combined with live frame
          const distFromCenter = Math.abs(idx - columnCount / 2) / (columnCount / 2)
          const centerWeight = 1 - distFromCenter * 0.45

          const wave1 = Math.sin(frame * 2 + idx * 0.45)
          const wave2 = Math.cos(frame * 1.5 - idx * 0.3)
          const combined = (wave1 * 0.6 + wave2 * 0.4) * 0.5 + 0.5

          const dynamicMultiplier = isPlaying ? 1.6 : 0.7
          const heightPx = Math.max(
            16,
            Math.min(160, Math.floor((combined * 90 * dynamicMultiplier * centerWeight) / 4) * 4 + 16)
          )

          const isPeak = heightPx > (isPlaying ? 110 : 80)
          const isMid = heightPx > 50

          return (
            <div
              key={idx}
              className="relative flex flex-col items-center justify-end"
              style={{
                height: `${heightPx}px`,
                transformStyle: 'preserve-3d',
                transform: `rotateY(0deg) translateZ(${Math.sin(idx * 0.4) * 15}px)`,
                transition: 'height 80ms ease-out',
              }}
            >
              {/* Top Face of Voxel Column */}
              <div
                className={`w-4 sm:w-5 h-2 border border-voxel-bedrock shadow-sm ${
                  isPeak
                    ? 'bg-voxel-gold border-voxel-gold-dark shadow-[0_0_8px_#F5D547]'
                    : isMid
                    ? 'bg-voxel-grass border-voxel-grass-dark shadow-[0_0_6px_#67A94B]'
                    : 'bg-voxel-forest border-voxel-forest-deep'
                }`}
                style={{
                  transform: 'rotateX(55deg)',
                }}
              />

              {/* Front Face of Voxel Column */}
              <div
                className={`w-4 sm:w-5 flex-1 border border-voxel-bedrock transition-colors ${
                  isPeak
                    ? 'bg-gradient-to-t from-voxel-forest via-voxel-grass to-voxel-gold'
                    : isMid
                    ? 'bg-gradient-to-t from-voxel-forest-deep to-voxel-grass'
                    : 'bg-[#1D4427]'
                }`}
              />
            </div>
          )
        })}
      </div>

      {/* 4. Floor Grid Accent Line */}
      <div className="absolute bottom-4 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-voxel-grass/40 to-transparent pointer-events-none" />
    </div>
  )
}
