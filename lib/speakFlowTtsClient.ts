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

let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl = "";

function normalizeRate(rate: number) {
  return Math.min(Math.max(rate, 0.5), 1.15);
}

export function stopSpeakFlowTts() {
  if (typeof window === "undefined") return;

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

  try {
    const response = await fetch("/api/text-to-speech", {
      body: JSON.stringify({
        rate: normalizedRate,
        text: normalizedText,
        voice: selectedVoiceId,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Text to speech request failed");
    }

    const audioBlob = await response.blob();
    currentAudioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(currentAudioUrl);
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
    speakWithBrowserFallback({
      fallbackVoice,
      rate: normalizedRate,
      text: normalizedText,
      voiceId: selectedVoiceId,
    });
  }
}
