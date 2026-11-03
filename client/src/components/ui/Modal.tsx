import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md'
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
    xl: 'max-w-xl'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-studio-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          'relative w-full bg-studio-850 border border-studio-700 rounded-xl shadow-2xl p-6 text-studio-50 transition-all scale-100',
          maxSizes[maxWidth]
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-studio-400 hover:text-white rounded-lg hover:bg-studio-700/60 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
          {description && <p className="text-xs text-studio-400 mt-1">{description}</p>}
        </div>

        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}

