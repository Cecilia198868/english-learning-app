export type HighlightedExpression = {
  phrase: string;
  meaning: string;
};

const FALLBACK_EXPRESSION_MEANINGS: Record<string, string> = {
  "lush and verdant": "🌱 生机盎然",
  "open a bank account": "🏦 开银行账户",
  "bring along": "🎒 随身带上",
};

export function normalizeExpressionPhrase(phrase: string) {
  return phrase.toLowerCase().replace(/\s+/g, " ").trim();
}

export function createFallbackHighlightedExpressions(sentence: string) {
  const normalizedSentence = normalizeExpressionPhrase(sentence);
  const expressions: HighlightedExpression[] = [];

  for (const [phrase, meaning] of Object.entries(FALLBACK_EXPRESSION_MEANINGS)) {
    if (normalizedSentence.includes(phrase)) {
      expressions.push({ phrase, meaning });
    }
  }

  const andPhraseMatch = sentence.match(
    /\b([A-Za-z]+(?:ful|ent|ant|ous|ive|y)?\s+and\s+[A-Za-z]+(?:ful|ent|ant|ous|ive|y)?)\b/
  );

  if (andPhraseMatch?.[1]) {
    const phrase = normalizeExpressionPhrase(andPhraseMatch[1]);
    if (!expressions.some((item) => item.phrase === phrase)) {
      expressions.push({
        phrase,
        meaning: FALLBACK_EXPRESSION_MEANINGS[phrase] || "✨ 值得学习的表达",
      });
    }
  }

  return expressions.slice(0, 3);
}

export function splitSentenceByHighlightedExpressions(
  sentence: string,
  expressions: HighlightedExpression[]
) {
  const usableExpressions = expressions
    .map((expression) => ({
      ...expression,
      phrase: expression.phrase.trim(),
    }))
    .filter((expression) => expression.phrase)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  const segments: Array<
    | { type: "text"; value: string }
    | { type: "expression"; value: string; expression: HighlightedExpression }
  > = [];
  let cursor = 0;
  const lowerSentence = sentence.toLowerCase();

  while (cursor < sentence.length) {
    const match = usableExpressions
      .map((expression) => ({
        expression,
        index: lowerSentence.indexOf(expression.phrase.toLowerCase(), cursor),
      }))
      .filter((item) => item.index >= cursor)
      .sort((a, b) => a.index - b.index || b.expression.phrase.length - a.expression.phrase.length)[0];

    if (!match) {
      segments.push({ type: "text", value: sentence.slice(cursor) });
      break;
    }

    if (match.index > cursor) {
      segments.push({ type: "text", value: sentence.slice(cursor, match.index) });
    }

    const value = sentence.slice(
      match.index,
      match.index + match.expression.phrase.length
    );
    segments.push({
      type: "expression",
      value,
      expression: match.expression,
    });
    cursor = match.index + match.expression.phrase.length;
  }

  return segments;
}
