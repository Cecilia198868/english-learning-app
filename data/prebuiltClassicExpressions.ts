import { featuredLessonRecords } from "@/data/featuredCourses";
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

type PrebuiltClassicExpressionOverrides = Record<
  string,
  Record<number, Partial<Record<PrebuiltClassicExpressionVariantKey, string>>>
>;

const prebuiltVariantLabels: Array<{
  key: PrebuiltClassicExpressionVariantKey;
  label: string;
}> = [
  { key: "standard", label: "\u63a8\u8350\u8868\u8fbe" },
  { key: "idiomatic", label: "\u66f4\u5730\u9053" },
  { key: "simple", label: "\u66f4\u7b80\u5355" },
  { key: "natural", label: "\u66f4\u81ea\u7136" },
];

const classicExpressionVariantOverrides: PrebuiltClassicExpressionOverrides = {};

function normalizeExpressionText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function replaceCaseInsensitive(
  text: string,
  pattern: RegExp,
  replacement: string
) {
  return text.replace(pattern, replacement);
}

function cleanupGeneratedExpression(text: string) {
  return normalizeExpressionText(
    text
      .replace(/\s+([?.!,])/g, "$1")
      .replace(/\s+,/g, ",")
      .replace(/\.\./g, ".")
      .replace(/\?\?/g, "?")
  );
}

function withSentenceEnding(text: string, ending: "." | "?" = ".") {
  const cleaned = cleanupGeneratedExpression(text).replace(/[.?!]+$/, "");
  return `${cleaned}${ending}`;
}

