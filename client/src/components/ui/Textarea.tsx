import React from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  currentLength?: number
  maxLength?: number
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, currentLength, maxLength, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        <div className="flex justify-between items-center">
          {label && (
            <label htmlFor={inputId} className="block text-xs font-medium text-studio-300">
              {label}
            </label>
          )}
          {maxLength !== undefined && currentLength !== undefined && (
            <span
              className={cn(
                'text-[11px] font-mono',
                currentLength > maxLength
                  ? 'text-rose-400 font-bold'
                  : currentLength > maxLength * 0.9
                  ? 'text-amber-400'
                  : 'text-studio-500'
              )}
            >
              {currentLength} / {maxLength}
            </span>
          )}
        </div>
        <textarea
          id={inputId}
          ref={ref}
          maxLength={maxLength}
          className={cn(
            'w-full bg-studio-900/90 border border-studio-700 rounded-lg p-3 text-sm text-white placeholder-studio-500 focus:outline-none focus:ring-2 focus:ring-teal-glow focus:border-transparent transition-all min-h-[120px] resize-y font-sans leading-relaxed',
            error && 'border-rose-500 focus:ring-rose-500',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-studio-400">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

