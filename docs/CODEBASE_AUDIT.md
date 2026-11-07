# VAANI — Complete Codebase Audit & Architecture Inventory

**Date:** 2026-11-07  
**Branch:** `refactor/vaani-codebase-cleanup`  
**Working Commit:** `0c6e825855b324237f1c875de8d5645500381e57`  
**Architect:** Principal Software Architect & Refactoring Specialist  
**Standard:** Production Reliability & Zero-Regressions

---

## 1. Executive Architecture Survey

A forensic project-wide audit was conducted across all files, components, API endpoints, hooks, utility functions, database queries, and static assets in the **VAANI** repository.

The goal is to eliminate duplicate forwarders, consolidate redundant implementations, and purge dead code generated across multiple development iterations without affecting any user features, database schemas, or passing test suites.

### Canonical Responsibilities

| Subsystem | Canonical Implementation | Redundant / Duplicate Files Identified |
|:---|:---|:---|
| **Frontend Navbar** | [`client/src/components/layout/Navbar.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/layout/Navbar.tsx) | `client/src/components/layout/BlockNavbar.tsx` (Split implementation) |
| **Frontend Audio Player** | [`client/src/components/ui/VoxelAudioPlayer.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/VoxelAudioPlayer.tsx) | `client/src/components/ui/AudioPlayer.tsx` (Unused 2-line re-export stub) |
| **Frontend Audio Waveform** | [`client/src/components/ui/VoxelWaveform.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/VoxelWaveform.tsx) | `client/src/components/ui/AudioWaveform.tsx` (Unused 2-line re-export stub) |
| **Frontend Badge** | [`client/src/components/ui/BlockBadge.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockBadge.tsx) | `client/src/components/ui/Badge.tsx` (Unused 2-line re-export stub) |
| **Frontend Button** | [`client/src/components/ui/BlockButton.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockButton.tsx) | `client/src/components/ui/Button.tsx` (Unused 2-line re-export stub) |
| **Frontend Card** | [`client/src/components/ui/VoxelCard.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/VoxelCard.tsx) | `client/src/components/ui/Card.tsx` (Unused 11-line re-export stub) |
| **Frontend Input** | [`client/src/components/ui/BlockInput.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockInput.tsx) | `client/src/components/ui/Input.tsx` (Unused 2-line re-export stub) |
| **Frontend Modal** | [`client/src/components/ui/BlockModal.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockModal.tsx) | `client/src/components/ui/Modal.tsx` (Unused 2-line re-export stub) |
| **Frontend Notice Banner** | [`client/src/components/ui/BlockNoticeBanner.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockNoticeBanner.tsx) | `client/src/components/ui/NoticeBanner.tsx` (Unused 2-line re-export stub) |
| **Frontend Textarea** | [`client/src/components/ui/BlockTextarea.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockTextarea.tsx) | `client/src/components/ui/Textarea.tsx` (Unused 2-line re-export stub) |
| **Hero Audio Background** | [`client/src/components/effects/ImmersiveHeroBackground.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/effects/ImmersiveHeroBackground.tsx) | `client/src/components/ui/CinematicAudioHero.tsx` (Unused alias)<br/>`client/src/components/ui/AmbientSoundEnvironment.tsx` (480 lines dead code) |
| **Soundwave Sculpture** | [`client/src/components/ui/VoxelWaveform.tsx`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/VoxelWaveform.tsx) | `client/src/components/ui/VoxelSoundwaveSculpture.tsx` (149 lines dead code) |
| **Client CSS** | [`client/src/index.css`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/index.css) (Tailwind + Voxel Theme) | `client/src/App.css` (184 lines unused Vite counter boilerplate) |
| **Client Starter Assets** | Custom voxel SVGs & Lucide icons | `client/src/assets/react.svg`, `client/src/assets/vite.svg` (Unused Vite template SVGs) |
| **Backend Audio Utilities** | [`server/src/modules/audio/audio.utils.ts`](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/modules/audio/audio.utils.ts) | Duplicate `generateDeterministicWav` helper in `server/src/modules/speech/speech.routes.ts` |

---

## 2. Suspicious File Inventory & Classification

Every candidate file has been audited against imports, exports, and runtime behavior:

### File 1: `client/src/components/ui/AmbientSoundEnvironment.tsx`
- **File path:** `client/src/components/ui/AmbientSoundEnvironment.tsx`
- **Purpose:** Interactive Web Audio canvas visualizer with Catmull-Rom spline curves.
- **Actively used:** No.
- **Imported by:** None (0 references in codebase).
- **Alternative implementation:** Superceded by `client/src/components/effects/ImmersiveHeroBackground.tsx` and `ParticleEngine.ts`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 2: `client/src/components/ui/VoxelSoundwaveSculpture.tsx`
- **File path:** `client/src/components/ui/VoxelSoundwaveSculpture.tsx`
- **Purpose:** Animated multi-lingual glyph soundwave sculpture with RAF animation loop.
- **Actively used:** No.
- **Imported by:** None (0 references in codebase).
- **Alternative implementation:** Superceded by `client/src/components/ui/VoxelWaveform.tsx` and `VoiceCore.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 3: `client/src/components/ui/CinematicAudioHero.tsx`
- **File path:** `client/src/components/ui/CinematicAudioHero.tsx`
- **Purpose:** Legacy alias wrapper forwarding props to `ImmersiveHeroBackground`.
- **Actively used:** No.
- **Imported by:** None (0 references in codebase; `Landing.tsx` imports `ImmersiveHeroBackground` directly).
- **Alternative implementation:** `client/src/components/effects/ImmersiveHeroBackground.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 4: `client/src/components/ui/AudioPlayer.tsx`
- **File path:** `client/src/components/ui/AudioPlayer.tsx`
- **Purpose:** 2-line re-export stub forwarding to `VoxelAudioPlayer`.
- **Actively used:** No.
- **Imported by:** None (all consuming components import `VoxelAudioPlayer` directly).
- **Alternative implementation:** `client/src/components/ui/VoxelAudioPlayer.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 5: `client/src/components/ui/AudioWaveform.tsx`
- **File path:** `client/src/components/ui/AudioWaveform.tsx`
- **Purpose:** 2-line re-export stub forwarding to `VoxelWaveform`.
- **Actively used:** No.
- **Imported by:** None (all consuming components import `VoxelWaveform` directly).
- **Alternative implementation:** `client/src/components/ui/VoxelWaveform.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 6: `client/src/components/ui/Badge.tsx`
- **File path:** `client/src/components/ui/Badge.tsx`
- **Purpose:** 2-line re-export stub forwarding to `BlockBadge`.
- **Actively used:** No.
- **Imported by:** None (all consuming components import `BlockBadge` directly).
- **Alternative implementation:** `client/src/components/ui/BlockBadge.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 7: `client/src/components/ui/Button.tsx`
- **File path:** `client/src/components/ui/Button.tsx`
- **Purpose:** 2-line re-export stub forwarding to `BlockButton`.
- **Actively used:** No.
- **Imported by:** None (all consuming components import `BlockButton` directly).
- **Alternative implementation:** `client/src/components/ui/BlockButton.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 8: `client/src/components/ui/Card.tsx`
- **File path:** `client/src/components/ui/Card.tsx`
- **Purpose:** 11-line re-export stub forwarding to `VoxelCard` and subcomponents.
- **Actively used:** No.
- **Imported by:** None (all consuming components import `VoxelCard` directly).
- **Alternative implementation:** `client/src/components/ui/VoxelCard.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 9: `client/src/components/ui/Input.tsx`
- **File path:** `client/src/components/ui/Input.tsx`
- **Purpose:** 2-line re-export stub forwarding to `BlockInput`.
- **Actively used:** No.
- **Imported by:** None (all consuming components import `BlockInput` directly).
- **Alternative implementation:** `client/src/components/ui/BlockInput.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 10: `client/src/components/ui/Modal.tsx`
- **File path:** `client/src/components/ui/Modal.tsx`
- **Purpose:** 2-line re-export stub forwarding to `BlockModal`.
- **Actively used:** No.
- **Imported by:** None (all consuming components import `BlockModal` directly).
- **Alternative implementation:** `client/src/components/ui/BlockModal.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 11: `client/src/components/ui/NoticeBanner.tsx`
- **File path:** `client/src/components/ui/NoticeBanner.tsx`
- **Purpose:** 2-line re-export stub forwarding to `BlockNoticeBanner`.
- **Actively used:** No.
- **Imported by:** None (all consuming components import `BlockNoticeBanner` directly).
- **Alternative implementation:** `client/src/components/ui/BlockNoticeBanner.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 12: `client/src/components/ui/Textarea.tsx`
- **File path:** `client/src/components/ui/Textarea.tsx`
- **Purpose:** 2-line re-export stub forwarding to `BlockTextarea`.
- **Actively used:** No.
- **Imported by:** None (all consuming components import `BlockTextarea` directly).
- **Alternative implementation:** `client/src/components/ui/BlockTextarea.tsx`.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 13: `client/src/components/layout/BlockNavbar.tsx` & `client/src/components/layout/Navbar.tsx`
- **File path:** `client/src/components/layout/BlockNavbar.tsx` vs `client/src/components/layout/Navbar.tsx`
- **Purpose:** Navbar implementation split across two files (actual code in `BlockNavbar.tsx`, forwarder in `Navbar.tsx`).
- **Actively used:** Yes. `AppLayout.tsx` imports from `./Navbar`.
- **Imported by:** `client/src/components/layout/AppLayout.tsx`.
- **Alternative implementation:** Identical component duplicated across two files.
- **Safe to remove:** Safe after consolidation.
- **Recommended action:** MERGE — Move the complete component implementation into canonical `Navbar.tsx`, maintaining backward-compatible `Navbar` and `BlockNavbar` named exports, then delete `BlockNavbar.tsx`.
- **Classification:** **B. MERGE**

---

### File 14: `client/src/App.css`
- **File path:** `client/src/App.css`
- **Purpose:** 184 lines of Vite template counter styles.
- **Actively used:** No.
- **Imported by:** None (0 references; `main.tsx` imports `index.css`).
- **Alternative implementation:** `client/src/index.css` contains all custom styling and Tailwind directives.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 15: `client/src/assets/react.svg` & `client/src/assets/vite.svg`
- **File path:** `client/src/assets/react.svg`, `client/src/assets/vite.svg`
- **Purpose:** Default Vite template starter assets.
- **Actively used:** No.
- **Imported by:** None.
- **Alternative implementation:** Not needed.
- **Safe to remove:** Yes.
- **Recommended action:** DELETE.
- **Classification:** **C. DELETE**

---

### File 16: `client/src/assets/hero.png`
- **File path:** `client/src/assets/hero.png`
- **Purpose:** Legacy static mockup graphic.
- **Actively used:** No direct imports in code.
- **Imported by:** None.
- **Alternative implementation:** Interactive Canvas `ImmersiveHeroBackground.tsx`.
- **Safe to remove:** Potential asset dependency for external social previews.
- **Recommended action:** INVESTIGATE / RETAIN as backup asset per safety guidelines.
- **Classification:** **D. INVESTIGATE**

---

### File 17: `server/src/modules/speech/speech.routes.ts` (Inline `generateDeterministicWav`)
- **File path:** `server/src/modules/speech/speech.routes.ts` (Lines 44-77)
- **Purpose:** Deterministic 48kHz PCM WAV generator for fallback audio synthesis.
- **Actively used:** Yes.
- **Duplicate implementation:** `server/src/modules/audio/audio.utils.ts` contains the exact same canonical helper (`generateDeterministicWav`).
- **Safe to consolidate:** Yes.
- **Recommended action:** MERGE — Replace inline function in `speech.routes.ts` with import from `../audio/audio.utils.js`.
- **Classification:** **B. MERGE**

---

## 3. Retained Core Architecture (Classification: A. KEEP)

The following core modules are confirmed active, tested, and strictly required:

### Frontend (`client/src/`)
- `main.tsx`: React 19 application mounting point.
- `App.tsx`: Main router, session state, and ProtectedRoute / PublicAuthRoute.
- `index.css`: Tailwind CSS layers + Minecraft / Voxel design system.
- `components/layout/AppLayout.tsx`: Master shell layout with Navbar, VoxelCursor, and Footer.
- `components/layout/Footer.tsx`: Application footer.
- `components/effects/AmbientLighting.tsx`: Dynamic ambient illumination.
- `components/effects/AudioHalo.tsx`: Interactive audio reactivity halo.
- `components/effects/CinematicParticleField.tsx`: Canvas particle field.
- `components/effects/ImmersiveHeroBackground.tsx`: Integrated hero canvas background.
- `components/effects/ParticleEngine.ts`: High-performance particle physics engine.
- `components/ui/BlockBadge.tsx`: Voxel badge.
- `components/ui/BlockButton.tsx`: 3D voxel button with sound reactivity.
- `components/ui/BlockEmptyState.tsx`: Empty state block illustration.
- `components/ui/BlockInput.tsx`: 3D input element with badge labels.
- `components/ui/BlockModal.tsx`: Voxel modal dialogue.
- `components/ui/BlockNoticeBanner.tsx`: System notice banner.
- `components/ui/BlockProgress.tsx`: Voxel progress bar.
- `components/ui/BlockSelect.tsx`: Language & voice dropdown select.
- `components/ui/BlockTextarea.tsx`: Voxel multiline script input.
- `components/ui/CubeIllustration.tsx`: 3D isometric pixel cubes.
- `components/ui/PixelDivider.tsx`: Dotted pixel separators.
- `components/ui/VoiceCore.tsx`: Biometric voice core visualizer.
- `components/ui/VoxelAudioPlayer.tsx`: Canonical full-featured audio player.
- `components/ui/VoxelCard.tsx`: Master voxel card containers.
- `components/ui/VoxelCursor.tsx`: Custom Minecraft cursor tracking.
- `components/ui/VoxelWaveform.tsx`: Canvas audio waveform scrubbing visualization.
- `context/AudioContext.tsx`: Master Web Audio API provider.
- `context/AuthContext.tsx`: Master Supabase Auth & JWT provider with dynamic profile sync.
- `lib/api.ts`: Master API client with `VITE_API_URL` dynamic origin resolution.
- `lib/audioEngine.ts`: Browser Web Audio synthesizer & sound effect manager.
- `lib/audioRecorder.ts`: Browser PCM microphone recorder with 48kHz WAV normalization.
- `lib/constants.ts`: Languages, demo scripts, standard voices, consent legal text.
- `lib/supabase.ts`: Frontend Supabase client.
- `lib/utils.ts`: Tailwind `cn` utility and formatting helpers.
- `pages/Landing.tsx`: Hero & product showcase.
- `pages/Auth.tsx`: Login / Signup / Guest access.
- `pages/Dashboard.tsx`: Voice status, dynamic profile, audio library stats.
- `pages/VoiceSetup.tsx`: Microphone enrollment, consent, 768-dim embedding creation.
- `pages/SpeechStudio.tsx`: Multilingual translation & personal voice synthesis studio.
- `pages/AudioLibrary.tsx`: Library inventory, signed URL streaming, download, delete.
- `pages/Settings.tsx`: System preferences, DPDP consent management, account controls.
- `types/index.ts`: Shared TypeScript interfaces.

### Backend (`server/src/`)
- `server.ts`: HTTP server bootstrapper.
- `app.ts`: Express application, Helmet CORP, CORS allowlist, error middleware.
- `config/env.ts`: Zod schema environment validation.
- `db/repository.ts`: PostgreSQL data access repository for all entities.
- `db/supabase.ts`: Supabase service_role & anon clients with health check.
- `middleware/auth.ts`: Strict JWT Bearer validation middleware (`requireAuth`).
- `middleware/rateLimit.ts`: Sliding-window rate limiter with IP / User ID keys.
- `middleware/validate.ts`: Zod request body & parameter validation middleware.
- `modules/audio/audio.routes.ts`: Audio listing, streaming, download, signed URLs.
- `modules/audio/audio.utils.ts`: WAV header inspection, repair, and synthesis.
- `modules/auth/auth.routes.ts`: Signup, session verification (`/me`), profile sync.
- `modules/speech/speech.routes.ts`: Personal cloned & standard voice generation.
- `modules/storage/storage.service.ts`: Supabase Storage upload, download, delete, signed URLs.
- `modules/translation/languageDetection.service.ts`: Indic script detection engine.
- `modules/translation/translation.service.ts`: Context-preserving Indic translation adapter.
- `modules/translation/translation.routes.ts`: `/detect` and `/translate` endpoints.
- `modules/voice/voice.routes.ts`: Voice enrollment, status, update, revocation.
- `modules/voice/voice.service.ts`: Voice profile state machine & 768-dim tensor validation.
- `providers/gnani/index.ts`: Gnani provider factory.
- `providers/gnani/timbre.client.ts`: Gnani Timbre client with 60s/120s timeout management.
- `providers/gnani/voiceEnrollment.adapter.ts`: Vachana speaker embedding extraction.
- `providers/gnani/types.ts`: Gnani provider interfaces & supported locales.
- `providers/gnani/spike.ts`: Developer API key & connectivity verification script.
- `__tests__/*`: 15 comprehensive automated test suites.
