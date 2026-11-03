import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileAudio, Search, Trash2, Clock, Sparkles } from 'lucide-react'
import { BlockButton } from '../components/ui/BlockButton'
import { VoxelCard } from '../components/ui/VoxelCard'
import { BlockBadge } from '../components/ui/BlockBadge'
import { BlockInput } from '../components/ui/BlockInput'
import { BlockModal } from '../components/ui/BlockModal'
import { VoxelAudioPlayer } from '../components/ui/VoxelAudioPlayer'
import { BlockEmptyState } from '../components/ui/BlockEmptyState'
import type { AudioAsset } from '../types'
import { formatDate } from '../lib/utils'
import { audioApi } from '../lib/api'

const DEFAULT_LIBRARY_AUDIOS: AudioAsset[] = [
  {
    id: 'lib-001',
    userId: 'user-1',
    title: 'Hinglish Project Meeting & Invoice Reminder',
    textPreview: 'Namaste, kal subah 10 baje project review meeting hai. Kripya ₹2,500 ka invoice aur presentation saath lekar aayein.',
    languageCode: 'auto',
    languageName: 'Hinglish (Code-mixed)',
    voiceMode: 'personal',
    voiceLabel: 'Enrolled Voice (Aman)',
    durationSeconds: 12,
    fileSizeBytes: 1152000,
    createdAt: '2026-11-03T18:00:00.000Z',
  },
  {
    id: 'lib-002',
    userId: 'user-1',
    title: 'Hindi Customer Welcome Note',
    textPreview: 'वाणी स्टूडियो में आपका स्वागत है। अब आप एक बार अपनी आवाज़ रिकॉर्ड करके किसी भी भारतीय भाषा में बोल सकते हैं।',
    languageCode: 'hi-IN',
    languageName: 'Hindi',
    voiceMode: 'standard',
    voiceLabel: 'Timbre Nalini',
    durationSeconds: 14,
    fileSizeBytes: 1344000,
    createdAt: '2026-11-03T15:00:00.000Z',
  },
  {
    id: 'lib-003',
    userId: 'user-1',
    title: 'English Accessibility Audio Briefing',
    textPreview: 'Welcome to VAANI. This audio was generated using your personalized voice profile powered by Gnani AI Timbre.',
    languageCode: 'en-IN',
    languageName: 'Indian English',
    voiceMode: 'personal',
    voiceLabel: 'Enrolled Voice (Aman)',
    durationSeconds: 9,
    fileSizeBytes: 864000,
    createdAt: '2026-11-02T18:00:00.000Z',
  },
]

export interface AudioLibraryProps {
  initialAudios?: AudioAsset[]
}

