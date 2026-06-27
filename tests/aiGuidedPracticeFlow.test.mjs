import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadFlowModule() {
  const source = await readFile(
    new URL("../lib/aiGuidedPracticeFlow.ts", import.meta.url),
    "utf8"
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString(
    "base64"
  )}`;

  return import(moduleUrl);
}

const {
  initialAiGuidedPracticePhase,
  transitionAiGuidedPracticePhase,
} = await loadFlowModule();

function runFlow(events) {
  return events.reduce(
    (phase, event) => transitionAiGuidedPracticePhase(phase, event),
    initialAiGuidedPracticePhase
  );
}

test("first guided round goes from Chinese recording to learning result", () => {
  const phase = runFlow([
    "startChineseRecording",
    "finishChineseRecording",
    "confirmChinese",
    "finishEnglishRecording",
  ]);

  assert.equal(phase, "learningResult");
});

test("AI recommendation round returns to learning result after English recording", () => {
  const afterRecommendation = transitionAiGuidedPracticePhase(
    "learningResult",
    "selectAiRecommendedChinese"
  );
  const afterConfirm = transitionAiGuidedPracticePhase(
    afterRecommendation,
    "confirmChinese"
  );
  const afterEnglish = transitionAiGuidedPracticePhase(
    afterConfirm,
    "finishEnglishRecording"
  );

  assert.equal(afterRecommendation, "confirmChinese");
  assert.equal(afterConfirm, "englishRecording");
  assert.equal(afterEnglish, "learningResult");
});

test("multiple AI recommendation rounds keep cycling through learning result", () => {
  const phase = runFlow([
    "finishChineseRecording",
    "confirmChinese",
    "finishEnglishRecording",
    "selectAiRecommendedChinese",
    "confirmChinese",
    "finishEnglishRecording",
    "selectAiRecommendedChinese",
    "confirmChinese",
    "finishEnglishRecording",
  ]);

  assert.equal(phase, "learningResult");
});

test("edited AI recommendation still finishes at learning result", () => {
  const afterClickRecommendation = transitionAiGuidedPracticePhase(
    "learningResult",
    "selectAiRecommendedChinese"
  );
  const afterUserEditsAndConfirms = transitionAiGuidedPracticePhase(
    afterClickRecommendation,
    "confirmChinese"
  );
  const afterEnglish = transitionAiGuidedPracticePhase(
    afterUserEditsAndConfirms,
    "finishEnglishRecording"
  );

  assert.equal(afterClickRecommendation, "confirmChinese");
  assert.equal(afterUserEditsAndConfirms, "englishRecording");
  assert.equal(afterEnglish, "learningResult");
});
