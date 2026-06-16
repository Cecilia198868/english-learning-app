import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const COURSE_DATA = path.join(process.cwd(), "data", "nativeFlow", "courseData.ts");
const BATCH_SIZE = 40;
const MODEL = process.env.OPENAI_TRANSLATION_MODEL || "gpt-4o-mini";

async function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const source = await fs.readFile(envPath, "utf8");
    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {
    // The environment may already provide OPENAI_API_KEY.
  }
}

function extractSentencesBlock(source) {
  const match = source.match(
    /const nativeFlowSentencesByLevel: Record<NativeFlowLevelId, NativeFlowSentence\[]> = ([\s\S]*?);\n\nexport const nativeFlowProgressRows/,
  );
  if (!match) {
    throw new Error("Could not find nativeFlowSentencesByLevel in courseData.ts");
  }
  return match;
}

function collectMissingTranslations(sentencesByLevel) {
  const rows = [];
  for (const [levelId, sentences] of Object.entries(sentencesByLevel)) {
    for (const sentence of sentences) {
      if (!sentence.chinese || !sentence.chinese.trim()) {
        rows.push({ levelId, sentence });
      }
    }
  }
  return rows;
}

async function translateBatch(client, rows) {
  const numberedSentences = rows
    .map(({ sentence }, index) => `${index + 1}. ${sentence.english}`)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You translate English learning-course sentences into natural Simplified Chinese. Return only valid JSON with a translations array. Keep the same order and same number of items. Each translation should be concise, idiomatic, and faithful.",
      },
      {
        role: "user",
        content: `Translate these ${rows.length} English sentences into Simplified Chinese.\n\n${numberedSentences}\n\nReturn JSON exactly like: {"translations":["..."]}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || "";
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.translations) || parsed.translations.length !== rows.length) {
    throw new Error(`Translation batch returned ${parsed.translations?.length ?? 0} items; expected ${rows.length}.`);
  }
  return parsed.translations.map((translation) => String(translation).trim());
}

await loadEnvFile();

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required to fill native-flow translations.");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const source = await fs.readFile(COURSE_DATA, "utf8");
const match = extractSentencesBlock(source);
const sentencesByLevel = JSON.parse(match[1]);
const missingRows = collectMissingTranslations(sentencesByLevel);

if (!missingRows.length) {
  console.log("No missing native-flow translations.");
  process.exit(0);
}

console.log(`Translating ${missingRows.length} native-flow sentences with ${MODEL}...`);

for (let start = 0; start < missingRows.length; start += BATCH_SIZE) {
  const batch = missingRows.slice(start, start + BATCH_SIZE);
  const translations = await translateBatch(client, batch);
  translations.forEach((translation, index) => {
    batch[index].sentence.chinese = translation;
  });
  console.log(`Translated ${Math.min(start + batch.length, missingRows.length)} / ${missingRows.length}`);
}

const updated = source.replace(match[1], JSON.stringify(sentencesByLevel, null, 2));
await fs.writeFile(COURSE_DATA, updated, "utf8");
console.log(`Updated ${COURSE_DATA}`);
