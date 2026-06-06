export type ClassicSceneAudioVariantKey =
  | "line"
  | "standard"
  | "idiomatic"
  | "simple"
  | "natural";

export type SentencePatternAudioVariantKey =
  | "target"
  | "recommended"
  | "idiomatic"
  | "simple"
  | "natural";

export const ELEVENLABS_ADAM_VOICE_ID = "pNInz6obpgDQGcFmaJgB";
export const ELEVENLABS_BELLA_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
export const ELEVENLABS_COURSE_AUDIO_SPEED = 0.95;

const PRE_RECORDED_AUDIO_ROOT = "/sounds/pre-recorded";

function padSentenceIndex(sentenceIndex: number) {
  return String(Math.max(0, sentenceIndex) + 1).padStart(3, "0");
}

function cleanPathSegment(value: string | number) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getClassicSceneAudioUrl(
  lessonId: string,
  sentenceIndex: number,
  variantKey: ClassicSceneAudioVariantKey = "line"
) {
  const lessonSegment = cleanPathSegment(lessonId);
  const lineSegment = `line-${padSentenceIndex(sentenceIndex)}`;
  const suffix = variantKey === "line" ? "" : `-${variantKey}`;

  return `${PRE_RECORDED_AUDIO_ROOT}/classic-scenes/adam/${lessonSegment}/${lineSegment}${suffix}.mp3`;
}

export function getSentencePatternAudioUrl(
  levelId: string,
  patternId: number,
  practiceId: number,
  variantKey: SentencePatternAudioVariantKey
) {
  return [
    PRE_RECORDED_AUDIO_ROOT,
    "sentence-patterns",
    "bella",
    cleanPathSegment(levelId),
    `pattern-${cleanPathSegment(patternId)}`,
    `practice-${cleanPathSegment(practiceId)}-${variantKey}.mp3`,
  ].join("/");
}

export function preRecordedAudioUrlToPublicPath(audioUrl: string) {
  return audioUrl.replace(/^\/+/, "");
}
