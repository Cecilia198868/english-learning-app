import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type GuidedTurn = {
  chinese?: unknown;
  userEnglish?: unknown;
  recommendedEnglish?: unknown;
};

type FollowupResponse = {
  suggestion?: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function createFallbackSuggestion(currentChinese: string) {
  if (/天气|太阳|晒|舒服|后院|户外/.test(currentChinese)) {
    return "躺在后院晒太阳真舒服！";
  }

  if (/累|疲惫|休息|放松/.test(currentChinese)) {
    return "我想找个安静的地方休息一下。";
  }

  if (/开心|高兴|喜欢|享受/.test(currentChinese)) {
    return "这种感觉让我一整天都很开心。";
  }

  if (/饿|吃|饭|咖啡|茶/.test(currentChinese)) {
    return "等一下我想去买点好吃的。";
  }

  return "我还想多说一点我的感受。";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      currentChinese?: unknown;
      userEnglish?: unknown;
      recommendedEnglish?: unknown;
      turns?: GuidedTurn[];
    };

    const currentChinese = cleanText(body.currentChinese);
    const userEnglish = cleanText(body.userEnglish);
    const recommendedEnglish = cleanText(body.recommendedEnglish);
    const turns = Array.isArray(body.turns)
      ? body.turns
          .map((turn) => ({
            chinese: cleanText(turn.chinese),
            userEnglish: cleanText(turn.userEnglish),
            recommendedEnglish: cleanText(turn.recommendedEnglish),
          }))
          .filter((turn) => turn.chinese || turn.userEnglish || turn.recommendedEnglish)
          .slice(-6)
      : [];

    if (!currentChinese) {
      return NextResponse.json({ suggestion: "" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        suggestion: createFallbackSuggestion(currentChinese),
        source: "fallback",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            '你是英语口语训练 App 里的中文引导教练。请根据用户刚才说的中文、用户尝试说出的英文、AI 推荐英文，以及最近几轮上下文，生成下一句适合用户继续用中文说出来的内容。要求：1. 保持情景连续性；2. 让情绪或细节自然递进；3. 像真实日常生活；4. 适合初中级学习者，不要太抽象；5. 只生成一句简体中文，12到24个汉字左右，可自然使用标点；6. 不要解释，不要给英文。只返回 JSON：{"suggestion":"..."}',
        },
        {
          role: "user",
          content: JSON.stringify({
            currentChinese,
            userEnglish,
            recommendedEnglish,
            recentTurns: turns,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as FollowupResponse;
    const suggestion = cleanText(parsed.suggestion);

    return NextResponse.json({
      suggestion: suggestion || createFallbackSuggestion(currentChinese),
    });
  } catch {
    return NextResponse.json({
      suggestion: "我还想多说一点我的感受。",
      source: "fallback",
    });
  }
}
