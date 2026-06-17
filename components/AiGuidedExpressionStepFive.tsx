"use client";

import { useEffect, useState, type ReactNode } from "react";
import AiGuidedExpressionHelpModal from "@/components/AiGuidedExpressionHelpModal";
import { FREE_PRACTICE_DAILY_LIMIT } from "@/lib/freePracticeLimit";

type AiGuidedExpressionStepFiveProps = {
  userEnglishText: string;
  nextChineseText: string;
  isLoadingNextChinese?: boolean;
  expressions: string[];
  selectedExpressionIndex: number;
  hasProEntitlement?: boolean;
  menuLabel?: string;
  onMenuClick: () => void;
  onRetryEnglish: () => void;
  onUseNextChinese: () => void;
  onChangeNextChinese: () => void;
  onAccountClick: () => void;
  onPlayExpression: (index: number, rate?: number) => void;
  onSelectExpression: (index: number) => void;
  renderExpressionText?: (
    text: string,
    index: number,
    tone: string
  ) => ReactNode;
  renderUserExpressionText?: (text: string) => ReactNode;
};

type AiGuidedProgressStepId =
  | "native"
  | "english"
  | "suggestions"
  | "follow";

type AiGuidedProgressStepStatus = "active" | "completed" | "locked";

type AiGuidedProgressSnapshot = {
  challenge?: {
    completed?: number;
    goal?: number;
    percent?: number;
  };
  dailyGoal?: number;
  level?: number;
  steps?: Partial<
    Record<
      AiGuidedProgressStepId,
      {
        id?: AiGuidedProgressStepId;
        label?: string;
        status?: AiGuidedProgressStepStatus;
      }
    >
  >;
  streakDays?: number;
  todayCompleted?: number;
  totalCompleted?: number;
};

const COPY = {
  change: "换一句",
  changeAria: "换一句新的中文建议",
  loadingNext: "正在为你准备下一句...",
  menuLabel: "回到学习首页",
  nextFallback: "那我们休息一下，过会儿再去散步吧。",
  nextTitle: "下一句，可以这样说",
  pageLabel: "AI引导表达结果页",
  playAria: "播放这句表达",
  records: "表达训练记录",
  retry: "重新说",
  retryAria: "回到第四页重新录制英语",
  seeMore: "向下查看更多表达",
  useNext: "用这句练习",
  useNextAria: "用这句中文进入第四页练习",
  userExpression: "你的表达",
} as const;

const progressStepOrder: Array<{
  id: AiGuidedProgressStepId;
  fallbackLabel: string;
}> = [
  { id: "native", fallbackLabel: "说中文" },
  { id: "english", fallbackLabel: "试着说英文" },
  { id: "suggestions", fallbackLabel: "AI 给你表达" },
  { id: "follow", fallbackLabel: "继续下一句" },
];

const progressStatusCopy: Record<AiGuidedProgressStepStatus, string> = {
  active: "进行中",
  completed: "已完成",
  locked: "待练习",
};

const pendingExpressionText = "This sentence is still being prepared.";

const expressionMeta = [
  {
    badge: "最自然地道",
    icon: "bookmark",
    tone: "violet",
  },
  {
    badge: "更地道",
    icon: "leaf",
    tone: "green",
  },
  {
    badge: "更简单",
    icon: "feather",
    tone: "blue",
  },
  {
    badge: "更口语",
    icon: "chat",
    tone: "purple",
  },
] as const;

function SparklesGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 36 36">
      <path
        d="M17 5.8 20.3 15l9.2 3.3-9.2 3.3L17 30.8l-3.3-9.2-9.2-3.3 9.2-3.3L17 5.8Z"
        fill="currentColor"
      />
      <path
        d="m28.4 4.8 1.3 3.4 3.4 1.3-3.4 1.3-1.3 3.4-1.3-3.4-3.4-1.3 3.4-1.3 1.3-3.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WaveGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 36 36">
      <path
        d="M7 16v4M12.5 11v14M18 7v22M23.5 11v14M29 16v4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.4"
      />
    </svg>
  );
}

function RefreshGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M7 18H4v-3M17 6h3v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MicGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 44 44">
      <path
        d="M22 6.8a6.9 6.9 0 0 0-6.9 6.9v9A6.9 6.9 0 0 0 22 29.6a6.9 6.9 0 0 0 6.9-6.9v-9A6.9 6.9 0 0 0 22 6.8Z"
        fill="currentColor"
      />
      <path
        d="M11 21.5a11 11 0 0 0 22 0M22 32.6v5.8M17 38.4h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path d="M11.2 8.4v15.2L22.8 16 11.2 8.4Z" fill="currentColor" />
    </svg>
  );
}

function LeafGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 36 36">
      <path
        d="M18.6 5.2c5.4 4 7.5 9.2 6 15.4-3.8-.6-6.4-2.4-7.8-5.3-1.4 3-3.8 5-7.2 6.1-1.2-6.2 1.8-11.6 9-16.2Z"
        fill="currentColor"
      />
      <path
        d="M17 18.2v11M17 23c2.1-1.3 3.9-3.1 5.1-5.4M17 23.8c-2-1.1-3.6-2.6-4.7-4.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function FeatherGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 36 36">
      <path
        d="M20.3 5.5c5.4 4.1 7.3 9.2 5.8 15.4-3.6-.5-6-2.3-7.3-5.2-1.3 2.8-3.4 4.8-6.4 5.9-1.4-6.2 1.2-11.5 7.9-16.1Z"
        fill="currentColor"
      />
      <path
        d="M18 17.4v11M18 21.1c1.6-.8 3-2 4.2-3.6M18 22.4c-1.6-.7-2.9-1.8-3.9-3.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 36 36">
      <path
        d="M18 7.5c-6.4 0-11.5 4.3-11.5 9.7 0 3.1 1.7 5.8 4.4 7.5L10 29l4.5-2.4c1.1.3 2.3.4 3.5.4 6.4 0 11.5-4.4 11.5-9.8S24.4 7.5 18 7.5Z"
        fill="currentColor"
      />
      <circle cx="13.8" cy="17.5" fill="white" opacity="0.86" r="1.25" />
      <circle cx="18" cy="17.5" fill="white" opacity="0.86" r="1.25" />
      <circle cx="22.2" cy="17.5" fill="white" opacity="0.86" r="1.25" />
    </svg>
  );
}

function BottomHomeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient
          id="sf-ai-step-five-bottom-home-gradient"
          x1="9"
          x2="39"
          y1="39"
          y2="8"
        >
          <stop offset="0" stopColor="#5e79ff" />
          <stop offset="1" stopColor="#914cff" />
        </linearGradient>
      </defs>
      <path
        d="M8 21.6 24 8l16 13.6v16.2a4 4 0 0 1-4 4h-7.7V29.3h-8.6v12.5H12a4 4 0 0 1-4-4V21.6Z"
        fill="url(#sf-ai-step-five-bottom-home-gradient)"
      />
    </svg>
  );
}

function BottomProgressIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M12 34V21" />
      <path d="M20 34V12" />
      <path d="M28 34V17" />
      <path d="M36 34V9" />
    </svg>
  );
}

function BottomHelpIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 7.5c-9.4 0-17 6.4-17 14.3 0 4.7 2.7 8.9 6.9 11.5l-1.5 7.2 7.2-4.8c1.4.3 2.9.5 4.4.5 9.4 0 17-6.4 17-14.4S33.4 7.5 24 7.5Z" />
      <path d="M19.2 18.8a5.1 5.1 0 0 1 9.8 2.1c0 3.8-5 4.1-5 7.2" />
      <path d="M24 34.2h.1" />
    </svg>
  );
}

function BottomAccountIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="15.2" r="7.1" />
      <path d="M11.8 40c1.5-8 6-12 12.2-12s10.7 4 12.2 12" />
    </svg>
  );
}

function ChevronDownGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function ExpressionIcon({ name }: { name: (typeof expressionMeta)[number]["icon"] }) {
  if (name === "leaf") return <LeafGlyph />;
  if (name === "feather") return <FeatherGlyph />;
  if (name === "chat") return <ChatGlyph />;

  return (
    <span className="sf-ai-guided-step-five-bookmark" aria-hidden="true">
      <span />
    </span>
  );
}

function renderExpressionText(text: string, tone: string) {
  const normalized = text.trim() || "Preparing a better expression.";
  const match = normalized.match(/^(.*?)([A-Za-z]+(?:\s+[A-Za-z]+)?)([.!?]*)$/);

  if (!match) return normalized;

  return (
    <>
      {match[1]}
      <span className={`sf-ai-guided-step-five-emphasis is-${tone}`}>
        {match[2]}
      </span>
      {match[3]}
    </>
  );
}

function formatUserExpressionDisplay(text: string) {
  let normalized = text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\bim\b/gi, "I'm")
    .replace(/\bi\b/g, "I");

  if (!normalized) return "";

  normalized = normalized.replace(
    /\s+(Do|Does|Did|Can|Could|Would|Will|Are|Is|Have|Has|Should|May|Might|Must)\b/g,
    (match: string, starter: string, offset: number, fullText: string) => {
      const previous = fullText.slice(0, offset).trim();
      const previousWord = previous.split(/\s+/).at(-1) || "";

      if (!previous || /[.!?]$/.test(previous)) return match;
      if (/^(I|You|We|They|He|She|It)$/i.test(previousWord)) return match;

      return `. ${starter}`;
    }
  );

  normalized = normalized.replace(
    /\b(Do you [^.!?]*?)\s+(please tell me|let me know)\b/gi,
    (_match: string, question: string, closer: string) => `${question}? ${closer}`
  );

  normalized = normalized.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_match: string, prefix: string, letter: string) =>
      `${prefix}${letter.toUpperCase()}`
  );

  if (!/[.!?]$/.test(normalized)) normalized += ".";

  return normalized;
}

