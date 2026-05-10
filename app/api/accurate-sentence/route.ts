import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { chinese } = (await req.json()) as { chinese?: unknown };

    if (typeof chinese !== "string" || !chinese.trim()) {
      return NextResponse.json({ error: "NO_CHINESE" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Translate the user's Chinese into one natural, idiomatic spoken English sentence for daily conversation practice. Return only the English sentence. No explanation.",
        },
        {
          role: "user",
          content: chinese.trim(),
        },
      ],
    });

    const english = completion.choices[0]?.message?.content?.trim() || "";

    if (!english) {
      return NextResponse.json({ error: "EMPTY_ENGLISH" }, { status: 500 });
    }

    return NextResponse.json({ english });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Generate accurate sentence failed",
      },
      { status: 500 }
    );
  }
}
