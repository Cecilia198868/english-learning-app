"use client";

import { useEffect, useMemo, useState } from "react";
import ExpressionLearningLimitModal from "@/components/ExpressionLearningLimitModal";
import {
  canLearnExpression,
  getExpressionLearningId,
  recordLearnedExpression,
} from "@/lib/freeExpressionLearningLimit";
import {
  loadVocabularyWords,
  saveVocabularyWords,
  type VocabularyWord,
} from "@/lib/vocabulary";

type SessionResponse = {
  user?: {
    email?: string | null;
    image?: string | null;
    name?: string | null;
  } | null;
};

const accountAvatarStoragePrefix = "speakflow-account-avatar";

function getAccountAvatarStorageKey(identifier: string) {
  return `${accountAvatarStoragePrefix}:${identifier || "local-user"}`;
}

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

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 15h10l1-15" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
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

function navigateToSpeakEnglish(search: string, options: { replace?: boolean } = {}) {
  if (typeof window === "undefined") return;

  window.speechSynthesis.cancel();

  const target = `/speak-english${search}`;
  if (options.replace) {
    window.location.replace(target);
    return;
  }

  window.location.assign(target);
}

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExpressionLibrary, setShowExpressionLibrary] = useState(false);
  const [showExpressionLimitModal, setShowExpressionLimitModal] =
    useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountImage, setAccountImage] = useState("");
  const [accountImageFailed, setAccountImageFailed] = useState(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      setWords([...loadVocabularyWords()].reverse());
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("library") !== "1") return;

    window.history.replaceState(null, "", "/vocabulary");
    const openLibraryTimer = window.setTimeout(() => {
      setShowExpressionLibrary(true);
    }, 0);

    return () => {
      window.clearTimeout(openLibraryTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountSession() {
      try {
        const response = await fetch("/api/auth/session");
        const session = (await response.json()) as SessionResponse;
        if (cancelled) return;

        const nextName = session.user?.name || "";
        const nextEmail = session.user?.email || session.user?.name || "";
        const savedAvatar = window.localStorage.getItem(
          getAccountAvatarStorageKey(nextEmail || nextName)
        );

        setAccountName(nextName);
        setAccountEmail(nextEmail);
        setAccountImage(savedAvatar || session.user?.image || "");
        setAccountImageFailed(false);
      } catch {
        if (!cancelled) {
          setAccountName("");
          setAccountEmail("");
          setAccountImage("");
        }
      }
    }

    void loadAccountSession();

    return () => {
      cancelled = true;
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
  const accountAvatarLabel = (accountName || accountEmail || "CL")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!displayedExpression) return;

    const expressionId = getExpressionLearningId(displayedExpression);
    if (!canLearnExpression(expressionId)) {
      const showTimer = window.setTimeout(() => {
        setShowExpressionLimitModal(true);
      }, 0);

      return () => {
        window.clearTimeout(showTimer);
      };
    }

    recordLearnedExpression(expressionId);
  }, [displayedExpression]);

  function returnToPracticeMenu() {
    setShowExpressionLibrary(false);
    setShowExpressionLimitModal(false);
    navigateToSpeakEnglish("?menu=1", { replace: true });
  }

  function openAccountFromVocabulary() {
    setShowExpressionLibrary(false);
    setShowExpressionLimitModal(false);
    navigateToSpeakEnglish("?account=1");
  }

  function openProFromExpressionLimit() {
    setShowExpressionLimitModal(false);
    navigateToSpeakEnglish("?menu=1&pro=1");
  }

  function openExpressionAt(index: number, options: { closeLibrary?: boolean } = {}) {
    const expression = words[index];
    if (!expression) return;

    const expressionId = getExpressionLearningId(expression);
    if (!canLearnExpression(expressionId)) {
      setShowExpressionLimitModal(true);
      return;
    }

    setCurrentIndex(index);
    if (options.closeLibrary) {
      setShowExpressionLibrary(false);
    }
  }

  function speakExpression(rate: number) {
    if (!speechText || typeof window === "undefined") return;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "en-US";
    utterance.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function removeExpressionFromLibrary(
    expression: VocabularyWord,
    options: { keepLibraryOpen?: boolean } = {}
  ) {
    const deletedVisibleIndex = words.findIndex(
      (word) => word.word === expression.word
    );

    const nextStoredWords = loadVocabularyWords().filter(
      (word) => word.word !== expression.word
    );
    const nextVisibleWords = [...nextStoredWords].reverse();

    saveVocabularyWords(nextStoredWords);
    setWords(nextVisibleWords);
    setCurrentIndex((index) => {
      const maxIndex = Math.max(nextVisibleWords.length - 1, 0);

      if (deletedVisibleIndex >= 0 && deletedVisibleIndex < index) {
        return Math.min(index - 1, maxIndex);
      }

      return Math.min(index, maxIndex);
    });

    if (!options.keepLibraryOpen) {
      setShowExpressionLibrary(false);
    }
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
                onClick={returnToPracticeMenu}
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
                aria-label="打开账户"
                onClick={openAccountFromVocabulary}
                className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/70 bg-[#f7f4ff] text-[0.82rem] font-extrabold text-white shadow-[0_12px_26px_rgba(84,72,146,0.18)]"
              >
                {accountImage && !accountImageFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={accountImage}
                    alt={accountEmail || "user"}
                    className="h-full w-full object-cover"
                    onError={() => setAccountImageFailed(true)}
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#ffd84d_0%,#f0b912_52%,#e9a70f_100%)] text-[#fff8dd]">
                    {accountAvatarLabel}
                  </span>
                )}
              </button>
            </div>
          </header>

          {showExpressionLibrary ? (
            <div className="sf-expression-library-panel absolute inset-x-0 bottom-0 top-[86px] z-50 flex flex-col overflow-hidden bg-[linear-gradient(180deg,#d8cffc_0%,#ddd5ff_48%,#e7e0ff_100%)] px-9 pb-[calc(1.2rem+env(safe-area-inset-bottom))] pt-5 text-[#201833]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[1.8rem] font-extrabold leading-tight">
                    表达库
                  </h3>
                  <p className="mt-3 text-[1.18rem] font-extrabold text-[#7f7896]">
                    共 {words.length} 个新表达
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="关闭表达库"
                  onClick={() => setShowExpressionLibrary(false)}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ede8ff]/72 text-[1.7rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition hover:bg-[#e2d9ff]"
                >
                  ×
                </button>
              </div>

              <div className="sf-expression-library-scroll mt-8 min-h-0 flex-1 overflow-y-auto">
                {words.length ? (
                  <div className="grid gap-0">
                    {words.map((word, index) => (
                      <div
                        key={`${word.word}-${word.createdAt}`}
                        className={`flex items-center gap-3 border-b border-[#c5b9fa]/62 px-0 py-5 transition ${
                          index === currentIndex
                            ? "bg-[#d8d0ff]/46"
                            : "bg-transparent hover:bg-[#e3dcff]/34"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            openExpressionAt(index, { closeLibrary: true });
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block text-[1.42rem] font-extrabold leading-8 text-[#201833]">
                            {word.word}
                          </span>
                          <span className="mt-2 block text-[1.05rem] font-extrabold leading-7 text-[#7f7896]">
                            {getExpressionNativeMeaning(word)}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`从表达库移除 ${word.word}`}
                          onClick={() =>
                            removeExpressionFromLibrary(word, {
                              keepLibraryOpen: true,
                            })
                          }
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-transparent text-[#6f668a] transition hover:bg-[#ffecef]/72 hover:text-[#9b2444]"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-5 text-center text-[1.1rem] font-bold text-[#7f7896]">
                    还没有收藏的新表达。
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <section className="sf-study-main sf-vocabulary-main relative z-10 flex min-h-0 flex-1 flex-col px-6 pb-[calc(7.25rem+env(safe-area-inset-bottom))] pt-4">
            <div className="mx-auto h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(145,220,255,0.46),transparent)]" />
            <div className="mt-5 shrink-0 text-center">
              <h2 className="text-[1.12rem] font-extrabold text-[#6f668a]">
                ✨ 学习新表达
              </h2>
              <p className="mt-4 text-[1.08rem] font-extrabold text-[#9a93a9]">
                {progressText}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-7 text-center">
              {displayedExpression ? (
                <div className="min-h-[280px] w-full max-w-[390px] px-7 py-8 text-left">
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

          {!showExpressionLibrary ? (
            <div className="sf-vocabulary-actions sf-expression-actions absolute inset-x-0 bottom-0 z-20 flex min-h-[5.75rem] items-center justify-center border-t border-[#cfc4ff]/72 bg-[linear-gradient(180deg,rgba(228,220,255,0.78),rgba(215,207,252,0.94))] px-5 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_24px_rgba(100,82,180,0.08),inset_0_1px_0_rgba(255,255,255,0.52)] backdrop-blur-xl">
            <div className="sf-expression-actions-inner flex w-full max-w-[330px] items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => openExpressionAt(Math.max(currentIndex - 1, 0))}
                disabled={!hasPrevious}
                className="sf-expression-nav-button grid h-11 w-11 place-items-center rounded-full text-[1.85rem] font-semibold text-[#201833] transition hover:bg-white/28 disabled:text-[#aaa3b5]"
                aria-label="上一个表达"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="播放朗读"
                onClick={() => speakExpression(1)}
                disabled={!displayedExpression}
                className="sf-expression-play-button flex h-11 min-w-[3.55rem] items-center justify-center gap-2 rounded-[15px] bg-white/46 px-4 text-[1.06rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_9px_18px_rgba(84,72,146,0.1)] disabled:opacity-45"
              >
                ▶
              </button>
              <button
                type="button"
                aria-label="慢速朗读"
                onClick={() => speakExpression(0.5)}
                disabled={!displayedExpression}
                className="sf-expression-slow-button flex h-11 min-w-[5.15rem] items-center justify-center gap-1.5 rounded-[15px] bg-white/46 px-4 text-[0.92rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_9px_18px_rgba(84,72,146,0.1)] disabled:opacity-45"
              >
                ▶ <span>0.5x</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  openExpressionAt(Math.min(currentIndex + 1, words.length - 1))
                }
                disabled={!hasNext}
                className="sf-expression-nav-button grid h-11 w-11 place-items-center rounded-full text-[1.85rem] font-semibold text-[#201833] transition hover:bg-white/28 disabled:text-[#aaa3b5]"
                aria-label="下一个表达"
              >
                →
              </button>
            </div>
            </div>
          ) : null}

        </section>
        {showExpressionLimitModal ? (
          <ExpressionLearningLimitModal
            onDismiss={() => setShowExpressionLimitModal(false)}
            onUnlockPro={openProFromExpressionLimit}
          />
        ) : null}
      </div>
    </main>
  );
}
