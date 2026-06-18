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
const MAX_VARIANT_SIMILARITY = 0.7;

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
  return /[.!?]$/.test(value);
}

function ensureSentence(value: string) {
  const text = cleanText(value);
  if (!text) return "";
  return hasFinalPunctuation(text) ? text : `${text}.`;
}

function stripFinalPeriod(value: string) {
  return value.replace(/[.!?]$/, "");
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
  if (
    leftComparable.includes(rightComparable) ||
    rightComparable.includes(leftComparable)
  ) {
    return 1;
  }

  const leftCompact = leftComparable.replace(/\s+/g, "");
  const rightCompact = rightComparable.replace(/\s+/g, "");
  const longerLength = Math.max(leftCompact.length, rightCompact.length);

  if (!longerLength) return 0;

  return (
    1 - levenshteinDistance(leftCompact, rightCompact) / longerLength
  );
}

function isTooSimilar(left: string, right: string) {
  return getTextSimilarity(left, right) > MAX_VARIANT_SIMILARITY;
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

function normalizeCommonLearnerEnglish(value: string) {
  const text = ensureSentence(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\bclubs\b/gi, "clothes");

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

function createKnownScenarioVariantMap(sourceText: string): ExpressionVariantMap | null {
  const standard = normalizeOutputSentence(normalizeCommonLearnerEnglish(sourceText));
  const beautifulThing = getBeautifulThingParts(standard);
  const niceWalk = getNiceWalkParts(standard);
  const hiking = getHikingParts(standard);
  const parkSubject = getParkRosesSubject(standard);

  if (
    normalizeComparableText(standard) ===
    normalizeComparableText("I want to say this more clearly.")
  ) {
    return {
      standard: "I want to say this more clearly.",
      natural: "I want to make this sound more natural.",
      idiomatic: "I want to put this in a better way.",
      simple: "I want to say this better.",
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
          simple: "The weather was nice. I walked for two hours.",
        }
      : {
          standard: "It's nice out today, so I took a walk.",
          natural: "It was so nice out that I went for a walk.",
          idiomatic: "The weather was perfect, so I got out for a walk.",
          simple: "The weather was nice. I took a walk.",
        };
  }

  if (hiking) {
    return hiking.hasTwoHourDuration
      ? {
          standard: "It's nice out today, so we went hiking for two hours.",
          natural: "The weather was great, so we went on a two-hour hike.",
          idiomatic: "It was perfect hiking weather, so we hit the trail.",
          simple: "The weather was nice. We hiked for two hours.",
        }
      : {
          standard: "It's nice out today, so we went hiking.",
          natural: "The weather was great, so we went on a hike.",
          idiomatic: "It was perfect hiking weather, so we hit the trail.",
          simple: "The weather was nice. We went hiking.",
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
      simple: `This is a beautiful ${beautifulThing.noun}.`,
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

  if (beautifulThing) return `This is a beautiful ${beautifulThing.noun}.`;

  if (niceWalk) {
    return niceWalk.hasTwoHourDuration
      ? "The weather was nice. I walked for two hours."
      : "The weather was nice. I took a walk.";
  }

  if (hiking) {
    return hiking.hasTwoHourDuration
      ? "The weather was nice. We hiked for two hours."
      : "The weather was nice. We went hiking.";
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

  if (beautifulThing) {
    const subject =
      /^(?:This|That)$/i.test(beautifulThing.determiner)
        ? `${beautifulThing.determiner} ${beautifulThing.noun}`
        : `The ${beautifulThing.noun}`;
    return `${subject} is really pretty.`;
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

  if (beautifulThing) {
    const subject =
      /^(?:This|That)$/i.test(beautifulThing.determiner)
        ? `${beautifulThing.determiner} ${beautifulThing.noun}`
        : `The ${beautifulThing.noun}`;
    return `${subject} is gorgeous.`;
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

  if (beautifulThing) {
    return createNaturalVariant(text);
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

function isDistinctVariantMap(map: Partial<Record<ExpressionVariantKey, unknown>>) {
  const values = VARIANT_KEYS.map((key) => cleanText(map[key])).filter(Boolean);

  if (values.length < VARIANT_KEYS.length) return false;

  const exactValues = values.map((value) => value.trim().toLowerCase());
  if (new Set(exactValues).size < values.length) return false;

  for (let leftIndex = 0; leftIndex < values.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < values.length; rightIndex += 1) {
      if (isTooSimilar(values[leftIndex], values[rightIndex])) return false;
    }
  }

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

  return buildDistinctMapFromCandidates(
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
    value: unknown,
    fallbackValue: string,
    allowSourceEcho = false
  ) {
    const candidate =
      !isPlaceholderExpression(value) && !isWeakGeneratedVariant(value) && cleanText(value)
        ? normalizeOutputSentence(normalizeCommonLearnerEnglish(cleanText(value)))
        : "";
    const candidateKey = normalizeComparableText(candidate);
    const echoesLearnerSource =
      !allowSourceEcho &&
      Boolean(candidateKey && fallbackSourceKey && candidateKey === fallbackSourceKey) &&
      candidateKey !== normalizeComparableText(fallbackValue);

    return candidate && !echoesLearnerSource ? candidate : fallbackValue;
  }

  const standard = candidateOrFallback(
    variants?.standard,
    fallback.standard,
    normalizeComparableText(fallback.standard) === fallbackSourceKey
  );
  const initialMap = {
    standard,
    natural: candidateOrFallback(variants?.natural, fallback.natural),
    idiomatic: candidateOrFallback(variants?.idiomatic, fallback.idiomatic),
    simple: candidateOrFallback(variants?.simple, fallback.simple),
  };

  return enforceDistinctVariantMap(initialMap, fallback, fallbackSource);
}
