"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Lesson = {
  id: string;
  title: string;
  txt_content: string;
  created_at?: string;
};

type SentencePair = {
  chinese: string;
  english: string;
};

type LocalLessonData = {
  lessons: Lesson[];
};

const LESSONS_STORAGE_KEY = "english-app-lessons";

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
    console.error("璇诲彇璇剧▼澶辫触锛?, error);
    return getDefaultLessonsData();
  }
}

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = typeof params.id === "string" ? params.id : "";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [pairs, setPairs] = useState<SentencePair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const [message, setMessage] = useState("");

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [speechRate, setSpeechRate] = useState(1);

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const [prepSeconds, setPrepSeconds] = useState(2);
  const [gapSeconds, setGapSeconds] = useState(1);

  const progressKey = `lesson-progress-${lessonId}`;
  const voiceKey = "selected-voice-name";
  const prepKey = "study-prep-seconds";
  const gapKey = "study-gap-seconds";

  const autoPlayRef = useRef(false);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  function clearAutoTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function parseTxtToPairs(content: string): SentencePair[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "");

    const result: SentencePair[] = [];

    for (let i = 0; i < lines.length; i += 2) {
      result.push({
        english: lines[i] || "",
        chinese: lines[i + 1] || "",
      });
    }

    return result;
  }

  function loadLesson() {
    const data = loadLessonsData();
    const found = data.lessons.find((item) => item.id === lessonId) || null;

    if (!found) {
      setMessage("璇诲彇璇剧▼澶辫触锛氬綋鍓嶆祻瑙堝櫒閲屾病鏈夎繖鏉¤绋嬨€?);
      setLesson(null);
      setPairs([]);
      return;
    }

    setLesson(found);

    const parsedPairs = parseTxtToPairs(found.txt_content || "");
    setPairs(parsedPairs);

    const savedIndex = localStorage.getItem(progressKey);
    if (savedIndex !== null) {
      const indexNumber = Number(savedIndex);
      if (
        !Number.isNaN(indexNumber) &&
        indexNumber >= 0 &&
        indexNumber < parsedPairs.length
      ) {
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
  }

  function saveProgress(index: number) {
    localStorage.setItem(progressKey, String(index));
  }

  function handlePrev() {
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

  function speakEnglish(text: string, onEnd?: () => void) {
    if (!text) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = speechRate;

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
    if (
      savedVoiceName &&
      englishVoices.some((voice) => voice.name === savedVoiceName)
    ) {
      setSelectedVoiceName(savedVoiceName);
    } else if (englishVoices.length > 0) {
      setSelectedVoiceName(englishVoices[0].name);
    }
  }

  function stopAutoPlay() {
    autoPlayRef.current = false;
    setIsAutoPlaying(false);
    clearAutoTimer();
    window.speechSynthesis.cancel();
    setMessage("宸插仠姝㈣嚜鍔ㄦ挱鏀俱€?);
  }

  function scheduleNextStep(callback: () => void, delayMs: number) {
    clearAutoTimer();
    timerRef.current = window.setTimeout(() => {
      callback();
    }, delayMs);
  }

  function playCurrentSentenceAndContinue(index: number) {
    if (!autoPlayRef.current) return;

    if (index < 0 || index >= pairs.length) {
      autoPlayRef.current = false;
      setIsAutoPlaying(false);
      setMessage("鑷姩鎾斁宸插畬鎴愩€?);
      return;
    }

    const pair = pairs[index];

    setCurrentIndex(index);
    currentIndexRef.current = index;
    setShowEnglish(false);
    saveProgress(index);
    setMessage("鑷姩鎾斁涓細鍏堢湅涓枃...");

    scheduleNextStep(() => {
      if (!autoPlayRef.current) return;

      setShowEnglish(true);
      setMessage("鑷姩鎾斁涓細鏄剧ず鑻辨枃骞舵湕璇?..");

      speakEnglish(pair.english, () => {
        if (!autoPlayRef.current) return;

        if (index < pairs.length - 1) {
          scheduleNextStep(() => {
            if (!autoPlayRef.current) return;
            playCurrentSentenceAndContinue(index + 1);
          }, gapSeconds * 1000);
        } else {
          autoPlayRef.current = false;
          setIsAutoPlaying(false);
          setMessage("鑷姩鎾斁宸插畬鎴愩€?);
        }
      });
    }, prepSeconds * 1000);
  }

  function startAutoPlay() {
    if (pairs.length === 0) {
      setMessage("褰撳墠璇剧▼娌℃湁鍙挱鏀惧唴瀹广€?);
      return;
    }

    autoPlayRef.current = true;
    setIsAutoPlaying(true);
    setMessage("鑷姩鎾斁鍑嗗寮€濮?..");
    playCurrentSentenceAndContinue(currentIndexRef.current);
  }

  useEffect(() => {
    if (lessonId) {
      loadLesson();
    }
  }, [lessonId]);

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      clearAutoTimer();
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
      if (!Number.isNaN(n) && n >= 0 && n <= 10) {
        setPrepSeconds(n);
      }
    }

    if (savedGap) {
      const n = Number(savedGap);
      if (!Number.isNaN(n) && n >= 0 && n <= 10) {
        setGapSeconds(n);
      }
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

  const currentPair = useMemo(() => {
    return pairs[currentIndex] || { chinese: "", english: "" };
  }, [pairs, currentIndex]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
              Study Mode
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">閫愬彞瀛︿範</h1>
            <p className="mt-1 text-sm text-white/65">
              {lesson?.title || "姝ｅ湪鍔犺浇璇剧▼..."}
            </p>
            {pairs.length > 0 && (
              <p className="mt-1 text-xs text-white/50">
                绗?{currentIndex + 1} 鍙?/ 鍏?{pairs.length} 鍙?              </p>
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
              杩斿洖棣栭〉
            </button>

            <button
              onClick={() => {
                saveProgress(currentIndex);
                setMessage("瀛︿範浣嶇疆宸蹭繚瀛橈紒");
              }}
              className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500"
            >
              淇濆瓨褰撳墠浣嶇疆
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
              <h2 className="mb-3 text-lg font-bold">澹伴煶璁剧疆</h2>

              <label className="mb-2 block text-sm text-white/70">
                閫夋嫨鏈哄櫒浜哄０闊?              </label>
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
              <h2 className="mb-3 text-lg font-bold">鑷姩鎾斁鑺傚</h2>

              <div className="mb-4">
                <label className="mb-2 block text-sm text-white/70">
                  涓枃鍋滅暀绉掓暟锛歿prepSeconds} 绉?                </label>
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
                  姣忓彞缁撴潫闂撮殧锛歿gapSeconds} 绉?                </label>
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
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold md:text-2xl">鑻辨枃鍖?/h2>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                  鐐瑰嚮绌虹櫧鍖哄煙鏄剧ず鑻辨枃
                </div>
              </div>

              <div
                onClick={() => setShowEnglish(true)}
                className="flex min-h-[110px] cursor-pointer items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/25 p-5 text-center transition hover:border-emerald-400/40 hover:bg-black/35 md:min-h-[130px]"
              >
                {showEnglish ? (
                  <p className="text-2xl font-semibold leading-relaxed text-emerald-300 md:text-3xl">
                    {currentPair.english || "杩欎竴鍙ヨ繕娌℃湁瀵瑰簲鑻辨枃銆?}
                  </p>
                ) : (
                  <p className="text-lg text-white/35 md:text-xl">
                    鐐瑰嚮杩欓噷鏄剧ず鑻辨枃
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold md:text-2xl">涓枃鍖?/h2>
                <div className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-300">
                  褰撳墠瀛︿範鍙ュ瓙
                </div>
              </div>

              <div className="rounded-3xl bg-black/25 p-5 md:p-6">
                <p className="text-2xl font-bold leading-relaxed md:text-3xl">
                  {currentPair.chinese || "娌℃湁鍐呭"}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
              <h2 className="mb-3 text-xl font-bold md:text-2xl">鎺у埗鍖?/h2>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0 || isAutoPlaying}
                  className="rounded-2xl bg-slate-700 px-4 py-3 text-sm disabled:opacity-40"
                >
                  涓婁竴鍙?                </button>

                <button
                  onClick={handleNext}
                  disabled={currentIndex >= pairs.length - 1 || isAutoPlaying}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-sm disabled:opacity-40"
                >
                  涓嬩竴鍙?                </button>

                <button
                  onClick={() => setShowEnglish(true)}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm"
                >
                  鏄剧ず鑻辨枃
                </button>

                <button
                  onClick={() => setShowEnglish(false)}
                  className="rounded-2xl bg-slate-700 px-4 py-3 text-sm"
                >
                  闅愯棌鑻辨枃
                </button>

                <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-2">
                  <button
                    onClick={() => speakEnglish(currentPair.english)}
                    disabled={isAutoPlaying}
                    className="rounded-2xl bg-purple-600 px-4 py-3 text-sm disabled:opacity-40"
                  >
                    鏈楄鑻辨枃
                  </button>

                  <button
                    onClick={() => setSpeechRate(1)}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      speechRate === 1
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    正常
                  </button>

                  <button
                    onClick={() => setSpeechRate(0.75)}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      speechRate === 0.75
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    慢速
                  </button>

                  <button
                    onClick={() => setSpeechRate(0.6)}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      speechRate === 0.6
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    超慢
                  </button>
                </div>


                {!isAutoPlaying ? (
                  <button
                    onClick={startAutoPlay}
                    className="rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold"
                  >
                    寮€濮嬭嚜鍔ㄦ挱鏀?                  </button>
                ) : (
                  <button
                    onClick={stopAutoPlay}
                    className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold"
                  >
                    鍋滄鑷姩鎾斁
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}






