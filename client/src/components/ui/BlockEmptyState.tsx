import React from 'react'
import { CubeIllustration } from './CubeIllustration'
import type { CubeBiome } from './CubeIllustration'
import { BlockButton } from './BlockButton'
import type { BlockButtonVariant } from './BlockButton'
import { cn } from '../../lib/utils'

export interface BlockEmptyStateProps {
  title: string
  description: string
  biome?: CubeBiome
  actionLabel?: string
  onAction?: () => void
  actionVariant?: BlockButtonVariant
  className?: string
}

export const BlockEmptyState: React.FC<BlockEmptyStateProps> = ({
  title,
  description,
  biome = 'stone',
  actionLabel,
  onAction,
  actionVariant = 'primary',
  className,
}) => {
  return (
    <div
      className={cn(
        'text-center py-12 px-6 bg-[#16191D] border-2 border-dashed border-voxel-stone-dark/80 p-8 shadow-voxel select-none',
        className
      )}
    >
      <CubeIllustration biome={biome} size={54} floating className="mx-auto mb-4" />
      <h3 className="text-sm sm:text-base font-pixel uppercase tracking-wide text-voxel-cloud">
        {title}
      </h3>
      <p className="text-xs font-sans text-voxel-stone-light max-w-sm mx-auto mt-2 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <BlockButton variant={actionVariant} size="sm" onClick={onAction}>
            {actionLabel}
          </BlockButton>
        </div>
      )}
    </div>
  )
}
