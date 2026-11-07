/**
 * LanguageDetectionService
 * Automatically detects the source language of input scripts using Unicode script analysis,
 * Indic character blocks, and Latin code-mixed / Hinglish phonetic heuristics.
 */

export interface LanguageDetectionResult {
  detectedLanguage: string
  languageName: string
  confidence: number
  isCodeMixed: boolean
}

// Common Hinglish / Indic Latin Romanized keywords
const HINGLISH_KEYWORDS = new Set([
  'namaste', 'namashkar', 'kal', 'aaj', 'parso', 'subah', 'shaam', 'dopahar', 'raat',
  'baje', 'hai', 'hain', 'tha', 'thi', 'the', 'hoga', 'hogi', 'honge', 'kripya',
  'kripya', 'dhanyawad', 'shukriya', 'aap', 'tum', 'hum', 'mera', 'meri', 'mere',
  'aapka', 'aapki', 'aapke', 'kaise', 'kaisi', 'kyun', 'kya', 'kaha', 'kahan',
  'saath', 'lekar', 'aayein', 'aana', 'karein', 'karna', 'karo', 'dekho', 'suno',
  'bol', 'bolo', 'baat', 'paisa', 'paise', 'rupaye', 'meeting', 'review', 'invoice',
  'project', 'presentation', 'theek', 'achha', 'accha', 'bahut', 'zaroor', 'zaroori'
])

export class LanguageDetectionService {
  /**
   * Detects the language of the provided script.
   */
  public static detectLanguage(text: string): LanguageDetectionResult {
    const trimmed = (text || '').trim()
    if (!trimmed) {
      return {
        detectedLanguage: 'hi-IN',
        languageName: 'Hindi (हिन्दी)',
        confidence: 1.0,
        isCodeMixed: false,
      }
    }

    let devanagariCount = 0
    let tamilCount = 0
    let teluguCount = 0
    let kannadaCount = 0
    let bengaliCount = 0
    let gujaratiCount = 0
    let malayalamCount = 0
    let gurmukhiCount = 0
    let odiaCount = 0
    let latinCount = 0
    let totalChars = 0

    for (const char of trimmed) {
      const code = char.charCodeAt(0)
      if (char === ' ' || char === '\n' || char === '\t' || (code >= 32 && code <= 64)) {
        continue // skip punctuation and numbers
      }
      totalChars++

      if (code >= 0x0900 && code <= 0x097f) {
        devanagariCount++
      } else if (code >= 0x0b80 && code <= 0x0bff) {
        tamilCount++
      } else if (code >= 0x0c00 && code <= 0x0c7f) {
        teluguCount++
      } else if (code >= 0x0c80 && code <= 0x0cff) {
        kannadaCount++
      } else if (code >= 0x0980 && code <= 0x09ff) {
        bengaliCount++
      } else if (code >= 0x0a80 && code <= 0x0aff) {
        gujaratiCount++
      } else if (code >= 0x0d00 && code <= 0x0d7f) {
        malayalamCount++
      } else if (code >= 0x0a00 && code <= 0x0a7f) {
        gurmukhiCount++
      } else if (code >= 0x0b00 && code <= 0x0b7f) {
        odiaCount++
      } else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
        latinCount++
      }
    }

    if (totalChars === 0) {
      return {
        detectedLanguage: 'hi-IN',
        languageName: 'Hindi (हिन्दी)',
        confidence: 0.5,
        isCodeMixed: false,
      }
    }

