import React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'teal' | 'slate' | 'amber' | 'rose' | 'emerald' | 'outline'
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'teal',
  size = 'md',
  ...props
}) => {
  const variants = {
    teal: 'bg-teal-950/70 text-teal-soft border border-teal-glow/40',
    slate: 'bg-studio-800 text-studio-300 border border-studio-700',
    amber: 'bg-amber-950/60 text-amber-300 border border-amber-700/40',
    rose: 'bg-rose-950/60 text-rose-300 border border-rose-700/40',
    emerald: 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/40',
    outline: 'bg-transparent text-studio-400 border border-studio-600'
  }

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 rounded',
    md: 'text-xs px-2.5 py-1 rounded-md'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium gap-1 tracking-wide select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

