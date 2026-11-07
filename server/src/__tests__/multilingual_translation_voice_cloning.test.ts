import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { mockDb } from '../db/repository.js'
import { createTestToken } from './helpers.js'
import { languageDetectionService } from '../modules/translation/languageDetection.service.js'
import { translationService } from '../modules/translation/translation.service.js'

describe('VAANI — Multilingual Translation & Personal Voice Cloning Suite', () => {
  const tokenUserA = createTestToken('user-a', 'usera@example.com')
  const tokenUserNoVoice = createTestToken('user-novoice', 'novoice@example.com')

  beforeEach(() => {
    mockDb.reset()
    mockDb.seedInitialData()
  })

  // =========================================================================
  // 1. Source Language Detection Verification
  // =========================================================================
  describe('1. Source Language Detection Engine', () => {
    it('detects Devanagari Hindi text accurately', () => {
      const text = 'नमस्ते, वाणी स्टूडियो में आपका स्वागत है। कल सुबह १० बजे मीटिंग है।'
      const detected = languageDetectionService.detectLanguage(text)
      expect(detected.detectedLanguage).toBe('hi-IN')
      expect(detected.languageName).toContain('Hindi')
      expect(detected.confidence).toBeGreaterThan(0.7)
    })

    it('detects Latin English text accurately', () => {
      const text = 'Welcome to VAANI speech studio. Please upload your voice sample for cloning.'
      const detected = languageDetectionService.detectLanguage(text)
      expect(detected.detectedLanguage).toBe('en-IN')
      expect(detected.languageName).toContain('English')
      expect(detected.confidence).toBeGreaterThan(0.7)
    })

    it('detects Romanized Indic / Hinglish code-mixed script accurately', () => {
      const text = 'Namaste, kal subah 10 baje project review meeting hai. Kripya ₹2,500 ka invoice saath lekar aayein.'
      const detected = languageDetectionService.detectLanguage(text)
      expect(['auto', 'hi-Latn', 'hi-IN']).toContain(detected.detectedLanguage)
      expect(detected.isCodeMixed).toBe(true)
    })

    it('detects Tamil script accurately', () => {
      const text = 'வணக்கம், உங்கள் குரல் மாதிரி வெற்றிகரமாக பதிவு செய்யப்பட்டுள்ளது.'
      const detected = languageDetectionService.detectLanguage(text)
      expect(detected.detectedLanguage).toBe('ta-IN')
      expect(detected.languageName).toContain('Tamil')
      expect(detected.confidence).toBeGreaterThan(0.7)
    })

    it('detects Bengali script accurately', () => {
      const text = 'নমস্কার, আপনার নতুন ভয়েস প্রোফাইল প্রস্তুত।'
      const detected = languageDetectionService.detectLanguage(text)
      expect(detected.detectedLanguage).toBe('bn-IN')
      expect(detected.languageName).toContain('Bengali')
      expect(detected.confidence).toBeGreaterThan(0.7)
    })

    it('detects Marathi text accurately', () => {
      const text = 'नमस्कार, आपल्या नवीन आवाजाचे स्वागत आहे. उद्या बैठक आहे.'
      const detected = languageDetectionService.detectLanguage(text)
      expect(['mr-IN', 'hi-IN']).toContain(detected.detectedLanguage)
      expect(detected.confidence).toBeGreaterThan(0.5)
    })

    it('exposes POST /api/translation/detect endpoint with valid schema', async () => {
      const res = await request(app)
        .post('/api/translation/detect')
        .send({ text: 'कल दोपहर २ बजे मीटिंग होगी।' })

      expect(res.status).toBe(200)
      expect(res.body.detectedLanguage).toBe('hi-IN')
      expect(res.body.languageName).toContain('Hindi')
      expect(res.body.confidence).toBeGreaterThan(0.5)
      expect(typeof res.body.isCodeMixed).toBe('boolean')
    })
  })

  // =========================================================================
  // 2. Multilingual Indic Translation Engine
  // =========================================================================
  describe('2. Indic Translation Engine (Required Language Pairs)', () => {
    it('translates Hindi to English (hi-IN -> en-IN) and preserves numbers', async () => {
      const res = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'नमस्ते, कल सुबह 10 बजे मीटिंग है।',
          sourceLanguage: 'hi-IN',
          targetLanguage: 'en-IN',
        })

      expect(res.status).toBe(200)
      expect(res.body.sourceLanguage).toBe('hi-IN')
      expect(res.body.targetLanguage).toBe('en-IN')
      expect(res.body.translatedText).toBeDefined()
      expect(res.body.translatedText.length).toBeGreaterThan(0)
      // Check that 10 is preserved
      expect(res.body.translatedText).toMatch(/10/)
      expect(res.body.isIdentical).toBe(false)
    })

    it('translates English to Hindi (en-IN -> hi-IN)', async () => {
      const res = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Welcome to VAANI. Tomorrow at 10 AM is the meeting.',
          sourceLanguage: 'en-IN',
          targetLanguage: 'hi-IN',
        })

      expect(res.status).toBe(200)
      expect(res.body.sourceLanguage).toBe('en-IN')
      expect(res.body.targetLanguage).toBe('hi-IN')
      expect(res.body.translatedText).toBeDefined()
      expect(res.body.isIdentical).toBe(false)
    })

    it('translates Hindi to Tamil (hi-IN -> ta-IN)', async () => {
      const res = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'नमस्ते, आपका स्वागत है।',
          sourceLanguage: 'hi-IN',
          targetLanguage: 'ta-IN',
        })

      expect(res.status).toBe(200)
      expect(res.body.sourceLanguage).toBe('hi-IN')
      expect(res.body.targetLanguage).toBe('ta-IN')
      expect(res.body.translatedText).toBeDefined()
      expect(res.body.isIdentical).toBe(false)
    })

    it('translates Hinglish to English (auto/hi-Latn -> en-IN) preserving currency ₹2,500 and numbers', async () => {
      const res = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Namaste, kal subah 10 baje project review meeting hai. Kripya ₹2,500 ka invoice saath lekar aayein.',
          sourceLanguage: 'hi-Latn',
          targetLanguage: 'en-IN',
        })

      expect(res.status).toBe(200)
      expect(res.body.targetLanguage).toBe('en-IN')
      expect(res.body.translatedText).toBeDefined()
      // Currency symbol and amount must be preserved
      expect(res.body.translatedText).toMatch(/2,500|2500/)
      expect(res.body.isIdentical).toBe(false)
    })

    it('translates English to Bengali (en-IN -> bn-IN)', async () => {
      const res = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'Welcome to VAANI speech synthesis.',
          sourceLanguage: 'en-IN',
          targetLanguage: 'bn-IN',
        })

      expect(res.status).toBe(200)
      expect(res.body.sourceLanguage).toBe('en-IN')
      expect(res.body.targetLanguage).toBe('bn-IN')
      expect(res.body.translatedText).toBeDefined()
      expect(res.body.isIdentical).toBe(false)
    })

    it('translates Hindi to Marathi (hi-IN -> mr-IN)', async () => {
      const res = await request(app)
        .post('/api/translation/translate')
        .send({
          text: 'नमस्ते, कल सुबह 10 बजे मीटिंग है।',
          sourceLanguage: 'hi-IN',
          targetLanguage: 'mr-IN',
        })

      expect(res.status).toBe(200)
      expect(res.body.sourceLanguage).toBe('hi-IN')
      expect(res.body.targetLanguage).toBe('mr-IN')
      expect(res.body.translatedText).toBeDefined()
      expect(res.body.isIdentical).toBe(false)
    })

    it('bypasses translation when source and target languages are identical (hi-IN -> hi-IN)', async () => {
      const text = 'नमस्ते, कल सुबह 10 बजे मीटिंग है।'
      const res = await request(app)
        .post('/api/translation/translate')
        .send({
          text,
          sourceLanguage: 'hi-IN',
          targetLanguage: 'hi-IN',
        })

      expect(res.status).toBe(200)
      expect(res.body.isIdentical).toBe(true)
      expect(res.body.translatedText).toBe(text)
    })
  })

  // =========================================================================
  // 3. End-to-End Personal Voice Cloning Pipeline with Multilingual Synthesis
  // =========================================================================
  describe('3. Personal Voice Cloning Pipeline with Multilingual Translation', () => {
    it('synthesizes personal cloned voice in English from a Hindi script with auto-translation', async () => {
      // User A has an active voice profile with a 768-dim speaker embedding tensor
      const hindiScript = 'नमस्ते, वाणी स्टूडियो में आपका स्वागत है। कल सुबह 10 बजे मीटिंग है।'

      const res = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          text: hindiScript,
          title: 'Cross-Lingual Hindi to English',
          targetLanguage: 'en-IN',
          voiceMode: 'personal',
          speed: 1.0,
        })

      expect(res.status).toBe(201)
      expect(res.body.jobId).toBeDefined()
      expect(res.body.status).toBe('completed')

      const asset = res.body.asset
      expect(asset).toBeDefined()
      expect(asset.languageCode).toBe('en-IN')
      expect(asset.voiceMode).toBe('personal')
      expect(asset.originalText).toBe(hindiScript)
      expect(asset.translatedText).toBeDefined()
      // Synthesized text preview should match the translated English text, not raw Hindi
      expect(asset.textPreview).toBe(asset.translatedText)
      expect(asset.signedUrl).toBeDefined()

      // Verify asset persisted in database with translation metadata
      const dbAsset = mockDb.audioAssets.get(asset.id)
      expect(dbAsset).toBeDefined()
      expect(dbAsset?.user_id).toBe('user-a')
      expect(dbAsset?.target_language).toBe('en-IN')
      expect(dbAsset?.voice_mode).toBe('personal')
      expect(dbAsset?.original_text).toBe(hindiScript)
      expect(dbAsset?.translated_text).toBe(asset.translatedText)
    })

    it('honors user-edited translation from the workbench when supplied', async () => {
      const originalHindi = 'नमस्ते, कल सुबह 10 बजे मीटिंग है।'
      const userEditedEnglish = 'Greetings everyone, our team review is scheduled tomorrow morning at 10:00 AM.'

      const res = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          text: originalHindi,
          translatedText: userEditedEnglish,
          sourceLanguage: 'hi-IN',
          title: 'Custom Edited Translation Speech',
          targetLanguage: 'en-IN',
          voiceMode: 'personal',
          speed: 1.0,
        })

      expect(res.status).toBe(201)
      const asset = res.body.asset
      expect(asset.originalText).toBe(originalHindi)
      expect(asset.translatedText).toBe(userEditedEnglish)
      expect(asset.textPreview).toBe(userEditedEnglish)

      const dbAsset = mockDb.audioAssets.get(asset.id)
      expect(dbAsset?.translated_text).toBe(userEditedEnglish)
      expect(dbAsset?.original_text).toBe(originalHindi)
    })

    it('synthesizes directly without translation when source and target languages match', async () => {
      const hindiScript = 'नमस्ते, वाणी में आपका स्वागत है।'

      const res = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          text: hindiScript,
          targetLanguage: 'hi-IN',
          voiceMode: 'personal',
          speed: 1.0,
        })

      expect(res.status).toBe(201)
      const asset = res.body.asset
      expect(asset.languageCode).toBe('hi-IN')
      expect(asset.textPreview).toBe(hindiScript)
    })

    it('blocks Personal Voice cloning if the user has no enrolled voice profile', async () => {
      const res = await request(app)
        .post('/api/speech/generate')
        .set('Authorization', `Bearer ${tokenUserNoVoice}`)
        .send({
          text: 'Hello world',
          targetLanguage: 'en-IN',
          voiceMode: 'personal',
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('VOICE_PROFILE_REQUIRED')
    })

    it('supports cross-lingual synthesis in public Demo Mode without database writes', async () => {
      const res = await request(app)
        .post('/api/speech/demo-generate')
        .send({
          text: 'Namaste, kal 10 baje meeting hai.',
          targetLanguage: 'en-IN',
          standardVoiceId: 'Pranav',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.isDemo).toBe(true)
      expect(res.body.audioBase64).toBeDefined()
      expect(res.body.asset.translatedText).toBeDefined()
      expect(res.body.asset.languageCode).toBe('en-IN')
    })
  })
})
