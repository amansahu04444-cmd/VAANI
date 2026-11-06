import React from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Mic2, FileAudio, Clock, Languages, ArrowRight, Database } from 'lucide-react'
import { BlockButton } from '../components/ui/BlockButton'
import { VoxelCard } from '../components/ui/VoxelCard'
import { BlockBadge } from '../components/ui/BlockBadge'
import { BlockNoticeBanner } from '../components/ui/BlockNoticeBanner'
import { VoxelAudioPlayer } from '../components/ui/VoxelAudioPlayer'
import { CubeIllustration } from '../components/ui/CubeIllustration'
import { VoiceCore } from '../components/ui/VoiceCore'
import { PixelDivider } from '../components/ui/PixelDivider'
import type { AudioAsset, VoiceEnrollmentState } from '../types'
import { formatDate } from '../lib/utils'

const DEFAULT_RECENT_AUDIOS: AudioAsset[] = [
  {
    id: 'aud-001',
    userId: 'user-1',
    title: 'Hinglish Project Meeting Reminder',
    textPreview: 'Namaste, kal subah 10 baje project review meeting hai. Kripya ₹2,500 ka invoice aur presentation saath lekar aayein.',
    languageCode: 'auto',
    languageName: 'Hinglish (Code-mixed)',
    voiceMode: 'personal',
    voiceLabel: 'Enrolled Voice (Aman)',
    durationSeconds: 11,
    fileSizeBytes: 1056400,
    createdAt: '2026-11-03T18:00:00.000Z',
  },
  {
    id: 'aud-002',
    userId: 'user-1',
    title: 'Hindi Welcome Announcement',
    textPreview: 'वाणी स्टूडियो में आपका स्वागत है। अब आप एक बार अपनी आवाज़ रिकॉर्ड करके किसी भी भारतीय भाषा में बोल सकते हैं।',
    languageCode: 'hi-IN',
    languageName: 'Hindi',
    voiceMode: 'standard',
    voiceLabel: 'Timbre Nalini',
    durationSeconds: 14,
    fileSizeBytes: 1344800,
    createdAt: '2026-11-03T14:00:00.000Z',
  },
]

export interface DashboardProps {
  hasVoiceProfile?: boolean
  voiceStatus?: VoiceEnrollmentState
  recentAudios?: AudioAsset[]
}

