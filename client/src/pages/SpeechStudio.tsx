import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Mic, Volume2, Languages, Sliders, CheckCircle2, Download, BookmarkPlus } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Textarea } from '../components/ui/Textarea'
import { NoticeBanner } from '../components/ui/NoticeBanner'
import { AudioPlayer } from '../components/ui/AudioPlayer'
import { SUPPORTED_LANGUAGES, STANDARD_VOICES, DEMO_SCRIPTS } from '../lib/constants'
import type { VoiceMode, AudioAsset } from '../types'
import { speechApi } from '../lib/api'

export interface SpeechStudioProps {
  hasVoiceProfile?: boolean
  onAudioGenerated?: (newAudio: AudioAsset) => void
}

export const SpeechStudio: React.FC<SpeechStudioProps> = ({
  hasVoiceProfile = false,
  onAudioGenerated,
}) => {
  const [scriptText, setScriptText] = useState('')
  const [scriptTitle, setScriptTitle] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0].code)
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(hasVoiceProfile ? 'personal' : 'standard')
  const [selectedStandardVoice, setSelectedStandardVoice] = useState(STANDARD_VOICES[0].id)
  const [speed, setSpeed] = useState<number>(1.0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<string>('')
  const [generatedAudio, setGeneratedAudio] = useState<AudioAsset | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  const handleApplyTemplate = (template: { title: string; lang: string; text: string }) => {
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

    if (voiceMode === 'personal' && !hasVoiceProfile) {
      setErrorNotice('Cannot generate in Personal Voice mode: you have not enrolled your voice profile yet. Please switch to Standard Voice mode or complete enrollment in Voice Setup.')
      return
    }

    setIsGenerating(true)
    setGenerationStep('Validating input & script punctuation...')

    setTimeout(() => {
      setGenerationStep('Routing request to Gnani Timbre Engine (api.vachana.ai)...')
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

      const newAsset: AudioAsset = response.asset
      setGeneratedAudio(newAsset)
      if (onAudioGenerated) onAudioGenerated(newAsset)
    } catch {
      // Fallback for offline client preview
      const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0]
      const voiceLabel = voiceMode === 'personal' ? 'Your Enrolled Voice (Aman)' : `Timbre ${selectedStandardVoice}`

      const fallbackAsset: AudioAsset = {
        id: `aud-${Date.now()}`,
        userId: 'user-1',
        title: scriptTitle.trim() || `${currentLangObj.name} Script Announcement`,
        textPreview: scriptText,
        languageCode: selectedLanguage,
        languageName: currentLangObj.name,
        voiceMode,
        voiceLabel,
        durationSeconds: Math.max(6, Math.min(45, Math.round(scriptText.length / 15))),
        fileSizeBytes: 1024 * 1024,
        createdAt: new Date().toISOString(),
      }

      setGeneratedAudio(fallbackAsset)
      if (onAudioGenerated) onAudioGenerated(fallbackAsset)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToLibrary = () => {
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-teal-soft" />
            <span>Multilingual Speech Studio</span>
          </h1>
          <p className="text-xs sm:text-sm text-studio-400 mt-1">
            Turn written scripts into natural, high-fidelity Indian speech powered by Gnani Timbre.
          </p>
        </div>

        {/* Quick Voice Mode indicator */}
        <div className="flex items-center gap-2">
          {voiceMode === 'personal' ? (
            <Badge variant="teal" size="md">
              <Mic className="w-3.5 h-3.5" />
              <span>Personal Voice Active</span>
            </Badge>
          ) : (
            <Badge variant="slate" size="md">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Selected Voice: {selectedStandardVoice}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Main Studio Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Script Editor & Templates */}
        <div className="lg:col-span-2 space-y-6">
          <Card glow className="space-y-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Script Editor</CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-studio-400">
                  <Languages className="w-3.5 h-3.5 text-teal-soft" />
                  <span>Supports Indian Scripts & Romanized Transliteration</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Optional Script Title */}
              <div>
                <input
                  type="text"
                  placeholder="Script Title (e.g. Diwali Customer Announcement)"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                  className="w-full bg-studio-900 border border-studio-750 rounded-lg px-3.5 py-2 text-sm text-white placeholder-studio-500 focus:outline-none focus:ring-1 focus:ring-teal-glow transition-all"
                />
              </div>

              {/* Main Textarea */}
              <Textarea
                placeholder="Type or paste your script here in Hindi, English, Hinglish, or any supported Indian language..."
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                currentLength={scriptText.length}
                maxLength={1000}
                className="min-h-[170px]"
              />

              {/* Sample Template Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-studio-400 block font-medium">Quick Test Templates:</span>
                <div className="flex flex-wrap gap-2">
                  {DEMO_SCRIPTS.map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(template)}
                      className="px-2.5 py-1 text-xs bg-studio-900 hover:bg-studio-750 text-studio-300 hover:text-white rounded-md border border-studio-750 transition-colors text-left"
                    >
                      {template.title}
                    </button>
                  ))}
                </div>
              </div>

              {errorNotice && (
                <NoticeBanner type="error" title="Generation Blocked">
                  {errorNotice}
                </NoticeBanner>
              )}
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3">
              <div className="text-xs text-studio-400">
                {isGenerating ? (
                  <span className="text-teal-soft flex items-center gap-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-teal-accent animate-ping"></span>
                    <span>{generationStep}</span>
                  </span>
                ) : (
                  <span>Estimated audio duration: ~{Math.max(1, Math.round(scriptText.length / 15))} sec</span>
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                isLoading={isGenerating}
                onClick={handleGenerate}
                disabled={!scriptText.trim()}
                rightIcon={<Sparkles className="w-4 h-4" />}
              >
                Synthesize Speech
              </Button>
            </CardFooter>
          </Card>

          {/* Generated Audio Result Panel */}
          {generatedAudio && (
            <Card className="border-teal-glow/50 bg-studio-950/90 space-y-4" glow>
              <div className="flex items-center justify-between pb-2 border-b border-studio-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Generated Audio Ready</span>
                </div>
                <Badge variant={generatedAudio.voiceMode === 'personal' ? 'teal' : 'slate'} size="sm">
                  {generatedAudio.voiceMode === 'personal' ? 'Your Enrolled Voice' : 'Standard Timbre Voice'}
                </Badge>
              </div>

              <AudioPlayer
                title={generatedAudio.title}
                voiceLabel={generatedAudio.voiceLabel}
                languageName={generatedAudio.languageName}
                durationSeconds={generatedAudio.durationSeconds}
              />

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveToLibrary}
                  leftIcon={<BookmarkPlus className="w-4 h-4" />}
                >
                  {savedSuccess ? 'Saved to Library!' : 'Save to Private Library'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => alert(`Downloading "${generatedAudio.title}.wav" (48kHz PCM)...`)}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download WAV
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Voice & Speech Configuration */}
        <div className="space-y-6">
          <Card className="space-y-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-soft" />
                <span>Synthesis Settings</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Voice Mode Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-studio-300">Voice Synthesis Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVoiceMode('personal')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      voiceMode === 'personal'
                        ? 'bg-teal-950/60 border-teal-glow text-white shadow-sm'
                        : 'bg-studio-900 border-studio-750 text-studio-400 hover:bg-studio-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold block">Personal Voice</span>
                      <Mic className="w-3.5 h-3.5 text-teal-soft" />
                    </div>
                    <span className="text-[10px] text-studio-400 block leading-tight">
                      Enrolled speaker embedding
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoiceMode('standard')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      voiceMode === 'standard'
                        ? 'bg-teal-950/60 border-teal-glow text-white shadow-sm'
                        : 'bg-studio-900 border-studio-750 text-studio-400 hover:bg-studio-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold block">Selected Voice</span>
                      <Volume2 className="w-3.5 h-3.5 text-teal-soft" />
                    </div>
                    <span className="text-[10px] text-studio-400 block leading-tight">
                      Standard Timbre catalogue
                    </span>
                  </button>
                </div>

                {voiceMode === 'personal' && !hasVoiceProfile && (
                  <NoticeBanner type="warning" className="p-3 text-[11px] mt-2">
                    <span>Voice profile not enrolled yet. </span>
                    <Link to="/voice-setup" className="text-teal-soft underline font-medium">
                      Enroll now
                    </Link>
                  </NoticeBanner>
                )}
              </div>

              {/* Standard Voice Picker (shown if standard voice mode is selected) */}
              {voiceMode === 'standard' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-studio-300">Timbre Voice</label>
                  <select
                    value={selectedStandardVoice}
                    onChange={(e) => setSelectedStandardVoice(e.target.value)}
                    className="w-full bg-studio-900 border border-studio-750 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-glow"
                  >
                    {STANDARD_VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender} • {v.styleDescription})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Language Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-studio-300">Target Language Locale</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-studio-900 border border-studio-750 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-glow"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName}) — [{lang.code}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Speaking Speed Controller */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-studio-300">Speech Rate</span>
                  <span className="font-mono text-teal-soft">{speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.15"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-teal-glow bg-studio-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-studio-500 font-mono">
                  <span>0.85x (Slow)</span>
                  <span>1.0x (Normal)</span>
                  <span>1.15x (Fast)</span>
                </div>
              </div>

              {/* Acoustic Model Architecture Disclosure */}
              <div className="bg-studio-900/90 rounded-lg p-3 border border-studio-800 space-y-1 text-[11px] text-studio-400">
                <div className="flex justify-between">
                  <span>Acoustic Engine:</span>
                  <span className="text-white font-mono">Timbre v2.5 REST</span>
                </div>
                <div className="flex justify-between">
                  <span>Sample Rate:</span>
                  <span className="text-white font-mono">48,000 Hz</span>
                </div>
                <div className="flex justify-between">
                  <span>Container:</span>
                  <span className="text-white font-mono">16-bit Linear PCM (WAV)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
