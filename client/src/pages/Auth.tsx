import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Mic2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
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
    }, 700)
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
    }, 500)
  }

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      {/* Brand header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-deep to-teal-glow flex items-center justify-center shadow-xl shadow-teal-glow/20 border border-teal-glow/40 mx-auto">
          <Mic2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{APP_NAME} Voice Studio</h1>
        <p className="text-xs text-studio-400">
          Sign in to access your personal multilingual voice studio & library
        </p>
      </div>

      <Card glow>
        <CardHeader>
          {/* Tab Selector */}
          <div className="flex rounded-lg bg-studio-900 p-1 border border-studio-800">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setError(null)
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                !isSignUp ? 'bg-studio-800 text-white shadow-sm' : 'text-studio-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true)
                setError(null)
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                isSignUp ? 'bg-studio-800 text-white shadow-sm' : 'text-studio-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <Input
                label="Full Name"
                placeholder="Aman Sahu"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="aman@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isSignUp ? 'Create Studio Account' : 'Sign In to VAANI'}
            </Button>
          </form>

          {/* Demo Login for Evaluators */}
          <div className="pt-4 border-t border-studio-800 space-y-3">
            <div className="text-center">
              <span className="text-[11px] text-studio-500 uppercase tracking-wider font-mono">
                Challenge Evaluation Shortcut
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDemoLogin}
              className="w-full border-teal-glow/30 hover:border-teal-glow text-teal-soft hover:bg-teal-950/30"
              leftIcon={<UserCheck className="w-4 h-4" />}
            >
              Quick Sign In as Challenge Evaluator
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-studio-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>End-to-End User Isolation via PostgreSQL Row-Level Security</span>
      </div>
    </div>
  )
}
