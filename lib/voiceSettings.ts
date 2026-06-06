export type SpeakFlowVoiceId = "alloy" | "nova" | "shimmer" | "onyx";

export type SpeakFlowVoiceOption = {
  description: string;
  gender: string;
  id: SpeakFlowVoiceId;
  name: string;
  tone: string;
};

export const SPEAKFLOW_DEFAULT_VOICE_ID: SpeakFlowVoiceId = "nova";
export const SPEAKFLOW_VOICE_STORAGE_KEY = "speakflow-selected-voice";
export const LEGACY_SPEAKFLOW_VOICE_STORAGE_KEY = "speakflow-selected-voice-uri";

export const SPEAKFLOW_VOICES: SpeakFlowVoiceOption[] = [
  {
    description: "最适合教学软件",
    gender: "中性",
    id: "alloy",
    name: "Alloy",
    tone: "清晰",
  },
  {
    description: "很适合您的 SpeakFlow",
    gender: "年轻女性",
    id: "nova",
    name: "Nova",
    tone: "温柔自然",
  },
  {
    description: "听起来像英语老师",
    gender: "女声",
    id: "shimmer",
    name: "Shimmer",
    tone: "非常柔和",
  },
  {
    description: "稳重",
    gender: "男声",
    id: "onyx",
    name: "Onyx",
    tone: "稳重",
  },
];

const fallbackBrowserVoiceHints: Record<SpeakFlowVoiceId, RegExp[]> = {
  alloy: [/samantha/i, /ava/i, /aria/i, /jenny/i, /google us english/i],
  nova: [/samantha/i, /ava/i, /jenny/i, /aria/i, /google us english/i],
  shimmer: [/samantha/i, /victoria/i, /serena/i, /ava/i, /aria/i],
  onyx: [/daniel/i, /alex/i, /david/i, /guy/i, /mark/i],
};

const distortedBrowserVoicePattern =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|organ|princess|superstar|trinoids|whisper|zarvox/i;

export function isSpeakFlowVoiceId(value: unknown): value is SpeakFlowVoiceId {
  return (
    value === "alloy" ||
    value === "nova" ||
    value === "shimmer" ||
    value === "onyx"
  );
}

export function getSpeakFlowVoiceById(id: SpeakFlowVoiceId) {
  return (
    SPEAKFLOW_VOICES.find((voice) => voice.id === id) ||
    SPEAKFLOW_VOICES.find((voice) => voice.id === SPEAKFLOW_DEFAULT_VOICE_ID) ||
    SPEAKFLOW_VOICES[0]
  );
}

export function getSavedSpeakFlowVoiceId(): SpeakFlowVoiceId {
  if (typeof window === "undefined") return SPEAKFLOW_DEFAULT_VOICE_ID;

  const saved = window.localStorage.getItem(SPEAKFLOW_VOICE_STORAGE_KEY);
  return isSpeakFlowVoiceId(saved) ? saved : SPEAKFLOW_DEFAULT_VOICE_ID;
}

export function saveSpeakFlowVoiceId(voiceId: SpeakFlowVoiceId) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(SPEAKFLOW_VOICE_STORAGE_KEY, voiceId);
  window.localStorage.removeItem(LEGACY_SPEAKFLOW_VOICE_STORAGE_KEY);
}

export function isUsableEnglishBrowserVoice(voice: SpeechSynthesisVoice) {
  return (
    voice.lang.toLowerCase().startsWith("en") &&
    !distortedBrowserVoicePattern.test(voice.name)
  );
}

export function pickBrowserVoiceForSpeakFlowVoice(
  voices: SpeechSynthesisVoice[],
  voiceId: SpeakFlowVoiceId = SPEAKFLOW_DEFAULT_VOICE_ID
) {
  const englishVoices = voices.filter(isUsableEnglishBrowserVoice);
  const candidates = englishVoices.length ? englishVoices : voices;
  const hints = fallbackBrowserVoiceHints[voiceId];

  return (
    hints
      .map((pattern) =>
        candidates.find((voice) => pattern.test(`${voice.name} ${voice.lang}`))
      )
      .find((voice): voice is SpeechSynthesisVoice => Boolean(voice)) ||
    candidates.find((voice) => /en-US/i.test(`${voice.name} ${voice.lang}`)) ||
    candidates.find((voice) => voice.localService) ||
    candidates[0] ||
    null
  );
}
