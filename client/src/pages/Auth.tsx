/* oxlint-disable react/set-state-in-effect */
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react'
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
  const [searchParams] = useSearchParams()
  // Default strictly to false (LOGIN mode); only true if URL explicitly specifies mode=signup
  const [isSignUp, setIsSignUp] = useState(() => searchParams.get('mode') === 'signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showStudioFallback, setShowStudioFallback] = useState(false)

  const handleSwitchToLogin = () => {
    setIsSignUp(false)
    navigate('/auth?mode=login', { replace: true })
    setError(null)
    setSuccessNotice(null)
    setShowStudioFallback(false)
  }

  const handleSwitchToSignUp = () => {
    setIsSignUp(true)
    navigate('/auth?mode=signup', { replace: true })
    setError(null)
    setSuccessNotice(null)
    setShowStudioFallback(false)
  }

  // Synchronize tab with URL query parameter (defaulting to /auth?mode=login)
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'signup') {
      setIsSignUp(true)
    } else {
      setIsSignUp(false)
      if (mode !== 'login') {
        navigate('/auth?mode=login', { replace: true })
      }
    }
  }, [searchParams, navigate])

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
            <BlockBadge variant={isSignUp ? 'gold' : 'grass'}>VOXEL CHUNK #2026</BlockBadge>
            <span className="font-mono text-[10px] text-voxel-sand">
              {isSignUp ? 'CITIZEN REGISTRATION' : 'CITIZEN LOGIN PORTAL'}
            </span>
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
            <CardHeader className="space-y-3">
              {/* Badge & Section Label */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BlockBadge variant={isSignUp ? 'gold' : 'grass'}>
                    {isSignUp ? 'SIGNUP' : 'LOGIN'}
                  </BlockBadge>
                  <span className="text-[10px] font-pixel text-voxel-gold uppercase tracking-wider">
                    {isSignUp ? 'NEW CITIZEN REGISTRATION' : 'CITIZEN LOGIN GATE'}
                  </span>
                </div>
                <BlockBadge variant="lapis">SUPABASE AUTH</BlockBadge>
              </div>

              {/* Main Heading & Form Description */}
              <div>
                <h1 className="text-xl sm:text-2xl font-pixel uppercase tracking-wide text-voxel-cloud">
                  {isSignUp ? 'CREATE YOUR ACCOUNT' : 'SIGN IN TO VAANI'}
                </h1>
                <p className="text-xs font-sans text-voxel-stone-light mt-1">
                  {isSignUp
                    ? 'Register your callsign to build your voice profile and store generated audio.'
                    : 'Welcome back! Enter your email and password to access your speech studio.'}
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-[#121417] p-1 border-2 border-voxel-stone-dark shadow-voxel-inset">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSwitchToLogin}
                  className={`flex-1 py-2 text-[10px] font-pixel uppercase transition-all block-pressable disabled:opacity-50 ${
                    !isSignUp
                      ? 'bg-voxel-grass text-voxel-bedrock shadow-voxel-sm border border-[#88D169] font-bold'
                      : 'text-voxel-stone-light hover:text-white'
                  }`}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSwitchToSignUp}
                  className={`flex-1 py-2 text-[10px] font-pixel uppercase transition-all block-pressable disabled:opacity-50 ${
                    isSignUp
                      ? 'bg-voxel-grass text-voxel-bedrock shadow-voxel-sm border border-[#88D169] font-bold'
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
                      placeholder="Enter your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required={isSignUp}
                      disabled={isLoading}
                      autoComplete="name"
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
                    autoComplete="email"
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
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
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
                    {isSignUp ? 'CREATE VOXEL PROFILE' : 'SIGN IN'}
                  </BlockButton>

                  {/* Secondary Link: Toggle between Login and Signup */}
                  <div className="text-center pt-2">
                    {isSignUp ? (
                      <button
                        type="button"
                        onClick={handleSwitchToLogin}
                        className="text-xs font-mono text-voxel-stone-light hover:text-voxel-gold transition-colors inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-0"
                      >
                        <span>Already have an account?</span>
                        <span className="text-voxel-gold font-pixel underline underline-offset-4">Sign In</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSwitchToSignUp}
                        className="text-xs font-mono text-voxel-stone-light hover:text-voxel-grass transition-colors inline-flex items-center gap-1.5 cursor-pointer bg-transparent border-0"
                      >
                        <span>Don't have an account?</span>
                        <span className="text-voxel-grass font-pixel underline underline-offset-4">Create Account</span>
                      </button>
                    )}
                  </div>
                </fieldset>
              </form>

              {/* Secondary Action: Continue with Demo (No registration required) */}
              <div className="pt-4 border-t-2 border-voxel-stone-dark/80 mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-pixel text-voxel-sand">
                  <span>INSTANT GUEST ACCESS</span>
                  <BlockBadge variant="gold" size="sm">NO SIGNUP REQUIRED</BlockBadge>
                </div>
                <BlockButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => navigate('/demo')}
                  disabled={isLoading}
                  className="w-full text-xs font-pixel"
                  rightIcon={<ArrowRight className="w-4 h-4 text-voxel-gold" />}
                >
                  CONTINUE WITH DEMO
                </BlockButton>
                <p className="text-[10px] font-mono text-voxel-stone-light text-center">
                  Try Speech Studio directly with standard Timbre voices without creating an account.
                </p>
              </div>
            </CardContent>
          </VoxelCard>
        </div>
      </div>
    </div>
  )
}
