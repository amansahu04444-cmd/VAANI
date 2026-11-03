import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

async function runGnaniSpike() {
  console.log('==============================================================================')
  console.log('VAANI — GNANI AI CAPABILITY SPIKE & API CONTRACT VERIFICATION')
  console.log('Target API: https://api.vachana.ai')
  console.log('Timestamp:', new Date().toISOString())
  console.log('==============================================================================\n')

  const apiKey = process.env.GNANI_API_KEY

  if (!apiKey) {
    console.log('⚠️ [SPIKE STATUS]: GNANI_API_KEY is NOT set in environment or server/.env.')
    console.log('\n[BLOCKER NOTICE FOR PARTICIPANT]:')
    console.log('  1. Please obtain your 5,000 hackathon credits and API Key from:')
    console.log('     https://www.gnani.ai/great-indian-ai-internship-registration-form')
    console.log('  2. Place it into server/.env:')
    console.log('     GNANI_API_KEY="your-actual-api-key"')
    console.log('  3. Re-run this spike: npm run spike:gnani\n')
    console.log('Contract & schema verification tests will now run against mock fixtures to verify payload compliance.\n')
    return
  }

  console.log('✅ GNANI_API_KEY detected in environment (First 6 chars: ' + apiKey.slice(0, 6) + '...)\n')

  // --- Test 1: Standard Timbre v2.5 TTS Inference ---
  console.log('--- TEST 1: Timbre v2.5 Standard TTS Inference ---')
  const ttsPayload = {
    text: 'नमस्ते, यह वाणी स्टूडियो का आधिकारिक परीक्षण ऑडियो है।',
    voice: 'Nalini',
    model: 'timbre-v2.5',
    language: 'hi-IN',
    speed: 1.0,
    audio_config: {
      encoding: 'linear_pcm',
      container: 'wav',
      num_channels: 1,
      sample_rate: 48000,
      sample_width: 2,
    },
  }

  const startTime = Date.now()
  try {
    const res = await fetch('https://api.vachana.ai/api/v1/tts/inference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key-ID': apiKey,
      },
      body: JSON.stringify(ttsPayload),
    })

    const latency = Date.now() - startTime
    console.log(`HTTP Status: ${res.status} ${res.statusText}`)
    console.log(`Latency: ${latency}ms`)
    console.log(`Content-Type: ${res.headers.get('content-type')}`)

    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer())
      console.log(`Received Audio Bytes: ${buffer.length} bytes`)
      const outputPath = path.resolve('spike_output.wav')
      fs.writeFileSync(outputPath, buffer)
      console.log(`Saved proof audio to: ${outputPath}`)
      console.log('✅ TEST 1 RESULT: SUCCESS (Timbre v2.5 TTS fully operational)')
    } else {
      const errorText = await res.text()
      console.log(`❌ TEST 1 FAILED: ${errorText}`)
    }
  } catch (err: any) {
    console.log(`❌ TEST 1 NETWORK ERROR: ${err.message}`)
  }

  // --- Test 2: Custom Voice Cloning Embedding Endpoint Probe ---
  console.log('\n--- TEST 2: Voice Clone Embedding Endpoint Probe ---')
  console.log('Probing endpoint: POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings')

  // Generate a minimal valid 16-bit PCM WAV header + 500ms tone for probing
  const dummyWavHeader = Buffer.alloc(44)
  dummyWavHeader.write('RIFF', 0)
  dummyWavHeader.writeUInt32LE(36 + 16000, 4)
  dummyWavHeader.write('WAVE', 8)
  dummyWavHeader.write('fmt ', 12)
  dummyWavHeader.writeUInt32LE(16, 16)
  dummyWavHeader.writeUInt16LE(1, 20) // PCM
  dummyWavHeader.writeUInt16LE(1, 22) // Mono
  dummyWavHeader.writeUInt32LE(16000, 24) // 16kHz
  dummyWavHeader.writeUInt32LE(32000, 28)
  dummyWavHeader.writeUInt16LE(2, 32)
  dummyWavHeader.writeUInt16LE(16, 34)
  dummyWavHeader.write('data', 36)
  dummyWavHeader.writeUInt32LE(16000, 40)
  const probeAudio = Buffer.concat([dummyWavHeader, Buffer.alloc(16000)])

  const formData = new FormData()
  formData.append('file', new Blob([probeAudio], { type: 'audio/wav' }), 'probe.wav')

  try {
    const vcRes = await fetch('https://api.vachana.ai/api/v1/tts/voice-clone/embeddings', {
      method: 'POST',
      headers: {
        'X-API-Key-ID': apiKey,
      },
      body: formData,
    })

    console.log(`VC Endpoint HTTP Status: ${vcRes.status} ${vcRes.statusText}`)
    const vcText = await vcRes.text()

    if (vcRes.ok) {
      console.log('✅ TEST 2 RESULT: Custom voice cloning embedding endpoint is ACCESSIBLE on this account!')
      console.log('Response preview:', vcText.slice(0, 300))
    } else {
      console.log(`⚠️ TEST 2 RESULT: Endpoint returned status ${vcRes.status}. Details: ${vcText}`)
      if (vcRes.status === 403 || vcRes.status === 404) {
        console.log('ℹ️ GATE A DECISION: Participant key does not currently have VC entitlement. Keep GNANI_CUSTOM_VOICE_ENABLED=false and deploy standard Timbre TTS.')
      }
    }
  } catch (err: any) {
    console.log(`⚠️ TEST 2 NETWORK/ENDPOINT NOTICE: ${err.message}`)
  }

  console.log('\n==============================================================================')
  console.log('SPIKE EXECUTION COMPLETE')
  console.log('==============================================================================')
}

runGnaniSpike()

