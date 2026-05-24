export const runtime = "nodejs";
export const maxDuration = 300;

import OpenAI, { toFile } from "openai";
import { authOptions } from "@/auth";
import { getAccountSubscriptionForEmail } from "@/lib/subscriptionService";
import { normalizeToShortTrainingItems, type TrainingItem } from "@/lib/training";
import { getServerSession } from "next-auth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "missing",
});

const AUDIO_DURATION_LIMIT_SECONDS = {
  free: 5 * 60,
  pro: 30 * 60,
} as const;
const MAX_AUDIO_SIZE_BYTES = 24 * 1024 * 1024;
const MAX_SEGMENTS_FOR_COURSE = 600;

type YoutubeImportPlan = keyof typeof AUDIO_DURATION_LIMIT_SECONDS;

type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  name?: {
    simpleText?: string;
    runs?: Array<{ text?: string }>;
  };
};

type AdaptiveFormat = {
  url?: string;
  mimeType?: string;
  contentLength?: string;
  bitrate?: number;
  audioQuality?: string;
  approxDurationMs?: string;
  signatureCipher?: string;
  cipher?: string;
};

type PlayerResponse = {
  videoDetails?: {
    title?: string;
    lengthSeconds?: string;
    isLiveContent?: boolean;
  };
  captions?: {
    playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
  };
  streamingData?: {
    adaptiveFormats?: AdaptiveFormat[];
    formats?: AdaptiveFormat[];
  };
};

type TimedTextSegment = {
  text: string;
  startTime: number;
  endTime: number;
};

type TrainingPair = {
  chinese?: unknown;
  english?: unknown;
  zh?: unknown;
  en?: unknown;
  startTime?: unknown;
  endTime?: unknown;
};

async function getCurrentYoutubeImportPlan(): Promise<YoutubeImportPlan> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) return "free";

  const subscription = await getAccountSubscriptionForEmail(email);
  return subscription.subscriptionStatus === "free" ? "free" : "pro";
}

function friendlyFailure(status = 400) {
  return Response.json(
    {
      error: "YOUTUBE_GENERATION_FAILED",
      message: "暂时无法从这个视频生成课程",
      detail: "这个视频可能限制了字幕或音频读取。",
      actions: ["粘贴字幕 / 文案", "上传本地视频"],
    },
    { status }
  );
}

function durationLimitFailure(plan: YoutubeImportPlan) {
  const limitMinutes = AUDIO_DURATION_LIMIT_SECONDS[plan] / 60;
  const label = plan === "pro" ? "Pro" : "免费用户";

  return Response.json(
    {
      error: "YOUTUBE_DURATION_LIMIT",
      message: `${label}支持 ${limitMinutes} 分钟以内 YouTube 视频。建议：5～15 分钟视频生成效果最佳。`,
    },
    { status: 400 }
  );
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeCaptionText(text: string) {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function getVideoId(input: string) {
  const trimmed = input.trim();

  try {
    const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
    const url = new URL(urlMatch?.[0] || trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (host.endsWith("youtube.com")) {
      const directId = url.searchParams.get("v");
      if (directId) return directId;

      const parts = url.pathname.split("/").filter(Boolean);
      const knownPrefix = parts[0];
      if (
        ["embed", "shorts", "live"].includes(knownPrefix) &&
        typeof parts[1] === "string"
      ) {
        return parts[1];
      }
    }
  } catch {
    // Fall through to regex extraction.
  }

  const fallback = trimmed.match(
    /(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/
  );

  return fallback?.[1] || "";
}

function extractJsonAfterMarker(html: string, marker: string) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  const start = html.indexOf("{", markerIndex);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, index + 1);
      }
    }
  }

  return null;
}

function extractInnertubeApiKey(html: string) {
  return (
    html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] ||
    html.match(/innertubeApiKey":"([^"]+)"/)?.[1] ||
    ""
  );
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`FETCH_FAILED_${response.status}`);
  }

  return response.text();
}

async function fetchInnertubePlayerResponse({
  html,
  videoId,
}: {
  html: string;
  videoId: string;
}) {
  const apiKey = extractInnertubeApiKey(html);
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent":
            "com.google.android.youtube/19.09.37 (Linux; U; Android 12)",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "19.09.37",
              androidSdkVersion: 31,
            },
          },
          contentCheckOk: true,
          racyCheckOk: true,
          videoId,
        }),
      }
    );

    if (!response.ok) return null;
    return (await response.json()) as PlayerResponse;
  } catch {
    return null;
  }
}

function countDirectAudioFormats(playerResponse: PlayerResponse) {
  return (playerResponse.streamingData?.adaptiveFormats || []).filter(
    (format) => format.mimeType?.startsWith("audio/") && Boolean(format.url)
  ).length;
}