    // 1. Check Indian Native Scripts
    if (tamilCount / totalChars > 0.3) {
      return { detectedLanguage: 'ta-IN', languageName: 'Tamil (தமிழ்)', confidence: tamilCount / totalChars, isCodeMixed: false }
    }
    if (teluguCount / totalChars > 0.3) {
      return { detectedLanguage: 'te-IN', languageName: 'Telugu (తెలుగు)', confidence: teluguCount / totalChars, isCodeMixed: false }
    }
    if (kannadaCount / totalChars > 0.3) {
      return { detectedLanguage: 'kn-IN', languageName: 'Kannada (ಕನ್ನಡ)', confidence: kannadaCount / totalChars, isCodeMixed: false }
    }
    if (bengaliCount / totalChars > 0.3) {
      return { detectedLanguage: 'bn-IN', languageName: 'Bengali (বাংলা)', confidence: bengaliCount / totalChars, isCodeMixed: false }
    }
    if (gujaratiCount / totalChars > 0.3) {
      return { detectedLanguage: 'gu-IN', languageName: 'Gujarati (ગુજરાતી)', confidence: gujaratiCount / totalChars, isCodeMixed: false }
    }
    if (malayalamCount / totalChars > 0.3) {
      return { detectedLanguage: 'ml-IN', languageName: 'Malayalam (മലയാളം)', confidence: malayalamCount / totalChars, isCodeMixed: false }
    }
    if (gurmukhiCount / totalChars > 0.3) {
      return { detectedLanguage: 'pa-IN', languageName: 'Punjabi (ਪੰਜਾਬੀ)', confidence: gurmukhiCount / totalChars, isCodeMixed: false }
    }
    if (odiaCount / totalChars > 0.3) {
      return { detectedLanguage: 'or-IN', languageName: 'Odia (ଓଡ଼ିଆ)', confidence: odiaCount / totalChars, isCodeMixed: false }
    }

    // Devanagari script: distinguishes Marathi vs Hindi by specific postposition words
    if (devanagariCount / totalChars > 0.3) {
      const lower = trimmed.toLowerCase()
      const isMarathi = /\b(आहे|आहेत|झाला|झाली|करा|नाही|माझे|माझा|माझी|नमस्कार)\b/.test(lower) && !/\b(है|हैं|था|थी|नमस्ते)\b/.test(lower)
      if (isMarathi) {
        return { detectedLanguage: 'mr-IN', languageName: 'Marathi (मराठी)', confidence: devanagariCount / totalChars, isCodeMixed: false }
      }
      return { detectedLanguage: 'hi-IN', languageName: 'Hindi (हिन्दी)', confidence: devanagariCount / totalChars, isCodeMixed: false }
    }

    // 2. Latin Script: Distinguish standard English from code-mixed Hinglish
    if (latinCount / totalChars > 0.4) {
      const words = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1)

      let hinglishMatchCount = 0
      for (const word of words) {
        if (HINGLISH_KEYWORDS.has(word)) {
          hinglishMatchCount++
        }
      }

      const hinglishRatio = words.length > 0 ? hinglishMatchCount / words.length : 0
      if (hinglishMatchCount >= 2 || (words.length > 0 && hinglishRatio >= 0.15)) {
        return {
          detectedLanguage: 'auto',
          languageName: 'Hinglish (Code-mixed)',
          confidence: Math.min(0.95, 0.6 + hinglishRatio * 0.4),
          isCodeMixed: true,
        }
      }

      return {
        detectedLanguage: 'en-IN',
        languageName: 'Indian English',
        confidence: 0.9,
        isCodeMixed: false,
      }
    }

    // Fallback default
    return {
      detectedLanguage: 'hi-IN',
      languageName: 'Hindi (हिन्दी)',
      confidence: 0.6,
      isCodeMixed: false,
    }
  }

  /**
   * Helper mapping language codes to clean human-readable names.
   */
  public static getLanguageName(code: string): string {
    switch (code) {
      case 'hi-IN':
        return 'Hindi (हिन्दी)'
      case 'en-IN':
        return 'Indian English'
      case 'auto':
        return 'Hinglish (Code-mixed)'
      case 'ta-IN':
        return 'Tamil (தமிழ்)'
      case 'te-IN':
        return 'Telugu (తెలుగు)'
      case 'kn-IN':
        return 'Kannada (ಕನ್ನಡ)'
      case 'mr-IN':
        return 'Marathi (मराठी)'
      case 'bn-IN':
        return 'Bengali (বাংলা)'
      case 'gu-IN':
        return 'Gujarati (ગુજરાતી)'
      case 'ml-IN':
        return 'Malayalam (മലയാളം)'
      case 'pa-IN':
        return 'Punjabi (ਪੰਜਾਬੀ)'
      case 'or-IN':
        return 'Odia (ଓଡ଼ିଆ)'
      default:
        return code
    }
  }

  /**
   * Returns short 2-letter ISO code suitable for translation APIs.
   */
  public static toShortIsoCode(locale: string): string {
    if (!locale || locale === 'auto') return 'auto'
    const parts = locale.split('-')
    return parts[0].toLowerCase()
  }
}

export const languageDetectionService = LanguageDetectionService

