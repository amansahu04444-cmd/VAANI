import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

export interface AppLayoutProps {
  hasVoiceProfile?: boolean
  userEmail?: string
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  hasVoiceProfile = false,
  userEmail = 'aman@vaani.ai',
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#14171A] text-voxel-cloud selection:bg-voxel-grass selection:text-voxel-bedrock">
      <Navbar hasVoiceProfile={hasVoiceProfile} userEmail={userEmail} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
