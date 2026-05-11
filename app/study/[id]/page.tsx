"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { parseTrainingContent, type SentencePair } from "@/lib/training";
import { getFeaturedLessonById } from "@/data/featuredCourses";
import {
  addVocabularyWord,
  generateVocabularyDefinition,
  tokenizeEnglishSentence,
  updateVocabularyWord,
} from "@/lib/vocabulary";

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
const LAST_STUDY_PROGRESS_KEY = "lastStudyProgress";

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
  const [pendingVocabularyWord, setPendingVocabularyWord] = useState<{
    word: string;
    sourceSentence: string;
  } | null>(null);
  const [editableVocabularyWord, setEditableVocabularyWord] = useState("");
  const [isSavingVocabularyWord, setIsSavingVocabularyWord] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

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
    window.speechSynthesis.cancel();
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
      const featuredLesson = getFeaturedLessonById(lessonId);
      if (!featuredLesson) {
        setMessage("没有找到这节课");
        setLesson(null);
        setPairs([]);
        return;
      }

      setLesson(featuredLesson);
      setLessonTitle(featuredLesson.title);

      const featuredPairs = parseTrainingContent(featuredLesson.txt_content || "");
      setPairs(featuredPairs);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      setShowEnglish(false);
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
    localStorage.setItem(
      LAST_STUDY_PROGRESS_KEY,
      JSON.stringify({
        courseId: lessonId,
        sentenceIndex: index,
        updatedAt: new Date().toISOString(),
      })
    );
  }

  function handleWordClick(word: string, sourceSentence: string) {
    const trimmedWord = word.trim();
    if (!trimmedWord) return;

    stopSequencePlayback();
    setPendingVocabularyWord({
      word: trimmedWord,
      sourceSentence,
    });
    setEditableVocabularyWord(trimmedWord);
  }

  function closeVocabularyModal() {
    setPendingVocabularyWord(null);
    setEditableVocabularyWord("");
    setIsSavingVocabularyWord(false);
  }

  function handleConfirmAddWord() {
    if (!pendingVocabularyWord || isSavingVocabularyWord) return;

    const nextWord = editableVocabularyWord.trim();
    if (!nextWord) {
      setMessage("请输入单词");
      return;
    }

    setIsSavingVocabularyWord(true);

    const sourceSentence = pendingVocabularyWord.sourceSentence;
    const result = addVocabularyWord(
      nextWord,
      sourceSentence
    );

    if (!result.ok) {
      closeVocabularyModal();
      setMessage(result.message);
      return;
    }

    const savedWord = result.word.word;
    closeVocabularyModal();
    setMessage("已存入单词本");

    void generateVocabularyDefinition(savedWord)
      .then((definition) => {
        updateVocabularyWord(savedWord, {
          ...definition,
          sourceSentence,
        });
      })
      .catch((error) => {
        console.error("生成单词释义失败", error);
      });
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

  function moveToSentence(index: number) {
    setCurrentIndex(index);
    currentIndexRef.current = index;
    setShowEnglish(false);
    saveProgress(index);
    setMessage("");
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

  function queueNextAutoSentence(
    nextIndex: number,
    playNext: (index: number) => void | Promise<void>
  ) {
    if (nextIndex >= pairs.length) {
      stopSequencePlayback();
      setMessage("自动播放已完成");
      return;
    }

    moveToSentence(nextIndex);
    clearSequenceTimer();
    sequenceTimerRef.current = window.setTimeout(() => {
      void playNext(nextIndex);
    }, Math.max(gapSeconds * 1000, 200));
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
    queueNextAutoSentence(nextIndex, (index) => {
      void playSourceClipAtIndex(index);
    });
  }

  async function playAutoSentenceAtIndex(index: number) {
    const pair = pairs[index];
    if (!pair) {
      stopSequencePlayback();
      return;
    }

    const canPlayIndexedSourceAudio =
      Boolean(lesson?.sourceAudioId) &&
      Boolean(sourceAudioUrl) &&
      typeof pair.startTime === "number" &&
      typeof pair.endTime === "number" &&
      pair.endTime > pair.startTime;

    if (canPlayIndexedSourceAudio) {
      setMessage("自动播放中");
      await playSourceClipAtIndex(index);
      return;
    }

    setIsClipPlaying(false);
    setMessage("自动播放中");
    speakEnglish(pair.english || "", 1, () => {
      if (!autoPlayRef.current || !isSequencePlayingRef.current) return;
      const nextIndex = index + 1;
      queueNextAutoSentence(nextIndex, (targetIndex) => {
        void playAutoSentenceAtIndex(targetIndex);
      });
    });
  }

  async function startAutoPlay() {
    if (pairs.length === 0) {
      setMessage("这节课程没有内容");
      return;
    }

    autoPlayRef.current = true;
    setIsAutoPlaying(true);
    isSequencePlayingRef.current = true;
    setIsSequencePlaying(true);
    clearSequenceTimer();
    setShowEnglish(false);
    setMessage("自动播放开始");
    await playAutoSentenceAtIndex(currentIndexRef.current);
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
  const englishTokens = useMemo(
    () => tokenizeEnglishSentence(currentPair.english || ""),
    [currentPair.english]
  );
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
  const actionButtonClassName =
    "rounded-xl px-2 py-2 text-xs font-semibold leading-tight text-white transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm";

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

  function handleBackToPreviousPage() {
    stopAutoPlay();

    if (lessonId.startsWith("bank_")) {
      router.replace("/dashboard?featured=bank");
      return;
    }

    if (lessonId.startsWith("government_")) {
      router.replace("/dashboard?featured=government");
      return;
    }

    if (lessonId.startsWith("driver_")) {
      router.replace("/dashboard?featured=driver-license");
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }

  function handleSaveCurrentPosition() {
    saveProgress(currentIndex);
    setMessage("当前位置已保存");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090110] font-[var(--font-sora)] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#120216_0%,#090110_28%,#10031f_58%,#06010d_100%)]" />
      <div className="lux-grid absolute inset-0 opacity-[0.14]" />
      <div className="aurora-wave absolute left-[-10%] top-[-8%] h-[34rem] w-[46rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,0,153,0.20),transparent_58%)] blur-[92px]" />
      <div className="aurora-wave absolute right-[-8%] top-[4%] h-[36rem] w-[44rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.20),transparent_58%)] blur-[100px]" />

      <div className="relative mx-auto max-w-[430px] px-4 py-3 pb-8">
        <div className="mb-3 rounded-[1.35rem] border border-white/12 bg-white/[0.05] p-3 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={handleBackToPreviousPage}
              className="shrink-0 rounded-xl bg-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-600"
            >
              返回上一页
            </button>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="truncate text-base font-semibold">
                {lessonTitle || lesson?.title || "未命名课程"}
              </div>
              {pairs.length > 0 ? (
                <p className="mt-1 text-xs text-white/55">
                  第 {currentIndex + 1} / {pairs.length} 句
                </p>
              ) : (
                <p className="mt-1 text-xs text-white/55">正在加载课程...</p>
              )}
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {pendingVocabularyWord ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-[380px] rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
              <h2 className="text-xl font-bold text-white">加入单词本</h2>
              <p className="mt-3 text-sm leading-6 text-white/75">
                确定要将这个单词放进单词本吗？
              </p>
              <input
                type="text"
                value={editableVocabularyWord}
                onChange={(event) => setEditableVocabularyWord(event.target.value)}
                className="mt-4 w-full rounded-2xl border border-emerald-400/30 bg-black/30 px-4 py-4 text-2xl font-semibold text-emerald-300 outline-none ring-0 placeholder:text-emerald-300/35 focus:border-emerald-300 focus:bg-black/40"
                placeholder="请输入单词"
                autoFocus
              />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleConfirmAddWord}
                  disabled={isSavingVocabularyWord}
                  className="rounded-2xl bg-emerald-600 px-4 py-3.5 text-base font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeVocabularyModal();
                  }}
                  className="rounded-2xl bg-slate-700 px-4 py-3.5 text-base font-semibold hover:bg-slate-600"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <section className="space-y-3">
          <div
            className={`rounded-[1.5rem] border bg-white/5 px-5 py-6 transition ${
              isSequencePlaying
                ? "border-cyan-400 bg-slate-900/70"
                : "border-white/10"
            }`}
          >
            <div className="min-h-[180px]">
              <p className="text-left text-[26px] font-bold leading-[1.65]">
                {currentPair.chinese || "没有内容"}
              </p>
            </div>

            <div className="my-5 border-t border-white/20" />

            <div className="min-h-[180px]">
              {showEnglish ? (
                <p className="text-left text-[18px] font-semibold leading-[1.85] text-emerald-300">
                  {englishTokens.length > 0
                    ? englishTokens.map((token, index) =>
                        token.type === "word" ? (
                          <button
                            key={`${token.value}-${index}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleWordClick(token.value, currentPair.english || "");
                            }}
                            className="inline rounded-xl px-1 py-0.5 text-left transition hover:bg-emerald-400/20 hover:text-white"
                          >
                            {token.value}
                          </button>
                        ) : (
                          <span key={`${token.value}-${index}`}>{token.value}</span>
                        )
                      )
                    : "这一句还没有对应英文。"}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowEnglish(true)}
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-4 text-left text-base font-semibold text-white/70 transition hover:border-emerald-300/35 hover:bg-emerald-400/10 hover:text-white"
                >
                  显示英语
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] border border-white/10 bg-white/5 p-2.5">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              上一句
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex >= pairs.length - 1}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              下一句
            </button>
          </div>

          <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-2.5">
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => speakEnglish(currentPair.english, 1)}
                disabled={isAutoPlaying}
                className={`${actionButtonClassName} bg-purple-600 hover:bg-purple-500`}
              >
                朗读英文
              </button>

              <button
                onClick={() => speakEnglish(currentPair.english, 0.5)}
                disabled={isAutoPlaying}
                className={`${actionButtonClassName} bg-indigo-600 hover:bg-indigo-500`}
              >
                慢速朗读
              </button>

              <button
                onClick={() => {
                  void handlePlaySourceAudio();
                }}
                disabled={isSourceAudioLoading}
                className={`${actionButtonClassName} ${
                  isSourcePlaybackActive
                    ? "bg-cyan-500"
                    : "bg-cyan-600 hover:bg-cyan-500"
                }`}
              >
                播放原音频
              </button>

              <button
                onClick={() => {
                  if (isAutoPlaying) {
                    stopAutoPlay();
                    return;
                  }

                  void startAutoPlay();
                }}
                disabled={isSourceAudioLoading}
                className={`${actionButtonClassName} ${
                  isAutoPlaying
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-orange-600 hover:bg-orange-500"
                }`}
              >
                {isAutoPlaying ? "停止自动播放" : "自动播放"}
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {[0.5, 0.75, 1, 1.25].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setSourcePlaybackRate(rate)}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                    sourcePlaybackRate === rate
                      ? "bg-cyan-500 text-white"
                      : "bg-slate-700 text-white"
                  }`}
                >
                  {rate}x
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowMoreActions((prev) => !prev)}
                className="rounded-xl bg-slate-800 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-700"
              >
                声音设置
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentPosition}
                className="rounded-xl bg-emerald-700 px-2.5 py-1.5 text-xs font-bold hover:bg-emerald-600"
              >
                保存当前位置
              </button>
            </div>
            {showMoreActions ? (
              <div className="mt-2">
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none"
                >
                  {voices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

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
        </section>
      </div>
    </main>
  );
}
