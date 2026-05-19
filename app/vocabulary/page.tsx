"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  loadVocabularyWords,
  saveVocabularyWords,
  updateVocabularyWord,
  type VocabularyWord,
} from "@/lib/vocabulary";

const TODAY_REVIEW_EXPRESSIONS_KEY = "today_review_vocabulary_expressions";

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

function loadStringList(key: string) {
  if (typeof window === "undefined") return [] as string[];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function saveStringList(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify([...new Set(values)]));
}

export default function VocabularyPage() {
  const router = useRouter();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setTodayReviewWords] = useState<string[]>([]);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [showManageHint, setShowManageHint] = useState(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      setWords([...loadVocabularyWords()].reverse());
      setTodayReviewWords(loadStringList(TODAY_REVIEW_EXPRESSIONS_KEY));
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const shouldShowHint = searchParams.get("hint") === "manage";

    if (!shouldShowHint) return;

    window.history.replaceState(null, "", "/vocabulary");

    const showTimer = window.setTimeout(() => {
      setShowManageHint(true);
    }, 0);
    const hideTimer = window.setTimeout(() => {
      setShowManageHint(false);
    }, 1800);

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

  function refreshWords() {
    setWords([...loadVocabularyWords()].reverse());
  }

  function handleDeleteExpression() {
    if (!displayedExpression) return;

    const nextWords = loadVocabularyWords().filter(
      (item) => item.word !== displayedExpression.word
    );
    saveVocabularyWords(nextWords);
    setTodayReviewWords((current) => {
      const next = current.filter((word) => word !== displayedExpression.word);
      saveStringList(TODAY_REVIEW_EXPRESSIONS_KEY, next);
      return next;
    });
    setCurrentIndex((index) => Math.max(0, Math.min(index, nextWords.length - 1)));
    setShowManageMenu(false);
    setNotice("已删除表达");
    refreshWords();
  }

  function handleMarkMastered() {
    if (!displayedExpression) return;

    updateVocabularyWord(displayedExpression.word, {
      masteredCount: displayedExpression.masteredCount + 1,
      correctCount: displayedExpression.correctCount + 1,
    });
    setShowManageMenu(false);
    setNotice("已标记为掌握");
    refreshWords();
  }

  function handleAddTodayReview() {
    if (!displayedExpression) return;

    setTodayReviewWords((current) => {
      const next = [displayedExpression.word, ...current];
      saveStringList(TODAY_REVIEW_EXPRESSIONS_KEY, next);
      return [...new Set(next)];
    });
    setShowManageMenu(false);
    setNotice("已加入今日复习");
  }

  return (
    <main className="responsive-page-shell sf-speak-page min-h-[100dvh] overflow-x-hidden text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[560px] items-center justify-center p-0 sm:p-4">
        <section className="sf-speak-phone relative h-[100dvh] min-h-[100dvh] w-full max-w-[520px] overflow-hidden rounded-none sm:h-[calc(100dvh-16px)] sm:min-h-[720px] sm:rounded-[34px]">
          <div className="pointer-events-none absolute left-1/2 top-[21%] z-0 h-[460px] w-[460px] -translate-x-1/2 rounded-full border border-[#91dcff]/10" />
          <div className="pointer-events-none absolute left-1/2 top-[31%] z-0 h-[310px] w-[310px] -translate-x-1/2 rounded-full border border-[#b799ff]/10" />

          <header className="relative z-10 px-7 pt-8">
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
                aria-label="管理这个表达"
                onClick={() => setShowManageMenu((current) => !current)}
                className="sf-header-button text-[1.25rem] font-semibold text-[#201833]"
              >
                ...
              </button>
            </div>
          </header>

          {showManageMenu ? (
            <div className="absolute right-6 top-[92px] z-30 w-[250px] rounded-[24px] border border-[#c9bfff] bg-[#fbf9ff] p-4 text-[#201833] shadow-[0_24px_60px_rgba(84,72,146,0.26)]">
              <h3 className="px-3 py-2 text-[1rem] font-extrabold">
                管理这个表达
              </h3>
              <div className="mt-1 grid gap-1">
                <button
                  type="button"
                  onClick={handleMarkMastered}
                  disabled={!displayedExpression}
                  className="rounded-[16px] px-3 py-3 text-left text-[1rem] font-bold hover:bg-[#efeaff] disabled:opacity-45"
                >
                  ✓ 我已经会说了
                </button>
                <button
                  type="button"
                  onClick={handleAddTodayReview}
                  disabled={!displayedExpression}
                  className="rounded-[16px] px-3 py-3 text-left text-[1rem] font-bold hover:bg-[#efeaff] disabled:opacity-45"
                >
                  🔁 稍后再复习
                </button>
                <button
                  type="button"
                  onClick={handleDeleteExpression}
                  disabled={!displayedExpression}
                  className="rounded-[16px] px-3 py-3 text-left text-[1rem] font-bold hover:bg-[#ffecef] disabled:opacity-45"
                >
                  🗑 从表达库移除
                </button>
              </div>
            </div>
          ) : null}

          {showManageHint ? (
            <div className="absolute left-1/2 top-[96px] z-40 w-[min(86%,360px)] -translate-x-1/2 rounded-[20px] border border-white/70 bg-[#fbf9ff] px-5 py-4 text-center text-[1rem] font-extrabold text-[#201833] shadow-[0_20px_50px_rgba(84,72,146,0.22)]">
              💡 点击右上角可管理表达。
            </div>
          ) : null}

          <section className="relative z-10 flex h-full flex-col px-6 pt-7 pb-10">
            <div className="mx-auto h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(145,220,255,0.46),transparent)]" />
            <div className="mt-5 text-center">
              <h2 className="text-[1.12rem] font-extrabold text-[#6f668a]">
                ✨ 已经学到的新表达
              </h2>
              <p className="mt-4 text-[1.08rem] font-extrabold text-[#9a93a9]">
                {progressText}
              </p>
              {notice ? (
                <p className="mt-3 text-[0.9rem] font-bold text-[#7f7896]">
                  {notice}
                </p>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col items-center pt-10 text-center">
              {displayedExpression ? (
                <div className="w-full max-w-[390px] bg-white/16 px-7 py-8 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                  <h3 className="text-[1.65rem] font-extrabold leading-9 text-[#201833]">
                    {displayedExpressionText}
                  </h3>
                  {displayedExampleText ? (
                    <p className="mt-7 text-[1.32rem] font-semibold leading-9 text-[#201833]">
                      {displayedExampleText}
                    </p>
                  ) : (
                    <p className="mt-7 text-[1.1rem] font-semibold leading-8 text-[#7f7896]">
                      这个表达还没有例句。
                    </p>
                  )}

                  <div className="mt-7 flex justify-center gap-4 text-[#201833]">
                    <button
                      type="button"
                      aria-label="播放朗读"
                      onClick={() => speakExpression(1)}
                      className="flex h-12 items-center gap-2 rounded-[16px] bg-white/45 px-5 text-[1.2rem] font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                    >
                      ▶
                    </button>
                    <button
                      type="button"
                      aria-label="慢速朗读"
                      onClick={() => speakExpression(0.5)}
                      className="flex h-12 items-center gap-2 rounded-[16px] bg-white/45 px-5 text-[1.02rem] font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                    >
                      ▶ <span>0.5x</span>
                    </button>
                  </div>
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

          <div className="absolute bottom-9 left-1/2 z-20 w-full max-w-[360px] -translate-x-1/2 px-6">
            <div className="flex items-start justify-center gap-10">
              <button
                type="button"
                onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
                disabled={!hasPrevious}
                className="mt-9 grid h-12 w-12 place-items-center rounded-full text-[2rem] font-semibold text-[#201833] transition hover:bg-white/30 disabled:text-[#aaa3b5]"
                aria-label="上一个表达"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => router.replace("/speak-english")}
                className="grid place-items-center"
                aria-label="开始自由练习"
              >
                <Image
                  src="/icons/glow-mic.svg"
                  alt=""
                  width={96}
                  height={96}
                  className="h-24 w-24"
                />
                <span className="mt-7 text-[1.08rem] font-semibold text-[#7f7896]">
                  点击开始说话
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((index) => Math.min(index + 1, words.length - 1))
                }
                disabled={!hasNext}
                className="mt-9 grid h-12 w-12 place-items-center rounded-full text-[2rem] font-semibold text-[#201833] transition hover:bg-white/30 disabled:text-[#aaa3b5]"
                aria-label="下一个表达"
              >
                →
              </button>
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
