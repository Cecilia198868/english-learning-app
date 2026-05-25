import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { sentence } = (await req.json()) as { sentence?: unknown };

    if (typeof sentence !== "string" || !sentence.trim()) {
      return NextResponse.json(
        { error: "NO_SENTENCE", message: "Missing sentence" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "NO_API_KEY",
          message: "Missing OPENAI_API_KEY",
        },
        { status: 500 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Translate the English sentence into accurate, natural Simplified Chinese for a spoken-English learner. Preserve the exact meaning. Return only JSON.",
        },
        {
          role: "user",
          content: sentence.trim(),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "example_translation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              translation: { type: "string" },
            },
            required: ["translation"],
          },
        },
      },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as { translation?: string };

    return NextResponse.json({
      translation:
        typeof parsed.translation === "string" ? parsed.translation.trim() : "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "TRANSLATE_FAILED",
        message:
          error instanceof Error ? error.message : "Example translation failed",
      },
      { status: 500 }
    );
  }
}
