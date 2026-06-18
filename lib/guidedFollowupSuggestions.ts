export type GuidedFollowupInput = {
  currentChinese?: unknown;
  recommendedEnglish?: unknown;
  userEnglish?: unknown;
  previousSuggestions?: unknown[];
  variantIndex?: unknown;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeIndex(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function suggestionKey(value: string) {
  return cleanText(value).replace(/[。！？!?，,\s]/g, "").toLowerCase();
}

function pickSuggestion(
  candidates: string[],
  previousSuggestions: unknown[] = [],
  variantIndex: unknown = 0
) {
  const previousKeys = new Set(
    previousSuggestions.map((value) => suggestionKey(cleanText(value))).filter(Boolean)
  );
  const startIndex = normalizeIndex(variantIndex);

  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(startIndex + offset) % candidates.length];
    if (!previousKeys.has(suggestionKey(candidate))) return candidate;
  }

  return candidates[startIndex % candidates.length] || candidates[0];
}

function getContextText(input: GuidedFollowupInput) {
  const currentChinese = cleanText(input.currentChinese);

  return {
    currentChinese,
    contextText: [
      currentChinese,
      cleanText(input.recommendedEnglish),
      cleanText(input.userEnglish),
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function getCandidateSuggestions(contextText: string) {
  if (/公园|散步|花|玫瑰|风景|景色|草地|park|walk|rose|flower/i.test(contextText)) {
    return [
      "我想拍几张照片留作纪念。",
      "我们还在花丛旁边坐了一会儿。",
      "空气很清新，我觉得心情也变好了。",
      "下次我还想带家人一起来这里。",
      "我还注意到旁边有很多人在散步。",
    ];
  }

  if (/天气|太阳|晒|舒服|后院|户外|晴|热|冷|weather|sun|sunny|outside|yard/i.test(contextText)) {
    return [
      "这样的天气很适合出去走走。",
      "我想找个阴凉的地方坐一会儿。",
      "外面的空气让我感觉放松了很多。",
      "如果下午不太热，我还想再出去一下。",
    ];
  }

  if (/累|疲惫|休息|放松|困|忙|tired|rest|relax|busy/i.test(contextText)) {
    return [
      "我想找个安静的地方休息一下。",
      "等我缓一缓，再继续做别的事情。",
      "今天先别安排太多事情了。",
      "我只想安安静静地放松一会儿。",
    ];
  }

  if (/开心|高兴|喜欢|享受|有趣|好玩|happy|like|enjoy|fun/i.test(contextText)) {
    return [
      "我想把这件事分享给朋友听。",
      "这种感觉让我一整天都很开心。",
      "我希望以后还能多遇到这样的事情。",
      "想到这里，我忍不住又笑了。",
    ];
  }

  if (/担心|紧张|害怕|问题|麻烦|worried|nervous|afraid|problem/i.test(contextText)) {
    return [
      "我有点担心后面还会出问题。",
      "所以我想先把情况问清楚。",
      "如果可以的话，我希望有人帮我确认一下。",
      "我不想等到最后才发现麻烦。",
    ];
  }

  if (/饿|吃|饭|咖啡|茶|餐厅|hungry|eat|food|coffee|tea|restaurant/i.test(contextText)) {
    return [
      "等一下我想去买点好吃的。",
      "我们可以找一家安静的店坐坐。",
      "我还想点一杯热咖啡。",
      "吃完以后，我们再慢慢聊。",
    ];
  }

  if (/买|购物|商店|价格|贵|便宜|buy|shop|store|price|expensive|cheap/i.test(contextText)) {
    return [
      "我想先比较一下价格再决定。",
      "如果质量不错，我可能会直接买下来。",
      "我还想问问有没有其他颜色。",
      "买之前我得确认一下尺寸合不合适。",
    ];
  }

  return [
    "我还想补充一个小细节。",
    "这件事后面还有一个原因。",
    "我想换个角度再说一句。",
    "接下来我想说说我的想法。",
  ];
}

export function createGuidedFollowupSuggestion(input: GuidedFollowupInput) {
  const { contextText } = getContextText(input);
  const candidates = getCandidateSuggestions(contextText);

  if (!contextText) return "";

  return pickSuggestion(
    candidates,
    input.previousSuggestions,
    input.variantIndex
  );
}

export function normalizeGuidedFollowupSuggestion(
  value: unknown,
  input: GuidedFollowupInput
) {
  const fallback = createGuidedFollowupSuggestion(input);
  const suggestion = cleanText(value)
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/^(下一句|可以说|中文|建议|推荐中文)[:：]\s*/u, "")
    .trim();

  if (!suggestion) return fallback;

  const hasEnglish = /[A-Za-z]{2,}/.test(suggestion);
  const looksLikeExplanation = /英文|翻译|表达|可以这样说|JSON|suggestion/i.test(
    suggestion
  );
  const looksTooLong = Array.from(suggestion).length > 42;
  const repeatsPrevious = (input.previousSuggestions || []).some(
    (previous) => suggestionKey(cleanText(previous)) === suggestionKey(suggestion)
  );

  if (hasEnglish || looksLikeExplanation || looksTooLong || repeatsPrevious) {
    return fallback;
  }

  return suggestion;
}
