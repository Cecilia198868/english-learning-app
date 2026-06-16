"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import InteractiveExpressionText from "@/components/InteractiveExpressionText";
import { playSpeakFlowTts, stopSpeakFlowTts } from "@/lib/speakFlowTtsClient";
import {
  SPEAKFLOW_DEFAULT_VOICE_ID,
  SPEAKFLOW_VOICES,
} from "@/lib/voiceSettings";
import type {
  SentencePatternLevel,
  SentencePatternPractice,
  SentencePatternSection,
  SentencePatternTone,
} from "@/data/sentencePatterns";
import styles from "./SentencePatternPages.module.css";

type StudyProps = {
  level: SentencePatternLevel;
  patternId: number;
  section: SentencePatternSection;
};

type PatternToneStyle = CSSProperties & {
  "--pattern-accent": string;
  "--pattern-accent-dark": string;
  "--pattern-soft": string;
  "--pattern-soft-strong": string;
  "--pattern-glow": string;
};

type SentencePatternProgressSnapshot = {
  challenge?: {
    completed?: number;
    goal?: number;
    percent?: number;
  };
  dailyGoal?: number;
  streakDays?: number;
  todayCompleted?: number;
  totalCompleted?: number;
};

type SentencePatternProgressApiPayload = SentencePatternProgressSnapshot & {
  data?: SentencePatternProgressSnapshot;
  progress?: SentencePatternProgressSnapshot;
  snapshot?: SentencePatternProgressSnapshot;
};

const RESTART_AFTER_NO_SPEECH_MS = 240;

function isInteractiveCardTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement
) {
  if (!(target instanceof HTMLElement)) return false;

  const interactiveTarget = target.closest(
    "button, a, input, select, textarea, [role='button']"
  );
  return Boolean(interactiveTarget && interactiveTarget !== currentTarget);
}

function playFromCardClick(event: MouseEvent<HTMLElement>, play: () => void) {
  if (isInteractiveCardTarget(event.target, event.currentTarget)) return;
  play();
}

function playFromCardKey(event: KeyboardEvent<HTMLElement>, play: () => void) {
  if (isInteractiveCardTarget(event.target, event.currentTarget)) return;
  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  play();
}

function sessionKey(levelId: string, patternId: number, practiceId: number) {
  return `sentence-pattern:${levelId}:${patternId}:${practiceId}:transcript`;
}

function readSavedTranscript(
  levelId: string,
  patternId: number,
  practiceId: number
) {
  if (typeof window === "undefined") return "";

  try {
    return (
      window.sessionStorage
        .getItem(sessionKey(levelId, patternId, practiceId))
        ?.trim() || ""
    );
  } catch {
    return "";
  }
}

function getToneStyle(tone: SentencePatternTone): PatternToneStyle {
  const toneMap = {
    green: {
      "--pattern-accent": "#25bd80",
      "--pattern-accent-dark": "#0c9a69",
      "--pattern-soft": "#e9faf4",
      "--pattern-soft-strong": "#d8f6eb",
      "--pattern-glow": "rgba(37, 189, 128, 0.16)",
    },
    orange: {
      "--pattern-accent": "#ff8a1f",
      "--pattern-accent-dark": "#ec5f12",
      "--pattern-soft": "#fff3e8",
      "--pattern-soft-strong": "#ffe7d1",
      "--pattern-glow": "rgba(255, 138, 31, 0.18)",
    },
    purple: {
      "--pattern-accent": "#7657ff",
      "--pattern-accent-dark": "#6042e8",
      "--pattern-soft": "#f0ebff",
      "--pattern-soft-strong": "#e7ddff",
      "--pattern-glow": "rgba(118, 87, 255, 0.18)",
    },
  } satisfies Record<SentencePatternTone, PatternToneStyle>;

  return toneMap[tone];
}

function PatternIcon({
  className = "",
  icon,
}: {
  className?: string;
  icon: SentencePatternLevel["icon"];
}) {
  if (icon === "rocket") {
    return (
      <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
        <path d="M42 7c-9.6 2.2-17.4 9.2-23.1 21L8 28l8.2 5.7L14 47l13.1-3.1L33 56l.1-12.9C45 37.4 52 29.6 54 20l3-13H42Z" />
        <path d="M39 18a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z" />
        <path d="M15 45c-4 1.2-6.8 4-8.6 8.6 4.6-1.8 7.4-4.6 8.6-8.6Z" />
      </svg>
    );
  }

  if (icon === "trophy") {
    return (
      <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
        <path d="M19 10h26v8c0 11.5-5.5 20-13 20s-13-8.5-13-20v-8Z" />
        <path d="M19 15H8v5c0 7.5 5.5 13 13 13M45 15h11v5c0 7.5-5.5 13-13 13M32 38v9M22 54h20M27 47h10" />
        <path d="m32 16 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6-4.3-4.2 6-.9L32 16Z" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M31 50c0-17 1-30 20-37 1 18-8 30-20 37Z" />
      <path d="M32 50C30 32 21 23 9 22c-1 16 9 25 23 28ZM32 50V28" />
    </svg>
  );
}

function ChatBubbleArt({ levelId }: { levelId: SentencePatternLevel["id"] }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={styles.chatArt}
      draggable={false}
      height={275}
      sizes="160px"
      src={`/images/sentence-patterns/overview-${levelId}-art.png`}
      unoptimized
      width={298}
    />
  );
}

