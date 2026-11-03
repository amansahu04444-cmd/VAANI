import React, { useRef, useState } from 'react'
import { cn } from '../../lib/utils'

export type VoxelCardBiome = 'stone' | 'grass' | 'gold' | 'redstone' | 'sky' | 'obsidian'

export interface VoxelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  biome?: VoxelCardBiome
  glow?: boolean
  elevated?: boolean
  tiltable?: boolean
}

export const VoxelCard: React.FC<VoxelCardProps> = ({
  children,
  className,
  biome = 'stone',
  glow = false,
  elevated = true,
  tiltable = true,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({})

  const biomeStyles: Record<VoxelCardBiome, string> = {
    stone: 'bg-[#1C2024] border-2 border-[#3D434A] shadow-voxel hover:border-[#525A63]',
    grass: 'bg-[#1C2024] border-2 border-voxel-grass-dark shadow-voxel-grass hover:border-voxel-grass',
    gold: 'bg-[#1C2024] border-2 border-voxel-gold-dark shadow-voxel-gold hover:border-voxel-gold',
    redstone: 'bg-[#1C2024] border-2 border-voxel-redstone-dark shadow-voxel-redstone hover:border-voxel-redstone',
    sky: 'bg-[#1C2024] border-2 border-voxel-sky-dark shadow-voxel-sky hover:border-voxel-sky',
    obsidian: 'bg-[#121417] border-2 border-[#2E2038] shadow-voxel hover:border-[#4B3060]',
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltable || !cardRef.current) return

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5

    // Restrict tilt strictly to max 3.5 degrees for crisp stability
    const rotateX = -y * 7
    const rotateY = x * 7

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`,
      transition: 'transform 75ms ease-out',
    })
  }

  const handleMouseLeave = () => {
    if (!tiltable) return
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)',
      transition: 'transform 250ms ease-out',
    })
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      data-cursor="card"
      className={cn(
        'voxel-card relative rounded-none p-5 transition-all duration-150 will-change-transform',
        biomeStyles[biome],
        glow && 'ring-2 ring-voxel-gold/50 shadow-[0_0_18px_rgba(245,213,71,0.25)]',
        elevated && 'hover:shadow-voxel-lg',
        className
      )}
      {...props}
    >
      {/* Top bevel pixel line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 pointer-events-none" />
      {/* Bottom bevel shadow line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/40 pointer-events-none" />
      {children}
    </div>
  )
}

export const Card = VoxelCard

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 pb-4 border-b-2 border-voxel-stone-dark/60 mb-4', className)} {...props}>
    {children}
  </div>
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className, ...props }) => (
  <h3 className={cn('text-base sm:text-lg font-pixel tracking-wide text-voxel-cloud flex items-center gap-2.5', className)} {...props}>
    {children}
  </h3>
)

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className, ...props }) => (
  <p className={cn('text-xs text-voxel-stone-light leading-relaxed', className)} {...props}>
    {children}
  </p>
)

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn('space-y-4', className)} {...props}>
    {children}
  </div>
)

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn('flex items-center pt-4 border-t-2 border-voxel-stone-dark/60 mt-4', className)} {...props}>
    {children}
  </div>
)
