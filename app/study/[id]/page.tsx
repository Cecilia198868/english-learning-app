"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import FreePracticeLimitModal from "@/components/FreePracticeLimitModal";
import { parseTrainingContent, type SentencePair } from "@/lib/training";
import {
  featuredLessonRecords,
  getFeaturedLessonById,
} from "@/data/featuredCourses";
import {
  addVocabularyWord,
  updateVocabularyWord,
} from "@/lib/vocabulary";
import {
  createFallbackHighlightedExpressions,
  splitSentenceByHighlightedExpressions,
  type HighlightedExpression,
} from "@/lib/expressionHighlights";
import {
  hasFreePracticeCompletion,
  isFreePracticeLimitReached,
  recordFreePracticeCompletion,
} from "@/lib/freePracticeLimit";

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
const bankFinanceLessonTitleOrder = [
  "新开银行账户",
  "银行事务口语课",
  "使用 ATM 机和自我服务",
  "网上银行与手机App操作",
  "存款和取款",
  "货币兑换与国际汇款",
  "国际电汇与海外付款",
  "设立储蓄和定期存款账户",
  "信用卡申请与审批流程",
  "信用卡挂失口语课",
  "信用卡报告欺诈收费口语课",
  "银行费用查询与争议解决",
  "银行客服电话口语课",
  "申请个人贷款",
  "房屋抵押贷款咨询",
  "银行保险简",
  "银行提供的保险产品",
  "投资产品与财富管理",
  "退休储蓄与养老金计划",
  "关闭银行账户",
] as const;
const expressionVariantLabels: Array<{
  key: ExpressionVariantKey;
  label: string;
}> = [
  { key: "standard", label: "标准表达" },
  { key: "idiomatic", label: "更地道" },
  { key: "simple", label: "更简单" },
  { key: "natural", label: "更自然" },
];

type AudioDBRecord = {
  id: string;
  file?: Blob;
};

type ExpressionVariantKey = "standard" | "idiomatic" | "simple" | "natural";

