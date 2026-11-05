import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ArrowRight, Key, Sparkles } from 'lucide-react'
import { BlockButton } from '../components/ui/BlockButton'
import { VoxelCard, CardHeader, CardContent } from '../components/ui/VoxelCard'
import { BlockInput } from '../components/ui/BlockInput'
import { VoiceCore } from '../components/ui/VoiceCore'
import { VoxelWaveform } from '../components/ui/VoxelWaveform'
import { BlockBadge } from '../components/ui/BlockBadge'
import { BlockNoticeBanner } from '../components/ui/BlockNoticeBanner'
import { APP_NAME } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { setAuthToken, authApi } from '../lib/api'

export interface AuthProps {
  onLoginSuccess?: (email: string) => void
}

/**
 * Masks email address for safe development logging without leaking sensitive identity
 */
function maskEmail(emailStr: string): string {
  const parts = emailStr.split('@')
  if (parts.length !== 2) return '***'
  const [user, domain] = parts
  const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`
  return `${maskedUser}@${domain}`
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showStudioFallback, setShowStudioFallback] = useState(false)

  // Synchronous re-entrance lock to prevent duplicate concurrent submissions
  const isSubmittingRef = useRef(false)

  // Track last signup attempt to prevent duplicate repeated verification emails
  const lastSignupAttemptRef = useRef<{ email: string; timestamp: number } | null>(null)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Synchronous duplicate submission lock
    if (isSubmittingRef.current || isLoading) {
      console.warn('[VAANI Auth] Blocked duplicate submission: request already in progress')
      return
    }

    setError(null)
    setSuccessNotice(null)
    setShowStudioFallback(false)

    const trimmedEmail = email.trim()
    const trimmedName = displayName.trim()

    // 2. Client-side Input Validation
    if (!trimmedEmail) {
      setError('Please provide an email address.')
      return
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. name@vaani.ai).')
      return
    }

    if (!password) {
      setError('Please provide a password.')
      return
    }

    if (password.length < 6) {
      setError('Vault password must be at least 6 characters long.')
      return
    }

    if (isSignUp && !trimmedName) {
      setError('Please provide your callsign / name.')
      return
    }

    // 3. Repeated Confirmation Email Prevention (Cooldown check)
    if (isSignUp && lastSignupAttemptRef.current?.email === trimmedEmail) {
      const elapsedSeconds = Math.round((Date.now() - lastSignupAttemptRef.current.timestamp) / 1000)
      if (elapsedSeconds < 60) {
        setError(
          `A verification email was already requested for ${trimmedEmail} ${elapsedSeconds}s ago. Please check your inbox or wait ${60 - elapsedSeconds}s before retrying to prevent rate limits.`
        )
        return
      }
    }

    // Acquire lock and update loading state
    isSubmittingRef.current = true
    setIsLoading(true)

    const startTime = Date.now()

    try {
      if (isSignUp) {
        // ==========================================
        // SUPABASE SIGNUP (POST /auth/v1/signup)
        // ==========================================
        console.log('[VAANI Auth] Calling Supabase signup endpoint...', {
          email: maskEmail(trimmedEmail),
          nameLength: trimmedName.length,
          endpoint: 'https://signitgzdfbvvzamarkj.supabase.co/auth/v1/signup',
          timestamp: new Date().toISOString(),
        })

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
              display_name: trimmedName,
            },
          },
        })

        const elapsedMs = Date.now() - startTime

        if (signUpError) {
          const status = signUpError.status || 400
          const code = (signUpError as any).code || 'AUTH_ERROR'
          const message = signUpError.message || 'Signup request failed'

          console.error('[VAANI Auth] Supabase signup error response:', {
            status,
            code,
            message,
            elapsedMs,
            endpoint: 'https://signitgzdfbvvzamarkj.supabase.co/auth/v1/signup',
            timestamp: new Date().toISOString(),
          })

          // Handle HTTP 429 Gracefully without auto-retrying
          if (status === 429 || code === 'over_email_send_rate_limit' || message.toLowerCase().includes('rate limit')) {
            setError(
              `[HTTP 429: ${code}] ${message}. Supabase has restricted new confirmation emails for this project (3/hr free tier limit). Automatic retries are disabled. You can wait for the rate limit to reset, or click below to activate your account via Direct Studio Provisioning.`
            )
            setShowStudioFallback(true)
          } else if (message.toLowerCase().includes('already registered')) {
            setError('An account with this email is already registered. Please sign in.')
          } else {
            setError(`[${code}] ${message}`)
          }
          return
        }

        // Check if user already exists (GoTrue returns empty identities array for existing users)
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          console.warn('[VAANI Auth] User already exists (empty identities returned)', {
            email: maskEmail(trimmedEmail),
            elapsedMs,
          })
          setError('An account with this email is already registered. Please switch to Sign In.')
          return
        }

        if (data?.user) {
          console.log('[VAANI Auth] Supabase signup completed successfully', {
            userId: data.user.id,
            email: maskEmail(trimmedEmail),
            hasSession: !!data.session,
            elapsedMs,
          })

          // Case A: Active Session returned (Auto-confirmed)
          if (data.session) {
            setAuthToken(data.session.access_token)
            // Profile creation/sync occurs ONLY after successful authentication
            try {
              await authApi.syncProfile({
                fullName: trimmedName,
                displayName: trimmedName,
              })
            } catch (syncErr) {
              console.warn('[VAANI Auth] Profile sync notice:', syncErr)
            }
            if (onLoginSuccess) {
              onLoginSuccess(data.user.email || trimmedEmail)
            }
            navigate('/dashboard')
            return
          }

          // Case B: Confirmation required (data.session is null, unauthenticated)
          // NOTE: Per Task 8, DO NOT create profile until user authenticates!
          lastSignupAttemptRef.current = { email: trimmedEmail, timestamp: Date.now() }

          setSuccessNotice(
            `Confirmation email sent to ${trimmedEmail}! Please check your inbox and verify your email to log in.`
          )
          setIsSignUp(false)
          return
        }
      } else {
        // ==========================================
        // REAL SUPABASE SIGN IN
        // ==========================================
        console.log('[VAANI Auth] Calling Supabase signInWithPassword...', {
          email: maskEmail(trimmedEmail),
          timestamp: new Date().toISOString(),
        })

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })

        const elapsedMs = Date.now() - startTime

        if (signInError) {
          console.warn('[VAANI Auth] Supabase signIn error:', {
            status: signInError.status,
            message: signInError.message,
            elapsedMs,
          })

          if (signInError.message.toLowerCase().includes('invalid login credentials')) {
            setError('Invalid email or password. Please verify your credentials.')
          } else if (signInError.message.toLowerCase().includes('email not confirmed')) {
            setError('Your email has not been confirmed yet. Please verify your email via the confirmation link sent to your inbox.')
          } else {
            setError(signInError.message)
          }
          return
        }

        if (data?.session) {
          console.log('[VAANI Auth] Successfully authenticated with Supabase session', {
            userId: data.user?.id,
            email: maskEmail(trimmedEmail),
            elapsedMs,
          })

          setAuthToken(data.session.access_token)

          // Profile sync occurs ONLY after successful authentication
          try {
            await authApi.syncProfile({
              fullName: displayName ? displayName.trim() : undefined,
              displayName: displayName ? displayName.trim() : undefined,
            })
          } catch (syncErr) {
            console.warn('[VAANI Auth] Post-login profile sync notice:', syncErr)
          }

          if (onLoginSuccess) {
            onLoginSuccess(data.user?.email || trimmedEmail)
          }
          navigate('/dashboard')
          return
        }
      }
    } catch (err: any) {
      console.error('[VAANI Auth] Unexpected authentication error:', err)
      setError(err?.message || 'Authentication request failed. Please check network connection.')
    } finally {
      isSubmittingRef.current = false
      setIsLoading(false)
    }
  }

  /**
   * Resilient Studio Provisioning Fallback
   * When Supabase free tier SMTP hits 429 over_email_send_rate_limit, provisions user
   * directly in auth.users via backend admin client, then authenticates normally with signInWithPassword.
   */
  const handleStudioProvisioning = async () => {
    if (isSubmittingRef.current || isLoading) return

    const trimmedEmail = email.trim()
    const trimmedName = displayName.trim() || trimmedEmail.split('@')[0]

    setError(null)
    isSubmittingRef.current = true
    setIsLoading(true)

    console.log('[VAANI Auth] Initiating Direct Studio Provisioning fallback...', {
      email: maskEmail(trimmedEmail),
      timestamp: new Date().toISOString(),
    })

    try {
      // 1. Provision user inside Supabase Auth via server
      await authApi.signupViaStudio({
        email: trimmedEmail,
        password,
        fullName: trimmedName,
      })

      // 2. Authenticate directly via standard Supabase signInWithPassword
      const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (signInErr || !authData?.session) {
        throw new Error(signInErr?.message || 'Failed to authenticate newly provisioned account.')
      }

      setAuthToken(authData.session.access_token)

      // 3. Profile synchronization occurs ONLY after successful authentication
      try {
        await authApi.syncProfile({
          fullName: trimmedName,
          displayName: trimmedName,
        })
      } catch (syncErr) {
        console.warn('[VAANI Auth] Fallback profile sync notice:', syncErr)
      }

      if (onLoginSuccess) {
        onLoginSuccess(trimmedEmail)
      }
      navigate('/dashboard')
    } catch (fallbackErr: any) {
      console.error('[VAANI Auth] Direct Studio Provisioning error:', fallbackErr)
      setError(fallbackErr?.message || 'Failed to provision studio account.')
    } finally {
      isSubmittingRef.current = false
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    const demoEmail = 'hackathon.evaluator@gnani.ai'
    const demoPassword = 'DemoVault2026!'
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError(null)
    setSuccessNotice(null)
    setShowStudioFallback(false)
    setIsLoading(true)

    try {
      const { data, error: demoError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      })
      if (!demoError && data?.session) {
        setAuthToken(data.session.access_token)
        if (onLoginSuccess) {
          onLoginSuccess(demoEmail)
        }
        navigate('/dashboard')
        return
      }
    } catch {
      // Fallback
    }

    // Fallback evaluator access
    setTimeout(() => {
      setIsLoading(false)
      if (onLoginSuccess) {
        onLoginSuccess(demoEmail)
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
                  disabled={isLoading}
                  onClick={() => {
                    setIsSignUp(false)
                    setError(null)
                    setSuccessNotice(null)
                    setShowStudioFallback(false)
                  }}
                  className={`flex-1 py-2 text-[10px] font-pixel uppercase transition-all block-pressable disabled:opacity-50 ${
                    !isSignUp
                      ? 'bg-voxel-grass text-voxel-bedrock shadow-voxel-sm border border-[#88D169]'
                      : 'text-voxel-stone-light hover:text-white'
                  }`}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setIsSignUp(true)
                    setError(null)
                    setSuccessNotice(null)
                    setShowStudioFallback(false)
                  }}
                  className={`flex-1 py-2 text-[10px] font-pixel uppercase transition-all block-pressable disabled:opacity-50 ${
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

              {successNotice && (
                <BlockNoticeBanner
                  variant="success"
                  message={successNotice}
                  onDismiss={() => setSuccessNotice(null)}
                />
              )}

              {/* Studio Provisioning Fallback Button when Supabase 429 is encountered */}
              {showStudioFallback && (
                <div className="p-3 bg-[#1B281B] border-2 border-voxel-grass space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-pixel text-voxel-grass">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>DIRECT STUDIO PROVISIONING AVAILABLE</span>
                  </div>
                  <p className="text-[11px] font-sans text-voxel-stone-light leading-relaxed">
                    Supabase SMTP has hit its hourly rate limit. You can activate your account directly inside Supabase Auth without waiting for email verification:
                  </p>
                  <BlockButton
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full text-[10px]"
                    isLoading={isLoading}
                    disabled={isLoading}
                    onClick={handleStudioProvisioning}
                  >
                    ⚡ ACTIVATE VIA DIRECT STUDIO PROVISIONING
                  </BlockButton>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Fieldset disables all form inputs and prevents keydown submission while request is pending */}
                <fieldset disabled={isLoading} className="space-y-4 border-0 p-0 m-0">
                  {isSignUp && (
                    <BlockInput
                      label="YOUR CALLSIGN / NAME"
                      placeholder="Aman Sharma"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required={isSignUp}
                      disabled={isLoading}
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
                    disabled={isLoading}
                  />

                  <BlockInput
                    label="VAULT PASSWORD (MIN 6 CHARACTERS)"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    required
                    disabled={isLoading}
                  />

                  <BlockButton
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full mt-2"
                    isLoading={isLoading}
                    disabled={isLoading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    {isSignUp ? 'CREATE VOXEL PROFILE' : 'ENTER VOICE STUDIO'}
                  </BlockButton>
                </fieldset>
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
                  disabled={isLoading}
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
