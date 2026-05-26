export const FREE_EXPRESSION_LEARNING_LIMIT = 5;

const FREE_EXPRESSION_LEARNING_KEY = "speakflow-free-expression-learning";

type ExpressionLearningUsage = {
  date: string;
  learnedIds: string[];
};

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createEmptyUsage(): ExpressionLearningUsage {
  return {
    date: getTodayKey(),
    learnedIds: [],
  };
}

function getExpressionLearningUsage(): ExpressionLearningUsage {
  if (typeof window === "undefined") return createEmptyUsage();

  try {
    const raw = window.localStorage.getItem(FREE_EXPRESSION_LEARNING_KEY);
    if (!raw) return createEmptyUsage();

    const parsed = JSON.parse(raw) as Partial<ExpressionLearningUsage>;
    if (parsed.date !== getTodayKey()) return createEmptyUsage();

    const learnedIds = Array.isArray(parsed.learnedIds)
      ? parsed.learnedIds.filter((id): id is string => typeof id === "string")
      : [];

    return {
      date: getTodayKey(),
      learnedIds: learnedIds.slice(0, FREE_EXPRESSION_LEARNING_LIMIT),
    };
  } catch {
    return createEmptyUsage();
  }
}

export function getExpressionLearningUsageCount() {
  return getExpressionLearningUsage().learnedIds.length;
}

function saveExpressionLearningUsage(usage: ExpressionLearningUsage) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      FREE_EXPRESSION_LEARNING_KEY,
      JSON.stringify(usage)
    );
  } catch {
    // Keep the vocabulary page usable even if localStorage is unavailable.
  }
}

export function getExpressionLearningId(word: {
  createdAt?: string;
  word: string;
}) {
  return `${word.word}:${word.createdAt || ""}`;
}

export function hasLearnedExpression(expressionId: string) {
  return getExpressionLearningUsage().learnedIds.includes(expressionId);
}

export function isExpressionLearningLimitReached() {
  return (
    getExpressionLearningUsage().learnedIds.length >=
    FREE_EXPRESSION_LEARNING_LIMIT
  );
}

export function canLearnExpression(expressionId: string) {
  return hasLearnedExpression(expressionId) || !isExpressionLearningLimitReached();
}

export function recordLearnedExpression(expressionId: string) {
  const usage = getExpressionLearningUsage();
  if (usage.learnedIds.includes(expressionId)) return;
  if (usage.learnedIds.length >= FREE_EXPRESSION_LEARNING_LIMIT) return;

  saveExpressionLearningUsage({
    date: usage.date,
    learnedIds: [...usage.learnedIds, expressionId],
  });
}
