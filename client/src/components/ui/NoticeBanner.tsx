import React from 'react'
import { Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface NoticeBannerProps {
  type?: 'info' | 'warning' | 'success' | 'error'
  title?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({
  type = 'info',
  title,
  children,
  className,
  action,
}) => {
  const styles = {
    info: 'bg-teal-950/40 border-teal-glow/40 text-teal-100',
    warning: 'bg-amber-950/40 border-amber-600/40 text-amber-100',
    success: 'bg-emerald-950/40 border-emerald-600/40 text-emerald-100',
    error: 'bg-rose-950/40 border-rose-600/40 text-rose-100',
  }

  const icons = {
    info: <Info className="w-5 h-5 text-teal-soft shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3.5 p-4 rounded-xl border text-xs leading-relaxed backdrop-blur-sm',
        styles[type],
        className
      )}
    >
      {icons[type]}
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold tracking-wide text-white">{title}</h5>}
        <div className="text-studio-300">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

