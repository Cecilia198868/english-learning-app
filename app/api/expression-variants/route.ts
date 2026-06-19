import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  createFallbackExpressionVariantMap,
  isExpressionVariantMapDistinctEnough,
  isPlaceholderExpression,
  normalizeExpressionVariantApiPayload,
  toExpressionVariantApiFields,
  type ExpressionVariantMap,
} from "@/lib/expressionVariantFallbacks";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

type VariantResponse = {
  standard?: string;
  idiomatic?: string;
  simple?: string;
  natural?: string;
  recommendedExpression?: string;
  naturalExpression?: string;
  idiomaticExpression?: string;
  simpleExpression?: string;
  variants?: Partial<Record<keyof ExpressionVariantMap, unknown>>;
};

const MAX_VARIANT_GENERATION_ATTEMPTS = 3;

const EXPRESSION_VARIANT_PROMPT = [
  "You create English practice lines for an AI-guided speaking app.",
  "This app is not a translation tool. It is a conversation partner that helps the learner keep chatting.",
  "The four English versions must feel like four different levels of Americans saying the same real-life idea.",
  "Use semantic authority strictly: use authoritativeEnglish when provided; otherwise use only the meaning of chinese. If both are missing, infer the intended meaning from learnerTranscript and correct likely grammar.",
  "When chinese or authoritativeEnglish exists, learnerTranscript is unreliable speech recognition. Never copy extra facts, places, reasons, nouns, or events from it unless they are supported by chinese or authoritativeEnglish.",
  'Return JSON only with keys "recommendedExpression", "naturalExpression", "idiomaticExpression", and "simpleExpression".',
  "recommendedExpression: standard, correct, learner-friendly spoken English.",
  "naturalExpression: what Americans would naturally say in daily conversation; it may be slightly more casual or use a different everyday verb.",
  "idiomaticExpression: more native and life-like, using a different structure, phrasal verb, soft advice pattern, or casual wording when natural. Keep it easy.",
  "simpleExpression: clearly shorter and simpler than recommendedExpression or naturalExpression; suitable for beginners and often a short fragment is okay.",
  "If the idea is a question, every question-form value must end with a question mark.",
  "Hard rules: no two values may be identical; after removing punctuation no two values may be identical; do not create four tiny rewrites of the same sentence.",
  "Hard rules: simpleExpression must be visibly shorter; idiomaticExpression must not use the same sentence frame as recommendedExpression unless it adds a natural spoken pattern.",
  "Do not use filler such as Honestly, in other words, from another angle, or meta comments about expressing the idea.",
  "Keep each value one short spoken English line.",
].join("\n");

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function buildVariantRequestPayload({
  authoritativeEnglish,
  chineseText,
  learnerTranscript,
  rejectedVariants,
}: {
  authoritativeEnglish: string;
  chineseText: string;
  learnerTranscript: string;
  rejectedVariants?: VariantResponse;
}) {
  return JSON.stringify({
    authoritativeEnglish,
    chinese: chineseText,
    learnerTranscript,
    rejectedVariants,
    retryInstruction: rejectedVariants
      ? "The rejectedVariants failed validation because the four lines were identical, punctuation-only changes, too similar, not simple enough, or not idiomatic enough. Regenerate four functionally different versions now."
      : undefined,
  });
}

function pickRawVariantMap(variants: VariantResponse): Partial<ExpressionVariantMap> {
  return {
    standard: cleanText(
      variants.recommendedExpression ??
        variants.standard ??
        variants.variants?.standard
    ),
    natural: cleanText(
      variants.naturalExpression ?? variants.natural ?? variants.variants?.natural
    ),
    idiomatic: cleanText(
      variants.idiomaticExpression ??
        variants.idiomatic ??
        variants.variants?.idiomatic
    ),
    simple: cleanText(
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

export async function POST(req: Request) {
  let fallbackSource = "";

  try {
    const { chinese, userEnglish, standardEnglish } = (await req.json()) as {
      chinese?: unknown;
      userEnglish?: unknown;
      standardEnglish?: unknown;
    };

    const chineseText = cleanText(chinese);
    const learnerTranscript = cleanText(userEnglish);
    const rawAuthoritativeEnglish = cleanText(standardEnglish);
    const authoritativeEnglish = isPlaceholderExpression(rawAuthoritativeEnglish)
      ? ""
      : rawAuthoritativeEnglish;
    fallbackSource =
      authoritativeEnglish || chineseText || learnerTranscript;

    if (!chineseText && !authoritativeEnglish && !learnerTranscript) {
      return NextResponse.json({ error: "NO_CONTEXT" }, { status: 400 });
    }

    if (!openai) {
      return createExpressionVariantResponse(
        "fallback",
        createFallbackExpressionVariantMap(fallbackSource)
      );
    }

    let rejectedVariants: VariantResponse | undefined;

    for (
      let attempt = 0;
      attempt < MAX_VARIANT_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: EXPRESSION_VARIANT_PROMPT,
          },
          {
            role: "user",
            content: buildVariantRequestPayload({
              authoritativeEnglish,
              chineseText,
              learnerTranscript,
              rejectedVariants,
            }),
          },
        ],
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const variants = JSON.parse(content) as VariantResponse;
      const rawVariantMap = pickRawVariantMap(variants);
      const isRawDistinct =
        isExpressionVariantMapDistinctEnough(rawVariantMap);

      if (!isRawDistinct && attempt < MAX_VARIANT_GENERATION_ATTEMPTS - 1) {
        rejectedVariants = variants;
        continue;
      }

      const normalizedVariants = normalizeExpressionVariantApiPayload(
        variants,
        fallbackSource
      );
      const isNormalizedDistinct =
        isRawDistinct && isExpressionVariantMapDistinctEnough(normalizedVariants);

      if (
        isNormalizedDistinct ||
        attempt === MAX_VARIANT_GENERATION_ATTEMPTS - 1
      ) {
        const safeVariants = isNormalizedDistinct
          ? normalizedVariants
          : createFallbackExpressionVariantMap(fallbackSource);

        return createExpressionVariantResponse(
          isNormalizedDistinct
            ? "openai"
            : "fallback-normalized",
          safeVariants
        );
      }

      rejectedVariants = variants;
    }

    return createExpressionVariantResponse(
      "fallback",
      createFallbackExpressionVariantMap(fallbackSource)
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generate expression variants failed";

    if (fallbackSource) {
      return createExpressionVariantResponse(
        "fallback",
        createFallbackExpressionVariantMap(fallbackSource),
        message
      );
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
