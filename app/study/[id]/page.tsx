"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { parseTrainingContent, type SentencePair } from "@/lib/training";

type Lesson = {
  id: string;
  title: string;
  txt_content: string;
  created_at?: string;
  sourceAudioId?: string;
};

type LocalLessonData = {
  lessons: Lesson[];
};

const LESSONS_STORAGE_KEY = "english-app-lessons";
const DB_NAME = "english-learning-app-db";
const DB_VERSION = 1;
const AUDIO_STORE_NAME = "audios";

type AudioDBRecord = {
  id: string;
  file?: Blob;
};

function getDefaultLessonsData(): LocalLessonData {
  return { lessons: [] };
}

function loadLessonsData(): LocalLessonData {
  if (typeof window === "undefined") return getDefaultLessonsData();

  try {
    const raw = localStorage.getItem(LESSONS_STORAGE_KEY);
    if (!raw) return getDefaultLessonsData();

    const parsed = JSON.parse(raw);
    return {
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
    };
  } catch (error) {
    console.error("Failed to load lesson:", error);
    return getDefaultLessonsData();
  }
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("浏览器不支持音频播放"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("打开音频数据库失败"));
  });
}

async function getAudioBlobById(id: string): Promise<Blob | null> {
  console.log("[study] getAudioBlobById:start", {
    audioId: id,
    objectStore: AUDIO_STORE_NAME,
  });
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as AudioDBRecord | undefined;
      console.log("[study] getAudioBlobById:success", {
        audioId: id,
        hasBlob: Boolean(result?.file),
      });
      resolve(result?.file || null);
    };

    request.onerror = () => reject(new Error("读取原音频失败"));
  });
}

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = typeof params.id === "string" ? params.id : "";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [pairs, setPairs] = useState<SentencePair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const [message, setMessage] = useState("");

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [sourceAudioUrl, setSourceAudioUrl] = useState<string | null>(null);
  const [isSourceAudioLoading, setIsSourceAudioLoading] = useState(false);
  const [isClipPlaying, setIsClipPlaying] = useState(false);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const [sourcePlaybackRate, setSourcePlaybackRate] = useState(1);

  const [prepSeconds, setPrepSeconds] = useState(2);
  const [gapSeconds, setGapSeconds] = useState(1);

  const progressKey = `lesson-progress-${lessonId}`;
  const voiceKey = "selected-voice-name";
  const prepKey = "study-prep-seconds";
  const gapKey = "study-gap-seconds";

  const autoPlayRef = useRef(false);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const sequenceTimerRef = useRef<number | null>(null);
  const sourceAudioRef = useRef<HTMLAudioElement | null>(null);
  const sourceAudioObjectUrlRef = useRef<string | null>(null);
  const clipEndTimeRef = useRef<number | null>(null);
  const isSequencePlayingRef = useRef(false);

  function clearAutoTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearSequenceTimer() {
    if (sequenceTimerRef.current !== null) {
      window.clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  }

  function stopClipPlayback(resetTime = false) {
    const audio = sourceAudioRef.current;
    if (!audio) return;

    audio.pause();
    if (resetTime) {
      audio.currentTime = 0;
    }
    clipEndTimeRef.current = null;
    setIsClipPlaying(false);
  }

  function stopSequencePlayback(resetClip = false) {
    autoPlayRef.current = false;
    setIsAutoPlaying(false);
    isSequencePlayingRef.current = false;
    setIsSequencePlaying(false);
    clearSequenceTimer();
    stopClipPlayback(resetClip);
  }

  const loadLesson = useCallback(() => {
    const data = loadLessonsData();
    const found = data.lessons.find((item) => item.id === lessonId) || null;

    console.log("[study] loadLesson", {
      lessonId,
      found: Boolean(found),
      sourceAudioId: found?.sourceAudioId ?? null,
    });

    if (!found) {
      setMessage("没有找到这节课");
      setLesson(null);
      setPairs([]);
      return;
    }

    setLesson(found);

    const parsedPairs = parseTrainingContent(found.txt_content || "");
    setPairs(parsedPairs);

    const savedIndex = localStorage.getItem(progressKey);
    if (savedIndex !== null) {
      const indexNumber = Number(savedIndex);
      if (!Number.isNaN(indexNumber) && indexNumber >= 0 && indexNumber < parsedPairs.length) {
        setCurrentIndex(indexNumber);
        currentIndexRef.current = indexNumber;
      } else {
        setCurrentIndex(0);
        currentIndexRef.current = 0;
      }
    } else {
      setCurrentIndex(0);
      currentIndexRef.current = 0;
    }

    setShowEnglish(false);
  }, [lessonId, progressKey]);

  function saveProgress(index: number) {
    localStorage.setItem(progressKey, String(index));
  }

  function handlePrev() {
    stopSequencePlayback();
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
      setShowEnglish(false);
      saveProgress(newIndex);
      setMessage("");
    }
  }

  function handleNext() {
    stopSequencePlayback();
    if (currentIndex < pairs.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
      setShowEnglish(false);
      saveProgress(newIndex);
      setMessage("");
    }
  }

  function getSelectedVoice() {
    return voices.find((voice) => voice.name === selectedVoiceName);
  }

  function speakEnglish(text: string, rate = 1, onEnd?: () => void) {
    if (!text) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;

    const selectedVoice = getSelectedVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  function loadVoices() {
    const allVoices = window.speechSynthesis.getVoices();
    const englishVoices = allVoices.filter((voice) =>
      voice.lang.toLowerCase().startsWith("en")
    );

    setVoices(englishVoices);

    const savedVoiceName = localStorage.getItem(voiceKey);
    if (savedVoiceName && englishVoices.some((voice) => voice.name === savedVoiceName)) {
      setSelectedVoiceName(savedVoiceName);
    } else if (englishVoices.length > 0) {
      setSelectedVoiceName(englishVoices[0].name);
    }
  }

  function stopAutoPlay() {
    clearAutoTimer();
    stopSequencePlayback();
    setMessage("自动播放已停止");
  }

  async function playSourceClipAtIndex(index: number) {
    const audio = sourceAudioRef.current;
    const pair = pairs[index];

    if (!audio || !pair) {
      stopSequencePlayback();
      return;
    }

    if (
      typeof pair.startTime !== "number" ||
      typeof pair.endTime !== "number" ||
      pair.endTime <= pair.startTime
    ) {
      stopSequencePlayback();
      setMessage("当前句子没有时间戳，无法播放原音频。");
      return;
    }

    stopClipPlayback();
    clipEndTimeRef.current = pair.endTime;
    audio.currentTime = pair.startTime;
    audio.playbackRate = sourcePlaybackRate;

    try {
      await audio.play();
      setIsClipPlaying(true);
      setMessage(isSequencePlayingRef.current ? "正在连续播放原音频" : "正在播放原音频");
    } catch (error) {
      clipEndTimeRef.current = null;
      setIsClipPlaying(false);
      stopSequencePlayback();
      setMessage(error instanceof Error ? error.message : "原音频播放失败");
    }
  }

  async function handlePlaySourceAudio() {
    console.log("[study] handlePlaySourceAudio", {
      lessonId,
      sourceAudioId: lesson?.sourceAudioId ?? null,
      sourceAudioReady: Boolean(sourceAudioUrl),
      startTime:
        typeof currentPair.startTime === "number" ? currentPair.startTime : null,
      endTime: typeof currentPair.endTime === "number" ? currentPair.endTime : null,
    });

    if (!lesson?.sourceAudioId) {
      setMessage("这节课程没有关联原音频，请重新从音频生成并保存课程。");
      return;
    }

    if (!sourceAudioUrl) {
      setMessage(
        isSourceAudioLoading
          ? "原音频加载中..."
          : "找不到原音频，请确认音频没有被删除。"
      );
      return;
    }

    if (!hasValidTimeRange) {
      setMessage("当前句子没有时间戳，无法播放原音频。");
      return;
    }

    const audio = sourceAudioRef.current;
    if (!audio) {
      setMessage("原音频播放器不可用");
      return;
    }

    stopSequencePlayback();
    await playSourceClipAtIndex(currentIndex);
  }

  function handleSourceClipComplete() {
    clipEndTimeRef.current = null;
    setIsClipPlaying(false);

    if (!autoPlayRef.current || !isSequencePlayingRef.current) return;

    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= pairs.length) {
      stopSequencePlayback();
      setMessage("原音频连播已完成");
      return;
    }

    setCurrentIndex(nextIndex);
    currentIndexRef.current = nextIndex;
    setShowEnglish(true);
    saveProgress(nextIndex);
    clearSequenceTimer();
    sequenceTimerRef.current = window.setTimeout(() => {
      void playSourceClipAtIndex(nextIndex);
    }, Math.max(gapSeconds * 1000, 200));
  }

  async function startAutoPlay() {
    if (pairs.length === 0) {
      setMessage("这节课程没有内容");
      return;
    }

    if (!lesson?.sourceAudioId) {
      setMessage("这节课程没有关联原音频，请重新从音频生成并保存课程。");
      return;
    }

    if (!sourceAudioUrl) {
      setMessage(
        isSourceAudioLoading
          ? "原音频加载中..."
          : "找不到原音频，请确认音频没有被删除。"
      );
      return;
    }

    if (!hasValidTimeRange) {
      setMessage("当前句子没有时间戳，无法播放原音频。");
      return;
    }

    autoPlayRef.current = true;
    setIsAutoPlaying(true);
    isSequencePlayingRef.current = true;
    setIsSequencePlaying(true);
    clearSequenceTimer();
    setShowEnglish(true);
    setMessage("自动播放开始");
    await playSourceClipAtIndex(currentIndexRef.current);
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const title = localStorage.getItem("currentLessonTitle");
      if (title) {
        setLessonTitle(title);
      }
    }
  }, []);

  useEffect(() => {
    if (lessonId) loadLesson();
  }, [lessonId, loadLesson]);

  useEffect(() => {
    let cancelled = false;

    async function loadSourceAudio() {
      stopClipPlayback(true);

      if (sourceAudioObjectUrlRef.current) {
        URL.revokeObjectURL(sourceAudioObjectUrlRef.current);
        sourceAudioObjectUrlRef.current = null;
      }

      if (!lesson?.sourceAudioId) {
        console.log("[study] loadSourceAudio:missing-sourceAudioId", {
          lessonId,
        });
        setSourceAudioUrl(null);
        setIsSourceAudioLoading(false);
        setMessage("这节课程没有关联原音频，请重新从音频生成并保存课程。");
        return;
      }

      try {
        setIsSourceAudioLoading(true);
        console.log("[study] loadSourceAudio:start", {
          lessonId,
          sourceAudioId: lesson.sourceAudioId,
        });
        const blob = await getAudioBlobById(lesson.sourceAudioId);
        if (cancelled) return;

        if (!blob) {
          console.log("[study] loadSourceAudio:blob-missing", {
            lessonId,
            sourceAudioId: lesson.sourceAudioId,
          });
          setSourceAudioUrl(null);
          setMessage("找不到原音频，请确认音频没有被删除。");
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        console.log("[study] loadSourceAudio:blob-ready", {
          lessonId,
          sourceAudioId: lesson.sourceAudioId,
          objectUrlCreated: true,
        });
        sourceAudioObjectUrlRef.current = objectUrl;
        setSourceAudioUrl(objectUrl);
      } catch (error) {
        if (cancelled) return;
        console.log("[study] loadSourceAudio:error", {
          lessonId,
          sourceAudioId: lesson.sourceAudioId,
          error: error instanceof Error ? error.message : String(error),
        });
        setSourceAudioUrl(null);
        setMessage(error instanceof Error ? error.message : "读取原音频失败");
      } finally {
        if (!cancelled) {
          setIsSourceAudioLoading(false);
        }
      }
    }

    void loadSourceAudio();

    return () => {
      cancelled = true;
    };
  }, [lesson?.sourceAudioId, lessonId]);

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      clearAutoTimer();
      isSequencePlayingRef.current = false;
      clearSequenceTimer();
      stopClipPlayback();
      if (sourceAudioObjectUrlRef.current) {
        URL.revokeObjectURL(sourceAudioObjectUrlRef.current);
        sourceAudioObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedVoiceName) {
      localStorage.setItem(voiceKey, selectedVoiceName);
    }
  }, [selectedVoiceName]);

  useEffect(() => {
    const savedPrep = localStorage.getItem(prepKey);
    const savedGap = localStorage.getItem(gapKey);

    if (savedPrep) {
      const n = Number(savedPrep);
      if (!Number.isNaN(n) && n >= 0 && n <= 10) setPrepSeconds(n);
    }

    if (savedGap) {
      const n = Number(savedGap);
      if (!Number.isNaN(n) && n >= 0 && n <= 10) setGapSeconds(n);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(prepKey, String(prepSeconds));
  }, [prepSeconds]);

  useEffect(() => {
    localStorage.setItem(gapKey, String(gapSeconds));
  }, [gapSeconds]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    isSequencePlayingRef.current = isSequencePlaying;
  }, [isSequencePlaying]);

  useEffect(() => {
    const audio = sourceAudioRef.current;
    if (!audio) return;
    audio.playbackRate = sourcePlaybackRate;
  }, [sourcePlaybackRate, sourceAudioUrl]);

  const currentPair = useMemo(() => {
    return pairs[currentIndex] || { chinese: "", english: "" };
  }, [pairs, currentIndex]);
  const isSourcePlaybackActive = isClipPlaying || isAutoPlaying;
  const hasSourceAudioId = Boolean(lesson?.sourceAudioId);
  const hasValidTimeRange =
    typeof currentPair.startTime === "number" &&
    typeof currentPair.endTime === "number" &&
    currentPair.endTime > currentPair.startTime;
  const canPlaySourceAudio =
    hasSourceAudioId &&
    Boolean(sourceAudioUrl) &&
    hasValidTimeRange;

  useEffect(() => {
    console.log("[study] currentSentence", {
      lessonId,
      sourceAudioId: lesson?.sourceAudioId ?? null,
      startTime:
        typeof currentPair.startTime === "number" ? currentPair.startTime : null,
      endTime: typeof currentPair.endTime === "number" ? currentPair.endTime : null,
    });
  }, [
    currentPair.endTime,
    currentPair.startTime,
    lesson?.sourceAudioId,
    lessonId,
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
              Study Mode
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">逐句学习</h1>
            <div className="text-lg text-gray-300">
              {lessonTitle || "未命名课程"}
            </div>
            <p className="mt-1 text-sm text-white/65">
              {lesson?.title || "正在加载课程..."}
            </p>
            {pairs.length > 0 && (
              <p className="mt-1 text-xs text-white/50">
                第 {currentIndex + 1} 句 / 共 {pairs.length} 句
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                stopAutoPlay();
                router.push("/");
              }}
              className="rounded-2xl bg-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-600"
            >
              返回首页
            </button>

            <button
              onClick={() => {
                saveProgress(currentIndex);
                setMessage("当前位置已保存");
              }}
              className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500"
            >
              保存当前位置
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-3 text-lg font-bold">声音设置</h2>

              <label className="mb-2 block text-sm text-white/70">
                选择机器英文声音
              </label>

              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm outline-none"
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-3 text-lg font-bold">自动播放节奏</h2>

              <div className="mb-4">
                <label className="mb-2 block text-sm text-white/70">
                  中文停留秒数：{prepSeconds} 秒
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={prepSeconds}
                  onChange={(e) => setPrepSeconds(Number(e.target.value))}
                  className="w-full"
                  disabled={isAutoPlaying}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  每句结束间隔：{gapSeconds} 秒
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={gapSeconds}
                  onChange={(e) => setGapSeconds(Number(e.target.value))}
                  className="w-full"
                  disabled={isAutoPlaying}
                />
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div
              className={`rounded-3xl border bg-white/5 p-4 md:p-5 ${
                isSequencePlaying ? "border-cyan-400" : "border-white/10"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold md:text-2xl">英文区</h2>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                  点击空白区域显示英文
                </div>
              </div>

              <div
                onClick={() => setShowEnglish(true)}
                className={`flex min-h-[110px] cursor-pointer items-center justify-center rounded-3xl border border-dashed p-5 text-center transition md:min-h-[130px] ${
                  isSequencePlaying
                    ? "border-cyan-400 bg-slate-800"
                    : "border-white/15 bg-black/25 hover:border-emerald-400/40 hover:bg-black/35"
                }`}
              >
                {showEnglish ? (
                  <p className="text-2xl font-semibold leading-relaxed text-emerald-300 md:text-3xl">
                    {currentPair.english || "这一句还没有对应英文。"}
                  </p>
                ) : (
                  <p className="text-lg text-white/35 md:text-xl">
                    点击这里显示英文
                  </p>
                )}
              </div>
            </div>

            <div
              className={`rounded-3xl border bg-white/5 p-4 md:p-5 ${
                isSequencePlaying ? "border-cyan-400" : "border-white/10"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold md:text-2xl">中文区</h2>
                <div className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-300">
                  当前学习句子
                </div>
              </div>

              <div
                className={`rounded-3xl p-5 md:p-6 ${
                  isSequencePlaying ? "bg-slate-800" : "bg-black/25"
                }`}
              >
                <p className="text-2xl font-bold leading-relaxed md:text-3xl">
                  {currentPair.chinese || "没有内容"}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
              {!hasSourceAudioId ? (
                <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                  这节课程没有关联原音频，请重新从音频生成并保存课程。                </div>
              ) : null}

              {hasSourceAudioId && !isSourceAudioLoading && !sourceAudioUrl ? (
                <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                  找不到原音频，请确认音频没有被删除。                </div>
              ) : null}

              {!hasValidTimeRange ? (
                <div className="mb-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                  当前句子没有时间戳，无法播放原音频。                </div>
              ) : null}
              {sourceAudioUrl ? (
                <audio
                  ref={sourceAudioRef}
                  src={sourceAudioUrl}
                  preload="auto"
                  className="hidden"
                  onPause={() => setIsClipPlaying(false)}
                  onEnded={handleSourceClipComplete}
                  onTimeUpdate={() => {
                    const audio = sourceAudioRef.current;
                    const clipEndTime = clipEndTimeRef.current;
                    if (!audio || clipEndTime === null) return;

                    if (audio.currentTime >= clipEndTime) {
                      audio.pause();
                      audio.currentTime = clipEndTime;
                      handleSourceClipComplete();
                    }
                  }}
                />
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="rounded-2xl bg-slate-700 px-4 py-3 text-sm disabled:opacity-40"
                >
                  上一句
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentIndex >= pairs.length - 1}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-sm disabled:opacity-40"
                >
                  下一句
                </button>

                <button
                  onClick={() => setShowEnglish(true)}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm"
                >
                  显示英文
                </button>

                <button
                  onClick={() => setShowEnglish(false)}
                  className="rounded-2xl bg-slate-700 px-4 py-3 text-sm"
                >
                  隐藏英文
                </button>

                <button
                  onClick={handlePlaySourceAudio}
                  disabled={!canPlaySourceAudio}
                  className={`w-full rounded-2xl px-6 py-4 text-lg font-bold transition ${
                    !canPlaySourceAudio
                      ? "bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed"
                      : isSourcePlaybackActive
                        ? "bg-cyan-500 text-white"
                        : "bg-cyan-600 text-white hover:bg-cyan-500"
                  }`}
                >
                  播放原音频
                </button>

                <button
                  onClick={() => speakEnglish(currentPair.english, 1)}
                  disabled={isAutoPlaying}
                  className="rounded-2xl bg-purple-600 px-4 py-3 text-sm disabled:opacity-40"
                >
                  朗读英文
                </button>

                <button
                  onClick={() => speakEnglish(currentPair.english, 0.5)}
                  disabled={isAutoPlaying}
                  className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm disabled:opacity-40"
                >
                  放慢速度
                </button>

                {!isAutoPlaying ? (
                  <button
                    onClick={startAutoPlay}
                    className="rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold"
                  >
                    开始自动播放
                  </button>
                ) : (
                  <button
                    onClick={stopAutoPlay}
                    className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold"
                  >
                    停止自动播放
                  </button>
                )}

                <div className="flex items-center justify-end gap-3">
                  {[0.5, 0.75, 1, 1.25].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSourcePlaybackRate(rate)}
                      className={`rounded-xl px-4 py-2 text-sm font-bold ${
                        sourcePlaybackRate === rate
                          ? "bg-cyan-500 text-white"
                          : "bg-slate-700 text-white"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

