import React from 'react'
import { cn } from '../../lib/utils'

export interface BlockInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightBadge?: string
}

export const BlockInput = React.forwardRef<HTMLInputElement, BlockInputProps>(
  ({ className, label, error, helperText, leftIcon, rightBadge, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="block text-xs font-pixel text-voxel-sand tracking-wide uppercase">
              {label}
            </label>
            {rightBadge && (
              <span className="text-[9px] font-mono text-voxel-stone-light px-1.5 bg-voxel-bedrock border border-voxel-stone-dark">
                {rightBadge}
              </span>
            )}
          </div>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-voxel-stone-light pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-[#121417] border-2 border-[#3D434A] rounded-none px-3.5 py-2.5 text-sm font-sans text-voxel-cloud placeholder-voxel-stone-light/50 shadow-voxel-inset focus:outline-none focus:border-voxel-gold focus:bg-[#15181C] transition-colors',
              leftIcon && 'pl-10',
              error && 'border-voxel-redstone focus:border-voxel-redstone',
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs font-mono text-voxel-redstone">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] font-mono text-voxel-stone-light">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

BlockInput.displayName = 'BlockInput'

export const Input = BlockInput
