import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic2, Sparkles, Languages, ArrowRight, CheckCircle2, Lock, Volume2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { AudioPlayer } from '../components/ui/AudioPlayer'
import { SUPPORTED_LANGUAGES, DEMO_SCRIPTS } from '../lib/constants'

export const Landing: React.FC = () => {
  const [activeDemoScript, setActiveDemoScript] = useState(DEMO_SCRIPTS[0])

  return (
    <div className="space-y-24 py-6">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-studio-800/90 border border-teal-glow/40 text-teal-soft text-xs font-mono shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-teal-accent animate-pulse" />
          <span>Powered by Gnani AI Timbre & Vachana Speech Architecture</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Your Voice. Your Words.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-soft via-teal-accent to-emerald-400">
            Every Language.
          </span>
        </h1>

        <p className="text-lg text-studio-300 max-w-2xl mx-auto leading-relaxed">
          Record a voice sample once. Prepare scripts in Indian languages, generate speech with your personalized voice profile, and build a reusable private audio library.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link to="/studio">
            <Button size="lg" className="shadow-xl shadow-teal-glow/20 px-8" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open Speech Studio
            </Button>
          </Link>
          <Link to="/voice-setup">
            <Button variant="secondary" size="lg" className="border-studio-700" leftIcon={<Mic2 className="w-4 h-4 text-teal-soft" />}>
              Enroll Your Voice
            </Button>
          </Link>
        </div>

        {/* Trust Points */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-8 max-w-2xl mx-auto text-xs text-studio-400">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Strict Consent Verification</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>10+ Indian Languages & Hinglish</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Private Storage & Full Deletion</span>
          </div>
        </div>
      </section>

      {/* Interactive Audio Experience */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="teal">Interactive Demo</Badge>
          <h2 className="text-2xl font-bold text-white">Experience Multilingual Voice Synthesis</h2>
          <p className="text-xs text-studio-400">
            Select a sample script below to inspect speech generation across Indian linguistic contexts.
          </p>
        </div>

        {/* Script Selection Chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {DEMO_SCRIPTS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDemoScript(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeDemoScript.title === s.title
                  ? 'bg-teal-glow text-white shadow-md shadow-teal-glow/20 border border-teal-soft'
                  : 'bg-studio-800 text-studio-300 hover:bg-studio-750 border border-studio-700'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Demo Script Display & Audio Player */}
        <Card className="bg-studio-950/80 border-studio-800" glow>
          <div className="space-y-4">
            <div className="bg-studio-900 rounded-lg p-4 border border-studio-800 text-sm font-sans text-studio-200 italic leading-relaxed">
              "{activeDemoScript.text}"
            </div>
            <AudioPlayer
              title={activeDemoScript.title}
              voiceLabel="VAANI Enrolled Speaker (Aman)"
              languageName={
                activeDemoScript.lang === 'hi-IN'
                  ? 'Hindi (हिन्दी)'
                  : activeDemoScript.lang === 'en-IN'
                  ? 'Indian English'
                  : 'Hinglish (Code-mixed)'
              }
              durationSeconds={12}
            />
          </div>
        </Card>
      </section>

      {/* How it Works / Workflow Steps */}
      <section className="space-y-10">
        <div className="text-center space-y-2">
          <Badge variant="slate">Engineered Workflow</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Three Simple Steps to Multilingual Voice Output</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-studio-600 transition-all">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-teal-950 border border-teal-glow/30 flex items-center justify-center text-teal-soft mb-2">
                <Mic2 className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">1. Consented Enrollment</CardTitle>
              <CardDescription>
                Record 5 to 30 seconds of clean speech with explicit consent. Gnani AI extracts a compact numerical speaker embedding.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-studio-600 transition-all">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-teal-950 border border-teal-glow/30 flex items-center justify-center text-teal-soft mb-2">
                <Languages className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">2. Multilingual Scripting</CardTitle>
              <CardDescription>
                Type or paste your announcement or note in Hindi, Indian English, Hinglish, or regional Indic languages with punctuation hints.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-studio-600 transition-all">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-teal-950 border border-teal-glow/30 flex items-center justify-center text-teal-soft mb-2">
                <Volume2 className="w-5 h-5" />
              </div>
              <CardTitle className="text-base">3. Synthesis & Reusable Library</CardTitle>
              <CardDescription>
                Gnani Timbre v2.5 synthesizes 48kHz WAV audio conditioned on your speaker embedding. Download or replay anytime.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Supported Languages Matrix */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="teal">Coverage</Badge>
          <h2 className="text-2xl font-bold text-white">Supported Indian Languages</h2>
          <p className="text-xs text-studio-400">
            Backed by Gnani AI's specialized acoustic models trained on Indic pronunciation and code-mixing.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <div
              key={lang.code}
              className="bg-studio-850/60 border border-studio-800 rounded-lg p-3 hover:border-teal-glow/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{lang.name}</span>
                <span className="font-mono text-[10px] text-teal-soft">{lang.code}</span>
              </div>
              <p className="text-xs text-studio-400 font-sans mt-0.5">{lang.nativeName}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy & Trust Callout */}
      <section className="bg-gradient-to-b from-studio-850 to-studio-950 border border-studio-800 rounded-2xl p-8 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-teal-soft text-sm font-semibold">
            <Lock className="w-4 h-4 text-teal-accent" />
            <span>DPDP & Biometric Voice Security</span>
          </div>
          <h3 className="text-xl font-bold text-white">Your Voice Belongs Exclusively to You</h3>
          <p className="text-xs text-studio-300 max-w-xl leading-relaxed">
            VAANI converts reference audio into encrypted mathematical embeddings. We never make voice profiles public, never allow unauthorized cloning of third parties, and provide instant, irrevocable profile deletion.
          </p>
        </div>
        <Link to="/voice-setup" className="shrink-0">
          <Button variant="primary" size="md">
            Start Enrollment
          </Button>
        </Link>
      </section>
    </div>
  )
}
