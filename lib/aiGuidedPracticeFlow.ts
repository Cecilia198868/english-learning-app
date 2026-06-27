export type AiGuidedPracticePhase =
  | "chineseRecording"
  | "confirmChinese"
  | "englishRecording"
  | "learningResult";

export type AiGuidedPracticeEvent =
  | "startChineseRecording"
  | "finishChineseRecording"
  | "confirmChinese"
  | "finishEnglishRecording"
  | "selectAiRecommendedChinese";

export const initialAiGuidedPracticePhase: AiGuidedPracticePhase =
  "chineseRecording";

export function transitionAiGuidedPracticePhase(
  _phase: AiGuidedPracticePhase,
  event: AiGuidedPracticeEvent
): AiGuidedPracticePhase {
  switch (event) {
    case "startChineseRecording":
      return "chineseRecording";
    case "finishChineseRecording":
    case "selectAiRecommendedChinese":
      return "confirmChinese";
    case "confirmChinese":
      return "englishRecording";
    case "finishEnglishRecording":
      return "learningResult";
  }
}
