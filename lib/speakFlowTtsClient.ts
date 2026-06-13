import {
  SPEAKFLOW_DEFAULT_VOICE_ID,
  getSavedSpeakFlowVoiceId,
  pickBrowserVoiceForSpeakFlowVoice,
  type SpeakFlowVoiceId,
} from "@/lib/voiceSettings";

type PlaySpeakFlowTtsOptions = {
  fallbackVoice?: SpeechSynthesisVoice | null;
  rate?: number;
  text: string;
  voiceId?: SpeakFlowVoiceId;
};

const MAX_TTS_CACHE_ENTRIES = 32;
const QUICK_FALLBACK_DELAY_MS = 1400;
const GENERATED_TTS_SOURCE_RATE = 1;

let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl = "";
let playbackRequestId = 0;
const ttsBlobCache = new Map<string, Promise<Blob>>();

function normalizeRate(rate: number) {
  return Math.min(Math.max(rate, 0.5), 1.15);
}

function createTtsCacheKey(text: string, voiceId: SpeakFlowVoiceId) {
  return `${voiceId}\u0001${GENERATED_TTS_SOURCE_RATE.toFixed(2)}\u0001${text}`;
}

function rememberTtsBlob(key: string, request: Promise<Blob>) {
  if (!ttsBlobCache.has(key) && ttsBlobCache.size >= MAX_TTS_CACHE_ENTRIES) {
    const firstKey = ttsBlobCache.keys().next().value;
    if (firstKey) {
      ttsBlobCache.delete(firstKey);
    }
  }

  ttsBlobCache.set(key, request);
}

function getSpeakFlowTtsBlob(text: string, voiceId: SpeakFlowVoiceId) {
  const cacheKey = createTtsCacheKey(text, voiceId);
  const cachedRequest = ttsBlobCache.get(cacheKey);
  if (cachedRequest) return cachedRequest;

  const request = fetch("/api/text-to-speech", {
    body: JSON.stringify({
      rate: GENERATED_TTS_SOURCE_RATE,
      text,
      voice: voiceId,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Text to speech request failed");
      }

      return response.blob();
    })
    .catch((error) => {
      ttsBlobCache.delete(cacheKey);
      throw error;
    });

  rememberTtsBlob(cacheKey, request);
  return request;
}

export function stopSpeakFlowTts() {
  if (typeof window === "undefined") return;

  playbackRequestId += 1;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }

  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = "";
  }

  window.speechSynthesis?.cancel();
}

export function preloadSpeakFlowTts({ text, voiceId }: PlaySpeakFlowTtsOptions) {
  const normalizedText = text.trim();
  if (!normalizedText || typeof window === "undefined") return;

  const selectedVoiceId = voiceId || getSavedSpeakFlowVoiceId();

  void getSpeakFlowTtsBlob(normalizedText, selectedVoiceId).catch(
    () => undefined
  );
}

export function speakWithBrowserFallback({
  fallbackVoice = null,
  rate = 1,
  text,
  voiceId = SPEAKFLOW_DEFAULT_VOICE_ID,
}: PlaySpeakFlowTtsOptions) {
  const normalizedText = text.trim();
  if (
    !normalizedText ||
    typeof window === "undefined" ||
    !window.speechSynthesis
  ) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(normalizedText);
  utterance.lang = "en-US";
  utterance.pitch = 1;
  utterance.rate = normalizeRate(rate);
  utterance.volume = 1;
  utterance.voice =
    fallbackVoice ||
    pickBrowserVoiceForSpeakFlowVoice(
      window.speechSynthesis.getVoices(),
      voiceId
    );

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export async function playSpeakFlowTts({
  fallbackVoice = null,
  rate = 1,
  text,
  voiceId,
}: PlaySpeakFlowTtsOptions) {
  const normalizedText = text.trim();
  if (!normalizedText || typeof window === "undefined") return;

  const selectedVoiceId = voiceId || getSavedSpeakFlowVoiceId();
  const normalizedRate = normalizeRate(rate);

  stopSpeakFlowTts();
  const requestId = playbackRequestId;
  let fallbackStarted = false;
  const fallbackTimer = window.setTimeout(() => {
    if (playbackRequestId !== requestId) return;

    fallbackStarted = true;
    speakWithBrowserFallback({
      fallbackVoice,
      rate: normalizedRate,
      text: normalizedText,
      voiceId: selectedVoiceId,
    });
  }, QUICK_FALLBACK_DELAY_MS);

  try {
    const audioBlob = await getSpeakFlowTtsBlob(normalizedText, selectedVoiceId);

    window.clearTimeout(fallbackTimer);
    if (playbackRequestId !== requestId || fallbackStarted) return;

    currentAudioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(currentAudioUrl);
    currentAudio.preload = "auto";
    currentAudio.playbackRate = normalizedRate;
    currentAudio.addEventListener(
      "ended",
      () => {
        if (currentAudioUrl) {
          URL.revokeObjectURL(currentAudioUrl);
          currentAudioUrl = "";
        }
        currentAudio = null;
      },
      { once: true }
    );

    await currentAudio.play();
  } catch {
    window.clearTimeout(fallbackTimer);
    if (!fallbackStarted && playbackRequestId === requestId) {
      speakWithBrowserFallback({
        fallbackVoice,
        rate: normalizedRate,
        text: normalizedText,
        voiceId: selectedVoiceId,
      });
    }
  }
}
