import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { VoxelCursor } from '../ui/VoxelCursor'

export interface AppLayoutProps {
  hasVoiceProfile?: boolean
  userEmail?: string
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  hasVoiceProfile = false,
  userEmail = 'aman@vaani.ai',
}) => {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <div className="min-h-screen flex flex-col bg-[#14171A] text-voxel-cloud selection:bg-voxel-grass selection:text-voxel-bedrock">
      <VoxelCursor />
      <Navbar hasVoiceProfile={hasVoiceProfile} userEmail={userEmail} />
      <main className={`flex-1 w-full ${isLanding ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
