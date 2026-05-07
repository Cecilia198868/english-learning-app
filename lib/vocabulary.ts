export type VocabularyWord = {
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  exampleZh: string;
  createdAt: string;
  sourceSentence?: string;
  masteredCount: number;
  wrongCount: number;
  correctCount: number;
};

export type VocabularyGroupMastery = Record<string, number>;

export const VOCABULARY_WORDS_KEY = "vocabulary_words";
export const VOCABULARY_GROUP_MASTERY_KEY = "vocabulary_group_mastery";
export const VOCABULARY_GROUP_SIZE = 30;
export const PLACEHOLDER_MEANING = "释义待补充";

const BUILT_IN_DICTIONARY: Record<string, string> = {
  apple: "苹果",
  boat: "船",
  friend: "朋友",
  fish: "鱼",
  fishing: "钓鱼",
  house: "房子",
  room: "房间",
  drugs: "药物",
  advice: "建议",
  right: "正确的",
  mother: "母亲",
  valium: "安眠药",
  hello: "你好",
  deal: "处理",
  figure: "想办法",
  storming: "冲出去",
  without: "没有，不靠",
  because: "因为",
  afraid: "害怕的",
  vodka: "伏特加酒",
  school: "学校",
  work: "工作",
  food: "食物",
  time: "时间",
  travel: "旅行",
  psychic: "有通灵能力的；灵媒的",
};

export const FALLBACK_MEANINGS = [
  "苹果",
  "房子",
  "时间",
  "工作",
  "学校",
  "朋友",
  "食物",
  "旅行",
  "家庭",
  "音乐",
  "电影",
  "天气",
  "衣服",
  "汽车",
  "城市",
  "动物",
  "颜色",
  "身体",
  "电脑",
  "手机",
  "书",
  "水",
  "钱",
  "花",
  "树",
  "道路",
  "商店",
  "医生",
  "老师",
  "学生",
];

export type VocabularyDefinition = {
  meaning: string;
  partOfSpeech: string;
  example: string;
  exampleZh: string;
};

