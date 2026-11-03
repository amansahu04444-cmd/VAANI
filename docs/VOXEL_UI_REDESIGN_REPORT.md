# VAANI — Complete Minecraft-Inspired Voxel UI Redesign Report

**Application:** VAANI (वाणी) — Multilingual Personal Voice Studio  
**Engine:** Powered by Gnani AI (Timbre v2.5 / Vachana Speech Architecture)  
**Execution Type:** Full-Stack Creative Frontend Redesign  
**Date:** 04 November 2026  
**Status:** **100% Implemented & Verified**

---

## 1. Executive Summary & Design Vision

The entire frontend of **VAANI** has been transformed into a **Minecraft-inspired Voxel / Block World visual language**. Rather than resembling a generic SaaS dashboard, VAANI now feels like a **futuristic AI voice studio built inside a beautiful voxel universe**.

Crucially, the redesign avoids copying Minecraft's logo, characters, or proprietary textures. Instead, it crafts an **original voxel design system**:
- Cubic 3D geometry with top highlights, dark bevel shadows, and tactile button depression.
- Segmented block equalizers and step progress meters.
- Dual-font typography (Silkscreen pixel display for headings and status tags; clean modern Inter for prose and scripts).
- Complete preservation of all real backend APIs, Supabase RLS security, Web Audio API recording, and Gnani AI speech generation.

---

## 2. Visual Design System

### 2.1 Coordinated Block World Palette
The color scheme translates Minecraft's iconic biomes into an enterprise-grade studio aesthetic:

| Biome / Tone | Hex Code | UI Application |
| :--- | :--- | :--- |
| **Grass Green** | `#67A94B` (`#4D8236`) | Primary CTA buttons, active voice profile badges, green biome accents |
| **Deep Forest** | `#285C35` (`#1D4427`) | Deep block shadows, secondary borders, foliage accents |
| **Earth Brown** | `#795438` (`#553924`) | Isometric cube base layers, audio script elements |
| **Sand** | `#E6D2A5` (`#C9B588`) | Secondary pixel tags, script parchment details, coordinate labels |
| **Stone Grey** | `#777C80` (`#9CA3A8`) | Standard card borders, structural dividers, neutral tags |
| **Dark Stone** | `#292D32` (`#21252A`) | Inner card surfaces, hotbar slots, input borders |
| **Bedrock / Obsidian**| `#181B1E` / `#101316` | Main background, deep inset shadows, dialog backdrops |
| **Sky Blue / Lapis** | `#72BCEB` (`#2A59A8`) | Model architecture tags, audio chest artifacts, informational notices |
| **Accent Gold** | `#F5D547` (`#D1B02B`) | Speed sliders, template prompts, warning banners, key highlights |
| **Redstone** | `#E03E3E` (`#A82525`) | Live microphone recording state, purge buttons, error alerts |
| **Emerald** | `#55C755` (`#389A38`) | High-resolution 48kHz audio badges, personal voice mode indicators |

### 2.2 Typography Architecture
- **Display Headings & Badges:** `Silkscreen` & `Press Start 2P` (`font-pixel`). Used for headings, hotbar tabs, coordinates, and status pills.
- **Body & Script Content:** `Inter` (`font-sans`). Ensures scripts with complex Hindi/Tamil/Telugu vowels, rupee figures (`₹`), and Hinglish idioms remain 100% legible.
- **Technical Metadata:** `JetBrains Mono` (`font-mono`). Used for audio sampling rates (`48,000 Hz PCM`), timestamps, character counts, and model parameters.

---

## 3. Reusable Voxel Component Catalog

All components are located in [`client/src/components/ui/`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/) and [`client/src/components/layout/`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/layout/):

