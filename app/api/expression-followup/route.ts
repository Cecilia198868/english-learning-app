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
  "你是英语口语训练 App 里的中文引导教练，也是一位中文母语写作者。",
  "你的任务不是把英文翻译回中文，而是根据上下文写一句中国人日常生活里会顺口说出来的下一句中文。",
  "生成前先在心里判断：如果这句话像英文直译、翻译腔、书面腔、英语思维中文，就必须重写。",
  "语义优先级必须严格遵守：currentChinese 和 recommendedEnglish 是事实来源；learnerTranscript 只是可能有错的语音识别文本，不能用来新增人物、物品、地点、原因、事件或情节。如果 learnerTranscript 与中文或推荐英文冲突，必须忽略 learnerTranscript。",
  "如果 currentChinese 缺失，但 learnerTranscript 有内容，可以把 learnerTranscript 当作上一句的大致情景线索，用中文自然接下一句；不要纠错英文，不要翻译腔。",
  "中文风格要求：口语、自然、顺口、有中国人表达习惯；可以有生活化语气，但不要网络梗、不要夸张、不要硬凑成书面句。",
  "不要出现这些翻译腔：'我正在享受...'、'这让我感觉...'、'这是一个...'、'为了这个项目我需要...'、'我将会...'、'它使我...'。",
  "好句子的感觉示例：'我有点担心他太累了，想提醒他早点休息。'、'这事儿我还想再确认一下，免得后面麻烦。'、'忙了一天以后，能安安静静歇会儿就挺舒服。'",
  "要求：1. 保持情景连续性；2. 让情绪或细节自然递进；3. 像真实日常生活；4. 适合初中级学习者；5. 只生成一句简体中文，12到28个汉字左右，可自然使用标点；6. 不要解释，不要给英文；7. 不要用英文单词或拼音。",
  "如果 previousSuggestions 里已经出现过类似句子，这次必须换一个新的角度，比如细节、感受、下一步动作、原因或观察。",
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
        "我还想补充一个小细节。",
      source: "fallback",
    });
  }
}
