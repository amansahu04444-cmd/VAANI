import React, { useEffect, useState, useRef } from 'react'

interface Ripple {
  id: number
  x: number
  y: number
}

export const VoxelCursor: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [hoverState, setHoverState] = useState<'default' | 'button' | 'card' | 'input'>('default')
  const [ripples, setRipples] = useState<Ripple[]>([])

  // Direct ref tracking for 60fps performance without re-triggering React renders
  const cursorDotRef = useRef<HTMLDivElement>(null)
  const cursorRingRef = useRef<HTMLDivElement>(null)
  const mousePos = useRef({ x: -100, y: -100 })
  const ringPos = useRef({ x: -100, y: -100 })
  const animFrameId = useRef<number | null>(null)
  const rippleCount = useRef(0)

  useEffect(() => {
    // 1. Detect if device has fine pointer (desktop mouse/trackpad) & respects reduced motion
    const finePointerQuery = window.matchMedia('(pointer: fine)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const checkCapabilities = () => {
      const fine = finePointerQuery.matches
      const reduced = reducedMotionQuery.matches
      setIsEnabled(fine && !reduced)
    }

    checkCapabilities()

    finePointerQuery.addEventListener('change', checkCapabilities)
    reducedMotionQuery.addEventListener('change', checkCapabilities)

    return () => {
      finePointerQuery.removeEventListener('change', checkCapabilities)
      reducedMotionQuery.removeEventListener('change', checkCapabilities)
    }
  }, [])

  useEffect(() => {
    if (!isEnabled) return

    const handleMouseMove = (e: MouseEvent) => {
      setIsVisible(true)

      let targetX = e.clientX
      let targetY = e.clientY

      // Check for magnetic button attraction
      const target = e.target as HTMLElement | null
      const buttonEl = target?.closest<HTMLElement>('button, [role="button"], a.magnetic-button')
      if (buttonEl) {
        const rect = buttonEl.getBoundingClientRect()
        const btnCenterX = rect.left + rect.width / 2
        const btnCenterY = rect.top + rect.height / 2
        const distX = btnCenterX - e.clientX
        const distY = btnCenterY - e.clientY
        const distance = Math.hypot(distX, distY)

        // Subtle magnetic pull if within 60px
        if (distance < 60) {
          targetX += distX * 0.25
          targetY += distY * 0.25
        }
      }

      mousePos.current = { x: targetX, y: targetY }

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`
      }
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      if (target.closest('button, a, [role="button"], .block-pressable')) {
        setHoverState('button')
      } else if (target.closest('input, textarea, select')) {
        setHoverState('input')
      } else if (target.closest('[data-cursor="card"], .voxel-card')) {
        setHoverState('card')
      } else {
        setHoverState('default')
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      rippleCount.current += 1
      const newRipple = { id: rippleCount.current, x: e.clientX, y: e.clientY }
      setRipples((prev) => [...prev.slice(-4), newRipple])

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
      }, 500)
    }

    const handleMouseLeave = () => {
      setIsVisible(false)
    }

    const handleMouseEnter = () => {
      setIsVisible(true)
    }

    // 60fps Lerp animation loop for smooth trailing ring
    const renderLoop = () => {
      const dx = mousePos.current.x - ringPos.current.x
      const dy = mousePos.current.y - ringPos.current.y

      ringPos.current.x += dx * 0.22
      ringPos.current.y += dy * 0.22

      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`
      }

      animFrameId.current = requestAnimationFrame(renderLoop)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseover', handleMouseOver, { passive: true })
    window.addEventListener('mousedown', handleMouseDown, { passive: true })
    document.body.addEventListener('mouseleave', handleMouseLeave)
    document.body.addEventListener('mouseenter', handleMouseEnter)

    animFrameId.current = requestAnimationFrame(renderLoop)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseover', handleMouseOver)
      window.removeEventListener('mousedown', handleMouseDown)
      document.body.removeEventListener('mouseleave', handleMouseLeave)
      document.body.removeEventListener('mouseenter', handleMouseEnter)
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
    }
  }, [isEnabled])

  if (!isEnabled) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {/* 1. Center Pixel Voxel Dot */}
      <div
        ref={cursorDotRef}
        style={{ opacity: isVisible ? 1 : 0 }}
        className="fixed top-0 left-0 -ml-1 -mt-1 w-2 h-2 bg-voxel-grass border border-voxel-bedrock transition-opacity duration-150"
      />

      {/* 2. Smooth Outer Tracking Ring */}
      <div
        ref={cursorRingRef}
        style={{ opacity: isVisible ? 1 : 0 }}
        className="fixed top-0 left-0 transition-opacity duration-200"
      >
        <div
          className={`-ml-4 -mt-4 transition-all duration-150 flex items-center justify-center ${
            hoverState === 'button'
              ? 'w-9 h-9 -ml-4.5 -mt-4.5 border-2 border-voxel-gold bg-voxel-gold/5 shadow-[0_0_4px_rgba(245,213,71,0.25)]'
              : hoverState === 'card'
              ? 'w-10 h-10 -ml-5 -mt-5 border border-voxel-grass/80 bg-voxel-grass/5'
              : hoverState === 'input'
              ? 'w-6 h-6 -ml-3 -mt-3 border border-voxel-sand bg-voxel-sand/10'
              : 'w-7 h-7 rounded-none border border-voxel-grass/60 bg-transparent'
          }`}
        >
          {/* Pixel Corner Brackets when hovering button */}
          {hoverState === 'button' && (
            <>
              <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-voxel-gold" />
              <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-voxel-gold" />
              <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-voxel-gold" />
              <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-voxel-gold" />
            </>
          )}
        </div>
      </div>

      {/* 3. Pixel Ripple on Click */}
      {ripples.map((r) => (
        <div
          key={r.id}
          style={{
            left: `${r.x}px`,
            top: `${r.y}px`,
          }}
          className="fixed -ml-3 -mt-3 w-6 h-6 border-2 border-voxel-gold animate-ping opacity-75"
        />
      ))}
    </div>
  )
}

