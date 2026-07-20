export interface Language {
  code: string;
  label: string;
  native: string;
  prompt: string;
  speech?: string;
}

export const LANGUAGES: Language[] = [
  { code: "hi", label: "Hindi", native: "हिन्दी", prompt: "अपनी समस्या हिंदी में बताएं", speech: "hi-IN" },
  { code: "mr", label: "Marathi", native: "मराठी", prompt: "तुमची समस्या मराठीत सांगा", speech: "mr-IN" },
  { code: "en", label: "English", native: "English", prompt: "Describe your symptom in English", speech: "en-IN" },
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
