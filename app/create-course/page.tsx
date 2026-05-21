"use client";

import type { ChangeEvent, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { serializeTrainingItems, type TrainingItem } from "@/lib/training";

type ImportView = "home" | "paste" | "image" | "camera" | "video" | "youtube";
type StoredLesson = {
  id: string;
  title: string;
  txt_content: string;
  created_at: string;
};

const LESSONS_STORAGE_KEY = "english-app-lessons";
const DEFAULT_YOUTUBE_COURSE_NAME = "YouTube 视频课程";
const DEFAULT_PASTE_COURSE_NAME = "粘贴文字课程";
const DEFAULT_IMAGE_COURSE_NAME = "图片文字课程";

type YoutubeTrainingResponse = {
  title?: string;
  videoId?: string;
  source?: "captions" | "audio";
  items?: TrainingItem[];
  error?: string;
  message?: string;
  detail?: string;
};

type ExtractTextResponse = {
  text?: string;
  fileName?: string;
  error?: string;
};

function extractCourseName(sourceText: string, fallback = DEFAULT_YOUTUBE_COURSE_NAME) {
  const bracketMatch = sourceText.match(/《([^》]+)》/);
  if (bracketMatch?.[1]?.trim()) {
    return `《${bracketMatch[1].trim()}》`;
  }

  const trimmed = sourceText.trim();
  return trimmed ? trimmed.slice(0, 36) : fallback;
}

function createCourseId(videoId?: string) {
  if (videoId) return `my-course-youtube-${videoId}`;
  return `my-course-youtube-${Date.now()}`;
}

function createPasteCourseId() {
  return `my-course-paste-${Date.now()}`;
}

function createImageCourseId() {
  return `my-course-image-${Date.now()}`;
}

function extractPastedCourseName(sourceText: string) {
  const bracketMatch = sourceText.match(/《([^》]+)》/);
  if (bracketMatch?.[1]?.trim()) {
    return `《${bracketMatch[1].trim()}》`;
  }

  const firstLine =
    sourceText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || "";
  const cleaned = firstLine.replace(/\s+/g, " ").replace(/^[-#*>\s]+/, "");

  return cleaned ? cleaned.slice(0, 22) : DEFAULT_PASTE_COURSE_NAME;
}

function extractImageCourseName(fileName: string, sourceText: string) {
  const cleanFileName = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

  if (cleanFileName) return cleanFileName.slice(0, 22);

  const firstLine =
    sourceText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || "";

  return firstLine ? firstLine.slice(0, 22) : DEFAULT_IMAGE_COURSE_NAME;
}

function normalizeGeneratedTrainingItems(data: unknown) {
  return Array.isArray(data)
    ? data.filter(
        (item): item is TrainingItem =>
          typeof item?.zh === "string" &&
          typeof item?.en === "string" &&
          Boolean(item.zh.trim()) &&
          Boolean(item.en.trim())
      )
    : [];
}

function saveGeneratedCourseToStorage({
  courseId,
  courseTitle,
  items,
}: {
  courseId: string;
  courseTitle: string;
  items: TrainingItem[];
}) {
  if (typeof window === "undefined" || items.length === 0) return;

  const lesson: StoredLesson = {
    id: courseId,
    title: courseTitle,
    txt_content: serializeTrainingItems(items, {
      preserveOriginalItems: true,
    }),
    created_at: new Date().toISOString(),
  };

  try {
    const raw = window.localStorage.getItem(LESSONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const existingLessons = Array.isArray(parsed.lessons)
      ? (parsed.lessons as StoredLesson[])
      : [];
    const nextLessons = [
      lesson,
      ...existingLessons.filter((item) => item?.id !== courseId),
    ];

    window.localStorage.setItem(
      LESSONS_STORAGE_KEY,
      JSON.stringify({ ...parsed, lessons: nextLessons })
    );
    window.localStorage.setItem("currentLessonTitle", courseTitle);
    window.localStorage.removeItem(`lesson-progress-${courseId}`);
  } catch {
    window.localStorage.setItem(
      LESSONS_STORAGE_KEY,
      JSON.stringify({ lessons: [lesson] })
    );
    window.localStorage.setItem("currentLessonTitle", courseTitle);
    window.localStorage.removeItem(`lesson-progress-${courseId}`);
  }
}

function SoundWaveMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 92 44"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="createCourseSoundWaveBorder" x1="10" y1="36" x2="82" y2="8">
          <stop stopColor="#d85ee9" />
          <stop offset="1" stopColor="#28d5e8" />
        </linearGradient>
        <linearGradient id="createCourseSoundWaveBars" x1="22" y1="22" x2="70" y2="22">
          <stop stopColor="#d85ee9" />
          <stop offset="0.48" stopColor="#e9e6ff" />
          <stop offset="1" stopColor="#28d5e8" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="3"
        width="88"
        height="38"
        rx="19"
        fill="rgba(255,255,255,0.34)"
        stroke="url(#createCourseSoundWaveBorder)"
        strokeWidth="3"
      />
      <path
        d="M23 22h0.1M33 17v10M43 13v18M53 8v28M63 14v16M73 18v8"
        stroke="url(#createCourseSoundWaveBars)"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <circle cx="82" cy="22" r="4" fill="#28d5e8" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <span
      aria-hidden="true"
      className="relative block h-5 w-5 before:absolute before:left-0 before:top-1/2 before:h-[2px] before:w-5 before:-translate-y-1/2 before:bg-[#43375f] after:absolute after:left-0 after:top-1/2 after:h-3 after:w-3 after:-translate-y-1/2 after:rotate-45 after:border-b-[2px] after:border-l-[2px] after:border-[#43375f]"
    />
  );
}

function MenuIcon() {
  return (
    <span className="relative block h-4 w-5 before:absolute before:left-0 before:top-0 before:h-px before:w-4 before:bg-[#6f6685] after:absolute after:bottom-0 after:left-0 after:h-px after:w-5 after:bg-[#6f6685]">
      <span className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-[#6f6685]" />
    </span>
  );
}

function YoutubeIcon() {
  return (
    <span className="relative grid h-14 w-14 place-items-center rounded-full bg-white/38 shadow-[0_0_36px_rgba(236,72,153,0.24)]">
      <span className="grid h-10 w-12 place-items-center rounded-[12px] bg-[linear-gradient(135deg,#ff4fb4_0%,#e82a8c_100%)] shadow-[0_12px_28px_rgba(232,42,140,0.22)]">
        <span className="ml-0.5 h-0 w-0 border-y-[8px] border-l-[12px] border-y-transparent border-l-white" />
      </span>
    </span>
  );
}

function YoutubeInputIcon() {
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white shadow-[0_12px_34px_rgba(232,42,140,0.16)]">
      <span className="grid h-8 w-10 place-items-center rounded-[9px] bg-[#ff1f1f]">
        <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-white" />
      </span>
    </span>
  );
}

function SubtitleIcon() {
  return (
    <span className="relative grid h-14 w-14 place-items-center rounded-full bg-white/38 shadow-[0_0_36px_rgba(139,92,246,0.22)]">
      <span className="relative h-11 w-9 rounded-[9px] bg-[linear-gradient(135deg,#da4bff_0%,#735cff_100%)] shadow-[0_12px_28px_rgba(126,92,255,0.2)]">
        <span className="absolute left-2 top-3 h-1 w-5 rounded-full bg-white/82" />
        <span className="absolute left-2 top-5 h-1 w-4 rounded-full bg-white/72" />
        <span className="absolute left-2 top-7 h-1 w-6 rounded-full bg-white/64" />
      </span>
    </span>
  );
}

function LocalVideoIcon() {
  return (
    <span className="relative grid h-14 w-14 place-items-center rounded-full bg-white/38 shadow-[0_0_36px_rgba(91,140,255,0.22)]">
      <span className="relative h-11 w-12 rounded-[11px] bg-[linear-gradient(135deg,#7c5cff_0%,#5297ff_100%)] shadow-[0_12px_28px_rgba(91,140,255,0.2)]">
        <span className="absolute -top-1 left-1 h-2 w-10 -rotate-6 rounded-[4px] bg-white/76" />
        <span className="absolute left-4 top-[17px] h-0 w-0 border-y-[7px] border-l-[10px] border-y-transparent border-l-white" />
      </span>
    </span>
  );
}

function ImageSourceIcon() {
  return (
    <span className="grid h-24 w-24 place-items-center rounded-full bg-[#efe9ff] sm:h-28 sm:w-28">
      <span className="relative h-14 w-14 rounded-[12px] bg-[linear-gradient(135deg,#bda7ff_0%,#765cff_100%)] shadow-[0_16px_34px_rgba(126,92,255,0.24)] sm:h-16 sm:w-16">
        <span className="absolute bottom-3 left-3 h-0 w-0 border-x-[14px] border-b-[18px] border-x-transparent border-b-white" />
        <span className="absolute bottom-3 right-3 h-0 w-0 border-x-[12px] border-b-[15px] border-x-transparent border-b-white/86" />
        <span className="absolute right-3 top-3 h-4 w-4 rounded-full bg-white/92" />
      </span>
    </span>
  );
}

function CameraSourceIcon() {
  return (
    <span className="grid h-24 w-24 place-items-center rounded-full bg-[#efe9ff] sm:h-28 sm:w-28">
      <span className="relative h-14 w-16 rounded-[14px] bg-[linear-gradient(135deg,#bda7ff_0%,#765cff_100%)] shadow-[0_16px_34px_rgba(126,92,255,0.24)] sm:h-16 sm:w-[4.5rem]">
        <span className="absolute left-5 top-[-8px] h-4 w-8 rounded-t-[8px] bg-[#a891ff]" />
        <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[5px] border-white">
          <span className="h-3 w-3 rounded-full bg-white" />
        </span>
      </span>
    </span>
  );
}

function ShieldLockIcon() {
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(135deg,#cabaff_0%,#856bff_100%)] shadow-[0_12px_26px_rgba(126,92,255,0.2)]">
      <span className="absolute inset-x-3 top-2 h-7 rounded-b-[12px] rounded-t-[8px] bg-white/30" />
      <span className="relative mt-1 h-4 w-4 rounded-[4px] bg-white/88 before:absolute before:left-1/2 before:top-[-8px] before:h-3 before:w-3 before:-translate-x-1/2 before:rounded-t-full before:border-2 before:border-b-0 before:border-white/88" />
    </span>
  );
}

function ImageTipIcon() {
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#b7a6ff_0%,#8c6cff_100%)] shadow-[0_10px_24px_rgba(126,92,255,0.18)]">
      <span className="absolute top-2.5 h-4 w-4 rounded-full border-2 border-white/78" />
      <span className="absolute top-[22px] h-2 w-3 rounded-b-[5px] bg-white/78" />
      <span className="absolute bottom-2 h-1 w-4 rounded-full bg-white/68" />
    </span>
  );
}

function LightbulbIcon() {
  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#b7a6ff_0%,#8c6cff_100%)] shadow-[0_10px_24px_rgba(126,92,255,0.18)]">
      <span className="absolute top-2.5 h-4 w-4 rounded-full border-2 border-white/78" />
      <span className="absolute top-[22px] h-2 w-3 rounded-b-[5px] bg-white/78" />
      <span className="absolute bottom-2 h-1 w-4 rounded-full bg-white/68" />
    </span>
  );
}

function ImageSourceButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto flex min-h-[13.5rem] w-full max-w-[315px] flex-col items-center justify-center rounded-[22px] bg-white/76 px-5 py-6 text-center shadow-[0_22px_48px_rgba(84,72,146,0.1),inset_0_1px_0_rgba(255,255,255,0.94)] transition hover:bg-white/88"
    >
      {icon}
      <span className="mt-5 text-[1.08rem] font-black leading-7 text-[#201833]">
        {title}
      </span>
      <span className="mt-3 text-[0.74rem] font-bold leading-5 text-[#746b91]">
        {description}
      </span>
    </button>
  );
}

function VideoOptionButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[7.1rem] w-full items-center gap-5 rounded-[24px] border border-white/70 bg-white/44 px-5 py-5 text-left shadow-[0_20px_54px_rgba(84,72,146,0.12),inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:bg-white/56"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.18rem] font-black leading-7 text-[#201833]">
          {title}
        </span>
        <span className="mt-2 block text-[0.94rem] font-bold leading-6 text-[#746b91]">
          {description}
        </span>
      </span>
      <span className="shrink-0 text-[3rem] font-light leading-none text-[#9c83ff]">
        ›
      </span>
    </button>
  );
}

function GeneratingCourseOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#19172c]/78 px-6 text-center text-white backdrop-blur-[2px]">
      <div className="relative grid h-48 w-48 place-items-center">
        <span className="absolute inset-0 rounded-full border border-[#b6a7ff]/24" />
        <span className="absolute inset-8 rounded-full border border-[#b6a7ff]/34 shadow-[0_0_34px_rgba(139,92,246,0.24)]" />
        <span className="absolute inset-16 rounded-full border border-[#8b6dff]/34" />
        <span className="absolute left-[-4rem] right-[-4rem] top-1/2 h-px bg-[linear-gradient(90deg,transparent,rgba(139,92,246,0.64),rgba(145,220,255,0.42),rgba(139,92,246,0.64),transparent)] shadow-[0_0_28px_rgba(139,92,246,0.58)]" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#8b6dff]/16 shadow-[0_0_44px_rgba(139,92,246,0.5)]">
          {[0, 1, 2, 3, 4].map((bar) => (
            <span
              key={bar}
              className="mx-0.5 w-1.5 rounded-full bg-[linear-gradient(180deg,#c85cff,#91dcff)] animate-pulse"
              style={{ height: `${18 + Math.abs(2 - bar) * 8}px` }}
            />
          ))}
        </span>
      </div>

      <h2 className="mt-8 text-[1.85rem] font-black leading-tight text-white">
        正在为你生成课程...
      </h2>
      <p className="mt-4 text-[1rem] font-extrabold text-white/66">
        系统正在尝试读取字幕和语音。
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[0.86rem] font-extrabold text-white/66">
        <span className="text-[#a98cff]">✓ 读取公开字幕</span>
        <span>✓ 没有字幕时提取语音</span>
        <span>✓ 自动整理句子与表达</span>
        <span>✓ 生成英语输出训练</span>
      </div>

      <p className="absolute bottom-12 left-6 right-6 flex items-center justify-center gap-2 text-[0.82rem] font-bold text-white/38">
        <span>🔒</span>
        所有内容仅存储在你的设备本地，隐私安全有保障
      </p>
    </div>
  );
}