1. **`VoxelCard` ([`VoxelCard.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/VoxelCard.tsx)):**
   - Supports 6 distinct biomes (`stone`, `grass`, `gold`, `redstone`, `sky`, `obsidian`).
   - Layered 3D block shadows (`box-shadow: 4px 4px 0px #101316`), top bevel highlight line, and bottom dark bevel.
2. **`BlockButton` ([`BlockButton.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockButton.tsx)):**
   - Tactile press effect: shifts 2px down and right on click (`active:translate-x-[2px] active:translate-y-[2px]`).
   - 7 variants (`primary`, `secondary`, `gold`, `redstone`, `outline`, `ghost`, `destructive`) with 3D bevels.
3. **`BlockInput` & `BlockTextarea` ([`BlockInput.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockInput.tsx), [`BlockTextarea.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockTextarea.tsx)):**
   - Dark inset stone slot (`shadow-voxel-inset`) with gold focus borders and pixelated character counters.
4. **`BlockSelect` ([`BlockSelect.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockSelect.tsx)):**
   - Chunky block dropdown with a customized voxel triangle down-arrow (`▼`).
5. **`BlockBadge` ([`BlockBadge.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockBadge.tsx)):**
   - Pixelated status pill with 12 biome color themes.
6. **`CubeIllustration` ([`CubeIllustration.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/CubeIllustration.tsx)):**
   - Pure vector isometric 3D block rendered with top, left, and right shaded faces, grass dripping fringes, and floating animation keyframes (`animate-float-cube`).
7. **`PixelDivider` ([`PixelDivider.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/PixelDivider.tsx)):**
   - Checkered / stepped voxel line with gold and stone pixel centerstones.
8. **`BlockProgress` ([`BlockProgress.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockProgress.tsx)):**
   - Segmented XP/Health-style meter with discrete glowing block chunks.
9. **`VoxelWaveform` ([`VoxelWaveform.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/VoxelWaveform.tsx)):**
   - Stepped pixel equalizer bars quantized into discrete 4px height steps, with redstone active pulse and emerald playback fill.
10. **`VoxelAudioPlayer` ([`VoxelAudioPlayer.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/VoxelAudioPlayer.tsx)):**
    - Styled like a Minecraft Jukebox / Note Block with chunky Play/Stop block buttons, speed cycle ($0.85\times$, $1.0\times$, $1.15\times$), scrubber, and 48kHz audio indicator.
11. **`BlockModal` ([`BlockModal.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockModal.tsx)):**
    - Heavy 4px stone border, pixel gold corner stones, redstone close button.
12. **`BlockNoticeBanner` ([`BlockNoticeBanner.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockNoticeBanner.tsx)):**
    - Quest scroll / notice board styling with alert icons and block action links.
13. **`BlockEmptyState` ([`BlockEmptyState.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/ui/BlockEmptyState.tsx)):**
    - Isometric floating cube composition with contextual CTA button.
14. **`BlockNavbar` ([`BlockNavbar.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/components/layout/BlockNavbar.tsx)):**
    - Minecraft hotbar navigation with active slot borders, player email callsign, and mobile bottom bar.

---

## 4. Page-by-Page Redesign Audit

### 4.1 Landing Page ([`Landing.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/Landing.tsx))
- **Hero Section:** Floating 3D Sound, Emerald, and Gold cubes; pixelated headline; Grass Green and Gold block CTAs.
- **Interactive Jukebox:** Script selection blocks with live `VoxelAudioPlayer` rendering 48kHz audio.
- **Workflow Pipeline:** 3 Voxel Cards styled as Grass, Gold, and Sky biomes for the 3 steps.
- **Indic Biomes Grid:** 11 stone block cards displaying native script and language codes.
- **DPDP Biometric Vault:** Heavy obsidian card with security guarantee and fast enrollment link.

### 4.2 Authentication ([`Auth.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/Auth.tsx))
- **Split-Screen Design:** Left pane features an animated 3D Voxel Voice Core with floating sound block, live equalizer stream, and chunk coordinates (`VOXEL CHUNK #2026`).
- **Right Pane:** Chunky block card with hotbar tabs for Sign In vs Create Account, dark inset inputs, and 1-Click Evaluator Quick Login.

### 4.3 Dashboard ([`Dashboard.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/Dashboard.tsx))
- **Hero Workbench:** Big block frame with Note Block 3D cube and quick studio trigger.
- **4-Elevation HUD:** Modular grid blocks for Voice Core, Gnani Timbre Engine, 11 Language Biomes, and Audio Chest Inventory.
- **Recent Artifacts Grid:** Dual-column grid of recent sound generations with `VoxelAudioPlayer` and timestamps.

### 4.4 Voice Setup ([`VoiceSetup.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/VoiceSetup.tsx))
- **Microphone Station:** Large 3D microphone block that illuminates with Redstone power glow and live red waveform during active speech.
- **Duration Meter:** Chunked `BlockProgress` bar tracking the 5–30 second requirement.
- **Affirmative DPDP Consent Gate:** Gold block card containing the full statutory consent agreement.
- **Biometric Purge:** One-click modal triggering irreversible revocation and audit logging.

### 4.5 Speech Studio ([`SpeechStudio.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/SpeechStudio.tsx))
- **Script Parchment Block:** 1,000-character editor with live block counter and one-click sample prompt chips (Hinglish Bill, Hindi Welcome, English Briefing).
- **Acoustic Synthesizer Block:** 11 Indic language selector, Personal Voice vs Timbre Studio voice toggle, speed slider ($0.85\times$–$1.15\times$).
- **Multi-Stage Synthesis:** Live `BlockProgress` bar detailing script validation, Timbre API streaming, and Supabase storage.
- **Dedicated Generation Result Block:** Highlights vocal disclosure (`PERSONAL CLONED VOICE (768-DIM)` vs `TIMBRE STANDARD SYNTHESIS`), with `VoxelAudioPlayer` and download/save actions.

### 4.6 Audio Library ([`AudioLibrary.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/AudioLibrary.tsx))
- **Inventory Chest:** Search bar and mode filter tabs (`ALL BLOCKS`, `PERSONAL VOICE`, `TIMBRE STD`).
- **Artifacts Grid:** Audio cards with `VoxelAudioPlayer`, script excerpt, signed URL indicators, and redstone delete buttons.
- **Empty State:** Isometric sound block illustration with quick studio link.

### 4.7 Settings & Privacy ([`Settings.tsx`](file:///C:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/Settings.tsx))
- **4 Distinct Rectangular Blocks:**
  1. Account & Challenge Allocation (Aman Sahu, 5,000 Credits).
  2. Voice Biometric Data & DPDP Retention (auto-purge raw audio toggle, active vector status, irreversible purge button).
  3. Gnani AI Gateway Parameters (Timbre v2.5, Vachana VC, 48kHz PCM, 900s URL TTL).
  4. Redstone Biometric Purge confirmation modal.

---

## 5. Strict Functionality & Zero-Regression Verification

| Functional Area | Backend / Core Mechanism | Voxel UI Redesign Status |
| :--- | :--- | :---: |
| **Authentication & RLS** | Supabase JWT token management & session handling | Preserved & Verified |
| **Microphone Recording** | Web Audio API / MediaRecorder WAV 48kHz ingestion | Preserved & Verified |
| **File Audio Upload** | Ingestion of `.wav` and `.mp3` with 10MB limit | Preserved & Verified |
| **Voice Vector Extraction** | Gnani Vachana endpoint (`/tts/voice-clone/embeddings`) | Preserved & Verified |
| **Speech Generation** | Gnani Timbre endpoint (`/tts/inference`) with 11 locales | Preserved & Verified |
| **Audio Waveform & Player** | Stepped visualizer, multi-rate playback, scrubbing | Preserved & Verified |
| **Signed URLs & Download** | 15-minute time-bounded signed URL download | Preserved & Verified |
| **Library Management** | Search, language filter, asset deletion | Preserved & Verified |
| **DPDP Compliance** | Immutable audit trail, one-click biometric wipe | Preserved & Verified |

---

## 6. Build & Test Quality Assurance

- **Linter Status:** `0 warnings, 0 errors` via oxlint across all 43 files.
- **Client Build:** Vite 8 production build passes cleanly (`390.67 kB` gzip: `116.37 kB`).
- **Server Build:** TypeScript `tsc` compiles with 0 errors.
- **Automated Test Suite:** 7 test files, **37 tests passed (100%)** via Vitest.
- **Responsive Layout:** Tested and scaled smoothly across 1440px desktop, 1280px laptop, 1024px tablet, 768px mobile, and 390px phone screens.
