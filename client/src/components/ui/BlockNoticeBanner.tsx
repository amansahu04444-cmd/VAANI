import React from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export type BlockNoticeVariant = 'info' | 'success' | 'warning' | 'error'

export interface BlockNoticeBannerProps {
  title?: string
  message: string
  variant?: BlockNoticeVariant
  onDismiss?: () => void
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export const BlockNoticeBanner: React.FC<BlockNoticeBannerProps> = ({
  title,
  message,
  variant = 'info',
  onDismiss,
  action,
  className,
}) => {
  const styles: Record<BlockNoticeVariant, { border: string; bg: string; text: string; icon: React.ReactNode }> = {
    info: {
      border: 'border-voxel-sky-dark',
      bg: 'bg-[#10243D]',
      text: 'text-voxel-sky',
      icon: <Info className="w-4 h-4 text-voxel-sky shrink-0" />,
    },
    success: {
      border: 'border-voxel-grass-dark',
      bg: 'bg-[#153818]',
      text: 'text-voxel-grass',
      icon: <CheckCircle2 className="w-4 h-4 text-voxel-grass shrink-0" />,
    },
    warning: {
      border: 'border-voxel-gold-dark',
      bg: 'bg-[#382E0A]',
      text: 'text-voxel-gold',
      icon: <AlertTriangle className="w-4 h-4 text-voxel-gold shrink-0" />,
    },
    error: {
      border: 'border-voxel-redstone-dark',
      bg: 'bg-[#381010]',
      text: 'text-voxel-redstone',
      icon: <AlertCircle className="w-4 h-4 text-voxel-redstone shrink-0" />,
    },
  }

  const current = styles[variant]

  return (
    <div
      className={cn(
        'relative border-2 p-3.5 shadow-voxel rounded-none flex items-start gap-3',
        current.border,
        current.bg,
        className
      )}
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h5 className="text-xs font-pixel uppercase tracking-wide text-voxel-cloud">{title}</h5>}
        <p className="text-xs font-sans text-voxel-cloud/90 mt-0.5 leading-relaxed">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-2 text-[10px] font-pixel text-voxel-gold hover:underline uppercase block-pressable"
          >
            {action.label} ➔
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-voxel-stone-light hover:text-white p-1 block-pressable"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export const NoticeBanner = BlockNoticeBanner

