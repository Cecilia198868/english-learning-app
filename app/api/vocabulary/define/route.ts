import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { word } = (await req.json()) as { word?: unknown };

    if (typeof word !== "string" || !word.trim()) {
      return NextResponse.json(
        { error: "NO_WORD", message: "Missing word" },
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

    const normalizedWord = word.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You create compact vocabulary entries for beginner English learners.

Return strict JSON only.

Requirements:
1. meaning: short Simplified Chinese meaning, suitable for multiple-choice options.
2. partOfSpeech: one short English label such as noun, verb, adjective, adverb, phrase.
3. example: one simple natural English sentence for beginners.
4. exampleZh: accurate Simplified Chinese translation of the example.
5. For less common words such as "psychic", still provide a concrete usable Chinese meaning.
6. The meaning should never be empty and should not say unknown or unavailable.
7. Do not add markdown.
8. Do not add extra keys.`,
        },
        {
          role: "user",
          content: `Word: ${normalizedWord}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "vocabulary_definition",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              meaning: { type: "string" },
              partOfSpeech: { type: "string" },
              example: { type: "string" },
              exampleZh: { type: "string" },
            },
            required: ["meaning", "partOfSpeech", "example", "exampleZh"],
          },
        },
      },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as {
      meaning?: string;
      partOfSpeech?: string;
      example?: string;
      exampleZh?: string;
    };

    return NextResponse.json({
      meaning: typeof parsed.meaning === "string" ? parsed.meaning.trim() : "",
      partOfSpeech:
        typeof parsed.partOfSpeech === "string"
          ? parsed.partOfSpeech.trim()
          : "",
      example: typeof parsed.example === "string" ? parsed.example.trim() : "",
      exampleZh:
        typeof parsed.exampleZh === "string" ? parsed.exampleZh.trim() : "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "DEFINE_FAILED",
        message:
          error instanceof Error ? error.message : "Vocabulary define failed",
      },
      { status: 500 }
    );
  }
}
