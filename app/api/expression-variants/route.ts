import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  containsChinese,
  createFallbackExpressionVariantMap,
  isInvalidExpressionForDisplay,
  isPlaceholderExpression,
  toExpressionVariantApiFields,
  type ExpressionVariantMap,
} from "@/lib/expressionVariantFallbacks";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const EXPRESSION_GENERATION_FAILED = "EXPRESSION_GENERATION_FAILED";

type ExpressionGenerationFailureReason =
  | "OPENAI_UNAVAILABLE"
  | "OPENAI_429"
  | "OPENAI_TIMEOUT"
  | "INVALID_JSON"
  | "CONTAINS_CHINESE"
  | "DUPLICATE_VARIANTS"
  | "EMPTY_VARIANT"
  | "FALLBACK_REJECTED"
  | "OTHER";

type VariantResponse = {
  standard?: unknown;
  idiomatic?: unknown;
  simple?: unknown;
  natural?: unknown;
  recommendedExpression?: unknown;
  naturalExpression?: unknown;
  idiomaticExpression?: unknown;
  simpleExpression?: unknown;
  variants?: Partial<Record<keyof ExpressionVariantMap, unknown>>;
};

const MAX_VARIANT_GENERATION_ATTEMPTS = 3;
const LEARNER_NOISE_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "be",
  "been",
  "being",
  "could",
  "did",
  "do",
  "does",
  "for",
  "had",
  "has",
  "have",
  "i",
  "in",
  "is",
  "it",
  "like",
  "may",
  "might",
  "my",
  "need",
  "of",
  "on",
  "or",
  "our",
  "please",
  "should",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "would",
  "you",
  "your",
]);

