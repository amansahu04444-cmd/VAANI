import React, { useState } from 'react'
import { Sparkles, Mic, Volume2, BookmarkPlus, RotateCcw } from 'lucide-react'
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
import { BlockProgress } from '../components/ui/BlockProgress'
import { SUPPORTED_LANGUAGES, STANDARD_VOICES, DEMO_SCRIPTS } from '../lib/constants'
import type { VoiceMode, AudioAsset, VoiceEnrollmentState } from '../types'
import { speechApi, audioApi } from '../lib/api'
import { useAudioEngine } from '../context/AudioContext'

export interface SpeechStudioProps {
  hasVoiceProfile?: boolean
  voiceStatus?: VoiceEnrollmentState
  onAudioGenerated?: (newAudio: AudioAsset) => void
}

export const SpeechStudio: React.FC<SpeechStudioProps> = ({
  hasVoiceProfile = false,
  voiceStatus,
  onAudioGenerated,
}) => {
  const { playUiSound } = useAudioEngine()
  const isPersonalVoiceReady = voiceStatus === 'READY' || (hasVoiceProfile && !voiceStatus)

  const [scriptText, setScriptText] = useState('')
  const [scriptTitle, setScriptTitle] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0].code)
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(isPersonalVoiceReady ? 'personal' : 'standard')
  const [selectedStandardVoice, setSelectedStandardVoice] = useState(STANDARD_VOICES[0].id)
  const [speed, setSpeed] = useState<number>(1.0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<string>('')
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const [generatedAudio, setGeneratedAudio] = useState<AudioAsset | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  const handleApplyTemplate = (template: { title: string; lang: string; text: string }) => {
    playUiSound('click')
    setScriptTitle(template.title)
    setScriptText(template.text)
    setSelectedLanguage(template.lang)
    setErrorNotice(null)
  }

  const handleGenerate = async () => {
    setErrorNotice(null)
    setSavedSuccess(false)

    if (!scriptText.trim()) {
      setErrorNotice('Please enter or paste a script to synthesize.')
      return
    }

    if (scriptText.length > 1000) {
      setErrorNotice('Script exceeds the 1,000 character limit for single-pass generation.')
      return
    }

    if (voiceMode === 'personal' && !isPersonalVoiceReady) {
      if (voiceStatus === 'EMBEDDING_MISSING') {
        setErrorNotice('Cannot generate in Personal Voice mode: your enrolled voice profile is missing an active speaker embedding tensor. Please re-record or upload a voice sample in Voice Setup.')
      } else {
        setErrorNotice('Cannot generate in Personal Voice mode: you have not enrolled your voice profile yet. Please switch to Standard Voice mode or complete enrollment in Voice Setup.')
      }
      return
    }

    playUiSound('generate')
    setIsGenerating(true)
    setGenerationProgress(25)
    setGenerationStep('Validating input & Indic phonetic rules...')

    setTimeout(() => {
      setGenerationProgress(65)
      setGenerationStep('Streaming synthesis through Gnani Timbre Engine (api.vachana.ai)...')
    }, 400)

    try {
      // Connect to backend POST /api/speech/generate
      const response = await speechApi.generate({
        text: scriptText,
        title: scriptTitle.trim() || undefined,
        targetLanguage: selectedLanguage,
        voiceMode,
        standardVoiceId: selectedStandardVoice,
        speed,
      })

      setGenerationProgress(100)
      const newAsset: AudioAsset = response.asset
      setGeneratedAudio(newAsset)
      playUiSound('success')
      if (onAudioGenerated) onAudioGenerated(newAsset)
    } catch (err: any) {
      setGenerationProgress(0)
      setErrorNotice(err.message || 'Speech generation failed. Please check your acoustic parameters and provider connection.')
      playUiSound('click')
    } finally {
      setIsGenerating(false)
      setGenerationStep('')
    }
  }

  const handleSaveToLibrary = () => {
    playUiSound('click')
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
          </div>
          <h1 className="text-2xl sm:text-3xl font-pixel uppercase tracking-wide text-voxel-cloud flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-voxel-gold" />
            <span>MULTILINGUAL SPEECH STUDIO</span>
          </h1>
          <p className="text-xs font-sans text-voxel-stone-light mt-1">
            Craft scripts in Indian languages, select acoustic parameters, and synthesize high-resolution 48kHz audio.
          </p>
        </div>

        <VoiceCore
          isGenerating={isGenerating}
          isPlaying={Boolean(generatedAudio)}
          hasSucceeded={Boolean(generatedAudio && !isGenerating)}
          size={52}
          label={isGenerating ? 'SYNTHESIZING' : generatedAudio ? 'AUDIO READY' : 'TIMBRE READY'}
        />
      </div>

      {voiceStatus === 'EMBEDDING_MISSING' && !errorNotice && (
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
                  MAX 1,000 CHARACTERS
                </span>
              </div>
              <CardDescription>
                Compose or paste your script below. Punctuation hints and Hindi/English numerals are supported.
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
                charLimit={1000}
                currentLength={scriptText.length}
                rows={6}
                required
              />
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
                      if (isPersonalVoiceReady) {
                        setVoiceMode('personal')
                      }
                    }}
                    disabled={!isPersonalVoiceReady}
                    className={`p-3 text-left border-2 block-pressable transition-all ${
                      voiceMode === 'personal' && isPersonalVoiceReady
                        ? 'bg-[#153818] border-voxel-grass shadow-voxel-grass'
                        : isPersonalVoiceReady
                        ? 'bg-voxel-bedrock border-voxel-stone-dark'
                        : 'bg-voxel-bedrock border-voxel-stone-dark opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Mic className={`w-3.5 h-3.5 ${isPersonalVoiceReady ? 'text-voxel-grass' : 'text-voxel-stone-light'}`} />
                      <span className="text-[10px] font-pixel text-voxel-cloud uppercase">
                        PERSONAL
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-voxel-stone-light">
                      {isPersonalVoiceReady
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

              {/* Generation Progress Indicator */}
              {isGenerating && (
                <div className="space-y-2 bg-[#121417] p-3 border-2 border-voxel-gold">
                  <div className="flex items-center justify-between text-[10px] font-pixel text-voxel-gold">
                    <span>{generationStep}</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <BlockProgress
                    value={generationProgress}
                    max={100}
                    variant="emerald"
                    segments={10}
                  />
                </div>
              )}

              {/* Big Prominent Generate Button */}
              <BlockButton
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                isLoading={isGenerating}
                className="w-full py-4 text-xs sm:text-sm"
                rightIcon={<Sparkles className="w-4 h-4 text-voxel-gold" />}
              >
                CRAFT & SYNTHESIZE SPEECH
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
              </div>

              <div className="flex items-center gap-2">
                <BlockButton
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveToLibrary}
                  leftIcon={<BookmarkPlus className="w-3.5 h-3.5 text-voxel-gold" />}
                >
                  {savedSuccess ? 'SAVED TO CHEST' : 'SAVE TO CHEST'}
                </BlockButton>
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

            {/* Generated Script Quote */}
            <div className="bg-[#121417] p-3 border-2 border-voxel-stone-dark shadow-voxel-inset">
              <p className="text-xs font-sans text-voxel-cloud italic leading-relaxed">
                "{generatedAudio.textPreview}"
              </p>
            </div>

            {/* Voxel Audio Player */}
            <VoxelAudioPlayer
              assetId={generatedAudio.id}
              title={generatedAudio.title}
              voiceLabel={generatedAudio.voiceLabel}
              languageName={generatedAudio.languageName}
              durationSeconds={generatedAudio.durationSeconds}
              voiceMode={generatedAudio.voiceMode}
              audioUrl={generatedAudio.audioUrl}
              onRequestSignedUrl={(id) => audioApi.getSignedUrl(id)}
            />
          </VoxelCard>
        </section>
      )}
    </div>
  )
}