function createSimpleExpression(standardEnglish: string) {
  const text = normalizeExpressionText(standardEnglish);

  if (/^How can I help you today\?$/i.test(text)) {
    return "How can I help you?";
  }

  if (/^What documents do I need\?$/i.test(text)) {
    return "What papers do I need?";
  }

  if (/^What's the minimum deposit required\?$/i.test(text)) {
    return "How much money do I need to start?";
  }

  let simple = text;
  simple = replaceCaseInsensitive(simple, /\bI(?:'|’)d like to\b/g, "I want to");
  simple = replaceCaseInsensitive(simple, /\bI would like to\b/g, "I want to");
  simple = replaceCaseInsensitive(simple, /\bCould you\b/g, "Can you");
  simple = replaceCaseInsensitive(simple, /\bMay I\b/g, "Can I");
  simple = replaceCaseInsensitive(simple, /\bapproximately\b/gi, "about");
  simple = replaceCaseInsensitive(simple, /\bcurrently\b/gi, "now");
  simple = replaceCaseInsensitive(simple, /\bprior to\b/gi, "before");
  simple = replaceCaseInsensitive(simple, /\bprovide\b/gi, "give");
  simple = replaceCaseInsensitive(simple, /\bassist\b/gi, "help");
  simple = replaceCaseInsensitive(simple, /\binquire about\b/gi, "ask about");

  const doINeedMatch = simple.match(/^Do I need to (.+)\?$/i);
  if (doINeedMatch?.[1]) {
    return withSentenceEnding(`Do I have to ${doINeedMatch[1]}`, "?");
  }

  return cleanupGeneratedExpression(simple);
}

function createIdiomaticExpression(standardEnglish: string) {
  const text = normalizeExpressionText(standardEnglish);

  if (/open a new bank account/i.test(text)) {
    return cleanupGeneratedExpression(
      text.replace(/open a new bank account/i, "set up a new bank account")
    );
  }

  if (/^How can I help you today\?$/i.test(text)) {
    return "What can I help you with today?";
  }

  if (/^What documents do I need\?$/i.test(text)) {
    return "What documents should I bring with me?";
  }

  const canYouMatch = text.match(/^Can you (.+)\?$/i);
  if (canYouMatch?.[1]) {
    return withSentenceEnding(`Could you please ${canYouMatch[1]}`, "?");
  }

  const couldYouMatch = text.match(/^Could you (.+)\?$/i);
  if (couldYouMatch?.[1]) {
    return withSentenceEnding(`Could you please ${couldYouMatch[1]}`, "?");
  }

  const doINeedMatch = text.match(/^Do I need to (.+)\?$/i);
  if (doINeedMatch?.[1]) {
    return withSentenceEnding(`Will I need to ${doINeedMatch[1]}`, "?");
  }

  const iWantMatch = text.match(/^I want to (.+)\.$/i);
  if (iWantMatch?.[1]) {
    return withSentenceEnding(`I'd like to ${iWantMatch[1]}`);
  }

  const idLikeMatch = text.match(/^(Hi, |Hello, )?I(?:'|’)d like to (.+)\.$/i);
  if (idLikeMatch?.[2]) {
    const greeting = idLikeMatch[1] || "";
    return withSentenceEnding(
      `${greeting}I'd like to ${idLikeMatch[2]}, if possible`
    );
  }

  if (/^Thank you\b/i.test(text)) {
    return "Thank you, I really appreciate your help.";
  }

  return cleanupGeneratedExpression(text);
}

function createNaturalExpression(standardEnglish: string) {
  const text = normalizeExpressionText(standardEnglish);

  if (/^How can I help you today\?$/i.test(text)) {
    return "Hi, what can I help you with today?";
  }

  if (/open a new bank account/i.test(text)) {
    return cleanupGeneratedExpression(
      text.replace(
        /I(?:'|’)d like to open a new bank account/i,
        "I'm hoping to open a new bank account"
      )
    );
  }

  if (/^What documents do I need\?$/i.test(text)) {
    return "What should I bring with me?";
  }

  const canIMatch = text.match(/^Can I (.+)\?$/i);
  if (canIMatch?.[1]) {
    return withSentenceEnding(`Is it okay if I ${canIMatch[1]}`, "?");
  }

  const canYouMatch = text.match(/^Can you (.+)\?$/i);
  if (canYouMatch?.[1]) {
    return withSentenceEnding(`Can you ${canYouMatch[1]} for me`, "?");
  }

  const couldYouMatch = text.match(/^Could you (.+)\?$/i);
  if (couldYouMatch?.[1]) {
    return withSentenceEnding(`Can you ${couldYouMatch[1]} for me`, "?");
  }

  const doINeedMatch = text.match(/^Do I need to (.+)\?$/i);
  if (doINeedMatch?.[1]) {
    return withSentenceEnding(`Do I need to ${doINeedMatch[1]} for this`, "?");
  }

  const iWantMatch = text.match(/^I want to (.+)\.$/i);
  if (iWantMatch?.[1]) {
    return withSentenceEnding(`I'm looking to ${iWantMatch[1]}`);
  }

  const idLikeMatch = text.match(/^(Hi, |Hello, )?I(?:'|’)d like to (.+)\.$/i);
  if (idLikeMatch?.[2]) {
    const greeting = idLikeMatch[1] || "";
    return withSentenceEnding(`${greeting}I'm hoping to ${idLikeMatch[2]}`);
  }

  if (/^Thank you\b/i.test(text)) {
    return "Thanks so much.";
  }

  return cleanupGeneratedExpression(text);
}

function createGeneratedVariantText(
  key: PrebuiltClassicExpressionVariantKey,
  standardEnglish: string
) {
  if (key === "simple") return createSimpleExpression(standardEnglish);
  if (key === "idiomatic") return createIdiomaticExpression(standardEnglish);
  if (key === "natural") return createNaturalExpression(standardEnglish);
  return standardEnglish;
}

function createPrebuiltVariants(
  standardEnglish: string,
  overrides: Partial<Record<PrebuiltClassicExpressionVariantKey, string>> = {}
) {
  const fallbackText =
    normalizeExpressionText(standardEnglish) ||
    "This sentence is still being prepared.";

  return prebuiltVariantLabels.map(({ key, label }) => ({
    key,
    label,
    text:
      normalizeExpressionText(overrides[key] || "") ||
      createGeneratedVariantText(key, fallbackText) ||
      fallbackText,
  }));
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
        classicExpressionVariantOverrides[lesson.id]?.[sentenceIndex]
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
