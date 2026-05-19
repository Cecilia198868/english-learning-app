"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadVocabularyWords,
  saveVocabularyWords,
  type VocabularyWord,
} from "@/lib/vocabulary";

const GENERIC_EXPRESSION_MEANINGS = new Set([
  "",
  "✨ 值得学习的表达",
  "值得学习的表达",
  "释义待补充",
]);

const EXPRESSION_MEANING_FALLBACKS: Record<string, string> = {
  "set up": "设立；开设；安排",
  "open a bank account": "开设银行账户",
  "bring along": "随身带上",
  "lush and verdant": "生机盎然",
};

function SoundWaveMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 92 44"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="vocabularySoundWaveBorder" x1="10" y1="36" x2="82" y2="8">
          <stop stopColor="#d85ee9" />
          <stop offset="1" stopColor="#28d5e8" />
        </linearGradient>
        <linearGradient id="vocabularySoundWaveBars" x1="22" y1="22" x2="70" y2="22">
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
        stroke="url(#vocabularySoundWaveBorder)"
        strokeWidth="3"
      />
      <path
        d="M23 22h0.1M33 17v10M43 13v18M53 8v28M63 14v16M73 18v8"
        stroke="url(#vocabularySoundWaveBars)"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <circle cx="82" cy="22" r="4" fill="#28d5e8" />
    </svg>
  );
}

function getExpressionExample(word: VocabularyWord) {
  return word.sourceSentence || word.example || "";
}

function getExpressionNativeMeaning(word: VocabularyWord) {
  const savedMeaning = word.meaning.trim();

  if (!GENERIC_EXPRESSION_MEANINGS.has(savedMeaning)) {
    return savedMeaning;
  }

  return EXPRESSION_MEANING_FALLBACKS[word.word.toLowerCase()] || "释义待补充";
}

