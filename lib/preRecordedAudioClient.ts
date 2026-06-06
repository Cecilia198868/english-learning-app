let activePreRecordedAudio: HTMLAudioElement | null = null;

type PlayPreRecordedAudioOptions = {
  fallback?: () => void;
  onEnd?: () => void;
  playbackRate?: number;
  url?: string | null;
};

function normalizePlaybackRate(rate: number | undefined) {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return 1;
  return Math.min(Math.max(rate, 0.35), 1.5);
}

export function stopPreRecordedAudio() {
  if (!activePreRecordedAudio) return;

  activePreRecordedAudio.pause();
  activePreRecordedAudio.removeAttribute("src");
  activePreRecordedAudio.load();
  activePreRecordedAudio = null;
}

export function playPreRecordedAudio({
  fallback,
  onEnd,
  playbackRate,
  url,
}: PlayPreRecordedAudioOptions) {
  if (typeof window === "undefined" || !url) {
    fallback?.();
    return;
  }

  stopPreRecordedAudio();

  const audio = new Audio(url);
  activePreRecordedAudio = audio;
  audio.preload = "auto";
  audio.playbackRate = normalizePlaybackRate(playbackRate);

  audio.onended = () => {
    if (activePreRecordedAudio === audio) {
      activePreRecordedAudio = null;
    }
    onEnd?.();
  };

  audio.onerror = () => {
    if (activePreRecordedAudio === audio) {
      activePreRecordedAudio = null;
    }
    fallback?.();
  };

  void audio.play().catch(() => {
    if (activePreRecordedAudio === audio) {
      activePreRecordedAudio = null;
    }
    fallback?.();
  });
}
