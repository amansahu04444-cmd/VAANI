import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Mic, Volume2, BookmarkPlus, RotateCcw, Check, Languages, ArrowRight, RefreshCw } from 'lucide-react'
import { BlockButton } from '../components/ui/BlockButton'
import { VoxelCard, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/VoxelCard'
import { BlockBadge } from '../components/ui/BlockBadge'
import { BlockInput } from '../components/ui/BlockInput'
import { BlockTextarea } from '../components/ui/BlockTextarea'
import { BlockSelect } from '../components/ui/BlockSelect'
import { BlockNoticeBanner } from '../components/ui/BlockNoticeBanner'
import { VoxelAudioPlayer } from '../components/ui/VoxelAudioPlayer'
import { CubeIllustration } from '../components/ui/CubeIllustration'
import { VoiceCore } from '../components/ui/VoiceCore'
import { SUPPORTED_LANGUAGES, STANDARD_VOICES, DEMO_SCRIPTS } from '../lib/constants'
import type { VoiceMode, AudioAsset, VoiceEnrollmentState } from '../types'
import { speechApi, audioApi, translationApi } from '../lib/api'
import { useAudioEngine } from '../context/AudioContext'

export interface SpeechStudioProps {
  hasVoiceProfile?: boolean
  voiceStatus?: VoiceEnrollmentState
  onAudioGenerated?: (newAudio: AudioAsset) => void
  isDemoMode?: boolean
}

export const SpeechStudio: React.FC<SpeechStudioProps> = ({
  hasVoiceProfile = false,
  voiceStatus,
  onAudioGenerated,
  isDemoMode = false,
}) => {
  const { playUiSound } = useAudioEngine()
  const isPersonalVoiceReady = !isDemoMode && (voiceStatus === 'READY' || (hasVoiceProfile && !voiceStatus))

  const [scriptText, setScriptText] = useState('')
  const [scriptTitle, setScriptTitle] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0].code)
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(!isDemoMode && isPersonalVoiceReady ? 'personal' : 'standard')
  const [selectedStandardVoice, setSelectedStandardVoice] = useState(STANDARD_VOICES[0].id)
  const [speed, setSpeed] = useState<number>(1.0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<string>('')
  const [generatedAudio, setGeneratedAudio] = useState<AudioAsset | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  // Multilingual Indic Translation States
  const [detectedSource, setDetectedSource] = useState<{
    code: string
    name: string
    confidence: number
  }>({
    code: 'hi-IN',
    name: 'Hindi',
    confidence: 0,
  })
  const [isDetecting, setIsDetecting] = useState(false)
  const [translatedScript, setTranslatedScript] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [isTranslationEdited, setIsTranslationEdited] = useState(false)
  const [translationProvider, setTranslationProvider] = useState<string>('')

  const charLimit = isDemoMode ? 300 : 1000

  // Detect source language automatically when user enters or edits script
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      if (!scriptText.trim()) {
        setDetectedSource({ code: 'hi-IN', name: 'Hindi', confidence: 0 })
        setTranslatedScript('')
        setIsTranslationEdited(false)
        return
      }

      setIsDetecting(true)
      try {
        const res = await translationApi.detect(scriptText)
        if (!cancelled) {
          setDetectedSource({
            code: res.detectedLanguage,
            name: res.languageName,
            confidence: Math.round(res.confidence * 100),
          })
        }
      } catch {
        // Retain current detection
      } finally {
        if (!cancelled) {
          setIsDetecting(false)
        }
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [scriptText])

  const targetLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)
  const isCrossLanguage = Boolean(
    scriptText.trim() &&
    (
      detectedSource.code !== selectedLanguage ||
      detectedSource.code === 'hi-Latn' ||
      (detectedSource.code === 'auto' && selectedLanguage !== 'en-IN')
    )
  )

  const performTranslation = async (text: string, srcLang: string, tgtLang: string) => {
    if (!text.trim() || srcLang === tgtLang) {
      setTranslatedScript('')
      setIsTranslationEdited(false)
      return
    }
    setIsTranslating(true)
    try {
      const res = await translationApi.translate({
        text,
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
      })
      setTranslatedScript(res.translatedText)
      setTranslationProvider(res.provider)
      setIsTranslationEdited(false)
    } catch (err: any) {
      console.warn('[Translation] Failed to translate script:', err)
    } finally {
      setIsTranslating(false)
    }
  }

  // Auto-translate when target language changes or cross-language is detected (and not manually edited)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isCrossLanguage && !isTranslationEdited && scriptText.trim()) {
        performTranslation(scriptText, detectedSource.code, selectedLanguage)
      } else if (!isCrossLanguage && !isTranslationEdited) {
        setTranslatedScript('')
      }
    }, 80)

    return () => clearTimeout(timer)
  }, [selectedLanguage, detectedSource.code, scriptText, isCrossLanguage, isTranslationEdited])

  const handleRetranslate = () => {
    playUiSound('click')
    setIsTranslationEdited(false)
    performTranslation(scriptText, detectedSource.code, selectedLanguage)
  }

  const handleApplyTemplate = (template: { title: string; lang: string; text: string }) => {
    playUiSound('click')
    setScriptTitle(template.title)
    setScriptText(template.text.slice(0, charLimit))
    setIsTranslationEdited(false)
    setErrorNotice(null)
    if (template.lang !== 'auto') {
      setSelectedLanguage(template.lang)
    }
  }

  const handleGenerate = async () => {
    // Prevent duplicate clicks during generation
    if (isGenerating) return

    setErrorNotice(null)
    setSavedSuccess(false)

    if (!scriptText.trim()) {
      setErrorNotice('Please enter or paste a script to synthesize.')
      return
    }

    if (scriptText.length > charLimit) {
      setErrorNotice(`Script exceeds the ${charLimit} character limit for ${isDemoMode ? 'demo' : 'single-pass'} generation.`)
      return
    }

    if (voiceMode === 'personal' && !isPersonalVoiceReady) {
      if (isDemoMode) {
        setErrorNotice('Personal voice mode is disabled in Demo Mode. Please sign in or create an account to use personal voice cloning.')
      } else if (voiceStatus === 'EMBEDDING_MISSING') {
        setErrorNotice('Cannot generate in Personal Voice mode: your enrolled voice profile is missing an active speaker embedding tensor. Please re-record or upload a voice sample in Voice Setup.')
      } else {
        setErrorNotice('Cannot generate in Personal Voice mode: you have not enrolled your voice profile yet. Please switch to Standard Voice mode or complete enrollment in Voice Setup.')
      }
      return
    }

    playUiSound('generate')
    setIsGenerating(true)

    // Clear and genuine step messages without fake progress percentages
    const activeStepMsg =
      voiceMode === 'personal'
        ? 'Generating your personal voice...'
        : isCrossLanguage
        ? `Translating into ${targetLangMeta?.name || selectedLanguage} & synthesizing...`
        : 'Synthesizing speech with Timbre...'
    setGenerationStep(activeStepMsg)

    try {
      const activeTranslatedText = isCrossLanguage && translatedScript.trim() ? translatedScript.trim() : undefined
      const textToSynthesize = activeTranslatedText || scriptText.trim()

      if (isDemoMode) {
        // Connect to public demo endpoint POST /api/speech/demo-generate
        const response = await speechApi.generateDemo({
          text: scriptText,
          translatedText: activeTranslatedText,
          sourceLanguage: detectedSource.code,
          title: scriptTitle.trim() || undefined,
          targetLanguage: selectedLanguage,
          standardVoiceId: selectedStandardVoice,
          speed,
        })

        const base64Audio = response.asset?.audioBase64 || (response as any).audioBase64 || ''
        const binaryStr = atob(base64Audio)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'audio/wav' })
        const blobUrl = URL.createObjectURL(blob)

        const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)
        const voiceMeta = STANDARD_VOICES.find((v) => v.id === selectedStandardVoice)

        const demoAsset: AudioAsset = {
          id: `demo-${Date.now()}`,
          userId: 'guest',
          title: scriptTitle.trim() || `${langMeta?.name || 'Indic'} Demo Synthesis`,
          textPreview: textToSynthesize,
          originalText: scriptText,
          translatedText: activeTranslatedText,
          sourceLanguage: detectedSource.code,
          languageCode: selectedLanguage,
          languageName: langMeta?.name || selectedLanguage,
          voiceMode: 'standard',
          voiceLabel: voiceMeta ? `${voiceMeta.name} (${voiceMeta.gender})` : selectedStandardVoice,
          durationSeconds: response.asset?.durationSeconds || response.durationSeconds || Math.max(1, Math.round(textToSynthesize.length / 15)),
          fileSizeBytes: bytes.byteLength,
          createdAt: new Date().toISOString(),
          audioUrl: blobUrl,
        }

        setGeneratedAudio(demoAsset)
        playUiSound('success')
      } else {
        // Connect to backend POST /api/speech/generate
        const response = await speechApi.generate({
          text: scriptText,
          translatedText: activeTranslatedText,
          sourceLanguage: detectedSource.code,
          title: scriptTitle.trim() || undefined,
          targetLanguage: selectedLanguage,
          voiceMode,
          standardVoiceId: selectedStandardVoice,
          speed,
        })

        const newAsset: AudioAsset = response.asset
        setGeneratedAudio(newAsset)
        setSavedSuccess(true)
        playUiSound('success')
        if (onAudioGenerated) onAudioGenerated(newAsset)
      }
    } catch (err: any) {
      let msg = err.message || 'Speech generation failed. Please check your acoustic parameters and provider connection.'
      if (err.message?.includes('GNANI_TIMEOUT') || err.message?.includes('timed out') || err.status === 504) {
        msg = 'Speech synthesis request timed out. The neural model took longer than expected to render audio. You can retry synthesis safely without duplicate entries.'
      } else if (err.message?.includes('GNANI_NETWORK_ERROR') || err.status === 502) {
        msg = 'Network connection interrupted while reaching the speech provider. Please verify your internet connection and retry.'
      }
      setErrorNotice(msg)
      playUiSound('click')
    } finally {
      setIsGenerating(false)
      setGenerationStep('')
    }
  }

  const handleSaveToLibrary = () => {
    playUiSound('click')
    if (isDemoMode) {
      setErrorNotice('Chest storage is not available in Demo Mode. Please create an account to save audio assets permanently to your library.')
      return
    }
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="space-y-8 select-none">
      {/* Voxel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BlockBadge variant="emerald">VOXEL WORKBENCH</BlockBadge>
            <span className="text-[10px] font-mono text-voxel-sand">GNANI TIMBRE v2.5</span>
            {isDemoMode && <BlockBadge variant="gold">DEMO MODE</BlockBadge>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-pixel uppercase tracking-wide text-voxel-cloud flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-voxel-gold" />
            <span>{isDemoMode ? 'DEMO SPEECH STUDIO' : 'MULTILINGUAL SPEECH STUDIO'}</span>
          </h1>
          <p className="text-xs font-sans text-voxel-stone-light mt-1">
            {isDemoMode
              ? 'Guest access: test Gnani Timbre speech synthesis across Indian languages with standard studio voices.'
              : 'Translate scripts across Indian languages, clone personal speaker embeddings, and synthesize high-fidelity 48kHz audio.'}
          </p>
        </div>

        <VoiceCore
          isGenerating={isGenerating}
          isPlaying={Boolean(generatedAudio)}
          hasSucceeded={Boolean(generatedAudio && !isGenerating)}
          size={52}
          label={
            isGenerating
              ? voiceMode === 'personal'
                ? 'GENERATING PERSONAL VOICE'
                : 'SYNTHESIZING'
              : generatedAudio
              ? 'AUDIO READY'
              : 'TIMBRE READY'
          }
        />
      </div>

      {isDemoMode && (
        <div className="p-3.5 bg-[#17202A] border-2 border-voxel-sky flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-voxel">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-voxel-gold shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-xs text-voxel-sky uppercase">
                  DEMO WORKBENCH — GUEST ACCESS
                </span>
                <BlockBadge variant="gold" size="sm">UNRESTRICTED ACCESS</BlockBadge>
              </div>
              <p className="text-[11px] font-sans text-voxel-stone-light mt-0.5">
                Synthesize speech instantly across Indian languages with Timbre standard voices. Zero database writes, no account required.
              </p>
            </div>
          </div>
          <Link to="/auth?mode=signup" className="shrink-0">
            <BlockButton variant="primary" size="sm">
              CREATE ACCOUNT FOR VOICE CLONING
            </BlockButton>
          </Link>
        </div>
      )}

      {!isDemoMode && voiceStatus === 'EMBEDDING_MISSING' && !errorNotice && (
        <BlockNoticeBanner
          variant="warning"
          title="SPEAKER EMBEDDING TENSOR MISSING"
          message="Your personal voice profile is registered in the database, but is missing an active 768-dimensional speaker embedding vector. Please complete audio enrollment in Voice Setup to enable Personal Voice synthesis."
        />
      )}

      {errorNotice && (
        <BlockNoticeBanner
          variant="error"
          title="STUDIO NOTICE"
          message={errorNotice}
          onDismiss={() => setErrorNotice(null)}
        />
      )}

      {/* Two-Column Studio Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Script Console (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <VoxelCard biome="stone" className="space-y-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <CubeIllustration biome="stone" size={24} />
                  <span>SCRIPT PARCHMENT</span>
                </CardTitle>
                <span className="text-[10px] font-mono text-voxel-sand">
                  {isDemoMode ? 'DEMO LIMIT: MAX 300 CHARACTERS' : 'MAX 1,000 CHARACTERS'}
                </span>
              </div>
              <CardDescription>
                Compose or paste your script below. Punctuation hints, Hindi/English numerals, and regional Indian scripts are supported.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <BlockInput
                label="SCRIPT TITLE (OPTIONAL)"
                placeholder="e.g. November Billing Reminder"
                value={scriptTitle}
                onChange={(e) => setScriptTitle(e.target.value)}
              />

              {/* Quick Template Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-pixel text-voxel-sand uppercase">
                  SAMPLE PROMPTS:
                </span>
                <div className="flex flex-wrap gap-2">
                  {DEMO_SCRIPTS.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-2.5 py-1 text-[10px] font-pixel uppercase bg-voxel-bedrock hover:bg-voxel-stone-dark text-voxel-cloud border border-voxel-stone-dark hover:border-voxel-gold block-pressable"
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>

              <BlockTextarea
                label="SCRIPT CONTENT"
                placeholder="Type or paste text in Hindi, Indian English, Hinglish, or any regional Indian language..."
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                charLimit={charLimit}
                currentLength={scriptText.length}
                rows={5}
                required
              />

              {/* Multilingual Indic Translation Workbench */}
              {isCrossLanguage && (
                <div className="p-3.5 bg-[#101923] border-2 border-voxel-sky/70 space-y-3 shadow-voxel">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-voxel-stone-dark">
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-voxel-sky" />
                      <span className="font-pixel text-[11px] text-voxel-cloud uppercase">
                        INDIC TRANSLATION PIPELINE
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 bg-voxel-bedrock border border-voxel-stone-dark text-voxel-sand">
                        SRC: {isDetecting ? 'DETECTING...' : `${detectedSource.name} (${detectedSource.code})`}
                      </span>
                      <ArrowRight className="w-3 h-3 text-voxel-gold" />
                      <span className="px-1.5 py-0.5 bg-voxel-bedrock border border-voxel-sky text-voxel-sky font-semibold">
                        TGT: {targetLangMeta?.name || selectedLanguage} ({selectedLanguage})
                      </span>
                      {isTranslationEdited ? (
                        <BlockBadge variant="gold" size="sm">CUSTOM EDITED</BlockBadge>
                      ) : isTranslating ? (
                        <BlockBadge variant="sky" size="sm">TRANSLATING...</BlockBadge>
                      ) : (
                        <BlockBadge variant="emerald" size="sm">TRANSLATED</BlockBadge>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] font-sans text-voxel-stone-light">
                    VAANI translates your script before acoustic synthesis. You may refine the translated script below before vocalizing with your personal voice embedding.
                  </p>

                  <BlockTextarea
                    label="TRANSLATED SCRIPT (PREVIEW & EDITABLE)"
                    placeholder={isTranslating ? 'Translating Indic script...' : 'Translated script in target language...'}
                    value={translatedScript}
                    onChange={(e) => {
                      setTranslatedScript(e.target.value)
                      setIsTranslationEdited(true)
                    }}
                    charLimit={charLimit}
                    currentLength={translatedScript.length}
                    rows={4}
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-voxel-stone-light">
                      {translationProvider ? `Engine: ${translationProvider}` : 'Evon Indic Neural Engine'}
                    </span>
                    <button
                      type="button"
                      onClick={handleRetranslate}
                      disabled={isTranslating}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-pixel uppercase bg-voxel-bedrock hover:bg-voxel-stone-dark text-voxel-gold border border-voxel-gold/60 block-pressable disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTranslating ? 'animate-spin' : ''}`} />
                      <span>RE-TRANSLATE ORIGINAL</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Direct Synthesis Notice when Source matches Target */}
              {!isCrossLanguage && scriptText.trim().length > 0 && (
                <div className="p-2.5 bg-[#121417] border border-voxel-stone-dark flex items-center justify-between text-[10px] font-mono text-voxel-stone-light">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-voxel-grass inline-block" />
                    <span>SOURCE & TARGET MATCH: {detectedSource.name} ({detectedSource.code})</span>
                  </div>
                  <span className="text-voxel-sand">DIRECT SYNTHESIS (NO TRANSLATION REQUIRED)</span>
                </div>
              )}
            </CardContent>
          </VoxelCard>
        </div>

        {/* Right Column: Acoustic Synthesizer Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <VoxelCard biome="gold" className="space-y-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <CubeIllustration biome="gold" size={24} />
                  <span>ACOUSTIC PARAMETERS</span>
                </CardTitle>
                <BlockBadge variant="gold">TIMBRE TTS</BlockBadge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Language Biome Selector */}
              <BlockSelect
                label="TARGET LANGUAGE BIOME"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                options={SUPPORTED_LANGUAGES.map((l) => ({
                  value: l.code,
                  label: `${l.name} (${l.code})`,
                  sublabel: l.nativeName,
                }))}
              />

              {/* Voice Mode Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-pixel text-voxel-sand uppercase">
                  VOICE EMITTER MODE
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isPersonalVoiceReady && !isDemoMode) {
                        setVoiceMode('personal')
                      }
                    }}
                    disabled={!isPersonalVoiceReady || isDemoMode}
                    className={`p-3 text-left border-2 block-pressable transition-all ${
                      voiceMode === 'personal' && isPersonalVoiceReady && !isDemoMode
                        ? 'bg-[#153818] border-voxel-grass shadow-voxel-grass'
                        : isPersonalVoiceReady && !isDemoMode
                        ? 'bg-voxel-bedrock border-voxel-stone-dark'
                        : 'bg-voxel-bedrock border-voxel-stone-dark opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Mic className={`w-3.5 h-3.5 ${isPersonalVoiceReady && !isDemoMode ? 'text-voxel-grass' : 'text-voxel-stone-light'}`} />
                      <span className="text-[10px] font-pixel text-voxel-cloud uppercase">
                        PERSONAL
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-voxel-stone-light">
                      {isDemoMode
                        ? 'Requires Account'
                        : isPersonalVoiceReady
                        ? 'Cloned Voice Active'
                        : voiceStatus === 'EMBEDDING_MISSING'
                        ? 'Embedding Tensor Missing'
                        : voiceStatus === 'EMBEDDING_PROCESSING'
                        ? 'Extracting Vector...'
                        : voiceStatus === 'EMBEDDING_FAILED'
                        ? 'Extraction Failed'
                        : 'Requires Enrollment'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoiceMode('standard')}
                    className={`p-3 text-left border-2 block-pressable transition-all ${
                      voiceMode === 'standard'
                        ? 'bg-[#10243D] border-voxel-sky shadow-voxel-sky'
                        : 'bg-voxel-bedrock border-voxel-stone-dark'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Volume2 className="w-3.5 h-3.5 text-voxel-sky" />
                      <span className="text-[10px] font-pixel text-voxel-cloud uppercase">
                        STANDARD
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-voxel-stone-light">
                      Timbre Studio Roster
                    </p>
                  </button>
                </div>
              </div>

              {/* Standard Voice Choice (if mode is standard) */}
              {voiceMode === 'standard' && (
                <BlockSelect
                  label="TIMBRE STUDIO VOICE"
                  value={selectedStandardVoice}
                  onChange={(e) => setSelectedStandardVoice(e.target.value)}
                  options={STANDARD_VOICES.map((v) => ({
                    value: v.id,
                    label: `${v.name} (${v.gender})`,
                    sublabel: v.primaryLanguage,
                  }))}
                />
              )}

              {/* Speed Slider */}
              <div className="space-y-1.5 bg-[#121417] p-3 border-2 border-voxel-stone-dark shadow-voxel-inset">
                <div className="flex items-center justify-between text-xs font-pixel text-voxel-sand">
                  <span>CADENCE / SPEED</span>
                  <span className="font-mono text-voxel-gold font-bold">{speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.15"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-voxel-gold cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-voxel-stone-light">
                  <span>0.85x (Slow)</span>
                  <span>1.0x (Normal)</span>
                  <span>1.15x (Fast)</span>
                </div>
              </div>

              {/* Genuine Loading Status Banner without fake percentage */}
              {isGenerating && (
                <div className="space-y-2 bg-[#121417] p-3.5 border-2 border-voxel-gold shadow-voxel animate-pulse">
                  <div className="flex items-center gap-2.5 text-xs font-pixel text-voxel-gold uppercase">
                    <RefreshCw className="w-4 h-4 text-voxel-gold animate-spin" />
                    <span>{generationStep}</span>
                  </div>
                  <p className="text-[10px] font-mono text-voxel-stone-light">
                    {voiceMode === 'personal'
                      ? 'Neural 768-dimensional speaker embedding alignment active. Timeout threshold extended up to 120s.'
                      : 'Streaming 48kHz linear PCM speech from Gnani Timbre engine. Timeout threshold 60s.'}
                  </p>
                </div>
              )}

              {/* Big Prominent Generate Button */}
              <BlockButton
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                disabled={isGenerating}
                isLoading={isGenerating}
                className="w-full py-4 text-xs sm:text-sm"
                rightIcon={<Sparkles className="w-4 h-4 text-voxel-gold" />}
              >
                {isGenerating
                  ? voiceMode === 'personal'
                    ? 'GENERATING PERSONAL VOICE...'
                    : 'SYNTHESIZING SPEECH...'
                  : 'CRAFT & SYNTHESIZE SPEECH'}
              </BlockButton>
            </CardContent>
          </VoxelCard>
        </div>
      </div>

      {/* Dedicated Audio Output Block */}
      {generatedAudio && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <CubeIllustration biome="sound" size={28} />
            <h2 className="text-base sm:text-lg font-pixel uppercase tracking-wide text-voxel-cloud">
              GENERATION RESULT ARTIFACT
            </h2>
          </div>

          <VoxelCard biome="grass" glow className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-voxel-stone-dark/80">
              <div className="flex items-center gap-2">
                <BlockBadge
                  variant={generatedAudio.voiceMode === 'personal' ? 'emerald' : 'lapis'}
                  size="md"
                >
                  {generatedAudio.voiceMode === 'personal'
                    ? 'PERSONAL CLONED VOICE (768-DIM)'
                    : 'TIMBRE STANDARD SYNTHESIS'}
                </BlockBadge>
                <span className="text-[10px] font-mono text-voxel-grass font-semibold">
                  GNANI TIMBRE 48kHz
                </span>
                {savedSuccess && !isDemoMode && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-pixel text-voxel-grass bg-voxel-bedrock px-2 py-0.5 border border-voxel-grass">
                    <Check className="w-3 h-3 text-voxel-grass" />
                    PERSISTED IN STORAGE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isDemoMode ? (
                  <Link to="/library">
                    <BlockButton
                      variant="secondary"
                      size="sm"
                      leftIcon={<BookmarkPlus className="w-3.5 h-3.5 text-voxel-grass" />}
                    >
                      SAVED TO CHEST ➔
                    </BlockButton>
                  </Link>
                ) : (
                  <BlockButton
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveToLibrary}
                    leftIcon={<BookmarkPlus className="w-3.5 h-3.5 text-voxel-gold" />}
                  >
                    SAVE (SIGNUP REQ)
                  </BlockButton>
                )}
                <BlockButton
                  variant="gold"
                  size="sm"
                  onClick={handleGenerate}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  RE-CRAFT
                </BlockButton>
              </div>
            </div>

            {/* Generated Script Quote / Multilingual Comparison */}
            {generatedAudio.originalText && generatedAudio.translatedText && generatedAudio.originalText !== generatedAudio.translatedText ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#121417] p-3 border-2 border-voxel-stone-dark shadow-voxel-inset space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-pixel text-voxel-sand uppercase">
                    <span>ORIGINAL INPUT SCRIPT</span>
                    <span className="font-mono text-voxel-stone-light">{generatedAudio.sourceLanguage || 'Detected'}</span>
                  </div>
                  <p className="text-xs font-sans text-voxel-stone-light italic leading-relaxed">
                    "{generatedAudio.originalText}"
                  </p>
                </div>
                <div className="bg-[#101b13] p-3 border-2 border-voxel-grass/60 shadow-voxel-inset space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-pixel text-voxel-grass uppercase">
                    <span>
                      {generatedAudio.voiceMode === 'personal'
                        ? 'SPOKEN IN CLONED VOICE'
                        : 'SPOKEN IN TIMBRE VOICE'}
                    </span>
                    <span className="font-mono text-voxel-emerald">{generatedAudio.languageName}</span>
                  </div>
                  <p className="text-xs font-sans text-voxel-cloud font-medium leading-relaxed">
                    "{generatedAudio.translatedText}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#121417] p-3 border-2 border-voxel-stone-dark shadow-voxel-inset">
                <p className="text-xs font-sans text-voxel-cloud italic leading-relaxed">
                  "{generatedAudio.textPreview}"
                </p>
              </div>
            )}

            {/* Voxel Audio Player */}
            <VoxelAudioPlayer
              assetId={isDemoMode ? undefined : generatedAudio.id}
              title={generatedAudio.title}
              voiceLabel={generatedAudio.voiceLabel}
              languageName={generatedAudio.languageName}
              durationSeconds={generatedAudio.durationSeconds}
              voiceMode={generatedAudio.voiceMode}
              audioUrl={generatedAudio.audioUrl}
              onRequestSignedUrl={isDemoMode ? undefined : (id) => audioApi.getSignedUrl(id)}
            />
          </VoxelCard>
        </section>
      )}
    </div>
  )
}