function mergePlayerResponses(
  webPlayerResponse: PlayerResponse,
  innertubePlayerResponse: PlayerResponse | null
) {
  if (!innertubePlayerResponse) return webPlayerResponse;

  const webAudioCount = countDirectAudioFormats(webPlayerResponse);
  const innertubeAudioCount = countDirectAudioFormats(innertubePlayerResponse);
  const streamingData =
    innertubeAudioCount > webAudioCount
      ? innertubePlayerResponse.streamingData
      : webPlayerResponse.streamingData;

  return {
    ...innertubePlayerResponse,
    ...webPlayerResponse,
    captions: webPlayerResponse.captions || innertubePlayerResponse.captions,
    streamingData,
    videoDetails:
      webPlayerResponse.videoDetails || innertubePlayerResponse.videoDetails,
  };
}

async function getYoutubeTitle(videoId: string, fallbackTitle = "") {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!response.ok) return fallbackTitle;

    const data = (await response.json()) as { title?: unknown };
    return typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : fallbackTitle;
  } catch {
    return fallbackTitle;
  }
}

function getTrackName(track: CaptionTrack) {
  if (track.name?.simpleText) return track.name.simpleText;
  if (Array.isArray(track.name?.runs)) {
    return track.name.runs
      .map((run) => run.text || "")
      .join("")
      .trim();
  }
  return "";
}

function chooseCaptionTrack(tracks: CaptionTrack[]) {
  return (
    tracks.find(
      (track) =>
        track.languageCode?.toLowerCase().startsWith("en") &&
        track.kind !== "asr"
    ) ||
    tracks.find((track) => track.languageCode?.toLowerCase().startsWith("en")) ||
    tracks.find((track) => track.kind !== "asr") ||
    tracks[0] ||
    null
  );
}

function parseJson3Captions(raw: string): TimedTextSegment[] {
  const parsed = JSON.parse(raw) as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8?: string }>;
    }>;
  };

  if (!Array.isArray(parsed.events)) return [];

  return parsed.events
    .map((event) => {
      const text = normalizeCaptionText(
        Array.isArray(event.segs)
          ? event.segs.map((segment) => segment.utf8 || "").join("")
          : ""
      );
      const startMs = typeof event.tStartMs === "number" ? event.tStartMs : NaN;
      const durationMs =
        typeof event.dDurationMs === "number" ? event.dDurationMs : 0;

      if (!text || Number.isNaN(startMs)) return null;

      const startTime = startMs / 1000;
      const endTime = (startMs + Math.max(durationMs, 1000)) / 1000;

      return {
        text,
        startTime,
        endTime,
      };
    })
    .filter((segment): segment is TimedTextSegment => Boolean(segment));
}

function parseXmlCaptions(raw: string): TimedTextSegment[] {
  return Array.from(raw.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g))
    .map((match) => {
      const attributes = match[1] || "";
      const text = normalizeCaptionText(match[2] || "");
      const start = Number(attributes.match(/\bstart="([^"]+)"/)?.[1]);
      const duration = Number(attributes.match(/\bdur="([^"]+)"/)?.[1] || 1);

      if (!text || Number.isNaN(start)) return null;

      return {
        text,
        startTime: start,
        endTime: start + (Number.isNaN(duration) ? 1 : duration),
      };
    })
    .filter((segment): segment is TimedTextSegment => Boolean(segment));
}

async function fetchCaptionSegments(track: CaptionTrack) {
  if (!track.baseUrl) return [];

  const captionUrl = new URL(track.baseUrl);
  captionUrl.searchParams.set("fmt", "json3");
  const raw = await fetchText(captionUrl.toString());

  try {
    return parseJson3Captions(raw);
  } catch {
    return parseXmlCaptions(raw);
  }
}

function normalizePairs(items: TrainingPair[]): TrainingItem[] {
  return normalizeToShortTrainingItems(
    items
      .map((item) => {
        const zh =
          typeof item.zh === "string"
            ? item.zh.trim()
            : typeof item.chinese === "string"
              ? item.chinese.trim()
              : "";
        const en =
          typeof item.en === "string"
            ? item.en.trim()
            : typeof item.english === "string"
              ? item.english.trim()
              : "";
        const startTime =
          typeof item.startTime === "number" ? item.startTime : undefined;
        const endTime =
          typeof item.endTime === "number" ? item.endTime : undefined;

        return { zh, en, startTime, endTime };
      })
      .filter((item) => item.zh && item.en)
  );
}

