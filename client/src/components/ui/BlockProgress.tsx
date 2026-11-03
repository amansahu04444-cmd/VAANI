import React from 'react'
import { cn } from '../../lib/utils'

export interface BlockProgressProps {
  value: number // 0 to 100
  max?: number
  variant?: 'emerald' | 'gold' | 'redstone' | 'sky' | 'grass'
  segments?: number
  showLabel?: boolean
  label?: string
  className?: string
}

export const BlockProgress: React.FC<BlockProgressProps> = ({
  value,
  max = 100,
  variant = 'emerald',
  segments = 10,
  showLabel = false,
  label,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const activeSegments = Math.round((percentage / 100) * segments)

  const variantColors = {
    emerald: 'bg-voxel-emerald border-voxel-forest-deep shadow-[0_0_8px_rgba(85,199,85,0.4)]',
    grass: 'bg-voxel-grass border-voxel-forest-deep',
    gold: 'bg-voxel-gold border-voxel-gold-dark shadow-[0_0_8px_rgba(245,213,71,0.4)]',
    redstone: 'bg-voxel-redstone border-voxel-redstone-dark shadow-[0_0_8px_rgba(224,62,62,0.5)]',
    sky: 'bg-voxel-sky border-voxel-lapis shadow-[0_0_8px_rgba(114,188,235,0.4)]',
  }

  return (
    <div className={cn('space-y-1.5 select-none', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between text-xs font-pixel text-voxel-sand">
          <span>{label || 'XP LEVEL'}</span>
          <span className="font-mono text-[11px] text-voxel-cloud">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="flex items-center gap-1 p-1 bg-voxel-bedrock border-2 border-voxel-stone-dark shadow-voxel-inset">
        {Array.from({ length: segments }).map((_, i) => {
          const isActive = i < activeSegments
          return (
            <div
              key={i}
              className={cn(
                'h-3.5 flex-1 transition-all duration-150 border',
                isActive
                  ? variantColors[variant]
                  : 'bg-voxel-obsidian/70 border-voxel-stone-dark/40'
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

