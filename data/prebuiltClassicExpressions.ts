import { featuredLessonRecords } from "@/data/featuredCourses";
import {
  prebuiltClassicExpressionContent,
  type PrebuiltClassicExpressionVariantContent,
} from "@/data/prebuiltClassicExpressionContent";
import {
  createFallbackHighlightedExpressions,
  type HighlightedExpression,
} from "@/lib/expressionHighlights";
import { parseTrainingContent } from "@/lib/training";

export type PrebuiltClassicExpressionVariantKey =
  | "standard"
  | "idiomatic"
  | "simple"
  | "natural";

export type PrebuiltClassicExpressionVariant = {
  key: PrebuiltClassicExpressionVariantKey;
  label: string;
  text: string;
};

export type PrebuiltClassicExpressionSet = {
  lessonId: string;
  sentenceIndex: number;
  chinese: string;
  standardEnglish: string;
  variants: PrebuiltClassicExpressionVariant[];
  highlights: Partial<
    Record<PrebuiltClassicExpressionVariantKey, HighlightedExpression[]>
  >;
};

const prebuiltVariantLabels: Array<{
  key: PrebuiltClassicExpressionVariantKey;
  label: string;
}> = [
  { key: "standard", label: "\u63a8\u8350\u8868\u8fbe" },
  { key: "idiomatic", label: "\u66f4\u5730\u9053" },
  { key: "simple", label: "\u66f4\u7b80\u5355" },
  { key: "natural", label: "\u66f4\u81ea\u7136" },
];

function normalizeExpressionText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeForComparison(text: string) {
  return normalizeExpressionText(text)
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\bu\.s\.\b/g, "united states")
    .replace(/\busa\b/g, "united states")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripFinalPunctuation(text: string) {
  return normalizeExpressionText(text).replace(/[.!?]+$/g, "").trim();
}

function lowerFirst(text: string) {
  const trimmed = normalizeExpressionText(text);
  if (!trimmed) return "";
  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

function sentence(text: string, ending = ".") {
  const trimmed = stripFinalPunctuation(text);
  if (!trimmed) return "";
  return `${trimmed}${ending}`;
}

function simplifyWords(text: string) {
  return normalizeExpressionText(text)
    .replace(/\bSocial Security Number\b/g, "SSN")
    .replace(/\bUnited States\b/g, "U.S.")
    .replace(/\binternational\b/gi, "foreign")
    .replace(/\bdocuments\b/gi, "papers")
    .replace(/\bdocument\b/gi, "paper")
    .replace(/\bapplication\b/gi, "request")
    .replace(/\bapplications\b/gi, "requests")
    .replace(/\bprepare\b/gi, "get ready")
    .replace(/\bsubmit\b/gi, "send in")
    .replace(/\breceive\b/gi, "get")
    .replace(/\bprovide\b/gi, "give")
    .replace(/\bcurrent\b/gi, "current")
    .replace(/\bauthorization\b/gi, "approval")
    .replace(/\bauthorized\b/gi, "allowed")
    .replace(/\bapproximately\b/gi, "about")
    .replace(/\badditional\b/gi, "more")
    .replace(/\bresidency\b/gi, "address")
    .replace(/\bvalid\b/gi, "good")
    .replace(/\beligible\b/gi, "able")
    .replace(/\bfee\b/gi, "cost")
    .replace(/\bprocess\b/gi, "handle")
    .replace(/\bstatus\b/gi, "progress");
}

function contractWords(text: string) {
  return normalizeExpressionText(text)
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bI will\b/g, "I'll")
    .replace(/\bI would\b/g, "I'd")
    .replace(/\bI have\b/g, "I've")
    .replace(/\bYou are\b/g, "You're")
    .replace(/\bYou will\b/g, "You'll")
    .replace(/\bWe are\b/g, "We're")
    .replace(/\bWe will\b/g, "We'll")
    .replace(/\bIt is\b/g, "It's")
    .replace(/\bThat is\b/g, "That's")
    .replace(/\bDo not\b/g, "Don't")
    .replace(/\bdoes not\b/gi, "doesn't")
    .replace(/\bcannot\b/gi, "can't");
}