async function generateTrainingItemsFromSegments({
  title,
  segments,
  sourceLabel,
}: {
  title: string;
  segments: TimedTextSegment[];
  sourceLabel: string;
}) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `你是英语学习课程生成器。你只可以使用用户提供的 ${sourceLabel} segments 生成训练课程，严禁编造视频里没有的内容。

任务：
1. 把 segments 整理成适合中文用户做“中文提示 -> 英语输出”的训练句。
2. 如果内容主要是英文：english 必须来自原文，可以做轻微清理；chinese 是准确自然的中文翻译。
3. 如果内容主要是中文：zh 使用原意；en 生成准确自然英文。
4. 每一句都必须对应原始内容，不允许新增人物、情节、例句或主题。
5. 删除片头口播、频道订阅提醒、无意义重复、噪声文字。
6. 尽量短句化，适合一句一句练习。
7. 如果保留某句，必须保留对应 startTime 和 endTime。
8. 输出严格 JSON，不要 Markdown，不要解释。

JSON 格式：
{
  "pairs": [
    {
      "zh": "中文训练提示",
      "en": "English training sentence.",
      "startTime": 1.2,
      "endTime": 3.4
    }
  ]
}`,
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            title,
            segments: segments.slice(0, MAX_SEGMENTS_FOR_COURSE),
          },
          null,
          2
        ),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw) as { pairs?: TrainingPair[] };
  return Array.isArray(parsed.pairs) ? normalizePairs(parsed.pairs) : [];
}

function getVideoDurationSeconds(playerResponse: PlayerResponse) {
  const fromDetails = Number(playerResponse.videoDetails?.lengthSeconds);
  if (Number.isFinite(fromDetails) && fromDetails > 0) return fromDetails;

  const allFormats = [
    ...(playerResponse.streamingData?.adaptiveFormats || []),
    ...(playerResponse.streamingData?.formats || []),
  ];
  const formatDuration = allFormats
    .map((format) => Number(format.approxDurationMs))
    .find((durationMs) => Number.isFinite(durationMs) && durationMs > 0);

  return formatDuration ? formatDuration / 1000 : 0;
}

function getMimeType(format: AdaptiveFormat) {
  return format.mimeType?.split(";")[0].trim() || "audio/webm";
}

function getAudioExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function getKnownAudioSize(format: AdaptiveFormat) {
  const size = Number(format.contentLength);
  return Number.isFinite(size) && size > 0 ? size : null;
}

function chooseAudioFormat(playerResponse: PlayerResponse) {
  const formats = playerResponse.streamingData?.adaptiveFormats || [];
  const audioFormats = formats
    .filter((format) => format.mimeType?.startsWith("audio/"))
    .filter((format) => Boolean(format.url))
    .filter((format) => {
      const size = getKnownAudioSize(format);
      return size === null || size <= MAX_AUDIO_SIZE_BYTES;
    })
    .sort((a, b) => {
      const aSize = getKnownAudioSize(a) ?? Number.POSITIVE_INFINITY;
      const bSize = getKnownAudioSize(b) ?? Number.POSITIVE_INFINITY;
      if (aSize !== bSize) return aSize - bSize;
      return (a.bitrate || 0) - (b.bitrate || 0);
    });

  return audioFormats[0] || null;
}

async function downloadAudio(format: AdaptiveFormat) {
  if (!format.url) throw new Error("NO_AUDIO_URL");

  const knownSize = getKnownAudioSize(format);
  if (knownSize !== null && knownSize > MAX_AUDIO_SIZE_BYTES) {
    throw new Error("AUDIO_TOO_LARGE");
  }

  const response = await fetch(format.url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });

  if (!response.ok) throw new Error(`AUDIO_FETCH_FAILED_${response.status}`);

  const contentLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_AUDIO_SIZE_BYTES
  ) {
    throw new Error("AUDIO_TOO_LARGE");
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_AUDIO_SIZE_BYTES) {
    throw new Error("AUDIO_TOO_LARGE");
  }

  return arrayBuffer;
}

async function transcribeYoutubeAudio({
  playerResponse,
  videoId,
  maxDurationSeconds,
}: {
  playerResponse: PlayerResponse;
  videoId: string;
  maxDurationSeconds: number;
}): Promise<TimedTextSegment[]> {
  const durationSeconds = getVideoDurationSeconds(playerResponse);
  if (
    durationSeconds <= 0 ||
    durationSeconds > maxDurationSeconds ||
    playerResponse.videoDetails?.isLiveContent
  ) {
    throw new Error("AUDIO_DURATION_UNSUPPORTED");
  }

  const audioFormat = chooseAudioFormat(playerResponse);
  if (!audioFormat) {
    throw new Error("NO_DIRECT_AUDIO_STREAM");
  }

  const mimeType = getMimeType(audioFormat);
  const extension = getAudioExtension(mimeType);
  const audioBuffer = await downloadAudio(audioFormat);
  const audioFile = await toFile(
    Buffer.from(audioBuffer),
    `youtube-${videoId}.${extension}`,
    { type: mimeType }
  );

  const transcriptResult = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  const segments = Array.isArray(transcriptResult.segments)
    ? transcriptResult.segments
        .map((segment) => {
          const startTime =
            typeof segment.start === "number" ? segment.start : NaN;
          const endTime = typeof segment.end === "number" ? segment.end : NaN;
          const text =
            typeof segment.text === "string"
              ? normalizeCaptionText(segment.text)
              : "";

          if (!text || Number.isNaN(startTime) || Number.isNaN(endTime)) {
            return null;
          }

          return { text, startTime, endTime };
        })
        .filter((segment): segment is TimedTextSegment => Boolean(segment))
    : [];

  if (segments.length === 0) {
    throw new Error("EMPTY_AUDIO_TRANSCRIPT");
  }

  return segments;
}