type ExpressionVariant = {
  key: ExpressionVariantKey;
  label: string;
  text: string;
};

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = {
  0?: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultEventLike = Event & {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

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

const distortedVoiceNamePattern =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|organ|princess|superstar|trinoids|whisper|zarvox/i;

function isEnglishVoice(voice: SpeechSynthesisVoice) {
  return voice.lang.toLowerCase().startsWith("en");
}

function isStableSpeechVoice(voice: SpeechSynthesisVoice) {
  return isEnglishVoice(voice) && !distortedVoiceNamePattern.test(voice.name);
}

function pickPreferredEnglishVoice(voices: SpeechSynthesisVoice[]) {
  const candidates = voices.filter(isStableSpeechVoice);

  return (
    candidates.find((voice) => /samantha/i.test(voice.name)) ||
    candidates.find((voice) => /google us english/i.test(voice.name)) ||
    candidates.find((voice) => /microsoft.*(jenny|aria|zira|guy|david)/i.test(voice.name)) ||
    candidates.find((voice) => /english.*united states|en-US/i.test(`${voice.name} ${voice.lang}`)) ||
    candidates.find((voice) => voice.localService) ||
    candidates[0] ||
    null
  );
}

function normalizeSpeechRate(rate: number) {
  return Math.min(Math.max(rate, 0.75), 1.15);
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
        <linearGradient id="studySoundWaveBorder" x1="10" y1="36" x2="82" y2="8">
          <stop stopColor="#d85ee9" />
          <stop offset="1" stopColor="#28d5e8" />
        </linearGradient>
        <linearGradient id="studySoundWaveBars" x1="22" y1="22" x2="70" y2="22">
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
        stroke="url(#studySoundWaveBorder)"
        strokeWidth="3"
      />
      <path
        d="M23 22h0.1M33 17v10M43 13v18M53 8v28M63 14v16M73 18v8"
        stroke="url(#studySoundWaveBars)"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <circle cx="82" cy="22" r="4" fill="#28d5e8" />
    </svg>
  );
}

function createFallbackExpressionVariants(standardEnglish: string) {
  return expressionVariantLabels.map(({ key, label }) => ({
    key,
    label,
    text: standardEnglish || "This sentence is still being prepared.",
  }));
}

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = typeof params.id === "string" ? params.id : "";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [localLessonSequence, setLocalLessonSequence] = useState<Lesson[]>([]);
  const [pairs, setPairs] = useState<SentencePair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const [message, setMessage] = useState("");
  const [spokenEnglish, setSpokenEnglish] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [expressionVariants, setExpressionVariants] = useState<
    ExpressionVariant[]
  >([]);
  const [selectedExpressionIndex, setSelectedExpressionIndex] = useState(0);
  const [isLoadingExpressionVariants, setIsLoadingExpressionVariants] =
    useState(false);
  const [pendingExpression, setPendingExpression] = useState<{
    phrase: string;
    meaning: string;
    sourceSentence: string;
  } | null>(null);
  const [isSavingExpression, setIsSavingExpression] = useState(false);
  const [highlightedExpressions, setHighlightedExpressions] = useState<
    HighlightedExpression[]
  >([]);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showFreePracticeLimitModal, setShowFreePracticeLimitModal] =
    useState(false);

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
  const freePracticeScope = lessonId.startsWith("my-course-")
    ? (`course:${lessonId}` as const)
    : "classic";

  const autoPlayRef = useRef(false);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const sequenceTimerRef = useRef<number | null>(null);
  const sourceAudioRef = useRef<HTMLAudioElement | null>(null);
  const sourceAudioObjectUrlRef = useRef<string | null>(null);
  const clipEndTimeRef = useRef<number | null>(null);
  const isSequencePlayingRef = useRef(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechBufferRef = useRef("");
  const speechSilenceTimerRef = useRef<number | null>(null);

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

  function clearSpeechSilenceTimer() {
    if (speechSilenceTimerRef.current !== null) {
      window.clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
  }

  function resetPracticeAttempt() {
    setSpokenEnglish("");
    setLiveTranscript("");
    setShowEnglish(false);
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setIsLoadingExpressionVariants(false);
    speechBufferRef.current = "";
    clearSpeechSilenceTimer();
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    setIsListening(false);
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
    setLocalLessonSequence(data.lessons || []);
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
      setSpokenEnglish("");
      setLiveTranscript("");
      setExpressionVariants([]);
      setSelectedExpressionIndex(0);
      return;
    }

    setLesson(found);
    setLessonTitle(found.title || "未命名课程");

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
    setSpokenEnglish("");
    setLiveTranscript("");
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
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

  function handleExpressionClick(
    expression: HighlightedExpression,
    sourceSentence: string
  ) {
    const phrase = expression.phrase.trim();
    if (!phrase) return;

    stopSequencePlayback();
    setPendingExpression({
      phrase,
      meaning: expression.meaning || "✨ 值得学习的表达",
      sourceSentence,
    });
  }

  function closeExpressionModal() {
    setPendingExpression(null);
    setIsSavingExpression(false);
  }

  function handleConfirmAddExpression() {
    if (!pendingExpression || isSavingExpression) return;

    setIsSavingExpression(true);

    const sourceSentence = pendingExpression.sourceSentence;
    const result = addVocabularyWord(
      pendingExpression.phrase,
      sourceSentence
    );

    if (!result.ok) {
      closeExpressionModal();
      setMessage(
        result.reason === "DUPLICATE" ? "这个表达已经收藏过了" : result.message
      );
      return;
    }

    const savedWord = result.word.word;
    updateVocabularyWord(savedWord, {
      meaning: pendingExpression.meaning,
      partOfSpeech: "phrase",
      example: sourceSentence,
      sourceSentence,
    });
    closeExpressionModal();
    setMessage("已存入新表达");
  }

  function handlePrev() {
    stopSequencePlayback();
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
      resetPracticeAttempt();
      saveProgress(newIndex);
      setMessage("");
    }
  }

  function handleNext() {
    stopSequencePlayback();
    if (currentIndex < pairs.length - 1) {
      const newIndex = currentIndex + 1;
      if (!ensureFreePracticeAvailable(newIndex)) return;

      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
      resetPracticeAttempt();
      saveProgress(newIndex);
      setMessage("");
    }
  }

  function getSelectedVoice() {
    return voices.find(
      (voice) => voice.name === selectedVoiceName && isStableSpeechVoice(voice)
    );
  }

  function speakEnglish(text: string, rate = 1, onEnd?: () => void) {
    if (!text) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = normalizeSpeechRate(rate);
    utterance.pitch = 1;
    utterance.volume = 1;

    const selectedVoice = getSelectedVoice() || pickPreferredEnglishVoice(voices);
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
    resetPracticeAttempt();
    saveProgress(index);
    setMessage("");
  }

  function loadVoices() {
    const allVoices = window.speechSynthesis.getVoices();
    const englishVoices = allVoices.filter(isEnglishVoice);
    const preferredVoice = pickPreferredEnglishVoice(englishVoices);

    setVoices(englishVoices);

    const savedVoiceName = localStorage.getItem(voiceKey);
    if (
      savedVoiceName &&
      englishVoices.some(
        (voice) =>
          voice.name === savedVoiceName &&
          !distortedVoiceNamePattern.test(voice.name)
      )
    ) {
      setSelectedVoiceName(savedVoiceName);
    } else {
      setSelectedVoiceName(preferredVoice?.name || "");
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
      clearSpeechSilenceTimer();
      recognitionRef.current?.abort?.();
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

  useEffect(() => {
    if (!spokenEnglish || isListening) return;

    let cancelled = false;
    const fallbackVariants = createFallbackExpressionVariants(
      currentPair.english || ""
    );

    setExpressionVariants(fallbackVariants);
    setSelectedExpressionIndex(0);
    setIsLoadingExpressionVariants(false);

    async function loadExpressionVariants() {
      try {
        const response = await fetch("/api/expression-variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chinese: currentPair.chinese,
            userEnglish: spokenEnglish,
            standardEnglish: currentPair.english,
          }),
        });
        const data = (await response.json()) as {
          variants?: Partial<Record<ExpressionVariantKey, string>>;
        };

        if (!response.ok || !data.variants || cancelled) return;

        const nextVariants = expressionVariantLabels.map(({ key, label }) => ({
          key,
          label,
          text:
            typeof data.variants?.[key] === "string" &&
            data.variants[key]?.trim()
              ? data.variants[key]!.trim()
              : fallbackVariants.find((variant) => variant.key === key)?.text ||
                currentPair.english ||
                "",
        }));

        setExpressionVariants(nextVariants);
      } catch {
        if (!cancelled) {
          setExpressionVariants(fallbackVariants);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingExpressionVariants(false);
        }
      }
    }

    void loadExpressionVariants();

    return () => {
      cancelled = true;
    };
  }, [
    currentPair.chinese,
    currentPair.english,
    isListening,
    spokenEnglish,
  ]);

  function handleBackToPreviousPage() {
    stopAutoPlay();
    router.replace("/speak-english?menu=1");
  }

  function handleSaveCurrentPosition() {
    saveProgress(currentIndex);
    setMessage("当前位置已保存");
  }

  function showFreePracticeLimit() {
    stopSequencePlayback();
    setShowFreePracticeLimitModal(true);
  }

  function openProFromFreePracticeLimit() {
    setShowFreePracticeLimitModal(false);
    stopSequencePlayback();
    router.push("/speak-english?menu=1&pro=1");
  }

  function getSentenceCompletionId(index = currentIndex) {
    return `study:${lessonId}:${index}`;
  }

  function ensureFreePracticeAvailable(index = currentIndex) {
    const completionId = getSentenceCompletionId(index);

    if (hasFreePracticeCompletion(freePracticeScope, completionId)) return true;
    if (!isFreePracticeLimitReached(freePracticeScope)) return true;

    showFreePracticeLimit();
    return false;
  }

  function markCurrentSentenceCompleted(index = currentIndex) {
    recordFreePracticeCompletion(
      freePracticeScope,
      getSentenceCompletionId(index)
    );
  }

  function getRecognitionConstructor() {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function stopEnglishRecognition() {
    clearSpeechSilenceTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  function handleEnglishPracticeAction() {
    if (isListening) {
      stopEnglishRecognition();
      return;
    }

    startEnglishRecognition();
  }

  function startEnglishRecognition() {
    if (!ensureFreePracticeAvailable()) return;

    const RecognitionConstructor = getRecognitionConstructor();
    if (!RecognitionConstructor) {
      setMessage("当前浏览器不支持语音识别");
      return;
    }

    stopSequencePlayback();
    recognitionRef.current?.abort?.();
    clearSpeechSilenceTimer();
    speechBufferRef.current = "";
    setLiveTranscript("");
    setShowEnglish(false);
    setMessage("");
    const practiceIndex = currentIndex;

    const recognition = new RecognitionConstructor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcripts = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .filter(Boolean);
      const transcript = transcripts.join(" ").trim();

      setLiveTranscript(transcript);
      speechBufferRef.current = transcript;
      clearSpeechSilenceTimer();
      speechSilenceTimerRef.current = window.setTimeout(() => {
        stopEnglishRecognition();
      }, 1300);
    };

    recognition.onerror = () => {
      clearSpeechSilenceTimer();
      setIsListening(false);
      setLiveTranscript("");
      setMessage("没有听清，请再试一次");
    };

    recognition.onend = () => {
      clearSpeechSilenceTimer();
      const finalTranscript = speechBufferRef.current.trim();
      if (finalTranscript) {
        setSpokenEnglish(finalTranscript);
        markCurrentSentenceCompleted(practiceIndex);
      }
      setLiveTranscript("");
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }

  const spokenDisplay = (isListening && liveTranscript ? liveTranscript : spokenEnglish).trim();
  const courseTitle = lessonTitle || lesson?.title || "未命名课程";
  const lessonSequence = useMemo(() => {
    if (lessonId.startsWith("my-course-")) {
      return localLessonSequence.filter((record) => record.id === lessonId);
    }

    if (localLessonSequence.some((record) => record.id === lessonId)) {
      return localLessonSequence;
    }

    const lessonsByTitle = new Map(
      featuredLessonRecords.map((record) => [record.title, record])
    );
    const bankFinanceLessons = bankFinanceLessonTitleOrder
      .map((title) => lessonsByTitle.get(title))
      .filter((record): record is (typeof featuredLessonRecords)[number] =>
        Boolean(record)
      );

    if (bankFinanceLessons.some((record) => record.id === lessonId)) {
      return bankFinanceLessons;
    }

    if (lessonId.startsWith("government_")) {
      return featuredLessonRecords.filter((record) =>
        record.id.startsWith("government_")
      );
    }

    if (lessonId.startsWith("driver_")) {
      return featuredLessonRecords.filter((record) =>
        record.id.startsWith("driver_")
      );
    }

    if (lessonId.startsWith("bank_")) {
      return featuredLessonRecords.filter((record) =>
        record.id.startsWith("bank_")
      );
    }

    return featuredLessonRecords;
  }, [lessonId, localLessonSequence]);
  const lessonSequenceIndex = lessonSequence.findIndex(
    (record) => record.id === lessonId
  );
  const previousLesson =
    lessonSequenceIndex > 0 ? lessonSequence[lessonSequenceIndex - 1] : null;
  const nextLesson =
    lessonSequenceIndex >= 0 && lessonSequenceIndex < lessonSequence.length - 1
      ? lessonSequence[lessonSequenceIndex + 1]
      : null;
  const sentenceProgressText = `第 ${pairs.length ? currentIndex + 1 : 0} / ${
    pairs.length
  } 句`;
  const showStudyPrompt = !spokenDisplay && !showEnglish;
  const showStudyListeningPrompt = isListening;
  const showStudyVoiceOnlyPrompt = showStudyPrompt || showStudyListeningPrompt;
  const showExpressionFeedback = Boolean(spokenDisplay) && !showStudyListeningPrompt;
  const selectedExpression =
    expressionVariants[selectedExpressionIndex] ||
    createFallbackExpressionVariants(currentPair.english || "")[0];
  const selectedExpressionSegments = useMemo(
    () =>
      splitSentenceByHighlightedExpressions(
        selectedExpression.text || "",
        highlightedExpressions
      ),
    [highlightedExpressions, selectedExpression.text]
  );

  useEffect(() => {
    const sentence = selectedExpression.text?.trim();
    if (!sentence || isLoadingExpressionVariants) {
      setHighlightedExpressions([]);
      return;
    }

    let cancelled = false;
    setHighlightedExpressions(createFallbackHighlightedExpressions(sentence));

    async function loadHighlightedExpressions() {
      try {
        const response = await fetch("/api/expression-highlights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentence }),
        });
        const data = (await response.json()) as {
          expressions?: HighlightedExpression[];
        };

        if (!cancelled && Array.isArray(data.expressions)) {
          setHighlightedExpressions(
            data.expressions.length
              ? data.expressions
              : createFallbackHighlightedExpressions(sentence)
          );
        }
      } catch {
        if (!cancelled) {
          setHighlightedExpressions(createFallbackHighlightedExpressions(sentence));
        }
      }
    }

    void loadHighlightedExpressions();

    return () => {
      cancelled = true;
    };
  }, [isLoadingExpressionVariants, selectedExpression.text]);
  const hasPreviousExpression = selectedExpressionIndex > 0;
  const hasNextExpression =
    selectedExpressionIndex < expressionVariantLabels.length - 1;

  function openNeighborLesson(targetLesson: { id: string; title: string }) {
    stopAutoPlay();
    window.localStorage.setItem("currentLessonTitle", targetLesson.title);
    router.replace(`/study/${targetLesson.id}`);
  }

  return (
    <main className="responsive-page-shell sf-speak-page min-h-[100dvh] overflow-x-hidden text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[560px] items-center justify-center p-0 sm:p-4">
        <section className="sf-speak-phone sf-study-phone relative flex h-[100dvh] min-h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-none sm:h-[calc(100dvh-16px)] sm:min-h-[720px] sm:rounded-[34px]">
          <div className="pointer-events-none absolute left-1/2 top-[21%] z-0 h-[460px] w-[460px] -translate-x-1/2 rounded-full border border-[#91dcff]/10" />
          <div className="pointer-events-none absolute left-1/2 top-[31%] z-0 h-[310px] w-[310px] -translate-x-1/2 rounded-full border border-[#b799ff]/10" />

          <header className="relative z-10 shrink-0 px-7 pt-8">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="返回课程列表"
                onClick={handleBackToPreviousPage}
                className="sf-header-button"
              >
                <span className="relative block h-4 w-5 before:absolute before:left-0 before:top-0 before:h-px before:w-4 before:bg-[#6f6685] after:absolute after:bottom-0 after:left-0 after:h-px after:w-5 after:bg-[#6f6685]">
                  <span className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-[#6f6685]" />
                </span>
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
                aria-label="显示设置"
                onClick={() => setShowMoreActions((prev) => !prev)}
                className="sf-header-button text-[1.25rem] font-semibold text-[#201833]"
              >
                ⌄
              </button>
            </div>
          </header>

          <section
            className={`sf-study-main relative z-10 flex min-h-0 flex-1 flex-col px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 ${
              showStudyVoiceOnlyPrompt || showExpressionFeedback
                ? "sf-study-main-has-actions"
                : ""
            }`}
          >
            <div className="mx-auto h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(145,220,255,0.46),transparent)]" />
            <div className="sf-study-heading mt-4 shrink-0 text-center">
              <div className="flex items-center justify-center gap-2 text-[1.18rem] font-extrabold text-[#8b849d]">
                {previousLesson ? (
                  <button
                    type="button"
                    onClick={() => openNeighborLesson(previousLesson)}
                    className="grid h-8 w-8 place-items-center rounded-full text-[1.35rem] text-[#8b849d] transition hover:bg-white/35"
                    aria-label="上一课"
                  >
                    ←
                  </button>
                ) : null}
                <span className="max-w-[260px] truncate">{courseTitle}</span>
                {nextLesson ? (
                  <button
                    type="button"
                    onClick={() => openNeighborLesson(nextLesson)}
                    className="grid h-8 w-8 place-items-center rounded-full text-[1.35rem] text-[#8b849d] transition hover:bg-white/35"
                    aria-label="下一课"
                  >
                    →
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[1rem] font-extrabold text-[#9a93a9]">
                {sentenceProgressText}
              </p>
            </div>

            <div
              className={`sf-study-content flex min-h-0 flex-1 flex-col items-center overflow-y-auto text-center ${
                showStudyVoiceOnlyPrompt
                  ? "sf-study-content-with-actions sf-study-content-voice justify-center py-6"
                  : showExpressionFeedback
                    ? "sf-study-content-with-actions sf-study-content-feedback justify-start py-5"
                    : "justify-start py-5"
              }`}
            >
              {showStudyListeningPrompt ? (
                <>
                  <h2 className="max-w-[360px] text-[1.65rem] font-extrabold leading-10 text-[#201833]">
                    正在听你说话...
                  </h2>
                  <p className="mt-6 max-w-[340px] text-[1rem] font-semibold leading-7 text-[#201833]">
                    试着用英语说出来
                  </p>
                </>
              ) : showStudyPrompt ? (
                <>
                  <div className="max-w-[430px] bg-white/10 px-5 py-5">
                    <h2 className="text-[1.75rem] font-extrabold leading-10 text-[#201833]">
                      {currentPair.chinese || "没有内容"}
                    </h2>
                    <p className="mt-5 text-[1rem] font-extrabold text-[#4b4267]">
                      试着用英语说出来
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-full max-w-[430px] text-left">
                    <p className="text-[1.05rem] font-extrabold text-[#7f7896]">
                      你的表达:
                    </p>
                    <p className="mt-5 rounded-[18px] bg-white/10 px-5 py-4 text-[1.15rem] font-bold leading-8 text-[#8f879c]">
                      {spokenDisplay}
                    </p>
                  </div>

                  <div className="mt-6 w-full max-w-[430px]">
                    <div className="flex items-center gap-2 text-left">
                      <button
                        type="button"
                        aria-label="上一种表达"
                        onClick={() =>
                          setSelectedExpressionIndex((index) =>
                            Math.max(index - 1, 0)
                          )
                        }
                        disabled={!hasPreviousExpression}
                        className="grid h-8 w-8 place-items-center rounded-full bg-white/35 text-lg font-extrabold text-[#5b8cff] disabled:invisible"
                      >
                        ←
                      </button>
                      <span className="text-[1.2rem] font-extrabold text-[#4f6fe8]">
                        {selectedExpression.label}
                      </span>
                      <button
                        type="button"
                        aria-label="下一种表达"
                        onClick={() =>
                          setSelectedExpressionIndex((index) =>
                            Math.min(
                              index + 1,
                              expressionVariantLabels.length - 1
                            )
                          )
                        }
                        disabled={!hasNextExpression}
                        className="grid h-8 w-8 place-items-center rounded-full bg-white/35 text-lg font-extrabold text-[#5b8cff] disabled:invisible"
                      >
                        →
                      </button>
                    </div>

                    <p className="sf-study-expression-text mt-4 bg-white/18 px-4 py-4 text-[clamp(1.55rem,7vw,1.85rem)] font-extrabold leading-[1.22] text-[#201833]">
                      {isLoadingExpressionVariants
                        ? "正在生成表达..."
                        : selectedExpressionSegments.map((segment, index) =>
                            segment.type === "expression" ? (
                              <button
                                key={`${segment.value}-${index}`}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleExpressionClick(
                                    segment.expression,
                                    selectedExpression.text
                                  );
                                }}
                                className="inline rounded-xl bg-[#fff7b8]/70 px-1.5 py-0.5 text-[#201833] shadow-[inset_0_-0.28em_0_rgba(255,215,106,0.55)] transition hover:bg-[#fff0a0]"
                              >
                                {segment.value}
                              </button>
                            ) : (
                              <span key={`${segment.value}-${index}`}>
                                {segment.value}
                              </span>
                            )
                          )}
                    </p>

                    <div className="mt-5 flex justify-center gap-5 text-[#201833]">
                      <button
                        type="button"
                        aria-label="播放朗读"
                        onClick={() => speakEnglish(selectedExpression.text, 1)}
                        className="flex h-12 items-center gap-2 rounded-[16px] bg-white/40 px-5 text-[1.25rem] font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                      >
                        ▶
                      </button>
                      <button
                        type="button"
                        aria-label="慢速朗读"
                        onClick={() => speakEnglish(selectedExpression.text, 0.75)}
                        className="flex h-12 items-center gap-2 rounded-[16px] bg-white/40 px-5 text-[1.05rem] font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                      >
                        ▶ <span>0.75x</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {message ? (
                <p className="mt-4 max-w-[360px] rounded-full bg-white/50 px-4 py-2 text-[0.78rem] font-semibold text-[#6f6685]">
                  {message}
                </p>
              ) : null}
            </div>

            {showStudyVoiceOnlyPrompt || showExpressionFeedback ? (
              <div className="sf-study-actions relative z-20 mt-2 shrink-0">
                <div className="flex items-start justify-center gap-10">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="mt-8 grid h-12 w-12 place-items-center rounded-full text-[2rem] font-semibold text-[#201833] transition hover:bg-white/30 disabled:text-[#aaa3b5]"
                    aria-label="上一句"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={
                      handleEnglishPracticeAction
                    }
                    className="grid place-items-center"
                    aria-label={isListening ? "停止语音输入" : "点击开始说话"}
                  >
                    <Image
                      src="/icons/glow-mic.svg"
                      alt=""
                      width={96}
                      height={96}
                      className="h-24 w-24"
                    />
                    <span className="mt-5 text-[1.08rem] font-semibold text-[#7f7896]">
                      {isListening ? "正在听..." : "点击开始说话"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentIndex >= pairs.length - 1}
                    className="mt-8 grid h-12 w-12 place-items-center rounded-full text-[2rem] font-semibold text-[#201833] transition hover:bg-white/30 disabled:text-[#aaa3b5]"
                    aria-label="下一句"
                  >
                    →
                  </button>
                </div>
              </div>
            ) : null}

          </section>

          {showMoreActions ? (
            <div className="absolute left-6 right-6 top-[92px] z-30 rounded-[18px] border border-[#c9bfff] bg-white p-3 text-[#201833] shadow-[0_22px_58px_rgba(84,72,146,0.22)]">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => speakEnglish(currentPair.english, 1)}
                  className="rounded-[14px] bg-[#f7f4ff] px-3 py-2 text-sm font-bold"
                >
                  朗读英文
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handlePlaySourceAudio();
                  }}
                  disabled={isSourceAudioLoading || !canPlaySourceAudio}
                  className={`rounded-[14px] px-3 py-2 text-sm font-bold disabled:opacity-50 ${
                    isSourcePlaybackActive ? "bg-[#d9f8ff]" : "bg-[#f7f4ff]"
                  }`}
                >
                  播放原音频
                </button>
                <button
                  type="button"
                  onClick={handleSaveCurrentPosition}
                  className="rounded-[14px] bg-[#f7f4ff] px-3 py-2 text-sm font-bold"
                >
                  保存当前位置
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isAutoPlaying) {
                      stopAutoPlay();
                      return;
                    }

                    void startAutoPlay();
                  }}
                  className="rounded-[14px] bg-[#f7f4ff] px-3 py-2 text-sm font-bold"
                >
                  {isAutoPlaying ? "停止自动播放" : "自动播放"}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[0.5, 0.75, 1, 1.25].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setSourcePlaybackRate(rate)}
                    className={`rounded-[12px] px-2 py-1.5 text-xs font-bold ${
                      sourcePlaybackRate === rate
                        ? "bg-[#5b8cff] text-white"
                        : "bg-[#f7f4ff] text-[#201833]"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="mt-2 w-full rounded-[14px] border border-[#c9bfff] bg-[#f7f4ff] px-3 py-2 text-sm font-bold outline-none"
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {showStudyVoiceOnlyPrompt || showExpressionFeedback ? null : (
          <div className="relative z-20 shrink-0 rounded-t-[30px] border border-[#d8d0ff] bg-white/35 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-18px_40px_rgba(84,72,146,0.12)] backdrop-blur-xl">
            <div className="flex items-center gap-3 rounded-[24px] border border-[#d8d0ff] bg-white/35 p-2">
              <button
                type="button"
                onClick={() => setShowMoreActions((prev) => !prev)}
                aria-label="更多操作"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-[20px] bg-white/30 text-3xl font-light text-[#201833]"
              >
                +
              </button>
              <div className="flex h-12 min-w-0 flex-1 items-center bg-white/60 px-3 text-left text-[1rem] font-semibold text-[#8f88a5]">
                {isListening
                  ? liveTranscript || "正在听..."
                  : spokenEnglish || "说出你想表达的话..."}
              </div>
              <button
                type="button"
                aria-label={isListening ? "停止语音输入" : "开始语音输入"}
                onClick={handleEnglishPracticeAction}
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-[22px] transition ${
                  isListening
                    ? "scale-105 bg-[#28d5e8]"
                    : "bg-[linear-gradient(135deg,#7b61ff_0%,#5b8cff_58%,#7ee7ff_100%)]"
                }`}
              >
                <span className="flex items-end gap-0.5">
                  {[11, 20, 30, 22].map((height, index) => (
                    <span
                      key={`${height}-${index}`}
                      className="w-1.5 rounded-full bg-white"
                      style={{ height }}
                    />
                  ))}
                </span>
              </button>
            </div>
          </div>
          )}

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

        {showFreePracticeLimitModal ? (
          <FreePracticeLimitModal
            onDismiss={() => setShowFreePracticeLimitModal(false)}
            onUnlockPro={openProFromFreePracticeLimit}
          />
        ) : null}

        {pendingExpression ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171129]/72 p-4 backdrop-blur-[10px]">
            <div className="w-full max-w-[390px] rounded-[30px] border border-white/80 bg-[#f8f5ff] p-6 text-[#201833] shadow-[0_28px_80px_rgba(28,18,62,0.42)]">
              <h2 className="text-[1.6rem] font-extrabold">
                {pendingExpression.meaning}
              </h2>
              <p className="mt-5 rounded-[20px] border border-[#c9bfff] bg-white px-5 py-4 text-[1.65rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {pendingExpression.phrase}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleConfirmAddExpression}
                  disabled={isSavingExpression}
                  className="rounded-[18px] bg-[#5f73ff] px-4 py-4 text-[1.08rem] font-extrabold text-white shadow-[0_12px_28px_rgba(95,115,255,0.28)] hover:bg-[#5267f1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ➕ 收藏表达
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeExpressionModal();
                  }}
                  className="rounded-[18px] border border-[#d8d0f4] bg-white px-4 py-4 text-[1.08rem] font-extrabold text-[#6f668a] hover:bg-[#efeaff]"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
