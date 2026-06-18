#!/usr/bin/env node

import fs from "fs";
import Module from "module";
import path from "path";
import process from "process";
import ts from "typescript";
import OpenAI from "openai";

const root = process.cwd();
const classicVariantKeys = ["standard", "idiomatic", "simple", "natural"];
const defaultLessonId = "bank_open_new_account_zh";

function loadDotEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function registerTypeScriptRequire() {
  const originalResolve = Module._resolveFilename;

  Module._resolveFilename = function resolveFilename(
    request,
    parent,
    isMain,
    options
  ) {
    if (request.startsWith("@/")) {
      return originalResolve.call(
        this,
        path.join(root, request.slice(2)),
        parent,
        isMain,
        options
      );
    }

    return originalResolve.call(this, request, parent, isMain, options);
  };

  Module._extensions[".ts"] = function loadTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: filename,
    }).outputText;

    module._compile(output, filename);
  };
}

function parseArgs(argv) {
  return argv.reduce(
    (result, arg) => {
      if (arg === "--write") {
        result.write = true;
      } else if (arg === "--overwrite") {
        result.overwrite = true;
      } else if (arg === "--continue-on-error") {
        result.continueOnError = true;
      } else if (arg === "--all") {
        result.lessonId = "";
      } else if (arg === "--lines-only") {
        result.linesOnly = true;
      } else if (arg === "--variants-only") {
        result.variantsOnly = true;
      } else if (arg.startsWith("--lesson-id=")) {
        result.lessonId = arg.slice("--lesson-id=".length).trim();
      } else if (arg.startsWith("--limit=")) {
        result.limit = Math.max(1, Number(arg.slice("--limit=".length)) || 0);
      } else if (arg.startsWith("--offset=")) {
        result.offset = Math.max(0, Number(arg.slice("--offset=".length)) || 0);
      } else if (arg.startsWith("--delay-ms=")) {
        result.delayMs = Math.max(0, Number(arg.slice("--delay-ms=".length)) || 0);
      }

      return result;
    },
    {
      continueOnError: false,
      delayMs: 100,
      lessonId: defaultLessonId,
      limit: Number.POSITIVE_INFINITY,
      linesOnly: false,
      offset: 0,
      overwrite: false,
      variantsOnly: false,
      write: false,
    }
  );
}

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFatalGenerationError(message) {
  return /429|quota|billing|insufficient_quota/i.test(message);
}

function getPublicFilePath(audioUrl, preRecordedAudioUrlToPublicPath) {
  return path.join(root, "public", preRecordedAudioUrlToPublicPath(audioUrl));
}

function collectTasks({
  featuredLessonRecords,
  getClassicSceneAudioUrl,
  lessonId,
  parseTrainingContent,
  prebuiltClassicExpressionLibrary,
}) {
  const tasks = [];

  for (const lesson of featuredLessonRecords) {
    if (lessonId && lesson.id !== lessonId) continue;

    const pairs = parseTrainingContent(lesson.txt_content || "");
    for (const [sentenceIndex, pair] of pairs.entries()) {
      const lineText = cleanText(pair.english);
      if (lineText) {
        tasks.push({
          lessonId: lesson.id,
          sentenceIndex,
          text: lineText,
          type: "line",
          url: getClassicSceneAudioUrl(lesson.id, sentenceIndex),
        });
      }

      const expressionSet =
        prebuiltClassicExpressionLibrary[lesson.id]?.[sentenceIndex];
      for (const variantKey of classicVariantKeys) {
        const variantText = cleanText(
          expressionSet?.variants.find((variant) => variant.key === variantKey)
            ?.text
        );
        if (!variantText) continue;

        tasks.push({
          lessonId: lesson.id,
          sentenceIndex,
          text: variantText,
          type: variantKey,
          url: getClassicSceneAudioUrl(lesson.id, sentenceIndex, variantKey),
        });
      }
    }
  }

  return tasks;
}

async function generateAudio({ openai, text }) {
  const response = await openai.audio.speech.create({
    input: text,
    instructions: "Speak clearly with a neutral, classroom-friendly tone.",
    model: "gpt-4o-mini-tts",
    response_format: "mp3",
    speed: 1,
    voice: "alloy",
  });

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  loadDotEnvLocal();
  registerTypeScriptRequire();

  const require = Module.createRequire(import.meta.url);
  const { featuredLessonRecords } = require("../data/featuredCourses.ts");
  const { prebuiltClassicExpressionLibrary } = require(
    "../data/prebuiltClassicExpressions.ts"
  );
  const { parseTrainingContent } = require("../lib/training.ts");
  const {
    getClassicSceneAudioUrl,
    preRecordedAudioUrlToPublicPath,
  } = require("../lib/preRecordedCourseAudio.ts");

  const options = parseArgs(process.argv.slice(2));
  let tasks = collectTasks({
    featuredLessonRecords,
    getClassicSceneAudioUrl,
    lessonId: options.lessonId,
    parseTrainingContent,
    prebuiltClassicExpressionLibrary,
  });

  if (options.linesOnly && !options.variantsOnly) {
    tasks = tasks.filter((task) => task.type === "line");
  } else if (options.variantsOnly && !options.linesOnly) {
    tasks = tasks.filter((task) => task.type !== "line");
  }

  const selectedTasks = tasks.slice(options.offset, options.offset + options.limit);
  console.log(
    JSON.stringify(
      {
        delayMs: options.delayMs,
        lessonId: options.lessonId || "all",
        mode: options.write ? "write" : "dry-run",
        offset: options.offset,
        overwrite: options.overwrite,
        selected: selectedTasks.length,
        total: tasks.length,
      },
      null,
      2
    )
  );

  if (!options.write) {
    console.log("Add --write to generate MP3 files.");
    console.log(
      selectedTasks.slice(0, 10).map((task) => ({
        text: task.text,
        type: task.type,
        url: task.url,
      }))
    );
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const summary = { failed: 0, generated: 0, skipped: 0 };

  for (const [index, task] of selectedTasks.entries()) {
    const filePath = getPublicFilePath(task.url, preRecordedAudioUrlToPublicPath);

    if (!options.overwrite && fs.existsSync(filePath)) {
      summary.skipped += 1;
      console.log(`[skip] ${index + 1}/${selectedTasks.length} ${task.url}`);
      continue;
    }

    try {
      const audio = await generateAudio({ openai, text: task.text });
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, audio);
      summary.generated += 1;
      console.log(`[ok] ${index + 1}/${selectedTasks.length} ${task.url}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "audio generation failed";
      summary.failed += 1;
      console.error(`[fail] ${index + 1}/${selectedTasks.length} ${task.url}: ${message}`);

      if (!options.continueOnError && isFatalGenerationError(message)) {
        console.error("Stopping early because audio generation hit a fatal quota/billing error.");
        break;
      }
    }

    if (options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