function rewriteWithRules(
  text: string,
  rules: Array<[RegExp, string | ((...matches: string[]) => string)]>
) {
  const normalized = normalizeExpressionText(text);

  for (const [pattern, replacement] of rules) {
    const match = normalized.match(pattern);
    if (!match) continue;

    if (typeof replacement === "function") {
      return normalizeExpressionText(replacement(...match));
    }

    return normalizeExpressionText(normalized.replace(pattern, replacement));
  }

  return normalized;
}

function generateIdiomaticVariant(standardEnglish: string) {
  const rewritten = rewriteWithRules(standardEnglish, [
    [/^Hello,?\s+I'd like to (.+)\.$/i, (_full, rest) => `Hi, I'd like to ${rest}.`],
    [/^Hello,?\s+I would like to (.+)\.$/i, (_full, rest) => `Hi, I'd like to ${rest}.`],
    [/^Hello,?\s+I want to (.+)\.$/i, (_full, rest) => `Hi, I'd like to ${rest}.`],
    [
      /^Hello,?\s+I just arrived in (?:the )?(?:United States|US|U\.S\.) (.+)\.$/i,
      (_full, time) => `Hi, I got to the U.S. ${time}.`,
    ],
    [/^Good morning!\s+Welcome to (.+)\.$/i, (_full, place) => `Good morning, and welcome to ${place}.`],
    [
      /^Please take a seat\.\s+What is your (.+)\?$/i,
      (_full, detail) => `Please take a seat. Could you tell me your ${detail}?`,
    ],
    [/^Please (.+)\.$/i, (_full, rest) => `Could you please ${lowerFirst(rest)}?`],
    [/^May I (.+)\?$/i, (_full, rest) => `Could I ${lowerFirst(rest)}?`],
    [/^Can I (.+)\?$/i, (_full, rest) => `Would it be possible for me to ${lowerFirst(rest)}?`],
    [/^Can you (.+)\?$/i, (_full, rest) => `Could you please ${lowerFirst(rest)}?`],
    [/^Do I need to (.+)\?$/i, (_full, rest) => `Would I need to ${lowerFirst(rest)}?`],
    [/^What documents do I need(?: to prepare)?\?$/i, () => "What paperwork should I get ready?"],
    [/^What is your (.+)\?$/i, (_full, detail) => `Could you tell me your ${detail}?`],
    [/^Where can I (.+)\?$/i, (_full, rest) => `Where would I be able to ${lowerFirst(rest)}?`],
    [/^How long does (.+) usually take(?: to process)?\?$/i, (_full, rest) => `How long does ${rest} typically take?`],
    [/^Are you (.+)\?$/i, (_full, rest) => `Could you let me know if you are ${rest}?`],
    [/^I need (.+)\.$/i, (_full, rest) => `I'll need ${rest}.`],
    [/^I want to (.+)\.$/i, (_full, rest) => `I'd like to ${rest}.`],
    [/^I just arrived in (?:the )?(?:United States|US|U\.S\.) (.+)\.$/i, (_full, time) => `I got to the U.S. ${time}.`],
    [/^My name is ([^,]+), date of birth (.+)\.$/i, (_full, name, date) => `I'm ${name}, and my date of birth is ${date}.`],
    [/^My (.+) is (.+)\.$/i, (_full, item, value) => `My ${item} would be ${value}.`],
    [/^Here (is|are) (.+)\.$/i, (_full, _verb, item) => `I have ${item} here.`],
    [/^Thank you(?:[.!].*)?$/i, () => "Thanks, I really appreciate it."],
    [/^You're welcome(.*)$/i, (_full, rest) => `No problem${rest}`],
    [/^You can (.+)\.$/i, (_full, rest) => `You're able to ${rest}.`],
    [/^You should (.+)\.$/i, (_full, rest) => `You'll want to ${rest}.`],
    [/^We can (.+)\.$/i, (_full, rest) => `We're able to ${rest}.`],
    [/^We will (.+)\.$/i, (_full, rest) => `We'll ${lowerFirst(rest)}.`],
    [/^It is (.+)\.$/i, (_full, rest) => `It's ${rest}.`],
    [/^This is (.+)\.$/i, (_full, rest) => `This would be ${rest}.`],
    [/^No, this is my first time\.$/i, () => "No, this would be my first time."],
  ]);

  if (normalizeForComparison(rewritten) !== normalizeForComparison(standardEnglish)) {
    return rewritten;
  }

  const contracted = contractWords(standardEnglish)
    .replace(/\bUnited States\b/g, "U.S.")
    .replace(/\busually\b/gi, "typically")
    .replace(/\bquite urgently\b/gi, "pretty urgently")
    .replace(/\bright away\b/gi, "as soon as possible");

  return normalizeExpressionText(contracted);
}

function generateSimpleVariant(standardEnglish: string) {
  const rewritten = rewriteWithRules(standardEnglish, [
    [/^Hello,?\s+I'd like to (.+)\.$/i, (_full, rest) => `Hello, I want to ${simplifyWords(rest)}.`],
    [/^Hello,?\s+I would like to (.+)\.$/i, (_full, rest) => `Hello, I want to ${simplifyWords(rest)}.`],
    [
      /^Hello,?\s+I just arrived in (?:the )?(?:United States|US|U\.S\.) (.+)\.$/i,
      (_full, time) => `Hello, I came to the U.S. ${time}.`,
    ],
    [/^Good morning!\s+Welcome to (.+)\.$/i, (_full, place) => `Good morning. Welcome to ${place}.`],
    [
      /^Please take a seat\.\s+What is your (.+)\?$/i,
      (_full, detail) => `Please sit down. What is your ${simplifyWords(detail)}?`,
    ],
    [/^Please (.+)\.$/i, (_full, rest) => `Can you ${lowerFirst(simplifyWords(rest))}?`],
    [/^May I (.+)\?$/i, (_full, rest) => `Can I ${lowerFirst(simplifyWords(rest))}?`],
    [/^Can I (.+)\?$/i, (_full, rest) => `Is it okay if I ${lowerFirst(simplifyWords(rest))}?`],
    [/^Can you (.+)\?$/i, (_full, rest) => `Can you please ${lowerFirst(simplifyWords(rest))}?`],
    [/^Do I need to (.+)\?$/i, (_full, rest) => `Do I have to ${lowerFirst(simplifyWords(rest))}?`],
    [/^What documents do I need(?: to prepare)?\?$/i, () => "What papers do I need?"],
    [/^What is your current U\.S\. address and phone number\?$/i, () => "What is your address and phone number?"],
    [/^What is your (.+)\?$/i, (_full, detail) => `What is your ${simplifyWords(detail)}?`],
    [/^Where can I (.+)\?$/i, (_full, rest) => `Where can I ${lowerFirst(simplifyWords(rest))}?`],
    [/^How long does (.+) usually take(?: to process)?\?$/i, (_full, rest) => `How long does ${simplifyWords(rest)} take?`],
    [/^Are you (.+)\?$/i, (_full, rest) => `Are you ${simplifyWords(rest)}?`],
    [/^I need (.+)\.$/i, (_full, rest) => `I have to ${simplifyWords(rest)}.`],
    [/^I want to (.+)\.$/i, (_full, rest) => `I want to ${simplifyWords(rest)}.`],
    [/^My name is ([^,]+), date of birth (.+)\.$/i, (_full, name, date) => `My name is ${name}. I was born on ${date}.`],
    [/^My (.+) is (.+)\.$/i, (_full, item, value) => `My ${simplifyWords(item)} is ${simplifyWords(value)}.`],
    [/^Here are (.+)\.$/i, (_full, item) => `These are ${simplifyWords(item)}.`],
    [/^Here is (.+)\.$/i, (_full, item) => `This is ${simplifyWords(item)}.`],
    [/^Thank you(?:[.!].*)?$/i, () => "Thank you."],
    [/^You can (.+)\.$/i, (_full, rest) => `You can ${simplifyWords(rest)}.`],
    [/^You should (.+)\.$/i, (_full, rest) => `You should ${simplifyWords(rest)}.`],
    [/^We can (.+)\.$/i, (_full, rest) => `We can ${simplifyWords(rest)}.`],
    [/^We will (.+)\.$/i, (_full, rest) => `We will ${simplifyWords(rest)}.`],
    [/^It is (.+)\.$/i, (_full, rest) => `It is ${simplifyWords(rest)}.`],
    [/^No, this is my first time\.$/i, () => "No. This is my first time."],
  ]);

  if (normalizeForComparison(rewritten) !== normalizeForComparison(standardEnglish)) {
    return rewritten;
  }

  return simplifyWords(standardEnglish)
    .replace(/\bI'd like to\b/g, "I want to")
    .replace(/\bwould like to\b/gi, "want to")
    .replace(/\bMay I\b/g, "Can I")
    .replace(/\bcould you please\b/gi, "can you")
    .replace(/\binquire about\b/gi, "ask about")
    .replace(/\bfill out\b/gi, "complete");
}

function generateNaturalVariant(standardEnglish: string) {
  const rewritten = rewriteWithRules(standardEnglish, [
    [/^Hello,?\s+I'd like to (.+)\.$/i, (_full, rest) => `Hi, I'm hoping to ${rest}.`],
    [/^Hello,?\s+I would like to (.+)\.$/i, (_full, rest) => `Hi, I'm hoping to ${rest}.`],
    [/^Hello,?\s+I want to (.+)\.$/i, (_full, rest) => `Hi, I'm hoping to ${rest}.`],
    [
      /^Hello,?\s+I just arrived in (?:the )?(?:United States|US|U\.S\.) (.+)\.$/i,
      (_full, time) => `Hi, I just got here ${time}.`,
    ],
    [/^Good morning!\s+Welcome to (.+)\.$/i, (_full, place) => `Morning! Welcome to ${place}.`],
    [
      /^Please take a seat\.\s+What is your (.+)\?$/i,
      (_full, detail) => `Please have a seat. What's your ${detail}?`,
    ],
    [/^Please (.+)\.$/i, (_full, rest) => `Go ahead and ${lowerFirst(rest)}, please.`],
    [/^May I (.+)\?$/i, (_full, rest) => `Would it be okay if I ${lowerFirst(rest)}?`],
    [/^Can I (.+)\?$/i, (_full, rest) => `Is it okay if I ${lowerFirst(rest)}?`],
    [/^Can you (.+)\?$/i, (_full, rest) => `Could you ${lowerFirst(rest)} for me?`],
    [/^Do I need to (.+)\?$/i, (_full, rest) => `Do I still need to ${lowerFirst(rest)}?`],
    [/^What documents do I need(?: to prepare)?\?$/i, () => "What should I bring with me?"],
    [/^What is your (.+)\?$/i, (_full, detail) => `What's your ${detail}?`],
    [/^Where can I (.+)\?$/i, (_full, rest) => `Where should I ${lowerFirst(rest)}?`],
    [/^How long does (.+) usually take(?: to process)?\?$/i, (_full, rest) => `How long does ${rest} normally take?`],
    [/^Are you (.+)\?$/i, (_full, rest) => `Are you currently ${rest}?`],
    [/^I need (.+)\.$/i, (_full, rest) => `I'm going to need ${rest}.`],
    [/^I want to (.+)\.$/i, (_full, rest) => `I'm hoping to ${rest}.`],
    [/^I just arrived in (?:the )?(?:United States|US|U\.S\.) (.+)\.$/i, (_full, time) => `I just got here ${time}.`],
    [/^My name is ([^,]+), date of birth (.+)\.$/i, (_full, name, date) => `I'm ${name}. My birthday is ${date}.`],
    [/^My (.+) is (.+)\.$/i, (_full, item, value) => `The ${item} is ${value}.`],
    [/^Here (is|are) (.+)\.$/i, (_full, verb, item) => `Here ${verb.toLowerCase()} ${item} for you.`],
    [/^Thank you(?:[.!].*)?$/i, () => "Thanks so much."],
    [/^You're welcome(.*)$/i, (_full, rest) => `You're very welcome${rest}`],
    [/^You can (.+)\.$/i, (_full, rest) => `You can go ahead and ${lowerFirst(rest)}.`],
    [/^You should (.+)\.$/i, (_full, rest) => `It's best to ${lowerFirst(rest)}.`],
    [/^We can (.+)\.$/i, (_full, rest) => `We can go ahead and ${lowerFirst(rest)}.`],
    [/^We will (.+)\.$/i, (_full, rest) => `We'll go ahead and ${lowerFirst(rest)}.`],
    [/^It is (.+)\.$/i, (_full, rest) => `It's ${rest}.`],
    [/^No, this is my first time\.$/i, () => "No, it's my first time doing this."],
  ]);

  if (normalizeForComparison(rewritten) !== normalizeForComparison(standardEnglish)) {
    return rewritten;
  }

  return contractWords(standardEnglish)
    .replace(/\bI need\b/g, "I'm going to need")
    .replace(/\bI want to\b/g, "I'm hoping to")
    .replace(/\bYou should\b/g, "It's best to")
    .replace(/\bUnited States\b/g, "U.S.");
}

function generateVariantFallback(
  key: PrebuiltClassicExpressionVariantKey,
  standardEnglish: string
) {
  if (key === "idiomatic") return generateIdiomaticVariant(standardEnglish);
  if (key === "simple") return generateSimpleVariant(standardEnglish);
  if (key === "natural") return generateNaturalVariant(standardEnglish);
  return normalizeExpressionText(standardEnglish);
}

function addFallbackFrame(
  key: PrebuiltClassicExpressionVariantKey,
  standardEnglish: string
) {
  const base = stripFinalPunctuation(standardEnglish);
  const isQuestion = /\?$/.test(normalizeExpressionText(standardEnglish));

  if (isQuestion) {
    if (key === "idiomatic") return `Could you help me with this: ${lowerFirst(base)}?`;
    if (key === "simple") return `I need to know this: ${lowerFirst(base)}.`;
    if (key === "natural") return `I was wondering about this: ${lowerFirst(base)}?`;
  }

  if (key === "idiomatic") return sentence(`${base}, if that works`);
  if (key === "simple") return sentence(`Basically, ${lowerFirst(base)}`);
  if (key === "natural") return sentence(`So, ${lowerFirst(base)}`);

  return sentence(base);
}

function resolveDistinctVariantText(
  key: PrebuiltClassicExpressionVariantKey,
  standardEnglish: string,
  storedText: string | undefined,
  acceptedTexts: string[]
) {
  const normalizedStandard = normalizeExpressionText(standardEnglish);
  const storedCandidate = normalizeExpressionText(storedText || "");
  const usedComparisons = new Set(acceptedTexts.map(normalizeForComparison));

  function isUsable(candidate: string) {
    const comparable = normalizeForComparison(candidate);
    return Boolean(comparable) && !usedComparisons.has(comparable);
  }

  if (key === "standard") {
    return storedCandidate || normalizedStandard;
  }

  if (isUsable(storedCandidate)) {
    return storedCandidate;
  }

  const generated = generateVariantFallback(key, normalizedStandard);
  if (isUsable(generated)) {
    return generated;
  }

  const framed = addFallbackFrame(key, normalizedStandard);
  if (isUsable(framed)) {
    return framed;
  }

  return `${framed} (${key})`;
}

function createPrebuiltVariants(
  standardEnglish: string,
  storedContent?: Partial<PrebuiltClassicExpressionVariantContent>
) {
  const fallbackText =
    normalizeExpressionText(standardEnglish) ||
    "This sentence is still being prepared.";

  const acceptedTexts: string[] = [];

  return prebuiltVariantLabels.map(({ key, label }) => {
    const text = resolveDistinctVariantText(
      key,
      fallbackText,
      storedContent?.[key],
      acceptedTexts
    );

    acceptedTexts.push(text);

    return {
      key,
      label,
      text,
    };
  });
}

function createPrebuiltHighlights(
  variants: PrebuiltClassicExpressionVariant[]
) {
  return variants.reduce<PrebuiltClassicExpressionSet["highlights"]>(
    (result, variant) => {
      result[variant.key] = createFallbackHighlightedExpressions(variant.text);
      return result;
    },
    {}
  );
}

export const prebuiltClassicExpressionLibrary: Record<
  string,
  PrebuiltClassicExpressionSet[]
> = Object.fromEntries(
  featuredLessonRecords.map((lesson) => [
    lesson.id,
    parseTrainingContent(lesson.txt_content || "").map((pair, sentenceIndex) => {
      const variants = createPrebuiltVariants(
        pair.english || "",
        prebuiltClassicExpressionContent[lesson.id]?.[sentenceIndex]
      );

      return {
        lessonId: lesson.id,
        sentenceIndex,
        chinese: pair.chinese,
        standardEnglish: normalizeExpressionText(pair.english || ""),
        variants,
        highlights: createPrebuiltHighlights(variants),
      };
    }),
  ])
);

export function hasPrebuiltClassicExpressionLesson(lessonId: string) {
  return Array.isArray(prebuiltClassicExpressionLibrary[lessonId]);
}

export function getPrebuiltClassicExpressionSet(
  lessonId: string,
  sentenceIndex: number
) {
  const lessonExpressions = prebuiltClassicExpressionLibrary[lessonId];
  if (!lessonExpressions) return null;

  return lessonExpressions[sentenceIndex] || null;
}