export const Dashboard: React.FC<DashboardProps> = ({
  hasVoiceProfile = false,
  voiceStatus,
  recentAudios = DEFAULT_RECENT_AUDIOS,
}) => {
  const isReady = voiceStatus === 'READY' || (hasVoiceProfile && !voiceStatus)
  const isMissingTensor = voiceStatus === 'EMBEDDING_MISSING'
  return (
    <div className="space-y-8 select-none">
      {/* Voxel Hero Command Banner */}
      <div className="relative overflow-hidden bg-[#181B1E] border-4 border-[#3D434A] p-6 sm:p-8 shadow-voxel-lg">
        {/* Decorative corner blocks */}
        <div className="absolute top-0 left-0 w-3 h-3 bg-voxel-grass" />
        <div className="absolute top-0 right-0 w-3 h-3 bg-voxel-grass" />
        <div className="absolute bottom-0 left-0 w-3 h-3 bg-voxel-grass" />
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-voxel-grass" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#121417] border border-voxel-grass text-voxel-grass text-[10px] font-pixel">
              <Sparkles className="w-3.5 h-3.5 text-voxel-gold" />
              <span>VOXEL STUDIO CRAFTING TABLE: READY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-pixel uppercase tracking-wide text-voxel-cloud">
              WHAT WOULD YOU LIKE VAANI TO CRAFT?
            </h1>
            <p className="text-xs sm:text-sm text-voxel-stone-light leading-relaxed font-sans">
              Prepare your script blocks, select across 11 Indic biomes, and synthesize high-fidelity 48kHz audio matching your personal voice timbre.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link to="/studio">
                <BlockButton variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  LAUNCH SPEECH STUDIO
                </BlockButton>
              </Link>
              {!hasVoiceProfile ? (
                <Link to="/voice-setup">
                  <BlockButton variant="gold" size="md" leftIcon={<Mic2 className="w-4 h-4" />}>
                    ENROLL VOICE PROFILE
                  </BlockButton>
                </Link>
              ) : (
                <Link to="/library">
                  <BlockButton variant="secondary" size="md" leftIcon={<FileAudio className="w-4 h-4" />}>
                    OPEN AUDIO CHEST
                  </BlockButton>
                </Link>
              )}
            </div>
          </div>

          <div className="shrink-0 hidden md:block">
            <CubeIllustration biome="sound" size={90} floating label="48kHz Note Block" />
          </div>
        </div>
      </div>

      {/* Voice Profile Warning Banner if not enrolled */}
      {!hasVoiceProfile && (
        <BlockNoticeBanner
          variant="warning"
          title="VOICE PROFILE NOT ENROLLED"
          message="You have not enrolled a personal voice profile yet. You can still craft speech using standard Timbre synthetic voices (Nalini, Pranav, Poorvi) or enroll your voice in under 30 seconds."
          action={{
            label: "START ENROLLMENT NOW",
            onClick: () => (window.location.href = "/voice-setup"),
          }}
        />
      )}

      {/* Modular HUD Stats Grid (4 Distinct Elevation Blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Block 1: Voice Profile */}
        <VoxelCard biome={isReady ? 'grass' : isMissingTensor ? 'redstone' : 'gold'} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-pixel text-voxel-sand">VOICE CORE</span>
            <Mic2 className={`w-4 h-4 ${isReady ? 'text-voxel-grass' : isMissingTensor ? 'text-voxel-redstone' : 'text-voxel-gold'}`} />
          </div>
          <div className="flex items-center gap-3">
            <VoiceCore status={isReady ? 'ready' : 'not_enrolled'} size={34} />
            <div>
              <h4 className="text-sm font-pixel text-voxel-cloud">
                {isReady ? 'AMAN SHARMA' : isMissingTensor ? 'TENSOR MISSING' : 'NO PROFILE'}
              </h4>
              <p className="text-[10px] font-mono text-voxel-stone-light">
                {isReady ? '768-dim Vector Active' : isMissingTensor ? 'Re-recording Required' : 'Standard Voices Only'}
              </p>
            </div>
          </div>
          <Link to="/voice-setup" className="block text-[10px] font-pixel text-voxel-gold hover:underline pt-1">
            {isReady ? 'MANAGE BIOMETRICS ➔' : isMissingTensor ? 'FIX ENROLLMENT ➔' : 'CRAFT PROFILE ➔'}
          </Link>
        </VoxelCard>

        {/* Block 2: Model Engine */}
        <VoxelCard biome="stone" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-pixel text-voxel-sand">ENGINE</span>
            <Database className="w-4 h-4 text-voxel-sky" />
          </div>
          <div>
            <h4 className="text-sm font-pixel text-voxel-cloud">GNANI TIMBRE</h4>
            <p className="text-[10px] font-mono text-voxel-stone-light mt-0.5">v2.5 / Vachana Model</p>
          </div>
          <div className="text-[10px] font-mono text-voxel-sky pt-1">
            48,000 Hz Studio PCM
          </div>
        </VoxelCard>

        {/* Block 3: Language Biomes */}
        <VoxelCard biome="gold" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-pixel text-voxel-sand">BIOMES</span>
            <Languages className="w-4 h-4 text-voxel-gold" />
          </div>
          <div>
            <h4 className="text-sm font-pixel text-voxel-cloud">11 LOCALES</h4>
            <p className="text-[10px] font-mono text-voxel-stone-light mt-0.5">Indic + Auto Hinglish</p>
          </div>
          <div className="text-[10px] font-mono text-voxel-sand pt-1">
            Hindi, Tamil, Telugu, etc.
          </div>
        </VoxelCard>

        {/* Block 4: Audio Chest Library */}
        <VoxelCard biome="sky" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-pixel text-voxel-sand">AUDIO CHEST</span>
            <FileAudio className="w-4 h-4 text-voxel-sky" />
          </div>
          <div>
            <h4 className="text-sm font-pixel text-voxel-cloud">
              {recentAudios.length} ARTIFACTS
            </h4>
            <p className="text-[10px] font-mono text-voxel-stone-light mt-0.5">Signed URLs (15m)</p>
          </div>
          <Link to="/library" className="block text-[10px] font-pixel text-voxel-sky hover:underline pt-1">
            VIEW ALL ITEMS ➔
          </Link>
        </VoxelCard>
      </div>

      <PixelDivider color="stone" />

      {/* Recent Generations Voxel Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CubeIllustration biome="sound" size={24} />
            <h2 className="text-base sm:text-lg font-pixel uppercase tracking-wide text-voxel-cloud">
              RECENT SOUND ARTIFACTS
            </h2>
          </div>
          <Link to="/library">
            <BlockButton variant="outline" size="sm">
              VIEW CHEST
            </BlockButton>
          </Link>
        </div>

        {recentAudios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentAudios.map((audio) => (
              <VoxelCard key={audio.id} biome="stone" className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-voxel-stone-light">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-voxel-gold" />
                    {formatDate(audio.createdAt)}
                  </span>
                  <BlockBadge
                    variant={audio.voiceMode === 'personal' ? 'emerald' : 'lapis'}
                    size="sm"
                  >
                    {audio.voiceMode === 'personal' ? 'PERSONAL VOICE' : 'TIMBRE STD'}
                  </BlockBadge>
                </div>

                <div className="bg-[#121417] p-3 border border-voxel-stone-dark shadow-voxel-inset">
                  <p className="text-xs font-sans text-voxel-cloud/90 line-clamp-2 leading-relaxed italic">
                    "{audio.textPreview}"
                  </p>
                </div>

                <VoxelAudioPlayer
                  title={audio.title}
                  voiceLabel={audio.voiceLabel}
                  languageName={audio.languageName}
                  durationSeconds={audio.durationSeconds}
                  voiceMode={audio.voiceMode}
                  audioUrl={audio.audioUrl}
                />
              </VoxelCard>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#171A1E] border-2 border-voxel-stone-dark p-6">
            <p className="text-xs font-pixel text-voxel-stone-light">
              YOUR AUDIO CHEST IS EMPTY. OPEN THE STUDIO TO CRAFT YOUR FIRST SPEECH BLOCK.
            </p>
            <Link to="/studio" className="inline-block mt-4">
              <BlockButton variant="primary" size="sm">
                CRAFT SPEECH
              </BlockButton>
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