function ChevronIcon({ direction = "right" }: { direction?: "down" | "left" | "right" | "up" }) {
  const path =
    direction === "down"
      ? "m8 10 4 4 4-4"
      : direction === "left"
        ? "m15 5-7 7 7 7"
      : direction === "up"
        ? "m8 14 4-4 4 4"
        : "m10 7 5 5-5 5";

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function SentencePatternBottomHomeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sentence-pattern-bottom-home" x1="9" x2="39" y1="39" y2="8">
          <stop offset="0" stopColor="#5e79ff" />
          <stop offset="1" stopColor="#914cff" />
        </linearGradient>
      </defs>
      <path
        d="M8 21.6 24 8l16 13.6v16.2a4 4 0 0 1-4 4h-7.7V29.3h-8.6v12.5H12a4 4 0 0 1-4-4V21.6Z"
        fill="url(#sentence-pattern-bottom-home)"
      />
    </svg>
  );
}

function SentencePatternBottomProgressIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M12 34V21" />
      <path d="M20 34V12" />
      <path d="M28 34V17" />
      <path d="M36 34V9" />
    </svg>
  );
}

function SentencePatternBottomHelpIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 7.5c-9.4 0-17 6.4-17 14.3 0 4.7 2.7 8.9 6.9 11.5l-1.5 7.2 7.2-4.8c1.4.3 2.9.5 4.4.5 9.4 0 17-6.4 17-14.4S33.4 7.5 24 7.5Z" />
      <path d="M19.2 18.8a5.1 5.1 0 0 1 9.8 2.1c0 3.8-5 4.1-5 7.2" />
      <path d="M24 34.2h.1" />
    </svg>
  );
}

function SentencePatternBottomAccountIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="15.2" r="7.1" />
      <path d="M11.8 40c1.5-8 6-12 12.2-12s10.7 4 12.2 12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function StatIcon({
  type,
}: {
  type:
    | "book"
    | "bulb"
    | "chat"
    | "file"
    | "headphones"
    | "mic"
    | "car"
    | "plusChat"
    | "quote"
    | "speaker"
    | "star"
    | "target"
    | "utensils";
}) {
  if (type === "bulb") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M14 3.5a7.2 7.2 0 0 0-4.1 13.1c1 .7 1.7 1.8 1.7 3.1h4.8c0-1.3.7-2.4 1.7-3.1A7.2 7.2 0 0 0 14 3.5Z" />
        <path d="M11 23h6M12 26h4M5.5 12H3M25 12h-2.5M8 5.8 6.3 4.1M20 5.8l1.7-1.7" />
      </svg>
    );
  }
  if (type === "file") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M8 4h9l5 5v15H8V4Z" />
        <path d="M17 4v6h5M11 15h8M11 19h6" />
      </svg>
    );
  }
  if (type === "star") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="m14 4 3 6 6.7 1-4.8 4.7 1.1 6.6-6-3.2-6 3.2 1.1-6.6L4.3 11 11 10l3-6Z" />
      </svg>
    );
  }
  if (type === "book") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M5 6c4-1.3 7-.7 9 1.5V23c-2-2.2-5-2.8-9-1.5V6ZM14 7.5c2-2.2 5-2.8 9-1.5v15.5c-4-1.3-7-.7-9 1.5V7.5Z" />
      </svg>
    );
  }
  if (type === "mic") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <rect x="10" y="4" width="8" height="13" rx="4" />
        <path d="M6 15c0 4.4 3.6 7 8 7s8-2.6 8-7M14 22v3M10 25h8" />
      </svg>
    );
  }
  if (type === "headphones") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M5 16v-3a9 9 0 0 1 18 0v3" />
        <path d="M5 16a3 3 0 0 1 3-3h1v9H8a3 3 0 0 1-3-3v-3ZM23 16a3 3 0 0 0-3-3h-1v9h1a3 3 0 0 0 3-3v-3Z" />
      </svg>
    );
  }
  if (type === "utensils") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M8 4v8M4.8 4v7.2A3.2 3.2 0 0 0 8 14.4h0a3.2 3.2 0 0 0 3.2-3.2V4M8 14.5V25" />
        <path d="M19 4c2.2 2 3.4 5 3.4 8.5v.7H19V25" />
      </svg>
    );
  }
  if (type === "car") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="m6 14 2.2-6.2A3 3 0 0 1 11 5.8h6a3 3 0 0 1 2.8 2L22 14" />
        <path d="M5 14h18v8H5v-8ZM8 22v2M20 22v2M8.5 18h.1M19.5 18h.1" />
      </svg>
    );
  }
  if (type === "plusChat") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M5 11c0-4 3.6-7 9-7s9 3 9 7-3.6 7-9 7c-1.2 0-2.4-.2-3.4-.5L6 21v-6.1A6.8 6.8 0 0 1 5 11Z" />
        <path d="M14 8v7M10.5 11.5h7" />
      </svg>
    );
  }
  if (type === "quote") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M11 8c-3.2 1.6-5 4-5 7.2 0 2.7 1.8 4.8 4.2 4.8 2 0 3.5-1.4 3.5-3.4 0-1.9-1.4-3.2-3.3-3.2-.5 0-.9.1-1.3.2.4-1.6 1.5-2.9 3.2-4l-1.3-1.6ZM22 8c-3.2 1.6-5 4-5 7.2 0 2.7 1.8 4.8 4.2 4.8 2 0 3.5-1.4 3.5-3.4 0-1.9-1.4-3.2-3.3-3.2-.5 0-.9.1-1.3.2.4-1.6 1.5-2.9 3.2-4L22 8Z" />
      </svg>
    );
  }
  if (type === "speaker") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M4.5 11h5l8-6v18l-8-6h-5v-6Z" />
        <path d="M20.5 10.5c1.2 1.2 1.9 2.7 1.9 4.5s-.7 3.3-1.9 4.5M23 7.8c2.1 2 3.1 4.4 3.1 7.2S25.1 20.2 23 22.2" />
      </svg>
    );
  }
  if (type === "target") {
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="13" cy="15" r="8" />
        <circle cx="13" cy="15" r="4" />
        <path d="M13 15 24 4M18 4h6v6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <path d="M5 9c0-4 3.8-7 9-7s9 3 9 7-3.8 7-9 7c-1.1 0-2.2-.1-3.2-.4L6 19v-5.7A6.2 6.2 0 0 1 5 9Z" />
      <path d="M10 9h.1M14 9h.1M18 9h.1" />
    </svg>
  );
}

