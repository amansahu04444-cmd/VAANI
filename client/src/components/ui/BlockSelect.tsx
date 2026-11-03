import React from 'react'
import { cn } from '../../lib/utils'

export interface BlockSelectOption {
  value: string
  label: string
  sublabel?: string
  badge?: string
}

export interface BlockSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options?: BlockSelectOption[]
}

export const BlockSelect = React.forwardRef<HTMLSelectElement, BlockSelectProps>(
  ({ className, label, error, helperText, options, children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-pixel text-voxel-sand tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full appearance-none bg-[#121417] border-2 border-[#3D434A] rounded-none px-3.5 py-2.5 text-sm font-sans text-voxel-cloud shadow-voxel-inset focus:outline-none focus:border-voxel-gold cursor-pointer transition-colors pr-10',
              error && 'border-voxel-redstone focus:border-voxel-redstone',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#181B1E] text-voxel-cloud py-2">
                    {opt.label} {opt.sublabel ? `(${opt.sublabel})` : ''}
                  </option>
                ))
              : children}
          </select>

          {/* Voxel down arrow */}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-voxel-gold font-pixel text-[10px]">
            ▼
          </div>
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

BlockSelect.displayName = 'BlockSelect'