const EXPRESSION_VARIANT_PROMPT = `
You create English practice lines for an AI-guided speaking app.

Return JSON only:
{
  "recommendedExpression": "...",
  "naturalExpression": "...",
  "idiomaticExpression": "...",
  "simpleExpression": "..."
}

Rules:
- Four versions must express the same meaning but use clearly different wording.
- Semantic priority is strict: if chinese is provided, use chinese as the source of meaning.
- learnerTranscript may contain speech recognition errors and must not add or override facts, objects, places, actions, or intent from chinese.
- When chinese exists, use chinese as the source of meaning. learnerTranscript may contain speech recognition errors. Never copy facts, nouns, objects, or strange words from learnerTranscript unless supported by chinese or authoritativeEnglish.
- If chinese conflicts with learnerTranscript, ignore learnerTranscript.
- If chinese is missing, use authoritativeEnglish first, then learnerTranscript.
- recommendedExpression: standard, correct, learner-friendly.
- naturalExpression: natural daily American English.
- idiomaticExpression: more native, casual, or spoken.
- simpleExpression: much shorter and easier.
- If it is a question, use ?.
- All four values must be English only. Do not include Chinese characters.
- Never return four similar rewrites.
- Never copy the learner's grammar mistakes.
`.trim();

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeForCompare(text: string) {
  return cleanText(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fixQuestionPunctuation(value: unknown) {
  const cleaned = cleanText(value);
  if (!cleaned) return "";

  const looksLikeQuestion =
    /^(do|does|did|are|is|am|can|could|would|will|should|may|might|have|has|had)\b/i.test(
      cleaned
    ) || /^(who|what|when|where|why|how)\b/i.test(cleaned);

  if (looksLikeQuestion) {
    return cleaned.replace(/[.!?\u3002]*$/, "?");
  }

  return cleaned;
}

function isStrictlyDistinct(variants: Partial<ExpressionVariantMap>) {
  const standard = cleanText(variants.standard);
  const natural = cleanText(variants.natural);
  const idiomatic = cleanText(variants.idiomatic);
  const simple = cleanText(variants.simple);

  if (!standard || !natural || !idiomatic || !simple) return false;
  if ([standard, natural, idiomatic, simple].some(containsChinese)) return false;

  const normalized = [standard, natural, idiomatic, simple].map(normalizeForCompare);
  if (new Set(normalized).size < 4) return false;

  if (simple.length >= standard.length && simple.length >= natural.length) {
    return false;
  }

  return true;
}

function hasCompleteEnglishVariantMap(variants: Partial<ExpressionVariantMap>) {
  const values = [
    cleanText(variants.standard),
    cleanText(variants.natural),
    cleanText(variants.idiomatic),
    cleanText(variants.simple),
  ];

  return values.every(
    (value) => /[A-Za-z]/.test(value) && !isInvalidExpressionForDisplay(value)
  );
}

function hasEmptyVariant(variants: Partial<ExpressionVariantMap>) {
  return [
    cleanText(variants.standard),
    cleanText(variants.natural),
    cleanText(variants.idiomatic),
    cleanText(variants.simple),
  ].some((value) => !value || !/[A-Za-z]/.test(value));
}

function normalizeToken(token: string) {
  const normalized = token.toLowerCase();

  return normalized.length > 3 && normalized.endsWith("s")
    ? normalized.slice(0, -1)
    : normalized;
}

function getEnglishTokens(value: string) {
  const matches = value.toLowerCase().match(/[a-z][a-z']*/g) || [];

  return matches
    .map((token) => normalizeToken(token.replace(/^'+|'+$/g, "")))
    .filter(Boolean);
}

function createAllowedSemanticTokenSet(semanticFallback: ExpressionVariantMap) {
  const allowed = new Set(
    getEnglishTokens(Object.values(semanticFallback).join(" "))
  );

  if (allowed.has("jacket") || allowed.has("coat")) {
    ["jacket", "coat", "outerwear"].forEach((token) => allowed.add(token));
  }

  if (allowed.has("wear") || allowed.has("grab")) {
    ["wear", "wearing", "put", "on", "grab", "throw"].forEach((token) =>
      allowed.add(normalizeToken(token))
    );
  }

  return allowed;
}

function hasUnsupportedLearnerTerms({
  chineseText,
  learnerTranscript,
  semanticFallback,
  variants,
}: {
  chineseText: string;
  learnerTranscript: string;
  semanticFallback: ExpressionVariantMap;
  variants: Partial<ExpressionVariantMap>;
}) {
  if (
    !chineseText ||
    !learnerTranscript ||
    !hasCompleteEnglishVariantMap(semanticFallback)
  ) {
    return false;
  }

  const allowedSemanticTokens = createAllowedSemanticTokenSet(semanticFallback);
  const unsupportedLearnerTokens = getEnglishTokens(learnerTranscript).filter(
    (token) =>
      !LEARNER_NOISE_STOPWORDS.has(token) && !allowedSemanticTokens.has(token)
  );

  if (!unsupportedLearnerTokens.length) return false;

  const variantTokens = new Set(
    getEnglishTokens(
      [variants.standard, variants.natural, variants.idiomatic, variants.simple]
        .map((value) => cleanText(value))
        .join(" ")
    )
  );

  return unsupportedLearnerTokens.some((token) => variantTokens.has(token));
}

function isVariantMapSafeForSemanticSource({
  chineseText,
  learnerTranscript,
  semanticFallback,
  variants,
}: {
  chineseText: string;
  learnerTranscript: string;
  semanticFallback: ExpressionVariantMap;
  variants: Partial<ExpressionVariantMap>;
}) {
  return (
    isStrictlyDistinct(variants) &&
    !hasUnsupportedLearnerTerms({
      chineseText,
      learnerTranscript,
      semanticFallback,
      variants,
    })
  );
}

function getVariantRejectionReason({
  chineseText,
  learnerTranscript,
  semanticFallback,
  variants,
}: {
  chineseText: string;
  learnerTranscript: string;
  semanticFallback: ExpressionVariantMap;
  variants: Partial<ExpressionVariantMap>;
}): ExpressionGenerationFailureReason | null {
  const values = [
    cleanText(variants.standard),
    cleanText(variants.natural),
    cleanText(variants.idiomatic),
    cleanText(variants.simple),
  ];

  if (values.some((value) => !value || !/[A-Za-z]/.test(value))) {
    return "EMPTY_VARIANT";
  }

  if (values.some(containsChinese)) {
    return "CONTAINS_CHINESE";
  }

  if (!isStrictlyDistinct(variants)) {
    return "DUPLICATE_VARIANTS";
  }

  if (
    hasUnsupportedLearnerTerms({
      chineseText,
      learnerTranscript,
      semanticFallback,
      variants,
    })
  ) {
    return "FALLBACK_REJECTED";
  }

  if (values.some(isInvalidExpressionForDisplay)) {
    return "OTHER";
  }

  return null;
}

function getOpenAiFailureReason(error: unknown): ExpressionGenerationFailureReason {
  const maybeError = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
    status?: unknown;
  };
  const status =
    typeof maybeError.status === "number" ? maybeError.status : undefined;
  const code = typeof maybeError.code === "string" ? maybeError.code : "";
  const name = typeof maybeError.name === "string" ? maybeError.name : "";
  const message =
    typeof maybeError.message === "string" ? maybeError.message : "";
  const normalized = `${code} ${name} ${message}`.toLowerCase();

  if (status === 429 || code === "429") return "OPENAI_429";
  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("etimedout") ||
    normalized.includes("abort")
  ) {
    return "OPENAI_TIMEOUT";
  }

  return "OTHER";
}

function serializeOpenAiError(error: unknown) {
  if (error instanceof Error) {
    const maybeError = error as Error & {
      code?: unknown;
      status?: unknown;
      type?: unknown;
    };

    return {
      code: maybeError.code,
      message: error.message,
      name: error.name,
      status: maybeError.status,
      type: maybeError.type,
    };
  }

  return error;
}

function logExpressionGenerationRejected({
  authoritativeEnglish,
  chineseText,
  learnerTranscript,
  normalizedVariants,
  openAiResponse,
  reason,
}: {
  authoritativeEnglish: string;
  chineseText: string;
  learnerTranscript: string;
  normalizedVariants?: Partial<ExpressionVariantMap>;
  openAiResponse?: unknown;
  reason: ExpressionGenerationFailureReason;
}) {
  const rejectionDetails = {
    reason,
    chineseText,
    authoritativeEnglish,
    learnerTranscript,
    openAiResponse,
    normalizedVariants,
  };

  console.error("Expression generation rejected", rejectionDetails);
  console.error("Expression generation rejected detail", JSON.stringify(rejectionDetails));
}

function createSemanticFallbackVariantMap({
  authoritativeEnglish,
  chineseText,
  learnerTranscript,
}: {
  authoritativeEnglish: string;
  chineseText: string;
  learnerTranscript: string;
}) {
  if (chineseText) {
    const chineseFallback = createFallbackExpressionVariantMap(chineseText);
    if (hasCompleteEnglishVariantMap(chineseFallback)) return chineseFallback;

    return createFallbackExpressionVariantMap(authoritativeEnglish);
  }

  return createFallbackExpressionVariantMap(
    authoritativeEnglish || learnerTranscript
  );
}

function buildVariantRequestPayload({
  authoritativeEnglish,
  chineseText,
  englishFallbackSource,
  learnerTranscript,
  rejectedVariants,
  semanticSource,
}: {
  authoritativeEnglish: string;
  chineseText: string;
  englishFallbackSource: string;
  learnerTranscript: string;
  rejectedVariants?: VariantResponse;
  semanticSource: string;
}) {
  return JSON.stringify({
    authoritativeEnglish,
    chinese: chineseText,
    englishFallbackSource,
    learnerTranscript,
    semanticSource,
    semanticPriority: chineseText
      ? "Use chinese as the source of meaning. learnerTranscript is only a noisy reference and must not add words or facts."
      : "Use authoritativeEnglish first, then learnerTranscript.",
    rejectedVariants,
    retryInstruction: rejectedVariants
      ? "Rejected. The four versions were too similar. Regenerate four clearly different spoken English versions."
      : undefined,
  });
}

function pickRawVariantMap(variants: VariantResponse): Partial<ExpressionVariantMap> {
  return {
    standard: fixQuestionPunctuation(
      variants.recommendedExpression ?? variants.standard ?? variants.variants?.standard
    ),
    natural: fixQuestionPunctuation(
      variants.naturalExpression ?? variants.natural ?? variants.variants?.natural
    ),
    idiomatic: fixQuestionPunctuation(
      variants.idiomaticExpression ?? variants.idiomatic ?? variants.variants?.idiomatic
    ),
    simple: fixQuestionPunctuation(
      variants.simpleExpression ?? variants.simple ?? variants.variants?.simple
    ),
  };
}

function createExpressionVariantResponse(
  source: string,
  variants: ExpressionVariantMap,
  error?: string
) {
  const fields = toExpressionVariantApiFields(variants);

  console.log("AI expression result:", fields);

  return NextResponse.json({
    ...(error ? { error } : {}),
    source,
    ...fields,
    variants,
  });
}

function createExpressionVariantErrorResponse(status = 503) {
  return NextResponse.json(
    { error: EXPRESSION_GENERATION_FAILED },
    { status }
  );
}

function createDevelopmentMockExpressionVariants(
  chineseText: string,
  authoritativeEnglish: string
): ExpressionVariantMap | null {
  const source = chineseText.trim();

  if (source.includes("外套")) {
    return {
      standard: "Do you need to wear a jacket?",
      natural: "Do you need a jacket?",
      idiomatic: "Should you grab a jacket?",
      simple: "Need a jacket?",
    };
  }

  if (source.includes("夏天") && source.includes("早晚")) {
    return {
      standard:
        "Even though it's summer, it's a little cold in the mornings and evenings, so we should wear more layers.",
      natural:
        "It's summer, but it still gets a little chilly in the morning and evening, so we should dress a bit warmer.",
      idiomatic:
        "Even though it's summer, the mornings and evenings can still be a bit chilly, so we should layer up.",
      simple:
        "It's summer, but it's a little cold. We should wear more clothes.",
    };
  }

  if (source.includes("天黑") || source.includes("睡觉")) {
    return {
      standard: "It's getting dark. You should go to bed.",
      natural: "It's getting late. You should get some sleep.",
      idiomatic: "It's getting late. You should call it a night.",
      simple: "It's dark. Go to bed.",
    };
  }

  if (authoritativeEnglish) {
    return {
      standard: authoritativeEnglish,
      natural: authoritativeEnglish,
      idiomatic: authoritativeEnglish,
      simple: authoritativeEnglish,
    };
  }

  return null;
}

export async function POST(req: Request) {
  let semanticFallbackVariants = createFallbackExpressionVariantMap("");
  let hasRequestContext = false;
  let chineseTextForLog = "";
  let authoritativeEnglishForLog = "";
  let learnerTranscriptForLog = "";
  let lastFailureReason: ExpressionGenerationFailureReason = "OTHER";
  let lastNormalizedVariants: Partial<ExpressionVariantMap> | undefined;
  let lastOpenAiResponse: unknown;

  try {
    const { chinese, userEnglish, standardEnglish } = (await req.json()) as {
      chinese?: unknown;
      userEnglish?: unknown;
      standardEnglish?: unknown;
    };

    const chineseText = cleanText(chinese);
    const rawLearnerTranscript = cleanText(userEnglish);
    const learnerTranscript = containsChinese(rawLearnerTranscript)
      ? ""
      : rawLearnerTranscript;
    const rawAuthoritativeEnglish = cleanText(standardEnglish);
    const authoritativeEnglish =
      isPlaceholderExpression(rawAuthoritativeEnglish) ||
      containsChinese(rawAuthoritativeEnglish)
      ? ""
      : fixQuestionPunctuation(rawAuthoritativeEnglish);
    chineseTextForLog = chineseText;
    authoritativeEnglishForLog = authoritativeEnglish;
    learnerTranscriptForLog = learnerTranscript;
    hasRequestContext = Boolean(
      chineseText || authoritativeEnglish || learnerTranscript
    );
    const semanticSource =
      chineseText || authoritativeEnglish || learnerTranscript;
    const englishFallbackSource = authoritativeEnglish || learnerTranscript || "";

    semanticFallbackVariants = createSemanticFallbackVariantMap({
      authoritativeEnglish,
      chineseText,
      learnerTranscript,
    });

    if (!chineseText && !authoritativeEnglish && !learnerTranscript) {
      return NextResponse.json({ error: "NO_CONTEXT" }, { status: 400 });
    }

    if (!openai) {
      logExpressionGenerationRejected({
        authoritativeEnglish,
        chineseText,
        learnerTranscript,
        reason: "OPENAI_UNAVAILABLE",
      });
      return createExpressionVariantErrorResponse();
    }

    let rejectedVariants: VariantResponse | undefined;

    for (let attempt = 0; attempt < MAX_VARIANT_GENERATION_ATTEMPTS; attempt += 1) {
      let completion;

      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          response_format: { type: "json_object" },
          temperature: 0.9,
          messages: [
            { role: "system", content: EXPRESSION_VARIANT_PROMPT },
            {
              role: "user",
              content: buildVariantRequestPayload({
                authoritativeEnglish,
                chineseText,
                englishFallbackSource,
                learnerTranscript,
                rejectedVariants,
                semanticSource,
              }),
            },
          ],
        });
      } catch (error) {
        const reason = getOpenAiFailureReason(error);
        const openAiResponse = serializeOpenAiError(error);
        logExpressionGenerationRejected({
          authoritativeEnglish,
          chineseText,
          learnerTranscript,
          openAiResponse,
          reason,
        });

        if (reason === "OPENAI_429" && process.env.NODE_ENV === "development") {
          const mockVariants = createDevelopmentMockExpressionVariants(
            chineseText,
            authoritativeEnglish
          );

          if (mockVariants) {
            return createExpressionVariantResponse(
              "development-mock-openai-429",
              mockVariants
            );
          }
        }

        return createExpressionVariantErrorResponse();
      }

      const content = completion.choices[0]?.message?.content || "{}";
      lastOpenAiResponse = content;
      let variants: VariantResponse;

      try {
        variants = JSON.parse(content) as VariantResponse;
      } catch {
        logExpressionGenerationRejected({
          authoritativeEnglish,
          chineseText,
          learnerTranscript,
          openAiResponse: content,
          reason: "INVALID_JSON",
        });
        return createExpressionVariantErrorResponse();
      }

      lastOpenAiResponse = variants;
      const rawVariantMap = pickRawVariantMap(variants);
      const rawRejectionReason = getVariantRejectionReason({
        chineseText,
        learnerTranscript,
        semanticFallback: semanticFallbackVariants,
        variants: rawVariantMap,
      });

      if (
        !rawRejectionReason &&
        hasCompleteEnglishVariantMap(rawVariantMap) &&
        isVariantMapSafeForSemanticSource({
          chineseText,
          learnerTranscript,
          semanticFallback: semanticFallbackVariants,
          variants: rawVariantMap,
        })
      ) {
        const normalizedVariants: ExpressionVariantMap = {
          standard: cleanText(rawVariantMap.standard),
          natural: cleanText(rawVariantMap.natural),
          idiomatic: cleanText(rawVariantMap.idiomatic),
          simple: cleanText(rawVariantMap.simple),
        };
        const normalizedRejectionReason = getVariantRejectionReason({
          chineseText,
          learnerTranscript,
          semanticFallback: semanticFallbackVariants,
          variants: normalizedVariants,
        });

        if (
          !normalizedRejectionReason &&
          hasCompleteEnglishVariantMap(normalizedVariants) &&
          isVariantMapSafeForSemanticSource({
            chineseText,
            learnerTranscript,
            semanticFallback: semanticFallbackVariants,
            variants: normalizedVariants,
          })
        ) {
          return createExpressionVariantResponse("openai", normalizedVariants);
        }

        lastFailureReason = normalizedRejectionReason || "OTHER";
        lastNormalizedVariants = normalizedVariants;
        logExpressionGenerationRejected({
          authoritativeEnglish,
          chineseText,
          learnerTranscript,
          normalizedVariants,
          openAiResponse: variants,
          reason: lastFailureReason,
        });
      } else {
        lastFailureReason = rawRejectionReason || "OTHER";
        lastNormalizedVariants = rawVariantMap;
        logExpressionGenerationRejected({
          authoritativeEnglish,
          chineseText,
          learnerTranscript,
          normalizedVariants: rawVariantMap,
          openAiResponse: variants,
          reason: lastFailureReason,
        });
      }

      rejectedVariants = variants;
    }

    logExpressionGenerationRejected({
      authoritativeEnglish,
      chineseText,
      learnerTranscript,
      normalizedVariants: lastNormalizedVariants,
      openAiResponse: lastOpenAiResponse,
      reason: lastFailureReason,
    });
    return createExpressionVariantErrorResponse();
  } catch (error) {
    if (hasRequestContext) {
      logExpressionGenerationRejected({
        authoritativeEnglish: authoritativeEnglishForLog,
        chineseText: chineseTextForLog,
        learnerTranscript: learnerTranscriptForLog,
        openAiResponse: serializeOpenAiError(error),
        reason: "OTHER",
      });
      return createExpressionVariantErrorResponse();
    }
    logExpressionGenerationRejected({
      authoritativeEnglish: authoritativeEnglishForLog,
      chineseText: chineseTextForLog,
      learnerTranscript: learnerTranscriptForLog,
      openAiResponse: serializeOpenAiError(error),
      reason: "OTHER",
    });
    return createExpressionVariantErrorResponse();
  }
}
