import React, { forwardRef } from 'react'

export interface CinematicParticleFieldProps {
  className?: string
}

export const CinematicParticleField = forwardRef<HTMLCanvasElement, CinematicParticleFieldProps>(
  ({ className }, ref) => {
    return (
      <canvas
        ref={ref}
        className={`absolute inset-0 w-full h-full pointer-events-none z-[3] ${className || ''}`}
      />
    )
  }
)

CinematicParticleField.displayName = 'CinematicParticleField'