type StoredVocabularyWord = Partial<VocabularyWord> & {
  word?: unknown;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function isVocabularyWord(item: VocabularyWord | null): item is VocabularyWord {
  return item !== null && typeof item.word === "string" && item.word.trim().length > 0;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function normalizeVocabularyWord(rawWord: string) {
  return rawWord
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/gi, "")
    .trim();
}

export function hasUsableMeaning(meaning: unknown) {
  return (
    typeof meaning === "string" &&
    meaning.trim() !== "" &&
    meaning.trim() !== PLACEHOLDER_MEANING
  );
}

export function tokenizeEnglishSentence(sentence: string) {
  const tokens: Array<
    | { type: "word"; value: string; normalized: string }
    | { type: "separator"; value: string }
  > = [];
  const pattern = /[A-Za-z]+(?:'[A-Za-z]+)?/g;
  let lastIndex = 0;

  for (const match of sentence.matchAll(pattern)) {
    const index = match.index ?? 0;
    const word = match[0];

    if (index > lastIndex) {
      tokens.push({
        type: "separator",
        value: sentence.slice(lastIndex, index),
      });
    }

    tokens.push({
      type: "word",
      value: word,
      normalized: normalizeVocabularyWord(word),
    });

    lastIndex = index + word.length;
  }

  if (lastIndex < sentence.length) {
    tokens.push({
      type: "separator",
      value: sentence.slice(lastIndex),
    });
  }

  return tokens;
}

export function getMeaningForWord(word: string) {
  return BUILT_IN_DICTIONARY[normalizeVocabularyWord(word)] || PLACEHOLDER_MEANING;
}

export function normalizeVocabularyDefinition(
  definition?: Partial<VocabularyDefinition> | null
) {
  return {
    meaning: hasUsableMeaning(definition?.meaning)
      ? definition!.meaning!.trim()
      : PLACEHOLDER_MEANING,
    partOfSpeech:
      typeof definition?.partOfSpeech === "string"
        ? definition.partOfSpeech.trim()
        : "",
    example:
      typeof definition?.example === "string" ? definition.example.trim() : "",
    exampleZh:
      typeof definition?.exampleZh === "string"
        ? definition.exampleZh.trim()
        : "",
  } satisfies VocabularyDefinition;
}

function normalizeStoredVocabularyWord(
  item: StoredVocabularyWord | null
): VocabularyWord | null {
  const normalizedWord =
    typeof item?.word === "string" ? normalizeVocabularyWord(item.word) : "";

  if (!normalizedWord) return null;

  const normalizedDefinition = normalizeVocabularyDefinition(item);

  return {
    word: normalizedWord,
    meaning: hasUsableMeaning(normalizedDefinition.meaning)
      ? normalizedDefinition.meaning
      : getMeaningForWord(normalizedWord),
    partOfSpeech: normalizedDefinition.partOfSpeech,
    example: normalizedDefinition.example,
    exampleZh: normalizedDefinition.exampleZh,
    createdAt:
      typeof item?.createdAt === "string" && item.createdAt.trim()
        ? item.createdAt
        : new Date().toISOString(),
    sourceSentence:
      typeof item?.sourceSentence === "string" && item.sourceSentence.trim()
        ? item.sourceSentence.trim()
        : undefined,
    masteredCount:
      typeof item?.masteredCount === "number" ? item.masteredCount : 0,
    wrongCount: typeof item?.wrongCount === "number" ? item.wrongCount : 0,
    correctCount:
      typeof item?.correctCount === "number" ? item.correctCount : 0,
  } satisfies VocabularyWord;
}

export function loadVocabularyWords(): VocabularyWord[] {
  if (!canUseStorage()) return [] as VocabularyWord[];

  const parsed = safeJsonParse<StoredVocabularyWord[]>(
    localStorage.getItem(VOCABULARY_WORDS_KEY),
    []
  );

  return parsed
    .map((item) => normalizeStoredVocabularyWord(item))
    .filter(isVocabularyWord)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export function saveVocabularyWords(words: VocabularyWord[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(VOCABULARY_WORDS_KEY, JSON.stringify(words));
}

export function addVocabularyWord(word: string, sourceSentence?: string) {
  const normalizedWord = normalizeVocabularyWord(word);
  if (!normalizedWord) {
    return {
      ok: false as const,
      reason: "INVALID_WORD" as const,
      message: "请输入单词",
    };
  }

  const currentWords = loadVocabularyWords();
  const exists = currentWords.some((item) => item.word === normalizedWord);

  if (exists) {
    return {
      ok: false as const,
      reason: "DUPLICATE" as const,
      message: "这个单词已经在单词本里了",
    };
  }

  const nextWord: VocabularyWord = {
    word: normalizedWord,
    meaning: getMeaningForWord(normalizedWord),
    partOfSpeech: "",
    example: "",
    exampleZh: "",
    createdAt: new Date().toISOString(),
    sourceSentence: sourceSentence?.trim() || undefined,
    masteredCount: 0,
    wrongCount: 0,
    correctCount: 0,
  };

  saveVocabularyWords([...currentWords, nextWord]);

  return {
    ok: true as const,
    word: nextWord,
    message: `已加入单词本：${normalizedWord}`,
  };
}

export function updateVocabularyWord(
  word: string,
  updates: Partial<Omit<VocabularyWord, "word" | "createdAt">>
) {
  const normalizedWord = normalizeVocabularyWord(word);
  const currentWords = loadVocabularyWords();
  let didUpdate = false;

  const nextWords = currentWords.map((item) => {
    if (item.word !== normalizedWord) return item;
    didUpdate = true;

    return {
      ...item,
      ...updates,
      word: item.word,
      createdAt: item.createdAt,
    };
  });

  if (!didUpdate) return null;

  saveVocabularyWords(nextWords);
  return nextWords.find((item) => item.word === normalizedWord) || null;
}

export function recordVocabularyAnswer(word: string, isCorrect: boolean) {
  const normalizedWord = normalizeVocabularyWord(word);
  const currentWords = loadVocabularyWords();

  const nextWords = currentWords.map((item) => {
    if (item.word !== normalizedWord) return item;

    if (isCorrect) {
      return {
        ...item,
        correctCount: item.correctCount + 1,
      };
    }

    return {
      ...item,
      wrongCount: item.wrongCount + 1,
    };
  });

  saveVocabularyWords(nextWords);
  return nextWords;
}

export function recordWrongBookReview(word: string, isCorrect: boolean) {
  const normalizedWord = normalizeVocabularyWord(word);
  const currentWords = loadVocabularyWords();

  const nextWords = currentWords.map((item) => {
    if (item.word !== normalizedWord) return item;

    if (isCorrect) {
      return {
        ...item,
        correctCount: item.correctCount + 1,
        wrongCount: Math.max(0, item.wrongCount - 1),
      };
    }

    return {
      ...item,
      wrongCount: item.wrongCount + 1,
    };
  });

  saveVocabularyWords(nextWords);
  return nextWords;
}

export function loadVocabularyGroupMastery() {
  if (!canUseStorage()) return {} as VocabularyGroupMastery;
  return safeJsonParse<VocabularyGroupMastery>(
    localStorage.getItem(VOCABULARY_GROUP_MASTERY_KEY),
    {}
  );
}

export function saveVocabularyGroupMastery(mastery: VocabularyGroupMastery) {
  if (!canUseStorage()) return;
  localStorage.setItem(VOCABULARY_GROUP_MASTERY_KEY, JSON.stringify(mastery));
}

export function incrementVocabularyGroupMastery(groupIndex: number) {
  const current = loadVocabularyGroupMastery();
  const key = `group-${groupIndex}`;
  const next = {
    ...current,
    [key]: (current[key] || 0) + 1,
  };
  saveVocabularyGroupMastery(next);
  return next;
}

export function incrementVocabularyWordsMasteredCount(words: VocabularyWord[]) {
  const currentWords = loadVocabularyWords();
  const targetWords = new Set(words.map((item) => item.word));

  const nextWords = currentWords.map((item) =>
    targetWords.has(item.word)
      ? {
          ...item,
          masteredCount: item.masteredCount + 1,
        }
      : item
  );

  saveVocabularyWords(nextWords);
  return nextWords;
}

export function groupVocabularyWords(words: VocabularyWord[]) {
  const groups: VocabularyWord[][] = [];

  for (let index = 0; index < words.length; index += VOCABULARY_GROUP_SIZE) {
    groups.push(words.slice(index, index + VOCABULARY_GROUP_SIZE));
  }

  return groups;
}

export async function generateVocabularyDefinition(word: string) {
  const response = await fetch("/api/vocabulary/define", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ word }),
  });

  const text = await response.text();
  const parsed = safeJsonParse<
    Partial<VocabularyDefinition> & { error?: string; message?: string }
  >(text, {});

  if (!response.ok) {
    throw new Error(parsed.error || parsed.message || text || "释义生成失败");
  }

  return normalizeVocabularyDefinition(parsed);
}
