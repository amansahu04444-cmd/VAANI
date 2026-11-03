import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mic2, Radio, Sparkles, FileAudio, Settings as SettingsIcon, LogOut, User } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { APP_NAME } from '../../lib/constants'

export interface NavbarProps {
  hasVoiceProfile?: boolean
  userEmail?: string
  onSignOut?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  hasVoiceProfile = false,
  userEmail = 'aman@vaani.ai',
  onSignOut,
}) => {
  const location = useLocation()

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <Radio className="w-4 h-4" /> },
    { name: 'Voice Setup', path: '/voice-setup', icon: <Mic2 className="w-4 h-4" /> },
    { name: 'Speech Studio', path: '/studio', icon: <Sparkles className="w-4 h-4" /> },
    { name: 'Audio Library', path: '/library', icon: <FileAudio className="w-4 h-4" /> },
    { name: 'Settings', path: '/settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ]

  return (
    <header className="sticky top-0 z-40 w-full bg-studio-950/85 backdrop-blur-md border-b border-studio-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-deep to-teal-glow flex items-center justify-center shadow-lg shadow-teal-glow/20 border border-teal-glow/40 group-hover:scale-105 transition-transform">
            <Mic2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider text-white font-mono">{APP_NAME}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-teal-950 border border-teal-glow/30 text-teal-soft">
                Gnani AI
              </span>
            </div>
            <p className="text-[10px] text-studio-400 hidden sm:block">Multilingual Voice Studio</p>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-studio-800 text-teal-soft border border-studio-700'
                    : 'text-studio-300 hover:text-white hover:bg-studio-850'
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Voice Profile Status & Account */}
        <div className="flex items-center gap-3">
          <Link to="/voice-setup">
            {hasVoiceProfile ? (
              <Badge variant="emerald" size="sm" className="cursor-pointer hover:border-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Personal Voice: Active</span>
              </Badge>
            ) : (
              <Badge variant="amber" size="sm" className="cursor-pointer hover:border-amber-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Voice: Not Enrolled</span>
              </Badge>
            )}
          </Link>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-studio-800 text-xs text-studio-300">
            <div className="w-7 h-7 rounded-full bg-studio-800 border border-studio-700 flex items-center justify-center text-teal-soft">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="truncate max-w-[120px] font-mono text-[11px] text-studio-300">{userEmail}</span>
          </div>

          {onSignOut ? (
            <Button variant="ghost" size="sm" onClick={onSignOut} className="p-2 text-studio-400 hover:text-rose-400" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm" className="text-xs">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="md:hidden flex items-center justify-around py-2 border-t border-studio-800 bg-studio-900/90 text-[11px]">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center gap-1 p-1 ${
                isActive ? 'text-teal-soft font-semibold' : 'text-studio-400'
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          )
        })}
      </div>
    </header>
  )
}
