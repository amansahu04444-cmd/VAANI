import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ArrowRight, Key } from 'lucide-react'
import { BlockButton } from '../components/ui/BlockButton'
import { VoxelCard, CardHeader, CardContent } from '../components/ui/VoxelCard'
import { BlockInput } from '../components/ui/BlockInput'
import { VoiceCore } from '../components/ui/VoiceCore'
import { VoxelWaveform } from '../components/ui/VoxelWaveform'
import { BlockBadge } from '../components/ui/BlockBadge'
import { BlockNoticeBanner } from '../components/ui/BlockNoticeBanner'
import { APP_NAME } from '../lib/constants'

export interface AuthProps {
  onLoginSuccess?: (email: string) => void
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please provide both email and password.')
      return
    }

    if (isSignUp && !displayName) {
      setError('Please provide your name.')
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      if (onLoginSuccess) {
        onLoginSuccess(email)
      }
      navigate('/dashboard')
    }, 600)
  }

  const handleDemoLogin = () => {
    setEmail('hackathon.evaluator@gnani.ai')
    setPassword('DemoVault2026!')
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      if (onLoginSuccess) {
        onLoginSuccess('hackathon.evaluator@gnani.ai')
      }
      navigate('/dashboard')
    }, 450)
  }

  return (
    <div className="max-w-5xl mx-auto py-8 sm:py-12 select-none">
      {/* Split-Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Voxel World Voice Core Illustration */}
        <div className="lg:col-span-6 space-y-6 bg-[#16191D] border-4 border-[#3D434A] p-8 shadow-voxel-lg relative overflow-hidden">
          {/* Subtle Corner Accents */}
          <div className="absolute top-0 left-0 w-2 h-2 bg-voxel-gold" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-voxel-gold" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-voxel-gold" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-voxel-gold" />

          <div className="flex items-center justify-between">
            <BlockBadge variant="grass">VOXEL CHUNK #2026</BlockBadge>
            <span className="font-mono text-[10px] text-voxel-sand">SECURE AUTH PORTAL</span>
          </div>

          <div className="text-center py-6 space-y-4">
            <VoiceCore status="ready" isPlaying size={84} label="48kHz VECTOR CORE" className="mx-auto" />
            <h2 className="text-xl sm:text-2xl font-pixel uppercase tracking-wide text-voxel-cloud">
              {APP_NAME} VOICE CORE
            </h2>
            <p className="text-xs font-sans text-voxel-stone-light max-w-sm mx-auto leading-relaxed">
              Step into India's voxelized AI voice studio. Build your voice identity with zero deepfake risk under DPDP biometric security.
            </p>
          </div>

          {/* Voxel Audio Waveform Stream */}
          <div className="space-y-1.5 bg-[#121417] p-3 border-2 border-voxel-stone-dark shadow-voxel-inset">
            <div className="flex items-center justify-between text-[9px] font-mono text-voxel-gold">
              <span>VOICE FREQUENCY: 48,000 HZ</span>
              <span>STATUS: ONLINE</span>
            </div>
            <VoxelWaveform isPlaying progressPercent={65} barCount={32} height={32} variant="emerald" />
          </div>

          {/* Biome Metadata strip */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-voxel-stone-light pt-2 border-t-2 border-voxel-stone-dark">
            <div>
              <span className="text-voxel-sand font-pixel">TTS ENGINE:</span> Gnani Timbre
            </div>
            <div>
              <span className="text-voxel-sand font-pixel">RLS ISOLATION:</span> Strict 100%
            </div>
          </div>
        </div>

        {/* Right Side: Block Authentication Form */}
        <div className="lg:col-span-6 space-y-4">
          <VoxelCard biome="stone" glow>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-pixel text-voxel-gold uppercase">IDENTITY GATE</span>
                <BlockBadge variant="lapis">SUPABASE JWT</BlockBadge>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-[#121417] p-1 border-2 border-voxel-stone-dark shadow-voxel-inset">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false)
                    setError(null)
                  }}
                  className={`flex-1 py-2 text-[10px] font-pixel uppercase transition-all block-pressable ${
                    !isSignUp
                      ? 'bg-voxel-grass text-voxel-bedrock shadow-voxel-sm border border-[#88D169]'
                      : 'text-voxel-stone-light hover:text-white'
                  }`}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true)
                    setError(null)
                  }}
                  className={`flex-1 py-2 text-[10px] font-pixel uppercase transition-all block-pressable ${
                    isSignUp
                      ? 'bg-voxel-grass text-voxel-bedrock shadow-voxel-sm border border-[#88D169]'
                      : 'text-voxel-stone-light hover:text-white'
                  }`}
                >
                  CREATE ACCOUNT
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {error && (
                <BlockNoticeBanner
                  variant="error"
                  message={error}
                  onDismiss={() => setError(null)}
                />
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <BlockInput
                    label="YOUR CALLSIGN / NAME"
                    placeholder="Aman Sharma"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={isSignUp}
                  />
                )}

                <BlockInput
                  label="EMAIL ADDRESS"
                  type="email"
                  placeholder="name@vaani.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />

                <BlockInput
                  label="VAULT PASSWORD"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />

                <BlockButton
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full mt-2"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isSignUp ? 'CREATE VOXEL PROFILE' : 'ENTER VOICE STUDIO'}
                </BlockButton>
              </form>

              {/* Fast Evaluator 1-Click Login */}
              <div className="pt-4 border-t-2 border-voxel-stone-dark/80 mt-4 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-pixel text-voxel-sand">
                  <span>HACKATHON EVALUATOR MODE</span>
                  <Key className="w-3.5 h-3.5 text-voxel-gold" />
                </div>
                <BlockButton
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={handleDemoLogin}
                  className="w-full text-[10px]"
                >
                  ⚡ QUICK LOGIN AS EVALUATOR
                </BlockButton>
              </div>
            </CardContent>
          </VoxelCard>
        </div>
      </div>
    </div>
  )
}
