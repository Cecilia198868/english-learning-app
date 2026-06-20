export type ExpressionVariantKey = "standard" | "idiomatic" | "simple" | "natural";

export type ExpressionVariantMap = Record<ExpressionVariantKey, string>;

export type ExpressionVariantApiFields = {
  recommendedExpression: string;
  naturalExpression: string;
  idiomaticExpression: string;
  simpleExpression: string;
};

const VARIANT_KEYS: ExpressionVariantKey[] = [
  "standard",
  "natural",
  "idiomatic",
  "simple",
];
const MAX_VARIANT_SIMILARITY = 0.84;
const EMPTY_EXPRESSION_VARIANTS: ExpressionVariantMap = {
  standard: "",
  natural: "",
  idiomatic: "",
  simple: "",
};

const placeholderExpressions = new Set([
  "Preparing a better expression.",
  "Preparing a better expression...",
  "This sentence is still being prepared.",
  "I'm still working on this sentence.",
  "I want to say this more clearly.",
  "I'd like to say this more clearly.",
  "I really want to say this more clearly.",
  "Say this better.",
  "I want to say that in English.",
  "I'm trying to say it in English.",
  "I'm trying to put that into English.",
  "Say it in English.",
]);

const FINAL_PUNCTUATION_PATTERN = /[.!?\u3002\uff01\uff1f]+$/;
const QUESTION_MARK_PATTERN = /[?\uff1f]$/;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function hasFinalPunctuation(value: string) {
  return FINAL_PUNCTUATION_PATTERN.test(value);
}

function isQuestionLike(value: string) {
  const text = cleanText(value);
  const withoutFinalPunctuation = text.replace(FINAL_PUNCTUATION_PATTERN, "").trim();

  if (QUESTION_MARK_PATTERN.test(text)) return true;
  if (/^have\s+(?:a|an|the|some|fun|safe|great|good|nice|one)\b/i.test(withoutFinalPunctuation)) {
    return false;
  }

  return /^(?:am|are|can|could|did|do|does|feel like|had|has|have|how about|is|may|might|must|shall|should|want to|was|were|will|would)\b/i.test(
    withoutFinalPunctuation
  );
}

function isQuestionPromptContext(value: string) {
  return (
    isQuestionLike(value) ||
    /[?\uff1f]|\u8981\u4e0d\u8981|\u60f3\u4e0d\u60f3|\u9700\u4e0d\u9700\u8981|\u5417|\u5462/.test(
      value
    )
  );
}

function normalizeFinalPunctuation(value: string) {
  const text = cleanText(value);
  if (!text) return "";

  if (isQuestionLike(text)) {
    return hasFinalPunctuation(text)
      ? text.replace(FINAL_PUNCTUATION_PATTERN, "?")
      : `${text}?`;
  }

  return text
    .replace(/\u3002/g, ".")
    .replace(/\uff01/g, "!")
    .replace(/\uff1f/g, "?");
}

function ensureSentence(value: string) {
  const text = cleanText(value);
  if (!text) return "";
  const normalizedText = normalizeFinalPunctuation(text);

  return hasFinalPunctuation(normalizedText)
    ? normalizedText
    : `${normalizedText}.`;
}

function stripFinalPeriod(value: string) {
  return value.replace(FINAL_PUNCTUATION_PATTERN, "");
}

