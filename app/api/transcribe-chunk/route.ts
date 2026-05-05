export const runtime = "nodejs";
export const maxDuration = 300;
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChunkSegment = {
  text: string;
  startTime: number;
  endTime: number;
};

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          error: "NO_API_KEY",
          message: "缺少 OPENAI_API_KEY，请先在 .env.local 中配置。",
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio");
    const chunkIndexValue = formData.get("chunkIndex");
    const startOffsetValue = formData.get("startOffset");

    if (!(audio instanceof File)) {
      return Response.json(
        {
          error: "NO_AUDIO",
          message: "未收到音频文件，请使用字段名 audio 上传。",
        },
        { status: 400 }
      );
    }

    const chunkIndex = Number(chunkIndexValue);
    const startOffset = Number(startOffsetValue);

    if (Number.isNaN(chunkIndex) || Number.isNaN(startOffset)) {
      return Response.json(
        {
          error: "BAD_FIELDS",
          message: "chunkIndex 或 startOffset 无效。",
        },
        { status: 400 }
      );
    }

    const transcriptResult = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const transcript = transcriptResult.text?.trim() || "";
    const segments: ChunkSegment[] = Array.isArray(transcriptResult.segments)
      ? transcriptResult.segments
          .map((segment) => {
            const start =
              typeof segment.start === "number" ? Number(segment.start) : NaN;
            const end =
              typeof segment.end === "number" ? Number(segment.end) : NaN;
            const text =
              typeof segment.text === "string" ? segment.text.trim() : "";

            if (!text || Number.isNaN(start) || Number.isNaN(end)) {
              return null;
            }

            return {
              text,
              startTime: start + startOffset,
              endTime: end + startOffset,
            };
          })
          .filter((segment): segment is ChunkSegment => Boolean(segment))
      : [];

    return Response.json({
      chunkIndex,
      startOffset,
      transcript,
      segments,
    });
  } catch (error) {
    console.error("transcribe-chunk error:", error);

    return Response.json(
      {
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

