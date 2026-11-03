import React from 'react'
import { ShieldCheck, Cpu, Heart } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-studio-800 bg-studio-950/70 text-studio-400 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-soft" />
            <span>
              Engineered with <strong className="text-white">Gnani AI Timbre v2.5 / v3.0</strong> & Vachana Speech Architecture
            </span>
          </div>

          <div className="flex items-center gap-4 text-studio-400">
            <span className="flex items-center gap-1.5 text-emerald-400/90">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>DPDP Consent Compliant</span>
            </span>
            <span>•</span>
            <span>Great Indian AI Internship Challenge</span>
          </div>
        </div>

        <div className="pt-4 border-t border-studio-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-studio-500">
          <p>© 2026 VAANI Studio. Personal voice synthesis with explicit user ownership.</p>
          <p className="flex items-center gap-1">
            Built with strict security & zero client key exposure <Heart className="w-3 h-3 text-rose-500 inline fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  )
}