export default function CreateCoursePage() {
  const router = useRouter();
  const pastedTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const textImageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraImageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [importView, setImportView] = useState<ImportView>("home");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  useEffect(() => {
    if (!cameraVideoRef.current || !cameraStream) return;

    cameraVideoRef.current.srcObject = cameraStream;
    void cameraVideoRef.current.play().catch(() => {
      setGenerationError("相机预览暂时无法播放，请重新打开相机。");
    });
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  function stopCameraStream() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    setIsCameraStarting(false);

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }

  function openFilePicker(inputRef: RefObject<HTMLInputElement | null>) {
    inputRef.current?.click();
    setShowSourceSheet(false);
  }

  function focusPastedTextarea() {
    pastedTextareaRef.current?.focus({ preventScroll: true });
  }

  async function pasteClipboardToTextArea() {
    focusPastedTextarea();

    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
      setGenerationError("请在输入框内长按，然后选择粘贴。");
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText.trim()) {
        setGenerationError("剪贴板里还没有可用文字。");
        return;
      }

      setPastedText((current) => {
        const nextText = current.trim()
          ? `${current}${current.endsWith("\n") ? "" : "\n"}${clipboardText}`
          : clipboardText;
        return nextText;
      });
      setGenerationError("");
      window.setTimeout(focusPastedTextarea, 0);
    } catch {
      setGenerationError("请在输入框内长按，然后选择粘贴。");
    }
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    event.currentTarget.value = "";
    setSelectedFileName(file.name);
  }

  function handleImageFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";

    if (!file) return;

    void startGeneratingImageCourse(file);
  }

  function openVideoImportView() {
    setShowSourceSheet(false);
    setImportView("video");
  }

  function returnToSourceSheet() {
    setImportView("home");
    setShowSourceSheet(true);
  }

  function goBackFromCurrentView() {
    if (importView === "youtube") {
      setImportView("video");
      return;
    }

    if (importView === "paste") {
      returnToSourceSheet();
      return;
    }

    if (importView === "image") {
      returnToSourceSheet();
      return;
    }

    if (importView === "camera") {
      stopCameraStream();
      setImportView("image");
      return;
    }

    if (importView === "video") {
      returnToSourceSheet();
      return;
    }

    router.replace("/speak-english?menu=1");
  }

  async function requestTrainingItemsFromText({
    text,
    emptyMessage,
    fallbackErrorMessage,
  }: {
    text: string;
    emptyMessage: string;
    fallbackErrorMessage: string;
  }) {
    const response = await fetch("/api/generate-training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = (await response.json()) as TrainingItem[] | { error?: string };

    if (!response.ok) {
      throw new Error(fallbackErrorMessage);
    }

    const items = normalizeGeneratedTrainingItems(data);

    if (items.length === 0) {
      throw new Error(emptyMessage);
    }

    return items;
  }

  async function startGeneratingCourse() {
    const trimmedUrl = youtubeUrl.trim();

    if (!trimmedUrl) {
      setGenerationError("请先粘贴有效的 YouTube 视频链接。");
      return;
    }

    setGenerationError("");
    setShowSourceSheet(false);
    setImportView("home");
    setIsGeneratingCourse(true);

    try {
      const response = await fetch("/api/youtube-to-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "free", url: trimmedUrl }),
      });
      const data = (await response.json()) as YoutubeTrainingResponse;

      if (!response.ok) {
        throw new Error(
          data.error === "INVALID_YOUTUBE_URL"
            ? data.message || "请粘贴有效的 YouTube 视频链接。"
            : data.message || "暂时无法从这个视频生成课程"
        );
      }

      const items = Array.isArray(data.items)
        ? data.items.filter(
            (item): item is TrainingItem =>
              typeof item?.zh === "string" &&
              typeof item?.en === "string" &&
              Boolean(item.zh.trim()) &&
              Boolean(item.en.trim())
          )
        : [];

      if (items.length === 0) {
        throw new Error("没有从这个视频字幕中生成可学习内容。");
      }

      const courseName = extractCourseName(
        data.title || trimmedUrl,
        data.title || DEFAULT_YOUTUBE_COURSE_NAME
      );
      const courseTitle = `我的课程：${courseName}`;
      const courseId = createCourseId(data.videoId);

      saveGeneratedCourseToStorage({
        courseId,
        courseTitle,
        items,
      });
      setSelectedFileName(courseName.replace(/[《》]/g, ""));
      router.push(`/study/${courseId}`);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "暂时无法从这个视频生成课程"
      );
      setImportView("youtube");
    } finally {
      setIsGeneratingCourse(false);
    }
  }

  async function startGeneratingPastedCourse() {
    const trimmedText = pastedText.trim();

    if (!trimmedText) {
      setGenerationError("请先粘贴要生成课程的文字。");
      return;
    }

    setGenerationError("");
    setShowSourceSheet(false);
    setImportView("home");
    setIsGeneratingCourse(true);

    try {
      const items = await requestTrainingItemsFromText({
        text: trimmedText,
        emptyMessage: "没有从这段文字中生成可学习内容。",
        fallbackErrorMessage: "暂时无法从这段文字生成课程",
      });

      const courseName = extractPastedCourseName(trimmedText);
      const courseTitle = `我的课程：${courseName}`;
      const courseId = createPasteCourseId();

      saveGeneratedCourseToStorage({
        courseId,
        courseTitle,
        items,
      });
      setSelectedFileName(courseName.replace(/[《》]/g, ""));
      router.push(`/study/${courseId}`);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "暂时无法从这段文字生成课程"
      );
      setImportView("paste");
    } finally {
      setIsGeneratingCourse(false);
    }
  }

  async function prepareImageFileForUpload(file: File) {
    if (typeof window === "undefined") return file;

    const canUseCanvas =
      typeof Image !== "undefined" && typeof document !== "undefined";

    if (!canUseCanvas) return file;

    try {
      const imageUrl = URL.createObjectURL(file);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
        nextImage.src = imageUrl;
      });

      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(imageUrl);
        return file;
      }

      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(imageUrl);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (!blob) return file;

      const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "image";
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    } catch {
      return file;
    }
  }

  function dataUrlToBlob(dataUrl: string) {
    const [header, data] = dataUrl.split(",");
    const mimeMatch = header.match(/data:([^;]+);base64/);
    const mimeType = mimeMatch?.[1] || "image/jpeg";
    const binary = window.atob(data || "");
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType });
  }

  async function canvasToJpegFile(canvas: HTMLCanvasElement) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      if (typeof canvas.toBlob === "function") {
        canvas.toBlob(
          (nextBlob) => {
            if (nextBlob) {
              resolve(nextBlob);
              return;
            }

            reject(new Error("CANVAS_BLOB_EMPTY"));
          },
          "image/jpeg",
          0.86
        );
        return;
      }

      try {
        resolve(dataUrlToBlob(canvas.toDataURL("image/jpeg", 0.86)));
      } catch (error) {
        reject(error instanceof Error ? error : new Error("CANVAS_DATA_URL_FAILED"));
      }
    });

    return new File([blob], `camera-photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
  }

  async function startGeneratingImageCourse(file: File) {
    stopCameraStream();
    setSelectedFileName(file.name);
    setGenerationError("");
    setShowSourceSheet(false);
    setImportView("home");
    setIsGeneratingCourse(true);

    try {
      const uploadFile = await prepareImageFileForUpload(file);
      const formData = new FormData();
      formData.append("file", uploadFile);

      const extractResponse = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });
      const extractData = (await extractResponse.json()) as ExtractTextResponse;
      const extractedText = extractData.text?.trim() || "";

      if (!extractResponse.ok || !extractedText) {
        throw new Error(
          extractData.error || "暂时无法识别这张图片的文字，请换一张更清晰的图片。"
        );
      }

      const items = await requestTrainingItemsFromText({
        text: extractedText,
        emptyMessage: "没有从这张图片中生成可学习内容。",
        fallbackErrorMessage: "暂时无法从这张图片生成课程",
      });

      const courseName = extractImageCourseName(uploadFile.name || file.name, extractedText);
      const courseTitle = `我的课程：${courseName}`;
      const courseId = createImageCourseId();

      saveGeneratedCourseToStorage({
        courseId,
        courseTitle,
        items,
      });
      setSelectedFileName(courseName.replace(/[《》]/g, ""));
      router.push(`/study/${courseId}`);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "暂时无法从这张图片生成课程"
      );
      setImportView("image");
    } finally {
      setIsGeneratingCourse(false);
    }
  }

  async function openCameraCaptureView() {
    setGenerationError("");
    setShowSourceSheet(false);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      openFilePicker(cameraImageInputRef);
      return;
    }

    stopCameraStream();
    setImportView("camera");
    setIsCameraStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1440 },
          height: { ideal: 1920 },
        },
      });

      cameraStreamRef.current = stream;
      setCameraStream(stream);
      setIsCameraStarting(false);
    } catch {
      stopCameraStream();
      setGenerationError("无法打开相机，请允许相机权限，或改用相册选择。");
      setImportView("image");
    }
  }

  async function takeCameraPhoto() {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setGenerationError("相机还没有准备好，请稍等一下。");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setGenerationError("暂时无法拍照，请改用相册选择。");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setGenerationError("");
    setShowSourceSheet(false);
    setImportView("home");
    setIsGeneratingCourse(true);

    try {
      const photoFile = await canvasToJpegFile(canvas);
      await startGeneratingImageCourse(photoFile);
    } catch {
      stopCameraStream();
      setIsGeneratingCourse(false);
      setGenerationError("暂时无法保存照片，请重新拍照或改用相册选择。");
      setImportView("image");
    }
  }

  function openSubtitlePasteFallback() {
    setGenerationError("");
    setSelectedFileName("粘贴视频字幕 / 文案");
    setImportView("video");
  }

  function openLocalVideoFallback() {
    setGenerationError("");
    openFilePicker(videoFileInputRef);
  }

  return (
    <main className="responsive-page-shell sf-speak-page min-h-[100dvh] overflow-x-hidden text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[560px] items-center justify-center p-0 sm:p-4">
        <section className="sf-speak-phone relative flex h-[100dvh] min-h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-none sm:h-[calc(100dvh-16px)] sm:min-h-[720px] sm:rounded-[34px]">
          <div className="pointer-events-none absolute left-1/2 top-[32%] z-0 h-[470px] w-[470px] -translate-x-1/2 rounded-full border border-[#91dcff]/10" />
          <div className="pointer-events-none absolute left-1/2 top-[38%] z-0 h-[340px] w-[340px] -translate-x-1/2 rounded-full border border-[#b799ff]/12" />

          <header className="relative z-10 shrink-0 px-6 pt-7">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label={importView === "home" ? "返回菜单" : "返回上一页"}
                onClick={goBackFromCurrentView}
                className="sf-header-button"
              >
                {importView === "home" ? <MenuIcon /> : <BackArrowIcon />}
              </button>

              <div className="flex items-center gap-1.5">
                <span className="grid h-5 w-[42px] place-items-center">
                  <SoundWaveMark className="h-5 w-[42px] drop-shadow-[0_8px_16px_rgba(91,140,255,0.18)]" />
                </span>
                <div>
                  <h1 className="text-[1.05rem] font-semibold leading-none text-[#201833]">
                    SpeakFlow
                  </h1>
                  <p className="mt-0.5 text-[0.42rem] font-semibold uppercase tracking-[0.16em] text-[#7ee7ff]/80">
                    voice practice
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label={importView === "home" ? "返回练习页" : "帮助"}
                onClick={() => {
                  if (importView !== "home") return;
                  router.replace("/speak-english?menu=1");
                }}
                className={`sf-header-button font-extrabold text-[#201833] ${
                  importView === "home" ? "text-[1.05rem]" : "text-[1.1rem]"
                }`}
              >
                {importView === "home" ? "v" : "?"}
              </button>
            </div>
          </header>

          {importView === "paste" ? (
            <section className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <div className="mx-auto w-full max-w-[342px] px-3 pb-3 pt-2">
                <button
                  type="button"
                  onClick={startGeneratingPastedCourse}
                  disabled={isGeneratingCourse}
                  className="mx-auto flex h-14 w-[min(100%,282px)] items-center justify-center rounded-full bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_52%,#ef6cf8_100%)] px-6 text-[1.05rem] font-black text-[#201833] shadow-[0_18px_42px_rgba(200,92,255,0.28)] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  <span className="mr-2 text-[1.25rem]">✨</span>
                  {isGeneratingCourse ? "正在生成..." : "生成我的课程"}
                </button>

                <p className="mt-4 flex items-center justify-center gap-2 text-center text-[0.82rem] font-bold leading-6 text-[#8b84a2]">
                  <span className="text-[0.95rem] text-[#8b6dff]">🔒</span>
                  内容仅保存在本地，隐私安全有保障
                </p>
              </div>

              <div
                className="mt-5 flex min-h-0 flex-1 flex-col rounded-[26px] border-2 border-dashed border-[#c7b8ff] bg-white/24 px-4 pb-4 pt-3 shadow-[0_24px_70px_rgba(84,72,146,0.1),inset_0_1px_0_rgba(255,255,255,0.82)]"
                onClick={focusPastedTextarea}
                onTouchStart={focusPastedTextarea}
              >
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <span className="min-w-0 text-[0.82rem] font-bold leading-5 text-[#8b84a2]">
                    粘贴或输入你的内容
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void pasteClipboardToTextArea();
                    }}
                    className="shrink-0 rounded-full bg-white/72 px-4 py-2 text-[0.88rem] font-black text-[#6c54df] shadow-[0_10px_22px_rgba(84,72,146,0.1),inset_0_1px_0_rgba(255,255,255,0.92)]"
                  >
                    粘贴内容
                  </button>
                </div>
                <label className="block min-h-0 flex-1">
                  <span className="sr-only">粘贴课程内容</span>
                  <textarea
                    ref={pastedTextareaRef}
                    value={pastedText}
                    onChange={(event) => {
                      setPastedText(event.target.value);
                      setGenerationError("");
                    }}
                    placeholder="请在这里长按粘贴或直接输入内容"
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    spellCheck
                    className="h-full min-h-[320px] w-full resize-none rounded-[22px] border border-white/86 bg-white/58 px-5 py-5 text-[1rem] font-bold leading-7 text-[#201833] outline-none shadow-[0_18px_42px_rgba(84,72,146,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] placeholder:text-[#8f88a5]"
                    style={{
                      WebkitUserSelect: "text",
                      userSelect: "text",
                      WebkitTouchCallout: "default",
                    }}
                  />
                </label>

                {generationError ? (
                  <p className="mt-4 rounded-[16px] bg-[#fff2f5]/86 px-4 py-3 text-center text-[0.88rem] font-black leading-6 text-[#b14363]">
                    {generationError}
                  </p>
                ) : null}
              </div>
            </section>
          ) : importView === "image" ? (
            <section className="relative z-10 min-h-0 flex-1 overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
              <h2 className="mx-auto w-fit bg-white/18 px-5 py-2 text-center text-[1.45rem] font-black leading-none text-[#201833] shadow-[0_16px_36px_rgba(84,72,146,0.06)]">
                选择图片来源
              </h2>

              <div className="mt-7 grid gap-5">
                <ImageSourceButton
                  icon={<ImageSourceIcon />}
                  title="从相册选择"
                  description={
                    <>
                      选择已有图片
                      <br />
                      截图、课本或文档等
                    </>
                  }
                  onClick={() => openFilePicker(textImageInputRef)}
                />
                <ImageSourceButton
                  icon={<CameraSourceIcon />}
                  title="直接拍照"
                  description={
                    <>
                      拍摄书籍、屏幕
                      <br />
                      或纸质内容
                    </>
                  }
                  onClick={openCameraCaptureView}
                />
              </div>

              {generationError ? (
                <p className="mt-5 rounded-[18px] bg-[#fff2f5]/86 px-4 py-3 text-center text-[0.9rem] font-black leading-6 text-[#b14363]">
                  {generationError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => openFilePicker(textImageInputRef)}
                className="mt-8 flex w-full items-center gap-4 rounded-[22px] bg-white/56 px-5 py-4 text-left shadow-[0_20px_48px_rgba(84,72,146,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:bg-white/68"
              >
                <ShieldLockIcon />
                <span className="min-w-0 flex-1 text-[0.9rem] font-bold leading-6 text-[#746b91]">
                  你的图片仅用于文字识别和课程生成，
                  <br />
                  不会被存储或分享，隐私安全有保障
                </span>
                <span className="shrink-0 text-[2.1rem] font-light leading-none text-[#9f96b4]">
                  ›
                </span>
              </button>

              <div className="mt-6 rounded-[22px] bg-white/56 px-5 py-5 shadow-[0_20px_48px_rgba(84,72,146,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="flex items-start gap-4">
                  <ImageTipIcon />
                  <div className="min-w-0">
                    <h3 className="text-[1.08rem] font-black leading-7 text-[#6c54df]">
                      小贴士
                    </h3>
                    <ul className="mt-2 space-y-2 text-[0.82rem] font-bold leading-6 text-[#746b91]">
                      <li>• 图片内容清晰，识别效果更好</li>
                      <li>• 支持中英文及多种语言识别</li>
                      <li>• 识别结果可编辑，生成课程后可随时调整</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          ) : importView === "camera" ? (
            <section className="absolute inset-0 z-40 overflow-hidden bg-[#17151f] text-white">
              <video
                ref={cameraVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/10" />

              <button
                type="button"
                onClick={goBackFromCurrentView}
                aria-label="返回图片识别"
                className="absolute left-5 top-6 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/24 text-white backdrop-blur-md"
              >
                <span
                  aria-hidden="true"
                  className="relative block h-5 w-5 before:absolute before:left-0 before:top-1/2 before:h-[2px] before:w-5 before:-translate-y-1/2 before:bg-white after:absolute after:left-0 after:top-1/2 after:h-3 after:w-3 after:-translate-y-1/2 after:rotate-45 after:border-b-[2px] after:border-l-[2px] after:border-white"
                />
              </button>

              <div className="pointer-events-none absolute inset-x-4 top-6 z-10 h-[calc(100%-10.5rem)]">
                <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-[4px] border-l-[3px] border-t-[3px] border-white/86" />
                <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-[4px] border-r-[3px] border-t-[3px] border-white/86" />
                <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-[4px] border-b-[3px] border-l-[3px] border-white/86" />
                <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-[4px] border-b-[3px] border-r-[3px] border-white/86" />
              </div>

              {isCameraStarting ? (
                <div className="absolute inset-0 z-20 grid place-items-center bg-black/48 text-[1rem] font-bold text-white/84">
                  正在打开相机...
                </div>
              ) : null}

              <p className="absolute bottom-[7.75rem] left-0 right-0 z-20 text-center text-[0.88rem] font-bold text-white/88">
                轻点屏幕照亮
              </p>

              <button
                type="button"
                onClick={takeCameraPhoto}
                disabled={isCameraStarting}
                aria-label="拍照"
                className="absolute bottom-9 left-1/2 z-20 grid h-[4.75rem] w-[4.75rem] -translate-x-1/2 place-items-center rounded-full border-[5px] border-white bg-white/18 shadow-[0_0_36px_rgba(255,255,255,0.25)] disabled:opacity-60"
              >
                <span className="h-14 w-14 rounded-full bg-[#ff850f] shadow-[inset_0_1px_0_rgba(255,255,255,0.44)]" />
              </button>

              <canvas ref={cameraCanvasRef} className="hidden" />
            </section>
          ) : importView === "youtube" ? (
            <section className="relative z-10 flex min-h-0 flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12">
              <div className="text-center">
                <h2 className="text-[2.05rem] font-black leading-tight text-[#201833]">
                  导入 YouTube 视频
                </h2>
                <p className="mt-4 text-[1.05rem] font-extrabold leading-7 text-[#746b91]">
                  有字幕优先读取字幕；无字幕时尝试语音生成课程
                </p>
                <p className="mx-auto mt-3 max-w-[320px] text-[0.86rem] font-bold leading-6 text-[#8b84a2]">
                  免费用户支持 5 分钟以内视频；Pro 支持 30 分钟以内。
                  建议：5～15 分钟视频生成效果最佳。
                </p>
              </div>

              <div className="mt-12 rounded-[28px] border border-white/76 bg-white/46 px-6 pb-8 pt-7 shadow-[0_24px_70px_rgba(84,72,146,0.13),inset_0_1px_0_rgba(255,255,255,0.92)]">
                <div className="flex items-center gap-4">
                  <YoutubeInputIcon />
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">YouTube 视频链接</span>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(event) => {
                        setYoutubeUrl(event.target.value);
                        setGenerationError("");
                      }}
                      placeholder="粘贴 YouTube 视频链接"
                      className="h-14 w-full rounded-full border-2 border-[#ded5ff] bg-white/54 px-5 text-[1rem] font-extrabold text-[#201833] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] placeholder:text-[#9189a4]"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={startGeneratingCourse}
                  disabled={isGeneratingCourse}
                  className="mx-auto mt-9 flex h-14 w-[min(100%,310px)] items-center justify-center rounded-full bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_52%,#ef6cf8_100%)] px-6 text-[1.05rem] font-black text-white shadow-[0_18px_42px_rgba(200,92,255,0.28)] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  <span className="mr-2 text-[1.25rem]">✨</span>
                  {isGeneratingCourse ? "正在生成..." : "生成我的课程"}
                </button>

                {generationError ? (
                  <div className="mt-5 rounded-[18px] bg-[#fff2f5]/82 px-4 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
                    <p className="text-[0.95rem] font-black leading-6 text-[#b14363]">
                      {generationError}
                    </p>
                    {generationError === "暂时无法从这个视频生成课程" ? (
                      <>
                        <p className="mt-2 text-[0.82rem] font-bold leading-6 text-[#8b6473]">
                          这个视频可能限制了字幕或音频读取。
                          <br />
                          你可以改用：
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={openSubtitlePasteFallback}
                            className="rounded-full bg-white/78 px-3 py-2 text-[0.78rem] font-black text-[#6c54df] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                          >
                            粘贴字幕 / 文案
                          </button>
                          <button
                            type="button"
                            onClick={openLocalVideoFallback}
                            className="rounded-full bg-white/78 px-3 py-2 text-[0.78rem] font-black text-[#6c54df] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                          >
                            上传本地视频
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}

                <p className="mt-8 flex items-center justify-center gap-2 text-center text-[0.86rem] font-bold leading-6 text-[#8b84a2]">
                  <span className="text-[1rem] text-[#8b6dff]">🔒</span>
                  我们只处理公开字幕或短视频语音，不保存你的视频链接
                </p>
              </div>
            </section>
          ) : importView === "video" ? (
            <section className="relative z-10 flex min-h-0 flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12">
              <div className="text-center">
                <h2 className="text-[2.25rem] font-black leading-tight text-[#201833]">
                  导入视频内容
                </h2>
                <p className="mt-3 text-[1.05rem] font-extrabold leading-7 text-[#746b91]">
                  从视频中生成英语输出训练
                </p>
              </div>

              <div className="mt-10 grid gap-5">
                <VideoOptionButton
                  icon={<YoutubeIcon />}
                  title="YouTube 视频链接"
                  description="有字幕优先读取字幕；无字幕时尝试语音生成课程"
                  onClick={() => setImportView("youtube")}
                />
                <VideoOptionButton
                  icon={<SubtitleIcon />}
                  title="粘贴视频字幕 / 文案"
                  description="直接生成英语训练内容"
                  onClick={() => setSelectedFileName("粘贴视频字幕 / 文案")}
                />
                <VideoOptionButton
                  icon={<LocalVideoIcon />}
                  title="选择本地视频"
                  description="从手机中选择视频文件"
                  onClick={() => openFilePicker(videoFileInputRef)}
                />
              </div>

              <div className="mt-8 flex items-center gap-4 rounded-[20px] bg-white/45 px-5 py-5 shadow-[0_18px_42px_rgba(84,72,146,0.1),inset_0_1px_0_rgba(255,255,255,0.82)]">
                <LightbulbIcon />
                <p className="text-[0.96rem] font-bold leading-6 text-[#746b91]">
                  为了获得更好的学习体验
                  <br />
                  语音越清晰，生成效果越好。
                </p>
              </div>

              <p className="mt-7 flex items-center justify-center gap-2 text-center text-[0.82rem] font-bold leading-6 text-[#8b84a2]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/48 text-[0.95rem] text-[#8b6dff] shadow-[0_8px_18px_rgba(126,92,255,0.12)]">
                  🔒
                </span>
                所有内容仅保存在你的设备本地，隐私安全有保障
              </p>
            </section>
          ) : (
            <section className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16 text-center">
              <div className="shrink-0">
                <h2 className="text-[2rem] font-black leading-tight text-[#201833]">
                  创建我的课程
                </h2>
                <p className="mt-4 text-[1.05rem] font-extrabold leading-7 text-[#8d85a2]">
                  把你的文字、音频或视频，变成英语输出训练。
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSourceSheet(true)}
                className="group relative mt-16 grid aspect-square w-[min(76vw,350px)] place-items-center rounded-full outline-none"
                aria-label="点击导入学习内容"
              >
                <span className="pointer-events-none absolute inset-[-18%] rounded-full border border-[#a79bff]/10 bg-[radial-gradient(circle,rgba(255,255,255,0.24)_0%,rgba(185,168,255,0.11)_42%,transparent_72%)]" />
                <span className="pointer-events-none absolute inset-0 rounded-full border-4 border-white/58 shadow-[0_0_42px_rgba(255,255,255,0.54),inset_0_0_42px_rgba(126,92,255,0.12)] transition group-hover:scale-[1.015] group-hover:border-white/78" />
                <span className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.34)_0%,rgba(194,180,255,0.18)_56%,transparent_78%)] blur-sm" />

                <span className="relative z-10 flex flex-col items-center">
                  <span className="bg-[linear-gradient(135deg,#8b5cf6_0%,#5b8cff_100%)] bg-clip-text text-[5.5rem] font-light leading-none text-transparent drop-shadow-[0_18px_28px_rgba(91,140,255,0.22)]">
                    +
                  </span>
                  <span className="mt-5 text-[1.05rem] font-black text-[#6c63ff]">
                    点击导入学习内容
                  </span>
                  <span className="mt-5 text-[0.86rem] font-extrabold text-[#8f88a5]">
                    支持：
                  </span>
                  <span className="mt-2 text-[0.9rem] font-extrabold text-[#8f88a5]">
                    TXT / PDF / DOCX / 音频 / 视频
                  </span>
                  {selectedFileName ? (
                    <span className="mt-5 max-w-[230px] truncate rounded-full bg-white/58 px-4 py-2 text-[0.78rem] font-extrabold text-[#5f55de] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                      {selectedFileName}
                    </span>
                  ) : null}
                </span>
              </button>
            </section>
          )}

          {showSourceSheet ? (
            <>
              <button
                type="button"
                aria-label="关闭内容来源选择"
                onClick={() => setShowSourceSheet(false)}
                className="absolute inset-0 z-20 cursor-default bg-transparent"
              />
              <div className="absolute bottom-0 left-0 right-0 z-30 max-h-[72%] overflow-y-auto rounded-t-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(250,248,255,0.88))] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-24px_70px_rgba(84,72,146,0.18)] ring-1 ring-white/80 backdrop-blur-xl">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-[#cbc4dd]" />
                <h3 className="mt-5 text-center text-[1.35rem] font-black leading-none text-[#201833]">
                  选择内容来源
                </h3>

                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGenerationError("");
                      setShowSourceSheet(false);
                      setImportView("paste");
                    }}
                    className="flex min-h-[4.75rem] items-center gap-4 rounded-[18px] bg-white/70 px-4 py-3 text-left shadow-[0_14px_32px_rgba(84,72,146,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:bg-white/82"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-[linear-gradient(135deg,#fff0b9_0%,#ffd67e_100%)] text-[1.45rem] shadow-[0_10px_22px_rgba(255,196,92,0.16)]">
                      ✨
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.03rem] font-black leading-6 text-[#201833]">
                        粘贴文字
                      </span>
                      <span className="mt-1 block text-[0.86rem] font-extrabold leading-5 text-[#807791]">
                        复制英文、中文或中英对照内容，直接生成课程
                      </span>
                    </span>
                    <span className="shrink-0 text-[2rem] font-light leading-none text-[#9f96b4]">
                      ›
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGenerationError("");
                      setShowSourceSheet(false);
                      setImportView("image");
                    }}
                    className="flex min-h-[4.75rem] items-center gap-4 rounded-[18px] bg-white/70 px-4 py-3 text-left shadow-[0_14px_32px_rgba(84,72,146,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:bg-white/82"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-[linear-gradient(135deg,#dff7ff_0%,#b99cff_55%,#ffcfef_100%)] text-[1.45rem] shadow-[0_10px_22px_rgba(126,92,255,0.16)]">
                      🖼
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.03rem] font-black leading-6 text-[#201833]">
                        从图片识别文字
                      </span>
                      <span className="mt-1 block text-[0.86rem] font-extrabold leading-5 text-[#807791]">
                        拍照、截图或相册图片
                      </span>
                    </span>
                    <span className="shrink-0 text-[2rem] font-light leading-none text-[#9f96b4]">
                      ›
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openFilePicker(textFileInputRef)}
                    className="flex min-h-[4.75rem] items-center gap-4 rounded-[18px] bg-white/70 px-4 py-3 text-left shadow-[0_14px_32px_rgba(84,72,146,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:bg-white/82"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-[linear-gradient(135deg,#f1d9ff_0%,#9677ff_100%)] text-[1.45rem] shadow-[0_10px_22px_rgba(126,92,255,0.16)]">
                      📄
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.03rem] font-black leading-6 text-[#201833]">
                        选择文档
                      </span>
                      <span className="mt-1 block text-[0.86rem] font-extrabold leading-5 text-[#807791]">
                        TXT / PDF / DOCX
                      </span>
                    </span>
                    <span className="shrink-0 text-[2rem] font-light leading-none text-[#9f96b4]">
                      ›
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openFilePicker(audioFileInputRef)}
                    className="flex min-h-[4.75rem] items-center gap-4 rounded-[18px] bg-white/70 px-4 py-3 text-left shadow-[0_14px_32px_rgba(84,72,146,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:bg-white/82"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-[linear-gradient(135deg,#d7f2ff_0%,#9dd7ff_100%)] text-[1.45rem] shadow-[0_10px_22px_rgba(91,140,255,0.14)]">
                      🎧
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.03rem] font-black leading-6 text-[#201833]">
                        导入音频
                      </span>
                      <span className="mt-1 block text-[0.86rem] font-extrabold leading-5 text-[#807791]">
                        MP3 / WAV / M4A
                      </span>
                    </span>
                    <span className="shrink-0 text-[2rem] font-light leading-none text-[#9f96b4]">
                      ›
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openVideoImportView}
                    className="flex min-h-[4.75rem] items-center gap-4 rounded-[18px] bg-white/70 px-4 py-3 text-left shadow-[0_14px_32px_rgba(84,72,146,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] transition hover:bg-white/82"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-[linear-gradient(135deg,#f4d2ff_0%,#ce96ff_100%)] text-[1.45rem] shadow-[0_10px_22px_rgba(200,92,255,0.14)]">
                      🎬
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.03rem] font-black leading-6 text-[#201833]">
                        导入视频内容
                      </span>
                      <span className="mt-1 block text-[0.86rem] font-extrabold leading-5 text-[#807791]">
                        YouTube 链接 / 字幕 / 本地视频
                      </span>
                    </span>
                    <span className="shrink-0 text-[2rem] font-light leading-none text-[#9f96b4]">
                      ›
                    </span>
                  </button>
                </div>
              </div>
            </>
          ) : null}

          <input
            ref={textFileInputRef}
            type="file"
            className="sr-only"
            accept=".txt,.text,.pdf,.doc,.docx"
            onChange={handleFileSelection}
          />
          <input
            ref={audioFileInputRef}
            type="file"
            className="sr-only"
            accept="audio/*,.mp3,.wav,.m4a"
            onChange={handleFileSelection}
          />
          <input
            ref={videoFileInputRef}
            type="file"
            className="sr-only"
            accept="video/*,.mp4,.mov,.webm"
            onChange={handleFileSelection}
          />
          <input
            ref={textImageInputRef}
            type="file"
            className="sr-only"
            accept="image/*,.png,.jpg,.jpeg,.webp,.heic"
            onChange={handleImageFileSelection}
          />
          <input
            ref={cameraImageInputRef}
            type="file"
            className="sr-only"
            accept="image/*"
            capture="environment"
            onChange={handleImageFileSelection}
          />
          {isGeneratingCourse ? <GeneratingCourseOverlay /> : null}
        </section>
      </div>
    </main>
  );
}
