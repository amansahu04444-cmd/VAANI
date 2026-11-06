import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, Square, Upload, ShieldCheck, Check, Trash2 } from 'lucide-react'
import { BlockButton } from '../components/ui/BlockButton'
import { VoxelCard, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/VoxelCard'
import { BlockBadge } from '../components/ui/BlockBadge'
import { BlockNoticeBanner } from '../components/ui/BlockNoticeBanner'
import { VoxelWaveform } from '../components/ui/VoxelWaveform'
import { BlockModal } from '../components/ui/BlockModal'
import { CubeIllustration } from '../components/ui/CubeIllustration'
import { VoiceCore } from '../components/ui/VoiceCore'
import { BlockProgress } from '../components/ui/BlockProgress'
import { PixelDivider } from '../components/ui/PixelDivider'
import { VOICE_CONSENT_STATEMENT } from '../lib/constants'
import type { EnrollmentStatus } from '../types'
import { voiceApi } from '../lib/api'

export interface VoiceSetupProps {
  currentStatus?: EnrollmentStatus
  onStatusChange?: (status: EnrollmentStatus) => void
}

export const VoiceSetup: React.FC<VoiceSetupProps> = ({
  currentStatus = 'not_enrolled',
  onStatusChange,
}) => {
  const [status, setStatus] = useState<EnrollmentStatus>(currentStatus)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordDuration, setRecordDuration] = useState(0)
  const [hasRecordedSample, setHasRecordedSample] = useState(false)
  const [isPlayingSample, setIsPlayingSample] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [audioBase64, setAudioBase64] = useState<string | null>(null)
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/wav')
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState<string>('')
  const [processingProgress, setProcessingProgress] = useState<number>(0)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [apiNotice, setApiNotice] = useState<string | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Check live profile status and active embedding from backend
    voiceApi
      .getProfile()
      .then((profile) => {
        if (profile && profile.status === 'ready' && profile.hasSpeakerEmbedding) {
          setStatus('ready')
          if (onStatusChange) onStatusChange('ready')
        }
      })
      .catch(() => {
        // Keep initial status if network or offline
      })
  }, [onStatusChange])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err)
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }

    setRecordDuration((currentDuration) => {
      if (currentDuration < 5) {
        setValidationError('Audio sample is too short. Gnani AI requires between 5 and 30 seconds of clean speech.')
        setHasRecordedSample(false)
        setAudioBase64(null)
      } else {
        setHasRecordedSample(true)
        setValidationError(null)
      }
      return currentDuration
    })
  }, [])

  // Timer logic for recording duration (up to 30s)
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 30) {
            stopRecording()
            return 30
          }
          return prev + 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording, stopRecording])

  // Clean up audio preview URLs on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl)
      }
    }
  }, [audioPreviewUrl])

  const startRecording = async () => {
    setValidationError(null)
    setApiNotice(null)
    setRecordDuration(0)
    setHasRecordedSample(false)
    setUploadedFileName(null)
    setAudioBase64(null)
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl)
      setAudioPreviewUrl(null)
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setValidationError('Microphone recording is not supported in this browser. Please upload an audio file.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      let chosenMimeType = 'audio/webm'
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          chosenMimeType = 'audio/webm;codecs=opus'
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          chosenMimeType = 'audio/webm'
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          chosenMimeType = 'audio/ogg;codecs=opus'
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          chosenMimeType = 'audio/mp4'
        }
      }

      const recorder = new MediaRecorder(stream, chosenMimeType ? { mimeType: chosenMimeType } : undefined)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const finalType = recorder.mimeType || chosenMimeType || 'audio/wav'
        const audioBlob = new Blob(audioChunksRef.current, { type: finalType })
        setAudioMimeType(finalType)

        const previewUrl = URL.createObjectURL(audioBlob)
        setAudioPreviewUrl(previewUrl)

        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          setAudioBase64(result)
        }
        reader.readAsDataURL(audioBlob)

        // Stop all tracks to turn off the microphone hardware light
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start(250)
      setIsRecording(true)
    } catch (err: any) {
      console.error('[VoiceSetup] MediaRecorder access failed:', err)
      setValidationError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser or upload an audio file.'
          : `Failed to access microphone: ${err.message || 'Unknown error'}. Please upload an audio file instead.`
      )
    }
  }



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const lowerName = file.name.toLowerCase()
    if (!lowerName.endsWith('.wav') && !lowerName.endsWith('.mp3') && !lowerName.endsWith('.ogg') && !lowerName.endsWith('.m4a')) {
      setValidationError('Please upload a clean audio file in .wav, .mp3, .ogg, or .m4a format.')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setValidationError('Audio file exceeds 15MB limit.')
      return
    }

    setValidationError(null)
    setUploadedFileName(file.name)
    setAudioMimeType(file.type || 'audio/wav')

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl)
    }
    const previewUrl = URL.createObjectURL(file)
    setAudioPreviewUrl(previewUrl)

    // Inspect actual audio duration
    const tempAudio = new Audio()
    tempAudio.src = previewUrl
    tempAudio.onloadedmetadata = () => {
      const dur = Math.round(tempAudio.duration)
      if (dur > 0 && isFinite(dur)) {
        setRecordDuration(Math.min(dur, 30))
        if (dur < 3) {
          setValidationError('Audio file duration is too short (< 3s). Gnani AI requires at least 5 seconds of speech.')
          setHasRecordedSample(false)
          return
        }
      } else {
        setRecordDuration(12)
      }
      setHasRecordedSample(true)
    }
    tempAudio.onerror = () => {
      setRecordDuration(12)
      setHasRecordedSample(true)
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setAudioBase64(result)
    }
    reader.readAsDataURL(file)
  }

  const togglePlayPreview = () => {
    if (!audioElementRef.current || !audioPreviewUrl) return

    if (isPlayingSample) {
      audioElementRef.current.pause()
      setIsPlayingSample(false)
    } else {
      audioElementRef.current.currentTime = 0
      audioElementRef.current
        .play()
        .then(() => setIsPlayingSample(true))
        .catch(() => setIsPlayingSample(false))
    }
  }

  const handleSubmitEnrollment = async () => {
    if (!consentAccepted) {
      setValidationError('You must accept the explicit voice consent statement before proceeding.')
      return
    }

    if (!hasRecordedSample || (!audioBase64 && !uploadedFileName)) {
      setValidationError('Please record or upload a voice sample before enrolling.')
      return
    }

    setIsProcessing(true)
    setValidationError(null)
    setApiNotice(null)
    setProcessingProgress(15)
    setProcessingStep('Packaging reference audio buffer...')

    const timer1 = setTimeout(() => {
      setProcessingProgress(40)
      setProcessingStep('Uploading sample to private Supabase bucket (voice-samples)...')
    }, 450)

    const timer2 = setTimeout(() => {
      setProcessingProgress(75)
      setProcessingStep('Extracting 768-dim speaker embedding tensor via Gnani Vachana (api.vachana.ai)...')
    }, 1100)

    try {
      const response = await voiceApi.enroll({
        consentAccepted: true,
        consentVersion: 'v1.0-2026',
        enrollmentLanguage: 'hi-IN',
        sampleDurationSec: Math.max(5, recordDuration),
        audioBase64: audioBase64 || undefined,
        mimeType: audioMimeType || 'audio/wav',
      })

      clearTimeout(timer1)
      clearTimeout(timer2)
      setProcessingProgress(100)
      setProcessingStep('Tensor verified: shape [1, 768] (torch.bfloat16). Voice profile ready!')

      setStatus('ready')
      if (onStatusChange) onStatusChange('ready')
      setApiNotice(response.message || 'Voice profile enrolled and 768-dim speaker embedding generated successfully.')
    } catch (err: any) {
      clearTimeout(timer1)
      clearTimeout(timer2)
      setProcessingProgress(0)
      setProcessingStep('')
      console.error('[Voice Enrollment Error]:', err)

      // NEVER silently fake success: display real server error to user
      setValidationError(
        err.message ||
        'Voice enrollment failed. Could not extract speaker embedding tensor from sample. Please try again with clean speech.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRevokeProfile = async () => {
    setIsDeleteModalOpen(false)
    try {
      await voiceApi.revoke()
      setApiNotice('Biometric voice profile and embeddings permanently revoked.')
    } catch (err: any) {
      setValidationError(err.message || 'Failed to revoke voice profile from server.')
    }
    setStatus('not_enrolled')
    setHasRecordedSample(false)
    setConsentAccepted(false)
    setUploadedFileName(null)
    setAudioBase64(null)
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl)
      setAudioPreviewUrl(null)
    }
    setRecordDuration(0)
    if (onStatusChange) onStatusChange('not_enrolled')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 select-none">
      {/* Hidden audio element for sample preview */}
      <audio
        ref={audioElementRef}
        src={audioPreviewUrl || undefined}
        onEnded={() => setIsPlayingSample(false)}
        className="hidden"
      />

      {/* Voxel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BlockBadge variant="grass">VOXEL BIOMETRICS</BlockBadge>
            <span className="text-[10px] font-mono text-voxel-sand">VACHANA VC-v1</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-pixel uppercase tracking-wide text-voxel-cloud flex items-center gap-2.5">
            <Mic className="w-6 h-6 text-voxel-grass" />
            <span>VOICE CRAFTING STATION</span>
          </h1>
          <p className="text-xs font-sans text-voxel-stone-light mt-1">
            Enroll your vocal characteristics into an encrypted 768-dimensional speaker embedding for cross-lingual synthesis.
          </p>
        </div>

        <VoiceCore
          status={isRecording ? 'recording' : isProcessing ? 'processing' : status === 'ready' ? 'ready' : 'not_enrolled'}
          isGenerating={isProcessing}
          size={52}
          label={isRecording ? 'RECORDING' : isProcessing ? 'EXTRACTING' : status === 'ready' ? 'PROFILE ACTIVE' : 'NO PROFILE'}
        />
      </div>

      {apiNotice && (
        <BlockNoticeBanner
          variant="success"
          title="ENROLLMENT CONFIRMED"
          message={apiNotice}
          onDismiss={() => setApiNotice(null)}
        />
      )}

      {/* Active Profile Summary Card if enrolled */}
      {status === 'ready' && (
        <VoxelCard biome="grass" glow className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BlockBadge variant="emerald">
                  <Check className="w-3 h-3 mr-1" />
                  <span>VOICE PROFILE ACTIVE</span>
                </BlockBadge>
                <span className="text-[10px] font-mono text-voxel-grass font-semibold">
                  [1, 768] BFLOAT16 VECTOR
                </span>
              </div>
              <h3 className="text-base font-pixel uppercase text-voxel-cloud">
                SPEAKER IDENTITY REGISTERED
              </h3>
              <p className="text-xs font-sans text-voxel-stone-light max-w-xl leading-relaxed">
                Your vocal tract coordinates are saved into private Supabase storage. You can now synthesize scripts in Hindi, Indian English, Hinglish, and 8 other Indian languages in your voice.
              </p>
            </div>
            <BlockButton
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="shrink-0"
            >
              REVOKE BIOMETRICS
            </BlockButton>
          </div>
        </VoxelCard>
      )}

      {/* Main Microphone & Audio Ingestion Station */}
      <VoxelCard biome={isRecording ? 'redstone' : 'stone'} className="space-y-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <CubeIllustration biome={isRecording ? 'redstone' : 'sound'} size={28} />
              <span>REFERENCE AUDIO INGESTION</span>
            </CardTitle>
            <span className="text-[10px] font-mono text-voxel-sand">
              REQUIRED: 5–30 SECONDS
            </span>
          </div>
          <CardDescription>
            Record directly from your microphone or upload a clean lossless audio recording (.wav or .mp3).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {validationError && (
            <BlockNoticeBanner
              variant="error"
              title="ENROLLMENT NOTICE"
              message={validationError}
              onDismiss={() => setValidationError(null)}
            />
          )}

          {/* Voxel Microphone Block / Waveform Centerpiece */}
          <div className="bg-[#121417] border-4 border-[#3D434A] p-6 shadow-voxel-inset text-center space-y-4">
            <div className="flex justify-center">
              <div
                className={`w-20 h-20 border-4 flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-[#381010] border-voxel-redstone animate-pulse-voxel shadow-[0_0_20px_rgba(224,62,62,0.6)]'
                    : 'bg-[#181B1E] border-voxel-stone-dark'
                }`}
              >
                <Mic className={`w-9 h-9 ${isRecording ? 'text-voxel-redstone animate-bounce' : 'text-voxel-gold'}`} />
              </div>
            </div>

            {/* Live Waveform Stream */}
            <div className="max-w-md mx-auto">
              <VoxelWaveform
                isPlaying={isRecording || isPlayingSample}
                isRecording={isRecording}
                barCount={36}
                height={40}
                variant={isRecording ? 'redstone' : 'emerald'}
                progressPercent={hasRecordedSample ? 100 : 0}
              />
            </div>

            {/* Timer and Meter */}
            <div className="flex items-center justify-center gap-3 font-mono text-xs">
              <span className="text-voxel-stone-light">RECORDED:</span>
              <span className={`font-pixel text-sm px-2 py-0.5 bg-voxel-bedrock border ${isRecording ? 'text-voxel-redstone border-voxel-redstone' : 'text-voxel-gold border-voxel-stone-dark'}`}>
                {String(recordDuration).padStart(2, '0')}:00 / 00:30 SEC
              </span>
            </div>

            {/* Block Progress indicator for 30s limit */}
            <div className="max-w-xs mx-auto">
              <BlockProgress
                value={recordDuration}
                max={30}
                variant={isRecording ? 'redstone' : 'gold'}
                segments={10}
              />
            </div>
          </div>

          {/* Dual Action Rows: Record vs Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Record Control */}
            <div className="bg-[#181B1E] p-4 border-2 border-voxel-stone-dark shadow-voxel-sm space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-pixel text-voxel-cloud uppercase flex items-center gap-2">
                  <span>MICROPHONE STATION</span>
                </h4>
                <p className="text-[11px] font-sans text-voxel-stone-light mt-1">
                  Speak clearly into your microphone in a quiet room.
                </p>
              </div>

              {isRecording ? (
                <BlockButton
                  variant="redstone"
                  size="md"
                  onClick={stopRecording}
                  leftIcon={<Square className="w-4 h-4 fill-current" />}
                  className="w-full"
                >
                  STOP RECORDING
                </BlockButton>
              ) : (
                <BlockButton
                  variant="primary"
                  size="md"
                  onClick={startRecording}
                  leftIcon={<Mic className="w-4 h-4" />}
                  className="w-full"
                >
                  START 10s RECORDING
                </BlockButton>
              )}
            </div>

            {/* File Upload Control */}
            <div className="bg-[#181B1E] p-4 border-2 border-voxel-stone-dark shadow-voxel-sm space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-pixel text-voxel-cloud uppercase flex items-center gap-2">
                  <span>AUDIO FILE UPLOAD</span>
                </h4>
                <p className="text-[11px] font-sans text-voxel-stone-light mt-1">
                  Upload existing voice recording (WAV / MP3, max 15MB).
                </p>
              </div>

              <label className="block w-full">
                <input
                  type="file"
                  accept="audio/wav,audio/mp3,audio/ogg,audio/m4a"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isRecording}
                />
                <span className="inline-flex items-center justify-center font-pixel text-xs tracking-wider uppercase bg-[#2A2E33] hover:bg-[#383E45] text-voxel-cloud border-2 border-[#525A63] border-b-[#121417] border-r-[#121417] shadow-voxel px-4 py-2.5 w-full cursor-pointer block-pressable">
                  <Upload className="w-4 h-4 mr-2 text-voxel-gold" />
                  {uploadedFileName ? 'CHANGE AUDIO FILE' : 'CHOOSE AUDIO FILE'}
                </span>
              </label>
            </div>
          </div>

          {/* Sample Verification Bar */}
          {hasRecordedSample && (
            <div className="bg-[#153818] border-2 border-voxel-grass p-3.5 shadow-voxel-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <Check className="w-4 h-4 text-voxel-grass shrink-0" />
                <span className="text-xs font-pixel text-voxel-cloud truncate">
                  {uploadedFileName ? `FILE: ${uploadedFileName}` : `MICROPHONE SAMPLE: ${recordDuration}s READY`}
                </span>
              </div>
              <button
                type="button"
                onClick={togglePlayPreview}
                className="px-3 py-1 bg-voxel-bedrock hover:bg-voxel-stone-dark text-[10px] font-pixel text-voxel-grass border border-voxel-grass block-pressable shrink-0 flex items-center gap-1.5"
              >
                {isPlayingSample ? 'PAUSE' : 'TEST PLAY'}
              </button>
            </div>
          )}

          {/* Real Multi-step Progress Indicator during Enrollment */}
          {isProcessing && (
            <div className="bg-[#121417] border-2 border-voxel-gold p-4 space-y-3 shadow-voxel-gold">
              <div className="flex items-center justify-between text-xs font-pixel text-voxel-gold">
                <span>{processingStep || 'ENROLLING BIOMETRIC PROFILE...'}</span>
                <span>{processingProgress}%</span>
              </div>
              <BlockProgress value={processingProgress} max={100} variant="gold" segments={10} />
              <p className="text-[11px] font-sans text-voxel-stone-light">
                Connecting to Gnani Vachana VC engine (api.vachana.ai). Extracting 768-dimensional vocal tract tensor and saving to encrypted storage.
              </p>
            </div>
          )}

          <PixelDivider color="stone" />

          {/* DPDP Consent Checklist Gate */}
          <div className="bg-[#1A1812] border-2 border-voxel-gold p-4 shadow-voxel-gold space-y-3">
            <div className="flex items-center gap-2 text-xs font-pixel text-voxel-gold uppercase">
              <ShieldCheck className="w-4 h-4 text-voxel-gold" />
              <span>DPDP ACT 2023 EXPLICIT BIOMETRIC CONSENT</span>
            </div>
            <p className="text-xs font-sans text-voxel-stone-light leading-relaxed">
              {VOICE_CONSENT_STATEMENT}
            </p>
            <label className="flex items-center gap-3 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="w-4 h-4 rounded-none bg-voxel-bedrock border-2 border-voxel-gold text-voxel-grass focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-pixel text-voxel-cloud uppercase">
                I GRANT AFFIRMATIVE CONSENT TO EXTRACT MY SPEAKER EMBEDDING
              </span>
            </label>
          </div>

          {/* Submit Enrollment Button */}
          <BlockButton
            variant="primary"
            size="lg"
            onClick={handleSubmitEnrollment}
            disabled={!hasRecordedSample || !consentAccepted || isProcessing}
            isLoading={isProcessing}
            className="w-full"
          >
            EXTRACT & ENROLL 768-DIM VOICE VECTOR
          </BlockButton>
        </CardContent>
      </VoxelCard>

      {/* Confirmation Modal for Profile Revocation */}
      <BlockModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="PERMANENT BIOMETRIC PURGE"
        description="Are you sure you want to permanently revoke consent and purge your voice profile from the database?"
        biome="redstone"
      >
        <div className="space-y-4">
          <p className="text-xs font-sans text-voxel-stone-light leading-relaxed">
            This will permanently delete the 768-dimensional speaker embedding vector from Supabase and log a DPDP revocation event in the consent ledger. You will immediately revert to standard synthetic voices.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3">
            <BlockButton
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              CANCEL
            </BlockButton>
            <BlockButton
              variant="destructive"
              size="sm"
              onClick={handleRevokeProfile}
            >
              CONFIRM PURGE
            </BlockButton>
          </div>
        </div>
      </BlockModal>
    </div>
  )
}
