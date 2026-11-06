/**
 * VAANI Audio Utilities
 * Validates audio magic bytes, repairs unfinalized streaming WAV headers,
 * wraps raw PCM into standard browser-playable RIFF WAV files, and extracts duration.
 */

/**
 * Generates a valid 48kHz 16-bit PCM WAV audio buffer with pleasant musical tones.
 */
export function generateDeterministicWav(durationSeconds: number = 5, baseFreq: number = 440): Buffer {
  const sampleRate = 48000
  const numChannels = 1
  const bytesPerSample = 2
  const totalSamples = Math.floor(sampleRate * durationSeconds)
  const dataSize = totalSamples * numChannels * bytesPerSample

  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28)
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  // Harmonic chord decay
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate
    const f1 = Math.sin(2 * Math.PI * baseFreq * t)
    const f2 = Math.sin(2 * Math.PI * (baseFreq * 1.25) * t) * 0.5 // Major third
    const f3 = Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.35 // Fifth
    const envelope = Math.exp(-t * 0.25)
    const sampleVal = (f1 + f2 + f3) * envelope * 10000
    buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.floor(sampleVal))), 44 + i * 2)
  }

  return buffer
}

export interface AudioInspectionResult {
  isValid: boolean
  format: 'wav' | 'mp3' | 'ogg' | 'webm' | 'flac' | 'm4a' | 'raw' | 'unknown'
  mimeType: string
  fileSize: number
  sampleRate: number
  channels: number
  bitsPerSample: number
  durationMs: number
}

/**
 * Inspects audio buffer and checks magic file signatures.
 */
export function inspectAudioBuffer(buffer: Buffer): AudioInspectionResult {
  const fileSize = buffer.length

  if (!buffer || fileSize < 4) {
    return {
      isValid: false,
      format: 'unknown',
      mimeType: 'application/octet-stream',
      fileSize: 0,
      sampleRate: 0,
      channels: 0,
      bitsPerSample: 0,
      durationMs: 0,
    }
  }

  // 1. Check WebM / Matroska EBML signature (0x1A 0x45 0xDF 0xA3)
  const isWebm =
    fileSize >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3

  if (isWebm) {
    return {
      isValid: false,
      format: 'webm',
      mimeType: 'audio/webm',
      fileSize,
      sampleRate: 0,
      channels: 0,
      bitsPerSample: 0,
      durationMs: 0,
    }
  }

  // 2. Check RIFF / WAVE signature
  const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF'
  const isWave = fileSize >= 12 && buffer.subarray(8, 12).toString('ascii') === 'WAVE'

  if (isRiff && isWave) {
    let sampleRate = 48000
    let channels = 1
    let bitsPerSample = 16

    // Read fmt subchunk if present
    if (fileSize >= 36 && buffer.subarray(12, 16).toString('ascii') === 'fmt ') {
      channels = buffer.readUInt16LE(22) || 1
      sampleRate = buffer.readUInt32LE(24) || 48000
      bitsPerSample = buffer.readUInt16LE(34) || 16
    }

    const bytesPerSec = sampleRate * channels * (bitsPerSample / 8)
    const dataSize = Math.max(0, fileSize - 44)
    const durationMs = bytesPerSec > 0 ? Math.round((dataSize / bytesPerSec) * 1000) : 0

    return {
      isValid: true,
      format: 'wav',
      mimeType: 'audio/wav',
      fileSize,
      sampleRate,
      channels,
      bitsPerSample,
      durationMs,
    }
  }

  // 3. Check MP3 signature (ID3 header or syncword 0xFFE0)
  const isId3 = buffer.subarray(0, 3).toString('ascii') === 'ID3'
  const isMp3Sync = (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  if (isId3 || isMp3Sync) {
    return {
      isValid: true,
      format: 'mp3',
      mimeType: 'audio/mpeg',
      fileSize,
      sampleRate: 44100,
      channels: 2,
      bitsPerSample: 16,
      durationMs: Math.round((fileSize / (128 * 1024 / 8)) * 1000), // rough estimate for 128kbps
    }
  }

  // 4. Check OGG signature
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') {
    return {
      isValid: true,
      format: 'ogg',
      mimeType: 'audio/ogg',
      fileSize,
      sampleRate: 48000,
      channels: 1,
      bitsPerSample: 16,
      durationMs: 0,
    }
  }

  // 5. Check FLAC signature (fLaC)
  if (buffer.subarray(0, 4).toString('ascii') === 'fLaC') {
    return {
      isValid: true,
      format: 'flac',
      mimeType: 'audio/flac',
      fileSize,
      sampleRate: 44100,
      channels: 2,
      bitsPerSample: 16,
      durationMs: 0,
    }
  }

  // 6. Check M4A / MP4 container (ftyp)
  if (fileSize >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    return {
      isValid: true,
      format: 'm4a',
      mimeType: 'audio/mp4',
      fileSize,
      sampleRate: 44100,
      channels: 2,
      bitsPerSample: 16,
      durationMs: 0,
    }
  }

  // 7. Raw PCM (Linear16)
  const sampleRate = 48000
  const channels = 1
  const bitsPerSample = 16
  const bytesPerSec = sampleRate * channels * (bitsPerSample / 8)
  const durationMs = Math.round((fileSize / bytesPerSec) * 1000)

  return {
    isValid: true,
    format: 'raw',
    mimeType: 'audio/wav',
    fileSize,
    sampleRate,
    channels,
    bitsPerSample,
    durationMs,
  }
}

