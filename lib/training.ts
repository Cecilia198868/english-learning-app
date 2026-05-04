export type TrainingItem = {
  zh: string;
  en: string;
  startTime?: number;
  endTime?: number;
};

export type SentencePair = {
  chinese: string;
  english: string;
  startTime?: number;
  endTime?: number;
};

const TRAINING_JSON_VERSION = 1;

type SerializedTrainingContent = {
  version: number;
  items: TrainingItem[];
};

function stripHtmlTags(text: string) {
  return text.replace(/<[^>]*>/g, " ");
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function cleanSubtitleLine(line: string) {
  return normalizeWhitespace(stripHtmlTags(line));
}

function isSequenceLine(line: string) {
  return /^\d+$/.test(line.trim());
}

function isTimelineLine(line: string) {
  return line.includes("-->");
}

function looksCompleteSentence(text: string) {
  return /[.!?…"”'")]$/.test(text.trim());
}

function shouldMergeWithNext(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (looksCompleteSentence(trimmed)) return false;
  return trimmed.split(/\s+/).length <= 6;
}

function mergeShortLines(lines: string[]) {
  const merged: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    let current = lines[i];

    while (i < lines.length - 1 && shouldMergeWithNext(current)) {
      current = normalizeWhitespace(`${current} ${lines[i + 1]}`);
      i += 1;
      if (looksCompleteSentence(current)) {
        break;
      }
    }

    if (current) {
      merged.push(current);
    }
  }

  return merged;
}

function parseSrtLines(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isSequenceLine(line) && !isTimelineLine(line))
    .map(cleanSubtitleLine)
    .filter(Boolean);
}

function parseTxtLines(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map(cleanSubtitleLine)
    .filter(Boolean);
}

export function cleanEnglishSubtitles(rawText: string) {
  const normalized = rawText.trim();
  if (!normalized) {
    return [];
  }

  const rawLines = normalized.includes("-->")
    ? parseSrtLines(normalized)
    : parseTxtLines(normalized);

  return mergeShortLines(rawLines);
}

export function generateTrainingFromEnglishSubtitles(rawText: string) {
  return cleanEnglishSubtitles(rawText).map((line) => ({
    zh: "",
    en: line,
  }));
}

export function serializeTrainingItems(items: TrainingItem[]) {
  const payload: SerializedTrainingContent = {
    version: TRAINING_JSON_VERSION,
    items,
  };

  return JSON.stringify(payload, null, 2);
}

export function deserializeTrainingItems(content: string): TrainingItem[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as SerializedTrainingContent;
    if (!Array.isArray(parsed.items)) {
      throw new Error("Invalid training items.");
    }

    return parsed.items
      .map((item) => ({
        zh: typeof item?.zh === "string" ? item.zh : "",
        en: typeof item?.en === "string" ? item.en : "",
        startTime:
          typeof item?.startTime === "number" ? item.startTime : undefined,
        endTime: typeof item?.endTime === "number" ? item.endTime : undefined,
      }))
      .filter((item) => item.zh || item.en);
  } catch {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "");

    const result: TrainingItem[] = [];

    for (let i = 0; i < lines.length; i += 2) {
      const first = lines[i] || "";
      const second = lines[i + 1] || "";
      const firstHasChinese = /[\u4e00-\u9fff]/.test(first);
      const secondHasChinese = /[\u4e00-\u9fff]/.test(second);

      result.push({
        zh: firstHasChinese || !secondHasChinese ? first : second,
        en: firstHasChinese || !secondHasChinese ? second : first,
        startTime: undefined,
        endTime: undefined,
      });
    }

    return result.filter((item) => item.zh || item.en);
  }
}

export function parseTrainingContent(content: string): SentencePair[] {
  return deserializeTrainingItems(content).map((item) => ({
    chinese: item.zh,
    english: item.en,
    startTime: item.startTime,
    endTime: item.endTime,
  }));
}