export default function VocabularyPage() {
  const router = useRouter();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExpressionLibrary, setShowExpressionLibrary] = useState(false);
  const [showLibraryHint, setShowLibraryHint] = useState(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      setWords([...loadVocabularyWords()].reverse());
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, []);

  useEffect(() => {
    const showTimer = window.setTimeout(() => {
      setShowLibraryHint(true);
    }, 250);
    const hideTimer = window.setTimeout(() => {
      setShowLibraryHint(false);
    }, 3600);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  const progressText = `你已经学会了 ${words.length} 个表达`;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < words.length - 1;
  const visibleWords = words;
  const displayedExpression = visibleWords[currentIndex] || null;
  const displayedExpressionText = displayedExpression?.word || "";
  const displayedExampleText = displayedExpression
    ? getExpressionExample(displayedExpression)
    : "";
  const displayedMeaningText = displayedExpression
    ? getExpressionNativeMeaning(displayedExpression)
    : "";
  const speechText = useMemo(() => {
    if (!displayedExpression) return "";
    return displayedExampleText || displayedExpressionText;
  }, [displayedExpression, displayedExampleText, displayedExpressionText]);

  function speakExpression(rate: number) {
    if (!speechText || typeof window === "undefined") return;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "en-US";
    utterance.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function handleDeleteExpression() {
    if (!displayedExpression) return;

    const nextStoredWords = loadVocabularyWords().filter(
      (word) => word.word !== displayedExpression.word
    );
    const nextVisibleWords = [...nextStoredWords].reverse();

    saveVocabularyWords(nextStoredWords);
    setWords(nextVisibleWords);
    setCurrentIndex((index) =>
      Math.min(index, Math.max(nextVisibleWords.length - 1, 0))
    );
    setShowExpressionLibrary(false);
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
                aria-label="返回菜单"
                onClick={() => router.replace("/speak-english?menu=1")}
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
                aria-label="打开表达库"
                onClick={() => {
                  setShowExpressionLibrary(true);
                  setShowLibraryHint(false);
                }}
                className="sf-header-button text-[1.25rem] font-semibold text-[#201833]"
              >
                ...
              </button>
            </div>
          </header>

          {showLibraryHint ? (
            <div className="absolute left-1/2 top-[94px] z-40 w-[min(84%,350px)] -translate-x-1/2 rounded-[20px] border border-white/70 bg-[#fbf9ff] px-5 py-4 text-center text-[0.98rem] font-extrabold leading-6 text-[#201833] shadow-[0_20px_50px_rgba(84,72,146,0.22)]">
              点击右上角三个点，可以打开表达库。
            </div>
          ) : null}

          {showExpressionLibrary ? (
            <div className="absolute inset-x-5 top-[92px] z-50 max-h-[min(72dvh,560px)] overflow-hidden rounded-[24px] border border-[#c9bfff] bg-[#fbf9ff] p-4 text-[#201833] shadow-[0_26px_70px_rgba(84,72,146,0.30)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[1.15rem] font-extrabold">表达库</h3>
                  <p className="mt-1 text-[0.86rem] font-bold text-[#7f7896]">
                    共 {words.length} 个新表达
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="关闭表达库"
                  onClick={() => setShowExpressionLibrary(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-[#f1edff] text-[1.35rem] font-extrabold text-[#201833]"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 max-h-[calc(min(72dvh,560px)-96px)] overflow-y-auto pr-1">
                {words.length ? (
                  <div className="grid gap-2">
                    {words.map((word, index) => (
                      <button
                        key={`${word.word}-${word.createdAt}`}
                        type="button"
                        onClick={() => {
                          setCurrentIndex(index);
                          setShowExpressionLibrary(false);
                        }}
                        className={`rounded-[18px] px-4 py-3 text-left transition ${
                          index === currentIndex
                            ? "bg-[#e8e3ff] shadow-[inset_0_0_0_1px_rgba(91,140,255,0.22)]"
                            : "bg-white/72 hover:bg-[#f2efff]"
                        }`}
                      >
                        <span className="block text-[1.08rem] font-extrabold leading-6 text-[#201833]">
                          {word.word}
                        </span>
                        <span className="mt-1 block text-[0.92rem] font-bold leading-6 text-[#7f7896]">
                          {getExpressionNativeMeaning(word)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[18px] bg-white/72 px-4 py-5 text-center text-[1rem] font-bold text-[#7f7896]">
                    还没有收藏的新表达。
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <section className="sf-study-main relative z-10 flex min-h-0 flex-1 flex-col px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4">
            <div className="mx-auto h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(145,220,255,0.46),transparent)]" />
            <div className="mt-5 shrink-0 text-center">
              <h2 className="text-[1.12rem] font-extrabold text-[#6f668a]">
                ✨ 已经学到的新表达
              </h2>
              <p className="mt-4 text-[1.08rem] font-extrabold text-[#9a93a9]">
                {progressText}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-7 text-center">
              {displayedExpression ? (
                <div className="min-h-[280px] w-full max-w-[390px] bg-white/16 px-7 py-8 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                  <h3 className="text-[1.65rem] font-extrabold leading-9 text-[#201833]">
                    {displayedExpressionText}
                  </h3>
                  <p className="mt-2 text-[1.05rem] font-extrabold leading-7 text-[#201833]">
                    中文含义： {displayedMeaningText}
                  </p>
                  {displayedExampleText ? (
                    <p className="mt-3 text-[1.22rem] font-semibold leading-9 text-[#201833]">
                      {displayedExampleText}
                    </p>
                  ) : (
                    <p className="mt-3 text-[1.1rem] font-semibold leading-8 text-[#7f7896]">
                      这个表达还没有例句。
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-20 max-w-[340px] text-center">
                  <h3 className="text-[1.5rem] font-extrabold text-[#201833]">
                    还没有学到的新表达
                  </h3>
                  <p className="mt-4 text-[1rem] font-semibold leading-7 text-[#7f7896]">
                    在练习页点击英文单词后，就会保存到这里。
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="relative z-20 mt-2 w-full max-w-[360px] self-center px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                disabled={!hasPrevious}
                className="grid h-12 w-12 place-items-center rounded-full text-[2rem] font-semibold text-[#201833] transition hover:bg-white/30 disabled:text-[#aaa3b5]"
                aria-label="上一个表达"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="播放朗读"
                onClick={() => speakExpression(1)}
                disabled={!displayedExpression}
                className="flex h-12 items-center gap-2 rounded-[16px] bg-white/45 px-5 text-[1.2rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] disabled:opacity-45"
              >
                ▶
              </button>
              <button
                type="button"
                aria-label="慢速朗读"
                onClick={() => speakExpression(0.5)}
                disabled={!displayedExpression}
                className="flex h-12 items-center gap-2 rounded-[16px] bg-white/45 px-5 text-[1.02rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] disabled:opacity-45"
              >
                ▶ <span>0.5x</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((index) => Math.min(index + 1, words.length - 1))
                }
                disabled={!hasNext}
                className="grid h-12 w-12 place-items-center rounded-full text-[2rem] font-semibold text-[#201833] transition hover:bg-white/30 disabled:text-[#aaa3b5]"
                aria-label="下一个表达"
              >
                →
              </button>
            </div>
            <button
              type="button"
              onClick={handleDeleteExpression}
              disabled={!displayedExpression}
              className="mx-auto mt-7 flex min-h-12 items-center justify-center bg-white/78 px-5 py-3 text-[0.95rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] disabled:opacity-45"
            >
              🗑 从表达库移除
            </button>
          </div>

        </section>
      </div>
    </main>
  );
}