function normalizeSentencePatternProgress(
  payload: SentencePatternProgressApiPayload,
): SentencePatternProgressSnapshot {
  return payload.progress ?? payload.snapshot ?? payload.data ?? payload;
}

function SentencePatternHelpModal({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: "quote",
      title: "理解句型",
      text: "先看句型结构和中文意思，理解在什么场景下使用。",
    },
    {
      icon: "mic",
      title: "点击麦克风，录音练习",
      text: "看着中文提示，用英语说出句子，系统会录音并识别你的表达。",
    },
    {
      icon: "speaker",
      title: "查看反馈与推荐表达",
      text: "录音结束后，查看你的表达、推荐表达和更地道的表达方式。",
    },
    {
      icon: "star",
      title: "收藏与复习",
      text: "收藏重点句型，方便后续复习，加深记忆，灵活运用。",
    },
    {
      icon: "target",
      title: "持续练习，提升口语",
      text: "每天坚持练习，积累100个高频句型，让表达更自然、自信！",
    },
  ] as const;

  return (
    <div className={styles.patternHelpBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.patternHelpDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sentence-pattern-help-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.patternHelpClose}
          aria-label="关闭帮助"
          onClick={onClose}
        >
          ×
        </button>

        <header className={styles.patternHelpHeader}>
          <h2 id="sentence-pattern-help-title">100句句型学习指引</h2>
          <p>跟着步骤练习，高效掌握实用句型</p>
        </header>

        <div className={styles.patternHelpSteps}>
          {steps.map((step, index) => (
            <article className={styles.patternHelpStep} key={step.title}>
              <span className={styles.patternHelpStepIcon}>
                <StatIcon type={step.icon} />
              </span>
              {index < steps.length - 1 ? (
                <span className={styles.patternHelpStepArrow} aria-hidden="true">
                  <ChevronIcon direction="down" />
                </span>
              ) : null}
              <div className={styles.patternHelpStepCopy}>
                <div className={styles.patternHelpStepTitle}>
                  <span className={styles.patternHelpStepNumber}>{index + 1}</span>
                  <strong>{step.title}</strong>
                </div>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.patternHelpTip}>
          <div className={styles.patternHelpTipTitle}>
            <StatIcon type="bulb" />
            <strong>小贴士</strong>
          </div>
          <ul>
            <li>大胆开口，说错也没关系，练习是进步的关键！</li>
            <li>多听推荐表达，学习更地道的表达方式。</li>
            <li>重复练习，巩固记忆，让句型脱口而出！</li>
          </ul>
        </div>

        <button type="button" className={styles.patternHelpConfirm} onClick={onClose}>
          我知道了
        </button>
      </section>
    </div>
  );
}

function SentencePatternBottomNav() {
  const router = useRouter();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [progressSnapshot, setProgressSnapshot] =
    useState<SentencePatternProgressSnapshot | null>(null);

  const closeModals = () => {
    setIsHelpOpen(false);
    setIsProgressOpen(false);
  };

  useEffect(() => {
    if (!isProgressOpen) return;

    const controller = new AbortController();

    async function loadProgress() {
      setIsProgressLoading(true);
      setProgressError("");

      try {
        const response = await fetch("/api/ai-guided-expression/progress", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load progress");
        }

        const payload = (await response.json()) as SentencePatternProgressApiPayload;

        if (!controller.signal.aborted) {
          setProgressSnapshot(normalizeSentencePatternProgress(payload));
        }
      } catch {
        if (!controller.signal.aborted) {
          setProgressError("暂时无法读取后台学习进度，请稍后再试。");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsProgressLoading(false);
        }
      }
    }

    void loadProgress();

    return () => controller.abort();
  }, [isProgressOpen]);

  useEffect(() => {
    if (!isHelpOpen && !isProgressOpen) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsHelpOpen(false);
        setIsProgressOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHelpOpen, isProgressOpen]);

  const todayCompleted =
    progressSnapshot?.todayCompleted ?? progressSnapshot?.challenge?.completed ?? 0;
  const dailyGoal = progressSnapshot?.dailyGoal ?? progressSnapshot?.challenge?.goal ?? 5;
  const challengePercent =
    progressSnapshot?.challenge?.percent ??
    Math.min(100, Math.round((todayCompleted / Math.max(dailyGoal, 1)) * 100));
  const streakDays = progressSnapshot?.streakDays ?? 0;
  const totalCompleted = progressSnapshot?.totalCompleted ?? todayCompleted;

  return (
    <>
      <nav className={styles.patternBottomNav} aria-label="100句型学习导航">
        <button
          className={`${styles.patternBottomButton} ${styles.patternBottomButtonActive}`}
          type="button"
          aria-label="回到学习首页"
          onClick={() => router.push("/start")}
        >
          <SentencePatternBottomHomeIcon />
        </button>
        <button
          className={styles.patternBottomButton}
          type="button"
          aria-label="查看学习进度"
          aria-haspopup="dialog"
          aria-expanded={isProgressOpen}
          onClick={() => setIsProgressOpen(true)}
        >
          <SentencePatternBottomProgressIcon />
        </button>
        <button
          className={styles.patternBottomButton}
          type="button"
          aria-label="打开100句型学习帮助"
          aria-haspopup="dialog"
          aria-expanded={isHelpOpen}
          onClick={() => setIsHelpOpen(true)}
        >
          <SentencePatternBottomHelpIcon />
        </button>
        <button
          className={styles.patternBottomButton}
          type="button"
          aria-label="打开账户界面"
          onClick={() => router.push("/account")}
        >
          <SentencePatternBottomAccountIcon />
        </button>
      </nav>

      {isProgressOpen ? (
        <div className={styles.patternBottomModalBackdrop} onClick={closeModals}>
          <section
            className={styles.patternBottomModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sentence-pattern-progress-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={styles.patternBottomModalClose}
              type="button"
              aria-label="关闭学习进度"
              onClick={closeModals}
            >
              <CloseIcon />
            </button>
            <h2 id="sentence-pattern-progress-title">学习进度</h2>
            <p>进度会读取后台学习记录，和你的学习数据保持一致。</p>
            {isProgressLoading ? (
              <div className={styles.patternBottomModalStatus}>正在读取学习进度...</div>
            ) : progressError ? (
              <div className={styles.patternBottomModalStatus}>{progressError}</div>
            ) : (
              <div className={styles.patternBottomProgressGrid}>
                <span>
                  <strong>{todayCompleted}</strong>
                  <small>今日完成</small>
                </span>
                <span>
                  <strong>{challengePercent}%</strong>
                  <small>今日目标</small>
                </span>
                <span>
                  <strong>{streakDays}</strong>
                  <small>连续天数</small>
                </span>
                <span>
                  <strong>{totalCompleted}</strong>
                  <small>累计练习</small>
                </span>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isHelpOpen ? <SentencePatternHelpModal onClose={() => setIsHelpOpen(false)} /> : null}
    </>
  );
}

export function SentencePatternOverviewPage({
  levels,
}: {
  levels: SentencePatternLevel[];
}) {
  const totalPatterns = levels.reduce((sum, level) => sum + level.totalPatterns, 0);

  return (
    <main className={styles.page}>
      <section className={`${styles.phone} ${styles.overviewPhone}`}>
        <div className={styles.overviewHeader}>
          <div>
            <h1>100 个口语常用句型</h1>
            <p>掌握句型，开口更轻松</p>
          </div>
        </div>

        <div className={styles.overviewMeta}>
          <StatIcon type="star" />
          共 {totalPatterns}个句型 · 每个句型 20 个例句
        </div>

        <div className={styles.levelStack}>
          {levels.map((level) => (
            <Link
              className={styles.levelCard}
              data-tone={level.tone}
              href={`/sentence-patterns/${level.id}`}
              key={level.id}
              style={getToneStyle(level.tone)}
            >
              <span className={styles.levelBadge}>{level.badge}</span>
              <span className={styles.levelTitleRow}>
                <PatternIcon icon={level.icon} />
                <strong>{level.cardTitle}</strong>
              </span>
              <span className={styles.levelSubtitle}>{level.subtitle}</span>
              <span className={styles.levelCount}>
                {level.totalPatterns} 个句型 · {level.exampleCount} 个例句
              </span>
              <span className={styles.levelArt}>
                <ChatBubbleArt levelId={level.id} />
              </span>
              <span className={styles.cardChevron}>
                <ChevronIcon />
              </span>
            </Link>
          ))}
        </div>

        <div className={styles.tipCard}>
          <span className={styles.tipIcon}>
            <StatIcon type="bulb" />
          </span>
          <p>每个句型包含 20 个实用例句，跟读练习，加深记忆，建议按顺序学习，效果更佳！</p>
        </div>
        <SentencePatternBottomNav />
      </section>
    </main>
  );
}

export function SentencePatternLevelMenuPage({
  level,
}: {
  level: SentencePatternLevel;
}) {
  const [openSection, setOpenSection] = useState<{
    levelId: string;
    sectionId: string | null;
  }>(() => ({
    levelId: level.id,
    sectionId: null,
  }));
  const [showAllPatternsSectionId, setShowAllPatternsSectionId] = useState<
    string | null
  >(null);
  const openSectionId =
    openSection.levelId === level.id
      ? openSection.sectionId
      : null;

  return (
    <main className={styles.page} style={getToneStyle(level.tone)}>
      <section className={`${styles.phone} ${styles.levelPhone}`}>
        <header className={styles.levelHeader}>
          <Link href="/sentence-patterns" className={styles.roundBack} aria-label="返回一级菜单">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5 8 12l7 7" />
            </svg>
          </Link>
          <div className={styles.levelHeading}>
            <PatternIcon icon={level.icon} />
            <h1>{level.menuTitle}</h1>
            <p>{level.subtitle}</p>
          </div>
        </header>

        <div className={styles.statsBar}>
          <span>
            <StatIcon type="chat" />
            {level.totalPatterns} 个句型
          </span>
          <span>
            <StatIcon type="file" />
            {level.exampleCount} 个例句
          </span>
          <span>
            <StatIcon type="star" />
            {level.benefit}
          </span>
        </div>

        <div className={styles.sectionList}>
          {level.sections.map((section) => {
            const isOpen = openSectionId === section.id;
            const isShowingAllPatterns = showAllPatternsSectionId === section.id;
            const visiblePatterns =
              isOpen && isShowingAllPatterns
                ? section.patterns
                : section.patterns.slice(0, 5);
            const hiddenPatternCount = section.patterns.length - visiblePatterns.length;

            return (
              <section
                className={styles.patternSection}
                data-open={isOpen}
                key={section.id}
              >
                <button
                  aria-controls={`sentence-pattern-section-${section.id}`}
                  aria-expanded={isOpen}
                  className={styles.sectionTitle}
                  onClick={() => {
                    setOpenSection({
                      levelId: level.id,
                      sectionId: isOpen ? null : section.id,
                    });
                    setShowAllPatternsSectionId(null);
                  }}
                  type="button"
                >
                  <span>{section.range}</span>
                  <strong>
                    {section.title}
                    <small>（{section.englishTitle}）</small>
                  </strong>
                  <ChevronIcon direction={isOpen ? "up" : "down"} />
                </button>
                {isOpen ? (
                  <div
                    className={styles.patternRows}
                    id={`sentence-pattern-section-${section.id}`}
                  >
                    {visiblePatterns.map((pattern) => (
                      <Link
                        className={styles.patternRow}
                        href={`/sentence-patterns/${level.id}/${pattern.id}`}
                        key={pattern.id}
                      >
                        <span>{pattern.id}</span>
                        <strong>{pattern.text}</strong>
                        <ChevronIcon />
                      </Link>
                    ))}
                    {hiddenPatternCount > 0 ? (
                      <button
                        className={`${styles.patternRow} ${styles.morePatternRow}`}
                        onClick={() => setShowAllPatternsSectionId(section.id)}
                        type="button"
                      >
                        <span>...</span>
                        <strong>还有 {hiddenPatternCount} 个句型</strong>
                        <ChevronIcon />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <div className={styles.adviceCard}>
          <span>
            <StatIcon type="bulb" />
          </span>
          <strong>学习建议</strong>
          <p>{level.suggestion}</p>
          <ChevronIcon />
        </div>
      </section>
    </main>
  );
}

function getPractice(level: SentencePatternLevel, patternId: number, practiceId: number) {
  const pattern = level.sections.flatMap((section) => section.patterns).find((item) => item.id === patternId);
  const fallback: SentencePatternPractice = {
    chinese: "请用这个句型表达一个真实的生活想法。",
    id: 1,
    idiomatic: pattern?.text || "Try to say it in a more natural way.",
    natural: pattern?.text || "Try to say it naturally.",
    recommended: pattern?.text || "Use this sentence pattern to speak English.",
    simple: pattern?.text || "Say it simply.",
    targetEnglish: pattern?.text || "Use this sentence pattern to speak English.",
  };

  if (!pattern?.practices?.length) return { pattern, practice: fallback, practiceCount: 20 };

  const practice =
    pattern.practices.find((item) => item.id === practiceId) || pattern.practices[0];

  return { pattern, practice, practiceCount: pattern.practices.length };
}

function usePracticeId(max: number) {
  const searchParams = useSearchParams();
  const practiceParam = Number(searchParams.get("practice") || "1");
  if (!Number.isFinite(practiceParam)) return 1;
  return Math.min(Math.max(Math.floor(practiceParam), 1), Math.max(max, 1));
}

const NORMAL_READ_RATE = 0.92;
const SLOW_READ_RATE = 0.5;
const SENTENCE_PATTERN_TTS_VOICE_ID =
  SPEAKFLOW_VOICES[0]?.id || SPEAKFLOW_DEFAULT_VOICE_ID;

function speak(text: string, rate = NORMAL_READ_RATE) {
  void playSpeakFlowTts({
    rate,
    text,
    voiceId: SENTENCE_PATTERN_TTS_VOICE_ID,
  });
}

export function SentencePatternStudyPage({ level, patternId, section }: StudyProps) {
  const router = useRouter();
  const { pattern, practiceCount } = getPractice(level, patternId, 1);
  const practiceId = usePracticeId(practiceCount);
  const { practice } = getPractice(level, patternId, practiceId);
  const [isRecording, setIsRecording] = useState(false);
  const transcriptRef = useRef("");
  const baseTranscriptRef = useRef("");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const stopFallbackTimerRef = useRef<number | null>(null);
  const finishRecordingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const recordingSessionIdRef = useRef(0);
  const practiceSessionKeyRef = useRef(`${level.id}:${patternId}:${practiceId}`);
  const progress = Math.round((practiceId / practiceCount) * 100);
  const nextPractice = practiceId >= practiceCount ? practiceId : practiceId + 1;
  const previousPractice = practiceId <= 1 ? practiceId : practiceId - 1;
  const patterns = level.sections.flatMap((item) => item.patterns);
  const currentPatternIndex = patterns.findIndex((item) => item.id === patternId);
  const nextPattern = currentPatternIndex >= 0 ? patterns[currentPatternIndex + 1] : undefined;
  const nextPatternHref = nextPattern
    ? `/sentence-patterns/${level.id}/${nextPattern.id}`
    : `/sentence-patterns/${level.id}/${patternId}`;
  const completedPracticeCount = Math.max(practiceId - 1, 0);
  const remainingPracticeCount = Math.max(practiceCount - completedPracticeCount, 0);
  const completedProgress = Math.min(
    100,
    Math.round((completedPracticeCount / Math.max(practiceCount, 1)) * 100)
  );

  function clearStopFallbackTimer() {
    if (stopFallbackTimerRef.current === null) return;
    window.clearTimeout(stopFallbackTimerRef.current);
    stopFallbackTimerRef.current = null;
  }

  useEffect(() => {
    return () => {
      recordingSessionIdRef.current += 1;
      finishRecordingRef.current = true;
      stopRequestedRef.current = true;
      clearStopFallbackTimer();
      try {
        recognitionRef.current?.abort?.();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const practiceSessionKey = `${level.id}:${patternId}:${practiceId}`;
    if (practiceSessionKeyRef.current === practiceSessionKey) return;

    practiceSessionKeyRef.current = practiceSessionKey;
    recordingSessionIdRef.current += 1;
    finishRecordingRef.current = true;
    stopRequestedRef.current = true;
    transcriptRef.current = "";
    baseTranscriptRef.current = "";
    clearStopFallbackTimer();
    try {
      recognitionRef.current?.abort?.();
    } catch {}
    recognitionRef.current = null;
    const resetUiTimer = window.setTimeout(() => {
      setIsRecording(false);
    }, 0);

    return () => {
      window.clearTimeout(resetUiTimer);
    };
  }, [level.id, patternId, practiceId]);

  function finishRecording(transcript: string) {
    if (finishRecordingRef.current) return;
    finishRecordingRef.current = true;
    stopRequestedRef.current = true;
    clearStopFallbackTimer();
    recognitionRef.current = null;
    setIsRecording(false);

    const cleaned = transcript.trim() || practice.targetEnglish;
    try {
      window.sessionStorage.setItem(
        sessionKey(level.id, patternId, practiceId),
        cleaned
      );
    } catch {}
    router.push(`/sentence-patterns/${level.id}/${patternId}/result?practice=${practiceId}`);
  }

  function stopRecordingForFinalResult() {
    if (finishRecordingRef.current) {
      return;
    }

    stopRequestedRef.current = true;
    clearStopFallbackTimer();
    const recognition = recognitionRef.current;

    try {
      recognition?.stop();
    } catch {}

    finishRecording(transcriptRef.current);
  }

  function startRecording() {
    if (isRecording) {
      stopRecordingForFinalResult();
      return;
    }

    setIsRecording(true);
    transcriptRef.current = "";
    baseTranscriptRef.current = "";
    finishRecordingRef.current = false;
    stopRequestedRef.current = false;
    const recordingSessionId = recordingSessionIdRef.current + 1;
    recordingSessionIdRef.current = recordingSessionId;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      finishRecording(practice.targetEnglish);
      return;
    }

    const beginRecognition = () => {
      if (
        finishRecordingRef.current ||
        stopRequestedRef.current ||
        recordingSessionIdRef.current !== recordingSessionId
      ) {
        return;
      }

      const recognition = new Recognition();
      recognitionRef.current = recognition;
      const isCurrentRecognitionSession = () =>
        recordingSessionIdRef.current === recordingSessionId &&
        recognitionRef.current === recognition &&
        !finishRecordingRef.current;

      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onspeechstart = () => {
        if (!isCurrentRecognitionSession()) return;
      };

      recognition.onspeechend = () => {
        if (!isCurrentRecognitionSession()) return;
      };

      recognition.onresult = (event) => {
        if (!isCurrentRecognitionSession()) return;

        const text = Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join(" ")
          .trim();
        transcriptRef.current = [baseTranscriptRef.current, text]
          .filter(Boolean)
          .join(" ")
          .trim();
      };

      recognition.onerror = (event) => {
        if (!isCurrentRecognitionSession()) return;

        const errorName =
          "error" in event && typeof event.error === "string" ? event.error : "";

        if (stopRequestedRef.current) {
          return;
        }

        if (errorName === "not-allowed" || errorName === "service-not-allowed") {
          finishRecording(transcriptRef.current);
        }
      };

      recognition.onend = () => {
        if (!isCurrentRecognitionSession()) return;

        recognitionRef.current = null;
        if (finishRecordingRef.current) return;

        if (stopRequestedRef.current) {
          finishRecording(transcriptRef.current);
          return;
        }

        baseTranscriptRef.current = transcriptRef.current.trim();
        window.setTimeout(beginRecognition, RESTART_AFTER_NO_SPEECH_MS);
      };

      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
        if (!transcriptRef.current.trim()) {
          finishRecordingRef.current = true;
          stopRequestedRef.current = true;
          setIsRecording(false);
        }
      }
    };

    try {
      beginRecognition();
    } catch {
      finishRecording(practice.targetEnglish);
    }
  }

  return (
    <main className={styles.studyPage} style={getToneStyle(level.tone)}>
      <section className={`${styles.studyPhone} ${styles.studyPracticePhone}`}>
        <header className={styles.studyTopBar}>
          <Link
            href={`/sentence-patterns/${level.id}`}
            className={styles.studyBackButton}
            aria-label="返回100个句型二级菜单"
          >
            <ChevronIcon direction="left" />
          </Link>
          <Link
            href={`/sentence-patterns/${level.id}`}
            className={styles.studyCourseHeader}
            aria-label="返回当前句型菜单"
          >
            <span>
              <PatternIcon icon={level.icon} />
            </span>
            <strong>{level.menuTitle}</strong>
            <ChevronIcon />
            <small>{section.title}（{section.englishTitle}）</small>
          </Link>
          <span aria-hidden="true" />
        </header>

        <section className={styles.studyCard}>
          <div className={styles.studyTitleRow}>
            <span className={styles.practicePill}>{practiceId} / {practiceCount}</span>
            <h1>
              <InteractiveExpressionText
                sourceSentence={practice.targetEnglish}
                text={pattern?.text || practice.targetEnglish}
              />
            </h1>
            <Link
              href={nextPatternHref}
              aria-label="下一句型"
            >
              <ChevronIcon />
            </Link>
          </div>

          <div className={styles.progressRow}>
            <span>进度：第 {practiceId} / {practiceCount} 句</span>
            <strong>{progress}% 完成</strong>
          </div>
          <div className={styles.progressTrack}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className={styles.promptCard}>
            <span className={styles.quoteLeft}>“</span>
            <p>{practice.chinese}</p>
            <span className={styles.quoteRight}>”</span>
            <i className={styles.roomArt} aria-hidden="true" />
          </div>

          <div className={styles.promptTip}>
            <StatIcon type="star" />
            小贴士：看着中文，尝试用英语表达出来，提升你的口语流利度！
          </div>
        </section>

        <section className={styles.recordCard}>
          <p>
            <StatIcon type="mic" />
            {isRecording ? "正在录音，再次点击麦克风结束并进入下一步" : "点击麦克风，开始录制你的英文表达"}
          </p>
          <small>说完后请再次点击麦克风，系统才会进入下一页</small>
          <button
            type="button"
            className={styles.bigMic}
            data-recording={isRecording}
            onClick={startRecording}
            aria-label={isRecording ? "结束录音" : "开始录音"}
          >
            <StatIcon type="mic" />
          </button>
          <Link
            href={`/sentence-patterns/${level.id}/${patternId}?practice=${previousPractice}`}
            className={styles.prevButton}
          >
            ← 上一句
          </Link>
          <Link
            href={`/sentence-patterns/${level.id}/${patternId}?practice=${nextPractice}`}
            className={styles.skipButton}
          >
            跳过 →
          </Link>
        </section>

        <div className={styles.bottomTip}>
          <span>
            <StatIcon type="star" />
          </span>
          <strong>学习小贴士</strong>
          <p>大胆开口，不用担心语法错误，先表达出来才是进步的第一步！</p>
        </div>

        <div className={styles.studyBottomProgress} aria-label="句型学习进度">
          <span>已完成 {completedPracticeCount} 句</span>
          <span className={styles.studyBottomTrack}>
            <i style={{ width: `${completedProgress}%` }} />
          </span>
          <span className={styles.studyBottomRemaining}>
            <StatIcon type="target" />
            还剩 {remainingPracticeCount} 句
          </span>
        </div>
        <SentencePatternBottomNav />
      </section>
    </main>
  );
}

export function SentencePatternResultPage({ level, patternId }: StudyProps) {
  const searchParams = useSearchParams();
  const practiceParam = Number(searchParams.get("practice") || "1");
  const practiceId = Number.isFinite(practiceParam)
    ? Math.max(1, Math.floor(practiceParam))
    : 1;
  const { pattern, practice, practiceCount } = getPractice(level, patternId, practiceId);
  const userExpression =
    readSavedTranscript(level.id, patternId, practiceId) ||
    practice.targetEnglish;
  const nextPractice = practiceId >= practiceCount ? practiceId : practiceId + 1;
  const previousPractice = practiceId <= 1 ? practiceId : practiceId - 1;
  const progress = Math.round((practiceId / practiceCount) * 100);
  const patterns = level.sections.flatMap((item) => item.patterns);
  const currentPatternIndex = patterns.findIndex((item) => item.id === patternId);
  const nextPattern = currentPatternIndex >= 0 ? patterns[currentPatternIndex + 1] : undefined;
  const nextPatternHref = nextPattern
    ? `/sentence-patterns/${level.id}/${nextPattern.id}`
    : `/sentence-patterns/${level.id}/${patternId}`;

  const variants = [
    {
      audioKey: "recommended",
      icon: "star",
      label: "推荐表达",
      text: practice.recommended,
      tone: "featured",
    },
    {
      audioKey: "idiomatic",
      icon: "utensils",
      label: "更地道",
      text: practice.idiomatic,
      tone: "orange",
    },
    {
      audioKey: "simple",
      icon: "car",
      label: "更简单",
      text: practice.simple,
      tone: "blue",
    },
    {
      audioKey: "natural",
      icon: "plusChat",
      label: "更自然",
      text: practice.natural,
      tone: "green",
    },
  ] as const;

  function playPatternAudio(text: string, rate = NORMAL_READ_RATE) {
    speak(text, rate);
  }

  useEffect(() => {
    return () => {
      stopSpeakFlowTts();
    };
  }, []);

  return (
    <main className={styles.studyPage} style={getToneStyle(level.tone)}>
      <section className={styles.studyPhone}>
        <section className={styles.resultIntro}>
          <div className={styles.resultTopRow}>
            <Link
              href={`/sentence-patterns/${level.id}/${patternId}?practice=${practiceId}`}
              className={styles.resultBackButton}
              aria-label="返回上一页"
            >
              <ChevronIcon direction="left" />
            </Link>
            <h1>
              <InteractiveExpressionText
                sourceSentence={practice.targetEnglish}
                text={pattern?.text || practice.targetEnglish}
              />
            </h1>
            <Link
              href={nextPatternHref}
              className={styles.resultNextButton}
              aria-label="下一句型"
            >
              <ChevronIcon />
            </Link>
          </div>
          <div className={styles.progressRow}>
            <span>进度：第 {practiceId} / {practiceCount} 句</span>
            <strong>{progress}% 完成</strong>
          </div>
          <div className={styles.progressTrack}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </section>

        <section className={styles.expressionStack}>
          <div
            aria-label="播放你的表达"
            className={styles.userExpression}
            onClick={(event) => playFromCardClick(event, () => speak(userExpression))}
            onKeyDown={(event) => playFromCardKey(event, () => speak(userExpression))}
            role="button"
            tabIndex={0}
          >
            <span className={styles.expressionLabel}>
              <StatIcon type="mic" />
              你的表达
            </span>
            <p>
              <InteractiveExpressionText
                sourceSentence={practice.chinese}
                text={userExpression}
              />
            </p>
            <button type="button" onClick={() => speak(userExpression)} aria-label="播放你的表达">
              <StatIcon type="speaker" />
            </button>
            <small>点击播放你的录音</small>
          </div>

          {variants.map((variant) => (
            <article
              aria-label={`播放${variant.label}`}
              className={styles.variantCard}
              data-tone={variant.tone}
              key={variant.label}
              onClick={(event) =>
                playFromCardClick(event, () => playPatternAudio(variant.text))
              }
              onKeyDown={(event) =>
                playFromCardKey(event, () => playPatternAudio(variant.text))
              }
              role="button"
              tabIndex={0}
            >
              <span className={styles.variantIcon}>
                <StatIcon type={variant.icon} />
              </span>
              <div>
                <strong>{variant.label}</strong>
                <p>
                  <InteractiveExpressionText
                    sourceSentence={practice.chinese}
                    text={variant.text}
                  />
                </p>
              </div>
              <button
                type="button"
                onClick={() => playPatternAudio(variant.text)}
                aria-label={`播放${variant.label}`}
              >
                <StatIcon type="speaker" />
              </button>
            </article>
          ))}
        </section>

        <section className={styles.followCard} aria-label="句型练习底部操作栏">
          <Link
            href={`/sentence-patterns/${level.id}/${patternId}?practice=${previousPractice}`}
            className={styles.prevButton}
          >
            <ChevronIcon direction="left" />
            <span>上一句</span>
          </Link>
          <button
            type="button"
            className={styles.slowReadButton}
            onClick={() => playPatternAudio(practice.recommended, SLOW_READ_RATE)}
          >
            <StatIcon type="headphones" />
            <span>慢速朗读</span>
          </button>
          <Link
            href={`/sentence-patterns/${level.id}/${patternId}?practice=${nextPractice}`}
            className={styles.skipButton}
          >
            <span>下一句</span>
            <ChevronIcon />
          </Link>
        </section>
        <SentencePatternBottomNav />
      </section>
    </main>
  );
}
