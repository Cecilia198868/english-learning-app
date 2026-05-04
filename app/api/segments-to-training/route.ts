import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type InputSegment = {
  text?: unknown;
  startTime?: unknown;
  endTime?: unknown;
};

type OutputPair = {
  chinese: string;
  english: string;
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

    const body = (await req.json()) as {
      title?: unknown;
      segments?: InputSegment[];
    };

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const segments = Array.isArray(body.segments)
      ? body.segments
          .map((segment) => {
            const text = typeof segment?.text === "string" ? segment.text.trim() : "";
            const startTime =
              typeof segment?.startTime === "number" ? segment.startTime : NaN;
            const endTime =
              typeof segment?.endTime === "number" ? segment.endTime : NaN;

            if (!text || Number.isNaN(startTime) || Number.isNaN(endTime)) {
              return null;
            }

            return {
              text,
              startTime,
              endTime,
            };
          })
          .filter(
            (
              segment
            ): segment is { text: string; startTime: number; endTime: number } =>
              Boolean(segment)
          )
      : [];

    if (segments.length === 0) {
      return Response.json(
        {
          error: "NO_SEGMENTS",
          message: "没有可用的转写片段。",
        },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `请把下面带时间戳的英文转写 segments 整理成英语学习训练句。
要求：
1. 可以删除无意义片段、重复口头禅、背景噪音描述、碎片化废话。
2. 但是如果保留某一句，必须保留它对应的 startTime 和 endTime，不要编造时间。
3. english 必须尽量保持原始转写文本，不要大幅改写；只允许做轻微空格清理和明显口语噪声清理。
4. chinese 要自然、准确、适合中文学习者做中译英练习。
5. 输出严格 JSON，不要 Markdown，不要解释。
6. JSON 格式必须是：
{
  "title": "课程标题",
  "pairs": [
    {
      "chinese": "...",
      "english": "...",
      "startTime": 12.3,
      "endTime": 15.8
    }
  ]
}`,
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              title,
              segments,
            },
            null,
            2
          ),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: { title?: string; pairs?: OutputPair[] };

    try {
      parsed = JSON.parse(raw) as { title?: string; pairs?: OutputPair[] };
    } catch {
      return Response.json(
        {
          error: "BAD_JSON",
          message: "模型返回的 JSON 无法解析。",
          raw,
        },
        { status: 500 }
      );
    }

    const pairs = Array.isArray(parsed.pairs)
      ? parsed.pairs.filter(
          (item) =>
            item &&
            typeof item.chinese === "string" &&
            typeof item.english === "string" &&
            typeof item.startTime === "number" &&
            typeof item.endTime === "number" &&
            (item.chinese.trim() || item.english.trim())
        )
      : [];

    if (pairs.length === 0) {
      return Response.json(
        {
          error: "NO_PAIRS",
          message: "没有生成可用的训练内容。",
        },
        { status: 500 }
      );
    }

    return Response.json({
      title: parsed.title?.trim() || title || "音频生成课程",
      pairs,
    });
  } catch (error) {
    console.error("segments-to-training error:", error);

    return Response.json(
      {
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

