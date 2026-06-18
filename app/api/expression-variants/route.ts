import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  createFallbackExpressionVariantMap,
  isExpressionVariantMapDistinctEnough,
  normalizeExpressionVariantMap,
} from "@/lib/expressionVariantFallbacks";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type VariantResponse = {
  standard?: string;
  idiomatic?: string;
  simple?: string;
  natural?: string;
};

const MAX_VARIANT_GENERATION_ATTEMPTS = 3;

const EXPRESSION_VARIANT_PROMPT = [
  "You create English practice lines for an AI-guided speaking app.",
  "This app is not a translation tool. It is a conversation partner that helps the learner keep chatting.",
  "The four English versions must feel like four different levels of Americans saying the same real-life idea.",
  "Use semantic authority strictly: use authoritativeEnglish when provided; otherwise use only the meaning of chinese. If both are missing, infer the intended meaning from learnerTranscript and correct likely grammar.",
  "When chinese or authoritativeEnglish exists, learnerTranscript is unreliable speech recognition. Never copy extra facts, places, reasons, nouns, or events from it unless they are supported by chinese or authoritativeEnglish.",
  'Return JSON only with keys "standard", "idiomatic", "simple", and "natural".',
  "standard: standard, natural American English; accurate and polished.",
  "natural: what Americans would most commonly say; contractions and casual wording are allowed.",
  "idiomatic: more native-sounding; idioms, fixed phrases, phrasal verbs, and local wording are allowed when natural.",
  "simple: CEFR A1-A2; short, clear, beginner-friendly words. It may split the idea into two short sentences.",
  "Hard rules: no two values may be identical; no pair may be more than 70% text-similar; each version must use noticeably different wording.",
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
      ? "The rejectedVariants were identical or too similar. Regenerate four clearly different versions now."
      : undefined,
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
    const authoritativeEnglish = cleanText(standardEnglish);
    fallbackSource =
      authoritativeEnglish || learnerTranscript || chineseText;

    if (!chineseText && !authoritativeEnglish && !learnerTranscript) {
      return NextResponse.json({ error: "NO_CONTEXT" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        source: "fallback",
        variants: createFallbackExpressionVariantMap(fallbackSource),
      });
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
      const normalizedVariants = normalizeExpressionVariantMap(
        variants,
        fallbackSource
      );

      if (
        isExpressionVariantMapDistinctEnough(variants) ||
        attempt === MAX_VARIANT_GENERATION_ATTEMPTS - 1
      ) {
        return NextResponse.json({
          source: isExpressionVariantMapDistinctEnough(variants)
            ? "openai"
            : "fallback-normalized",
          variants: normalizedVariants,
        });
      }

      rejectedVariants = variants;
    }

    return NextResponse.json({
      source: "fallback",
      variants: createFallbackExpressionVariantMap(fallbackSource),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generate expression variants failed";

    if (fallbackSource) {
      return NextResponse.json({
        error: message,
        source: "fallback",
        variants: createFallbackExpressionVariantMap(fallbackSource),
      });
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
