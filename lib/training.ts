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
const CHINESE_SENTENCE_PUNCTUATION = ["。", "！", "？", "；"];
const CHINESE_CLAUSE_PUNCTUATION = ["，", "、"];
const ENGLISH_SENTENCE_PUNCTUATION = [".", "?", "!", ";"];
const ENGLISH_CLAUSE_PUNCTUATION = [","];
const MAX_CHINESE_CHARS = 20;
const MAX_ENGLISH_WORDS = 12;
const HARD_MAX_ENGLISH_WORDS = 18;
const ENGLISH_TRIGGER_PATTERNS = [
  /^I can't\b/i,
  /^I cannot\b/i,
  /^I don't\b/i,
  /^I know\b/i,
  /^You have\b/i,
  /^My mother\b/i,
  /^That can't\b/i,
  /^I'm afraid\b/i,
  /^but\b/i,
  /^and\b/i,
  /^because\b/i,
  /^without\b/i,
];

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
  return /[.!?")]$/.test(text.trim());
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

function splitByPunctuationMarks(text: string, punctuationMarks: string[]) {
  let parts = [normalizeWhitespace(text)];

  for (const punctuation of punctuationMarks) {
    const nextParts: string[] = [];

    for (const part of parts) {
      if (!part) continue;

      const buffer: string[] = [];
      let current = "";

      for (const char of part) {
        current += char;

        if (char === punctuation) {
          buffer.push(current.trim());
          current = "";
        }
      }

      if (current.trim()) {
        buffer.push(current.trim());
      }

      nextParts.push(...buffer);
    }

    parts = nextParts;
  }

  return parts.map((part) => part.trim()).filter(Boolean);
}

function getChineseLength(text: string) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

function getEnglishWordCount(text: string) {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;
}

function splitChineseText(text: string) {
  const sentenceParts = splitByPunctuationMarks(
    text,
    CHINESE_SENTENCE_PUNCTUATION
  );

  return sentenceParts.flatMap((part) =>
    /[，、]/.test(part) && getChineseLength(part) > 6
      ? splitByPunctuationMarks(part, CHINESE_CLAUSE_PUNCTUATION)
      : [part]
  );
}

function splitEnglishIntoWords(text: string) {
  return normalizeWhitespace(text)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function looksLikeEnglishSplitTrigger(text: string) {
  return ENGLISH_TRIGGER_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeEnglishSentenceEnding(text: string) {
  const trimmed = normalizeWhitespace(text);
  if (!trimmed) return "";
  if (/[.?!]$/.test(trimmed)) return trimmed;
  if (/[;,]$/.test(trimmed)) {
    return `${trimmed.slice(0, -1).trim()}.`;
  }
  return `${trimmed}.`;
}

function isConnectorOnlyEnglishPart(text: string) {
  return /^(and|but|because|without)\.?$/i.test(normalizeWhitespace(text));
}

function tidyEnglishPart(text: string) {
  let cleaned = normalizeWhitespace(text);

  cleaned = cleaned.replace(/^(and|but)\.\s+/i, "$1 ");
  cleaned = cleaned.replace(/^and\s+(?=(I|you|we|they|he|she|my|that)\b)/i, "");
  cleaned = cleaned.replace(/^and\s+(?=without\b)/i, "");
  cleaned = cleaned.replace(/^that\s+that can't\b/i, "that can't");
  cleaned = cleaned.replace(/^that\s+(?=that can't\b)/i, "");
  cleaned = cleaned.replace(/\bright now that\b/i, "right now");
  cleaned = cleaned.replace(/^without and\b/i, "without");

  if (/^but\b/i.test(cleaned) || /^without\b/i.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } else if (/^my mother\b/i.test(cleaned)) {
    cleaned = `My mother${cleaned.slice("my mother".length)}`;
  } else if (/^i\b/.test(cleaned)) {
    cleaned = `I${cleaned.slice(1)}`;
  } else if (/^that can't\b/i.test(cleaned)) {
    cleaned = `That can't${cleaned.slice("that can't".length)}`;
  }

  return normalizeEnglishSentenceEnding(cleaned);
}

function splitEnglishByTriggerWords(text: string) {
  const words = splitEnglishIntoWords(text);
  if (words.length === 0) return [];

  const parts: string[] = [];
  let current: string[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const remaining = words.slice(index).join(" ");
    const shouldStartNewPart =
      current.length > 0 && looksLikeEnglishSplitTrigger(remaining);

    if (shouldStartNewPart) {
      parts.push(current.join(" "));
      current = [];
    }

    current.push(words[index]);
  }

  if (current.length > 0) {
    parts.push(current.join(" "));
  }

  return parts.map(normalizeWhitespace).filter(Boolean);
}

function forceSplitLongEnglishPart(
  text: string,
  targetLength?: number
): string[] {
  const words = splitEnglishIntoWords(text);
  if (words.length <= HARD_MAX_ENGLISH_WORDS && !targetLength) {
    return [normalizeWhitespace(text)];
  }

  const maxWordsPerPart = targetLength
    ? Math.min(
        HARD_MAX_ENGLISH_WORDS,
        Math.max(4, Math.ceil(words.length / targetLength))
      )
    : MAX_ENGLISH_WORDS;

  const parts: string[] = [];
  let current: string[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const remaining = words.slice(index).join(" ");
    const shouldSplitOnTrigger =
      current.length >= 4 && looksLikeEnglishSplitTrigger(remaining);

    if (
      current.length > 0 &&
      (shouldSplitOnTrigger || current.length >= maxWordsPerPart)
    ) {
      parts.push(current.join(" "));
      current = [];
    }

    current.push(words[index]);
  }

  if (current.length > 0) {
    parts.push(current.join(" "));
  }

  return parts
    .map(normalizeWhitespace)
    .filter(Boolean)
    .flatMap((part) =>
      getEnglishWordCount(part) > HARD_MAX_ENGLISH_WORDS
        ? forceSplitLongEnglishPart(part)
        : [part]
    );
}

function splitEnglishText(text: string) {
  const sentenceParts = splitByPunctuationMarks(
    text,
    ENGLISH_SENTENCE_PUNCTUATION
  );

  return sentenceParts
    .flatMap((part) =>
      /,/.test(part) && getEnglishWordCount(part) > 4
        ? splitByPunctuationMarks(part, ENGLISH_CLAUSE_PUNCTUATION)
        : [part]
    )
    .flatMap((part) => splitEnglishByTriggerWords(part))
    .flatMap((part) =>
      getEnglishWordCount(part) > MAX_ENGLISH_WORDS
        ? forceSplitLongEnglishPart(part)
        : [part]
    )
    .map(tidyEnglishPart)
    .filter(Boolean);
}

function mergeShortEnglishFragments(parts: string[]) {
  const merged: string[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const trimmed = normalizeWhitespace(parts[index]);
    if (!trimmed) continue;

    if (isConnectorOnlyEnglishPart(trimmed) && parts[index + 1]?.trim()) {
      merged.push(
        normalizeWhitespace(
          `${trimmed.replace(/[.?!;,]+$/, "")} ${parts[index + 1].trim()}`
        )
      );
      index += 1;
      continue;
    }

    const wordCount = getEnglishWordCount(trimmed);
    const looksLikeShortAside =
      wordCount <= 2 &&
      !/^(and|but|because|without)\b/i.test(trimmed) &&
      (/[.!?,;]$/.test(trimmed) || /^[A-Z][a-z]*,$/.test(trimmed));
    const next = parts[index + 1]?.trim();

    if (looksLikeShortAside && next) {
      merged.push(normalizeWhitespace(`${trimmed} ${next}`));
      index += 1;
      continue;
    }

    merged.push(trimmed);
  }

  return merged.map(tidyEnglishPart);
}

function mergeShortChineseFragments(parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean);
}

function balanceSplitParts(parts: string[], targetLength: number) {
  if (parts.length <= targetLength) {
    return parts;
  }

  const groupsNeeded = Math.max(targetLength, 1);
  const grouped: string[] = [];
  let cursor = 0;

  for (let groupIndex = 0; groupIndex < groupsNeeded; groupIndex += 1) {
    const remainingParts = parts.length - cursor;
    const remainingGroups = groupsNeeded - groupIndex;
    const takeCount = Math.ceil(remainingParts / remainingGroups);
    grouped.push(
      normalizeWhitespace(parts.slice(cursor, cursor + takeCount).join(" "))
    );
    cursor += takeCount;
  }

  return grouped.filter(Boolean);
}

function expandEnglishPartsToTarget(parts: string[], targetLength: number) {
  const expanded = [...parts];

  while (expanded.length < targetLength) {
    let splitIndex = -1;
    let longestWordCount = 0;

    for (let index = 0; index < expanded.length; index += 1) {
      const wordCount = getEnglishWordCount(expanded[index]);
      if (wordCount > longestWordCount && wordCount > 4) {
        splitIndex = index;
        longestWordCount = wordCount;
      }
    }

    if (splitIndex === -1) {
      break;
    }

    const splitParts = forceSplitLongEnglishPart(
      expanded[splitIndex],
      Math.min(targetLength - expanded.length + 1, 2)
    );

    if (splitParts.length <= 1) {
      break;
    }

    expanded.splice(splitIndex, 1, ...splitParts.map(tidyEnglishPart));
  }

  return expanded;
}

function cleanEnglishParts(parts: string[]) {
  const cleaned: string[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const current = normalizeWhitespace(parts[index]);
    if (!current) continue;

    if (isConnectorOnlyEnglishPart(current) && parts[index + 1]) {
      cleaned.push(
        tidyEnglishPart(
          `${current.replace(/[.?!;,]+$/, "")} ${normalizeWhitespace(parts[index + 1])}`
        )
      );
      index += 1;
      continue;
    }

    cleaned.push(tidyEnglishPart(current));
  }

  return cleaned.filter(Boolean);
}

function normalizeShortPair(item: TrainingItem) {
  let zhParts = mergeShortChineseFragments(splitChineseText(item.zh));
  let enParts = cleanEnglishParts(
    mergeShortEnglishFragments(splitEnglishText(item.en))
  );

  if (zhParts.length === 0) {
    zhParts = [normalizeWhitespace(item.zh)];
  }

  if (enParts.length === 0) {
    enParts = [tidyEnglishPart(item.en)];
  }

  const zhNeedsSplit =
    zhParts.length > 1 || getChineseLength(item.zh) > MAX_CHINESE_CHARS;
  const enNeedsSplit =
    enParts.length > 1 || getEnglishWordCount(item.en) > MAX_ENGLISH_WORDS;

  if (!zhNeedsSplit && !enNeedsSplit) {
    return [
      {
        ...item,
        zh: normalizeWhitespace(item.zh),
        en: tidyEnglishPart(item.en),
      },
    ];
  }

  if (zhParts.length > enParts.length) {
    enParts = cleanEnglishParts(expandEnglishPartsToTarget(enParts, zhParts.length));
  }

  if (enParts.some((part) => getEnglishWordCount(part) > HARD_MAX_ENGLISH_WORDS)) {
    enParts = cleanEnglishParts(
      enParts.flatMap((part) =>
        getEnglishWordCount(part) > HARD_MAX_ENGLISH_WORDS
          ? forceSplitLongEnglishPart(part).map(tidyEnglishPart)
          : [part]
      )
    );
  }

  if (zhParts.length > enParts.length) {
    enParts = cleanEnglishParts(expandEnglishPartsToTarget(enParts, zhParts.length));
  }

  if (zhParts.length !== enParts.length) {
    if (zhParts.length === 1) {
      enParts = balanceSplitParts(enParts, zhParts.length).map(tidyEnglishPart);
    } else if (enParts.length === 1) {
      zhParts = balanceSplitParts(zhParts, enParts.length);
    } else if (zhParts.length > enParts.length) {
      zhParts = balanceSplitParts(zhParts, enParts.length);
    } else {
      enParts = balanceSplitParts(enParts, zhParts.length).map(tidyEnglishPart);
    }
  }

  enParts = cleanEnglishParts(enParts);

  const total = Math.max(zhParts.length, enParts.length);
  const result: TrainingItem[] = [];

  for (let index = 0; index < total; index += 1) {
    const zh = zhParts[index] || "";
    const en = enParts[index] || "";

    if (!zh && !en) continue;

    result.push({
      zh: normalizeWhitespace(zh),
      en: tidyEnglishPart(en),
      startTime: item.startTime,
      endTime: item.endTime,
    });
  }

  return result.filter(
    (part) =>
      Boolean(part.zh || part.en) &&
      getEnglishWordCount(part.en) <= HARD_MAX_ENGLISH_WORDS
  );
}

export function normalizeToShortTrainingItems(items: TrainingItem[]) {
  return items
    .flatMap((item) =>
      normalizeShortPair({
        zh: typeof item?.zh === "string" ? item.zh.trim() : "",
        en: typeof item?.en === "string" ? item.en.trim() : "",
        startTime:
          typeof item?.startTime === "number" ? item.startTime : undefined,
        endTime: typeof item?.endTime === "number" ? item.endTime : undefined,
      })
    )
    .filter((item) => item.zh || item.en);
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
  return normalizeToShortTrainingItems(
    cleanEnglishSubtitles(rawText).map((line) => ({
      zh: "",
      en: line,
    }))
  );
}

export function serializeTrainingItems(items: TrainingItem[]) {
  const payload: SerializedTrainingContent = {
    version: TRAINING_JSON_VERSION,
    items: normalizeToShortTrainingItems(items),
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

    return normalizeToShortTrainingItems(
      parsed.items.map((item) => ({
        zh: typeof item?.zh === "string" ? item.zh : "",
        en: typeof item?.en === "string" ? item.en : "",
        startTime:
          typeof item?.startTime === "number" ? item.startTime : undefined,
        endTime: typeof item?.endTime === "number" ? item.endTime : undefined,
      }))
    );
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

    return normalizeToShortTrainingItems(result);
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
