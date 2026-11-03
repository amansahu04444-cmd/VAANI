/**
 * VAANI Cinematic Web Audio Engine
 * Royalty-free procedural ambient soundtrack, real-time AnalyserNode frequency extraction,
 * and subtle UI sound design.
 */

class AudioEngine {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private ambientGain: GainNode | null = null
  private uiGain: GainNode | null = null
  private masterGain: GainNode | null = null

  // Ambient synth nodes
  private oscillators: OscillatorNode[] = []
  private lfo: OscillatorNode | null = null
  private filter: BiquadFilterNode | null = null
  private isAmbientPlayingState = false
  private isMutedState = false
  private currentVolume = 0.35
  private uiSoundsEnabled = true

  // Media element source tracking to prevent multiple connections
  private connectedMediaSources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>()

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx()

      // Master output
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(this.isMutedState ? 0 : 1, this.ctx.currentTime)

      // Analyser Node for real-time frequency visualization
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 128 // 64 frequency bins
      this.analyser.smoothingTimeConstant = 0.82

      // Gains
      this.ambientGain = this.ctx.createGain()
      this.ambientGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime)

      this.uiGain = this.ctx.createGain()
      this.uiGain.gain.setValueAtTime(0.2, this.ctx.currentTime)

      // Routing: Ambient -> AmbientGain -> Analyser -> MasterGain -> Destination
      this.ambientGain.connect(this.analyser)
      this.uiGain.connect(this.masterGain)
      this.analyser.connect(this.masterGain)
      this.masterGain.connect(this.ctx.destination)
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }

    return this.ctx
  }

  /**
   * Start procedural cinematic ambient soundtrack
   * Soft, evolving harmonic pads in C minor / pentatonic with resonant low-pass filter LFO
   */
  public startAmbient(): void {
    if (this.isAmbientPlayingState) return

    const ctx = this.initContext()
    const now = ctx.currentTime

    // Stop any dangling nodes
    this.stopAmbientNodes()

    // Create warm resonant filter
    this.filter = ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.setValueAtTime(420, now)
    this.filter.Q.setValueAtTime(2.2, now)

    // Gentle LFO for breathing filter movement (0.1 Hz)
    this.lfo = ctx.createOscillator()
    this.lfo.type = 'sine'
    this.lfo.frequency.setValueAtTime(0.08, now)

    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(180, now)
    this.lfo.connect(lfoGain)
    if (this.filter) {
      lfoGain.connect(this.filter.frequency)
    }

    // Frequencies: C3 (130.81Hz), G3 (196.00Hz), D#4 (311.13Hz), A#4 (466.16Hz)
    const chordFrequencies = [130.81, 131.2, 196.0, 311.13, 466.16]

    this.oscillators = chordFrequencies.map((freq, idx) => {
      const osc = ctx.createOscillator()
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq, now)

      // Slight detune for lush cinematic thickness
      osc.detune.setValueAtTime((idx - 2) * 4, now)

      if (this.filter) {
        osc.connect(this.filter)
      }
      osc.start(now)
      return osc
    })

    if (this.lfo) this.lfo.start(now)

    // Connect filter to ambient gain with smooth attack
    if (this.filter && this.ambientGain) {
      this.filter.connect(this.ambientGain)
      this.ambientGain.gain.cancelScheduledValues(now)
      this.ambientGain.gain.setValueAtTime(0.001, now)
      this.ambientGain.gain.linearRampToValueAtTime(this.currentVolume, now + 1.8)
    }

    this.isAmbientPlayingState = true
  }

  /**
   * Stop ambient soundtrack with smooth fade-out
   */
  public stopAmbient(): void {
    if (!this.isAmbientPlayingState || !this.ctx || !this.ambientGain) return

    const now = this.ctx.currentTime
    this.ambientGain.gain.cancelScheduledValues(now)
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now)
    this.ambientGain.gain.linearRampToValueAtTime(0.001, now + 1.2)

    setTimeout(() => {
      this.stopAmbientNodes()
      this.isAmbientPlayingState = false
    }, 1250)
  }

  private stopAmbientNodes(): void {
    this.oscillators.forEach((osc) => {
      try {
        osc.stop()
        osc.disconnect()
      } catch {
        // Already stopped
      }
    })
    this.oscillators = []

    if (this.lfo) {
      try {
        this.lfo.stop()
        this.lfo.disconnect()
      } catch {
        // Ignored
      }
      this.lfo = null
    }

    if (this.filter) {
      try {
        this.filter.disconnect()
      } catch {
        // Ignored
      }
      this.filter = null
    }
  }

  public setVolume(vol: number): void {
    this.currentVolume = Math.max(0, Math.min(1, vol))
    if (this.ctx && this.ambientGain && this.isAmbientPlayingState) {
      const now = this.ctx.currentTime
      this.ambientGain.gain.cancelScheduledValues(now)
      this.ambientGain.gain.linearRampToValueAtTime(this.currentVolume, now + 0.1)
    }
  }

  public toggleMute(): boolean {
    this.isMutedState = !this.isMutedState
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(this.isMutedState ? 0 : 1, now)
    }
    return this.isMutedState
  }

  public toggleUiSounds(): boolean {
    this.uiSoundsEnabled = !this.uiSoundsEnabled
    return this.uiSoundsEnabled
  }

  /**
   * Subtle UI Sound Effects
   */
  public playUiSound(type: 'click' | 'success' | 'generate' | 'nav'): void {
    if (!this.uiSoundsEnabled || this.isMutedState) return

    const ctx = this.initContext()
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    if (type === 'click') {
      // 12ms subtle wooden click
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1100, now)
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.015)

      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015)

      osc.connect(gain)
      if (this.uiGain) gain.connect(this.uiGain)

      osc.start(now)
      osc.stop(now + 0.02)
    } else if (type === 'nav') {
      // 20ms gentle air swoosh
      osc.type = 'sine'
      osc.frequency.setValueAtTime(450, now)
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.025)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025)

      osc.connect(gain)
      if (this.uiGain) gain.connect(this.uiGain)

      osc.start(now)
      osc.stop(now + 0.03)
    } else if (type === 'success') {
      // Warm C5 -> G5 harmonic chime (220ms)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now)
      osc.frequency.setValueAtTime(783.99, now + 0.08)

      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

      osc.connect(gain)
      if (this.uiGain) gain.connect(this.uiGain)

      osc.start(now)
      osc.stop(now + 0.26)
    } else if (type === 'generate') {
      // Futuristic harmonic completion chime (320ms)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, now) // E5
      osc.frequency.setValueAtTime(987.77, now + 0.09) // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.18) // E6

      gain.gain.setValueAtTime(0.16, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc.connect(gain)
      if (this.uiGain) gain.connect(this.uiGain)

      osc.start(now)
      osc.stop(now + 0.36)
    }
  }

  /**
   * Connect an HTMLAudioElement (like SpeechStudio player) to the AnalyserNode
   * so speech output drives the visualizer
   */
  public connectMediaElement(audioEl: HTMLAudioElement): void {
    const ctx = this.initContext()

    if (!this.connectedMediaSources.has(audioEl)) {
      try {
        const source = ctx.createMediaElementSource(audioEl)
        if (this.analyser) {
          source.connect(this.analyser)
        }
        this.connectedMediaSources.set(audioEl, source)
      } catch {
        // Media element already bound
      }
    }
  }

  /**
   * Frequency data retrieval for AnalyserNode visualizer
   */
  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array as unknown as Uint8Array<ArrayBuffer>)
    } else {
      array.fill(0)
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array as unknown as Uint8Array<ArrayBuffer>)
    } else {
      array.fill(128)
    }
  }

  public isAmbientPlaying(): boolean {
    return this.isAmbientPlayingState
  }

  public isMuted(): boolean {
    return this.isMutedState
  }

  public getVolume(): number {
    return this.currentVolume
  }

  public areUiSoundsEnabled(): boolean {
    return this.uiSoundsEnabled
  }
}

export const audioEngine = new AudioEngine()

