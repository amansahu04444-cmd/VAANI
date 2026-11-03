import React from 'react'
import { cn } from '../../lib/utils'

export interface BlockTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  charLimit?: number
  currentLength?: number
}

export const BlockTextarea = React.forwardRef<HTMLTextAreaElement, BlockTextareaProps>(
  ({ className, label, error, helperText, charLimit, currentLength, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={textareaId} className="block text-xs font-pixel text-voxel-sand tracking-wide uppercase">
              {label}
            </label>
          )}
          {charLimit && (
            <div className="text-[10px] font-mono px-1.5 py-0.5 bg-voxel-bedrock border border-voxel-stone-dark text-voxel-stone-light">
              <span className={cn(currentLength && currentLength > charLimit * 0.9 ? 'text-voxel-redstone font-bold' : 'text-voxel-gold')}>
                {currentLength ?? 0}
              </span>
              {' / '}
              <span>{charLimit} BLOCKS</span>
            </div>
          )}
        </div>

        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'w-full bg-[#121417] border-2 border-[#3D434A] rounded-none px-3.5 py-3 text-sm font-sans text-voxel-cloud placeholder-voxel-stone-light/50 shadow-voxel-inset focus:outline-none focus:border-voxel-gold focus:bg-[#15181C] transition-colors leading-relaxed min-h-[120px]',
            error && 'border-voxel-redstone focus:border-voxel-redstone',
            className
          )}
          {...props}
        />

        {error ? (
          <p className="text-xs font-mono text-voxel-redstone">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] font-mono text-voxel-stone-light">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

BlockTextarea.displayName = 'BlockTextarea'

export const Textarea = BlockTextarea

