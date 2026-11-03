import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface BlockModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  biome?: 'stone' | 'gold' | 'redstone'
}

export const BlockModal: React.FC<BlockModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  biome = 'stone',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxSizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  const borderThemes = {
    stone: 'border-[#3D434A]',
    gold: 'border-voxel-gold',
    redstone: 'border-voxel-redstone',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-voxel-bedrock/85 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        className={cn(
          'relative w-full bg-[#1A1E22] border-4 p-6 shadow-voxel-xl rounded-none transition-all',
          borderThemes[biome],
          maxSizes[maxWidth]
        )}
      >
        {/* Pixel Corner Accents */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-voxel-gold" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-voxel-gold" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-voxel-gold" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-voxel-gold" />

        {/* Chunky Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 bg-[#2E1010] hover:bg-voxel-redstone text-voxel-redstone hover:text-white border-2 border-voxel-redstone flex items-center justify-center block-pressable transition-colors"
          aria-label="Close Modal"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>

        <div className="mb-5 pb-3 border-b-2 border-voxel-stone-dark/80 pr-8">
          <h2 className="text-base sm:text-lg font-pixel tracking-wide text-voxel-cloud uppercase flex items-center gap-2">
            <span>{title}</span>
          </h2>
          {description && (
            <p className="text-xs font-sans text-voxel-stone-light mt-1.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}

export const Modal = BlockModal

