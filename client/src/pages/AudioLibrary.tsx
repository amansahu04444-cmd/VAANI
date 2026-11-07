/* oxlint-disable react/set-state-in-effect */
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileAudio, Search, Trash2, Clock, Sparkles } from 'lucide-react'
import { BlockButton } from '../components/ui/BlockButton'
import { VoxelCard } from '../components/ui/VoxelCard'
import { BlockBadge } from '../components/ui/BlockBadge'
import { BlockInput } from '../components/ui/BlockInput'
import { BlockModal } from '../components/ui/BlockModal'
import { BlockNoticeBanner } from '../components/ui/BlockNoticeBanner'
import { VoxelAudioPlayer } from '../components/ui/VoxelAudioPlayer'
import { BlockEmptyState } from '../components/ui/BlockEmptyState'
import type { AudioAsset } from '../types'
import { formatDate } from '../lib/utils'
import { audioApi } from '../lib/api'

export interface AudioLibraryProps {
  initialAudios?: AudioAsset[]
}

export const AudioLibrary: React.FC<AudioLibraryProps> = ({
  initialAudios,
}) => {
  const [audios, setAudios] = useState<AudioAsset[]>(initialAudios || [])
  const [isLoading, setIsLoading] = useState(true)
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [voiceModeFilter, setVoiceModeFilter] = useState<'all' | 'personal' | 'standard'>('all')
  const [selectedDeleteAudio, setSelectedDeleteAudio] = useState<AudioAsset | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Fetch live audio assets from backend
  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    audioApi
      .list()
      .then((serverAssets) => {
        if (!isMounted) return
        setAudios(serverAssets)
      })
      .catch((err) => {
        console.warn('[AudioLibrary] Could not fetch server audio list:', err)
        if (!isMounted) return
        if (initialAudios && initialAudios.length > 0) {
          setAudios(initialAudios)
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [initialAudios])

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
    const targetId = selectedDeleteAudio.id
    const targetTitle = selectedDeleteAudio.title

    try {
      await audioApi.delete(targetId)
      setNotice({
        type: 'success',
        message: `Artifact "${targetTitle}" and private storage file were deleted permanently.`,
      })
    } catch (err: any) {
      console.error('[AudioLibrary] Delete error:', err)
      setNotice({
        type: 'error',
        message: `Deletion failed: ${err?.message || 'Server error'}`,
      })
    } finally {
      if (targetId === activePlayingId) {
        setActivePlayingId(null)
      }
      setAudios((prev) => prev.filter((a) => a.id !== targetId))
      setIsDeleting(false)
      setSelectedDeleteAudio(null)
      setTimeout(() => setNotice(null), 5000)
    }
  }

  return (
    <div className="space-y-8 select-none">
      {notice && (
        <BlockNoticeBanner
          variant={notice.type}
          title="CHEST NOTIFICATION"
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}

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
      {isLoading && audios.length === 0 ? (
        <div className="p-12 text-center bg-[#171A1E] border-2 border-voxel-stone-dark space-y-3">
          <div className="w-8 h-8 mx-auto border-4 border-voxel-stone-dark border-t-voxel-gold animate-spin" />
          <p className="font-pixel text-xs text-voxel-sand">OPENING SUPABASE AUDIO CHEST...</p>
        </div>
      ) : filteredAudios.length > 0 ? (
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
                assetId={audio.id}
                title={audio.title}
                voiceLabel={audio.voiceLabel}
                languageName={audio.languageName}
                durationSeconds={audio.durationSeconds}
                voiceMode={audio.voiceMode}
                audioUrl={audio.audioUrl}
                isActive={activePlayingId === audio.id}
                onStartPlayback={() => setActivePlayingId(audio.id)}
                onRequestSignedUrl={(id) => audioApi.getSignedUrl(id)}
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
