import {
  FREE_PRACTICE_DAILY_LIMIT,
  fetchFreePracticeUsage,
  getFreePracticeUsage,
  hasFreePracticeCompletion,
  isFreePracticeLimitReached,
  recordFreePracticeCompletion,
  recordFreePracticeCompletionOnServer,
  type RecordFreePracticeResult,
  type ServerFreePracticeUsage,
} from "@/lib/freePracticeLimit";

export const FREE_EXPRESSION_LEARNING_LIMIT = FREE_PRACTICE_DAILY_LIMIT;

const EXPRESSION_LEARNING_SCOPE = "expression";

export function getExpressionLearningUsageCount() {
  return getFreePracticeUsage(EXPRESSION_LEARNING_SCOPE).count;
}

export async function fetchExpressionLearningUsage() {
  return fetchFreePracticeUsage(EXPRESSION_LEARNING_SCOPE);
}

export function getExpressionLearningId(word: {
  createdAt?: string;
  word: string;
}) {
  return `expression:${word.word}:${word.createdAt || ""}`;
}

export function hasLearnedExpression(expressionId: string) {
  return hasFreePracticeCompletion(EXPRESSION_LEARNING_SCOPE, expressionId);
}

export function isExpressionLearningLimitReached() {
  return isFreePracticeLimitReached(EXPRESSION_LEARNING_SCOPE);
}

export function canLearnExpression(expressionId: string) {
  return hasLearnedExpression(expressionId) || !isExpressionLearningLimitReached();
}

export function recordLearnedExpression(
  expressionId: string
): RecordFreePracticeResult {
  return recordFreePracticeCompletion(EXPRESSION_LEARNING_SCOPE, expressionId);
}

export async function recordLearnedExpressionOnServer(
  expressionId: string
): Promise<RecordFreePracticeResult & { usage: ServerFreePracticeUsage }> {
  return recordFreePracticeCompletionOnServer(
    EXPRESSION_LEARNING_SCOPE,
    expressionId
  );
}
