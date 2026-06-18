export type GuidedFollowupInput = {
  currentChinese?: unknown;
  recommendedEnglish?: unknown;
  userEnglish?: unknown;
  previousSuggestions?: unknown[];
  variantIndex?: unknown;
};

const META_LANGUAGE_PATTERNS = [
  /补充/,
  /小细节/,
  /还有.*(?:原因|方面|问题|情况|一点|一件事)/,
  /另(?:外|一个).*(?:角度|方面|问题|情况)/,
  /进一步(?:来说|讲|说明)/,
  /从另一个角度/,
  /除此之外/,
  /值得(?:注意|考虑|一提)/,
  /换个角度/,
  /接下来.*(?:想说|要说)/,
  /我的(?:想法|观点|看法)/,
  /这件事.*(?:原因|方面|问题|情况)/,
];

const QUOTE_EDGE_PATTERN = /^["'“”‘’]+|["'“”‘’]+$/g;
const PREFIX_PATTERN =
  /^(?:下一句|可以说|中文|建议|推荐中文|下一句中文|你可以这样说)[:：\s]*/u;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeIndex(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function suggestionKey(value: string) {
  return cleanText(value).replace(/[。！？!?，,、\s]/g, "").toLowerCase();
}

function countMeaningfulChars(value: string) {
  return Array.from(cleanText(value).replace(/[。！？!?，,、\s]/g, "")).length;
}

function isMetaLanguage(value: string) {
  return META_LANGUAGE_PATTERNS.some((pattern) => pattern.test(value));
}

function isValidFollowup(value: string) {
  const text = cleanText(value);
  const length = countMeaningfulChars(text);

  return Boolean(text) && length >= 6 && length <= 22 && !isMetaLanguage(text);
}

function normalizeSuggestionText(value: unknown) {
  return cleanText(value)
    .replace(QUOTE_EDGE_PATTERN, "")
    .replace(PREFIX_PATTERN, "")
    .trim();
}

function pickSuggestion(
  candidates: string[],
  previousSuggestions: unknown[] = [],
  variantIndex: unknown = 0
) {
  const usableCandidates = candidates.filter(isValidFollowup);
  const previousKeys = new Set(
    previousSuggestions.map((value) => suggestionKey(cleanText(value))).filter(Boolean)
  );
  const startIndex = normalizeIndex(variantIndex);

  for (let offset = 0; offset < usableCandidates.length; offset += 1) {
    const candidate = usableCandidates[(startIndex + offset) % usableCandidates.length];
    if (!previousKeys.has(suggestionKey(candidate))) return candidate;
  }

  return usableCandidates[startIndex % usableCandidates.length] || usableCandidates[0] || "";
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
  if (
    /天气|冷|降温|外套|衣服|风|下雨|下雪|太阳|热|晚了|天黑|weather|cold|coat|clothes|wind|rain|snow|sunny|hot|late/i.test(
      contextText
    )
  ) {
    return [
      "你要不要穿件外套？",
      "外面的风越来越大了。",
      "我们先找个暖和的地方吧。",
      "别冻着了，先回屋吧。",
      "要不要喝点热水？",
    ];
  }

  if (/公园|散步|花|玫瑰|风景|草地|park|walk|rose|flower|garden/i.test(contextText)) {
    return [
      "你想拍几张照片吗？",
      "我们在花旁边坐会儿吧。",
      "这里的空气真舒服。",
      "下次可以带家人来。",
      "那边还有人在散步。",
    ];
  }

  if (/家|妈妈|爸爸|姐姐|妹妹|哥哥|弟弟|孩子|父母|family|mom|dad|sister|brother|parents|kid/i.test(contextText)) {
    return [
      "家里人现在都好吗？",
      "要不要给家里打个电话？",
      "你姐姐当时怎么说？",
      "大家听了应该挺开心。",
      "你想不想多陪陪他们？",
    ];
  }

  if (/买|购物|商店|价格|贵|便宜|颜色|尺寸|buy|shop|store|price|expensive|cheap|color|size/i.test(contextText)) {
    return [
      "这个价格还能便宜点吗？",
      "要不要再试个颜色？",
      "你觉得这个尺寸合适吗？",
      "我们先看看别的款吧。",
      "买之前再确认一下吧。",
    ];
  }

  if (/工作|项目|老板|同事|会议|截止|加班|work|project|boss|meeting|deadline|colleague|overtime/i.test(contextText)) {
    return [
      "老板今天又催你了吗？",
      "要不要先做最急的？",
      "这个项目周五能交吗？",
      "你同事能帮你一点吗？",
      "先把会议材料准备好吧。",
    ];
  }

  if (/旅行|机场|酒店|车票|飞机|火车|行李|路线|travel|trip|airport|hotel|ticket|flight|train|luggage/i.test(contextText)) {
    return [
      "明天的车票订好了吗？",
      "路上会不会太赶了？",
      "行李都收拾好了吗？",
      "我们早点去机场吧。",
      "酒店离车站远不远？",
    ];
  }

  if (/餐厅|吃|饿|饭|咖啡|茶|菜单|点菜|restaurant|hungry|eat|food|coffee|tea|menu|order/i.test(contextText)) {
    return [
      "你想先点点热的吗？",
      "这家店人好像挺多。",
      "我们找个安静的位置吧。",
      "你今天想吃什么？",
      "要不要再点杯热茶？",
    ];
  }

  if (/健康|疼|不舒服|医生|医院|感冒|发烧|休息|health|hurt|pain|doctor|hospital|sick|fever|rest/i.test(contextText)) {
    return [
      "你现在还疼不疼？",
      "要不要先去看医生？",
      "今天先早点休息吧。",
      "别硬撑了，先坐一会儿。",
      "有没有量过体温？",
    ];
  }

  if (/担心|紧张|害怕|问题|麻烦|worried|nervous|afraid|problem|trouble/i.test(contextText)) {
    return [
      "那你打算怎么处理？",
      "要不要先问清楚？",
      "你现在最担心什么？",
      "先别急，我们慢慢看。",
      "对方当时怎么说？",
    ];
  }

  if (/朋友|聊天|开心|高兴|喜欢|好玩|分享|friend|chat|happy|like|enjoy|fun|share/i.test(contextText)) {
    return [
      "你后来怎么跟他说的？",
      "他当时怎么回应你？",
      "这事听起来挺开心的。",
      "你想不想约他出来？",
      "下次你还想一起去吗？",
    ];
  }

  return [
    "你现在感觉怎么样？",
    "那你后来怎么做的？",
    "要不要先问问对方？",
    "对方当时怎么说？",
    "你接下来打算怎么办？",
  ];
}

export function createGuidedFollowupSuggestion(input: GuidedFollowupInput) {
  const { contextText } = getContextText(input);

  if (!contextText) return "";

  return pickSuggestion(
    getCandidateSuggestions(contextText),
    input.previousSuggestions,
    input.variantIndex
  );
}

export function normalizeGuidedFollowupSuggestion(
  value: unknown,
  input: GuidedFollowupInput
) {
  const fallback = createGuidedFollowupSuggestion(input);
  const suggestion = normalizeSuggestionText(value);

  if (!suggestion) return fallback;

  const hasEnglish = /[A-Za-z]{2,}/.test(suggestion);
  const looksLikeExplanation = /英文|翻译|表达|JSON|suggestion/i.test(suggestion);
  const repeatsPrevious = (input.previousSuggestions || []).some(
    (previous) => suggestionKey(cleanText(previous)) === suggestionKey(suggestion)
  );

  if (
    hasEnglish ||
    looksLikeExplanation ||
    repeatsPrevious ||
    !isValidFollowup(suggestion)
  ) {
    return fallback;
  }

  return suggestion;
}