export default function AiGuidedExpressionStepFive({
  userEnglishText,
  nextChineseText,
  isLoadingNextChinese = false,
  expressions,
  selectedExpressionIndex,
  hasProEntitlement = false,
  menuLabel = COPY.menuLabel,
  onMenuClick,
  onRetryEnglish,
  onUseNextChinese,
  onChangeNextChinese,
  onAccountClick,
  onPlayExpression,
  onSelectExpression,
  renderExpressionText: renderInteractiveExpressionText,
  renderUserExpressionText,
}: AiGuidedExpressionStepFiveProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [progressSnapshot, setProgressSnapshot] =
    useState<AiGuidedProgressSnapshot | null>(null);

  const displayEnglish =
    formatUserExpressionDisplay(userEnglishText) || "I'm practicing this sentence.";
  const displayNextChinese =
    nextChineseText.trim() || (isLoadingNextChinese ? COPY.loadingNext : COPY.nextFallback);
  const safeExpressions =
    expressions.length > 0
      ? expressions.map((expression) => expression.trim() || pendingExpressionText)
      : [pendingExpressionText];

  useEffect(() => {
    if (!isProgressOpen) return;

    let isActive = true;

    async function loadProgress() {
      setIsProgressLoading(true);
      setProgressError("");

      try {
        const response = await fetch("/api/ai-guided-expression/progress", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          throw new Error("Progress request failed");
        }

        const snapshot = (await response.json()) as AiGuidedProgressSnapshot;
        if (isActive) {
          setProgressSnapshot(snapshot);
        }
      } catch {
        if (isActive) {
          setProgressError("学习进度暂时没有同步成功，请稍后再试。");
        }
      } finally {
        if (isActive) {
          setIsProgressLoading(false);
        }
      }
    }

    void loadProgress();

    return () => {
      isActive = false;
    };
  }, [isProgressOpen]);

  useEffect(() => {
    const resetScroll = () => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      [
        document.scrollingElement,
        document.querySelector(".sf-speak-page"),
        document.querySelector(".sf-speak-phone"),
        document.querySelector(".sf-ai-guided-step-five-scroll"),
      ].forEach((target) => {
        if (target instanceof HTMLElement) {
          target.scrollTop = 0;
          target.scrollLeft = 0;
        }
      });
    };

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function openProgress() {
    setIsProgressLoading(true);
    setIsProgressOpen(true);
  }

  const todayCompleted = progressSnapshot?.todayCompleted ?? 0;
  const dailyGoal = progressSnapshot?.dailyGoal ?? FREE_PRACTICE_DAILY_LIMIT;
  const streakDays = progressSnapshot?.streakDays ?? 0;
  const totalCompleted = progressSnapshot?.totalCompleted ?? 0;
  const challengeCompleted = progressSnapshot?.challenge?.completed ?? 0;
  const challengeGoal = progressSnapshot?.challenge?.goal ?? dailyGoal;
  const challengePercent = Math.max(
    0,
    Math.min(100, Math.round(progressSnapshot?.challenge?.percent ?? 0))
  );

  return (
    <section
      className={`sf-ai-guided-step-five ${isHelpOpen ? "is-help-open" : ""} ${
        isProgressOpen ? "is-progress-open" : ""
      }`}
      aria-label={COPY.pageLabel}
    >
      <style>{`
        .sf-ai-guided-step-five,
        .sf-ai-guided-step-five * {
          box-sizing: border-box;
        }

        .sf-speak-page:has(.sf-ai-guided-step-five) {
          height: 100dvh !important;
          min-height: 100dvh !important;
          overflow: hidden !important;
          background:
            radial-gradient(circle at 18% 4%, rgba(222, 244, 255, 0.9), transparent 30%),
            radial-gradient(circle at 90% 2%, rgba(235, 229, 255, 0.82), transparent 29%),
            linear-gradient(180deg, #eef8ff 0%, #f8fbff 48%, #edf5ff 100%) !important;
        }

        .sf-speak-page:has(.sf-ai-guided-step-five) > div {
          width: 100vw !important;
          max-width: none !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          align-items: stretch !important;
          justify-content: center !important;
          padding: 0 !important;
        }

        .sf-speak-page:has(.sf-ai-guided-step-five) .sf-speak-phone {
          width: min(100vw, 430px) !important;
          max-width: 430px !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          overflow: hidden !important;
          box-shadow: none !important;
        }

        .sf-speak-page:has(.sf-ai-guided-step-five) .sf-speak-phone::before,
        .sf-speak-page:has(.sf-ai-guided-step-five) .sf-speak-phone::after,
        .sf-speak-page:has(.sf-ai-guided-step-five) .sf-speak-phone > .pointer-events-none {
          display: none !important;
        }

        .sf-ai-guided-step-five {
          position: fixed;
          inset: 0;
          z-index: 900;
          width: 100%;
          height: 100dvh;
          overflow: hidden;
          color: #08143f;
          background:
            radial-gradient(circle at 18% 12%, rgba(222, 244, 255, 0.82), transparent 34%),
            radial-gradient(circle at 82% 42%, rgba(235, 231, 255, 0.72), transparent 35%),
            linear-gradient(180deg, #eef8ff 0%, #f8fbff 48%, #f3f8ff 100%);
          font-family: var(--sf-font-zh, "PingFang SC", "Microsoft YaHei", sans-serif);
          -webkit-font-smoothing: antialiased;
        }

        .sf-ai-guided-step-five-frame {
          position: relative;
          isolation: isolate;
          display: flex;
          width: min(100%, 430px);
          height: 100%;
          min-height: 100%;
          margin: 0 auto;
          flex-direction: column;
          overflow: hidden;
          padding: calc(env(safe-area-inset-top, 0px) + clamp(0.42rem, 1.4dvh, 0.74rem))
            clamp(0.92rem, 4.6vw, 1.24rem)
            calc(env(safe-area-inset-bottom, 0px) + 6.15rem);
        }

        .sf-ai-guided-step-five-header {
          display: grid;
          grid-template-columns: clamp(2.45rem, 11vw, 3rem) minmax(0, 1fr) clamp(2.45rem, 11vw, 3rem);
          align-items: center;
          gap: clamp(0.5rem, 2.2vw, 0.7rem);
          min-height: clamp(2.9rem, 12.6vw, 3.58rem);
          flex: 0 0 auto;
        }

        .sf-ai-guided-step-five-menu,
        .sf-ai-guided-step-five-help-button {
          display: grid;
          width: clamp(2.45rem, 11vw, 3rem);
          height: clamp(2.45rem, 11vw, 3rem);
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          color: #11162f;
          box-shadow:
            0 14px 28px rgba(67, 101, 176, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          cursor: pointer;
          transition: transform 160ms ease;
        }

        .sf-ai-guided-step-five-menu:active,
        .sf-ai-guided-step-five-help-button:active,
        .sf-ai-guided-step-five-retry:active,
        .sf-ai-guided-step-five-use-next:active,
        .sf-ai-guided-step-five-change:active,
        .sf-ai-guided-step-five-play:active,
        .sf-ai-guided-step-five-slow-button:active,
        .sf-ai-guided-step-five-bottom-button:active {
          transform: scale(0.97);
        }

        .sf-ai-guided-step-five-menu:focus-visible,
        .sf-ai-guided-step-five-help-button:focus-visible,
        .sf-ai-guided-step-five-retry:focus-visible,
        .sf-ai-guided-step-five-use-next:focus-visible,
        .sf-ai-guided-step-five-change:focus-visible,
        .sf-ai-guided-step-five-play:focus-visible,
        .sf-ai-guided-step-five-slow-button:focus-visible,
        .sf-ai-guided-step-five-bottom-button:focus-visible,
        .sf-ai-guided-step-five-progress-close:focus-visible {
          outline: 3px solid rgba(61, 115, 255, 0.36);
          outline-offset: 4px;
        }

        .sf-ai-guided-step-five-menu .sf-home-menu-icon,
        .sf-ai-guided-step-five-menu .sf-home-menu-icon svg {
          width: 58%;
          height: 58%;
        }

        .sf-ai-guided-step-five-menu .sf-home-menu-icon svg {
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2.8;
        }

        .sf-ai-guided-step-five-help-button {
          justify-self: end;
          font-size: 1.42rem;
          font-weight: 950;
          line-height: 1;
        }

        .sf-ai-guided-step-five-brand {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          gap: clamp(0.38rem, 1.8vw, 0.54rem);
          transform: translateY(-0.04rem);
        }

        .sf-ai-guided-step-five-logo {
          display: grid;
          width: clamp(1.9rem, 8.8vw, 2.35rem);
          height: clamp(1.9rem, 8.8vw, 2.35rem);
          flex: 0 0 auto;
          place-items: center;
          border-radius: 999px;
        }

        .sf-ai-guided-step-five-logo-mark {
          width: 100%;
          height: 100%;
        }

        .sf-ai-guided-step-five-brand-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .sf-ai-guided-step-five-brand-title {
          color: #08133f;
          font-size: clamp(1.12rem, 5vw, 1.48rem);
          font-weight: 1000;
          letter-spacing: 0;
          line-height: 0.94;
          white-space: nowrap;
        }

        .sf-ai-guided-step-five-brand-subtitle {
          margin-top: 0.2rem;
          color: #0f66ff !important;
          font-size: clamp(0.42rem, 2vw, 0.58rem);
          font-weight: 900;
          letter-spacing: 0.16em;
          line-height: 1;
          white-space: nowrap;
        }

        .sf-ai-guided-step-five-scroll {
          flex: 1 1 auto;
          min-height: 0;
          overflow-x: hidden;
          overflow-y: auto;
          padding: clamp(0.22rem, 1.1dvh, 0.5rem) 0 1.05rem;
          scrollbar-width: none;
        }

        .sf-ai-guided-step-five-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .sf-ai-guided-step-five-user-card,
        .sf-ai-guided-step-five-next-card,
        .sf-ai-guided-step-five-record-card {
          border: 1px solid rgba(206, 222, 252, 0.9);
          background:
            radial-gradient(circle at 16% 0%, rgba(255, 255, 255, 0.98), transparent 35%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 252, 255, 0.88));
          box-shadow:
            0 20px 48px rgba(67, 101, 176, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.96);
        }

        .sf-ai-guided-step-five-user-card {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 0.7rem;
          align-items: start;
          min-height: clamp(6.65rem, 18dvh, 8.55rem);
          border-radius: clamp(1rem, 5vw, 1.35rem);
          padding: clamp(0.9rem, 3.6vw, 1.1rem) clamp(1.05rem, 4.8vw, 1.35rem) clamp(0.96rem, 4.1vw, 1.16rem);
        }

        .sf-ai-guided-step-five-card-heading {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          color: #0568ff;
          font-size: clamp(0.84rem, 3.8vw, 1.02rem);
          font-weight: 900;
          line-height: 1.1;
        }

        .sf-ai-guided-step-five-mini-wave {
          display: inline-grid;
          width: 1.45rem;
          height: 1.45rem;
          place-items: center;
          color: #0f66ff;
        }

        .sf-ai-guided-step-five-mini-wave svg {
          width: 100%;
          height: 100%;
        }

        .sf-ai-guided-step-five-user-text {
          min-width: 0;
          margin: 0;
          max-width: min(100%, 22rem);
          color: #07113f;
          font-size: clamp(2.25rem, 10.4vw, 3.75rem);
          font-weight: 950;
          letter-spacing: 0;
          line-height: 1.02;
          overflow-wrap: anywhere;
          text-wrap: balance;
        }

        .sf-ai-guided-step-five-retry {
          position: absolute;
          top: clamp(0.76rem, 3.4vw, 1rem);
          right: clamp(0.76rem, 3.4vw, 1rem);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          min-width: clamp(5.6rem, 24vw, 6.75rem);
          min-height: clamp(2.55rem, 11vw, 3.15rem);
          border: 0;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.88);
          color: #075fff;
          font-size: clamp(0.82rem, 3.6vw, 1rem);
          font-weight: 850;
          box-shadow:
            0 14px 28px rgba(67, 101, 176, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          cursor: pointer;
        }

        .sf-ai-guided-step-five-retry svg,
        .sf-ai-guided-step-five-use-next svg,
        .sf-ai-guided-step-five-change svg {
          width: 1.25rem;
          height: 1.25rem;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2.4;
        }

        .sf-ai-guided-step-five-next-card {
          position: relative;
          min-height: clamp(12.6rem, 29dvh, 14.7rem);
          margin-top: clamp(0.72rem, 2.8dvh, 0.94rem);
          border-radius: clamp(1rem, 5vw, 1.35rem);
          padding: clamp(1.05rem, 4.2vw, 1.35rem) clamp(1rem, 4.5vw, 1.28rem) clamp(1rem, 4vw, 1.18rem);
          overflow: hidden;
        }

        .sf-ai-guided-step-five-next-card h2 {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          margin: 0;
          color: #0d66ff;
          font-size: clamp(0.9rem, 4vw, 1.08rem);
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1.16;
        }

        .sf-ai-guided-step-five-next-card h2 svg {
          width: 1.25rem;
          height: 1.25rem;
          color: #0d66ff;
        }

        .sf-ai-guided-step-five-next-text {
          position: relative;
          z-index: 1;
          width: min(68%, 15.4rem);
          margin: clamp(1.05rem, 4.2vw, 1.32rem) 0 0;
          color: #07113f;
          font-size: clamp(1.92rem, 8.9vw, 3rem);
          font-weight: 950;
          letter-spacing: 0;
          line-height: 1.22;
          overflow-wrap: anywhere;
        }

        .sf-ai-guided-step-five-next-robot {
          position: absolute;
          right: clamp(0.88rem, 4.2vw, 1.2rem);
          top: clamp(2.88rem, 10vw, 3.45rem);
          width: clamp(5.15rem, 26vw, 6.85rem);
          height: clamp(5.15rem, 26vw, 6.85rem);
          filter: drop-shadow(0 1rem 1.4rem rgba(46, 103, 211, 0.18));
        }

        .sf-ai-guided-step-five-next-robot img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .sf-ai-guided-step-five-next-actions {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
          gap: clamp(0.64rem, 3vw, 0.84rem);
          margin-top: clamp(1rem, 4vw, 1.22rem);
        }

        .sf-ai-guided-step-five-use-next,
        .sf-ai-guided-step-five-change {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          min-height: clamp(2.86rem, 12.5vw, 3.55rem);
          border: 0;
          border-radius: 1rem;
          font-size: clamp(0.9rem, 4vw, 1.05rem);
          font-weight: 900;
          cursor: pointer;
        }

        .sf-ai-guided-step-five-use-next {
          background: linear-gradient(135deg, #35b8ff 0%, #155dff 100%);
          color: #fff !important;
          box-shadow: 0 16px 30px rgba(33, 103, 255, 0.22);
        }

        .sf-ai-guided-step-five-change {
          background: rgba(255, 255, 255, 0.9);
          color: #075fff;
          box-shadow:
            0 14px 28px rgba(67, 101, 176, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
        }

        .sf-ai-guided-step-five-use-next:disabled,
        .sf-ai-guided-step-five-change:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }

        .sf-ai-guided-step-five-records {
          margin-top: clamp(0.84rem, 3.1dvh, 1.04rem);
        }

        .sf-ai-guided-step-five-records > h2 {
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr);
          align-items: center;
          gap: 0.58rem;
          margin: 0 0 0.7rem;
          color: #176cff;
          font-size: clamp(0.92rem, 4vw, 1.08rem);
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1.1;
        }

        .sf-ai-guided-step-five-records > h2::after {
          content: "";
          display: block;
          height: 1px;
          background: rgba(105, 135, 190, 0.28);
        }

        .sf-ai-guided-step-five-records > h2 svg {
          width: 1.3rem;
          height: 1.3rem;
        }

        .sf-ai-guided-step-five-record-list {
          display: grid;
          gap: clamp(0.48rem, 2.1vw, 0.6rem);
        }

        .sf-ai-guided-step-five-record-card {
          display: grid;
          grid-template-columns: clamp(3.1rem, 14vw, 3.7rem) minmax(0, 1fr);
          align-items: start;
          gap: clamp(0.58rem, 2.7vw, 0.78rem);
          min-height: clamp(6.1rem, 22vw, 7.2rem);
          border-radius: clamp(0.9rem, 4vw, 1.05rem);
          padding: clamp(0.66rem, 2.9vw, 0.84rem) clamp(0.72rem, 3vw, 0.9rem) clamp(0.78rem, 3.2vw, 0.98rem) clamp(0.7rem, 3.4vw, 0.9rem);
          cursor: pointer;
        }

        .sf-ai-guided-step-five-record-card.is-selected {
          border-color: rgba(50, 106, 255, 0.52);
          box-shadow:
            0 18px 38px rgba(43, 102, 255, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.96);
        }

        .sf-ai-guided-step-five-record-icon {
          display: grid;
          width: clamp(2.75rem, 12.4vw, 3.35rem);
          height: clamp(2.75rem, 12.4vw, 3.35rem);
          place-items: center;
          border-radius: 999px;
          color: #fff;
          background: linear-gradient(135deg, #4b83ff, #155dff);
        }

        .sf-ai-guided-step-five-record-icon.is-green {
          background: linear-gradient(135deg, #b9f2c9, #08a136);
        }

        .sf-ai-guided-step-five-record-icon.is-blue {
          background: linear-gradient(135deg, #cae9ff, #287dff);
        }

        .sf-ai-guided-step-five-record-icon.is-purple {
          background: linear-gradient(135deg, #cebaff, #6f43e9);
        }

        .sf-ai-guided-step-five-record-icon svg {
          width: 1.65rem;
          height: 1.65rem;
        }

        .sf-ai-guided-step-five-bookmark {
          position: relative;
          display: grid;
          width: 1.85rem;
          height: 2.15rem;
          place-items: center;
          border-radius: 0.22rem 0.22rem 0.12rem 0.12rem;
          background: currentColor;
        }

        .sf-ai-guided-step-five-bookmark::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -0.02rem;
          width: 0.9rem;
          height: 0.9rem;
          background: inherit;
          transform: translateX(-50%) rotate(45deg);
        }

        .sf-ai-guided-step-five-bookmark span {
          position: relative;
          z-index: 1;
          width: 0.8rem;
          height: 0.8rem;
          color: #fff;
          background: currentColor;
          clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
        }

        .sf-ai-guided-step-five-record-copy {
          display: flex;
          flex: 1 1 0%;
          flex-direction: column;
          gap: clamp(0.2rem, 1vw, 0.36rem);
          min-width: 0;
          width: 100%;
          max-width: none;
        }

        .sf-ai-guided-step-five-record-toolbar {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          gap: clamp(0.42rem, 2vw, 0.58rem);
          min-height: clamp(2.24rem, 10vw, 2.7rem);
        }

        .sf-ai-guided-step-five-record-badge {
          display: inline-flex;
          width: fit-content;
          max-width: 100%;
          margin: 0;
          border-radius: 999px;
          background: rgba(47, 112, 255, 0.12);
          color: #0f66ff;
          padding: 0.12rem 0.52rem;
          font-size: 0.72rem;
          font-weight: 850;
          line-height: 1.1;
        }

        .sf-ai-guided-step-five-record-badge.is-green {
          background: rgba(36, 194, 80, 0.14);
          color: #139d36;
        }

        .sf-ai-guided-step-five-record-badge.is-purple {
          background: rgba(128, 82, 235, 0.14);
          color: #7146de;
        }

        .sf-ai-guided-step-five-record-text {
          display: block;
          flex: 1 1 auto;
          min-width: 0;
          width: 100%;
          max-width: none;
          margin: 0;
          color: #07113f;
          font-size: clamp(1.18rem, 5.15vw, 1.76rem);
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1.14;
          overflow-wrap: normal;
          word-break: normal;
          hyphens: none;
        }

        .sf-ai-guided-step-five-emphasis {
          color: inherit;
        }

        .sf-ai-guided-step-five-record-actions {
          display: flex;
          flex: 0 0 auto;
          gap: clamp(0.32rem, 1.6vw, 0.45rem);
          align-items: center;
          justify-content: flex-end;
        }

        .sf-ai-guided-step-five-play,
        .sf-ai-guided-step-five-slow-button {
          display: grid;
          height: clamp(2.24rem, 10vw, 2.7rem);
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.94);
          color: #075fff;
          font-size: clamp(0.74rem, 3.5vw, 0.94rem);
          font-weight: 850;
          box-shadow:
            0 12px 24px rgba(67, 101, 176, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          cursor: pointer;
        }

        .sf-ai-guided-step-five-play {
          width: clamp(2.24rem, 10vw, 2.7rem);
        }

        .sf-ai-guided-step-five-play svg {
          width: 1.2rem;
          height: 1.2rem;
        }

        .sf-ai-guided-step-five-slow-button {
          width: clamp(2.52rem, 11.2vw, 3rem);
        }

        .sf-ai-guided-step-five-more {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          margin: 1rem 0 0;
          color: #176cff;
          font-size: 1rem;
          font-weight: 780;
        }

        .sf-ai-guided-step-five-more svg {
          width: 1.05rem;
          height: 1.05rem;
        }

        .sf-ai-guided-step-five-bottom-nav {
          position: fixed;
          z-index: 56;
          left: 50%;
          bottom: max(0.7rem, env(safe-area-inset-bottom, 0px));
          width: min(calc(100% - 1.55rem), 398px);
          min-height: clamp(3.95rem, 17vw, 4.7rem);
          padding: clamp(0.38rem, 1.7vw, 0.52rem) clamp(0.82rem, 4.2vw, 1.18rem);
          border: 1px solid rgba(220, 227, 247, 0.92);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: center;
          gap: clamp(0.18rem, 1vw, 0.42rem);
          box-shadow:
            0 1.05rem 2.4rem rgba(94, 112, 172, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
          transform: translateX(-50%);
          backdrop-filter: blur(18px);
        }

        .sf-ai-guided-step-five-bottom-button {
          position: relative;
          width: 100%;
          height: clamp(2.55rem, 11.5vw, 3.12rem);
          border: 0;
          border-radius: 999px;
          padding: 0;
          display: grid;
          place-items: center;
          color: #8b8eaf;
          background: transparent;
          appearance: none;
          cursor: pointer;
          transition: color 160ms ease, transform 160ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .sf-ai-guided-step-five-bottom-button svg {
          width: clamp(1.62rem, 7.2vw, 2.05rem);
          height: clamp(1.62rem, 7.2vw, 2.05rem);
          fill: none;
          stroke: currentColor;
          stroke-width: 3.1;
          stroke-linecap: round;
          stroke-linejoin: round;
          vector-effect: non-scaling-stroke;
        }

        .sf-ai-guided-step-five-bottom-button.is-active svg {
          width: clamp(1.72rem, 7.8vw, 2.16rem);
          height: clamp(1.72rem, 7.8vw, 2.16rem);
          stroke: none;
        }

        .sf-ai-guided-step-five-bottom-pro {
          position: absolute;
          right: clamp(0.34rem, 1.8vw, 0.52rem);
          bottom: clamp(0.18rem, 0.9vw, 0.28rem);
          padding: 0.06rem 0.18rem 0.05rem;
          border-radius: 0.26rem;
          background: rgba(9, 14, 54, 0.9);
          color: #ffffff;
          font-size: 0.44rem;
          font-weight: 950;
          line-height: 1;
          letter-spacing: 0;
          box-shadow: 0 0.18rem 0.36rem rgba(9, 14, 54, 0.16);
        }

        .sf-ai-guided-step-five-progress-backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          padding: max(1rem, env(safe-area-inset-top, 0px)) 1rem max(1rem, env(safe-area-inset-bottom, 0px));
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(14, 19, 46, 0.28);
          backdrop-filter: blur(14px);
        }

        .sf-ai-guided-step-five-progress-modal {
          width: min(100%, 24rem);
          max-height: min(84dvh, 40rem);
          overflow-y: auto;
          border: 1px solid rgba(220, 228, 250, 0.94);
          border-radius: 1.45rem;
          background:
            radial-gradient(circle at 88% 6%, rgba(222, 207, 255, 0.62), transparent 8rem),
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 252, 255, 0.97));
          padding: 1.08rem;
          box-shadow:
            0 1.8rem 4.2rem rgba(25, 32, 74, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.96);
        }

        .sf-ai-guided-step-five-progress-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .sf-ai-guided-step-five-progress-kicker {
          margin: 0 0 0.26rem;
          color: #765cff;
          font-size: 0.78rem;
          font-weight: 900;
          line-height: 1;
        }

        .sf-ai-guided-step-five-progress-head h2 {
          margin: 0;
          color: #07103d;
          font-size: 1.42rem;
          font-weight: 950;
          line-height: 1.14;
        }

        .sf-ai-guided-step-five-progress-close {
          width: 2.35rem;
          height: 2.35rem;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          color: #12183e;
          display: grid;
          place-items: center;
          box-shadow: inset 0 0 0 1px rgba(211, 221, 244, 0.9);
          cursor: pointer;
        }

        .sf-ai-guided-step-five-progress-close svg {
          width: 1.06rem;
          height: 1.06rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.7;
          stroke-linecap: round;
        }

        .sf-ai-guided-step-five-progress-loading,
        .sf-ai-guided-step-five-progress-error {
          margin-top: 1rem;
          min-height: 7rem;
          border-radius: 1rem;
          display: grid;
          place-items: center;
          color: #687197;
          background: rgba(255, 255, 255, 0.72);
          font-size: 0.9rem;
          font-weight: 820;
          text-align: center;
        }

        .sf-ai-guided-step-five-progress-error {
          color: #9b3351;
          background: rgba(255, 242, 247, 0.82);
        }

        .sf-ai-guided-step-five-progress-grid {
          margin-top: 1rem;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.55rem;
        }

        .sf-ai-guided-step-five-progress-stat,
        .sf-ai-guided-step-five-progress-card,
        .sf-ai-guided-step-five-progress-step {
          border: 1px solid rgba(222, 228, 247, 0.9);
          background: rgba(255, 255, 255, 0.76);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.94);
        }

        .sf-ai-guided-step-five-progress-stat {
          min-height: 4.35rem;
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.18rem;
          text-align: center;
        }

        .sf-ai-guided-step-five-progress-stat span {
          color: #07103d;
          font-size: 1.46rem;
          font-weight: 1000;
          line-height: 1;
        }

        .sf-ai-guided-step-five-progress-stat small {
          color: #6a7197;
          font-size: 0.66rem;
          font-weight: 780;
          line-height: 1.16;
        }

        .sf-ai-guided-step-five-progress-card {
          margin-top: 0.7rem;
          border-radius: 1.06rem;
          padding: 0.88rem;
        }

        .sf-ai-guided-step-five-progress-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          color: #07103d;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .sf-ai-guided-step-five-progress-card-head strong {
          color: #765cff;
          font-size: 1rem;
        }

        .sf-ai-guided-step-five-progress-track {
          margin-top: 0.65rem;
          height: 0.6rem;
          border-radius: 999px;
          background: rgba(230, 225, 255, 0.95);
          overflow: hidden;
        }

        .sf-ai-guided-step-five-progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #845cff, #3f82ff);
        }

        .sf-ai-guided-step-five-progress-card p {
          margin: 0.42rem 0 0;
          color: #6a7197;
          font-size: 0.72rem;
          font-weight: 760;
        }

        .sf-ai-guided-step-five-progress-steps {
          margin-top: 0.75rem;
          display: grid;
          gap: 0.48rem;
        }

        .sf-ai-guided-step-five-progress-step {
          min-height: 3.55rem;
          border-radius: 0.95rem;
          padding: 0.62rem 0.72rem;
          display: grid;
          grid-template-columns: 2rem minmax(0, 1fr);
          align-items: center;
          gap: 0.64rem;
        }

        .sf-ai-guided-step-five-progress-step-index {
          width: 2rem;
          height: 2rem;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: #a8abc4;
          font-size: 0.86rem;
          font-weight: 950;
        }

        .sf-ai-guided-step-five-progress-step.is-completed .sf-ai-guided-step-five-progress-step-index {
          background: linear-gradient(135deg, #6b76ff, #8d5cff);
        }

        .sf-ai-guided-step-five-progress-step.is-active .sf-ai-guided-step-five-progress-step-index {
          background: linear-gradient(135deg, #3f8cff, #7b63ff);
        }

        .sf-ai-guided-step-five-progress-step-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.16rem;
        }

        .sf-ai-guided-step-five-progress-step-copy strong {
          color: #07103d;
          font-size: 0.9rem;
          font-weight: 900;
          line-height: 1.18;
        }

        .sf-ai-guided-step-five-progress-step-copy small {
          color: #6d7398;
          font-size: 0.72rem;
          font-weight: 780;
        }

        @media (max-height: 740px) {
          .sf-ai-guided-step-five-frame {
            padding-top: calc(env(safe-area-inset-top, 0px) + 0.34rem);
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 5.75rem);
          }

          .sf-ai-guided-step-five-header {
            min-height: 2.78rem;
          }

          .sf-ai-guided-step-five-scroll {
            padding-top: 0.18rem;
          }

          .sf-ai-guided-step-five-user-card {
            min-height: 6.35rem;
            padding-top: 0.82rem;
            padding-bottom: 0.9rem;
          }

          .sf-ai-guided-step-five-user-text {
            font-size: clamp(2.25rem, 10.6vw, 3.65rem);
          }

          .sf-ai-guided-step-five-next-card {
            min-height: 11.25rem;
            margin-top: 0.72rem;
            padding-top: 0.92rem;
          }

          .sf-ai-guided-step-five-next-text {
            font-size: clamp(1.64rem, 7.6vw, 2.45rem);
          }

          .sf-ai-guided-step-five-next-actions {
            margin-top: 1rem;
          }

          .sf-ai-guided-step-five-record-card {
            min-height: 5.9rem;
          }
        }

        @media (max-width: 480px) {
          .sf-ai-guided-step-five-frame {
            padding-inline: 0.95rem;
          }

          .sf-ai-guided-step-five-header {
            grid-template-columns: 2.65rem minmax(0, 1fr) 2.65rem;
          }

          .sf-ai-guided-step-five-menu,
          .sf-ai-guided-step-five-help-button {
            width: 2.65rem;
            height: 2.65rem;
          }

          .sf-ai-guided-step-five-logo {
            width: 2.15rem;
            height: 2.15rem;
          }

          .sf-ai-guided-step-five-brand-title {
            font-size: 1.36rem;
          }

          .sf-ai-guided-step-five-brand-subtitle {
            font-size: 0.52rem;
          }

          .sf-ai-guided-step-five-user-card {
            min-height: 6.45rem;
            padding: 0.9rem 0.92rem 1rem;
          }

          .sf-ai-guided-step-five-user-text {
            max-width: min(100%, 21rem);
            font-size: clamp(2.2rem, 10.1vw, 3.5rem);
          }

          .sf-ai-guided-step-five-retry {
            min-width: 5.7rem;
            padding-inline: 0.65rem;
          }

          .sf-ai-guided-step-five-next-text {
            width: min(67%, 13.3rem);
            font-size: clamp(1.72rem, 8vw, 2.45rem);
          }

          .sf-ai-guided-step-five-next-robot {
            right: 0.72rem;
            width: 5.45rem;
            height: 5.45rem;
          }

          .sf-ai-guided-step-five-use-next,
          .sf-ai-guided-step-five-change {
            font-size: 0.94rem;
          }

          .sf-ai-guided-step-five-record-card {
            grid-template-columns: 3rem minmax(0, 1fr);
            gap: 0.62rem;
            padding-inline: 0.72rem;
          }

          .sf-ai-guided-step-five-record-icon {
            width: 2.8rem;
            height: 2.8rem;
          }

          .sf-ai-guided-step-five-record-text {
            font-size: clamp(1.12rem, 5.2vw, 1.7rem);
          }

        }

        .sf-ai-guided-step-five-record-card {
          position: relative;
          display: flex !important;
          align-items: center !important;
          gap: clamp(0.62rem, 2.6vw, 0.78rem);
          min-height: clamp(5.7rem, 21vw, 6.55rem);
          padding:
            clamp(0.66rem, 2.7vw, 0.84rem)
            clamp(0.78rem, 3.3vw, 1rem)
            clamp(0.78rem, 3.2vw, 0.98rem) !important;
        }

        .sf-ai-guided-step-five-record-icon {
          position: relative !important;
          left: auto !important;
          top: auto !important;
          flex: 0 0 clamp(2.5rem, 10.6vw, 2.95rem) !important;
          transform: none !important;
        }

        .sf-ai-guided-step-five-record-copy {
          display: flex;
          flex: 1 1 0%;
          flex-direction: column;
          gap: clamp(0.2rem, 1vw, 0.34rem);
          width: 100%;
          max-width: none;
          min-width: 0;
          padding-left: 0;
        }

        .sf-ai-guided-step-five-record-toolbar {
          display: flex !important;
          width: 100%;
          min-height: clamp(2.24rem, 9.2vw, 2.64rem);
          align-items: center;
          justify-content: space-between;
          gap: clamp(0.42rem, 2vw, 0.62rem);
        }

        .sf-ai-guided-step-five-record-badge {
          width: fit-content;
          max-width: 100%;
          white-space: nowrap;
        }

        .sf-ai-guided-step-five-record-actions {
          display: flex !important;
          flex: 0 0 auto;
          align-items: center;
          justify-content: flex-end;
          gap: clamp(0.28rem, 1.35vw, 0.38rem);
          justify-self: end;
        }

        .sf-ai-guided-step-five-record-text {
          display: block;
          flex: 1 1 auto;
          min-width: 0;
          width: 100%;
          max-width: none;
          margin-top: clamp(0.16rem, 1vw, 0.26rem);
          text-align: left !important;
          text-wrap: normal;
          overflow-wrap: normal;
          word-break: normal;
          hyphens: none;
          white-space: normal;
        }

        .sf-ai-guided-step-five-record-text :where(button, span),
        .sf-ai-guided-step-five-emphasis {
          display: inline !important;
          text-align: left !important;
          text-wrap: normal !important;
          overflow-wrap: normal !important;
          word-break: normal !important;
          hyphens: none !important;
          white-space: normal !important;
        }
      `}</style>

      <div className="sf-ai-guided-step-five-frame">
        <main className="sf-ai-guided-step-five-scroll">
          <section className="sf-ai-guided-step-five-user-card">
            <div className="sf-ai-guided-step-five-user-card-head">
              <div className="sf-ai-guided-step-five-card-heading">
                <span>{COPY.userExpression}</span>
                <span className="sf-ai-guided-step-five-mini-wave" aria-hidden="true">
                  <WaveGlyph />
                </span>
              </div>
              <button
                type="button"
                aria-label={COPY.retryAria}
                onClick={onRetryEnglish}
                className="sf-ai-guided-step-five-retry"
              >
                <RefreshGlyph />
                <span>{COPY.retry}</span>
              </button>
            </div>
            <p lang="en" className="sf-ai-guided-step-five-user-text">
              {renderUserExpressionText
                ? renderUserExpressionText(displayEnglish)
                : displayEnglish}
            </p>
          </section>

          <section className="sf-ai-guided-step-five-next-card">
            <h2>
              <SparklesGlyph />
              <span>{COPY.nextTitle}</span>
            </h2>
            <p lang="zh-CN" className="sf-ai-guided-step-five-next-text">
              {isLoadingNextChinese ? COPY.loadingNext : displayNextChinese}
            </p>
            <div className="sf-ai-guided-step-five-next-actions">
              <button
                type="button"
                aria-label={COPY.useNextAria}
                onClick={onUseNextChinese}
                disabled={isLoadingNextChinese}
                className="sf-ai-guided-step-five-use-next"
              >
                <MicGlyph />
                <span>{COPY.useNext}</span>
              </button>
              <button
                type="button"
                aria-label={COPY.changeAria}
                onClick={onChangeNextChinese}
                disabled={isLoadingNextChinese}
                className="sf-ai-guided-step-five-change"
              >
                <RefreshGlyph />
                <span>{COPY.change}</span>
              </button>
            </div>
          </section>

          <section className="sf-ai-guided-step-five-records">
            <h2>
              <WaveGlyph />
              <span>{COPY.records}</span>
            </h2>
            <div className="sf-ai-guided-step-five-record-list">
              {safeExpressions.map((text, index) => {
                const meta =
                  expressionMeta[index] ||
                  expressionMeta[expressionMeta.length - 1];
                const isSelected = selectedExpressionIndex === index;

                return (
                  <article
                    key={`ai-guided-step-five-expression-${index}-${text}`}
                    className={`sf-ai-guided-step-five-record-card is-${meta.tone} ${
                      isSelected ? "is-selected" : ""
                    }`}
                    onClick={() => onSelectExpression(index)}
                  >
                    <div
                      className={`sf-ai-guided-step-five-record-icon is-${meta.tone}`}
                      aria-hidden="true"
                    >
                      <ExpressionIcon name={meta.icon} />
                    </div>
                    <div className="sf-ai-guided-step-five-record-copy">
                      <div className="sf-ai-guided-step-five-record-toolbar">
                        <p className={`sf-ai-guided-step-five-record-badge is-${meta.tone}`}>
                          {meta.badge}
                        </p>
                        <div className="sf-ai-guided-step-five-record-actions">
                          <button
                            type="button"
                            aria-label={`${COPY.playAria} ${index + 1}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectExpression(index);
                              onPlayExpression(index, 1);
                            }}
                            className="sf-ai-guided-step-five-play"
                          >
                            <PlayGlyph />
                          </button>
                          <button
                            type="button"
                            aria-label={`以 0.75 倍速播放第 ${index + 1} 条表达`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectExpression(index);
                              onPlayExpression(index, 0.75);
                            }}
                            className="sf-ai-guided-step-five-slow-button"
                          >
                            0.75x
                          </button>
                        </div>
                      </div>
                      <p lang="en" className="sf-ai-guided-step-five-record-text">
                        {renderInteractiveExpressionText
                          ? renderInteractiveExpressionText(text, index, meta.tone)
                          : renderExpressionText(text, meta.tone)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="sf-ai-guided-step-five-more">
              <span>{COPY.seeMore}</span>
              <ChevronDownGlyph />
            </p>
          </section>
        </main>
      </div>

      <nav className="sf-ai-guided-step-five-bottom-nav" aria-label="学习导航">
        <button
          type="button"
          className="sf-ai-guided-step-five-bottom-button is-active"
          onClick={onMenuClick}
          aria-label={menuLabel}
        >
          <BottomHomeIcon />
        </button>
        <button
          type="button"
          className="sf-ai-guided-step-five-bottom-button"
          onClick={openProgress}
          aria-label="查看学习进度"
          aria-haspopup="dialog"
          aria-expanded={isProgressOpen}
        >
          <BottomProgressIcon />
        </button>
        <button
          type="button"
          className="sf-ai-guided-step-five-bottom-button"
          onClick={() => setIsHelpOpen(true)}
          aria-label="打开使用帮助"
          aria-haspopup="dialog"
          aria-expanded={isHelpOpen}
        >
          <BottomHelpIcon />
        </button>
        <button
          type="button"
          className="sf-ai-guided-step-five-bottom-button"
          onClick={onAccountClick}
          aria-label="打开账户"
        >
          <BottomAccountIcon />
          {hasProEntitlement ? (
            <span className="sf-ai-guided-step-five-bottom-pro">PRO</span>
          ) : null}
        </button>
      </nav>

      <AiGuidedExpressionHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {isProgressOpen ? (
        <div
          className="sf-ai-guided-step-five-progress-backdrop"
          role="presentation"
          onClick={() => setIsProgressOpen(false)}
        >
          <section
            className="sf-ai-guided-step-five-progress-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sf-ai-guided-step-five-progress-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sf-ai-guided-step-five-progress-head">
              <div>
                <p className="sf-ai-guided-step-five-progress-kicker">学习进度</p>
                <h2 id="sf-ai-guided-step-five-progress-title">AI 引导表达</h2>
              </div>
              <button
                type="button"
                className="sf-ai-guided-step-five-progress-close"
                onClick={() => setIsProgressOpen(false)}
                aria-label="关闭学习进度"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {progressError ? (
              <div className="sf-ai-guided-step-five-progress-error">
                {progressError}
              </div>
            ) : isProgressLoading || !progressSnapshot ? (
              <div className="sf-ai-guided-step-five-progress-loading">
                正在同步学习进度...
              </div>
            ) : (
              <>
                <div className="sf-ai-guided-step-five-progress-grid">
                  <div className="sf-ai-guided-step-five-progress-stat">
                    <span>{todayCompleted}</span>
                    <small>今日完成 / {dailyGoal}</small>
                  </div>
                  <div className="sf-ai-guided-step-five-progress-stat">
                    <span>{streakDays}</span>
                    <small>连续天数</small>
                  </div>
                  <div className="sf-ai-guided-step-five-progress-stat">
                    <span>{totalCompleted}</span>
                    <small>累计完成</small>
                  </div>
                </div>

                <div className="sf-ai-guided-step-five-progress-card">
                  <div className="sf-ai-guided-step-five-progress-card-head">
                    <span>今日挑战</span>
                    <strong>
                      {challengeCompleted}/{challengeGoal}
                    </strong>
                  </div>
                  <div className="sf-ai-guided-step-five-progress-track">
                    <span style={{ width: `${challengePercent}%` }} />
                  </div>
                  <p>{challengePercent}% 已完成</p>
                </div>

                <div className="sf-ai-guided-step-five-progress-steps">
                  {progressStepOrder.map((item, index) => {
                    const step = progressSnapshot?.steps?.[item.id];
                    const status = step?.status ?? "locked";

                    return (
                      <div
                        className={`sf-ai-guided-step-five-progress-step is-${status}`}
                        key={item.id}
                      >
                        <span className="sf-ai-guided-step-five-progress-step-index">
                          {index + 1}
                        </span>
                        <span className="sf-ai-guided-step-five-progress-step-copy">
                          <strong>{step?.label ?? item.fallbackLabel}</strong>
                          <small>{progressStatusCopy[status]}</small>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
