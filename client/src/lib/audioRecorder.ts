/**
 * VAANI Audio Recording & Normalization Utilities
 *
 * Ensures all audio recorded or uploaded via the browser is transformed into
 * a pristine, 16,000 Hz, 1-channel (mono), 16-bit Linear PCM WAV file.
 *
 * This completely eliminates the Gnani AI Voice Cloning HTTP 500 error caused by
 * unsupported browser WebM/Opus compressed audio payloads.
 */

export function downsampleFloat32(
  buffer: Float32Array,
  fromRate: number,
  toRate: number = 16000
): Float32Array {
  if (fromRate === toRate) return buffer
  const ratio = fromRate / toRate
  const newLength = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLength)
  for (let i = 0; i < newLength; i++) {
    const origIndex = i * ratio
    const i1 = Math.floor(origIndex)
    const i2 = Math.min(i1 + 1, buffer.length - 1)
    const frac = origIndex - i1
    result[i] = buffer[i1] * (1 - frac) + buffer[i2] * frac
  }
  return result
}

/**
 * Encodes a Float32Array of audio samples into a standard 16-bit PCM WAV Blob.
 */
export function encodeWavBlob(samples: Float32Array, sampleRate: number = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  // 1. RIFF chunk descriptor
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')

  // 2. "fmt " subchunk
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true) // AudioFormat (1 = Linear PCM)
  view.setUint16(22, 1, true) // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true) // SampleRate (16000 Hz)
  view.setUint32(28, sampleRate * 2, true) // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true) // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true) // BitsPerSample (16 bits)

  // 3. "data" subchunk
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true) // Subchunk2Size (NumSamples * NumChannels * BitsPerSample/8)

  // 4. PCM 16-bit samples
  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return new Blob([view], { type: 'audio/wav' })
}

/**
 * Converts a Blob to a base64 Data URL string.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Normalizes any uploaded audio file or blob into 16kHz 16-bit Mono PCM WAV
 * using the browser's native Web Audio API decoder.
 */
export async function normalizeToWav(
  fileOrBlob: Blob,
  targetSampleRate: number = 16000
): Promise<{ blob: Blob; durationSec: number; base64: string }> {
  const arrayBuffer = await fileOrBlob.arrayBuffer()
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) {
    throw new Error('Web Audio API is not supported in this browser.')
  }

  const ctx = new AudioCtx()

  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer)
    const channel0 = decoded.numberOfChannels > 0 ? decoded.getChannelData(0) : new Float32Array(0)

    // Downmix to mono if multi-channel
    let monoSamples: Float32Array
    if (decoded.numberOfChannels > 1) {
      monoSamples = new Float32Array(decoded.length)
      for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
        const chData = decoded.getChannelData(ch)
        for (let i = 0; i < decoded.length; i++) {
          monoSamples[i] += chData[i] / decoded.numberOfChannels
        }
      }
    } else {
      monoSamples = channel0
    }

    const downsampled = downsampleFloat32(monoSamples, decoded.sampleRate, targetSampleRate)
    const wavBlob = encodeWavBlob(downsampled, targetSampleRate)
    const durationSec = Math.round(decoded.duration)
    const base64 = await blobToBase64(wavBlob)

    return { blob: wavBlob, durationSec, base64 }
  } finally {
    await ctx.close().catch(() => {})
  }
}

/**
 * Dedicated In-Browser PCM WAV Audio Recorder.
 * Captures microphone stream directly as uncompressed 16-bit PCM WAV.
 */
export class BrowserPcmRecorder {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private silenceGain: GainNode | null = null
  private chunks: Float32Array[] = []
  private totalSamples = 0
  private onRmsVolume?: (volume: number) => void

  constructor(onRmsVolume?: (volume: number) => void) {
    this.onRmsVolume = onRmsVolume
  }

  async start(): Promise<void> {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) {
      throw new Error('Web Audio API is not supported in this browser.')
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone recording is not supported in this browser.')
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    this.ctx = new AudioCtx()
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1)
    this.chunks = []
    this.totalSamples = 0

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const copy = new Float32Array(input.length)
      copy.set(input)
      this.chunks.push(copy)
      this.totalSamples += input.length

      if (this.onRmsVolume) {
        let sum = 0
        for (let i = 0; i < input.length; i++) {
          sum += input[i] * input[i]
        }
        const rms = Math.sqrt(sum / input.length)
        this.onRmsVolume(Math.min(1, rms * 5))
      }
    }

    // Connect audio pipeline: source -> processor -> silence -> destination
    // Silence gain (0) prevents feedback echo through user speakers while keeping processor active
    this.silenceGain = this.ctx.createGain()
    this.silenceGain.gain.value = 0
    this.source.connect(this.processor)
    this.processor.connect(this.silenceGain)
    this.silenceGain.connect(this.ctx.destination)
  }

  async stop(): Promise<{ blob: Blob; durationSec: number; base64: string }> {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
    }
    if (this.source && this.processor) {
      this.source.disconnect()
      this.processor.disconnect()
    }
    if (this.silenceGain) {
      this.silenceGain.disconnect()
    }

    const currentRate = this.ctx ? this.ctx.sampleRate : 16000
    if (this.ctx) {
      await this.ctx.close().catch(() => {})
    }

    // Flatten all captured chunks
    const combined = new Float32Array(this.totalSamples)
    let offset = 0
    for (const chunk of this.chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    // Downsample to 16,000 Hz if recorded at different hardware rate (e.g. 48kHz or 44.1kHz)
    const targetRate = 16000
    const downsampled = downsampleFloat32(combined, currentRate, targetRate)
    const wavBlob = encodeWavBlob(downsampled, targetRate)
    const durationSec = Math.max(1, Math.round(combined.length / currentRate))
    const base64 = await blobToBase64(wavBlob)

    return { blob: wavBlob, durationSec, base64 }
  }

  cancel(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
    }
    if (this.source && this.processor) {
      this.source.disconnect()
      this.processor.disconnect()
    }
    if (this.silenceGain) {
      this.silenceGain.disconnect()
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {})
    }
    this.chunks = []
    this.totalSamples = 0
  }
}
