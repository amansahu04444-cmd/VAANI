import React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-studio-900 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]'
  
  const variants = {
    primary: 'bg-teal-glow hover:bg-teal-accent text-white shadow-lg shadow-teal-glow/20 focus:ring-teal-accent',
    secondary: 'bg-studio-800 hover:bg-studio-700 text-studio-100 border border-studio-700 focus:ring-studio-500',
    outline: 'bg-transparent border border-studio-600 hover:border-teal-glow hover:text-teal-soft text-studio-200 focus:ring-teal-glow',
    ghost: 'bg-transparent hover:bg-studio-800 text-studio-300 hover:text-white focus:ring-studio-600',
    destructive: 'bg-rose-900/40 hover:bg-rose-900/70 text-rose-300 border border-rose-700/50 focus:ring-rose-500'
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5'
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!isLoading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </button>
  )
}

