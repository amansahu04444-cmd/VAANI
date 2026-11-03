import React from 'react'
import { cn } from '../../lib/utils'

export type BlockBadgeVariant =
  | 'default'
  | 'stone'
  | 'grass'
  | 'emerald'
  | 'gold'
  | 'amber'
  | 'redstone'
  | 'rose'
  | 'lapis'
  | 'sky'
  | 'sand'
  | 'teal'

export interface BlockBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BlockBadgeVariant
  size?: 'sm' | 'md'
  icon?: React.ReactNode
}

export const BlockBadge: React.FC<BlockBadgeProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  icon,
  ...props
}) => {
  const variants: Record<BlockBadgeVariant, string> = {
    default: 'bg-voxel-stone-dark text-voxel-cloud border-2 border-voxel-stone-light/40 shadow-voxel-sm',
    stone: 'bg-voxel-stone-dark text-voxel-cloud border-2 border-voxel-stone-light/40 shadow-voxel-sm',
    grass: 'bg-[#1D3B23] text-voxel-grass border-2 border-voxel-grass shadow-voxel-sm',
    teal: 'bg-[#1D3B23] text-voxel-grass border-2 border-voxel-grass shadow-voxel-sm',
    emerald: 'bg-[#123812] text-voxel-emerald border-2 border-voxel-emerald shadow-voxel-sm',
    gold: 'bg-[#3D330A] text-voxel-gold border-2 border-voxel-gold shadow-voxel-sm',
    amber: 'bg-[#3D330A] text-voxel-gold border-2 border-voxel-gold shadow-voxel-sm',
    redstone: 'bg-[#381010] text-voxel-redstone border-2 border-voxel-redstone shadow-voxel-sm',
    rose: 'bg-[#381010] text-voxel-redstone border-2 border-voxel-redstone shadow-voxel-sm',
    lapis: 'bg-[#10243D] text-voxel-sky border-2 border-voxel-sky shadow-voxel-sm',
    sky: 'bg-[#10243D] text-voxel-sky border-2 border-voxel-sky shadow-voxel-sm',
    sand: 'bg-[#38311D] text-voxel-sand border-2 border-voxel-sand shadow-voxel-sm',
  }

  const sizes = {
    sm: 'text-[9px] px-2 py-0.5 gap-1 font-pixel uppercase tracking-wider',
    md: 'text-[10px] px-2.5 py-1 gap-1.5 font-pixel uppercase tracking-wider',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-pixel select-none rounded-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}

export const Badge = BlockBadge