export const AudioLibrary: React.FC<AudioLibraryProps> = ({
  initialAudios = DEFAULT_LIBRARY_AUDIOS,
}) => {
  const [audios, setAudios] = useState<AudioAsset[]>(initialAudios)
  const [searchQuery, setSearchQuery] = useState('')
  const [voiceModeFilter, setVoiceModeFilter] = useState<'all' | 'personal' | 'standard'>('all')
  const [selectedDeleteAudio, setSelectedDeleteAudio] = useState<AudioAsset | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch live audio assets from backend
  useEffect(() => {
    audioApi
      .list()
      .then((serverAssets) => {
        if (serverAssets && serverAssets.length > 0) {
          setAudios(serverAssets)
        }
      })
      .catch(() => {
        // Fall back to default initialAudios
      })
  }, [])

  const filteredAudios = audios.filter((audio) => {
    const matchesSearch =
      audio.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audio.textPreview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audio.languageName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesMode =
      voiceModeFilter === 'all' ? true : audio.voiceMode === voiceModeFilter

    return matchesSearch && matchesMode
  })

  const confirmDelete = async () => {
    if (!selectedDeleteAudio) return

    setIsDeleting(true)
    try {
      await audioApi.delete(selectedDeleteAudio.id)
    } catch {
      // Offline fallback
    }

    setAudios((prev) => prev.filter((a) => a.id !== selectedDeleteAudio.id))
    setIsDeleting(false)
    setSelectedDeleteAudio(null)
  }

  return (
    <div className="space-y-8 select-none">
      {/* Voxel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BlockBadge variant="lapis">CHEST INVENTORY</BlockBadge>
            <span className="text-[10px] font-mono text-voxel-sand">SUPABASE PRIVATE STORAGE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-pixel uppercase tracking-wide text-voxel-cloud flex items-center gap-2.5">
            <FileAudio className="w-6 h-6 text-voxel-sky" />
            <span>AUDIO ARTIFACT CHEST</span>
          </h1>
          <p className="text-xs font-sans text-voxel-stone-light mt-1">
            Browse, replay, download, and manage your synthesized speech assets protected by 15-minute signed URLs.
          </p>
        </div>

        <Link to="/studio">
          <BlockButton variant="primary" size="md" rightIcon={<Sparkles className="w-4 h-4" />}>
            CRAFT NEW SPEECH
          </BlockButton>
        </Link>
      </div>

      {/* Search & Filter Hotbar */}
      <VoxelCard biome="stone" className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="flex-1 max-w-md">
            <BlockInput
              placeholder="Search by title, script words, or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Mode Filter Hotbar */}
          <div className="flex items-center gap-1.5 p-1 bg-[#121417] border-2 border-voxel-stone-dark shadow-voxel-inset">
            <button
              onClick={() => setVoiceModeFilter('all')}
              className={`px-3 py-1.5 text-[10px] font-pixel uppercase transition-all block-pressable border ${
                voiceModeFilter === 'all'
                  ? 'bg-voxel-stone-dark text-voxel-gold border-voxel-gold'
                  : 'bg-transparent text-voxel-stone-light border-transparent hover:text-white'
              }`}
            >
              ALL BLOCKS ({audios.length})
            </button>
            <button
              onClick={() => setVoiceModeFilter('personal')}
              className={`px-3 py-1.5 text-[10px] font-pixel uppercase transition-all block-pressable border ${
                voiceModeFilter === 'personal'
                  ? 'bg-[#153818] text-voxel-grass border-voxel-grass'
                  : 'bg-transparent text-voxel-stone-light border-transparent hover:text-white'
              }`}
            >
              PERSONAL VOICE
            </button>
            <button
              onClick={() => setVoiceModeFilter('standard')}
              className={`px-3 py-1.5 text-[10px] font-pixel uppercase transition-all block-pressable border ${
                voiceModeFilter === 'standard'
                  ? 'bg-[#10243D] text-voxel-sky border-voxel-sky'
                  : 'bg-transparent text-voxel-stone-light border-transparent hover:text-white'
              }`}
            >
              TIMBRE STD
            </button>
          </div>
        </div>
      </VoxelCard>

      {/* Audio Artifacts Grid */}
      {filteredAudios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAudios.map((audio) => (
            <VoxelCard key={audio.id} biome="stone" className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-mono text-voxel-stone-light pb-2 border-b-2 border-voxel-stone-dark/70">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-voxel-gold" />
                  {formatDate(audio.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  <BlockBadge
                    variant={audio.voiceMode === 'personal' ? 'emerald' : 'lapis'}
                    size="sm"
                  >
                    {audio.voiceMode === 'personal' ? 'PERSONAL VOICE' : 'TIMBRE STD'}
                  </BlockBadge>
                  <button
                    onClick={() => setSelectedDeleteAudio(audio)}
                    className="p-1.5 bg-[#2E1010] hover:bg-voxel-redstone text-voxel-redstone hover:text-white border border-voxel-redstone block-pressable transition-colors"
                    title="Delete Artifact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Script Quote */}
              <div className="bg-[#121417] p-3 border-2 border-voxel-stone-dark shadow-voxel-inset">
                <p className="text-xs font-sans text-voxel-cloud/95 line-clamp-2 leading-relaxed italic">
                  "{audio.textPreview}"
                </p>
              </div>

              {/* Voxel Audio Player */}
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
        <BlockEmptyState
          title="NO MATCHING AUDIO BLOCKS"
          description={
            searchQuery
              ? `No artifacts matching "${searchQuery}". Clear search or craft a new speech block.`
              : 'Your audio chest is empty. Launch the studio to craft your first Indic voice block.'
          }
          biome="sound"
          actionLabel="LAUNCH SPEECH STUDIO"
          onAction={() => (window.location.href = '/studio')}
          actionVariant="primary"
        />
      )}

      {/* Delete Confirmation Modal */}
      <BlockModal
        isOpen={Boolean(selectedDeleteAudio)}
        onClose={() => setSelectedDeleteAudio(null)}
        title="DELETE AUDIO ARTIFACT"
        description="Are you sure you want to permanently delete this audio file?"
        biome="redstone"
      >
        <div className="space-y-4">
          <p className="text-xs font-sans text-voxel-stone-light leading-relaxed">
            Title: <span className="text-voxel-cloud font-pixel">{selectedDeleteAudio?.title}</span>
            <br />
            This will permanently remove the 48kHz WAV audio file from private Supabase Storage and invalidate any active signed URLs.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3">
            <BlockButton
              variant="outline"
              size="sm"
              onClick={() => setSelectedDeleteAudio(null)}
            >
              CANCEL
            </BlockButton>
            <BlockButton
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              isLoading={isDeleting}
            >
              CONFIRM DELETE
            </BlockButton>
          </div>
        </div>
      </BlockModal>
    </div>
  )
}
