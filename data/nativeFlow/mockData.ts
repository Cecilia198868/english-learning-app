export type NativeFlowLevelId = "everyday" | "natural" | "native";

export type NativeFlowTone = "green" | "blue" | "purple";

export type NativeFlowSentence = {
  chinese: string;
  day: number;
  daySentence: number;
  english: string;
  id: number;
};

export type NativeFlowLevel = {
  badge: string;
  description: string;
  englishTitle: string;
  id: NativeFlowLevelId;
  title: string;
  tone: NativeFlowTone;
  totalDays: number;
  totalSentences: number;
  dailySentences: number;
};

export type NativeFlowProgressRow = {
  completed: number;
  levelId: NativeFlowLevelId;
  percent: number;
};

export const NATIVE_FLOW_TOTAL_DAYS = 30;
export const NATIVE_FLOW_DAILY_SENTENCES = 20;
export const NATIVE_FLOW_TOTAL_SENTENCES =
  NATIVE_FLOW_TOTAL_DAYS * NATIVE_FLOW_DAILY_SENTENCES;

const mockEnglishSentences = [
  "When things get tough, keep reminding yourself why you started.",
  "I am learning to let my words move with a calmer rhythm.",
  "A clear sentence can sound natural when the stress falls in the right place.",
  "I want to speak with more confidence, even when the sentence is long.",
  "Every small practice makes my English flow a little more smoothly.",
  "The more I listen, the easier it becomes to copy the rhythm.",
  "I can slow down, connect my words, and still sound natural.",
  "Good pronunciation starts with hearing the music of the sentence.",
  "I am training my mouth to follow the rhythm I hear.",
  "Native flow comes from steady practice, not from rushing.",
];

const mockChineseSentences = [
  "当事情变得艰难时，不断提醒自己为什么开始。",
  "我正在学习让自己的表达带着更平稳的节奏。",
  "重音放对了，清楚的句子也会听起来自然。",
  "即使句子很长，我也想更自信地表达。",
  "每一次小练习，都会让我的英语更顺畅一点。",
  "听得越多，就越容易模仿句子的节奏。",
  "我可以慢下来，把词连起来，同时保持自然。",
  "好的发音从听见句子的音乐感开始。",
  "我正在训练自己的嘴巴跟上听到的节奏。",
  "地道语流来自稳定练习，而不是急着说完。",
];

function createMockSentences(levelId: NativeFlowLevelId): NativeFlowSentence[] {
  return Array.from({ length: NATIVE_FLOW_TOTAL_SENTENCES }, (_, index) => {
    const sentenceIndex = index % mockEnglishSentences.length;
    const day = Math.floor(index / NATIVE_FLOW_DAILY_SENTENCES) + 1;
    const daySentence = (index % NATIVE_FLOW_DAILY_SENTENCES) + 1;

    return {
      chinese: mockChineseSentences[sentenceIndex],
      day,
      daySentence,
      english: mockEnglishSentences[sentenceIndex],
      id: index + 1,
    };
  }).map((sentence) => ({
    ...sentence,
    english:
      levelId === "natural"
        ? sentence.english.replace("I am", "I'm")
        : levelId === "native"
          ? sentence.english.replace("I am", "I'm").replace("going to", "gonna")
          : sentence.english,
  }));
}

export const nativeFlowLevels: NativeFlowLevel[] = [
  {
    badge: "初级",
    dailySentences: NATIVE_FLOW_DAILY_SENTENCES,
    description: "从生活短句开始，建立语感基础",
    englishTitle: "Everyday Flow",
    id: "everyday",
    title: "日常语感",
    tone: "green",
    totalDays: NATIVE_FLOW_TOTAL_DAYS,
    totalSentences: NATIVE_FLOW_TOTAL_SENTENCES,
  },
  {
    badge: "中级",
    dailySentences: NATIVE_FLOW_DAILY_SENTENCES,
    description: "更长句子，更自然的日常表达",
    englishTitle: "Natural Flow",
    id: "natural",
    title: "自然表达",
    tone: "blue",
    totalDays: NATIVE_FLOW_TOTAL_DAYS,
    totalSentences: NATIVE_FLOW_TOTAL_SENTENCES,
  },
  {
    badge: "高级",
    dailySentences: NATIVE_FLOW_DAILY_SENTENCES,
    description: "长句连读，高阶地道表达",
    englishTitle: "Native Flow",
    id: "native",
    title: "地道语流",
    tone: "purple",
    totalDays: NATIVE_FLOW_TOTAL_DAYS,
    totalSentences: NATIVE_FLOW_TOTAL_SENTENCES,
  },
];

export const nativeFlowLevelIds = nativeFlowLevels.map((level) => level.id);

const nativeFlowSentencesByLevel: Record<NativeFlowLevelId, NativeFlowSentence[]> = {
  everyday: createMockSentences("everyday"),
  natural: createMockSentences("natural"),
  native: createMockSentences("native"),
};

export const nativeFlowProgressRows: NativeFlowProgressRow[] = [
  {
    completed: 480,
    levelId: "everyday",
    percent: 80,
  },
  {
    completed: 250,
    levelId: "natural",
    percent: 42,
  },
  {
    completed: 60,
    levelId: "native",
    percent: 10,
  },
];

export function getNativeFlowLevel(levelId: string) {
  return nativeFlowLevels.find((level) => level.id === levelId);
}

export function getNativeFlowSentence(levelId: string, sentenceId: number) {
  const level = getNativeFlowLevel(levelId);
  if (!level) return null;

  const normalizedSentenceId = Number.isFinite(sentenceId)
    ? Math.min(Math.max(Math.floor(sentenceId), 1), level.totalSentences)
    : 1;
  const sentence = nativeFlowSentencesByLevel[level.id][normalizedSentenceId - 1];

  return sentence ? { level, sentence } : null;
}
