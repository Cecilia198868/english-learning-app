import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: unknown };

    if (!text || typeof text !== "string") {
      return Response.json({ error: "NO_TEXT" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "NO_API_KEY" }, { status: 500 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `你是一个英语学习教材整理助手。
用户会提供一段英文字幕。
请你把它整理成适合中国学习者训练的中英对照句子。

要求：
- 删除没有学习价值的字幕，例如 yeah、okay、uh-huh、单个人名、无意义短句、声音说明、重复废话。
- 删除字幕时间，例如 18:07、1s、2s。
- 保留适合练习造句和口语表达的完整句子。
- 为每一句英文生成自然、准确、简洁的中文翻译。
- 中文要适合学习者看着中文反向造英文。
- 输出必须是严格 JSON，不要 markdown，不要解释。

JSON 格式必须是：

{
  "items": [
    {
      "zh": "中文翻译",
      "en": "English sentence"
    }
  ]
}`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    console.log("AI RAW:", content);

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("JSON parse failed:", content);
      return Response.json(
        { error: "BAD_AI_JSON", raw: content },
        { status: 500 }
      );
    }

    return Response.json(parsed);
  } catch (error) {
    console.error("generate-training error:", error);

    return Response.json(
      {
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
