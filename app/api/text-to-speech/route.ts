import OpenAI from "openai";
import { isSpeakFlowVoiceId, SPEAKFLOW_DEFAULT_VOICE_ID } from "@/lib/voiceSettings";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const voiceInstructions = {
  alloy: "Speak clearly with a neutral, classroom-friendly tone.",
  nova: "Speak warmly and naturally, like a friendly young English teacher.",
  shimmer: "Speak very softly and gently, like a patient English teacher.",
  onyx: "Speak steadily with a calm, grounded male voice.",
} as const;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeRate(value: unknown) {
  const rate = typeof value === "number" ? value : 1;
  return Math.min(Math.max(rate, 0.5), 1.15);
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "NO_API_KEY" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      rate?: unknown;
      text?: unknown;
      voice?: unknown;
    };
    const text = cleanText(body.text).slice(0, 4096);
    const voice = isSpeakFlowVoiceId(body.voice)
      ? body.voice
      : SPEAKFLOW_DEFAULT_VOICE_ID;

    if (!text) {
      return Response.json({ error: "NO_TEXT" }, { status: 400 });
    }

    const response = await openai.audio.speech.create({
      input: text,
      instructions: voiceInstructions[voice],
      model: "gpt-4o-mini-tts",
      response_format: "mp3",
      speed: normalizeRate(body.rate),
      voice,
    });

    return new Response(await response.arrayBuffer(), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "TEXT_TO_SPEECH_FAILED",
      },
      { status: 500 }
    );
  }
}
