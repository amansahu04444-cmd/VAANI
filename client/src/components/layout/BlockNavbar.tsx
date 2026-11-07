import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Mic2,
  Radio,
  Sparkles,
  FileAudio,
  Settings as SettingsIcon,
  LogOut,
  User,
  ArrowRight,
} from 'lucide-react'
import { BlockBadge } from '../ui/BlockBadge'
import { BlockButton } from '../ui/BlockButton'
import { CubeIllustration } from '../ui/CubeIllustration'
import { APP_NAME } from '../../lib/constants'
import { useAudioEngine } from '../../context/AudioContext'
import { useAuth } from '../../context/AuthContext'
import type { VoiceEnrollmentState } from '../../types'

export interface NavbarProps {
  hasVoiceProfile?: boolean
  voiceStatus?: VoiceEnrollmentState
  userEmail?: string
  onSignOut?: () => void
}

export const BlockNavbar: React.FC<NavbarProps> = ({
  hasVoiceProfile = false,
  voiceStatus,
  userEmail,
  onSignOut,
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { playUiSound } = useAudioEngine()
  const { isAuthenticated, user, isProfileLoading, signOut } = useAuth()

  const isDemo = location.pathname === '/demo'

  const effectiveUsername =
    user?.rawUsername || user?.displayName || (user?.email ? user.email.split('@')[0] : userEmail || 'VAANI USER')

  const handleSignOut = async () => {
    playUiSound('click')
    if (onSignOut) {
      onSignOut()
    } else {
      await signOut()
    }
    navigate('/')
  }

  const authenticatedNavLinks = [
    { name: 'DASHBOARD', path: '/dashboard', icon: <Radio className="w-3.5 h-3.5" /> },
    { name: 'VOICE SETUP', path: '/voice-setup', icon: <Mic2 className="w-3.5 h-3.5" /> },
    { name: 'SPEECH STUDIO', path: '/studio', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { name: 'AUDIO LIBRARY', path: '/library', icon: <FileAudio className="w-3.5 h-3.5" /> },
    { name: 'SETTINGS', path: '/settings', icon: <SettingsIcon className="w-3.5 h-3.5" /> },
  ]

  return (
    <header className="sticky top-0 z-40 w-full bg-[#181B1E] border-b-4 border-[#101316] shadow-voxel select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link
          to={isAuthenticated ? '/dashboard' : '/'}
          onClick={() => playUiSound('click')}
          className="flex items-center gap-3 group shrink-0"
        >
          <CubeIllustration biome="grass" size={36} className="group-hover:scale-105 transition-transform" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-base sm:text-lg tracking-wider text-voxel-cloud">
                {APP_NAME}
              </span>
              <span className="text-[9px] uppercase font-pixel px-1.5 py-0.5 bg-voxel-bedrock border border-voxel-grass text-voxel-grass">
                GNANI AI
              </span>
            </div>
            <p className="text-[9px] font-mono text-voxel-stone-light hidden sm:block tracking-wider">
              VOXEL VOICE STUDIO
            </p>
          </div>
        </Link>

        {/* Center Section */}
        {isAuthenticated ? (
          /* Authenticated Desktop Hotbar / Inventory Navigation */
          <nav className="hidden md:flex items-center gap-1 p-1 bg-[#121417] border-2 border-voxel-stone-dark shadow-voxel-inset">
            {authenticatedNavLinks.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => playUiSound('nav')}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-pixel uppercase tracking-wide transition-all border group overflow-hidden ${
                    isActive
                      ? 'bg-[#292D32] text-voxel-gold border-voxel-gold shadow-voxel-sm'
                      : 'bg-transparent text-voxel-stone-light border-transparent hover:text-voxel-cloud hover:bg-voxel-stone-dark/50'
                  }`}
                >
                  {link.icon}
                  <span>{link.name}</span>
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-150 ${
                      isActive
                        ? 'bg-voxel-gold shadow-[0_0_6px_#F5D547]'
                        : 'bg-voxel-grass opacity-0 group-hover:opacity-100 group-hover:shadow-[0_0_6px_#67A94B]'
                    }`}
                  />
                </Link>
              )
            })}
          </nav>
        ) : isDemo ? (
          /* Demo Mode Center Indicator */
          <div className="hidden sm:flex items-center gap-2">
            <BlockBadge variant="gold" size="md">
              <span className="w-1.5 h-1.5 bg-voxel-gold animate-pulse"></span>
              <span>DEMO MODE ACTIVE</span>
            </BlockBadge>
          </div>
        ) : (
          /* Public Landing Page: No private navigation items */
          <div className="hidden md:block" />
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            /* Authenticated User Controls */
            <>
              <Link to="/voice-setup">
                {voiceStatus === 'READY' || (!voiceStatus && hasVoiceProfile) ? (
                  <BlockBadge variant="grass" size="sm" className="cursor-pointer hover:border-voxel-gold">
                    <span className="w-1.5 h-1.5 bg-voxel-grass animate-ping"></span>
                    <span>VOICE: ACTIVE</span>
                  </BlockBadge>
                ) : voiceStatus === 'EMBEDDING_MISSING' ? (
                  <BlockBadge
                    variant="redstone"
                    size="sm"
                    className="cursor-pointer hover:border-white"
                    title="Voice profile exists but speaker embedding tensor is missing. Click to re-record."
                  >
                    <span className="w-1.5 h-1.5 bg-voxel-redstone animate-pulse"></span>
                    <span>VOICE: MISSING TENSOR</span>
                  </BlockBadge>
                ) : voiceStatus === 'EMBEDDING_PROCESSING' ? (
                  <BlockBadge variant="lapis" size="sm" className="cursor-pointer hover:border-white">
                    <span className="w-1.5 h-1.5 bg-voxel-lapis animate-spin"></span>
                    <span>VOICE: PROCESSING</span>
                  </BlockBadge>
                ) : voiceStatus === 'EMBEDDING_FAILED' ? (
                  <BlockBadge variant="redstone" size="sm" className="cursor-pointer hover:border-white">
                    <span className="w-1.5 h-1.5 bg-voxel-redstone"></span>
                    <span>VOICE: FAILED</span>
                  </BlockBadge>
                ) : voiceStatus === 'RECORDING_UPLOADED' ? (
                  <BlockBadge variant="gold" size="sm" className="cursor-pointer hover:border-white">
                    <span className="w-1.5 h-1.5 bg-voxel-gold"></span>
                    <span>VOICE: UPLOADED</span>
                  </BlockBadge>
                ) : (
                  <BlockBadge variant="gold" size="sm" className="cursor-pointer hover:border-white">
                    <span className="w-1.5 h-1.5 bg-voxel-gold"></span>
                    <span>VOICE: NOT SET</span>
                  </BlockBadge>
                )}
              </Link>

              {/* User Profile / Callsign */}
              <div className="hidden lg:flex items-center gap-2 pl-2.5 border-l-2 border-voxel-stone-dark/80 text-xs">
                <div className="w-7 h-7 bg-voxel-bedrock border-2 border-voxel-stone-dark flex items-center justify-center text-voxel-gold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="truncate max-w-[140px] font-mono text-[10px] text-voxel-sand">
                  {isProfileLoading && !user?.rawUsername ? (
                    <span className="animate-pulse text-voxel-stone-light">...</span>
                  ) : (
                    effectiveUsername
                  )}
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="p-2 bg-voxel-bedrock hover:bg-[#381010] text-voxel-stone-light hover:text-voxel-redstone border-2 border-voxel-stone-dark hover:border-voxel-redstone block-pressable transition-colors"
                title="Sign Out of VAANI"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          ) : isDemo ? (
            /* Demo Mode Public Action Buttons */
            <div className="flex items-center gap-2">
              <Link to="/auth?mode=login">
                <BlockButton variant="secondary" size="sm" onClick={() => playUiSound('click')}>
                  SIGN IN
                </BlockButton>
              </Link>
              <Link to="/auth?mode=signup">
                <BlockButton variant="primary" size="sm" onClick={() => playUiSound('click')}>
                  CREATE ACCOUNT
                </BlockButton>
              </Link>
            </div>
          ) : (
            /* Public Landing Page: ONLY Logo, Sign In, and Sign Up / Get Started */
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/auth?mode=login">
                <BlockButton variant="secondary" size="sm" onClick={() => playUiSound('click')}>
                  SIGN IN
                </BlockButton>
              </Link>
              <Link to="/auth?mode=signup">
                <BlockButton
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => playUiSound('click')}
                >
                  GET STARTED
                </BlockButton>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Responsive Navigation Bar (ONLY FOR AUTHENTICATED USERS) */}
      {isAuthenticated && (
        <div className="md:hidden flex items-center justify-around py-2 border-t-2 border-voxel-stone-dark bg-[#121417] text-[9px] font-pixel">
          {authenticatedNavLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => playUiSound('nav')}
                className={`flex flex-col items-center gap-1 p-1 uppercase ${
                  isActive ? 'text-voxel-gold font-bold' : 'text-voxel-stone-light'
                }`}
              >
                {link.icon}
                <span>{link.name.split(' ')[0]}</span>
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}

export const Navbar = BlockNavbar
