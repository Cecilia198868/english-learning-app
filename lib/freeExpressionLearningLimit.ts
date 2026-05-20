export const FREE_EXPRESSION_LEARNING_LIMIT = 5;

const FREE_EXPRESSION_LEARNING_KEY = "speakflow-free-expression-learning";

type ExpressionLearningUsage = {
  learnedIds: string[];
};

function createEmptyUsage(): ExpressionLearningUsage {
  return {
    learnedIds: [],
  };
}

function getExpressionLearningUsage(): ExpressionLearningUsage {
  if (typeof window === "undefined") return createEmptyUsage();

  try {
    const raw = window.localStorage.getItem(FREE_EXPRESSION_LEARNING_KEY);
    if (!raw) return createEmptyUsage();

    const parsed = JSON.parse(raw) as Partial<ExpressionLearningUsage>;
    const learnedIds = Array.isArray(parsed.learnedIds)
      ? parsed.learnedIds.filter((id): id is string => typeof id === "string")
      : [];

    return {
      learnedIds,
    };
  } catch {
    return createEmptyUsage();
  }
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
    learnedIds: [...usage.learnedIds, expressionId],
  });
}
