"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deserializeTrainingItems,
  normalizeToShortTrainingItems,
  type TrainingItem,
  serializeTrainingItems,
} from "@/lib/training";
import { splitAudioToWavChunks } from "@/lib/audioSplit";

type Lesson = {
  id: string;
  title: string;
  txt_content: string;
  created_at: string;
  sourceAudioId?: string;
};

type GeneratedPair = {
  chinese: string;
  english: string;
  startTime?: number;
  endTime?: number;
};

type AudioItem = {
  id: string;
  title?: string;
  name?: string;
  fileName?: string;
  filename?: string;
  originalName?: string;
  label?: string;
  created_at: string;
};

type AudioDBRecord = {
  id: string;
  title?: string;
  name?: string;
  fileName?: string;
  filename?: string;
  originalName?: string;
  label?: string;
  created_at: string;
  file: Blob;
};

type AudioTrainingApiResponse = {
  title?: string;
  transcript?: string;
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
  }>;
  pairs?: GeneratedPair[];
  error?: string;
  message?: string;
};

function normalizeGeneratedPairs(pairs: GeneratedPair[]) {
  return normalizeToShortTrainingItems(
    pairs.map((pair) => ({
      zh: typeof pair.chinese === "string" ? pair.chinese.trim() : "",
      en: typeof pair.english === "string" ? pair.english.trim() : "",
      startTime:
        typeof pair.startTime === "number" ? pair.startTime : undefined,
      endTime: typeof pair.endTime === "number" ? pair.endTime : undefined,
    }))
  ).map((item) => ({
    chinese: item.zh,
    english: item.en,
    startTime: item.startTime,
    endTime: item.endTime,
  }));
}

type TranscribedSegment = {
  text: string;
  startTime: number;
  endTime: number;
};

type TranscribeChunkApiResponse = {
  chunkIndex?: number;
  startOffset?: number;
  transcript?: string;
  segments?: TranscribedSegment[];
  error?: string;
  message?: string;
};

type SegmentsToTrainingApiResponse = {
  title?: string;
  pairs?: GeneratedPair[];
  error?: string;
  message?: string;
};

type LocalLessonData = {
  lessons: Lesson[];
};

type SourceMode = "text-only" | "media-only" | "text-audio" | "featured";

const LESSONS_STORAGE_KEY = "english-app-lessons";
const DB_NAME = "english-learning-app-db";
const DB_VERSION = 1;
const AUDIO_STORE_NAME = "audios";
const MAX_AUDIO_SIZE_MB = 100;
const MAX_AUDIO_SIZE = MAX_AUDIO_SIZE_MB * 1024 * 1024;
const DIRECT_AUDIO_TO_TRAINING_MAX_BYTES = 4 * 1024 * 1024;
const AUDIO_CHUNK_SECONDS = 60;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(responseText || "服务器返回了非 JSON 错误");
  }
}

function getDefaultLessonsData(): LocalLessonData {
  return {
    lessons: [],
  };
}

function loadLessonsData(): LocalLessonData {
  if (typeof window === "undefined") {
    return getDefaultLessonsData();
  }

  try {
    const raw = localStorage.getItem(LESSONS_STORAGE_KEY);
    if (!raw) return getDefaultLessonsData();

    const parsed = JSON.parse(raw);

    return {
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
    };
  } catch (error) {
    console.error("读取 TXT 数据失败:", error);
    return getDefaultLessonsData();
  }
}

function saveLessonsData(data: LocalLessonData) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("操作失败:", error);
    throw new Error("操作失败");
  }
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("操作失败"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error("打开 IndexedDB 失败:", request.error);
      reject(new Error("打开 IndexedDB 失败"));
    };
  });
}

async function getAllAudiosFromDB(): Promise<AudioItem[]> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const result = (request.result || []) as AudioDBRecord[];

      const items: AudioItem[] = result
        .map((item) => ({
          id: item.id,
          title: item.title,
          name: item.name,
          fileName: item.fileName,
          filename: item.filename,
          originalName: item.originalName,
          label: item.label,
          created_at: item.created_at,
        }))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      resolve(items);
    };

    request.onerror = () => {
      console.error("操作失败:", request.error);
      reject(new Error("操作失败"));
    };
  });
}

async function saveAudioToDB(record: AudioDBRecord): Promise<void> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve();

    request.onerror = () => {
      console.error("操作失败:", request.error);
      reject(new Error("操作失败"));
    };
  });
}

async function getAudioBlobById(id: string): Promise<Blob | null> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as AudioDBRecord | undefined;
      resolve(result?.file || null);
    };

    request.onerror = () => {
      console.error("操作失败:", request.error);
      reject(new Error("操作失败"));
    };
  });
}

async function getAudioRecordById(id: string): Promise<AudioDBRecord | null> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve((request.result as AudioDBRecord | undefined) || null);
    };

    request.onerror = () => {
      console.error("操作失败:", request.error);
      reject(new Error("操作失败"));
    };
  });
}

