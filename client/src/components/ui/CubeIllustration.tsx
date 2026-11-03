import React from 'react'
import { cn } from '../../lib/utils'

export type CubeBiome = 'grass' | 'stone' | 'sound' | 'redstone' | 'gold' | 'lapis' | 'emerald' | 'sand' | 'obsidian'

export interface CubeIllustrationProps {
  biome?: CubeBiome
  size?: number
  className?: string
  floating?: boolean
  label?: string
}

export const CubeIllustration: React.FC<CubeIllustrationProps> = ({
  biome = 'grass',
  size = 48,
  className,
  floating = false,
  label,
}) => {
  // Color specifications for 3 isometric faces: top (light), left (mid), right (dark)
  const biomeColors: Record<CubeBiome, { top: string; left: string; right: string; accent?: string }> = {
    grass: {
      top: '#67A94B',
      left: '#795438',
      right: '#553924',
      accent: '#4D8236',
    },
    stone: {
      top: '#9CA3A8',
      left: '#777C80',
      right: '#5A616A',
      accent: '#3D434A',
    },
    sound: {
      top: '#F5D547',
      left: '#795438',
      right: '#553924',
      accent: '#E6D2A5',
    },
    redstone: {
      top: '#FF5E5E',
      left: '#E03E3E',
      right: '#A82525',
      accent: '#FFE5E5',
    },
    gold: {
      top: '#FFE476',
      left: '#F5D547',
      right: '#D1B02B',
      accent: '#FFF8D6',
    },
    lapis: {
      top: '#4A98C7',
      left: '#2A59A8',
      right: '#1E3F78',
      accent: '#72BCEB',
    },
    emerald: {
      top: '#73E673',
      left: '#55C755',
      right: '#389A38',
      accent: '#C2F5C2',
    },
    sand: {
      top: '#F2E2BE',
      left: '#E6D2A5',
      right: '#C9B588',
      accent: '#FFF5DC',
    },
    obsidian: {
      top: '#3D434A',
      left: '#21252A',
      right: '#101316',
      accent: '#7248A8',
    },
  }

  const c = biomeColors[biome] || biomeColors.grass

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center select-none',
        floating && 'animate-float-cube',
        className
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pixelated drop-shadow-[2px_4px_0px_rgba(0,0,0,0.6)]"
      >
        {/* Isometric 3D Cube: Top (0,30 -> 50,5 -> 100,30 -> 50,55) */}
        <path
          d="M50 5 L96 28 L50 52 L4 28 Z"
          fill={c.top}
          stroke="#101316"
          strokeWidth="3"
        />

        {/* Grass fringe / detail on top if grass biome */}
        {biome === 'grass' && (
          <>
            {/* Pixel specks on top face */}
            <rect x="42" y="22" width="6" height="4" fill="#88D169" opacity="0.8" />
            <rect x="58" y="32" width="6" height="4" fill="#4D8236" opacity="0.9" />
            <rect x="30" y="30" width="8" height="4" fill="#88D169" opacity="0.7" />
          </>
        )}

        {/* Sound / Jukebox speaker hole on top face */}
        {biome === 'sound' && (
          <path
            d="M50 20 L68 30 L50 40 L32 30 Z"
            fill="#101316"
            stroke="#D1B02B"
            strokeWidth="2"
          />
        )}

        {/* Left Face (4,28 -> 50,52 -> 50,95 -> 4,71) */}
        <path
          d="M4 28 L50 52 L50 95 L4 71 Z"
          fill={c.left}
          stroke="#101316"
          strokeWidth="3"
        />

        {/* Grass dripping fringe on left face */}
        {biome === 'grass' && (
          <path
            d="M4 28 L50 52 L50 64 L42 60 L36 65 L28 58 L20 62 L12 55 L4 60 Z"
            fill="#4D8236"
            stroke="#101316"
            strokeWidth="1.5"
          />
        )}

        {/* Redstone / Sound detail on left face */}
        {biome === 'sound' && (
          <rect x="18" y="48" width="14" height="24" fill="#3D2614" stroke="#101316" strokeWidth="2" />
        )}

        {/* Right Face (50,52 -> 96,28 -> 96,71 -> 50,95) */}
        <path
          d="M50 52 L96 28 L96 71 L50 95 Z"
          fill={c.right}
          stroke="#101316"
          strokeWidth="3"
        />

        {/* Grass dripping fringe on right face */}
        {biome === 'grass' && (
          <path
            d="M50 52 L96 28 L96 40 L88 43 L80 38 L72 44 L64 40 L56 46 L50 44 Z"
            fill="#386326"
            stroke="#101316"
            strokeWidth="1.5"
          />
        )}

        {/* Sound detail on right face */}
        {biome === 'sound' && (
          <rect x="68" y="48" width="14" height="24" fill="#241408" stroke="#101316" strokeWidth="2" />
        )}

        {/* Redstone glow center */}
        {biome === 'redstone' && (
          <>
            <circle cx="50" cy="50" r="12" fill="#FF8E8E" opacity="0.6" />
            <circle cx="50" cy="50" r="6" fill="#FFFFFF" opacity="0.8" />
          </>
        )}
      </svg>
      {label && (
        <span className="mt-1 text-[10px] font-pixel text-voxel-sand tracking-wider uppercase">
          {label}
        </span>
      )}
    </div>
  )
}