/**
 * Ensures an audio buffer is a 100% valid, browser-playable RIFF WAV file.
 * - If the buffer is WebM: throws an explicit error (never wrap WebM with a WAV header).
 * - If the buffer is RIFF/WAVE: repairs unfinalized 0xFFFFFFFF chunk sizes to exact length.
 * - If the buffer is raw PCM (no header): wraps it with standard 44-byte WAV header.
 * - If MP3/OGG/FLAC/M4A: leaves as-is.
 */
export function ensureValidWavBuffer(
  buffer: Buffer,
  sampleRate: number = 48000,
  channels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  if (!buffer || buffer.length === 0) {
    throw new Error('AUDIO_BUFFER_EMPTY: Cannot process empty audio buffer.')
  }

  // 1. Explicitly reject WebM containers
  const isWebm =
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3

  if (isWebm) {
    throw new Error(
      'AUDIO_FORMAT_UNSUPPORTED: Buffer contains WebM audio container. Gnani AI requires uncompressed 16-bit PCM WAV or MP3 audio.'
    )
  }

  // 2. If buffer has RIFF / WAVE signature, fix unfinalized stream sizes
  const isRiff = buffer.subarray(0, 4).toString('ascii') === 'RIFF'
  const isWave = buffer.length >= 12 && buffer.subarray(8, 12).toString('ascii') === 'WAVE'

  if (isRiff && isWave) {
    const patched = Buffer.from(buffer)
    const riffSize = patched.readUInt32LE(4)
    if (riffSize === 0xffffffff || riffSize === 0) {
      patched.writeUInt32LE(patched.length - 8, 4)
    }

    // Locate data chunk
    for (let i = 12; i < Math.min(patched.length - 8, 100); i++) {
      if (patched.subarray(i, i + 4).toString('ascii') === 'data') {
        const dataSize = patched.readUInt32LE(i + 4)
        if (dataSize === 0xffffffff || dataSize === 0) {
          patched.writeUInt32LE(patched.length - (i + 8), i + 4)
        }
        break
      }
    }

    return patched
  }

  // 3. If buffer is compressed container (MP3, OGG, FLAC, M4A), return as-is
  const isId3 = buffer.subarray(0, 3).toString('ascii') === 'ID3'
  const isMp3 = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0
  const isOgg = buffer.subarray(0, 4).toString('ascii') === 'OggS'
  const isFlac = buffer.subarray(0, 4).toString('ascii') === 'fLaC'
  const isM4a = buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp'
  if (isId3 || isMp3 || isOgg || isFlac || isM4a) {
    return buffer
  }

  // 4. Raw PCM: prepend 44-byte WAV header
  const bytesPerSample = bitsPerSample / 8
  const dataSize = buffer.length
  const header = Buffer.alloc(44)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)

  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // Subchunk1Size
  header.writeUInt16LE(1, 20) // PCM format
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * bytesPerSample, 28) // ByteRate
  header.writeUInt16LE(channels * bytesPerSample, 32) // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34)

  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, buffer])
}
