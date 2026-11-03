import type { SupportedLanguage, StandardVoice } from '../types'

export const APP_NAME = 'VAANI'
export const APP_TAGLINE = 'Your Voice. Your Words. Every Language.'

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    code: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    category: 'primary',
    scriptExample: 'नमस्ते, कल सुबह 10 बजे मीटिंग है।'
  },
  {
    code: 'en-IN',
    name: 'Indian English',
    nativeName: 'English (India)',
    category: 'primary',
    scriptExample: 'Hello, please review the quarterly presentation before lunch.'
  },
  {
    code: 'auto',
    name: 'Hinglish (Code-mixed)',
    nativeName: 'Hinglish',
    category: 'primary',
    scriptExample: 'Namaste, kal subah 10 baje meeting hai. Kripya ₹2,500 ka invoice saath layein.'
  },
  {
    code: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    category: 'regional',
    scriptExample: 'வணக்கம், உங்கள் திட்ட அறிக்கை வெற்றிகரமாக பதிவு செய்யப்பட்டுள்ளது.'
  },
  {
    code: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    category: 'regional',
    scriptExample: 'నమస్కారం, మీ కొత్త వాయిస్ ప్రొఫైల్ విజయవంతంగా సిద్ధమైంది.'
  },
  {
    code: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    category: 'regional',
    scriptExample: 'ನಮಸ್ಕಾರ, ನಿಮ್ಮ ದನಿ ನಮ್ಮ ಸಿಸ್ಟಮ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ದಾಖಲಾಗಿದೆ.'
  },
  {
    code: 'ml-IN',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    category: 'regional',
    scriptExample: 'നമസ്കാരം, നിങ്ങളുടെ സന്ദേശം ഞങ്ങൾ കേട്ടു.'
  },
  {
    code: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    category: 'regional',
    scriptExample: 'नमस्कार, आपल्या नवीन आवाजाचे स्वागत आहे.'
  },
  {
    code: 'bn-IN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    category: 'regional',
    scriptExample: 'নমস্কার, আপনার নতুন ভয়েস প্রোফাইল প্রস্তুত।'
  },
  {
    code: 'gu-IN',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    category: 'regional',
    scriptExample: 'નમસ્તે, તમારા નવા ઓડિયોનું સ્વાગત છે.'
  },
  {
    code: 'pa-IN',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    category: 'regional',
    scriptExample: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ, ਤੁਹਾਡੀ ਆਵਾਜ਼ ਵਿੱਚ ਨਵਾਂ ਸੁਨੇਹਾ ਤਿਆਰ ਹੈ।'
  }
]

export const STANDARD_VOICES: StandardVoice[] = [
  {
    id: 'Nalini',
    name: 'Nalini',
    gender: 'Female',
    primaryLanguage: 'hi-IN',
    styleDescription: 'Warm, clear narrative tone for announcements and guides'
  },
  {
    id: 'Pranav',
    name: 'Pranav',
    gender: 'Male',
    primaryLanguage: 'en-IN',
    styleDescription: 'Professional, confident corporate voice'
  },
  {
    id: 'Poorvi',
    name: 'Poorvi',
    gender: 'Female',
    primaryLanguage: 'auto',
    styleDescription: 'Conversational Hinglish speaker optimized for bilingual inflection'
  },
  {
    id: 'Deepak',
    name: 'Deepak',
    gender: 'Male',
    primaryLanguage: 'hi-IN',
    styleDescription: 'Deep, authoritative broadcast tone'
  },
  {
    id: 'Kaveri',
    name: 'Kaveri',
    gender: 'Female',
    primaryLanguage: 'en-IN',
    styleDescription: 'Articulate educational and instructional presenter'
  }
]

export const VOICE_CONSENT_STATEMENT = `I solemnly confirm that I am the sole owner of this voice and am enrolling it voluntarily, or that I possess documented, explicit written authorization to register this speaker identity. I understand this recording will be transformed into a numerical speaker embedding solely for synthesizing scripts authorized by my account. In compliance with data protection policies, I retain the perpetual right to revoke consent and permanently purge my voice profile at any time.`

export const DEMO_SCRIPTS = [
  {
    title: 'Hinglish Meeting & Invoice Reminder',
    lang: 'auto',
    text: 'Namaste, kal subah 10 baje project review meeting hai. Kripya ₹2,500 ka invoice aur presentation saath lekar aayein.'
  },
  {
    title: 'Hindi Customer Welcome',
    lang: 'hi-IN',
    text: 'वाणी स्टूडियो में आपका स्वागत है। अब आप एक बार अपनी आवाज़ रिकॉर्ड करके किसी भी भारतीय भाषा में बोल सकते हैं।'
  },
  {
    title: 'English Accessibility Audio',
    lang: 'en-IN',
    text: 'Welcome to VAANI. This audio was generated using your personalized voice profile powered by Gnani AI Timbre.'
  }
]
