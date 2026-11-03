# VAANI (वाणी) — 60-Second Video Demo Walkthrough Script

**Project:** VAANI — Multilingual Personal Voice Studio  
**Target:** Great Indian AI Internship Challenge (Submission Target: 10 Nov 2026, 11:59 PM IST)  
**Video Duration:** Exactly 60 Seconds  
**Format:** 1080p 60fps screen recording with clear picture-in-picture presenter / crisp voiceover  
**Tone:** Confident, professional, inspiring, technically rigorous

---

## Storyboard & Timing Breakdown

```
0:00 ─── 0:07  [Hook & The Problem]
0:08 ─── 0:18  [Ethical Consent Gate & 10s Voice Enrollment]
0:19 ─── 0:32  [Multilingual Speech Studio & Hinglish Script]
0:33 ─── 0:46  [Gnani Timbre Synthesis & Waveform Playback]
0:47 ─── 0:55  [Secure Audio Library & Instant Biometric Wipe]
0:56 ─── 1:00  [Architecture & Gnani AI Challenge Attribution]
```

---

## Detailed Sequence Breakdown

### Scene 1: The Hook & Problem Statement (0:00 – 0:07)
- **On Screen:**
  - Fast zoom into the VAANI Landing Page (`http://localhost:5173/`).
  - Dark navy studio UI with the headline: *"Own Your Voice in Any Indian Language"*.
  - A subtle subtitle: *"Powered by Gnani AI Timbre v2.5 & Vachana Speech Architecture"*.
- **Voiceover (VO):**
  > *"India speaks 22 official languages, but when creators and businesses go regional, they lose their voice to robotic stock audio. Meet VAANI—the personal multilingual voice studio built for India."*
- **Visual Action:**
  - Cursor clicks **"Launch Studio"** button -> smoothly navigates to Dashboard.

---

### Scene 2: Consented Voice Enrollment (0:08 – 0:18)
- **On Screen:**
  - Transition to `Voice Setup` page (`/voice-setup`).
  - The DPDP 2023 Consent Gate appears with a shield badge: *"Biometric Consent Required"*.
- **Voiceover (VO):**
  > *"Zero deepfakes, zero unconsented cloning. Under India's DPDP Act, VAANI requires affirmative biometric consent before opening the microphone."*
- **Visual Action:**
  - Checkbox toggled: *"I grant consent to extract a voice embedding for my personal speech requests"*.
  - Clicks **"Start 10s Recording"** -> Speaks into microphone:
    > *"Namaste, my name is Aman Sharma and this is my voice reference sample for VAANI."*
  - The live audio waveform reacts in real-time.
  - Clicks **"Enroll Voice Profile"**. Progress spinner displays: *"Extracting 768-dimensional speaker embedding via Gnani Vachana..."* -> Returns **Active Profile Ready** (Badge: Teal).

---

### Scene 3: Multilingual Speech Studio (0:19 – 0:32)
- **On Screen:**
  - Navigates to `Speech Studio` (`/studio`).
  - Clean split-pane layout: script input on the left, voice parameters on the right.
- **Voiceover (VO):**
  > *"Now, let's put that cloned voice to work. VAANI supports 11 Indian languages and handles natural conversational Hinglish—including currencies and numbers."*
- **Visual Action:**
  - Pastes the test prompt into the 1,000-character script editor:
    > *"Namaste Sharma ji! Aapka ₹1,499 ka monthly Wi-Fi bill successfully pay ho gaya hai. Agla renewal 15th December ko scheduled hai. Thank you for choosing us!"*
  - Character counter updates: `168 / 1000`.
  - Dropdown selects target locale: **Hindi (hi-IN)**.
  - Voice mode shows **"Personal Voice (Aman Sharma)"** with Gnani speaker embedding attached.
  - Speed slider adjusted to `1.0x`.

---

### Scene 4: Gnani Timbre Synthesis & Playback (0:33 – 0:46)
- **On Screen:**
  - Clicks the primary action button: **"Synthesize Speech"**.
  - Multi-stage progress indicators illuminate:
    - `1. Validating payload & RLS scope...`
    - `2. Generating audio stream via Gnani Timbre...`
    - `3. Encrypting & storing in private Supabase bucket...`
- **Voiceover (VO):**
  > *"In seconds, Gnani AI synthesizes the Hinglish script in my exact vocal timbre—preserving natural Hindi cadence and correct rupee pronunciation."*
- **Audio & Visual Action:**
  - Output card expands with the interactive **AudioWaveform** player.
  - Clicks **Play** (audio plays aloud with clear vocal clone fidelity and natural Indian accent).
  - Demonstrates $1.25\times$ speed toggle and scrub bar.

---

### Scene 5: Secure Audio Library & Instant Biometric Revocation (0:47 – 0:55)
- **On Screen:**
  - Navigates to `Audio Library` (`/library`).
  - Shows paginated audio records with signed download links (15-minute expiration).
  - Clicks **"Download WAV"** -> browser downloads high-resolution 48kHz WAV.
  - Jumps to `Settings` (`/settings`).
- **Voiceover (VO):**
  > *"Every file is locked behind Row-Level Security and 15-minute signed URLs. And if you ever want your voice removed? One click wipes your biometric embedding forever."*
- **Visual Action:**
  - Clicks **"Revoke Consent & Wipe Voice Profile"** -> Confirmation modal confirms immediate purge from Supabase PostgreSQL and memory.
  - Status switches to **No Active Profile**.

---

### Scene 6: Architecture & Hackathon Closing (0:56 – 1:00)
- **On Screen:**
  - Rapid sequence showing terminal test runner: `37 tests passed (100%)` and architecture diagram.
  - Closing title card:
    - **VAANI (वाणी)**
    - **Aman Sharma | Great Indian AI Internship Challenge**
    - **Powered by Gnani AI**
- **Voiceover (VO):**
  > *"Full-stack React 19, Express, Supabase RLS, and Gnani AI. This is VAANI—giving every Indian their voice back."*

---

## Production Recording Tips for Video Submission
1. **Resolution:** 1920x1080 (16:9 widescreen).
2. **Audio Setup:** Use an external microphone or headset with clear gain levels.
3. **Pacing:** Strict adherence to the 60-second limit is essential for judging criteria. Keep transitions snappy.
4. **Browser Zoom:** Set browser zoom to 100% or 110% on 1080p display for optimal UI clarity.
