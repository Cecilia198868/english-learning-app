import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  createFallbackExpressionVariantMap,
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

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Create four clearly different English alternatives for a spoken English learner. Semantic authority is strict: use "authoritativeEnglish" when it is provided; otherwise use only the meaning of "chinese". If both authoritativeEnglish and chinese are missing, use learnerTranscript as the best available context and correct likely grammar, punctuation, and phrasing while preserving the learner\'s likely intended meaning. When chinese or authoritativeEnglish exists, learnerTranscript is unreliable speech recognition: never copy or preserve facts, nouns, reasons, places, events, or causal links from learnerTranscript unless they are clearly supported by chinese or authoritativeEnglish. If learnerTranscript conflicts with chinese or authoritativeEnglish, ignore learnerTranscript. Return only JSON with keys "standard", "idiomatic", "simple", and "natural". Keep each value one sentence. The four values must not be identical. "standard" should be accurate and polished. "idiomatic" should sound more native and use different wording from standard. "simple" should be easier beginner English and may split the idea into two short sentences. "natural" should sound casual and everyday with different wording from standard.',
        },
        {
          role: "user",
          content: JSON.stringify({
            authoritativeEnglish,
            chinese: chineseText,
            learnerTranscript,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const variants = JSON.parse(content) as VariantResponse;

    return NextResponse.json({
      variants: normalizeExpressionVariantMap(variants, fallbackSource),
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
