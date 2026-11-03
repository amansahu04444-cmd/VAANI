import React, { useState } from 'react'
import { Settings as SettingsIcon, Shield, Key, Info, Cpu } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { NoticeBanner } from '../components/ui/NoticeBanner'
import { Modal } from '../components/ui/Modal'

export interface SettingsProps {
  hasVoiceProfile?: boolean
  onRevokeProfile?: () => void
}

export const Settings: React.FC<SettingsProps> = ({
  hasVoiceProfile = false,
  onRevokeProfile,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [discardRawAudio, setDiscardRawAudio] = useState(true)
  const [profilePurged, setProfilePurged] = useState(false)

  const handleConfirmRevocation = () => {
    setIsDeleteModalOpen(false)
    setProfilePurged(true)
    if (onRevokeProfile) onRevokeProfile()
    setTimeout(() => setProfilePurged(false), 4000)
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-teal-soft" />
          <span>Studio Settings & Privacy</span>
        </h1>
        <p className="text-xs sm:text-sm text-studio-400 mt-1">
          Manage your account, biometric voice retention policies, and data protection settings.
        </p>
      </div>

      {profilePurged && (
        <NoticeBanner type="success" title="Voice Profile Successfully Purged">
          Your speaker embedding and consent tokens have been permanently deleted from database and storage.
        </NoticeBanner>
      )}

      {/* Account & Hackathon Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-teal-soft" />
            <span>Account & Challenge Allocation</span>
          </CardTitle>
          <CardDescription>
            Account details for the Great Indian AI Internship Challenge.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-studio-900 p-3 rounded-lg border border-studio-800 space-y-1">
              <span className="text-studio-500 block text-[10px] uppercase font-mono">User Name</span>
              <span className="font-semibold text-white">Aman Sahu</span>
            </div>
            <div className="bg-studio-900 p-3 rounded-lg border border-studio-800 space-y-1">
              <span className="text-studio-500 block text-[10px] uppercase font-mono">Email</span>
              <span className="font-semibold text-white">amansahu04444@gmail.com</span>
            </div>
            <div className="bg-studio-900 p-3 rounded-lg border border-studio-800 space-y-1">
              <span className="text-studio-500 block text-[10px] uppercase font-mono">Allocated Credits</span>
              <span className="font-semibold text-amber-300">5,000 Programme Credits</span>
            </div>
            <div className="bg-studio-900 p-3 rounded-lg border border-studio-800 space-y-1">
              <span className="text-studio-500 block text-[10px] uppercase font-mono">Access Tier</span>
              <span className="font-semibold text-teal-soft">Gnani AI Internship Participant</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Biometrics & DPDP Compliance */}
      <Card glow>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Voice Biometric Data & Retention (DPDP)</span>
          </CardTitle>
          <CardDescription>
            Control how your biometric voice recording is stored and processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-xs text-studio-300">
          <div className="flex items-start justify-between gap-4 p-3.5 bg-studio-900 rounded-lg border border-studio-800">
            <div className="space-y-1">
              <span className="font-semibold text-white block">Auto-Purge Raw Audio Samples</span>
              <p className="text-studio-400 leading-relaxed">
                Immediately delete reference microphone recordings after extracting the numerical embedding vector
                (`[1, 768]`). Recommended for maximum biometric privacy.
              </p>
            </div>
            <input
              type="checkbox"
              checked={discardRawAudio}
              onChange={(e) => setDiscardRawAudio(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-studio-700 bg-studio-800 text-teal-glow focus:ring-teal-glow cursor-pointer"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-rose-950/20 border border-rose-800/40 rounded-lg">
            <div className="space-y-1">
              <span className="font-semibold text-rose-300 block">Revoke Voice Profile & Embeddings</span>
              <p className="text-studio-400">
                Permanently delete your enrolled speaker profile and purge all associated metadata.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={!hasVoiceProfile}
              className="whitespace-nowrap"
            >
              Revoke Consent & Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Speech Transparency & Labeling Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-soft" />
            <span>AI-Generated Speech Disclosure Policy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-studio-400 leading-relaxed">
          <p>
            In compliance with responsible AI standards and Indian data protection directives:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-studio-300">
            <li>All generated audio files include metadata tags explicitly identifying them as AI-synthesized speech.</li>
            <li>Voice cloning is strictly confined to consented personal audio profiles; third-party or celebrity impersonation is blocked.</li>
            <li>Users can verify whether generated speech was produced via a personalized speaker embedding or standard synthetic voices.</li>
          </ul>
        </CardContent>
      </Card>

      {/* System Infrastructure Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-soft" />
            <span>System Stack & Provider Endpoints</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-studio-300 font-mono text-[11px]">
            <div className="bg-studio-900 p-2.5 rounded border border-studio-800">
              <span className="text-studio-500 block text-[10px]">TTS Synthesis Engine:</span>
              <span>Gnani Timbre v2.5 / v3.0 (api.vachana.ai)</span>
            </div>
            <div className="bg-studio-900 p-2.5 rounded border border-studio-800">
              <span className="text-studio-500 block text-[10px]">Voice Cloning Endpoint:</span>
              <span>/api/v1/tts/voice-clone/embeddings</span>
            </div>
            <div className="bg-studio-900 p-2.5 rounded border border-studio-800">
              <span className="text-studio-500 block text-[10px]">Auth & PostgreSQL:</span>
              <span>Supabase Managed Auth + Row-Level Security</span>
            </div>
            <div className="bg-studio-900 p-2.5 rounded border border-studio-800">
              <span className="text-studio-500 block text-[10px]">Object Storage:</span>
              <span>Private S3 Buckets (15-min Signed URLs)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revocation Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Revoke Voice Consent & Delete Profile"
        description="Are you sure you wish to irrevocably revoke consent and purge your voice profile?"
      >
        <div className="space-y-4 text-xs text-studio-300">
          <p>
            This action will execute a permanent delete request on your `voice_profiles` record and purge the `[1, 768]`
            speaker embedding vector.
          </p>
          <p className="text-rose-400 font-medium">
            Any future speech synthesis will fall back to standard synthetic voices until you complete a new consented
            enrollment.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-studio-750">
            <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmRevocation}>
              Confirm Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
