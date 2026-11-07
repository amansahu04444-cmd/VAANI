import React from 'react'
import { Link } from 'react-router-dom'
import { CubeIllustration } from '../ui/CubeIllustration'
import { APP_NAME } from '../../lib/constants'

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#121417] border-t-4 border-[#101316] text-xs font-mono text-voxel-stone-light py-8 px-4 sm:px-6 lg:px-8 mt-16 select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Biome Tag */}
        <div className="flex items-center gap-3">
          <CubeIllustration biome="emerald" size={28} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-sm text-voxel-cloud uppercase">{APP_NAME}</span>
              <span className="text-[9px] font-pixel px-1.5 py-0.5 bg-voxel-bedrock border border-voxel-gold text-voxel-gold">
                VOXEL V1.0
              </span>
            </div>
            <p className="text-[10px] text-voxel-stone-light">
              Crafted for India • Powered by Gnani AI Timbre & Vachana
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-pixel text-voxel-sand">
          <Link to="/studio" className="hover:text-voxel-gold hover:underline">
            STUDIO
          </Link>
          <Link to="/voice-setup" className="hover:text-voxel-gold hover:underline">
            VOICE CRAFT
          </Link>
          <Link to="/library" className="hover:text-voxel-gold hover:underline">
            CHEST / LIBRARY
          </Link>
          <Link to="/settings" className="hover:text-voxel-gold hover:underline">
            DPDP PRIVACY
          </Link>
        </div>

        {/* Challenge Attribution */}
        <div className="text-center md:text-right text-[10px]">
          <span className="text-voxel-grass font-pixel">GREAT INDIAN AI INTERNSHIP CHALLENGE</span>
          <p className="text-voxel-stone-light mt-0.5">VAANI Voice Studio • 100% DPDP Biometric Safe</p>
        </div>
      </div>
    </footer>
  )
}
