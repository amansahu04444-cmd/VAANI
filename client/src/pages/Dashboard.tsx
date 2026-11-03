import React from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Mic2, FileAudio, Clock, Languages, Coins, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { NoticeBanner } from '../components/ui/NoticeBanner'
import { AudioPlayer } from '../components/ui/AudioPlayer'
import type { AudioAsset } from '../types'
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
  }
]

export interface DashboardProps {
  hasVoiceProfile?: boolean
  recentAudios?: AudioAsset[]
}

export const Dashboard: React.FC<DashboardProps> = ({
  hasVoiceProfile = false,
  recentAudios = DEFAULT_RECENT_AUDIOS
}) => {
  return (
    <div className="space-y-8">
      {/* Studio Hero Action */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-studio-850 via-studio-800 to-studio-950 border border-studio-700/80 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-950 border border-teal-glow/30 text-teal-soft text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready for Multilingual Generation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            What would you like VAANI to say?
          </h1>
          <p className="text-xs sm:text-sm text-studio-300 leading-relaxed">
            Prepare your script, select any of the 10+ supported Indic languages, and synthesize speech matching your vocal profile.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/studio">
              <Button size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Launch Speech Studio
              </Button>
            </Link>
            {!hasVoiceProfile && (
              <Link to="/voice-setup">
                <Button variant="outline" size="md" leftIcon={<Mic2 className="w-4 h-4 text-teal-soft" />}>
                  Setup Voice Profile
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Decorative background visual */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden md:flex items-center justify-center">
          <Mic2 className="w-64 h-64 text-teal-soft" />
        </div>
      </div>

      {/* Voice Profile Status Banner */}
      {!hasVoiceProfile ? (
        <NoticeBanner
          type="warning"
          title="Voice Profile Required for Personal Voice Mode"
          action={
            <Link to="/voice-setup">
              <Button variant="secondary" size="sm" className="whitespace-nowrap">
                Enroll Voice Now
              </Button>
            </Link>
          }
        >
          You have not enrolled a personal voice profile yet. You can still test standard Timbre synthetic voices (Nalini, Pranav, Poorvi) in the studio.
        </NoticeBanner>
      ) : (
        <NoticeBanner
          type="success"
          title="Personal Voice Active (Enrolled with Consent)"
          action={
            <Link to="/voice-setup">
              <Button variant="ghost" size="sm" className="text-xs">
                Manage Profile
              </Button>
            </Link>
          }
        >
          Your speaker embedding is verified and securely stored in your private profile. Ready to synthesize in Hindi, English, Hinglish, and regional languages.
        </NoticeBanner>
      )}

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-studio-400">
            <span className="text-xs font-medium">Generated Audio</span>
            <FileAudio className="w-4 h-4 text-teal-soft" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">12</div>
          <p className="text-[11px] text-studio-500 mt-1">Saved in private library</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-studio-400">
            <span className="text-xs font-medium">Spoken Audio</span>
            <Clock className="w-4 h-4 text-teal-soft" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">4.8 min</div>
          <p className="text-[11px] text-studio-500 mt-1">Total synthesized speech</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-studio-400">
            <span className="text-xs font-medium">Languages</span>
            <Languages className="w-4 h-4 text-teal-soft" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">3</div>
          <p className="text-[11px] text-studio-500 mt-1">Hindi, English, Hinglish</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-studio-400">
            <span className="text-xs font-medium">Gnani Credits</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-2">4,950</div>
          <p className="text-[11px] text-studio-500 mt-1">5,000 allocated for challenge</p>
        </Card>
      </div>

      {/* Recent Generations & Quick Studio Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audio Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-teal-soft" />
              <span>Recent Speech Generations</span>
            </h3>
            <Link to="/library" className="text-xs text-teal-soft hover:underline">
              View All Audio ({recentAudios.length})
            </Link>
          </div>

          <div className="space-y-3">
            {recentAudios.map((audio) => (
              <Card key={audio.id} className="p-4 hover:border-studio-600 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-white truncate">{audio.title}</h4>
                      <Badge variant={audio.voiceMode === 'personal' ? 'teal' : 'slate'} size="sm">
                        {audio.voiceMode === 'personal' ? 'Your Enrolled Voice' : 'Standard Voice'}
                      </Badge>
                      <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                        {audio.languageCode}
                      </Badge>
                    </div>
                    <p className="text-xs text-studio-400 line-clamp-2 leading-relaxed">
                      "{audio.textPreview}"
                    </p>
                    <div className="text-[11px] text-studio-500 pt-1">
                      Synthesized on {formatDate(audio.createdAt)} • {audio.durationSeconds}s duration
                    </div>
                  </div>
                </div>

                {/* Inline Player preview */}
                <div className="mt-3 pt-3 border-t border-studio-800">
                  <AudioPlayer
                    title={audio.title}
                    voiceLabel={audio.voiceLabel}
                    languageName={audio.languageName}
                    durationSeconds={audio.durationSeconds}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Voice Profile Card */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-teal-soft" />
            <span>Voice Profile Status</span>
          </h3>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-studio-400">Speaker Identity</span>
              {hasVoiceProfile ? (
                <Badge variant="emerald" size="sm">Enrolled (Consented)</Badge>
              ) : (
                <Badge variant="amber" size="sm">Not Enrolled</Badge>
              )}
            </div>

            <div className="bg-studio-900 rounded-lg p-3 border border-studio-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-studio-400">Target Speaker:</span>
                <span className="text-white font-medium">Aman Sahu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-studio-400">Embedding Model:</span>
                <span className="text-teal-soft font-mono">vachana-vc-v1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-studio-400">Tensor Dimension:</span>
                <span className="text-studio-300 font-mono">[1, 768] bfloat16</span>
              </div>
              <div className="flex justify-between">
                <span className="text-studio-400">Consent Audit:</span>
                <span className="text-emerald-400">v1.0 (Nov 2026)</span>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/voice-setup">
                <Button variant="outline" size="sm" className="w-full">
                  {hasVoiceProfile ? 'Manage Voice Profile' : 'Complete Voice Enrollment'}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
