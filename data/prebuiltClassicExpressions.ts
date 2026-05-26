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
    text: normalizeExpressionText(overrides[key] || "") || fallbackText,
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
