/**
 * VAANI Cinematic Particle Engine
 * 3-layer depth particle system with micro-voxel elements,
 * mouse repulsion physics, and Web Audio reactivity.
 */

export type ParticleLayer = 'background' | 'midground' | 'foreground'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  layer: ParticleLayer
  color: string
  baseAlpha: number
  alpha: number
  isVoxel: boolean
  depth: number
  phase: number
  dispX: number
  dispY: number
}

export class ParticleEngine {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private width = 0
  private height = 0
  private dpr = 1

  private particles: Particle[] = []

  // Smoothed pointer coordinates & repulsion physics
  private targetPointerX = -1000
  private targetPointerY = -1000
  private currPointerX = -1000
  private currPointerY = -1000
  private pointerActive = false
  private isTouchDevice = false
  private isReducedMotion = false

  // Audio energy inputs
  private bassEnergy = 0
  private midEnergy = 0
  private trebleEnergy = 0

  public init(canvas: HTMLCanvasElement, container: HTMLElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: true })

    const touchQuery = window.matchMedia('(pointer: coarse)')
    const hoverQuery = window.matchMedia('(hover: hover)')
    this.isTouchDevice = touchQuery.matches || !hoverQuery.matches

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.isReducedMotion = motionQuery.matches

    this.resize(container)
  }

  public resize(container: HTMLElement): void {
    if (!this.canvas || !this.ctx) return

    const rect = container.getBoundingClientRect()
    this.width = rect.width
    this.height = rect.height

    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.floor(this.width * this.dpr)
    this.canvas.height = Math.floor(this.height * this.dpr)

    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.scale(this.dpr, this.dpr)

    this.initParticles()
  }

  private initParticles(): void {
    this.particles = []
    if (this.width <= 0 || this.height <= 0) return

    // Viewport-adaptive particle density
    let count = 160
    if (this.width < 768) {
      count = 45 // Mobile
    } else if (this.width < 1024) {
      count = 85 // Tablet
    }

    // Color definitions
    const emeraldColors = ['#67A94B', '#55C755', '#4D8236', '#88D169']
    const goldColors = ['#F5D547', '#E6D2A5', '#D1B02B']
    const dimGreenColors = ['#285C35', '#1E4427', '#336B41']

    for (let i = 0; i < count; i++) {
      // 55% Background, 30% Midground, 15% Foreground
      const layerRoll = Math.random()
      let layer: ParticleLayer
      let size: number
      let depth: number
      let baseAlpha: number
      let color: string
      let speedMult: number
      let isVoxel = false

      if (layerRoll < 0.55) {
        // BACKGROUND: Tiny, dim green, slow, atmospheric depth
        layer = 'background'
        size = Math.random() * 1.2 + 0.8 // 0.8 - 2.0px
        depth = 0.3
        baseAlpha = Math.random() * 0.2 + 0.12 // 0.12 - 0.32
        color = dimGreenColors[Math.floor(Math.random() * dimGreenColors.length)]
        speedMult = 0.4
      } else if (layerRoll < 0.85) {
        // MIDGROUND: Emerald green, medium speed, moderate glow
        layer = 'midground'
        size = Math.random() * 1.5 + 1.5 // 1.5 - 3.0px
        depth = 0.65
        baseAlpha = Math.random() * 0.3 + 0.35 // 0.35 - 0.65
        color = emeraldColors[Math.floor(Math.random() * emeraldColors.length)]
        speedMult = 0.75
      } else {
        // FOREGROUND: Emerald + warm gold, slightly faster, occasional micro-voxel
        layer = 'foreground'
        size = Math.random() * 1.8 + 2.2 // 2.2 - 4.0px
        depth = 1.0
        baseAlpha = Math.random() * 0.3 + 0.55 // 0.55 - 0.85
        speedMult = 1.1

        // 35% chance to be gold, 65% emerald
        if (Math.random() < 0.35) {
          color = goldColors[Math.floor(Math.random() * goldColors.length)]
        } else {
          color = emeraldColors[Math.floor(Math.random() * emeraldColors.length)]
        }

        // Occasional micro-voxel square (voxel identity)
        isVoxel = Math.random() < 0.3
      }

      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.25 * speedMult,
        vy: -(Math.random() * 0.35 + 0.15) * speedMult, // Gentle upward buoyant drift
        size,
        layer,
        color,
        baseAlpha,
        alpha: baseAlpha,
        isVoxel,
        depth,
        phase: Math.random() * Math.PI * 2,
        dispX: 0,
        dispY: 0,
      })
    }
  }

  public setPointer(relX: number, relY: number): void {
    if (this.isTouchDevice || this.isReducedMotion) return
    this.targetPointerX = relX
    this.targetPointerY = relY
    this.pointerActive = true
  }

  public clearPointer(): void {
    this.pointerActive = false
    this.targetPointerX = -1000
    this.targetPointerY = -1000
  }

  public setAudioEnergy(bass: number, mid: number, treble: number): void {
    this.bassEnergy = bass
    this.midEnergy = mid
    this.trebleEnergy = treble
  }

  public update(): void {
    if (!this.ctx || this.width <= 0 || this.height <= 0) return

    // Smooth pointer damping
    this.currPointerX += (this.targetPointerX - this.currPointerX) * 0.15
    this.currPointerY += (this.targetPointerY - this.currPointerY) * 0.15

    const repulsionRadius = 130
    const maxRepulsionForce = 45

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]

      if (!this.isReducedMotion) {
        // Natural floating movement with sinusoidal horizontal oscillation
        p.phase += 0.015 * (p.depth + 0.5)
        const waveSway = Math.sin(p.phase) * 0.15 * p.depth

        p.x += p.vx + waveSway
        p.y += p.vy + (this.bassEnergy * -0.2 * p.depth) // Audio lift on bass pulse

        // Wrap around boundaries with comfortable margins
        if (p.x < -20) p.x = this.width + 20
        if (p.x > this.width + 20) p.x = -20
        if (p.y < -20) p.y = this.height + 20
        if (p.y > this.height + 20) p.y = -20
      }

      // Cursor Repulsion Physics with Smooth Quartic Gaussian Falloff
      if (this.pointerActive && !this.isTouchDevice && !this.isReducedMotion) {
        const dx = (p.x + p.dispX) - this.currPointerX
        const dy = (p.y + p.dispY) - this.currPointerY
        const dist = Math.hypot(dx, dy)

        if (dist < repulsionRadius && dist > 1) {
          const u = dist / repulsionRadius
          const falloff = (1 - u * u) * (1 - u * u) // Quartic smoothstep
          const force = (maxRepulsionForce / dist) * falloff * p.depth

          p.dispX += (dx * force - p.dispX) * 0.2
          p.dispY += (dy * force - p.dispY) * 0.2
        } else {
          // Smooth return damping
          p.dispX *= 0.92
          p.dispY *= 0.92
        }
      } else {
        // Smooth return damping when pointer is inactive
        p.dispX *= 0.92
        p.dispY *= 0.92
      }

      // Audio Shimmer Modulation (treble gives gentle twinkle)
      p.alpha = Math.min(
        1.0,
        p.baseAlpha * (1 + this.trebleEnergy * 0.45 * p.depth + Math.sin(p.phase * 0.5) * 0.1)
      )
    }
  }

  public draw(): void {
    if (!this.ctx || this.width <= 0 || this.height <= 0) return

    this.ctx.clearRect(0, 0, this.width, this.height)

    // Render particles by layer to maintain correct depth composition
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      const drawX = p.x + p.dispX
      const drawY = p.y + p.dispY

      this.ctx.globalAlpha = p.alpha
      this.ctx.fillStyle = p.color

      if (p.isVoxel) {
        // Minecraft-inspired micro-voxel square particle
        const s = Math.round(p.size)
        this.ctx.fillRect(Math.round(drawX - s / 2), Math.round(drawY - s / 2), s, s)
      } else {
        // Smooth circular acoustic particle
        this.ctx.beginPath()
        this.ctx.arc(drawX, drawY, p.size / 2, 0, Math.PI * 2)
        this.ctx.fill()
      }
    }

    this.ctx.globalAlpha = 1.0
  }

  public destroy(): void {
    this.particles = []
    this.canvas = null
    this.ctx = null
  }
}