async function generateFromCaptions({
  title,
  playerResponse,
}: {
  title: string;
  playerResponse: PlayerResponse;
}) {
  const tracks =
    playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const selectedTrack = chooseCaptionTrack(tracks);
  if (!selectedTrack) throw new Error("NO_CAPTIONS");

  const segments = await fetchCaptionSegments(selectedTrack);
  const usableSegments = segments.filter((segment) => segment.text);
  if (usableSegments.length === 0) throw new Error("EMPTY_CAPTIONS");

  const items = await generateTrainingItemsFromSegments({
    title,
    segments: usableSegments,
    sourceLabel: "YouTube 字幕",
  });

  if (items.length === 0) throw new Error("NO_CAPTION_ITEMS");

  return {
    source: "captions",
    items,
    transcriptPreview: usableSegments.slice(0, 8).map((segment) => segment.text),
    captionLanguage: selectedTrack.languageCode || "",
    captionTrackName: getTrackName(selectedTrack),
  };
}

async function generateFromAudio({
  title,
  videoId,
  playerResponse,
  maxDurationSeconds,
}: {
  title: string;
  videoId: string;
  playerResponse: PlayerResponse;
  maxDurationSeconds: number;
}) {
  const segments = await transcribeYoutubeAudio({
    playerResponse,
    videoId,
    maxDurationSeconds,
  });
  const items = await generateTrainingItemsFromSegments({
    title,
    segments,
    sourceLabel: "YouTube 音频转写",
  });

  if (items.length === 0) throw new Error("NO_AUDIO_ITEMS");

  return {
    source: "audio",
    items,
    transcriptPreview: segments.slice(0, 8).map((segment) => segment.text),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { url?: unknown };
    const plan = await getCurrentYoutubeImportPlan();
    const audioDurationLimitSeconds = AUDIO_DURATION_LIMIT_SECONDS[plan];
    const inputUrl = typeof body.url === "string" ? body.url.trim() : "";
    const videoId = getVideoId(inputUrl);

    if (!videoId) {
      return Response.json(
        {
          error: "INVALID_YOUTUBE_URL",
          message: "请粘贴有效的 YouTube 视频链接。",
        },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return friendlyFailure(500);
    }

    let playerResponse: PlayerResponse;

    try {
      const html = await fetchText(
        `https://www.youtube.com/watch?v=${videoId}&hl=en`
      );
      const json = extractJsonAfterMarker(html, "ytInitialPlayerResponse");
      if (!json) throw new Error("NO_PLAYER_RESPONSE");
      const webPlayerResponse = JSON.parse(json) as PlayerResponse;
      const innertubePlayerResponse = await fetchInnertubePlayerResponse({
        html,
        videoId,
      });
      playerResponse = mergePlayerResponses(
        webPlayerResponse,
        innertubePlayerResponse
      );
    } catch (error) {
      console.error("youtube page parse error:", error);
      return friendlyFailure(502);
    }

    const durationSeconds = getVideoDurationSeconds(playerResponse);
    if (
      durationSeconds > 0 &&
      durationSeconds > audioDurationLimitSeconds
    ) {
      return durationLimitFailure(plan);
    }

    const title =
      (await getYoutubeTitle(videoId, playerResponse.videoDetails?.title || "")) ||
      "YouTube 视频课程";

    try {
      const captionResult = await generateFromCaptions({
        title,
        playerResponse,
      });

      return Response.json({
        title,
        videoId,
        ...captionResult,
      });
    } catch (captionError) {
      console.log("youtube captions unavailable, trying audio:", captionError);
    }

    try {
      const audioResult = await generateFromAudio({
        title,
        videoId,
        playerResponse,
        maxDurationSeconds: audioDurationLimitSeconds,
      });

      return Response.json({
        title,
        videoId,
        ...audioResult,
      });
    } catch (audioError) {
      console.log("youtube audio fallback failed:", audioError);
      return friendlyFailure(400);
    }
  } catch (error) {
    console.error("youtube-to-training error:", error);
    return friendlyFailure(500);
  }
}
