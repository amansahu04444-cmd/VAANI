import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic2, Sparkles, ArrowRight, CheckCircle2, Lock } from 'lucide-react'
import { BlockButton } from '../components/ui/BlockButton'
import { VoxelCard, CardHeader, CardTitle, CardDescription } from '../components/ui/VoxelCard'
import { BlockBadge } from '../components/ui/BlockBadge'
import { VoxelAudioPlayer } from '../components/ui/VoxelAudioPlayer'
import { CinematicAudioHero } from '../components/ui/CinematicAudioHero'
import { CubeIllustration } from '../components/ui/CubeIllustration'
import { PixelDivider } from '../components/ui/PixelDivider'
import { SUPPORTED_LANGUAGES, DEMO_SCRIPTS } from '../lib/constants'

export const Landing: React.FC = () => {
  const [activeDemoScript, setActiveDemoScript] = useState(DEMO_SCRIPTS[0])

  return (
    <div className="space-y-24 py-4 select-none">
      {/* Cinematic Audio Studio Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-8 pt-4">
        {/* System Core Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#171A1E] border-2 border-voxel-grass text-voxel-grass text-xs font-pixel shadow-voxel-sm">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-voxel-gold" />
          <span>POWERED BY GNANI AI TIMBRE & VACHANA SPEECH ARCHITECTURE</span>
        </div>

        {/* Pixel Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-pixel uppercase tracking-wide text-voxel-cloud leading-tight">
          YOUR VOICE. YOUR WORDS.{' '}
          <span className="text-voxel-grass drop-shadow-[2px_2px_0px_#1D4427]">
            EVERY LANGUAGE.
          </span>
        </h1>

        {/* Readable Subtitle */}
        <p className="text-sm sm:text-base text-voxel-stone-light max-w-2xl mx-auto leading-relaxed font-sans">
          Record a 10-second voice sample once. Prepare conversational scripts across Indian languages, synthesize speech with your authentic vocal timbre, and build a reusable private block library.
        </p>

        {/* Large Cinematic Audio Visualization Centerpiece */}
        <CinematicAudioHero />

        {/* 3D Block Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
          <Link to="/studio">
            <BlockButton size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              OPEN SPEECH STUDIO
            </BlockButton>
          </Link>
          <Link to="/voice-setup">
            <BlockButton variant="gold" size="lg" leftIcon={<Mic2 className="w-4 h-4" />}>
              ENROLL VOICE PROFILE
            </BlockButton>
          </Link>
        </div>

        {/* Block World Trust Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 max-w-3xl mx-auto text-xs font-mono text-voxel-sand">
          <div className="flex items-center justify-center gap-2 bg-[#171A1E] p-2.5 border-2 border-voxel-stone-dark shadow-voxel-sm">
            <CheckCircle2 className="w-4 h-4 text-voxel-grass shrink-0" />
            <span>DPDP Biometric Consent</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-[#171A1E] p-2.5 border-2 border-voxel-stone-dark shadow-voxel-sm">
            <CheckCircle2 className="w-4 h-4 text-voxel-gold shrink-0" />
            <span>11 Indic Biomes & Hinglish</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-[#171A1E] p-2.5 border-2 border-voxel-stone-dark shadow-voxel-sm">
            <CheckCircle2 className="w-4 h-4 text-voxel-sky shrink-0" />
            <span>Private Storage & Signed URLs</span>
          </div>
        </div>
      </section>

      <PixelDivider color="grass" />

      {/* Interactive Voxel Jukebox Demo */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <BlockBadge variant="gold">INTERACTIVE JUKEBOX</BlockBadge>
          <h2 className="text-xl sm:text-2xl font-pixel uppercase text-voxel-cloud">
            EXPERIENCE MULTILINGUAL SYNTHESIS
          </h2>
          <p className="text-xs font-sans text-voxel-stone-light">
            Select a script block below to inspect speech generation across Indian linguistic contexts.
          </p>
        </div>

        {/* Script Selection Blocks */}
        <div className="flex flex-wrap justify-center gap-2.5">
          {DEMO_SCRIPTS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDemoScript(s)}
              className={`px-3 py-2 text-xs font-pixel uppercase tracking-wide transition-all border-2 block-pressable ${
                activeDemoScript.title === s.title
                  ? 'bg-voxel-grass text-voxel-bedrock border-[#88D169] shadow-voxel-grass'
                  : 'bg-[#181B1E] text-voxel-cloud border-voxel-stone-dark hover:border-voxel-stone-light'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Demo Script Display & Voxel Audio Player */}
        <VoxelCard biome="stone" glow className="space-y-4">
          <div className="bg-[#121417] p-4 border-2 border-voxel-stone-dark shadow-voxel-inset text-sm font-sans text-voxel-cloud italic leading-relaxed">
            "{activeDemoScript.text}"
          </div>
          <VoxelAudioPlayer
            title={activeDemoScript.title}
            voiceLabel="VAANI ENROLLED SPEAKER (AMAN)"
            voiceMode="personal"
            languageName={
              activeDemoScript.lang === 'hi-IN'
                ? 'Hindi (हिन्दी)'
                : activeDemoScript.lang === 'en-IN'
                ? 'Indian English'
                : 'Hinglish (Code-mixed)'
            }
            durationSeconds={12}
          />
        </VoxelCard>
      </section>

      <PixelDivider color="gold" />

      {/* 3 Step Workflow in Voxel Cards */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <BlockBadge variant="emerald">VOXEL CRAFTING PIPELINE</BlockBadge>
          <h2 className="text-xl sm:text-2xl font-pixel uppercase text-voxel-cloud">
            THREE BLOCKS TO VOICE MASTERY
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <VoxelCard biome="grass" className="space-y-3">
            <CardHeader>
              <CubeIllustration biome="grass" size={38} className="mb-2" />
              <CardTitle className="text-sm sm:text-base">1. CONSENTED ENROLLMENT</CardTitle>
              <CardDescription>
                Record 5 to 30 seconds of reference audio with affirmative DPDP consent. Gnani AI extracts a 768-dimensional biometric embedding.
              </CardDescription>
            </CardHeader>
          </VoxelCard>

          <VoxelCard biome="gold" className="space-y-3">
            <CardHeader>
              <CubeIllustration biome="gold" size={38} className="mb-2" />
              <CardTitle className="text-sm sm:text-base">2. MULTILINGUAL SCRIPTING</CardTitle>
              <CardDescription>
                Compose scripts up to 1,000 characters in Hindi, Indian English, Hinglish, or regional Indic languages with natural currency figures (₹).
              </CardDescription>
            </CardHeader>
          </VoxelCard>

          <VoxelCard biome="sky" className="space-y-3">
            <CardHeader>
              <CubeIllustration biome="sound" size={38} className="mb-2" />
              <CardTitle className="text-sm sm:text-base">3. TIMBRE SYNTHESIS</CardTitle>
              <CardDescription>
                Gnani Timbre v2.5 renders 48kHz WAV audio matching your vocal identity. Download, stream, or inspect in your private chest library.
              </CardDescription>
            </CardHeader>
          </VoxelCard>
        </div>
      </section>

      <PixelDivider color="stone" />

      {/* Supported Indic Language Biomes */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <BlockBadge variant="lapis">INDIC COVERAGE</BlockBadge>
          <h2 className="text-xl sm:text-2xl font-pixel uppercase text-voxel-cloud">
            11 SUPPORTED LANGUAGE BIOMES
          </h2>
          <p className="text-xs font-sans text-voxel-stone-light">
            Acoustic models trained on Indic pronunciation, dialectal rhythm, and Hinglish code-switching.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              className="bg-[#171A1E] border-2 border-voxel-stone-dark p-3 shadow-voxel-sm hover:border-voxel-gold transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-pixel text-voxel-cloud">{lang.name}</span>
                <span className="font-mono text-[10px] text-voxel-gold font-semibold">
                  {lang.code}
                </span>
              </div>
              <p className="text-xs text-voxel-stone-light font-sans mt-1">{lang.nativeName}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DPDP Biometric Vault Callout */}
      <section className="bg-[#121417] border-4 border-[#3D434A] p-6 sm:p-8 max-w-4xl mx-auto shadow-voxel-lg flex flex-col md:flex-row items-center justify-between gap-6 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-voxel-grass font-pixel text-xs">
            <Lock className="w-4 h-4 text-voxel-gold" />
            <span>DPDP ACT 2023 BIOMETRIC SAFETY GUARANTEE</span>
          </div>
          <h3 className="text-lg sm:text-xl font-pixel text-voxel-cloud uppercase">
            YOUR VOICE REMAINS YOUR EXCLUSIVE ASSET
          </h3>
          <p className="text-xs text-voxel-stone-light max-w-xl leading-relaxed font-sans">
            VAANI converts audio into encrypted numerical embeddings. Raw microphone audio is immediately purged. We never make profiles public and provide a one-click irreversible purge.
          </p>
        </div>
        <Link to="/voice-setup" className="shrink-0">
          <BlockButton variant="primary" size="md">
            START ENROLLMENT
          </BlockButton>
        </Link>
      </section>
    </div>
  )
}
