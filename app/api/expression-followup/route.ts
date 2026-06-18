import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  createGuidedFollowupSuggestion,
  normalizeGuidedFollowupSuggestion,
  type GuidedFollowupInput,
} from "@/lib/guidedFollowupSuggestions";

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

const NATIVE_CHINESE_FOLLOWUP_PROMPT = [
  "你是英语口语训练 App 里的中文对话引导者。你的任务是写一句真实生活里朋友会自然接上的下一句中文。",
  "下一句必须和上一句属于同一个生活场景，例如天气、家庭、购物、工作、旅行、餐厅、健康、朋友聊天。不能突然跳场景。",
  "下一句必须和上一句有自然因果或对话关系，可以是询问、感受、观察、建议。要像真人继续聊天，不像作文老师引导写作。",
  "currentChinese 和 recommendedEnglish 是事实来源；learnerTranscript 只是可能有错的语音识别文本，不能用来新增人物、物品、地点或事件。如果冲突，忽略 learnerTranscript。",
  "如果 currentChinese 缺失，可以根据 recommendedEnglish 或 learnerTranscript 判断大致生活场景，再生成一句自然中文接话；不要纠错英文，不要翻译腔。",
  "必须彻底禁止元语言和补充说明类句子，包括：我还想补充一个小细节、还有一个原因、还有一点值得注意、另外一个方面、进一步来说、从另一个角度看、除此之外、还有一个问题、还有一个情况、这件事后面还有一个原因。",
  "下一句必须具体。错误：这件事还有一个原因。正确：外面的风也越来越大了。错误：我还想补充一个小细节。正确：你要不要穿件外套？",
  "长度控制在 8 到 20 个汉字左右，可以自然使用标点。只生成一句简体中文，不要解释，不要英文，不要拼音。",
  "如果 previousSuggestions 里已有类似句子，这次换一个同场景的具体接法，比如换成询问句、感受句、观察句或建议句。",
  '只返回 JSON：{"suggestion":"..."}',
].join("\n");

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export async function POST(req: Request) {
  let fallbackInput: GuidedFollowupInput = {};

  try {
    const body = (await req.json()) as {
      currentChinese?: unknown;
      userEnglish?: unknown;
      recommendedEnglish?: unknown;
      turns?: GuidedTurn[];
      previousSuggestions?: unknown[];
      refreshKey?: unknown;
    };

    const currentChinese = cleanText(body.currentChinese);
    const userEnglish = cleanText(body.userEnglish);
    const recommendedEnglish = cleanText(body.recommendedEnglish);
    const fallbackContext =
      currentChinese || recommendedEnglish || userEnglish;
    const turns = Array.isArray(body.turns)
      ? body.turns
          .map((turn) => ({
            chinese: cleanText(turn.chinese),
            recommendedEnglish: cleanText(turn.recommendedEnglish),
          }))
          .filter((turn) => turn.chinese || turn.recommendedEnglish)
          .slice(-6)
      : [];
    const previousSuggestions = Array.isArray(body.previousSuggestions)
      ? body.previousSuggestions
      : [];
    const refreshKey =
      typeof body.refreshKey === "number" && Number.isFinite(body.refreshKey)
        ? body.refreshKey
        : 0;
    fallbackInput = {
      currentChinese,
      previousSuggestions,
      recommendedEnglish,
      userEnglish,
      variantIndex: refreshKey,
    };

    if (!fallbackContext) {
      return NextResponse.json({ suggestion: "" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        suggestion: createGuidedFollowupSuggestion(fallbackInput),
        source: "fallback",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: NATIVE_CHINESE_FOLLOWUP_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify({
            currentChinese,
            learnerTranscript: userEnglish,
            previousSuggestions,
            recommendedEnglish,
            recentTurns: turns,
            refreshKey,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as FollowupResponse;
    const suggestion = normalizeGuidedFollowupSuggestion(
      parsed.suggestion,
      fallbackInput
    );

    return NextResponse.json({
      suggestion,
    });
  } catch {
    return NextResponse.json({
      suggestion:
        createGuidedFollowupSuggestion(fallbackInput) ||
        "你现在感觉怎么样？",
      source: "fallback",
    });
  }
}