async function deleteAudioFromDB(id: string): Promise<void> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();

    request.onerror = () => {
      console.error("操作失败:", request.error);
      reject(new Error("操作失败"));
    };
  });
}

export default function Home() {
  const router = useRouter();
  const [sourceMode, setSourceMode] = useState<SourceMode>("text-audio");
  const [showStartOptions, setShowStartOptions] = useState(false);
  const [expandedLearnSection, setExpandedLearnSection] = useState<
    "featured" | "my-courses" | null
  >(null);
  const [expandedMyCourseSection, setExpandedMyCourseSection] = useState<
    "saved" | "builder" | null
  >(null);
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [txtContent, setTxtContent] = useState("");
  const [message, setMessage] = useState("");
  const [subtitleFileName, setSubtitleFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [isGeneratingTraining, setIsGeneratingTraining] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<TrainingItem[]>([]);
  const [generatedPairs, setGeneratedPairs] = useState<GeneratedPair[]>([]);
  const [generatedSourceAudioId, setGeneratedSourceAudioId] = useState<
    string | null
  >(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  const [audioTitle, setAudioTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioMessage, setAudioMessage] = useState("");
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState("");
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(
    null
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);
  const showTextSection =
    sourceMode === "text-only" || sourceMode === "text-audio";
  const showAudioSection =
    sourceMode === "media-only" || sourceMode === "text-audio";
  const selectedAudio = useMemo(() => {
    return audios.find((item) => item.id === selectedAudioId) || null;
  }, [audios, selectedAudioId]);

  function isFunctionInvocationTimeoutMessage(message: string) {
    return (
      message.includes("FUNCTION_INVOCATION_TIMEOUT") ||
      message.includes("The function invocation timed out") ||
      message.includes("timed out")
    );
  }

  function loadLessons() {
    const data = loadLessonsData();
    setLessons(data.lessons || []);

    if (data.lessons.length > 0) {
      setExpandedLessonId((prev) => prev ?? data.lessons[0].id);
    } else {
      setExpandedLessonId(null);
    }
  }

  async function loadAudios() {
    try {
      const data = await getAllAudiosFromDB();
      setAudios(data);

      if (data.length > 0) {
        setSelectedAudioId((prev) => prev ?? data[0].id);
      } else {
        setSelectedAudioId(null);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "读取音频列表失败";
      setAudioMessage(msg);
    }
  }

  function handleSaveLesson() {
    try {
      setMessage("");

      if (!title.trim() || !txtContent.trim()) {
        setMessage("操作失败");
        return;
      }

      const contentToSave =
        generatedPairs.length > 0
          ? serializeTrainingItems(
              normalizeGeneratedPairs(generatedPairs).map((pair) => ({
                zh: pair.chinese,
                en: pair.english,
                startTime: pair.startTime,
                endTime: pair.endTime,
              }))
            )
          : txtContent.trim();

      const newLesson: Lesson = {
        id: createId(),
        title: title.trim(),
        txt_content: contentToSave,
        created_at: new Date().toISOString(),
        sourceAudioId: generatedSourceAudioId || undefined,
      };

      console.log("[lesson-save]", {
        lessonId: newLesson.id,
        title: newLesson.title,
        sourceAudioId: newLesson.sourceAudioId ?? null,
      });

      const current = loadLessonsData();
      const nextLessons = [newLesson, ...(current.lessons || [])];

      saveLessonsData({ lessons: nextLessons });
      setLessons(nextLessons);
      setExpandedLessonId(newLesson.id);

      setTitle("");
      setRawText("");
      setTxtContent("");
      setGeneratedPairs([]);
      setGeneratedSourceAudioId(null);
      setSubtitleFileName("");
      setFileContent("");
      setMessage("保存成功");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "操作失败";
      setMessage(msg);
    }
  }

  async function handleSubtitleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;
    setMessage("");

    if (!file) {
      setSubtitleFileName("");
      setFileContent("");
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (
      !lowerName.endsWith(".srt") &&
      !lowerName.endsWith(".txt") &&
      !lowerName.endsWith(".text") &&
      !lowerName.endsWith(".doc") &&
      !lowerName.endsWith(".docx") &&
      !lowerName.endsWith(".pdf")
    ) {
      setSubtitleFileName("");
      setFileContent("");
      setMessage("当前文件无法读取，请尝试 txt、docx 或可复制文本的 PDF。");
      event.target.value = "";
      return;
    }

    if (
      lowerName.endsWith(".doc") ||
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".pdf")
    ) {
      setSubtitleFileName(file.name);
      setFileContent("");
      setMessage("Word/PDF 解析功能下一步添加，请先使用 TXT 或 SRT。");
      return;
    }

    try {
      const rawText = await file.text();
      setSubtitleFileName(file.name);
      setFileContent(rawText);
      setRawText(rawText);
      setMessage(`已载入文件：${file.name}`);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "操作失败";
      setSubtitleFileName("");
      setFileContent("");
      setMessage(msg);
    }
  }

  async function handleGenerateTraining() {
    setMessage("");

    const inputText = rawText.trim() ? rawText : fileContent;
    if (!inputText.trim()) {
      setMessage("操作失败");
      return;
    }

    setIsGeneratingTraining(true);

    try {
      const res = await fetch("/api/generate-training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });

      const json = (await res.json().catch(() => null)) as
        | TrainingItem[]
        | {
            error?: string;
            message?: string;
            raw?: string;
            result?: TrainingItem[];
            items?: TrainingItem[];
            data?: TrainingItem[];
          }
        | null;

      if (!res.ok) {
        throw new Error(
          !json || Array.isArray(json)
            ? "操作失败"
            : json.error || json.message || json.raw || "操作失败"
        );
      }

      let items: TrainingItem[] = [];

      if (Array.isArray(json)) {
        items = json;
      } else if (json && Array.isArray(json.result)) {
        items = json.result;
      } else if (json && Array.isArray(json.items)) {
        items = json.items;
      } else if (json && Array.isArray(json.data)) {
        items = json.data;
      }

      if (items.length === 0) {
        throw new Error("Invalid frontend response format");
      }

      setGeneratedPairs([]);
      setGeneratedSourceAudioId(null);
      const normalizedItems = normalizeToShortTrainingItems(items);
      setGeneratedItems(normalizedItems);
      setCurrentIndex(0);
      setShowEnglish(false);
      setTxtContent(serializeTrainingItems(normalizedItems));
      setMessage(`已生成 ${normalizedItems.length} 条内容`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "操作失败";
      setMessage(msg);
    } finally {
      setIsGeneratingTraining(false);
    }
  }

  function handleDeleteLesson(id: string) {
    try {
      const ok = window.confirm("确定要删除这条课程吗？");
      if (!ok) return;

      const current = loadLessonsData();
      const nextLessons = current.lessons.filter((item) => item.id !== id);

      saveLessonsData({ lessons: nextLessons });
      setLessons(nextLessons);

      if (expandedLessonId === id) {
        setExpandedLessonId(nextLessons.length > 0 ? nextLessons[0].id : null);
      }

      setMessage("删除成功");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "操作失败";
      setMessage(msg);
    }
  }

  async function handleUploadAudio() {
    try {
      setAudioMessage("");

      if (!audioTitle.trim()) {
        setAudioMessage("操作失败");
        return;
      }

      if (!audioFile) {
        setAudioMessage("操作失败");
        return;
      }

      if (audioFile.size > MAX_AUDIO_SIZE) {
        setAudioMessage(`文件太大，请选择小于 ${MAX_AUDIO_SIZE_MB}MB 的音频文件。`);
        return;
      }

      const newAudio: AudioDBRecord = {
        id: createId(),
        title: audioTitle.trim() || audioFile.name,
        name: audioFile.name,
        fileName: audioFile.name,
        filename: audioFile.name,
        originalName: audioFile.name,
        label: audioTitle.trim() || audioFile.name,
        created_at: new Date().toISOString(),
        file: audioFile,
      };

      await saveAudioToDB(newAudio);
      const nextAudios = await getAllAudiosFromDB();

      setAudios(nextAudios);
      setSelectedAudioId(newAudio.id);
      setAudioTitle("");
      setAudioFile(null);
      setAudioMessage("上传成功");

      const fileInput = document.getElementById(
        "audio-file-input"
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "操作失败";
      setAudioMessage(msg);
    }
  }

  async function handleDeleteAudio(audio: AudioItem) {
    try {
      const ok = window.confirm("确定要删除这条音频吗？");
      if (!ok) return;

      await deleteAudioFromDB(audio.id);
      const nextAudios = await getAllAudiosFromDB();

      setAudios(nextAudios);

      if (selectedAudioId === audio.id) {
        setSelectedAudioId(nextAudios.length > 0 ? nextAudios[0].id : null);

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }

      setAudioMessage("删除成功");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "操作失败";
      setAudioMessage(msg);
    }
  }

  function applyGeneratedAudioTraining(
    audio: AudioItem,
    pairs: GeneratedPair[],
    transcript: string,
    generatedTitle?: string
  ) {
    const normalizedPairs = normalizeGeneratedPairs(pairs);

    if (normalizedPairs.length === 0) {
      throw new Error("操作失败");
    }

    const items: TrainingItem[] = normalizedPairs.map((pair) => ({
      zh: pair.chinese,
      en: pair.english,
      startTime: pair.startTime,
      endTime: pair.endTime,
    }));
    const generatedText = normalizedPairs
      .map((pair) => `${pair.chinese}\n${pair.english}`)
      .join("\n\n");
    const nextTitle =
      (typeof generatedTitle === "string" && generatedTitle.trim()) ||
      audio.title ||
      audio.name ||
      audio.fileName ||
      "音频生成课程";

    setTitle(nextTitle);
    setRawText(generatedText);
    setTxtContent(serializeTrainingItems(items));
    setGeneratedPairs(normalizedPairs);
    setGeneratedSourceAudioId(audio.id);
    setGeneratedItems(items);
    setCurrentIndex(0);
    setShowEnglish(false);
    setSourceMode("text-audio");
    setFileContent(transcript);
    setSubtitleFileName("");
    setMessage("训练内容生成成功，请检查后点击保存 TXT。");
  }

  async function getStoredAudioBlob(audio: AudioItem) {
    const audioRecord = await getAudioRecordById(audio.id);
    console.log("已保存音频对象:", audioRecord ?? audio);

    const blobSource =
      audioRecord?.file ||
      (
        audioRecord as (AudioDBRecord & {
          blob?: Blob;
          audioBlob?: Blob;
          audioData?: Blob;
          data?: Blob;
        }) | null
      )?.blob ||
      (
        audioRecord as (AudioDBRecord & {
          blob?: Blob;
          audioBlob?: Blob;
          audioData?: Blob;
          data?: Blob;
        }) | null
      )?.audioBlob ||
      (
        audioRecord as (AudioDBRecord & {
          blob?: Blob;
          audioBlob?: Blob;
          audioData?: Blob;
          data?: Blob;
        }) | null
      )?.audioData ||
      (
        audioRecord as (AudioDBRecord & {
          blob?: Blob;
          audioBlob?: Blob;
          audioData?: Blob;
          data?: Blob;
        }) | null
      )?.data ||
      (await getAudioBlobById(audio.id));

    if (!blobSource) {
      console.log("读取不到音频 blob:", audioRecord ?? audio);
      throw new Error("操作失败");
    }

    const audioTitleForApi =
      audio.title ||
      audio.name ||
      audio.fileName ||
      audio.filename ||
      audio.originalName ||
      audio.label ||
      "音频生成课程";
    const fileName =
      audioRecord?.fileName ||
      audioRecord?.filename ||
      audioRecord?.name ||
      audioRecord?.originalName ||
      `${audioTitleForApi}.mp3`;

    return {
      audioTitleForApi,
      fileName,
      uploadFile:
        blobSource instanceof File
          ? blobSource
          : new File([blobSource], fileName, {
              type: blobSource.type || "audio/mpeg",
            }),
    };
  }

  async function handleGenerateAudioTraining(audio: AudioItem) {
    try {
      setGeneratingAudioId(audio.id);
      setAudioMessage("");

      const { audioTitleForApi, fileName, uploadFile } =
        await getStoredAudioBlob(audio);

      const shouldUseDirectAudioRoute =
        uploadFile.size <= DIRECT_AUDIO_TO_TRAINING_MAX_BYTES &&
        typeof window !== "undefined" &&
        window.location.hostname === "localhost";

      if (shouldUseDirectAudioRoute) {
        setMessage("正在识别音频并生成训练内容，请稍候...");

        const formData = new FormData();
        formData.append("audio", uploadFile);
        formData.append("title", audioTitleForApi);

        const response = await fetch("/api/audio-to-training", {
          method: "POST",
          body: formData,
        });
        const result = await parseJsonResponse<AudioTrainingApiResponse>(response);

        if (!response.ok) {
          const errorMessage =
            result.error || result.message || "生成失败";
          if (
            response.status === 413 ||
            errorMessage.includes("Request Entity Too Large")
          ) {
            throw new Error(
              "音频文件太大，请先用 1–3 分钟短音频测试。长音频需要以后做分段转写。"
            );
          }

          throw new Error(errorMessage);
        }

        const pairs = Array.isArray(result.pairs) ? result.pairs : [];
        applyGeneratedAudioTraining(
          audio,
          pairs,
          typeof result.transcript === "string" ? result.transcript : "",
          result.title
        );
        return;
      }

      if (
        typeof window !== "undefined" &&
        window.location.hostname !== "localhost"
      ) {
        setMessage("线上环境将自动分段处理音频，请稍候...");
      }

      setMessage("正在切分音频...");
      const chunks = await splitAudioToWavChunks(uploadFile, AUDIO_CHUNK_SECONDS);
      console.log("分段数量:", chunks.length);
      console.log("chunk durations:", chunks.map((chunk) => chunk.duration));

      if (chunks.length === 0) {
        throw new Error("操作失败");
      }

      const allSegments: TranscribedSegment[] = [];
      const transcriptParts: string[] = [];

      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        setMessage(`正在转写第 ${i + 1} / ${chunks.length} 段...`);

        const chunkFormData = new FormData();
        chunkFormData.append(
          "audio",
          new File([chunk.blob], `${fileName}-chunk-${chunk.index + 1}.wav`, {
            type: "audio/wav",
          })
        );
        chunkFormData.append("chunkIndex", String(chunk.index));
        chunkFormData.append("startOffset", String(chunk.startOffset));

        const response = await fetch("/api/transcribe-chunk", {
          method: "POST",
          body: chunkFormData,
        });
        const result =
          await parseJsonResponse<TranscribeChunkApiResponse>(response);

        if (!response.ok) {
          throw new Error(
            result.error ||
              result.message ||
              `第 ${i + 1} 段转写失败`
          );
        }

        const chunkSegments = Array.isArray(result.segments)
          ? result.segments.filter(
              (segment) =>
                segment &&
                typeof segment.text === "string" &&
                typeof segment.startTime === "number" &&
                typeof segment.endTime === "number"
            )
          : [];

        if (chunkSegments.length === 0 && !(result.transcript || "").trim()) {
          throw new Error(`第 ${i + 1} 段转写失败`);
        }

        allSegments.push(...chunkSegments);
        if (typeof result.transcript === "string" && result.transcript.trim()) {
          transcriptParts.push(result.transcript.trim());
        }
      }

      setMessage("正在整理训练内容...");
      const response = await fetch("/api/segments-to-training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: audioTitleForApi,
          segments: allSegments,
        }),
      });
      const result =
        await parseJsonResponse<SegmentsToTrainingApiResponse>(response);

      if (!response.ok) {
        throw new Error(result.error || result.message || "生成失败");
      }

      const pairs = Array.isArray(result.pairs) ? result.pairs : [];
      applyGeneratedAudioTraining(
        audio,
        pairs,
        transcriptParts.join(" ").trim(),
        result.title
      );
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "操作失败";
      const msg = isFunctionInvocationTimeoutMessage(rawMessage)
        ? "音频太长，线上处理超时。请缩短音频，或使用分段上传。建议每段不超过 3 分钟。"
        : rawMessage;
      setMessage(msg);
      setAudioMessage(msg);
    } finally {
      setGeneratingAudioId(null);
    }
  }

  function handleSaveAudioAsLesson(audio: AudioItem) {
    try {
      setMessage("");

      if (generatedSourceAudioId !== audio.id || !title.trim() || !txtContent.trim()) {
        setMessage("请先为这条音频生成训练内容，再点击保存。");
        return;
      }

      handleSaveLesson();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "操作失败";
      setMessage(msg);
    }
  }

  function toggleLesson(id: string) {
    setExpandedLessonId((prev) => (prev === id ? null : id));
  }

  function handleStopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  function setPlaybackRate(rate: number) {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }

  function handleContinueLearning() {
    if (lessons.length === 0) {
      setMessage("还没有课程，请先开始学习或制作课程。");
      setShowStartOptions(true);
      setExpandedLearnSection("my-courses");
      setExpandedMyCourseSection("builder");
      return;
    }

    const targetLesson = lessons[0];
    localStorage.setItem("currentLessonTitle", targetLesson.title || "未命名课程");
    router.push(`/study/${targetLesson.id}`);
  }

  function handleOpenStartLearning() {
    setShowStartOptions((prev) => {
      const next = !prev;

      if (next) {
        setExpandedLearnSection((current) => current ?? "my-courses");
        setExpandedMyCourseSection((current) => current ?? "saved");
      }

      return next;
    });
  }

  function handleSelectLearnSection(section: "featured" | "my-courses") {
    setShowStartOptions(true);
    setExpandedLearnSection((prev) => (prev === section ? null : section));

    if (section === "my-courses") {
      setExpandedMyCourseSection((prev) => prev ?? "saved");
    }
  }

  function handleStaticCourseClick() {
    setMessage("课程建设中");
  }

  useEffect(() => {
    loadLessons();
    loadAudios();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedAudioUrl() {
      if (!selectedAudioId) {
        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
          currentObjectUrlRef.current = null;
        }
        setSelectedAudioUrl("");
        return;
      }

      try {
        setLoadingAudio(true);
        const blob = await getAudioBlobById(selectedAudioId);

        if (cancelled) return;

        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
          currentObjectUrlRef.current = null;
        }

        if (!blob) {
          setSelectedAudioUrl("");
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        currentObjectUrlRef.current = objectUrl;
        setSelectedAudioUrl(objectUrl);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setSelectedAudioUrl("");
          setAudioMessage("操作失败");
        }
      } finally {
        if (!cancelled) {
          setLoadingAudio(false);
        }
      }
    }

    loadSelectedAudioUrl();

    return () => {
      cancelled = true;
    };
  }, [selectedAudioId]);

  useEffect(() => {
    return () => {
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[430px] px-4 py-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="text-center">
            <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium tracking-[0.2em] text-emerald-300">
              SPEAKING APP
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">开口英语</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">
              看中文，想英文，真正练开口
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleContinueLearning}
              className="w-full rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-emerald-500 to-emerald-700 px-5 py-5 text-left shadow-lg shadow-emerald-950/40 transition hover:from-emerald-400 hover:to-emerald-600"
            >
              <div className="text-lg font-bold">继续上次学习</div>
              <div className="mt-1 text-sm text-white/75">
                直接回到最近保存的一节课程
              </div>
            </button>

            <button
              onClick={handleOpenStartLearning}
              className="w-full rounded-[1.75rem] border border-white/10 bg-white/8 px-5 py-5 text-left transition hover:bg-white/12"
            >
              <div className="text-lg font-bold">开始学习</div>
              <div className="mt-1 text-sm text-white/65">
                查看精选课程、我的课程和课程制作入口
              </div>
            </button>

            <Link
              href="/vocabulary"
              className="block w-full rounded-[1.75rem] border border-white/10 bg-blue-600/90 px-5 py-5 text-left transition hover:bg-blue-500"
            >
              <div className="text-lg font-bold">单词闯关</div>
              <div className="mt-1 text-sm text-blue-100/85">
                进入单词本，开始四选一背诵测试
              </div>
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-3xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            {message}
          </div>
        ) : null}

        {showStartOptions ? (
          <section className="mt-5 space-y-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
              <div className="grid gap-3">
                <button
                  onClick={() => handleSelectLearnSection("featured")}
                  className="w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/8"
                >
                  <div className="text-lg font-bold">精选课程</div>
                  <div className="mt-1 text-sm text-white/60">
                    实用场景口语与分级口语学习
                  </div>
                </button>

                <button
                  onClick={() => handleSelectLearnSection("my-courses")}
                  className="w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/8"
                >
                  <div className="text-lg font-bold">我的课程</div>
                  <div className="mt-1 text-sm text-white/60">
                    查看已有课程，或制作自己的课程
                  </div>
                </button>

                <Link
                  href="/vocabulary"
                  className="block w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/8"
                >
                  <div className="text-lg font-bold">我的单词本</div>
                  <div className="mt-1 text-sm text-white/60">
                    跳转到单词本页面
                  </div>
                </Link>
              </div>
            </div>

            {expandedLearnSection === "featured" ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <h2 className="text-xl font-bold">精选课程</h2>

                <div className="mt-5">
                  <h3 className="text-sm font-semibold tracking-[0.12em] text-white/55">
                    实用场景口语
                  </h3>
                  <div className="mt-3 grid gap-3">
                    {["银行", "面试", "政府", "餐厅", "电话", "旅游"].map((item) => (
                      <button
                        key={item}
                        onClick={handleStaticCourseClick}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/8"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold tracking-[0.12em] text-white/55">
                    分级口语学习
                  </h3>
                  <div className="mt-3 grid gap-3">
                    {[
                      "成人初级口语学习",
                      "成人中级口语学习",
                      "成人高级口语学习",
                      "小学生口语学习",
                      "初中生口语学习",
                      "高中生口语学习",
                    ].map((item) => (
                      <button
                        key={item}
                        onClick={handleStaticCourseClick}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left hover:bg-white/8"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {expandedLearnSection === "my-courses" ? (
              <div className="space-y-4">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-3">
                    <button
                      onClick={() =>
                        setExpandedMyCourseSection((prev) =>
                          prev === "saved" ? null : "saved"
                        )
                      }
                      className="w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/8"
                    >
                      <div className="text-lg font-bold">已有课程</div>
                      <div className="mt-1 text-sm text-white/60">
                        查看已保存课程并进入学习
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        setExpandedMyCourseSection((prev) =>
                          prev === "builder" ? null : "builder"
                        )
                      }
                      className="w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/8"
                    >
                      <div className="text-lg font-bold">制作我的课程</div>
                      <div className="mt-1 text-sm text-white/60">
                        导入文本资料或音频资料，生成自己的训练内容
                      </div>
                    </button>
                  </div>
                </div>

                {expandedMyCourseSection === "saved" ? (
                  <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                    <h2 className="text-xl font-bold">已有课程</h2>

                    <div className="mt-4 space-y-3">
                      {lessons.length === 0 ? (
                        <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                          还没有保存任何课程。
                        </div>
                      ) : (
                        lessons.map((lesson, index) => {
                          const isExpanded = expandedLessonId === lesson.id;

                          return (
                            <div
                              key={lesson.id}
                              className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
                            >
                              <div className="flex items-center gap-3 px-4 py-4">
                                <button
                                  onClick={() => toggleLesson(lesson.id)}
                                  className="min-w-0 flex-1 text-left hover:text-blue-300"
                                >
                                  <div className="truncate text-base font-bold">
                                    {index + 1}. {lesson.title}
                                  </div>
                                  <div className="mt-1 text-xs text-white/50">
                                    {isExpanded ? "点击收起" : "点击展开"}
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    localStorage.setItem(
                                      "currentLessonTitle",
                                      lesson.title || "未命名课程"
                                    );
                                    router.push(`/study/${lesson.id}`);
                                  }}
                                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium"
                                >
                                  学习
                                </button>

                                <button
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium"
                                >
                                  删除
                                </button>
                              </div>

                              {isExpanded ? (
                                <div className="border-t border-white/10 px-4 py-4">
                                  <div className="space-y-2 text-sm text-white/80">
                                    {deserializeTrainingItems(lesson.txt_content).map(
                                      (item, itemIndex) => (
                                        <div
                                          key={`${lesson.id}-${itemIndex}`}
                                          className="rounded-2xl bg-white/5 px-3 py-2"
                                        >
                                          {item.zh ? <p>{item.zh}</p> : null}
                                          <p className={item.zh ? "mt-1 text-white/55" : ""}>
                                            {item.en}
                                          </p>
                                          {!item.zh ? (
                                            <p className="mt-1 text-white/45">
                                              暂无中文翻译
                                            </p>
                                          ) : null}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}

                {expandedMyCourseSection === "builder" ? (
                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
                      <h2 className="text-xl font-bold">制作我的课程</h2>
                      <div className="mt-4 grid gap-3">
                        {[
                          { value: "text-only", label: "只用文本资料" },
                          { value: "media-only", label: "只用音频资料" },
                          { value: "text-audio", label: "文本 + 音频资料" },
                        ].map((option) => {
                          const isActive = sourceMode === option.value;

                          return (
                            <button
                              key={option.value}
                              onClick={() => setSourceMode(option.value as SourceMode)}
                              className={`w-full rounded-2xl px-4 py-3 text-left font-semibold transition ${
                                isActive
                                  ? "bg-emerald-600 text-white"
                                  : "border border-white/10 bg-black/20 text-white/75 hover:bg-white/8"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {showTextSection ? (
                      <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                        <h2 className="text-xl font-bold">导入文本资料</h2>

                        <input
                          type="text"
                          placeholder="输入课程标题"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="mt-4 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 outline-none placeholder:text-white/35"
                        />

                        <div className="mt-3 grid gap-3">
                          <input
                            id="subtitle-file-input"
                            type="file"
                            accept=".txt,.text,.srt,.doc,.docx,.pdf,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleSubtitleFileChange}
                            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm"
                          />

                          <button
                            onClick={handleGenerateTraining}
                            disabled={isGeneratingTraining}
                            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50"
                          >
                            一键生成训练内容
                          </button>
                        </div>

                        {subtitleFileName ? (
                          <div className="mt-3 text-xs text-white/55">
                            当前字幕：{subtitleFileName}
                          </div>
                        ) : null}

                        <textarea
                          placeholder="把中文或英文文本粘贴到这里，或上传 TXT/SRT 后一键生成训练内容"
                          value={rawText}
                          onChange={(e) => setRawText(e.target.value)}
                          rows={8}
                          className="mt-3 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 outline-none placeholder:text-white/35"
                        />

                        {generatedItems.length > 0 ? (
                          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-white/85">
                                当前训练预览
                              </div>
                              <div className="text-xs text-white/50">
                                {currentIndex + 1} / {generatedItems.length}
                              </div>
                            </div>

                            <p className="rounded-2xl bg-white/5 px-3 py-3 text-sm leading-6">
                              {generatedItems[currentIndex]?.zh || "暂无中文翻译"}
                            </p>

                            <div className="mt-3 rounded-2xl bg-white/5 px-3 py-3 text-sm leading-6 text-white/75">
                              {showEnglish
                                ? generatedItems[currentIndex]?.en || ""
                                : "点击显示英文后可查看原句"}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  setCurrentIndex((prev) => Math.max(prev - 1, 0))
                                }
                                disabled={currentIndex === 0}
                                className="rounded-2xl bg-slate-700 px-3 py-2 text-sm disabled:opacity-40"
                              >
                                上一句
                              </button>
                              <button
                                onClick={() =>
                                  setCurrentIndex((prev) =>
                                    Math.min(prev + 1, generatedItems.length - 1)
                                  )
                                }
                                disabled={currentIndex >= generatedItems.length - 1}
                                className="rounded-2xl bg-blue-600 px-3 py-2 text-sm disabled:opacity-40"
                              >
                                下一句
                              </button>
                              <button
                                onClick={() => setShowEnglish(true)}
                                className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm"
                              >
                                显示英文
                              </button>
                              <button
                                onClick={() => setShowEnglish(false)}
                                className="rounded-2xl bg-slate-700 px-3 py-2 text-sm"
                              >
                                隐藏英文
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <button
                          onClick={handleSaveLesson}
                          className="mt-3 w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500"
                        >
                          保存文本课程
                        </button>
                      </div>
                    ) : null}

                    {showAudioSection ? (
                      <div className="space-y-4">
                        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                          <h2 className="text-xl font-bold">导入音频资料</h2>

                          <input
                            type="text"
                            placeholder="输入音频标题"
                            value={audioTitle}
                            onChange={(e) => setAudioTitle(e.target.value)}
                            className="mt-4 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 outline-none placeholder:text-white/35"
                          />

                          <input
                            id="audio-file-input"
                            type="file"
                            accept=".mp3,audio/mpeg,audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setAudioFile(file);
                            }}
                            className="mt-3 block w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3"
                          />

                          <button
                            onClick={handleUploadAudio}
                            className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500"
                          >
                            保存音频资料
                          </button>

                          {audioMessage ? (
                            <div className="mt-3 rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
                              {audioMessage}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                          <h2 className="text-xl font-bold">已保存音频</h2>

                          <div className="mt-4 space-y-3">
                            {audios.length === 0 ? (
                              <p className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                                还没有上传任何音频。
                              </p>
                            ) : (
                              audios.map((audio, index) => {
                                const savedAudioTitle =
                                  audio.title ||
                                  audio.name ||
                                  audio.fileName ||
                                  audio.filename ||
                                  audio.originalName ||
                                  audio.label ||
                                  "未命名音频";
                                const linkedLesson =
                                  lessons.find((lesson) => lesson.sourceAudioId === audio.id) ||
                                  null;

                                return (
                                  <div
                                    key={audio.id}
                                    className={`rounded-2xl border px-4 py-4 ${
                                      selectedAudioId === audio.id
                                        ? "border-blue-400 bg-blue-500/20"
                                        : "border-white/10 bg-black/20"
                                    }`}
                                  >
                                    <div className="mb-3 flex min-w-0 items-center gap-2">
                                      <span className="shrink-0 font-bold">
                                        {index + 1}.
                                      </span>
                                      <button
                                        onClick={() => setSelectedAudioId(audio.id)}
                                        className="min-w-0 flex-1 truncate text-left font-semibold hover:text-blue-300"
                                        title={savedAudioTitle}
                                      >
                                        {savedAudioTitle}
                                      </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        onClick={() => handleGenerateAudioTraining(audio)}
                                        disabled={generatingAudioId === audio.id}
                                        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
                                      >
                                        {generatingAudioId === audio.id
                                          ? "生成中..."
                                          : "一键生成训练内容"}
                                      </button>

                                      <button
                                        onClick={() => handleSaveAudioAsLesson(audio)}
                                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium"
                                      >
                                        保存
                                      </button>

                                      {linkedLesson ? (
                                        <Link
                                          href={`/study/${linkedLesson.id}`}
                                          onClick={() => {
                                            localStorage.setItem(
                                              "currentLessonTitle",
                                              linkedLesson.title || savedAudioTitle
                                            );
                                          }}
                                          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium"
                                        >
                                          学习
                                        </Link>
                                      ) : (
                                        <button
                                          disabled
                                          className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-medium text-white/60"
                                        >
                                          先保存课程
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleDeleteAudio(audio)}
                                        className="rounded-xl bg-red-600 px-3 py-2 text-sm"
                                      >
                                        删除
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                          <h2 className="text-xl font-bold">音频播放器</h2>

                          <div className="mt-4">
                            {selectedAudio ? (
                              <div className="rounded-2xl bg-black/20 p-5">
                                <h3 className="mb-4 text-lg font-semibold">
                                  {selectedAudio.title}
                                </h3>

                                {loadingAudio ? (
                                  <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                                    正在加载音频...
                                  </div>
                                ) : null}

                                {!loadingAudio &&
                                selectedAudioUrl &&
                                selectedAudioUrl.trim() !== "" ? (
                                  <audio
                                    ref={audioRef}
                                    src={selectedAudioUrl}
                                    controls
                                    className="w-full"
                                  />
                                ) : null}

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    onClick={handleStopAudio}
                                    className="rounded-xl bg-orange-600 px-4 py-2"
                                  >
                                    停止
                                  </button>
                                  {[0.75, 1, 1.25, 1.5].map((rate) => (
                                    <button
                                      key={rate}
                                      onClick={() => setPlaybackRate(rate)}
                                      className="rounded-xl bg-slate-700 px-4 py-2"
                                    >
                                      {rate}x
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-2xl bg-black/20 p-4 text-sm text-white/60">
                                请先在上方音频列表中点击一条音频。
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        <p className="mt-6 px-2 text-center text-xs leading-6 text-white/35">
          课程与音频仍保存在本机浏览器中。原来的文本导入、音频上传、课程保存、学习和删除功能都保留在“开始学习 → 我的课程”里。
        </p>
      </div>
    </main>
  );
}
