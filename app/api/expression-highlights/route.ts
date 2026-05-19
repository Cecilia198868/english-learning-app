import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createFallbackHighlightedExpressions } from "@/lib/expressionHighlights";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type HighlightResponse = {
  expressions?: Array<{
    phrase?: string;
    meaning?: string;
  }>;
};

export async function POST(req: Request) {
  try {
    const { sentence } = (await req.json()) as { sentence?: unknown };

    if (typeof sentence !== "string" || !sentence.trim()) {
      return NextResponse.json({ expressions: [] });
    }

    const normalizedSentence = sentence.trim();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        expressions: createFallbackHighlightedExpressions(normalizedSentence),
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Find 1-3 short English expressions worth saving for a Chinese-speaking English learner. Prefer useful phrases, collocations, idioms, phrasal verbs, adjective pairs, and natural chunks. Do not choose single easy words unless there is no phrase. Return only JSON: {"expressions":[{"phrase":"...","meaning":"short Simplified Chinese meaning with one fitting emoji"}]}. The phrase must appear exactly in the sentence, ignoring capitalization.',
        },
        {
          role: "user",
          content: normalizedSentence,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as HighlightResponse;
    const expressions = Array.isArray(parsed.expressions)
      ? parsed.expressions
          .map((item) => ({
            phrase: typeof item.phrase === "string" ? item.phrase.trim() : "",
            meaning:
              typeof item.meaning === "string"
                ? item.meaning.trim()
                : "✨ 值得学习的表达",
          }))
          .filter((item) => item.phrase)
          .slice(0, 3)
      : [];

    return NextResponse.json({
      expressions: expressions.length
        ? expressions
        : createFallbackHighlightedExpressions(normalizedSentence),
    });
  } catch {
    return NextResponse.json({ expressions: [] });
  }
}
