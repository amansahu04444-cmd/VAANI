import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mic2, Radio, Sparkles, FileAudio, Settings as SettingsIcon, LogOut, User } from 'lucide-react'
import { BlockBadge } from '../ui/BlockBadge'
import { BlockButton } from '../ui/BlockButton'
import { CubeIllustration } from '../ui/CubeIllustration'
import { APP_NAME } from '../../lib/constants'

export interface NavbarProps {
  hasVoiceProfile?: boolean
  userEmail?: string
  onSignOut?: () => void
}

export const BlockNavbar: React.FC<NavbarProps> = ({
  hasVoiceProfile = false,
  userEmail = 'aman@vaani.ai',
  onSignOut,
}) => {
  const location = useLocation()

  const navLinks = [
    { name: 'DASHBOARD', path: '/dashboard', icon: <Radio className="w-3.5 h-3.5" /> },
    { name: 'VOICE SETUP', path: '/voice-setup', icon: <Mic2 className="w-3.5 h-3.5" /> },
    { name: 'SPEECH STUDIO', path: '/studio', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { name: 'AUDIO LIBRARY', path: '/library', icon: <FileAudio className="w-3.5 h-3.5" /> },
    { name: 'SETTINGS', path: '/settings', icon: <SettingsIcon className="w-3.5 h-3.5" /> },
  ]

  return (
    <header className="sticky top-0 z-40 w-full bg-[#181B1E] border-b-4 border-[#101316] shadow-voxel select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
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

        {/* Desktop Hotbar / Inventory Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 bg-[#121417] border-2 border-voxel-stone-dark shadow-voxel-inset">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative flex items-center gap-2 px-3 py-1.5 text-[10px] font-pixel uppercase tracking-wide transition-all border group overflow-hidden ${
                  isActive
                    ? 'bg-[#292D32] text-voxel-gold border-voxel-gold shadow-voxel-sm'
                    : 'bg-transparent text-voxel-stone-light border-transparent hover:text-voxel-cloud hover:bg-voxel-stone-dark/50'
                }`}
              >
                {link.icon}
                <span>{link.name}</span>

                {/* Pixel Underline Animation & Active Indicator */}
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

        {/* Voice Profile Status & Account */}
        <div className="flex items-center gap-3">
          <Link to="/voice-setup">
            {hasVoiceProfile ? (
              <BlockBadge variant="grass" size="sm" className="cursor-pointer hover:border-voxel-gold">
                <span className="w-1.5 h-1.5 bg-voxel-grass animate-ping"></span>
                <span>VOICE: ACTIVE</span>
              </BlockBadge>
            ) : (
              <BlockBadge variant="gold" size="sm" className="cursor-pointer hover:border-white">
                <span className="w-1.5 h-1.5 bg-voxel-gold"></span>
                <span>VOICE: NOT SET</span>
              </BlockBadge>
            )}
          </Link>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l-2 border-voxel-stone-dark/80 text-xs">
            <div className="w-7 h-7 bg-voxel-bedrock border-2 border-voxel-stone-dark flex items-center justify-center text-voxel-gold">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="truncate max-w-[130px] font-mono text-[10px] text-voxel-sand">
              {userEmail}
            </span>
          </div>

          {onSignOut ? (
            <button
              onClick={onSignOut}
              className="p-2 bg-voxel-bedrock hover:bg-[#381010] text-voxel-stone-light hover:text-voxel-redstone border-2 border-voxel-stone-dark hover:border-voxel-redstone block-pressable transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link to="/auth">
              <BlockButton variant="gold" size="sm">
                SIGN IN
              </BlockButton>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around py-2 border-t-2 border-voxel-stone-dark bg-[#121417] text-[9px] font-pixel">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path
          return (
            <Link
              key={link.path}
              to={link.path}
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
    </header>
  )
}

export const Navbar = BlockNavbar

