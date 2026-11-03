import React from 'react'
import { cn } from '../../lib/utils'

export type BlockButtonVariant = 'primary' | 'secondary' | 'gold' | 'redstone' | 'outline' | 'ghost' | 'destructive'
export type BlockButtonSize = 'sm' | 'md' | 'lg'

export interface BlockButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BlockButtonVariant
  size?: BlockButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const BlockButton: React.FC<BlockButtonProps> = ({
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
  const baseStyles = 'inline-flex items-center justify-center font-pixel tracking-wider uppercase select-none transition-all duration-100 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none rounded-none block-pressable relative group magnetic-button overflow-hidden'

  const variants: Record<BlockButtonVariant, string> = {
    primary:
      'bg-voxel-grass hover:bg-voxel-grass-dark text-voxel-bedrock border-2 border-[#88D169] border-b-[#285C35] border-r-[#285C35] shadow-voxel-grass hover:shadow-[0_0_16px_rgba(103,169,75,0.45)] active:border-t-[#285C35] active:border-l-[#285C35]',
    secondary:
      'bg-[#2A2E33] hover:bg-[#383E45] text-voxel-cloud border-2 border-[#525A63] border-b-[#121417] border-r-[#121417] shadow-voxel hover:shadow-[0_0_14px_rgba(255,255,255,0.12)] active:border-t-[#121417] active:border-l-[#121417]',
    gold:
      'bg-voxel-gold hover:bg-voxel-gold-dark text-voxel-bedrock border-2 border-[#FFF29E] border-b-[#8C7314] border-r-[#8C7314] shadow-voxel-gold hover:shadow-[0_0_16px_rgba(245,213,71,0.5)] active:border-t-[#8C7314] active:border-l-[#8C7314]',
    redstone:
      'bg-voxel-redstone hover:bg-voxel-redstone-dark text-white border-2 border-[#FF8787] border-b-[#631212] border-r-[#631212] shadow-voxel-redstone hover:shadow-[0_0_16px_rgba(224,62,62,0.55)] active:border-t-[#631212] active:border-l-[#631212]',
    outline:
      'bg-transparent hover:bg-voxel-stone-dark text-voxel-cloud border-2 border-voxel-stone-light/50 hover:border-voxel-gold border-b-voxel-bedrock border-r-voxel-bedrock shadow-voxel hover:shadow-[0_0_12px_rgba(245,213,71,0.25)]',
    ghost:
      'bg-transparent hover:bg-voxel-stone-dark/60 text-voxel-stone-light hover:text-voxel-cloud border-2 border-transparent hover:border-voxel-stone-dark',
    destructive:
      'bg-[#4A1717] hover:bg-[#661D1D] text-voxel-redstone hover:text-white border-2 border-voxel-redstone border-b-[#2E0B0B] border-r-[#2E0B0B] shadow-voxel-redstone hover:shadow-[0_0_16px_rgba(224,62,62,0.5)]',
  }

  const sizes: Record<BlockButtonSize, string> = {
    sm: 'text-[10px] px-3 py-1.5 gap-1.5 min-h-[32px]',
    md: 'text-xs px-4 py-2.5 gap-2 min-h-[40px]',
    lg: 'text-sm px-6 py-3.5 gap-2.5 min-h-[48px]',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* 3D Top bevel highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/25 pointer-events-none" />

      {/* Subtle pixel-animated border highlight on hover */}
      <div className="absolute inset-0 border border-white/0 group-hover:border-white/20 pointer-events-none transition-colors" />

      {isLoading ? (
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-current animate-ping" />
          <span>Crafting...</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className="shrink-0 transition-transform group-hover:scale-110">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0 transition-transform group-hover:translate-x-0.5">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

export const Button = BlockButton
