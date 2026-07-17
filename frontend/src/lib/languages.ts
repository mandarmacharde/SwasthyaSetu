export interface Language {
  code: string;
  label: string;
  native: string;
  prompt: string;
  speech?: string;
}

export const LANGUAGES: Language[] = [
  { code: "hi", label: "Hindi", native: "हिन्दी", prompt: "मेरे बच्चे को बुखार है", speech: "hi-IN" },
  { code: "bn", label: "Bengali", native: "বাংলা", prompt: "আমার বাচ্চার জ্বর হয়েছে", speech: "bn-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", prompt: "నా పిల్లలకు జ్వరం వచ్చింది", speech: "te-IN" },
  { code: "mr", label: "Marathi", native: "मराठी", prompt: "माझ्या मुलाला ताप आहे", speech: "mr-IN" },
  { code: "ta", label: "Tamil", native: "தமிழ்", prompt: "என் குழந்தைக்கு காய்ச்சல்", speech: "ta-IN" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", prompt: "મારા બાળકને તાવ છે", speech: "gu-IN" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", prompt: "ನನ್ನ ಮಗುವಿಗೆ ಜ್ವರ ಬಂದಿದೆ", speech: "kn-IN" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", prompt: "എന്റെ കുട്ടിക്ക് പനിയുണ്ട്", speech: "ml-IN" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", prompt: "ਮੇਰੇ ਬੱਚੇ ਨੂੰ ਬੁਖਾਰ ਹੈ", speech: "pa-IN" },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ", prompt: "ମୋ ପିଲାର ଜ୍ୱର ଅଛି", speech: "or-IN" },
  { code: "ur", label: "Urdu", native: "اردو", prompt: "میرے بچے کو بخار ہے", speech: "ur-IN" },
  { code: "as", label: "Assamese", native: "অসমীয়া", prompt: "মোৰ শিশুৰ জ্বৰ আছে" },
  { code: "mai", label: "Maithili", native: "मैथिली", prompt: "हमर बच्चा के बुखार अछि" },
  { code: "sat", label: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", prompt: "ᱤᱧ ᱜᱤᱫᱽᱨᱟᱹ ᱨᱮᱭᱟᱜ ᱞᱩᱛᱩᱨ" },
  { code: "ks", label: "Kashmiri", native: "कॉशुर", prompt: "म्योन बचन बुखार" },
  { code: "ne", label: "Nepali", native: "नेपाली", prompt: "मेरो बच्चालाई ज्वरो आयो" },
  { code: "sd", label: "Sindhi", native: "سنڌي", prompt: "منهنجي ٻار کي بخار آهي" },
  { code: "kok", label: "Konkani", native: "कोंकणी", prompt: "म्हज्या भुरग्याक ताप आसा" },
  { code: "doi", label: "Dogri", native: "डोगरी", prompt: "मेरे बच्चे नू बुखार ऐ" },
  { code: "mni", label: "Manipuri", native: "মৈতৈলোন্", prompt: "ঐমা নুংঙৈদা লৈ" },
  { code: "brx", label: "Bodo", native: "बर'", prompt: "आंनि गोदोनो जोर दं" },
  { code: "sa", label: "Sanskrit", native: "संस्कृतम्", prompt: "मम बालकस्य ज्वरः अस्ति" },
  { code: "en", label: "English", native: "English", prompt: "My child has a fever", speech: "en-IN" },
];

export const LANGUAGE_PROMPTS: Record<string, string> =
  Object.fromEntries(LANGUAGES.map(l => [
    l.code,
    `Describe your symptom in ${l.label}... (e.g. ${l.prompt})`
  ]));

export const speechLangMap: Record<string, string> =
  Object.fromEntries(
    LANGUAGES.filter(l => l.speech).map(l => [l.code, l.speech!])
  );
