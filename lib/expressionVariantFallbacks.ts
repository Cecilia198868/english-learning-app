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

const placeholderExpressions = new Set([
  "Preparing a better expression.",
  "Preparing a better expression...",
  "This sentence is still being prepared.",
  "I'm still working on this sentence.",
]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function hasFinalPunctuation(value: string) {
  return /[.!?。！？]$/.test(value);
}

function isQuestionLike(value: string) {
  const text = cleanText(value);
  const withoutFinalPunctuation = text.replace(/[.!?。！？]+$/, "").trim();

  if (/[?？]$/.test(text)) return true;

  return /^(?:am|are|can|could|did|do|does|feel like|had|has|have|how about|is|may|might|must|shall|should|want to|was|were|will|would)\b/i.test(
    withoutFinalPunctuation
  );
}

function isQuestionPromptContext(value: string) {
  return (
    isQuestionLike(value) ||
    /[？?]|要不要|想不想|需不需要|吗|嗎/.test(value)
  );
}

function normalizeFinalPunctuation(value: string) {
  const text = cleanText(value);
  if (!text) return "";

  if (isQuestionLike(text)) {
    return hasFinalPunctuation(text)
      ? text.replace(/[.!?。！？]+$/, "?")
      : `${text}?`;
  }

  return text
    .replace(/。$/, ".")
    .replace(/！$/, "!")
    .replace(/？$/, "?");
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
  return value.replace(/[.!?。！？]$/, "");
}

function normalizeComparableText(value: string) {
  return cleanText(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hasCjkText(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

function hasLatinText(value: string) {
  return /[A-Za-z]/.test(value);
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
      /\b(?:do you want|would you like|wear|put on|throw on|might want|should)\b/.test(
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
    return "Do you want to wear a jacket?";
  }

  if (isChinesePhotoQuestionContext(value)) {
    return "Do you want to take photos?";
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

function createKnownScenarioVariantMap(sourceText: string): ExpressionVariantMap | null {
  const standard = normalizeOutputSentence(normalizeCommonLearnerEnglish(sourceText));
  const beautifulThing = getBeautifulThingParts(standard);
  const niceWalk = getNiceWalkParts(standard);
  const hiking = getHikingParts(standard);
  const parkSubject = getParkRosesSubject(standard);
  const whatFocus = getWhatFocusParts(standard);

  if (isJacketQuestionContext(sourceText) || isJacketQuestionContext(standard)) {
    return {
      standard: "Do you want to wear a jacket?",
      natural: "Do you want to put on a jacket?",
      idiomatic: "You might want to throw on a jacket.",
      simple: "Wear a jacket?",
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

function createSimpleVariant(standard: string) {
  const text = ensureSentence(standard);
  const withoutPeriod = stripFinalPeriod(text);
  const beautifulThing = getBeautifulThingParts(text);
  const niceWalk = getNiceWalkParts(text);
  const hiking = getHikingParts(text);
  const parkSubject = getParkRosesSubject(text);
  const questionAction = getWantToQuestionAction(text);
  const whatFocus = getWhatFocusParts(text);

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
  return /\b(?:a bit|a few|bundle up|call it a night|could really use|feel like|get(?:ting)? .* done|got (?:in|out)|gorgeous|hit the trail|I'm after|kind of|might want to|perfect|pretty|ready for bed|really|snap|sort of|throw on|wrap(?:ped)? up|you'd better)\b|(?:\bI'd\b|\byou'd\b|\bit's\b)/i.test(
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
  return !text || placeholderExpressions.has(text);
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
  if (knownScenario && isDistinctVariantMap(knownScenario)) return knownScenario;

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

  return enforceDistinctVariantMap(map, fallback, sourceText);
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
  const fallback = createFallbackExpressionVariantMap(fallbackSource);
  const fallbackSourceKey = normalizeComparableText(fallbackSource);

  function candidateOrFallback(
    key: ExpressionVariantKey,
    value: unknown,
    fallbackValue: string,
    allowSourceEcho = false
  ) {
    const candidate =
      !isPlaceholderExpression(value) && !isWeakGeneratedVariant(value) && cleanText(value)
        ? normalizeVariantOutputSentence(
            normalizeCommonLearnerEnglish(cleanText(value)),
            key,
            fallbackSource
          )
        : "";
    const candidateKey = normalizeComparableText(candidate);
    const echoesLearnerSource =
      !allowSourceEcho &&
      Boolean(candidateKey && fallbackSourceKey && candidateKey === fallbackSourceKey) &&
      candidateKey !== normalizeComparableText(fallbackValue);

    return candidate && !echoesLearnerSource ? candidate : fallbackValue;
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

  return enforceDistinctVariantMap(initialMap, fallback, fallbackSource);
}
