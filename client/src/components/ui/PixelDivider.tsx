import React from 'react'
import { cn } from '../../lib/utils'

export interface PixelDividerProps {
  className?: string
  color?: 'stone' | 'grass' | 'gold' | 'redstone'
}

export const PixelDivider: React.FC<PixelDividerProps> = ({
  className,
  color = 'stone',
}) => {
  const colorMap = {
    stone: 'bg-voxel-stone-dark border-voxel-bedrock',
    grass: 'bg-voxel-grass-dark border-voxel-bedrock',
    gold: 'bg-voxel-gold-dark border-voxel-bedrock',
    redstone: 'bg-voxel-redstone-dark border-voxel-bedrock',
  }

  return (
    <div className={cn('w-full flex items-center gap-1.5 py-3 select-none', className)}>
      <div className={cn('h-1 flex-1 border-b-2', colorMap[color])} />
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-voxel-stone-light" />
        <div className="w-2 h-2 bg-voxel-gold" />
        <div className="w-1.5 h-1.5 bg-voxel-stone-light" />
      </div>
      <div className={cn('h-1 flex-1 border-b-2', colorMap[color])} />
    </div>
  )
}