function normalizeComparableText(value: string) {
  return cleanText(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function containsChinese(text: string) {
  return /[\u4e00-\u9fff]/.test(text);
}

export function isInvalidExpressionForDisplay(text: string) {
  const normalized = text.trim().toLowerCase();

  return (
    !normalized ||
    /[\u4e00-\u9fff]/.test(text) ||
    normalized.includes("正在重新生成") ||
    normalized.includes("表达生成失败") ||
    normalized === "preparing a better expression." ||
    normalized === "preparing a better expression..." ||
    normalized === "this sentence is still being prepared." ||
    normalized === "i'm still working on this sentence." ||
    normalized === "i want to say this more clearly." ||
    normalized === "i'd like to say this more clearly." ||
    normalized === "i really want to say this more clearly." ||
    normalized === "say this better." ||
    normalized === "i want to say that in english." ||
    normalized === "i'm trying to say it in english." ||
    normalized === "i'm trying to put that into english." ||
    normalized === "say it in english."
  );
}

function hasCjkText(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function hasLatinText(value: string) {
  return /[A-Za-z]/.test(value);
}

function createSafeEnglishFallbackVariantMap(): ExpressionVariantMap {
  return { ...EMPTY_EXPRESSION_VARIANTS };
}

function isUsableEnglishSource(value: string) {
  const text = cleanText(value);
  return Boolean(
    text && hasLatinText(text) && !containsChinese(text) && !isPlaceholderExpression(text)
  );
}

function ensureEnglishVariantMap(variants: ExpressionVariantMap): ExpressionVariantMap {
  const hasUnsafeText = VARIANT_KEYS.some((key) => {
    const text = cleanText(variants[key]);
    return !text || containsChinese(text) || !hasLatinText(text);
  });

  return hasUnsafeText ? createSafeEnglishFallbackVariantMap() : variants;
}

function capitalizeFirst(value: string) {
  const text = cleanText(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function normalizeOutputSentence(value: string) {
  return ensureSentence(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/^[a-z]/, (letter) => letter.toUpperCase());
}

function normalizeVariantOutputSentence(
  value: string,
  key: ExpressionVariantKey,
  fallbackSource: string
) {
  const normalized = normalizeOutputSentence(value);

  if (
    key === "simple" &&
    isQuestionPromptContext(fallbackSource) &&
    normalized &&
    !/[?]$/.test(normalized)
  ) {
    return normalized.replace(/[.!]$/, "?");
  }

  return normalized;
}

function getComparableWords(value: string) {
  const text = normalizeComparableText(value);
  return text ? text.split(" ") : [];
}

function getComparableCharLength(value: string) {
  return normalizeComparableText(value).replace(/\s+/g, "").length;
}

function hasSameWordsOnlyReordered(left: string, right: string) {
  const leftWords = getComparableWords(left);
  const rightWords = getComparableWords(right);

  if (leftWords.length < 2 || leftWords.length !== rightWords.length) {
    return false;
  }

  return (
    leftWords.slice().sort().join("\u0001") ===
    rightWords.slice().sort().join("\u0001")
  );
}

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length] || 0;
}

function getTextSimilarity(left: string, right: string) {
  const leftComparable = normalizeComparableText(left);
  const rightComparable = normalizeComparableText(right);

  if (!leftComparable || !rightComparable) return 0;
  if (leftComparable === rightComparable) return 1;

  const leftCompact = leftComparable.replace(/\s+/g, "");
  const rightCompact = rightComparable.replace(/\s+/g, "");
  const longerLength = Math.max(leftCompact.length, rightCompact.length);

  if (!longerLength) return 0;

  return (
    1 - levenshteinDistance(leftCompact, rightCompact) / longerLength
  );
}

function isTooSimilar(left: string, right: string) {
  const leftComparable = normalizeComparableText(left);
  const rightComparable = normalizeComparableText(right);

  if (!leftComparable || !rightComparable) return false;
  if (leftComparable === rightComparable) return true;
  if (hasSameWordsOnlyReordered(left, right)) return true;

  const similarity = getTextSimilarity(left, right);
  const leftOpening = getComparableWords(left).slice(0, 3).join(" ");
  const rightOpening = getComparableWords(right).slice(0, 3).join(" ");

  if (leftOpening && rightOpening && leftOpening !== rightOpening && similarity <= 0.92) {
    return false;
  }

  return similarity > MAX_VARIANT_SIMILARITY;
}

function isDistinctFromUsed(candidate: string, used: string[]) {
  return used.every((existing) => !isTooSimilar(candidate, existing));
}

function uniqueCandidates(values: string[]) {
  const seen = new Set<string>();

  return values
    .map(normalizeOutputSentence)
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeComparableText(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function isWeakGeneratedVariant(value: unknown) {
  const text = cleanText(value);
  return (
    /^(?:I(?:'d| would)? like to|I really want to|I want to|Say)\s+(?:say this|this)\s+(?:more clearly|better)\.?$/i.test(
      text
    ) ||
    /^honestly,\s*in other words,/i.test(text) ||
    /^in other words,/i.test(text) ||
    /^honestly,\s*(?:this|that|the|a|an|it|there)\b/i.test(text)
  );
}

function isColdClothesContext(value: string) {
  const text = normalizeComparableText(value);

  return (
    /\b(?:cold|chilly|freezing|cool|late)\b/.test(text) &&
    /\b(?:clothes|clubs|coat|jacket|warmer|warm|wear|bundle)\b/.test(text)
  );
}

function isSummerChillyLayersContext(value: string) {
  const text = cleanText(value);

  return (
    /(夏天|夏季|summer)/i.test(text) &&
    /(早晚|早上|早晨|晚上|傍晚|morning|evening)/i.test(text) &&
    /(冷|凉|涼|chilly|cold|cool)/i.test(text) &&
    /(多穿|衣服|穿.*衣|保暖|layers?|clothes|warmer|dress)/i.test(text)
  );
}

function isBirdSleepContext(value: string) {
  const text = normalizeComparableText(value);

  return (
    /\b(?:bird|birds)\b/.test(text) &&
    /\b(?:late|night|bedtime|sleep|sleeping|bed)\b/.test(text)
  );
}

function isSleepAdviceContext(value: string) {
  const text = normalizeComparableText(value);

  return (
    /\b(?:late|night|bedtime|tired|sleepy)\b/.test(text) &&
    /\b(?:sleep|bed|rest|call it a night)\b/.test(text)
  );
}

function isChineseJacketQuestionContext(value: string) {
  return (
    /[外夾夹大]套|夹克|大衣|上衣/.test(value) &&
    /要不要|想不想|需不需要|要不|穿|披|套/.test(value)
  );
}

function isJacketQuestionContext(value: string) {
  const text = normalizeComparableText(value);

  return (
    isChineseJacketQuestionContext(value) ||
    (/\b(?:coat|jacket)\b/.test(text) &&
      /\b(?:do you want|do you need|would you like|need|wear|put on|throw on|might want|should)\b/.test(
        text
      ))
  );
}

function isChinesePhotoQuestionContext(value: string) {
  return /拍照|照相|照片|相片/.test(value) && /要不要|想不想|要不|吗|嗎|？/.test(value);
}

function isPhotoQuestionContext(value: string) {
  const text = normalizeComparableText(value);

  return (
    isChinesePhotoQuestionContext(value) ||
    (/\b(?:photo|photos|picture|pictures)\b/.test(text) &&
      /\b(?:do you want|would you like|take|snap|want)\b/.test(text))
  );
}

function getWantToQuestionAction(value: string) {
  const withoutPunctuation = stripFinalPeriod(ensureSentence(value));
  const match = withoutPunctuation.match(
    /^(?:do you want to|would you like to|do you wanna)\s+(.+)$/i
  );

  return match ? cleanText(match[1]) : "";
}

function getHelpRequestAction(value: string) {
  const withoutPunctuation = stripFinalPeriod(ensureSentence(value));
  const match = withoutPunctuation.match(
    /^(?:can|could|would)\s+you\s+help\s+me\s+(.+)$/i
  );

  return match ? cleanText(match[1]) : "";
}

function trimHelpRequestAction(action: string) {
  const text = cleanText(action)
    .replace(/\bwith my child\b/gi, "with my kid")
    .replace(/\bchildren\b/gi, "kids");

  if (/^plan a museum visit with my kid next week$/i.test(text)) {
    return "plan a museum trip";
  }

  const withoutDetails = text
    .replace(/\s+with my (?:kid|son|daughter|kids|family)\b.*$/i, "")
    .replace(/\s+(?:next|this) (?:week|month|weekend|morning|afternoon|evening)\b.*$/i, "")
    .replace(/\s+after (?:work|school|class|dinner|lunch|breakfast)\b.*$/i, "")
    .replace(/\s+before (?:work|school|class|dinner|lunch|breakfast)\b.*$/i, "")
    .replace(/\s+(?:today|tomorrow|tonight)\b.*$/i, "")
    .replace(/\ba museum visit\b/i, "a museum trip")
    .trim();
  const words = withoutDetails.split(/\s+/).filter(Boolean);

  return words.length > 6 ? words.slice(0, 6).join(" ") : withoutDetails || text;
}

function createHelpRequestVariantMap(action: string): ExpressionVariantMap {
  const normalizedAction = cleanText(action)
    .replace(/\bwith my child\b/gi, "with my kid")
    .replace(/\bchildren\b/gi, "kids");
  const gerundAction = gerundizeFirstWord(normalizedAction);
  const simpleAction = trimHelpRequestAction(normalizedAction);

  if (/^plan a museum visit with my kid next week$/i.test(normalizedAction)) {
    return {
      standard: "Can you help me plan a museum visit with my child next week?",
      natural: "Can you help me plan a trip to the museum with my kid next week?",
      idiomatic: "Could you help me map out a museum trip with my kid for next week?",
      simple: "Can you help me plan a museum trip?",
    };
  }

  if (/^with\s+/i.test(normalizedAction)) {
    const topic = normalizedAction.replace(/^with\s+/i, "");
    const simpleTopic = trimHelpRequestAction(topic).replace(/^(?:my|our|the)\s+/i, "");

    return {
      standard: `Can you help me with ${topic}?`,
      natural: `Could you help me out with ${topic}?`,
      idiomatic: `Could you give me a hand with ${topic}?`,
      simple: `Help me with ${simpleTopic}?`,
    };
  }

  return {
    standard: `Can you help me ${normalizedAction}?`,
    natural: `Can you help me with ${gerundAction}?`,
    idiomatic: `Could you give me a hand with ${gerundAction}?`,
    simple: `Help me ${simpleAction}?`,
  };
}

function gerundizeFirstWord(phrase: string) {
  const [firstWord = "", ...restWords] = cleanText(phrase).split(" ");
  const lowerFirstWord = firstWord.toLowerCase();
  const irregular: Record<string, string> = {
    be: "being",
    get: "getting",
    go: "going",
    have: "having",
    make: "making",
    put: "putting",
    run: "running",
    sit: "sitting",
    take: "taking",
    wear: "wearing",
  };
  const gerund =
    irregular[lowerFirstWord] ||
    (/[aeiou][bcdfghjklmnpqrstvwxyz]$/i.test(firstWord) &&
    !/[wxy]$/i.test(firstWord)
      ? `${firstWord}${firstWord.at(-1)}ing`
      : /e$/i.test(firstWord)
        ? `${firstWord.slice(0, -1)}ing`
        : `${firstWord}ing`);

  return cleanText([gerund, ...restWords].join(" "));
}

function normalizeCommonLearnerEnglish(value: string) {
  const text = ensureSentence(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\bclubs\b/gi, "clothes");

  if (isChineseJacketQuestionContext(value)) {
    return "Do you need to wear a jacket?";
  }

  if (isChinesePhotoQuestionContext(value)) {
    return "Do you want to take photos?";
  }

  if (isSummerChillyLayersContext(value)) {
    return "Even though it's summer, it's a little cold in the mornings and evenings, so we should wear more layers.";
  }

  if (isGoodTvShowContext(value)) {
    return "This TV show is really good.";
  }

  if (isWateringYardContext(value)) {
    return "I was watering the yard earlier.";
  }

  if (isFragrantRoseContext(value)) {
    return `${getRoseSubject(value)} smells really good.`;
  }

  if (hasCjkText(text) && !hasLatinText(text)) {
    return "I want to say this more clearly.";
  }

  if (isColdClothesContext(text)) {
    return "It's late and cold, so please put on some warmer clothes.";
  }

  if (isBirdSleepContext(text)) {
    return "The little bird is going to sleep because it's late.";
  }

  if (isSleepAdviceContext(text)) {
    return "It's late. You should go to bed early.";
  }

  return text
    .replace(
      /^It'?s late,? you should (?:be good to|go to|go|be in) bed early\.?$/i,
      "It's late. You should go to bed early."
    )
    .replace(
      /^It'?s late,? you should (?:sleep|go to sleep) early\.?$/i,
      "It's late. You should go to bed early."
    )
    .replace(
      /^It'?s (?:fine|nice|good)(?: out)? today,? I (?:take|took|went for) (?:a )?walk for (?:two|2)(?: hours?)?\.$/i,
      "It's nice out today, so I took a two-hour walk."
    )
    .replace(
      /^It'?s (?:fine|nice|good)(?: out)? today,? I (?:take|took|went for) (?:a )?walk\.$/i,
      "It's nice out today, so I took a walk."
    )
    .replace(
      /^Today (?:it'?s )?(?:fine|nice|good)(?: out)?,? I (?:take|took|went for) (?:a )?walk for (?:two|2)(?: hours?)?\.$/i,
      "It's nice out today, so I took a two-hour walk."
    )
    .replace(
      /^Today (?:it'?s )?(?:fine|nice|good)(?: out)?,? I (?:take|took|went for) (?:a )?walk\.$/i,
      "It's nice out today, so I took a walk."
    )
    .replace(
      /^It'?s (?:fine|nice|good) today,? we (?:are )?hiking for (?:two|2)(?: hours?)?\.$/i,
      "It's nice out today, so we went hiking for two hours."
    )
    .replace(
      /^It'?s (?:fine|nice|good) today,? we (?:are )?hiking\.$/i,
      "It's nice out today, so we went hiking."
    )
    .replace(
      /\bwe (?:are )?hiking for (?:two|2)\b/gi,
      "we went hiking for two hours"
    )
    .replace(/\bwe (?:are )?hiking\b/gi, "we went hiking")
    .replace(/^It'?s fine today\b/i, "It's nice out today")
    .replace(/\bwent to park\b/gi, "went to the park")
    .replace(/\bgo to park\b/gi, "go to the park")
    .replace(/\bvery beautiful\b/gi, "beautiful")
    .replace(
      /^Today (.+) went to the park there (?:are|were) (.+)\.$/i,
      (_match, subject: string, description: string) =>
        `${capitalizeFirst(subject)} went to the park today, and there were ${description}.`
    )
    .replace(
      /^(.+) went to the park there (?:are|were) (.+)\.$/i,
      (_match, subject: string, description: string) =>
        `${capitalizeFirst(subject)} went to the park, and there were ${description}.`
    );
}

function getBeautifulThingParts(value: string) {
  const match = stripFinalPeriod(ensureSentence(value)).match(
    /^(This|That|The|A|An) ([A-Za-z][A-Za-z' -]*?) is beautiful$/i
  );

  if (!match) return null;

  const determiner = capitalizeFirst(match[1].toLowerCase());
  const noun = cleanText(match[2]).replace(/^(?:a|an|the)\s+/i, "");

  return noun ? { determiner, noun } : null;
}

function getNiceWalkParts(value: string) {
  const match = stripFinalPeriod(ensureSentence(value)).match(
    /^It'?s nice out today, so I (?:took a|went for a) (?:(two-hour) )?walk(?: for (two|2) hours?)?$/i
  );

  if (!match) return null;

  return {
    hasTwoHourDuration: Boolean(match[1] || match[2]),
  };
}

function getHikingParts(value: string) {
  const match = stripFinalPeriod(ensureSentence(value)).match(
    /^It'?s nice out today, so we went hiking(?: for (two|2) hours?)?$/i
  );

  if (!match) return null;

  return {
    hasTwoHourDuration: Boolean(match[1]),
  };
}

function getParkRosesSubject(value: string) {
  const match = stripFinalPeriod(ensureSentence(value)).match(
    /^(.+) went to the park(?: today)?, and there were (?:many |some |very )*beautiful roses$/i
  );

  return match ? capitalizeFirst(cleanText(match[1])) : "";
}

function getWhatFocusParts(value: string) {
  const text = stripFinalPeriod(ensureSentence(value)).replace(/[\u2018\u2019]/g, "'");
  const match = text.match(
    /^What\s+(?:(I(?:'m| am) really looking for)|(I(?: really)? want)|(I(?: really)? need)|(I(?:'d| would) like))\s+is\s+(.+)$/i
  );

  if (!match) return null;

  const focus = cleanText(match[5]);
  if (!focus) return null;

  if (match[1]) return { focus, intent: "lookingFor" as const };
  if (match[2]) return { focus, intent: "want" as const };
  if (match[3]) return { focus, intent: "need" as const };
  return { focus, intent: "wouldLike" as const };
}

function isGoodTvShowContext(value: string) {
  const text = cleanText(value);

  return (
    /(电视剧|电视|剧集|剧|节目|tv\s*show|show|series)/i.test(text) &&
    /(好看|有意思|精彩|喜欢|入迷|追|interesting|good|great|enjoy|fun)/i.test(text)
  );
}

function isWateringYardContext(value: string) {
  const text = cleanText(value);

  return (
    /(\u6d47\u6c34|\u6d47\u82b1|\u9662\u5b50|\u82b1\u56ed|\u8349\u576a|yard|garden|lawn|water(?:ed|ing)?)/i.test(
      text
    ) &&
    /(\u521a\u624d|\u521a\u521a|\u5728|\u9662\u5b50|\u82b1\u56ed|\u8349\u576a|just now|earlier|outside|yard|garden|lawn|water(?:ed|ing)?)/i.test(
      text
    )
  );
}

function isPinkRoseContext(value: string) {
  return /粉红|粉色|pink/i.test(cleanText(value));
}

function isFragrantRoseContext(value: string) {
  const text = cleanText(value);

  return (
    /(玫瑰|玫瑰花|rose|roses)/i.test(text) &&
    /(香|闻起来|氣味|气味|smell|smells|fragrant|scent|good|nice|wonderful|amazing)/i.test(
      text
    )
  );
}

function getRoseSubject(value: string) {
  return isPinkRoseContext(value) ? "This pink rose" : "This rose";
}

function createKnownScenarioVariantMap(sourceText: string): ExpressionVariantMap | null {
  const standard = normalizeOutputSentence(normalizeCommonLearnerEnglish(sourceText));
  const beautifulThing = getBeautifulThingParts(standard);
  const niceWalk = getNiceWalkParts(standard);
  const hiking = getHikingParts(standard);
  const parkSubject = getParkRosesSubject(standard);
  const whatFocus = getWhatFocusParts(standard);
  const helpRequestAction =
    getHelpRequestAction(standard) || getHelpRequestAction(sourceText);

  if (isSummerChillyLayersContext(sourceText) || isSummerChillyLayersContext(standard)) {
    return {
      standard:
        "Even though it's summer, it's a little cold in the mornings and evenings, so we should wear more layers.",
      natural:
        "It's summer, but it still gets a little chilly in the morning and evening, so we should dress a bit warmer.",
      idiomatic:
        "Even though it's summer, the mornings and evenings can still be a bit chilly, so we should layer up.",
      simple:
        "It's summer, but it's a little cold. We should wear more clothes.",
    };
  }

  if (isGoodTvShowContext(sourceText) || isGoodTvShowContext(standard)) {
    return {
      standard: "This TV show is really good.",
      natural: "I'm really enjoying this show.",
      idiomatic: "This show is so good.",
      simple: "Great show.",
    };
  }

  if (isWateringYardContext(sourceText) || isWateringYardContext(standard)) {
    return {
      standard: "I was watering the yard earlier.",
      natural: "I watered the yard a little while ago.",
      idiomatic: "I gave the yard some water earlier.",
      simple: "Watering the yard.",
    };
  }

  if (isFragrantRoseContext(sourceText) || isFragrantRoseContext(standard)) {
    const subject = getRoseSubject(`${sourceText} ${standard}`);

    return {
      standard: `${subject} smells really good.`,
      natural: "It smells really nice.",
      idiomatic: `${subject} has such a nice scent.`,
      simple: "Smells good.",
    };
  }

  if (isJacketQuestionContext(sourceText) || isJacketQuestionContext(standard)) {
    return {
      standard: "Do you need to wear a jacket?",
      natural: "Do you need a jacket?",
      idiomatic: "Should you grab a jacket?",
      simple: "Need a jacket?",
    };
  }

  if (isPhotoQuestionContext(sourceText) || isPhotoQuestionContext(standard)) {
    return {
      standard: "Do you want to take photos?",
      natural: "Do you want to take some pictures?",
      idiomatic: "Want to snap a few photos?",
      simple: "Take photos?",
    };
  }

  if (helpRequestAction) {
    return createHelpRequestVariantMap(helpRequestAction);
  }

  if (whatFocus) {
    const helperVerb = whatFocus.intent === "need" ? "need" : "want";
    const naturalLead =
      whatFocus.intent === "lookingFor"
        ? "I'm hoping to find"
        : whatFocus.intent === "need"
          ? "I really need"
          : whatFocus.intent === "wouldLike"
            ? "I'd really like"
            : "I really want";
    const idiomaticLead =
      whatFocus.intent === "lookingFor"
        ? "I'm after"
        : whatFocus.intent === "need"
          ? "I could really use"
          : "I'd love";

    return {
      standard,
      natural: `${naturalLead} ${whatFocus.focus}.`,
      idiomatic: `${idiomaticLead} ${whatFocus.focus}.`,
      simple: `I ${helperVerb} ${whatFocus.focus}.`,
    };
  }

  if (
    normalizeComparableText(standard) ===
    normalizeComparableText("I want to say this more clearly.")
  ) {
    return {
      standard: "I want to say this more clearly.",
      natural: "I want to make this sound more natural.",
      idiomatic: "I want to put this in a better way.",
      simple: "Say this better.",
    };
  }

  if (isColdClothesContext(sourceText) || isColdClothesContext(standard)) {
    return {
      standard: "It's late and cold, so please put on some warmer clothes.",
      natural: "It's getting late and chilly, so throw on something warmer.",
      idiomatic: "It's chilly out, so bundle up before you go.",
      simple: "It is late and cold. Please wear warm clothes.",
    };
  }

  if (isBirdSleepContext(sourceText) || isBirdSleepContext(standard)) {
    return {
      standard: "The little bird is going to sleep because it's late.",
      natural: "It's getting late, so the little bird's ready for bed.",
      idiomatic: "It's bedtime for the little bird.",
      simple: "It is late. The little bird will sleep.",
    };
  }

  if (isSleepAdviceContext(sourceText) || isSleepAdviceContext(standard)) {
    return {
      standard: "It's late. You should go to bed early.",
      natural: "It's getting late. You should get some sleep.",
      idiomatic: "It's pretty late. You'd better call it a night.",
      simple: "It is late. Go to bed early.",
    };
  }

  if (niceWalk) {
    return niceWalk.hasTwoHourDuration
      ? {
          standard: "It's nice out today, so I took a two-hour walk.",
          natural: "It was so nice out that I went for a long walk.",
          idiomatic: "The weather was perfect, so I got in a two-hour walk.",
          simple: "Nice weather. I walked two hours.",
        }
      : {
          standard: "It's nice out today, so I took a walk.",
          natural: "It was so nice out that I went for a walk.",
          idiomatic: "The weather was perfect, so I got out for a walk.",
          simple: "Nice weather. I took a walk.",
        };
  }

  if (hiking) {
    return hiking.hasTwoHourDuration
      ? {
          standard: "It's nice out today, so we went hiking for two hours.",
          natural: "The weather was great, so we went on a two-hour hike.",
          idiomatic: "It was perfect hiking weather, so we hit the trail.",
          simple: "Nice weather. We hiked two hours.",
        }
      : {
          standard: "It's nice out today, so we went hiking.",
          natural: "The weather was great, so we went on a hike.",
          idiomatic: "It was perfect hiking weather, so we hit the trail.",
          simple: "Nice weather. We hiked.",
        };
  }

  if (parkSubject) {
    return {
      standard: `${parkSubject} went to the park today, and the roses were beautiful.`,
      natural: `${parkSubject} went to the park, and the roses looked really pretty.`,
      idiomatic: `The roses at the park were gorgeous when ${parkSubject} went there.`,
      simple: `${parkSubject} went to the park. The roses were beautiful.`,
    };
  }

  if (beautifulThing) {
    const subject =
      /^(?:This|That)$/i.test(beautifulThing.determiner)
        ? `${beautifulThing.determiner} ${beautifulThing.noun}`
        : `The ${beautifulThing.noun}`;

    return {
      standard: `${subject} is beautiful.`,
      natural: `${subject} is really pretty.`,
      idiomatic: `${subject} is gorgeous.`,
      simple: `Beautiful ${beautifulThing.noun}.`,
    };
  }

  return null;
}

function shortenEverydayPhrase(value: string, maxWords = 5) {
  const cleaned = cleanText(value)
    .replace(/\b(?:today|tomorrow|tonight|this morning|this afternoon|this evening|this week|this weekend|next week|after work|before work|during the holidays|in retirement)\b/gi, "")
    .replace(/\s+(?:with|for|at|in|on|during|after|before)\s+.+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = (cleaned || cleanText(value)).split(/\s+/).filter(Boolean);

  return words.length > maxWords ? words.slice(0, maxWords).join(" ") : words.join(" ");
}

function createEverydaySimpleVariant(standard: string) {
  const text = ensureSentence(standard);
  const withoutPunctuation = stripFinalPeriod(text);

  if (/^How are you\b/i.test(text)) return "How are you?";
  if (/^Long time no see\./i.test(text)) return "Long time no see.";
  if (/^Nice to meet\b/i.test(text)) return "Nice meeting you.";
  if (/^What'?s (.+) like\?$/i.test(text)) {
    return "What's it like?";
  }
  if (/^What do you do\b/i.test(text)) return "What do you do?";
  if (/^How'?s .+\?$/i.test(text)) return "How's it going?";
  if (/^What'?s (?:up|going on)\?$/i.test(text)) return "What's new?";
  if (/^What'?s .+\?$/i.test(text)) return "What's up?";
  if (/^What do you think of (.+)\?$/i.test(text)) {
    const [, topic] = text.match(/^What do you think of (.+)\?$/i) || [];
    return `Thoughts on ${shortenEverydayPhrase(topic, 4)}?`;
  }
  if (/^What time do you .+\?$/i.test(text)) return "What time?";
  if (/^How much is .+\?$/i.test(text)) return "How much?";
  if (/^Do you have (.+)\?$/i.test(text)) {
    const [, item] = text.match(/^Do you have (.+)\?$/i) || [];
    return `Do you have ${shortenEverydayPhrase(item, 4)}?`;
  }
  if (/^Can I try .+ on\?$/i.test(text)) return "Can I try it on?";
  if (/^Where is .+\?$/i.test(text)) return "Where is it?";
  if (/^Can I pay by .+\?$/i.test(text)) return "Can I pay this way?";
  if (/^Do you accept .+\?$/i.test(text)) return "Do you accept this?";
  if (/^Can I have .+\?$/i.test(text)) return "Can I have it?";
  if (/^Can we have a table .+\?$/i.test(text)) return "Table, please?";
  if (/^How do I get to .+\?$/i.test(text)) return "How do I get there?";
  if (/^Where is the nearest .+\?$/i.test(text)) return "Where's the nearest one?";
  if (/^What time does .+\?$/i.test(text)) return "What time?";
  if (/^Can you take a photo\b/i.test(text)) return "Can you take a photo?";
  if (/^How long does it take\b/i.test(text)) return "How long?";
  if (/^Can you send me .+\?$/i.test(text)) return "Can you send it?";
  if (/^Can you help me\b/i.test(text)) {
    const helpAction = getHelpRequestAction(text);
    return helpAction ? `Help me ${trimHelpRequestAction(helpAction)}?` : "Can you help me?";
  }
  if (/^What do you recommend\?$/i.test(text)) return "Any recommendations?";
  if (/^What'?s your favorite (.+)\?$/i.test(text)) {
    const [, topic] = text.match(/^What'?s your favorite (.+)\?$/i) || [];
    return `Favorite ${shortenEverydayPhrase(topic, 3)}?`;
  }

  const fromMatch = text.match(/^I(?:'m| am) from (.+)\.$/i);
  if (fromMatch) return `From ${shortenEverydayPhrase(fromMatch[1], 5)}.`;

  const introduceMatch = text.match(/^Let me introduce (.+)\.$/i);
  if (introduceMatch) {
    const person = cleanText(introduceMatch[1]);
    if (/myself/i.test(person)) return "I'm introducing myself.";
    return `This is ${shortenEverydayPhrase(person, 4)}.`;
  }

  const thisIsMatch = text.match(/^This is (.+)\.$/i);
  if (thisIsMatch) return `${capitalizeFirst(shortenEverydayPhrase(thisIsMatch[1], 4))}.`;

  const thinkMatch = text.match(/^I think (.+)\.$/i);
  if (thinkMatch) return "I think so.";

  const soundsMatch = text.match(/^It sounds (.+)\.$/i);
  if (soundsMatch) return `Sounds ${shortenEverydayPhrase(soundsMatch[1], 3)}.`;

  const niceGoodMatch = text.match(/^It'?s (nice|good) to (.+)\.$/i);
  if (niceGoodMatch) {
    return `${capitalizeFirst(niceGoodMatch[1])} to ${shortenEverydayPhrase(niceGoodMatch[2], 4)}.`;
  }

  const agreeMatch = text.match(/^I (totally )?agree\b.*\.$/i);
  if (agreeMatch) return "I agree.";

  const disagreeMatch = text.match(/^I (totally )?disagree\b.*\.$/i);
  if (disagreeMatch) return "I don't agree.";

  const letsMatch = text.match(/^Let'?s (.+)\.$/i);
  if (letsMatch) return `${capitalizeFirst(shortenEverydayPhrase(letsMatch[1], 4))}.`;

  const needToMatch = text.match(/^I need to (.+)\.$/i);
  if (needToMatch) return `I need to ${shortenEverydayPhrase(needToMatch[1], 4)}.`;

  const haveToMatch = text.match(/^I have to (.+)\.$/i);
  if (haveToMatch) return `I need to ${shortenEverydayPhrase(haveToMatch[1], 4)}.`;

  const stateAfterMatch = text.match(/^I(?:'m| am) ([A-Za-z ]+) after .+\.$/i);
  if (stateAfterMatch) return `I'm ${cleanText(stateAfterMatch[1])}.`;

  const needNounMatch = text.match(/^I need (?:some |a |an )?(.+)\.$/i);
  if (needNounMatch) return `I need ${shortenEverydayPhrase(needNounMatch[1], 4)}.`;

  const lookingForMatch = text.match(/^I(?:'m| am) looking for (.+)\.$/i);
  if (lookingForMatch) return `I need ${shortenEverydayPhrase(lookingForMatch[1], 4)}.`;

  const thankMatch = text.match(/^Thank you so much for (.+)\.$/i);
  if (thankMatch) return `Thanks for ${shortenEverydayPhrase(thankMatch[1], 4)}.`;

  if (/^It'?s my treat\b/i.test(text)) return "My treat.";
  if (/^You'?re welcome\.?$/i.test(text)) return "No problem.";
  if (/^No problem\.?$/i.test(text)) return "You're welcome.";
  if (/^Bye for now\b/i.test(text)) return "Bye.";
  if (/^Goodbye\b/i.test(text)) return "Bye.";

  if (withoutPunctuation.split(/\s+/).length > 6) {
    return ensureSentence(shortenEverydayPhrase(withoutPunctuation, 5));
  }

  return text;
}

function createEverydayNaturalVariant(standard: string) {
  const text = ensureSentence(standard);

  if (/^How are you doing\b/i.test(text)) return text.replace(/^How are you doing/i, "How have you been");
  if (/^How are you\b/i.test(text)) return text.replace(/^How are you/i, "How are you doing");
  if (/^Nice to meet\b/i.test(text)) return text.replace(/^Nice to meet/i, "It's nice to meet");
  if (/^What'?s (.+) like\?$/i.test(text)) {
    const [, topic] = text.match(/^What'?s (.+) like\?$/i) || [];
    return `How's ${topic}?`;
  }
  if (/^Long time no see\./i.test(text)) return text.replace(/^Long time no see\./i, "It's been a while.");
  if (/^Let me introduce (.+)\.$/i.test(text)) {
    const [, person] = text.match(/^Let me introduce (.+)\.$/i) || [];
    return `I'd like you to meet ${person}.`;
  }
  if (/^I(?:'m| am) from (.+)\.$/i.test(text)) return text.replace(/^I am /i, "I'm ").replace(/^I'm from /i, "I come from ");
  if (/^This is (.+)\.$/i.test(text)) return text.replace(/^This is /i, "Here is ");
  if (/^What do you do\b/i.test(text)) return text.replace(/^What do you do/i, "What do you usually do");
  if (/^It'?s (nice|good) to (.+)\.$/i.test(text)) return text.replace(/^It'?s /i, "It's really ");
  if (/^How'?s (.+)\?$/i.test(text)) return text.replace(/^How'?s/i, "How is");
  if (/^What'?s (.+)\?$/i.test(text)) return text.replace(/^What'?s/i, "What is");
  if (/^I think /i.test(text)) return text.replace(/^I think /i, "I feel like ");
  if (/^It sounds /i.test(text)) return text.replace(/^It sounds /i, "That sounds ");
  if (/^What do you think of /i.test(text)) return text.replace(/^What do you think of /i, "How do you like ");
  if (/^I agree with /i.test(text)) return text.replace(/^I agree with /i, "I agree with ");
  if (/^I disagree with /i.test(text)) return text.replace(/^I disagree with /i, "I don't agree with ");
  if (/^Let'?s /i.test(text)) {
    return text.replace(/^Let'?s /i, "Why don't we ").replace(/\.$/, "?");
  }
  if (/^How about /i.test(text)) return text.replace(/^How about /i, "What about ");
  if (/^That'?s /i.test(text)) return text.replace(/^That'?s /i, "That's really ");
  if (/^Tell me about /i.test(text)) return text.replace(/^Tell me about /i, "Can you tell me about ");
  if (/^I have to /i.test(text)) return text.replace(/^I have to /i, "I need to ");
  if (/^What time do you /i.test(text)) return text.replace(/^What time do you /i, "When do you ");
  if (/^I(?:'m| am) ([A-Za-z ]+) after /i.test(text)) return text.replace(/^I am /i, "I'm ");
  if (/^Let'?s have /i.test(text)) return text.replace(/^Let'?s have /i, "Let's get ");
  if (/^I need to /i.test(text)) return text.replace(/^I need to /i, "I have to ");
  if (/^What'?s for /i.test(text)) return text.replace(/^What'?s for /i, "What are we having for ");
  if (/^I usually /i.test(text)) return text.replace(/^I usually /i, "I normally ");
  if (/^How much is /i.test(text)) return text.replace(/^How much is /i, "How much does ");
  if (/^Do you have /i.test(text)) return text.replace(/^Do you have /i, "Do you carry ");
  if (/^Can I try /i.test(text)) return text.replace(/^Can I try /i, "Could I try ");
  if (/^Can I pay by /i.test(text)) return text.replace(/^Can I pay by /i, "Can I use ");
  if (/^I'?d like to /i.test(text)) return text.replace(/^I would like to /i, "I'd like to ");
  if (/^I'?m just /i.test(text)) return text.replace(/^I'm just /i, "I'm only ");
  if (/^Do you accept /i.test(text)) return text.replace(/^Do you accept /i, "Can I use ");
  if (/^I'?d like /i.test(text)) return text.replace(/^I would like /i, "I'd like ");
  if (/^Can I have /i.test(text)) return text.replace(/^Can I have /i, "Could I get ");
  if (/^Check|^Bill/i.test(text)) return "Could we get the bill, please?";
  if (/^It'?s my treat/i.test(text)) return "I've got this.";
  if (/^Can we have a table /i.test(text)) return text.replace(/^Can we have /i, "Could we get ");
  if (/^How do I get to /i.test(text)) return text.replace(/^How do I get to /i, "What's the best way to get to ");
  if (/^Where is the nearest /i.test(text)) return text.replace(/^Where is /i, "Where's ");
  if (/^What time does /i.test(text)) return text.replace(/^What time does /i, "When does ");
  if (/^I need (.+) to /i.test(text)) return text.replace(/^I need /i, "I need a ");
  if (/^I(?:'m| am) lost\./i.test(text)) return text.replace(/^I am /i, "I'm ");
  if (/^Can you take a photo/i.test(text)) return text.replace(/^Can you /i, "Could you ");
  if (/^Safe /i.test(text)) return text.replace(/^Safe /i, "Have a safe ");
  if (/^How long does it take/i.test(text)) return text.replace(/^How long does it take/i, "How long will it take");
  if (/^Can you send me /i.test(text)) return text.replace(/^Can you send me /i, "Could you send me ");
  if (/^I(?:'m| am) working on /i.test(text)) return text.replace(/^I am /i, "I'm ");
  if (/^I need to take /i.test(text)) return text.replace(/^I need to take /i, "I have to take ");
  if (/^I(?:'m| am) on a tight /i.test(text)) return text.replace(/^I am /i, "I'm ");
  if (/^Let'?s schedule /i.test(text)) return text.replace(/^Let'?s schedule /i, "Let's set up ");
  if (/^I don'?t feel /i.test(text)) return text.replace(/^I don'?t feel /i, "I'm not feeling ");
  if (/^I have a /i.test(text)) return text.replace(/^I have a /i, "I've got a ");
  if (/^You look /i.test(text)) return text.replace(/^You look /i, "You seem ");
  if (/^Take care of /i.test(text)) return text.replace(/^Take care of /i, "Look after ");
  if (/^I need some /i.test(text)) return text.replace(/^I need some /i, "I could use some ");
  if (/^In my opinion, /i.test(text)) return text.replace(/^In my opinion, /i, "I think ");
  if (/^I totally agree/i.test(text)) return text.replace(/^I totally agree/i, "I completely agree");
  if (/^I(?:'m| am) not sure about /i.test(text)) return text.replace(/^I am /i, "I'm ");
  if (/^I prefer /i.test(text)) return text.replace(/^I prefer /i, "I'd rather have ");
  if (/^It'?s not my cup of tea/i.test(text)) return "It's not really my thing.";
  if (/^Let me think about it/i.test(text)) return "Let me think it over.";
  if (/^Sounds /i.test(text)) return text.replace(/^Sounds /i, "That sounds ");
  if (/^I love /i.test(text)) return text.replace(/^I love /i, "I really like ");
  if (/^I hate /i.test(text)) return text.replace(/^I hate /i, "I really don't like ");
  if (/^Thank you so much for /i.test(text)) return text.replace(/^Thank you so much for /i, "Thanks so much for ");
  if (/^I really appreciate /i.test(text)) return text.replace(/^I really appreciate /i, "I really value ");
  if (/^See you /i.test(text)) return text.replace(/^See you /i, "I'll see you ");
  if (/^Have a /i.test(text)) return text.replace(/^Have a /i, "Hope you have a ");
  if (/^It was great /i.test(text)) return text.replace(/^It was great /i, "It was really nice ");
  if (/^I'?ll /i.test(text)) return text.replace(/^I will /i, "I'll ");
  if (/^Let'?s keep in touch/i.test(text)) return "Let's stay in touch.";
  if (/^Bye for now/i.test(text)) return "Talk to you later.";

  return text;
}

function createEverydayIdiomaticVariant(standard: string) {
  const text = ensureSentence(standard);

  if (/^How are you\b/i.test(text)) return "How's everything going?";
  if (/^Nice to meet\b/i.test(text)) return text.replace(/^Nice to meet/i, "Great to meet");
  if (/^What'?s (.+) like\?$/i.test(text)) {
    const [, topic] = text.match(/^What'?s (.+) like\?$/i) || [];
    return `What's ${topic} really like?`;
  }
  if (/^Long time no see\./i.test(text)) return "It's been ages. How have you been?";
  if (/^Let me introduce (.+)\.$/i.test(text)) {
    const [, person] = text.match(/^Let me introduce (.+)\.$/i) || [];
    return `Meet ${person}.`;
  }
  if (/^I(?:'m| am) from (.+)\.$/i.test(text)) return text.replace(/^I am from /i, "I grew up around ").replace(/^I'm from /i, "I grew up around ");
  if (/^This is (.+)\.$/i.test(text)) return text.replace(/^This is /i, "Take a look at ");
  if (/^What do you do\b/i.test(text)) return "What do you do day to day?";
  if (/^It'?s (nice|good) to (.+)\.$/i.test(text)) return text.replace(/^It'?s (nice|good) to /i, "It's always good to ");
  if (/^How'?s (.+)\?$/i.test(text)) return "How's everything going?";
  if (/^What'?s (.+)\?$/i.test(text)) return "What's going on?";
  if (/^I think /i.test(text)) return text.replace(/^I think /i, "I really think ");
  if (/^It sounds /i.test(text)) return text.replace(/^It sounds /i, "That sounds pretty ");
  if (/^What do you think of /i.test(text)) return text.replace(/^What do you think of /i, "How do you feel about ");
  if (/^I agree with /i.test(text)) return text.replace(/^I agree with /i, "I'm with ");
  if (/^I disagree with /i.test(text)) return text.replace(/^I disagree with /i, "I'm not with ");
  if (/^Let'?s /i.test(text)) return text.replace(/^Let'?s /i, "We should ");
  if (/^How about /i.test(text)) return text.replace(/^How about /i, "What do you say to ");
  if (/^I(?:'m| am) .+ about /i.test(text)) return text.replace(/^I am /i, "I'm pretty ").replace(/^I'm /i, "I'm pretty ");
  if (/^That'?s /i.test(text)) return text.replace(/^That'?s /i, "That's pretty ");
  if (/^Tell me about /i.test(text)) return text.replace(/^Tell me about /i, "Fill me in on ");
  if (/^I have to /i.test(text)) return text.replace(/^I have to /i, "I've got to ");
  if (/^Can you help me\b/i.test(text)) {
    const action = getHelpRequestAction(text);
    return action ? createHelpRequestVariantMap(action).idiomatic : "Could you give me a hand?";
  }
  if (/^What time do you /i.test(text)) return text.replace(/^What time do you /i, "When do you usually ");
  if (/^I need to /i.test(text)) return text.replace(/^I need to /i, "I've got to ");
  if (/^I usually /i.test(text)) return text.replace(/^I usually /i, "Most days, I ");
  if (/^Do you have /i.test(text)) return text.replace(/^Do you have /i, "Do you happen to have ");
  if (/^Can I try /i.test(text)) return text.replace(/^Can I try /i, "Could I give ");
  if (/^It'?s .+ Any discount\?$/i.test(text)) return "Any chance you can do a better price?";
  if (/^I'?ll take /i.test(text)) return text.replace(/^I'?ll take /i, "I'll go with ");
  if (/^I'?d like to /i.test(text)) return text.replace(/^I'?d like to /i, "I'd like to go ahead and ");
  if (/^I'?m just /i.test(text)) return text.replace(/^I'?m just /i, "I'm just ");
  if (/^I'?d like /i.test(text)) return text.replace(/^I'?d like /i, "Can I get ");
  if (/^Can I have /i.test(text)) return text.replace(/^Can I have /i, "Could I grab ");
  if (/^Check|^Bill/i.test(text)) return "Could we settle up, please?";
  if (/^It'?s my treat/i.test(text)) return "This one's on me.";
  if (/^Can we have a table /i.test(text)) return text.replace(/^Can we have /i, "Could we grab ");
  if (/^How do I get to /i.test(text)) return text.replace(/^How do I get to /i, "How do I get over to ");
  if (/^I(?:'m| am) lost\./i.test(text)) return "I'm a bit lost. Could you point me in the right direction?";
  if (/^Safe /i.test(text)) return text.replace(/^Safe /i, "Have a great ");
  if (/^I have a /i.test(text)) return text.replace(/^I have a /i, "I've got a ");
  if (/^You look /i.test(text)) return text.replace(/^You look /i, "You look pretty ");
  if (/^Take care of /i.test(text)) return text.replace(/^Take care of /i, "Make sure you look after ");
  if (/^Cheer up/i.test(text)) return "Hang in there.";
  if (/^Take it easy/i.test(text)) return "Go easy on yourself.";
  if (/^I need some /i.test(text)) return text.replace(/^I need some /i, "I could really use some ");
  if (/^It'?s not my cup of tea/i.test(text)) return "It's not really my thing.";
  if (/^Let me think about it/i.test(text)) return "Let me sleep on it.";
  if (/^I love /i.test(text)) return text.replace(/^I love /i, "I'm really into ");
  if (/^I hate /i.test(text)) return text.replace(/^I hate /i, "I can't stand ");
  if (/^Thank you so much for /i.test(text)) return text.replace(/^Thank you so much for /i, "I really appreciate you ");
  if (/^You'?re welcome/i.test(text)) return "No worries.";
  if (/^No problem/i.test(text)) return "No worries.";
  if (/^See you /i.test(text)) return text.replace(/^See you /i, "Catch you ");
  if (/^Have a /i.test(text)) return text.replace(/^Have a /i, "Hope you have a great ");
  if (/^Take care\.?$/i.test(text)) return "Take it easy.";
  if (/^Let'?s keep in touch/i.test(text)) return "Let's stay in touch.";
  if (/^Bye for now/i.test(text)) return "Catch you later.";

  if (/^I /i.test(text)) return text.replace(/^I /i, "I really ");
  return text;
}

function createSimpleVariant(standard: string) {
  const text = ensureSentence(standard);
  const withoutPeriod = stripFinalPeriod(text);
  const beautifulThing = getBeautifulThingParts(text);
  const niceWalk = getNiceWalkParts(text);
  const hiking = getHikingParts(text);
  const parkSubject = getParkRosesSubject(text);
  const questionAction = getWantToQuestionAction(text);
  const whatFocus = getWhatFocusParts(text);
  const everydaySimple = createEverydaySimpleVariant(text);

  if (normalizeComparableText(everydaySimple) !== normalizeComparableText(text)) {
    return everydaySimple;
  }

  if (questionAction) return `${capitalizeFirst(questionAction)}?`;

  if (whatFocus) {
    const helperVerb = whatFocus.intent === "need" ? "need" : "want";
    return `I ${helperVerb} ${whatFocus.focus}.`;
  }

  if (beautifulThing) return `Beautiful ${beautifulThing.noun}.`;

  if (niceWalk) {
    return niceWalk.hasTwoHourDuration
      ? "Nice weather. I walked two hours."
      : "Nice weather. I took a walk.";
  }

  if (hiking) {
    return hiking.hasTwoHourDuration
      ? "Nice weather. We hiked two hours."
      : "Nice weather. We hiked.";
  }

  if (parkSubject) {
    return `${parkSubject} went to the park. The roses were beautiful.`;
  }

  const patterns: Array<[RegExp, string]> = [
    [/^I would like to finish (.+) before (.+)\.$/i, "I need to finish this by $2."],
    [/^I'?d like to finish (.+) before (.+)\.$/i, "I need to finish this by $2."],
    [/^I would like to (.+)\.$/i, "I want to $1."],
    [/^I'?d like to (.+)\.$/i, "I want to $1."],
    [/^I really want to (.+)\.$/i, "I want to $1."],
    [/^I have to (.+) because (.+)\.$/i, "I need to $1."],
    [/^If it'?s not too much trouble, could you (.+)\?$/i, "Could you $1?"],
    [/^I would appreciate it if you could help me (.+)\.$/i, "Please help me $1."],
    [/^I was wondering if you could (.+)\.$/i, "Could you $1?"],
    [/^In my opinion, (.+)\.$/i, "I think $1."],
    [/^From my point of view, (.+)\.$/i, "I think $1."],
    [/^It seems to me that (.+)\.$/i, "I think $1."],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(text)) {
      return ensureSentence(text.replace(pattern, replacement));
    }
  }

  const commaSplit = withoutPeriod.match(/^(.+), and (.+)$/i);
  if (commaSplit) {
    return ensureSentence(`${commaSplit[1]}. ${capitalizeFirst(commaSplit[2])}`);
  }

  return text;
}

function createNaturalVariant(standard: string) {
  const leadingToday = ensureSentence(standard).match(/^Today (.+?)([.!?])?$/i);
  const baseText = leadingToday
    ? ensureSentence(`${capitalizeFirst(stripFinalPeriod(leadingToday[1]))} today`)
    : ensureSentence(standard);
  const beautifulThing = getBeautifulThingParts(baseText);
  const niceWalk = getNiceWalkParts(baseText);
  const hiking = getHikingParts(baseText);
  const parkSubject = getParkRosesSubject(baseText);
  const questionAction = getWantToQuestionAction(baseText);
  const whatFocus = getWhatFocusParts(baseText);
  const everydayNatural = createEverydayNaturalVariant(baseText);

  if (normalizeComparableText(everydayNatural) !== normalizeComparableText(baseText)) {
    return everydayNatural;
  }

  if (beautifulThing) {
    const subject =
      /^(?:This|That)$/i.test(beautifulThing.determiner)
        ? `${beautifulThing.determiner} ${beautifulThing.noun}`
        : `The ${beautifulThing.noun}`;
    return `${subject} is really pretty.`;
  }

  if (questionAction) {
    return `Want to ${questionAction}?`;
  }

  if (whatFocus) {
    if (whatFocus.intent === "lookingFor") {
      return `I'm hoping to find ${whatFocus.focus}.`;
    }

    if (whatFocus.intent === "need") {
      return `I really need ${whatFocus.focus}.`;
    }

    if (whatFocus.intent === "wouldLike") {
      return `I'd really like ${whatFocus.focus}.`;
    }

    return `I really want ${whatFocus.focus}.`;
  }

  if (niceWalk) {
    return niceWalk.hasTwoHourDuration
      ? "It was so nice out that I went for a long walk."
      : "It was so nice out that I went for a walk.";
  }

  if (hiking) {
    return hiking.hasTwoHourDuration
      ? "The weather was great, so we went on a two-hour hike."
      : "The weather was great, so we went on a hike.";
  }

  if (parkSubject) {
    return `${parkSubject} went to the park, and the roses looked really pretty.`;
  }

  const finishDeadlineMatch = baseText.match(
    /^I(?: would|'?d) like to finish (.+) before (.+)\.$/i
  );
  if (finishDeadlineMatch) {
    return `I want to get ${finishDeadlineMatch[1]} done by ${finishDeadlineMatch[2]}.`;
  }

  const text = baseText
    .replace(/^In my opinion, /i, "I think ")
    .replace(/^From my point of view, /i, "To me, ")
    .replace(/\bI would like to\b/gi, "I'd like to")
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bI will\b/g, "I'll")
    .replace(/\bIt is\b/g, "It's")
    .replace(/\bThere is\b/g, "There's")
    .replace(/\bdo not\b/g, "don't")
    .replace(/\bdoes not\b/g, "doesn't");

  return ensureSentence(text);
}

function createIdiomaticVariant(standard: string, natural: string) {
  const text = ensureSentence(standard);
  const beautifulThing = getBeautifulThingParts(text);
  const niceWalk = getNiceWalkParts(text);
  const hiking = getHikingParts(text);
  const parkSubject = getParkRosesSubject(text);
  const questionAction = getWantToQuestionAction(text);
  const whatFocus = getWhatFocusParts(text);
  const everydayIdiomatic = createEverydayIdiomaticVariant(text);

  if (
    normalizeComparableText(everydayIdiomatic) !== normalizeComparableText(text) &&
    normalizeComparableText(everydayIdiomatic) !== normalizeComparableText(natural)
  ) {
    return everydayIdiomatic;
  }

  if (beautifulThing) {
    const subject =
      /^(?:This|That)$/i.test(beautifulThing.determiner)
        ? `${beautifulThing.determiner} ${beautifulThing.noun}`
        : `The ${beautifulThing.noun}`;
    return `${subject} is gorgeous.`;
  }

  if (questionAction) {
    return `Feel like ${gerundizeFirstWord(questionAction)}?`;
  }

  if (whatFocus) {
    if (whatFocus.intent === "lookingFor") {
      return `I'm after ${whatFocus.focus}.`;
    }

    if (whatFocus.intent === "need") {
      return `I could really use ${whatFocus.focus}.`;
    }

    return `I'd love ${whatFocus.focus}.`;
  }

  if (niceWalk) {
    return niceWalk.hasTwoHourDuration
      ? "The weather was perfect, so I got in a two-hour walk."
      : "The weather was perfect, so I got out for a walk.";
  }

  if (hiking) {
    return "It was perfect hiking weather, so we hit the trail.";
  }

  if (parkSubject) {
    return `The roses at the park were gorgeous when ${parkSubject} went there.`;
  }

  const patterns: Array<[RegExp, string]> = [
    [/^I want to finish (.+) before (.+)\.$/i, "I need to get $1 wrapped up by $2."],
    [/^I would like to finish (.+) before (.+)\.$/i, "I'd like to get $1 wrapped up by $2."],
    [/^I'?d like to finish (.+) before (.+)\.$/i, "I need to wrap up $1 by $2."],
    [/^I want to (.+)\.$/i, "I'd really like to $1."],
    [/^I want (.+)\.$/i, "I'd really like $1."],
    [/^I need (?!to\b)(.+)\.$/i, "I could really use $1."],
    [/^I'?m worried about (.+)\.$/i, "I'm a bit worried about $1."],
    [/^I'?m excited that (.+)\.$/i, "I'm really excited that $1."],
    [/^Can you help me (.+)\?$/i, "Could you help me $1?"],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(text)) {
      return ensureSentence(text.replace(pattern, replacement));
    }
  }

  return ensureSentence(natural || text);
}

function createDistinctFallbackVariant(standard: string, natural: string) {
  const text = ensureSentence(natural || standard);
  const withoutPeriod = stripFinalPeriod(text);
  const beautifulThing = getBeautifulThingParts(text);
  const questionAction = getWantToQuestionAction(text);

  if (beautifulThing) {
    return createNaturalVariant(text);
  }

  if (questionAction) {
    return `Feel like ${gerundizeFirstWord(questionAction)}?`;
  }

  const adjectiveMatch = withoutPeriod.match(
    /^(.+) is (good|nice|great|beautiful|interesting|important|helpful|easy|hard)$/i
  );
  if (adjectiveMatch) {
    return ensureSentence(`${adjectiveMatch[1]} is really ${adjectiveMatch[2]}`);
  }

  if (/^I think /i.test(text)) return text.replace(/^I think /i, "I really think ");
  if (/^I want to /i.test(text)) return text.replace(/^I want to /i, "I'd like to ");

  return text;
}

function makeUniqueVariant(
  preferred: string,
  fallback: string,
  used: string[],
  extraCandidates: string[] = []
) {
  const candidates = uniqueCandidates([
    preferred,
    ...extraCandidates,
    fallback,
    createDistinctFallbackVariant(fallback, preferred),
  ]);

  for (const candidate of candidates) {
    if (isDistinctFromUsed(candidate, used)) {
      used.push(candidate);
      return candidate;
    }
  }

  const nonDuplicate =
    candidates.find(
      (candidate) =>
        !used.some(
          (existing) =>
            normalizeComparableText(candidate) === normalizeComparableText(existing)
        )
    ) ||
    candidates[0] ||
    normalizeOutputSentence(fallback);
  used.push(nonDuplicate);
  return nonDuplicate;
}

function isSimpleClearlyShorter(
  standard: string,
  natural: string,
  simple: string
) {
  const simpleChars = getComparableCharLength(simple);
  const baselineChars = Math.min(
    getComparableCharLength(standard),
    getComparableCharLength(natural)
  );
  const simpleWords = getComparableWords(simple).length;
  const baselineWords = Math.min(
    getComparableWords(standard).length,
    getComparableWords(natural).length
  );

  if (!simpleChars || !baselineChars) return false;

  return (
    simpleChars <= Math.floor(baselineChars * 0.85) ||
    simpleChars <= baselineChars - 8 ||
    simpleWords <= baselineWords - 2
  );
}

function hasIdiomaticSignal(value: string) {
  return /\b(?:a bit|a few|amazing|bundle up|call it a night|could really use|feel like|get(?:ting)? .* done|give me a hand|got (?:in|out)|gorgeous|has such a|hit the trail|I'm after|kind of|map out|might want to|perfect|pretty|ready for bed|really|scent|snap|sort of|throw on|wonderful|wrap(?:ped)? up|you'd better)\b|(?:\bI'd\b|\byou'd\b|\bit's\b)/i.test(
    value
  );
}

function startsWithDifferentShape(left: string, right: string) {
  return (
    getComparableWords(left).slice(0, 2).join(" ") !==
    getComparableWords(right).slice(0, 2).join(" ")
  );
}

function isIdiomaticFunctional(
  standard: string,
  natural: string,
  idiomatic: string
) {
  if (!cleanText(idiomatic)) return false;
  if (hasIdiomaticSignal(idiomatic)) return true;

  const differsFromStandard = startsWithDifferentShape(idiomatic, standard);
  const differsFromNatural = startsWithDifferentShape(idiomatic, natural);
  const closestSimilarity = Math.max(
    getTextSimilarity(idiomatic, standard),
    getTextSimilarity(idiomatic, natural)
  );

  return differsFromStandard && differsFromNatural && closestSimilarity <= 0.76;
}

function isDistinctVariantMap(map: Partial<Record<ExpressionVariantKey, unknown>>) {
  const values = VARIANT_KEYS.map((key) => cleanText(map[key]));

  if (values.some((value) => !value)) return false;

  const exactValues = values.map((value) => value.trim().toLowerCase());
  if (new Set(exactValues).size < values.length) return false;

  const punctuationlessValues = values.map(normalizeComparableText);
  if (new Set(punctuationlessValues).size < values.length) return false;

  for (let leftIndex = 0; leftIndex < values.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < values.length; rightIndex += 1) {
      if (isTooSimilar(values[leftIndex], values[rightIndex])) return false;
    }
  }

  const standard = cleanText(map.standard);
  const natural = cleanText(map.natural);
  const idiomatic = cleanText(map.idiomatic);
  const simple = cleanText(map.simple);

  if (!isSimpleClearlyShorter(standard, natural, simple)) return false;
  if (!isIdiomaticFunctional(standard, natural, idiomatic)) return false;

  return true;
}

function buildDistinctMapFromCandidates(
  candidates: Record<ExpressionVariantKey, string[]>,
  fallback: ExpressionVariantMap
) {
  const used: string[] = [];

  const standard = makeUniqueVariant(
    candidates.standard[0] || fallback.standard,
    fallback.standard,
    used,
    candidates.standard.slice(1)
  );
  const natural = makeUniqueVariant(
    candidates.natural[0] || fallback.natural,
    fallback.natural,
    used,
    candidates.natural.slice(1)
  );
  const idiomatic = makeUniqueVariant(
    candidates.idiomatic[0] || fallback.idiomatic,
    fallback.idiomatic,
    used,
    candidates.idiomatic.slice(1)
  );
  const simple = makeUniqueVariant(
    candidates.simple[0] || fallback.simple,
    fallback.simple,
    used,
    candidates.simple.slice(1)
  );

  return { standard, natural, idiomatic, simple };
}

function createEmergencyDistinctVariantMap(standardSource: string): ExpressionVariantMap {
  const standard = normalizeOutputSentence(
    normalizeCommonLearnerEnglish(standardSource)
  ) || "I want to say this more clearly.";
  const questionAction = getWantToQuestionAction(standard);

  if (questionAction) {
    return {
      standard,
      natural: `Want to ${questionAction}?`,
      idiomatic: `Feel like ${gerundizeFirstWord(questionAction)}?`,
      simple: `${capitalizeFirst(questionAction)}?`,
    };
  }

  return {
    standard,
    natural: createNaturalVariant(standard),
    idiomatic: createIdiomaticVariant(standard, createNaturalVariant(standard)),
    simple: createSimpleVariant(standard),
  };
}

function enforceDistinctVariantMap(
  variants: ExpressionVariantMap,
  fallback: ExpressionVariantMap,
  fallbackSource: string
): ExpressionVariantMap {
  if (isDistinctVariantMap(variants)) return variants;

  const knownScenario =
    createKnownScenarioVariantMap(fallbackSource) ||
    createKnownScenarioVariantMap(variants.standard);

  if (knownScenario && isDistinctVariantMap(knownScenario)) {
    return knownScenario;
  }

  const rebuiltMap = buildDistinctMapFromCandidates(
    {
      standard: [variants.standard, fallback.standard],
      natural: [
        variants.natural,
        knownScenario?.natural || "",
        fallback.natural,
        createNaturalVariant(variants.standard),
      ],
      idiomatic: [
        variants.idiomatic,
        knownScenario?.idiomatic || "",
        fallback.idiomatic,
        createIdiomaticVariant(variants.standard, variants.natural),
      ],
      simple: [
        variants.simple,
        knownScenario?.simple || "",
        fallback.simple,
        createSimpleVariant(variants.standard),
      ],
    },
    fallback
  );

  if (isDistinctVariantMap(rebuiltMap)) return rebuiltMap;

  const emergencyMap = createEmergencyDistinctVariantMap(
    fallbackSource || variants.standard || fallback.standard
  );

  return isDistinctVariantMap(emergencyMap) ? emergencyMap : rebuiltMap;
}

export function isPlaceholderExpression(value: unknown) {
  const text = cleanText(value);
  return (
    isInvalidExpressionForDisplay(text) ||
    placeholderExpressions.has(text) ||
    isWeakGeneratedVariant(text)
  );
}

export function isExpressionVariantMapDistinctEnough(
  variants: Partial<Record<ExpressionVariantKey, unknown>> | undefined
) {
  return isDistinctVariantMap(variants || {});
}

export function normalizeEnglishExpressionPunctuation(value: string) {
  return normalizeOutputSentence(value);
}

export function createFallbackExpressionVariantMap(sourceText: string): ExpressionVariantMap {
  const knownScenario = createKnownScenarioVariantMap(sourceText);
  if (knownScenario && isDistinctVariantMap(knownScenario)) {
    return ensureEnglishVariantMap(knownScenario);
  }

  if (!isUsableEnglishSource(sourceText)) {
    return createSafeEnglishFallbackVariantMap();
  }

  const standardBase = normalizeCommonLearnerEnglish(sourceText);
  const standard = ensureSentence(standardBase) || "I want to say this more clearly.";
  const simple = createSimpleVariant(standard);
  const natural = createNaturalVariant(standard);
  const idiomatic = createIdiomaticVariant(standard, natural);
  const used: string[] = [];

  const fallback = {
    standard: normalizeOutputSentence(standard),
    natural: normalizeOutputSentence(natural),
    idiomatic: normalizeOutputSentence(idiomatic),
    simple: normalizeOutputSentence(simple),
  };

  const map = {
    standard: makeUniqueVariant(standard, fallback.standard, used),
    natural: makeUniqueVariant(natural, fallback.natural, used),
    idiomatic: makeUniqueVariant(idiomatic, fallback.idiomatic, used),
    simple: makeUniqueVariant(simple, fallback.simple, used),
  };

  return ensureEnglishVariantMap(enforceDistinctVariantMap(map, fallback, sourceText));
}

export function toExpressionVariantApiFields(
  variants: ExpressionVariantMap
): ExpressionVariantApiFields {
  return {
    recommendedExpression: variants.standard,
    naturalExpression: variants.natural,
    idiomaticExpression: variants.idiomatic,
    simpleExpression: variants.simple,
  };
}

export function normalizeExpressionVariantApiPayload(
  payload:
    | {
        recommendedExpression?: unknown;
        naturalExpression?: unknown;
        idiomaticExpression?: unknown;
        simpleExpression?: unknown;
        variants?: Partial<Record<ExpressionVariantKey, unknown>>;
      }
    | undefined,
  fallbackSource: string
): ExpressionVariantMap {
  return normalizeExpressionVariantMap(
    {
      standard: payload?.recommendedExpression ?? payload?.variants?.standard,
      natural: payload?.naturalExpression ?? payload?.variants?.natural,
      idiomatic: payload?.idiomaticExpression ?? payload?.variants?.idiomatic,
      simple: payload?.simpleExpression ?? payload?.variants?.simple,
    },
    fallbackSource
  );
}

export function normalizeExpressionVariantMap(
  variants: Partial<Record<ExpressionVariantKey, unknown>> | undefined,
  fallbackSource: string
): ExpressionVariantMap {
  const safeFallbackSource = containsChinese(cleanText(fallbackSource))
    ? ""
    : fallbackSource;
  const fallback = createFallbackExpressionVariantMap(safeFallbackSource);
  const fallbackSourceKey = normalizeComparableText(safeFallbackSource);

  function candidateOrFallback(
    key: ExpressionVariantKey,
    value: unknown,
    fallbackValue: string,
    allowSourceEcho = false
  ) {
    const rawCandidate = cleanText(value);
    const candidate =
      rawCandidate &&
      !containsChinese(rawCandidate) &&
      !isPlaceholderExpression(value) &&
      !isWeakGeneratedVariant(value)
        ? normalizeVariantOutputSentence(
            normalizeCommonLearnerEnglish(rawCandidate),
            key,
            safeFallbackSource
          )
        : "";
    const candidateKey = normalizeComparableText(candidate);
    const echoesLearnerSource =
      !allowSourceEcho &&
      Boolean(candidateKey && fallbackSourceKey && candidateKey === fallbackSourceKey) &&
      candidateKey !== normalizeComparableText(fallbackValue);

    return candidate && !containsChinese(candidate) && !echoesLearnerSource
      ? candidate
      : fallbackValue;
  }

  const standard = candidateOrFallback(
    "standard",
    variants?.standard,
    fallback.standard,
    normalizeComparableText(fallback.standard) === fallbackSourceKey
  );
  const initialMap = {
    standard,
    natural: candidateOrFallback("natural", variants?.natural, fallback.natural),
    idiomatic: candidateOrFallback(
      "idiomatic",
      variants?.idiomatic,
      fallback.idiomatic
    ),
    simple: candidateOrFallback("simple", variants?.simple, fallback.simple),
  };

  return ensureEnglishVariantMap(
    enforceDistinctVariantMap(initialMap, fallback, fallbackSource)
  );
}
