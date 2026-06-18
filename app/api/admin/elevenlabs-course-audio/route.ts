import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { featuredLessonRecords } from "@/data/featuredCourses";
import { prebuiltClassicExpressionLibrary } from "@/data/prebuiltClassicExpressions";
import { sentencePatternLevels } from "@/data/sentencePatterns";
import {
  ELEVENLABS_COURSE_AUDIO_SPEED,
  getClassicSceneAudioUrl,
  getSentencePatternAudioUrl,
  preRecordedAudioUrlToPublicPath,
  type ClassicSceneAudioVariantKey,
  type SentencePatternAudioVariantKey,
} from "@/lib/preRecordedCourseAudio";
import { parseTrainingContent } from "@/lib/training";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AudioScope = "classic-scenes" | "sentence-patterns" | "all";

type AudioTask = {
  courseKind: "classic-scenes" | "sentence-patterns";
  provider: "openai" | "elevenlabs";
  text: string;
  url: string;
  voiceId: string;
  voiceName: "Alloy" | "Bella";
};

const classicVariantKeys: ClassicSceneAudioVariantKey[] = [
  "standard",
  "idiomatic",
  "simple",
  "natural",
];

const sentencePatternVariantKeys: SentencePatternAudioVariantKey[] = [
  "target",
  "recommended",
  "idiomatic",
  "simple",
  "natural",
];

function cleanText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function cleanScope(value: unknown): AudioScope {
  return value === "classic-scenes" || value === "sentence-patterns" || value === "all"
    ? value
    : "all";
}

function cleanPositiveInteger(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(1, Math.floor(numberValue));
}

function audioUrlToFilePath(audioUrl: string) {
  return path.join(
    process.cwd(),
    "public",
    preRecordedAudioUrlToPublicPath(audioUrl)
  );
}

async function fileExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function hasAdminAccess(req: Request, secret: unknown) {
  const configuredSecret = process.env.ELEVENLABS_GENERATE_SECRET;
  if (configuredSecret) {
    return (
      req.headers.get("x-admin-secret") === configuredSecret ||
      secret === configuredSecret
    );
  }

  return process.env.NODE_ENV !== "production";
}

function collectClassicSceneTasks(lessonIdFilter?: string) {
  const tasks: AudioTask[] = [];

  for (const lesson of featuredLessonRecords) {
    if (lessonIdFilter && lesson.id !== lessonIdFilter) continue;

    const pairs = parseTrainingContent(lesson.txt_content || "");
    for (const [sentenceIndex, pair] of pairs.entries()) {
      const lineText = cleanText(pair.english);
      if (lineText) {
        tasks.push({
          courseKind: "classic-scenes",
          provider: "openai",
          text: lineText,
          url: getClassicSceneAudioUrl(lesson.id, sentenceIndex),
          voiceId: "alloy",
          voiceName: "Alloy",
        });
      }

      const expressionSet = prebuiltClassicExpressionLibrary[lesson.id]?.[sentenceIndex];
      for (const variantKey of classicVariantKeys) {
        const variantText = cleanText(
          expressionSet?.variants.find((variant) => variant.key === variantKey)?.text
        );
        if (!variantText) continue;

        tasks.push({
          courseKind: "classic-scenes",
          provider: "openai",
          text: variantText,
          url: getClassicSceneAudioUrl(lesson.id, sentenceIndex, variantKey),
          voiceId: "alloy",
          voiceName: "Alloy",
        });
      }
    }
  }

  return tasks;
}

function collectSentencePatternTasks(levelIdFilter?: string, patternIdFilter?: number) {
  const tasks: AudioTask[] = [];

  for (const level of sentencePatternLevels) {
    if (levelIdFilter && level.id !== levelIdFilter) continue;

    for (const pattern of level.sections.flatMap((section) => section.patterns)) {
      if (patternIdFilter && pattern.id !== patternIdFilter) continue;

      for (const practice of pattern.practices || []) {
        const texts: Record<SentencePatternAudioVariantKey, string> = {
          idiomatic: practice.idiomatic,
          natural: practice.natural,
          recommended: practice.recommended,
          simple: practice.simple,
          target: practice.targetEnglish,
        };

        for (const variantKey of sentencePatternVariantKeys) {
          const text = cleanText(texts[variantKey]);
          if (!text) continue;

          tasks.push({
            courseKind: "sentence-patterns",
            provider: "openai",
            text,
            url: getSentencePatternAudioUrl(
              level.id,
              pattern.id,
              practice.id,
              variantKey
            ),
            voiceId: "alloy",
            voiceName: "Alloy",
          });
        }
      }
    }
  }

  return tasks;
}

