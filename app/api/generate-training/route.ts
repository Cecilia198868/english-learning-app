import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TrainingItem = {
  zh: string;
  en: string;
};

function splitIntoShortChunks(items: TrainingItem[]) {
  const result: TrainingItem[] = [];

  for (const item of items) {
    const zhParts = item.zh
      .split(/，|,|、/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    const enParts = item.en
      .split(/,|and |then /)
      .map((segment) => segment.trim())
      .filter(Boolean);

    const normalizedZhParts = zhParts.length > 0 ? zhParts : [item.zh.trim()];
    const normalizedEnParts = enParts.length > 0 ? enParts : [item.en.trim()];
    const maxLen = Math.max(
      normalizedZhParts.length,
      normalizedEnParts.length
    );

    for (let i = 0; i < maxLen; i += 1) {
      const zh = normalizedZhParts[i] || normalizedZhParts[normalizedZhParts.length - 1];
      const en = normalizedEnParts[i] || normalizedEnParts[normalizedEnParts.length - 1];

      if (!zh || !en) continue;

      if (zh.length > 25 || en.split(/\s+/).filter(Boolean).length > 15) {
        result.push({ zh, en });
      } else {
        result.push({ zh, en });
      }
    }
  }

  return result.filter((item) => item.zh && item.en);
}

function detectPrimaryLanguage(text: string) {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishChars = (text.match(/[A-Za-z]/g) || []).length;

  if (chineseChars === 0 && englishChars === 0) {
    return "unknown";
  }

  return chineseChars >= englishChars ? "zh" : "en";
}

function normalizeTrainingItems(items: unknown): TrainingItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const record = item as { zh?: unknown; en?: unknown } | null;

      return {
        zh: typeof record?.zh === "string" ? record.zh.trim() : "",
        en: typeof record?.en === "string" ? record.en.trim() : "",
      };
    })
    .filter((item) => item.zh && item.en);
}

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: unknown };

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "NO_TEXT" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "NO_API_KEY" }, { status: 500 });
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      return NextResponse.json({ error: "NO_TEXT" }, { status: 400 });
    }

    const primaryLanguage = detectPrimaryLanguage(trimmedText);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are an English-learning course formatter.

Your job is to convert the user's full input text into bilingual training pairs for sentence-by-sentence study.

Rules:
1. You must process the entire input text from beginning to end.
2. Do not only process the first sentence.
3. Do not stop after the first sentence.
4. Return training pairs for all meaningful sentences or semantic units in the input.
5. Every important sentence or semantic unit in the input must be included.
6. Automatically detect whether the input is mainly Chinese or mainly English.
7. If the input is mainly Chinese, split it by punctuation and semantics, then produce natural English translations.
8. If the input is mainly English, split it by punctuation and semantics, then produce natural Chinese translations.
9. Highest priority: split by commas first whenever possible.
10. Chinese comma: ，
11. English comma: ,
12. Each comma-separated chunk should preferably become its own training sentence.
13. This product is for beginner learners. Prioritize learnability over grammatical completeness.
14. Very short training sentences are preferred.
15. Chinese training sentences should usually be around 6 to 20 Chinese characters.
16. English training sentences should usually be around 4 to 12 words.
17. Never exceed 25 Chinese characters unless absolutely unavoidable.
18. Never exceed 15 English words unless absolutely unavoidable.
19. Even if a chunk is not a complete sentence, it can still be a valid training unit.
20. Allowed training-unit types include:
action fragments, time fragments, state fragments, and process fragments.
21. If one sentence contains multiple actions, you must split it into multiple training sentences.
22. For example, content like “他走到河边，洗澡，吃饭” must be split into three training units.
23. The English side should match naturally. You may add light connectors such as and / then / so if needed, but do not change the meaning.
24. Do not split mechanically by fixed length alone; use punctuation and meaning together.
25. Long sentences must be broken into multiple shorter training sentences whenever possible.
26. Each training sentence should ideally express one semantic function or one action only.
27. If an English sentence exceeds 12 words, you should strongly try to split it; if it exceeds 15 words, you must split it unless impossible.
28. If a Chinese sentence exceeds 20 characters, you should strongly try to split it; if it exceeds 25 characters, you must split it unless impossible.
29. If an English sentence begins with a long time-setting phrase, you must split at the first comma.
30. This especially applies to openings like:
After ..., Before ..., While ..., When ..., Since ..., During ..., For many years ..., After practicing ...
31. In that case, the first part can be a background training unit, and the second part can be the main action unit.
32. The Chinese side must be split the same way, so phrases like “……之后，”“……以前，”“……期间，” can stand alone as training units.
33. In language learning, a time-background phrase may appear as a standalone training sentence even if it is not a full subject-predicate clause.
34. Each training sentence should ideally express only one semantic function, such as:
time background, main action, reason, result, or evaluation.
35. If a sentence is too long, split it by meaning while keeping each unit learnable and semantically clear.
36. Do not merge a long background clause back into the main clause just because it is not a full independent sentence.
37. Never output fragments that are semantically broken.
38. Do not omit important meaning.
39. You must cover the entire input text from beginning to end, not just the first half.
40. Do not add new meaning not present in the original text.
41. Remove useless noise such as timestamps, filler words, repeated junk, or meaningless labels.
42. For English long sentences, consider splitting around structures like:
that / which / who, from ... to ..., significantly improving ..., resulting in ..., leading to ..., thereby, therefore, consequently, while, because, although, as.
43. For Chinese long sentences, consider splitting around structures like:
，显著…… / ，从而…… / ，因此…… / ，并且…… / ，同时…… / ，已经从……到…… / ，成功从……推进到…… / ，进一步…… / ，有效……
44. Output only JSON.
45. Output must be a JSON object with exactly one key: "items".
46. The value of "items" must be an array.
47. Do not return top-level arrays.
48. Do not return keys like result or data.
49. Do not return a single object as the full response.
50. Even if there is only one sentence, "items" must still be an array with one item.
51. Each item must be:
{"zh":"中文句子","en":"English sentence."}

Output example:
{
  "items": [
    {
      "zh": "我今天有点累。",
      "en": "I'm a little tired today."
    },
    {
      "zh": "但是我还是想练习英语。",
      "en": "But I still want to practice English."
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Primary language hint: ${primaryLanguage}

Process the entire text below. Do not only process the first sentence.

Full input text:
${trimmedText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "training_pairs",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    zh: { type: "string" },
                    en: { type: "string" },
                  },
                  required: ["zh", "en"],
                },
              },
            },
            required: ["items"],
          },
        },
      },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    console.log("AI RAW:", content);

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("JSON parse failed:", content);
      return NextResponse.json(
        { error: "BAD_AI_JSON", raw: content },
        { status: 500 }
      );
    }

    let items: unknown[];

    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as { items?: unknown[] }).items)
    ) {
      items = (parsed as { items: unknown[] }).items;
    } else if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as { result?: unknown[] }).result)
    ) {
      items = (parsed as { result: unknown[] }).result;
    } else if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as { data?: unknown[] }).data)
    ) {
      items = (parsed as { data: unknown[] }).data;
    } else if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { zh?: unknown }).zh === "string" &&
      typeof (parsed as { en?: unknown }).en === "string"
    ) {
      items = [parsed];
    } else {
      console.error("Invalid AI response format:", parsed);
      return NextResponse.json(
        { error: "Invalid AI response format", raw: content },
        { status: 500 }
      );
    }

    const normalizedItems = splitIntoShortChunks(normalizeTrainingItems(items));

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { error: "BAD_AI_JSON", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json(normalizedItems);
  } catch (error) {
    console.error("generate-training error:", error);

    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
