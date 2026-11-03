import React from 'react'
import { cn } from '../../lib/utils'

export type VoxelCardBiome = 'stone' | 'grass' | 'gold' | 'redstone' | 'sky' | 'obsidian'

export interface VoxelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  biome?: VoxelCardBiome
  glow?: boolean
  elevated?: boolean
}

export const VoxelCard: React.FC<VoxelCardProps> = ({
  children,
  className,
  biome = 'stone',
  glow = false,
  elevated = true,
  ...props
}) => {
  const biomeStyles: Record<VoxelCardBiome, string> = {
    stone: 'bg-[#1C2024] border-2 border-[#3D434A] shadow-voxel',
    grass: 'bg-[#1C2024] border-2 border-voxel-grass-dark shadow-voxel-grass',
    gold: 'bg-[#1C2024] border-2 border-voxel-gold-dark shadow-voxel-gold',
    redstone: 'bg-[#1C2024] border-2 border-voxel-redstone-dark shadow-voxel-redstone',
    sky: 'bg-[#1C2024] border-2 border-voxel-sky-dark shadow-voxel-sky',
    obsidian: 'bg-[#121417] border-2 border-[#2E2038] shadow-voxel',
  }

  return (
    <div
      className={cn(
        'relative rounded-none p-5 transition-all duration-150',
        biomeStyles[biome],
        glow && 'ring-2 ring-voxel-gold/50 shadow-[0_0_15px_rgba(245,213,71,0.2)]',
        elevated && 'hover:-translate-y-0.5 hover:shadow-voxel-lg',
        className
      )}
      {...props}
    >
      {/* Subtle top bevel pixel line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 pointer-events-none" />
      {/* Subtle bottom bevel shadow line */}
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
