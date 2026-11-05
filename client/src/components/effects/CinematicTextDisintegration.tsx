import React, { useEffect, useRef, useState, useCallback } from 'react'

export interface CinematicTextDisintegrationProps {
  className?: string
}

interface TextParticle {
  originX: number
  originY: number
  vx: number
  vy: number
  size: number
  color: string
  isVoxel: boolean
  depth: number
  phase: number
  region: 'left' | 'center' | 'right'
}

/**
 * Deterministic pseudo-random generator based on trigonometric hashing.
 * Guarantees 100% reversible, stable particle trajectories without Math.random() drift.
 */
function pseudoHash(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export const CinematicTextDisintegration: React.FC<CinematicTextDisintegrationProps> = ({
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const leftSpanRef = useRef<HTMLSpanElement>(null)
  const centerSpanRef = useRef<HTMLSpanElement>(null)
  const rightSpanRef = useRef<HTMLSpanElement>(null)

  const particlesRef = useRef<TextParticle[]>([])
  const animFrameRef = useRef<number | null>(null)

  const targetScrollProgressRef = useRef(0)
  const currScrollProgressRef = useRef(0)
  const isReducedMotionRef = useRef(false)
  const isSampledRef = useRef(false)

  // Track if canvas is active to optimize DOM rendering
  const [isDisintegrating, setIsDisintegrating] = useState(false)

  /**
   * Sample letter glyphs into deterministic micro-voxel and dust particles.
   * Renders each text region onto an offscreen canvas and extracts pixel coordinates.
   */
  const sampleTextGlyphs = useCallback(() => {
    const container = containerRef.current
    const heading = headingRef.current
    const canvas = canvasRef.current
    if (!container || !heading || !canvas) return

    const containerRect = container.getBoundingClientRect()
    if (containerRect.width <= 0 || containerRect.height <= 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = containerRect.width
    const height = containerRect.height

    // Canvas size with padding for particle dispersion outside text bounds
    const padX = 140
    const padY = 80
    canvas.width = Math.floor((width + padX * 2) * dpr)
    canvas.height = Math.floor((height + padY * 2) * dpr)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    // Offscreen canvas for rasterizing text regions
    const offCanvas = document.createElement('canvas')
    offCanvas.width = Math.floor(width * dpr)
    offCanvas.height = Math.floor(height * dpr)
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true })
    if (!offCtx) return
    offCtx.scale(dpr, dpr)

    const computedStyle = window.getComputedStyle(heading)
    const font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`
    offCtx.font = font
    offCtx.textBaseline = 'top'

    const regions: Array<{
      ref: React.RefObject<HTMLSpanElement | null>
      region: 'left' | 'center' | 'right'
      defaultColor: string
      accentColors: string[]
    }> = [
      {
        ref: leftSpanRef,
        region: 'left',
        defaultColor: '#67A94B', // Emerald
        accentColors: ['#55C755', '#88D169', '#F5F7F2'],
      },
      {
        ref: centerSpanRef,
        region: 'center',
        defaultColor: '#F5F7F2', // Cloud white & gold highlights
        accentColors: ['#F5D547', '#E6D2A5', '#67A94B', '#FFFFFF'],
      },
      {
        ref: rightSpanRef,
        region: 'right',
        defaultColor: '#67A94B', // Emerald & gold
        accentColors: ['#88D169', '#F5D547', '#E6D2A5', '#55C755'],
      },
    ]

    const newParticles: TextParticle[] = []
    let seedCounter = 1

    regions.forEach(({ ref, region, defaultColor, accentColors }) => {
      const el = ref.current
      if (!el) return

      const text = el.innerText || el.textContent || ''
      const elRect = el.getBoundingClientRect()
      const x = elRect.left - containerRect.left
      const y = elRect.top - containerRect.top

      // Clear offscreen and render this region's text
      offCtx.clearRect(0, 0, width, height)
      offCtx.fillStyle = defaultColor
      offCtx.fillText(text, x, y)

      // Sample rasterized pixels
      const imgW = Math.max(1, Math.floor(elRect.width * dpr))
      const imgH = Math.max(1, Math.floor(elRect.height * dpr))
      const startX = Math.floor(x * dpr)
      const startY = Math.floor(y * dpr)

      if (startX + imgW > offCanvas.width || startY + imgH > offCanvas.height) return
      const imgData = offCtx.getImageData(startX, startY, imgW, imgH)
      const pixels = imgData.data

      // Adaptive sampling step: 3px desktop, 4px mobile (approx 350-500 particles total)
      const step = width < 768 ? 4 : 3

      for (let py = 0; py < imgH; py += step) {
        for (let px = 0; px < imgW; px += step) {
          const idx = (py * imgW + px) * 4
          const alpha = pixels[idx + 3]

          if (alpha > 70) {
            seedCounter++
            const rand1 = pseudoHash(seedCounter * 31.7)
            const rand2 = pseudoHash(seedCounter * 73.1)
            const rand3 = pseudoHash(seedCounter * 127.3)

            const originX = x + px / dpr
            const originY = y + py / dpr

            // Directional velocities based on region:
            let vx = 0
            let vy = -(rand2 * 75 + 25) // Upward bias

            if (region === 'left') {
              // Left region: predominantly left + upward
              vx = -(rand1 * 150 + 60)
              vy -= rand3 * 30
            } else if (region === 'center') {
              // Center region: scatters in multiple directions
              vx = (rand1 - 0.5) * 220
              vy -= rand3 * 45
            } else {
              // Right region: predominantly right + upward
              vx = rand1 * 150 + 60
              vy -= rand3 * 30
            }

            // Color selection
            let color = defaultColor
            if (rand3 < 0.35 && accentColors.length > 0) {
              color = accentColors[Math.floor(rand2 * accentColors.length)]
            }

            // Minecraft-inspired micro-voxel square (35% chance)
            const isVoxel = rand3 < 0.35
            const size = isVoxel ? rand1 * 1.5 + 2.0 : rand1 * 1.5 + 1.5
            const depth = 0.6 + rand2 * 0.8 // Depth variation: 0.6 to 1.4

            newParticles.push({
              originX: originX + padX, // Adjusted for canvas padding
              originY: originY + padY,
              vx,
              vy,
              size,
              color,
              isVoxel,
              depth,
              phase: rand3 * Math.PI * 2,
              region,
            })
          }
        }
      }
    })

    particlesRef.current = newParticles
    isSampledRef.current = true
  }, [])

  useEffect(() => {
    // Accessibility: check prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    isReducedMotionRef.current = motionQuery.matches

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotionRef.current = e.matches
    }
    motionQuery.addEventListener('change', handleMotionChange)

    // Wait for web fonts (Silkscreen / Press Start 2P) before sampling glyphs
    if (document.fonts) {
      document.fonts.ready.then(() => {
        sampleTextGlyphs()
      })
    } else {
      setTimeout(sampleTextGlyphs, 200)
    }

    const container = containerRef.current
    const heroEl = container?.closest('section') || container

    // 1. Passive Scroll Listener: measures normalized progress relative to hero height
    const handleScroll = () => {
      if (!heroEl || isReducedMotionRef.current) return
      const scrollY = window.scrollY || window.pageYOffset || 0
      const heroHeight = heroEl.offsetHeight || 550

      // Disintegration spans across the initial 450px of page scroll
      const raw = scrollY / (heroHeight * 0.75)
      targetScrollProgressRef.current = Math.min(1.0, Math.max(0, raw))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // 2. ResizeObserver to re-sample when viewport/layout changes
    const resizeObserver = new ResizeObserver(() => {
      sampleTextGlyphs()
    })
    if (container) resizeObserver.observe(container)

    // 3. 60 FPS Render Loop (Zero React Re-Renders)
    const renderLoop = () => {
      const targetP = targetScrollProgressRef.current
      currScrollProgressRef.current += (targetP - currScrollProgressRef.current) * 0.12

      const p = currScrollProgressRef.current
      const canvas = canvasRef.current
      const heading = headingRef.current

      if (canvas && heading) {
        const ctx = canvas.getContext('2d')
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        if (p <= 0.03) {
          // RESTING STATE: Heading fully readable, canvas cleared
          heading.style.opacity = '1'
          heading.style.transform = 'none'
          if (ctx) ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
          setIsDisintegrating(false)
        } else {
          setIsDisintegrating(true)

          // 0–15%: Fully visible. 15–30%: Characters slightly separate and fade out
          if (p < 0.15) {
            heading.style.opacity = '1'
            heading.style.transform = 'none'
          } else if (p < 0.32) {
            const fade = 1.0 - (p - 0.15) / 0.17
            heading.style.opacity = Math.max(0, fade).toFixed(3)
            // Slight character separation
            heading.style.letterSpacing = `${((p - 0.15) * 6).toFixed(1)}px`
          } else {
            heading.style.opacity = '0'
          }

          // Render Text Disintegration Particles on Canvas
          if (ctx && particlesRef.current.length > 0) {
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

            // Timeline:
            // 0-15%: 0 dispersion
            // 15-80%: Exponential dispersion
            // 80-100%: Fade into background
            const t = Math.max(0, (p - 0.12) / 0.88)
            const dispersalProgress = t * t // Quadratic acceleration

            const particles = particlesRef.current
            for (let i = 0; i < particles.length; i++) {
              const pt = particles[i]

              // Calculate dispersed position
              const swayX = Math.sin(t * 5 + pt.phase) * 10 * t
              const swayY = Math.cos(t * 4 + pt.phase) * 8 * t
              const curX = pt.originX + pt.vx * dispersalProgress * pt.depth + swayX
              const curY = pt.originY + pt.vy * dispersalProgress * pt.depth + swayY

              // Opacity calculation: fades out progressively between t = 0.55 and 1.0
              let alpha = 1.0
              if (t > 0.45) {
                alpha = Math.max(0, 1.0 - (t - 0.45) / 0.55)
              }

              if (alpha <= 0.01) continue

              const curSize = Math.max(0.8, pt.size * (1 - t * 0.35))

              ctx.globalAlpha = alpha
              ctx.fillStyle = pt.color

              if (pt.isVoxel) {
                // Micro-voxel square fragment
                ctx.fillRect(
                  Math.round(curX - curSize / 2),
                  Math.round(curY - curSize / 2),
                  Math.round(curSize),
                  Math.round(curSize)
                )
              } else {
                // Circular dust fragment
                ctx.beginPath()
                ctx.arc(curX, curY, curSize / 2, 0, Math.PI * 2)
                ctx.fill()
              }
            }
            ctx.globalAlpha = 1.0
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(renderLoop)
    }

    // 4. Tab Visibility Auto-Pause
    const handleVisibility = () => {
      if (document.hidden) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = null
        }
      } else {
        if (!animFrameRef.current) {
          animFrameRef.current = requestAnimationFrame(renderLoop)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    animFrameRef.current = requestAnimationFrame(renderLoop)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('scroll', handleScroll)
      motionQuery.removeEventListener('change', handleMotionChange)
      resizeObserver.disconnect()
    }
  }, [sampleTextGlyphs])

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full max-w-4xl mx-auto select-none ${className || ''}`}
    >
      {/* 1. Semantic Accessible DOM Heading (Maintains 100% original appearance at rest) */}
      <h1
        ref={headingRef}
        className="text-3xl sm:text-5xl lg:text-6xl font-pixel uppercase tracking-wide text-voxel-cloud leading-tight animate-hero-fade [animation-delay:700ms] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] will-change-transform"
      >
        <span ref={leftSpanRef} data-region="left" className="inline-block">
          YOUR VOICE.{' '}
        </span>
        <span ref={centerSpanRef} data-region="center" className="inline-block">
          YOUR WORDS.{' '}
        </span>
        <span
          ref={rightSpanRef}
          data-region="right"
          className="inline-block text-voxel-grass drop-shadow-[2px_2px_0px_#1D4427]"
        >
          EVERY LANGUAGE.
        </span>
      </h1>

      {/* 2. Text Disintegration Particle Canvas Overlay (Active when scrolling) */}
      <canvas
        ref={canvasRef}
        style={{
          left: '-140px',
          top: '-80px',
          width: 'calc(100% + 280px)',
          height: 'calc(100% + 160px)',
          opacity: isDisintegrating ? 1 : 0,
        }}
        className="absolute pointer-events-none transition-opacity duration-150 z-20"
      />
    </div>
  )
}
