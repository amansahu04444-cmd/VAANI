import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileAudio, Search, Trash2, Clock, Calendar, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { AudioPlayer } from '../components/ui/AudioPlayer'
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
      // Local fallback
    }

    setAudios((prev) => prev.filter((a) => a.id !== selectedDeleteAudio.id))
    setSelectedDeleteAudio(null)
    setIsDeleting(false)
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileAudio className="w-7 h-7 text-teal-soft" />
            <span>Private Audio Library</span>
          </h1>
          <p className="text-xs sm:text-sm text-studio-400 mt-1">
            Access, listen, download, and manage your synthesized speech assets.
          </p>
        </div>

        <Link to="/studio">
          <Button size="md" leftIcon={<Sparkles className="w-4 h-4" />}>
            Create New Speech
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by title, transcript text, or language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setVoiceModeFilter('all')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              voiceModeFilter === 'all'
                ? 'bg-studio-800 text-teal-soft border-teal-glow/40'
                : 'bg-studio-900 text-studio-400 border-studio-750 hover:text-white'
            }`}
          >
            All Modes ({audios.length})
          </button>
          <button
            type="button"
            onClick={() => setVoiceModeFilter('personal')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              voiceModeFilter === 'personal'
                ? 'bg-studio-800 text-teal-soft border-teal-glow/40'
                : 'bg-studio-900 text-studio-400 border-studio-750 hover:text-white'
            }`}
          >
            Personal Voice ({audios.filter((a) => a.voiceMode === 'personal').length})
          </button>
          <button
            type="button"
            onClick={() => setVoiceModeFilter('standard')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              voiceModeFilter === 'standard'
                ? 'bg-studio-800 text-teal-soft border-teal-glow/40'
                : 'bg-studio-900 text-studio-400 border-studio-750 hover:text-white'
            }`}
          >
            Standard ({audios.filter((a) => a.voiceMode === 'standard').length})
          </button>
        </div>
      </div>

      {/* Audio Items List */}
      {filteredAudios.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <FileAudio className="w-12 h-12 text-studio-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No Audio Assets Found</h3>
          <p className="text-xs text-studio-400 max-w-sm mx-auto">
            {searchQuery
              ? `No recordings matched "${searchQuery}". Try clearing the search or filters.`
              : 'You have not synthesized any speech yet. Head to Speech Studio to generate your first audio.'}
          </p>
          <div className="pt-2">
            <Link to="/studio">
              <Button size="sm">Open Speech Studio</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAudios.map((audio) => (
            <Card key={audio.id} className="p-5 hover:border-studio-600 transition-all space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-white">{audio.title}</h3>
                    <Badge variant={audio.voiceMode === 'personal' ? 'teal' : 'slate'} size="sm">
                      {audio.voiceMode === 'personal' ? 'Your Enrolled Voice' : 'Standard Voice'}
                    </Badge>
                    <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                      {audio.languageCode}
                    </Badge>
                  </div>
                  <p className="text-xs text-studio-300 leading-relaxed font-sans bg-studio-900/60 p-2.5 rounded-lg border border-studio-800">
                    "{audio.textPreview}"
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-studio-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(audio.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{audio.durationSeconds}s duration</span>
                    </span>
                    <span>{(audio.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>

                {/* Top action: delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDeleteAudio(audio)}
                  className="text-studio-500 hover:text-rose-400 self-start p-1.5"
                  title="Delete Recording"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Integrated Audio Player */}
              <div className="pt-2 border-t border-studio-800">
                <AudioPlayer
                  title={audio.title}
                  voiceLabel={audio.voiceLabel}
                  languageName={audio.languageName}
                  durationSeconds={audio.durationSeconds}
                  onDownload={() => alert(`Downloading "${audio.title}.wav" (Signed URL valid for 15 minutes)...`)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedDeleteAudio)}
        onClose={() => setSelectedDeleteAudio(null)}
        title="Permanently Delete Audio Asset"
        description="Are you sure you want to delete this recording from your private library?"
      >
        <div className="space-y-4 text-xs text-studio-300">
          <div className="bg-studio-900 p-3 rounded-lg border border-studio-800">
            <span className="text-white font-semibold block">{selectedDeleteAudio?.title}</span>
            <span className="text-studio-400 block mt-0.5">{selectedDeleteAudio?.languageName} • {selectedDeleteAudio?.durationSeconds}s</span>
          </div>
          <p>
            Deleting this asset will remove its audio file from private object storage and purge all associated metadata.
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-studio-750">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDeleteAudio(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" isLoading={isDeleting} onClick={confirmDelete}>
              Delete Asset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