async function generateOpenAiAudio(task: AudioTask, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    body: JSON.stringify({
      input: task.text,
      instructions: "Speak clearly with a neutral, classroom-friendly tone.",
      model: "gpt-4o-mini-tts",
      response_format: "mp3",
      speed: 1,
      voice: task.voiceId,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `OpenAI returned ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateElevenLabsAudio(task: AudioTask, apiKey: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${task.voiceId}`,
    {
      body: JSON.stringify({
        model_id: "eleven_multilingual_v2",
        text: task.text,
        voice_settings: {
          similarity_boost: 0.78,
          speed: ELEVENLABS_COURSE_AUDIO_SPEED,
          stability: 0.56,
          style: 0,
          use_speaker_boost: true,
        },
      }),
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `ElevenLabs returned ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    dryRun?: unknown;
    levelId?: unknown;
    lessonId?: unknown;
    limit?: unknown;
    overwrite?: unknown;
    patternId?: unknown;
    scope?: unknown;
    secret?: unknown;
  };

  if (!hasAdminAccess(req, body.secret)) {
    return NextResponse.json({ error: "ADMIN_SECRET_REQUIRED" }, { status: 403 });
  }

  const scope = cleanScope(body.scope);
  const limit = cleanPositiveInteger(body.limit, 20);
  const dryRun = body.dryRun !== false;
  const overwrite = body.overwrite === true;
  const lessonId = cleanText(body.lessonId);
  const levelId = cleanText(body.levelId);
  const patternId = body.patternId ? cleanPositiveInteger(body.patternId, 0) : 0;

  const tasks = [
    ...(scope === "classic-scenes" || scope === "all"
      ? collectClassicSceneTasks(lessonId || undefined)
      : []),
    ...(scope === "sentence-patterns" || scope === "all"
      ? collectSentencePatternTasks(levelId || undefined, patternId || undefined)
      : []),
  ].slice(0, limit);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      limit,
      scope,
      tasks: tasks.map((task) => ({
        courseKind: task.courseKind,
        text: task.text,
        url: task.url,
        voiceName: task.voiceName,
      })),
      total: tasks.length,
    });
  }

  const needsOpenAi = tasks.some((task) => task.provider === "openai");
  const needsElevenLabs = tasks.some((task) => task.provider === "elevenlabs");
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

  if (needsOpenAi && !openAiApiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  if (needsElevenLabs && !elevenLabsApiKey) {
    return NextResponse.json(
      { error: "Missing ELEVENLABS_API_KEY" },
      { status: 500 }
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_COURSE_AUDIO_GENERATION !== "true" &&
    process.env.ALLOW_ELEVENLABS_COURSE_AUDIO_GENERATION !== "true"
  ) {
    return NextResponse.json(
      { error: "Audio generation is disabled in production" },
      { status: 403 }
    );
  }

  const generated: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ error: string; url: string }> = [];

  for (const task of tasks) {
    const filePath = audioUrlToFilePath(task.url);
    if (!overwrite && (await fileExists(filePath))) {
      skipped.push(task.url);
      continue;
    }

    try {
      const audio =
        task.provider === "openai"
          ? await generateOpenAiAudio(task, openAiApiKey || "")
          : await generateElevenLabsAudio(task, elevenLabsApiKey || "");
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, audio);
      generated.push(task.url);
    } catch (error) {
      failed.push({
        error: error instanceof Error ? error.message : "AUDIO_GENERATION_FAILED",
        url: task.url,
      });
    }
  }

  return NextResponse.json({
    failed,
    generated,
    generatedCount: generated.length,
    skipped,
    skippedCount: skipped.length,
  });
}
