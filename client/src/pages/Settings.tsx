import React, { useState } from 'react'
import { Settings as SettingsIcon, Shield, Key, Cpu, Trash2 } from 'lucide-react'
import { BlockButton } from '../components/ui/BlockButton'
import { VoxelCard, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/VoxelCard'
import { BlockBadge } from '../components/ui/BlockBadge'
import { BlockNoticeBanner } from '../components/ui/BlockNoticeBanner'
import { BlockModal } from '../components/ui/BlockModal'
import { CubeIllustration } from '../components/ui/CubeIllustration'
import type { VoiceEnrollmentState } from '../types'

export interface SettingsProps {
  hasVoiceProfile?: boolean
  voiceStatus?: VoiceEnrollmentState
  onRevokeProfile?: () => void
}

export const Settings: React.FC<SettingsProps> = ({
  hasVoiceProfile = false,
  voiceStatus,
  onRevokeProfile,
}) => {
  const isReady = voiceStatus === 'READY' || (hasVoiceProfile && !voiceStatus)
  const isMissingTensor = voiceStatus === 'EMBEDDING_MISSING'
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
    <div className="space-y-8 max-w-4xl mx-auto select-none">
      {/* Voxel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BlockBadge variant="stone">SYSTEM PREFERENCES</BlockBadge>
            <span className="text-[10px] font-mono text-voxel-sand">DPDP SECURITY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-pixel uppercase tracking-wide text-voxel-cloud flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-voxel-gold" />
            <span>STUDIO SETTINGS & PRIVACY</span>
          </h1>
          <p className="text-xs font-sans text-voxel-stone-light mt-1">
            Configure your account credentials, manage biometric data retention, and audit DPDP consent.
          </p>
        </div>

        <CubeIllustration biome="stone" size={44} floating />
      </div>

      {profilePurged && (
        <BlockNoticeBanner
          variant="success"
          title="BIOMETRIC PROFILE PURGED"
          message="Your 768-dimensional speaker embedding and reference audio have been permanently deleted from Supabase. A revocation event has been recorded in the audit ledger."
          onDismiss={() => setProfilePurged(false)}
        />
      )}

      {/* Block 1: Account & Hackathon Credentials */}
      <VoxelCard biome="stone" className="space-y-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <Key className="w-4 h-4 text-voxel-gold" />
              <span>ACCOUNT & CHALLENGE ALLOCATION</span>
            </CardTitle>
            <BlockBadge variant="gold">PARTICIPANT</BlockBadge>
          </div>
          <CardDescription>
            Participant account details for the Great Indian AI Internship Challenge.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-[#121417] p-3.5 border-2 border-voxel-stone-dark shadow-voxel-inset space-y-1">
              <span className="text-[9px] uppercase font-pixel text-voxel-sand block">
                CANDIDATE NAME
              </span>
              <span className="text-sm font-semibold text-voxel-cloud">Aman Sahu</span>
            </div>

            <div className="bg-[#121417] p-3.5 border-2 border-voxel-stone-dark shadow-voxel-inset space-y-1">
              <span className="text-[9px] uppercase font-pixel text-voxel-sand block">
                EMAIL IDENTIFIER
              </span>
              <span className="text-sm font-semibold text-voxel-cloud">amansahu04444@gmail.com</span>
            </div>

            <div className="bg-[#121417] p-3.5 border-2 border-voxel-stone-dark shadow-voxel-inset space-y-1">
              <span className="text-[9px] uppercase font-pixel text-voxel-sand block">
                ALLOTMENT
              </span>
              <span className="text-sm font-semibold text-voxel-gold">5,000 PROGRAMME CREDITS</span>
            </div>

            <div className="bg-[#121417] p-3.5 border-2 border-voxel-stone-dark shadow-voxel-inset space-y-1">
              <span className="text-[9px] uppercase font-pixel text-voxel-sand block">
                TIER
              </span>
              <span className="text-sm font-semibold text-voxel-grass">GNANI AI CHALLENGE</span>
            </div>
          </div>
        </CardContent>
      </VoxelCard>

      {/* Block 2: Voice Biometrics & DPDP Compliance */}
      <VoxelCard biome="grass" glow className="space-y-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <Shield className="w-4 h-4 text-voxel-grass" />
              <span>VOICE BIOMETRIC DATA & RETENTION (DPDP)</span>
            </CardTitle>
            <BlockBadge variant="emerald">DPDP 2023</BlockBadge>
          </div>
          <CardDescription>
            Control how your biometric voice recording is stored, transformed, and pruned.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          {/* Toggle Block */}
          <div className="flex items-start justify-between gap-4 p-4 bg-[#121417] border-2 border-voxel-stone-dark shadow-voxel-inset">
            <div className="space-y-1">
              <span className="font-pixel text-xs text-voxel-cloud uppercase block">
                AUTO-PURGE RAW AUDIO SAMPLES
              </span>
              <p className="text-voxel-stone-light font-sans text-xs leading-relaxed">
                Immediately delete reference microphone recordings after extracting the mathematical embedding vector (`[1, 768]`). Recommended for maximum biometric privacy.
              </p>
            </div>
            <input
              type="checkbox"
              checked={discardRawAudio}
              onChange={(e) => setDiscardRawAudio(e.target.checked)}
              className="mt-1 w-5 h-5 rounded-none bg-voxel-bedrock border-2 border-voxel-grass text-voxel-grass focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Profile Status & Revocation Block */}
          <div className="p-4 bg-[#121417] border-2 border-voxel-stone-dark shadow-voxel-inset flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-pixel text-xs text-voxel-cloud uppercase block">
                ACTIVE BIOMETRIC EMBEDDING
              </span>
              <p className="text-voxel-stone-light font-sans text-xs">
                {isReady
                  ? '768-dimensional float vector stored in private Supabase bucket.'
                  : isMissingTensor
                  ? 'Incomplete: Voice profile exists but 768-dim tensor is missing.'
                  : 'No active profile enrolled.'}
              </p>
            </div>

            {isReady || isMissingTensor ? (
              <BlockButton
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                className="shrink-0"
              >
                REVOKE & PURGE
              </BlockButton>
            ) : (
              <span className="text-[10px] font-pixel text-voxel-gold uppercase">
                STATUS: NOT ENROLLED
              </span>
            )}
          </div>
        </CardContent>
      </VoxelCard>

      {/* Block 3: Gnani AI Gateway & Technical Parameters */}
      <VoxelCard biome="stone" className="space-y-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <Cpu className="w-4 h-4 text-voxel-sky" />
              <span>GNANI AI GATEWAY PARAMETERS</span>
            </CardTitle>
            <BlockBadge variant="lapis">SERVER-SIDE</BlockBadge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-[#121417] p-3 border border-voxel-stone-dark">
              <span className="text-voxel-sand font-pixel text-[9px] block">TTS MODEL</span>
              <span className="text-voxel-cloud">timbre-v2.5 (Indic Deep Neural)</span>
            </div>

            <div className="bg-[#121417] p-3 border border-voxel-stone-dark">
              <span className="text-voxel-sand font-pixel text-[9px] block">VC ARCHITECTURE</span>
              <span className="text-voxel-cloud">vachana-vc-v1 (768-dim Embedding)</span>
            </div>

            <div className="bg-[#121417] p-3 border border-voxel-stone-dark">
              <span className="text-voxel-sand font-pixel text-[9px] block">AUDIO STREAM</span>
              <span className="text-voxel-cloud">48,000 Hz Lossless PCM WAV</span>
            </div>

            <div className="bg-[#121417] p-3 border border-voxel-stone-dark">
              <span className="text-voxel-sand font-pixel text-[9px] block">SIGNED URL TTL</span>
              <span className="text-voxel-cloud">900 Seconds (15-Minute Expiration)</span>
            </div>
          </div>
        </CardContent>
      </VoxelCard>

      {/* Delete Confirmation Modal */}
      <BlockModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="PERMANENT BIOMETRIC PURGE"
        description="Are you sure you want to permanently revoke consent and purge your voice profile from the database?"
        biome="redstone"
      >
        <div className="space-y-4">
          <p className="text-xs font-sans text-voxel-stone-light leading-relaxed">
            This will permanently erase your 768-dimensional speaker embedding from the Supabase database and purge any temporary audio references. A revocation audit event will be logged in compliance with the DPDP Act 2023.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3">
            <BlockButton
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              CANCEL
            </BlockButton>
            <BlockButton
              variant="destructive"
              size="sm"
              onClick={handleConfirmRevocation}
            >
              CONFIRM PURGE
            </BlockButton>
          </div>
        </div>
      </BlockModal>
    </div>
  )
}
