"use client";

import { useEffect, useState } from "react";
import FreeStudyHelpModal from "@/components/FreeStudyHelpModal";
import { FREE_PRACTICE_DAILY_LIMIT } from "@/lib/freePracticeLimit";

type FreeStudyPageOneProps = {
  hasProEntitlement?: boolean;
  menuLabel?: string;
  onAccountClick: () => void;
  onMenuClick: () => void;
  onMicrophoneClick: () => void;
  recordingState?: "idle" | "recording";
};

type FreeStudyProgressStepId =
  | "native"
  | "english"
  | "suggestions"
  | "follow";

type FreeStudyProgressStepStatus = "active" | "completed" | "locked";

type FreeStudyProgressSnapshot = {
  challenge?: {
    completed?: number;
    goal?: number;
    percent?: number;
  };
  dailyGoal?: number;
  level?: number;
  steps?: Partial<
    Record<
      FreeStudyProgressStepId,
      {
        id?: FreeStudyProgressStepId;
        label?: string;
        status?: FreeStudyProgressStepStatus;
      }
    >
  >;
  streakDays?: number;
  todayCompleted?: number;
  totalCompleted?: number;
};

const flowSteps = [
  { icon: "mic", title: "说中文" },
  { icon: "chat", title: "试着说英文" },
  { icon: "robot", title: "AI 给你表达" },
  { icon: "light", title: "继续下一句" },
] as const;

const helpSteps = [
  {
    body: "点击麦克风，说出你现在想表达的内容。",
    icon: "mic",
    title: "先说中文",
  },
  {
    body: "如果识别有误，可以先编辑中文，再继续练习。",
    icon: "edit",
    title: "修改中文",
  },
  {
    body: "看着中文，用你自己的英文先说出来，不需要一开始就完美。",
    icon: "speak",
    title: "大胆说英文",
  },
  {
    body: "AI 会给你准确、地道、简洁等不同表达，你可以播放、跟读并收藏有用句子。",
    icon: "listen",
    title: "看推荐表达并跟读",
  },
] as const;

void helpSteps;

const progressStepOrder: Array<{
  id: FreeStudyProgressStepId;
  fallbackLabel: string;
}> = [
  { id: "native", fallbackLabel: "说中文" },
  { id: "english", fallbackLabel: "试着说英文" },
  { id: "suggestions", fallbackLabel: "AI 给你表达" },
  { id: "follow", fallbackLabel: "继续下一句" },
];

const progressStatusCopy: Record<FreeStudyProgressStepStatus, string> = {
  active: "进行中",
  completed: "已完成",
  locked: "待练习",
};

function MicGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 29a8 8 0 0 0 8-8v-8a8 8 0 0 0-16 0v8a8 8 0 0 0 8 8Z" />
      <path d="M11 22a13 13 0 0 0 26 0M24 35v8M18 43h12" />
    </svg>
  );
}

function SparklesGlyph() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M18.5 6.2 22 15l8.8 3.5L22 22l-3.5 8.8L15 22l-8.8-3.5L15 15l3.5-8.8Z" />
      <path d="m29.5 5.8 1.5 3.7 3.7 1.5-3.7 1.5-1.5 3.7-1.5-3.7-3.7-1.5L28 9.5l1.5-3.7Z" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M8 18c0-7 6-12 16-12s16 5 16 12-6 12-16 12c-1.7 0-3.4-.1-4.9-.5L10 36l2.4-8.2C9.6 25.8 8 23.2 8 18Z" />
      <path d="M17 19h.1M24 19h.1M31 19h.1" />
    </svg>
  );
}

function RobotGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="10" y="14" width="28" height="23" rx="7" />
      <path d="M18 14v-4M30 14v-4M15 26h.1M33 26h.1M20 32c3 2 8 2 11 0" />
    </svg>
  );
}

function LightGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M15 21a9 9 0 1 1 18 0c0 4.8-3.4 7.2-5.2 10.5h-7.6C18.4 28.2 15 25.8 15 21Z" />
      <path d="M20 36h8M21 41h6" />
    </svg>
  );
}

function WaveGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M9 21v6M16 14v20M23 10v28M30 14v20M37 21v6" />
    </svg>
  );
}

function BottomHomeIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient
          id="sf-free-start-bottom-home-gradient"
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
        fill="url(#sf-free-start-bottom-home-gradient)"
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

function FlowIcon({ icon }: { icon: (typeof flowSteps)[number]["icon"] }) {
  if (icon === "chat") return <ChatGlyph />;
  if (icon === "robot") return <RobotGlyph />;
  if (icon === "light") return <LightGlyph />;
  return <MicGlyph />;
}

export default function FreeStudyPageOne({
  hasProEntitlement = false,
  menuLabel = "回到学习首页",
  onAccountClick,
  onMenuClick,
  onMicrophoneClick,
  recordingState = "idle",
}: FreeStudyPageOneProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [progressSnapshot, setProgressSnapshot] =
    useState<FreeStudyProgressSnapshot | null>(null);
  const isRecording = recordingState === "recording";

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

        const snapshot = (await response.json()) as FreeStudyProgressSnapshot;
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
    if (!isHelpOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsHelpOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isHelpOpen]);

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
      className={`sf-free-start-page ${isRecording ? "is-recording" : "is-idle"} ${
        isHelpOpen ? "is-help-open" : ""
      } ${isProgressOpen ? "is-progress-open" : ""}`}
      aria-label="自由学习第一页"
    >
      <style>{`
        .sf-free-start-page,
        .sf-free-start-page * {
          box-sizing: border-box;
        }

        .sf-speak-page:has(.sf-free-start-page) {
          min-height: 100dvh;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 42%, rgba(255,255,255,.86), transparent 34%),
            linear-gradient(180deg, #f2e9ff 0%, #fbf8ff 50%, #f3eaff 100%);
        }

        .sf-speak-page:has(.sf-free-start-page) > div {
          width: 100%;
          max-width: none;
          min-height: 100dvh;
          padding: 0;
        }

        .sf-speak-page:has(.sf-free-start-page) .sf-speak-phone {
          width: min(100vw, 430px);
          max-width: 100vw;
          height: 100dvh;
          min-height: 100dvh;
          max-height: none;
          overflow: hidden;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .sf-speak-page:has(.sf-free-start-page) .sf-speak-phone::before,
        .sf-speak-page:has(.sf-free-start-page) .sf-speak-phone::after,
        .sf-speak-page:has(.sf-free-start-page) .sf-speak-phone > .pointer-events-none {
          display: none;
        }

        .sf-speak-page:has(.sf-free-start-page) .sf-speak-phone > .absolute:has(.sf-free-start-page) {
          z-index: 120;
        }

        .sf-free-start-page {
          position: absolute;
          inset: 0;
          z-index: 90;
          width: 100%;
          height: 100%;
          min-height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          color: #101342;
          background:
            radial-gradient(circle at 50% 43%, rgba(255,255,255,.92), transparent 32%),
            radial-gradient(circle at 18% 12%, rgba(238,219,255,.92), transparent 36%),
            radial-gradient(circle at 82% 78%, rgba(228,213,255,.78), transparent 34%),
            linear-gradient(180deg, #f2e9ff 0%, #fbf8ff 48%, #f3eaff 100%);
          font-family: var(--sf-font-zh, "PingFang SC", "Microsoft YaHei", sans-serif);
        }

        .sf-free-start-page.is-help-open,
        .sf-free-start-page.is-progress-open {
          overflow: hidden;
        }

        .sf-free-start-frame {
          position: relative;
          min-height: 100%;
          isolation: isolate;
          padding: calc(env(safe-area-inset-top, 0px) + 1.18rem) clamp(1.15rem, 4.8vw, 1.65rem)
            calc(env(safe-area-inset-bottom, 0px) + 6.2rem);
        }

        .sf-free-start-frame::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 11.2%;
          z-index: -1;
          width: min(39rem, 112vw);
          aspect-ratio: 1;
          transform: translateX(-50%);
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.82);
          box-shadow:
            inset 0 0 0 1.65rem rgba(255,255,255,.16),
            inset 0 0 0 3.1rem rgba(255,255,255,.13),
            0 0 5.5rem rgba(157,97,255,.16);
        }

        .sf-free-start-hero {
          position: relative;
          margin-top: clamp(2.6rem, 6.8dvh, 4.1rem);
          text-align: center;
        }

        .sf-free-start-spark {
          position: absolute;
          width: 1.15rem;
          aspect-ratio: 1;
          transform: rotate(45deg);
          background: rgba(255,255,255,.94);
          clip-path: polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);
        }

        .sf-free-start-spark.is-left {
          left: 4%;
          top: -2.4rem;
        }

        .sf-free-start-spark.is-right {
          right: 9%;
          top: -1.35rem;
        }

        .sf-free-start-title {
          margin: 0;
          color: transparent;
          background: linear-gradient(94deg, #101342 0%, #101342 33%, #7b52dc 71%, #925af0 100%);
          -webkit-background-clip: text;
          background-clip: text;
          font-size: clamp(3.18rem, 13.6vw, 4.55rem);
          font-weight: 950;
          letter-spacing: 0;
          line-height: .97;
          white-space: nowrap;
        }

        .sf-free-start-page.is-recording .sf-free-start-title {
          font-size: clamp(2.45rem, 10vw, 3.42rem);
        }

        .sf-free-start-subtitle {
          margin: .86rem 0 0;
          color: rgba(37,39,83,.62);
          font-size: clamp(1.04rem, 4.5vw, 1.52rem);
          font-weight: 700;
          line-height: 1.38;
        }

        .sf-free-start-subtitle span {
          display: block;
        }

        .sf-free-start-recording-pill {
          display: none;
          align-items: center;
          justify-content: center;
          gap: .42rem;
          margin-top: .9rem;
          color: #8353ef;
          font-size: 1rem;
          font-weight: 900;
        }

        .sf-free-start-recording-pill svg {
          width: 1.35rem;
          height: 1.35rem;
          stroke: currentColor;
          stroke-width: 3.8;
          stroke-linecap: round;
        }

        .sf-free-start-page.is-recording .sf-free-start-recording-pill {
          display: inline-flex;
        }

        .sf-free-start-mic-area {
          position: relative;
          display: grid;
          place-items: center;
          margin-top: clamp(1.65rem, 3.8dvh, 2.55rem);
        }

        .sf-free-start-mic-area::before,
        .sf-free-start-mic-area::after {
          content: "";
          position: absolute;
          width: min(21rem, 76vw);
          aspect-ratio: 1;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.74);
          box-shadow: 0 0 3.2rem rgba(171,103,255,.2);
        }

        .sf-free-start-mic-area::after {
          width: min(17.6rem, 64vw);
          opacity: .7;
        }

        .sf-free-start-mic {
          position: relative;
          z-index: 2;
          display: grid;
          width: clamp(10.95rem, 47vw, 13.25rem);
          aspect-ratio: 1;
          place-items: center;
          border: 4px solid rgba(255,255,255,.92);
          border-radius: 50%;
          background: linear-gradient(135deg, #f0a3ff 0%, #ac64f2 48%, #7556f4 100%);
          color: white;
          box-shadow:
            0 20px 38px rgba(126,82,234,.22),
            0 0 0 1.05rem rgba(255,255,255,.14),
            0 0 0 2.15rem rgba(255,255,255,.09);
          cursor: pointer;
        }

        .sf-free-start-page.is-recording .sf-free-start-mic {
          box-shadow:
            0 23px 42px rgba(126,82,234,.26),
            0 0 0 1.05rem rgba(255,255,255,.18),
            0 0 0 2.05rem rgba(160,94,244,.12),
            0 0 0 3.25rem rgba(255,255,255,.08);
        }

        .sf-free-start-mic svg {
          width: 50%;
          height: 50%;
          fill: currentColor;
          stroke: currentColor;
          stroke-width: 3.4;
          stroke-linecap: round;
        }

        .sf-free-start-mic svg path,
        .sf-free-start-mic svg rect {
          fill: none;
          stroke: #fff;
          stroke-width: 3.7;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-start-wave-bars {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 1;
          display: none;
          width: min(29rem, 104vw);
          transform: translate(-50%, -50%);
          justify-content: space-between;
          pointer-events: none;
        }

        .sf-free-start-page.is-recording .sf-free-start-wave-bars {
          display: flex;
        }

        .sf-free-start-wave-group {
          display: flex;
          align-items: center;
          gap: .45rem;
          opacity: .44;
        }

        .sf-free-start-wave-group span {
          width: .36rem;
          border-radius: 999px;
          background: linear-gradient(180deg, #ad7cff, #7b55eb);
          animation: sf-free-start-wave 1s ease-in-out infinite alternate;
        }

        .sf-free-start-wave-group span:nth-child(2) { animation-delay: .08s; }
        .sf-free-start-wave-group span:nth-child(3) { animation-delay: .16s; }
        .sf-free-start-wave-group span:nth-child(4) { animation-delay: .24s; }
        .sf-free-start-wave-group span:nth-child(5) { animation-delay: .32s; }

        @keyframes sf-free-start-wave {
          from { transform: scaleY(.72); opacity: .42; }
          to { transform: scaleY(1.12); opacity: .8; }
        }

        .sf-free-start-tip-bubble {
          position: absolute;
          right: 0;
          top: -1.6rem;
          z-index: 4;
          min-width: 9.8rem;
          border: 1px solid rgba(153,112,235,.18);
          border-radius: 999px;
          background: rgba(255,255,255,.84);
          padding: .95rem 1.2rem;
          color: #8754ee;
          font-size: 1.15rem;
          font-weight: 900;
          box-shadow: 0 16px 32px rgba(107,76,188,.12), inset 0 1px 0 rgba(255,255,255,.92);
        }

        .sf-free-start-tip-bubble svg {
          position: absolute;
          right: 1rem;
          top: 100%;
          width: 4.6rem;
          height: 3.7rem;
          fill: none;
          stroke: #8d58ee;
          stroke-width: 6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-start-page.is-recording .sf-free-start-tip-bubble {
          display: none;
        }

        .sf-free-start-instruction {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .78rem;
          width: min(100%, 22.2rem);
          min-height: 3.02rem;
          margin: clamp(1.45rem, 3.3dvh, 2.15rem) auto 0;
          border: 1px solid rgba(255,255,255,.76);
          border-radius: 999px;
          background: rgba(255,255,255,.42);
          color: rgba(39,42,91,.68);
          box-shadow: 0 12px 26px rgba(114,82,180,.08), inset 0 1px 0 rgba(255,255,255,.86);
          font-size: clamp(.94rem, 3.85vw, 1.16rem);
          font-weight: 750;
          letter-spacing: 0;
          cursor: pointer;
        }

        .sf-free-start-page.is-recording .sf-free-start-instruction {
          color: rgba(62,55,119,.72);
        }

        .sf-free-start-instruction-icon {
          display: grid;
          width: 2.2rem;
          height: 2.2rem;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 50%;
          background: rgba(229,209,255,.72);
          color: #9a62ef;
        }

        .sf-free-start-instruction-icon svg {
          width: 1.35rem;
          height: 1.35rem;
          fill: currentColor;
          stroke: currentColor;
          stroke-width: 2.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-start-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .55rem;
          margin: 1.05rem 0 0;
          color: rgba(58,58,101,.72);
          font-size: clamp(.9rem, 3.7vw, 1.12rem);
          font-weight: 650;
        }

        .sf-free-start-note::before {
          content: "✓";
          display: grid;
          width: 1.35rem;
          height: 1.35rem;
          place-items: center;
          border: 2px solid #c392ff;
          border-radius: 50%;
          color: #9f66ee;
          font-size: .9rem;
          font-weight: 950;
        }

        .sf-free-start-help-card,
        .sf-free-start-small-tip {
          margin-top: 1.45rem;
          border: 1px solid rgba(159,121,230,.12);
          border-radius: 1.55rem;
          background: rgba(255,255,255,.72);
          box-shadow: 0 18px 42px rgba(111,78,182,.1), inset 0 1px 0 rgba(255,255,255,.92);
        }

        .sf-free-start-help-card {
          padding: 1.06rem .94rem 1.12rem;
        }

        .sf-free-start-help-card h2,
        .sf-free-start-small-tip strong {
          margin: 0;
          color: #101342;
          font-size: 1.25rem;
          font-weight: 950;
        }

        .sf-free-start-help-title {
          display: flex;
          align-items: center;
          gap: .55rem;
          margin-bottom: 1.2rem;
          color: #8d58ee;
        }

        .sf-free-start-flow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: .35rem;
          align-items: start;
        }

        .sf-free-start-flow-item {
          position: relative;
          display: grid;
          justify-items: center;
          gap: .42rem;
          color: #20234f;
          font-size: .86rem;
          font-weight: 700;
          text-align: center;
        }

        .sf-free-start-flow-item:not(:last-child)::after {
          content: "";
          position: absolute;
          left: calc(50% + 1.55rem);
          top: 1.55rem;
          width: calc(100% - 2.8rem);
          border-top: 2px dashed rgba(156,112,237,.32);
        }

        .sf-free-start-flow-icon {
          display: grid;
          width: 3.45rem;
          height: 3.1rem;
          width: 3.1rem;
          place-items: center;
          border-radius: 50%;
          background: rgba(238,230,255,.86);
          color: #8e57ee;
        }

        .sf-free-start-flow-icon svg {
          width: 1.84rem;
          height: 1.84rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 3.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-start-small-tip {
          display: none;
          align-items: center;
          gap: 1rem;
          padding: 1.1rem 1.2rem;
        }

        .sf-free-start-page.is-recording .sf-free-start-help-card {
          display: none;
        }

        .sf-free-start-page.is-recording .sf-free-start-small-tip {
          display: flex;
        }

        .sf-free-start-small-tip-icon {
          display: grid;
          width: 3.3rem;
          height: 3.3rem;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 50%;
          background: rgba(230,213,255,.88);
          color: #8a56ee;
        }

        .sf-free-start-small-tip-icon svg {
          width: 2rem;
          height: 2rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 3.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-start-small-tip span:last-child {
          display: block;
          margin-top: .28rem;
          color: rgba(42,43,86,.72);
          font-size: 1rem;
          font-weight: 650;
          line-height: 1.42;
        }

        .sf-free-help-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: grid;
          place-items: end center;
          overflow-y: auto;
          background: rgba(26,28,45,.36);
          padding: 1.6rem 1rem;
          backdrop-filter: blur(10px);
        }

        .sf-free-help-modal {
          width: min(100%, 25.5rem);
          border: 1px solid rgba(159,121,230,.18);
          border-radius: 2rem;
          background:
            radial-gradient(circle at 82% 12%, rgba(239,229,255,.9), transparent 26%),
            linear-gradient(180deg, rgba(255,255,255,.97), rgba(252,249,255,.96));
          box-shadow: 0 28px 60px rgba(37,31,78,.24), inset 0 1px 0 rgba(255,255,255,.95);
          padding: 1.35rem 1.2rem 1.25rem;
        }

        .sf-free-help-head {
          display: grid;
          grid-template-columns: 3rem minmax(0, 1fr) 3rem;
          align-items: center;
          gap: .75rem;
          margin-bottom: 1.4rem;
        }

        .sf-free-help-head .sf-free-start-brand {
          gap: .5rem;
        }

        .sf-free-help-head .sf-free-start-logo {
          width: 2.65rem;
          height: 2.65rem;
          border-radius: .88rem;
        }

        .sf-free-help-head .sf-free-start-brand-title {
          font-size: 1.72rem;
        }

        .sf-free-help-head .sf-free-start-brand-subtitle {
          font-size: .66rem;
        }

        .sf-free-start-help-close {
          width: 2.65rem;
          height: 2.65rem;
          justify-self: end;
          color: #121542;
        }

        .sf-free-start-help-close svg {
          width: 1.35rem;
          height: 1.35rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.6;
          stroke-linecap: round;
        }

        .sf-free-help-modal h2 {
          margin: .35rem 0 .35rem;
          text-align: center;
          color: #101342;
          font-size: 2rem;
          font-weight: 950;
          letter-spacing: 0;
        }

        .sf-free-help-intro {
          margin: 0 0 1.25rem;
          text-align: center;
          color: rgba(40,41,88,.7);
          font-size: 1rem;
          font-weight: 650;
          line-height: 1.5;
        }

        .sf-free-help-step-list {
          display: grid;
          gap: .55rem;
        }

        .sf-free-help-step {
          display: grid;
          grid-template-columns: 4.25rem minmax(0, 1fr) 1.2rem;
          align-items: center;
          gap: .85rem;
          border: 1px solid rgba(159,121,230,.13);
          border-radius: 1.2rem;
          background: rgba(255,255,255,.72);
          padding: .82rem .85rem;
          box-shadow: 0 10px 24px rgba(111,78,182,.08);
        }

        .sf-free-help-step-icon {
          display: grid;
          width: 3.5rem;
          height: 3.5rem;
          place-items: center;
          border-radius: 50%;
          background: rgba(236,228,255,.86);
          color: #8b56ee;
        }

        .sf-free-help-step-icon svg {
          width: 2.1rem;
          height: 2.1rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-help-step-number {
          display: inline-grid;
          width: 1.78rem;
          height: 1.78rem;
          place-items: center;
          border-radius: .5rem;
          background: linear-gradient(135deg, #ceb6ff, #8d59ee);
          color: white;
          font-weight: 950;
        }

        .sf-free-help-step h3 {
          margin: 0 0 .18rem;
          color: #101342;
          font-size: 1.16rem;
          font-weight: 950;
        }

        .sf-free-help-step p {
          margin: 0;
          color: rgba(37,39,83,.7);
          font-size: .9rem;
          font-weight: 620;
          line-height: 1.45;
        }

        .sf-free-help-chevron {
          color: #8b56ee;
          font-size: 2rem;
          font-weight: 300;
        }

        .sf-free-help-card {
          margin-top: .9rem;
          border: 1px solid rgba(159,121,230,.14);
          border-radius: 1.25rem;
          background: rgba(255,255,255,.72);
          padding: 1rem 1.05rem;
          color: #111642;
          box-shadow: 0 12px 28px rgba(111,78,182,.08);
        }

        .sf-free-help-card strong {
          display: block;
          margin-bottom: .45rem;
          font-size: 1.05rem;
          font-weight: 950;
        }

        .sf-free-help-card ul {
          margin: 0;
          padding-left: 1.2rem;
          color: rgba(37,39,83,.72);
          font-size: .92rem;
          font-weight: 620;
          line-height: 1.7;
        }

        .sf-free-help-ok {
          width: 100%;
          min-height: 3.35rem;
          margin-top: 1rem;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, #b174ff, #7a52ee);
          color: #ffffff !important;
          font-size: 1.22rem;
          font-weight: 950 !important;
          box-shadow: 0 14px 30px rgba(128,82,236,.28), inset 0 1px 0 rgba(255,255,255,.45);
          cursor: pointer;
        }

        .sf-free-start-bottom-nav {
          position: fixed;
          z-index: 156;
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

        .sf-free-start-bottom-button {
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

        .sf-free-start-bottom-button:active,
        .sf-free-start-mic:active,
        .sf-free-start-instruction:active {
          transform: scale(0.97);
        }

        .sf-free-start-bottom-button:focus-visible,
        .sf-free-start-progress-close:focus-visible,
        .sf-free-start-mic:focus-visible,
        .sf-free-start-instruction:focus-visible {
          outline: 3px solid rgba(132, 103, 255, 0.34);
          outline-offset: 3px;
        }

        .sf-free-start-bottom-button svg {
          width: clamp(1.62rem, 7.2vw, 2.05rem);
          height: clamp(1.62rem, 7.2vw, 2.05rem);
          fill: none;
          stroke: currentColor;
          stroke-width: 3.1;
          stroke-linecap: round;
          stroke-linejoin: round;
          vector-effect: non-scaling-stroke;
        }

        .sf-free-start-bottom-button.is-active svg {
          width: clamp(1.72rem, 7.8vw, 2.16rem);
          height: clamp(1.72rem, 7.8vw, 2.16rem);
          stroke: none;
        }

        .sf-free-start-bottom-pro {
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

        .sf-free-start-progress-backdrop {
          position: fixed;
          inset: 0;
          z-index: 180;
          padding: max(1rem, env(safe-area-inset-top, 0px)) 1rem max(1rem, env(safe-area-inset-bottom, 0px));
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(14, 19, 46, 0.28);
          backdrop-filter: blur(14px);
        }

        .sf-free-start-progress-modal {
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

        .sf-free-start-progress-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .sf-free-start-progress-kicker {
          margin: 0 0 0.26rem;
          color: #765cff;
          font-size: 0.78rem;
          font-weight: 900;
          line-height: 1;
        }

        .sf-free-start-progress-head h2 {
          margin: 0;
          color: #07103d;
          font-size: 1.42rem;
          font-weight: 950;
          line-height: 1.14;
        }

        .sf-free-start-progress-close {
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

        .sf-free-start-progress-close svg {
          width: 1.06rem;
          height: 1.06rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.7;
          stroke-linecap: round;
        }

        .sf-free-start-progress-loading,
        .sf-free-start-progress-error {
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

        .sf-free-start-progress-error {
          color: #9b3351;
          background: rgba(255, 242, 247, 0.82);
        }

        .sf-free-start-progress-grid {
          margin-top: 1rem;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.55rem;
        }

        .sf-free-start-progress-stat,
        .sf-free-start-progress-card,
        .sf-free-start-progress-step {
          border: 1px solid rgba(222, 228, 247, 0.9);
          background: rgba(255, 255, 255, 0.76);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.94);
        }

        .sf-free-start-progress-stat {
          min-height: 4.35rem;
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.18rem;
          text-align: center;
        }

        .sf-free-start-progress-stat span {
          color: #07103d;
          font-size: 1.46rem;
          font-weight: 1000;
          line-height: 1;
        }

        .sf-free-start-progress-stat small {
          color: #6a7197;
          font-size: 0.66rem;
          font-weight: 780;
          line-height: 1.16;
        }

        .sf-free-start-progress-card {
          margin-top: 0.7rem;
          border-radius: 1.06rem;
          padding: 0.88rem;
        }

        .sf-free-start-progress-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          color: #07103d;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .sf-free-start-progress-card-head strong {
          color: #765cff;
          font-size: 1rem;
        }

        .sf-free-start-progress-track {
          margin-top: 0.65rem;
          height: 0.6rem;
          border-radius: 999px;
          background: rgba(230, 225, 255, 0.95);
          overflow: hidden;
        }

        .sf-free-start-progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #845cff, #3f82ff);
        }

        .sf-free-start-progress-card p {
          margin: 0.42rem 0 0;
          color: #6a7197;
          font-size: 0.72rem;
          font-weight: 760;
        }

        .sf-free-start-progress-steps {
          margin-top: 0.75rem;
          display: grid;
          gap: 0.48rem;
        }

        .sf-free-start-progress-step {
          min-height: 3.55rem;
          border-radius: 0.95rem;
          padding: 0.62rem 0.72rem;
          display: grid;
          grid-template-columns: 2rem minmax(0, 1fr);
          align-items: center;
          gap: 0.64rem;
        }

        .sf-free-start-progress-step-index {
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

        .sf-free-start-progress-step.is-completed .sf-free-start-progress-step-index {
          background: linear-gradient(135deg, #6b76ff, #8d5cff);
        }

        .sf-free-start-progress-step.is-active .sf-free-start-progress-step-index {
          background: linear-gradient(135deg, #3f8cff, #7b63ff);
        }

        .sf-free-start-progress-step-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.16rem;
        }

        .sf-free-start-progress-step-copy strong {
          color: #07103d;
          font-size: 0.9rem;
          font-weight: 900;
          line-height: 1.18;
        }

        .sf-free-start-progress-step-copy small {
          color: #6d7398;
          font-size: 0.72rem;
          font-weight: 780;
        }

        /* Final free-study first-page visual polish: match the compact standard art. */
        .sf-speak-page:has(.sf-free-start-page) {
          background:
            radial-gradient(circle at 50% 26%, rgba(255,255,255,.95), transparent 34%),
            radial-gradient(circle at 50% 58%, rgba(181,154,255,.14), transparent 42%),
            linear-gradient(180deg, #fbfdff 0%, #f8fbff 54%, #fbf8ff 100%) !important;
        }

        .sf-free-start-frame {
          background:
            radial-gradient(circle at 50% 36%, rgba(255,255,255,.88), transparent 33%),
            radial-gradient(circle at 50% 50%, rgba(151,122,255,.1), transparent 48%),
            linear-gradient(180deg, rgba(252,254,255,.98), rgba(247,251,255,.98) 58%, rgba(251,248,255,.98)) !important;
        }

        .sf-free-start-mic-area {
          transform: scale(1.15);
          transform-origin: center;
          margin-top: .35rem !important;
          margin-bottom: .85rem !important;
        }

        .sf-free-start-mic-area::before {
          opacity: .9 !important;
          box-shadow:
            0 0 0 2.4rem rgba(145,119,255,.10),
            0 0 0 4.05rem rgba(130,170,255,.08),
            0 0 0 5.55rem rgba(130,170,255,.06),
            0 0 0 7.1rem rgba(145,119,255,.045),
            0 0 54px rgba(122,82,238,.18) !important;
        }

        .sf-free-start-mic-area::after {
          opacity: .42 !important;
          transform: translate(-50%, -50%) scale(1.08) !important;
        }

        .sf-free-start-mic {
          animation: sf-free-start-breathe 2.5s ease-in-out infinite !important;
        }

        @keyframes sf-free-start-breathe {
          0%, 100% { transform: scale(1); opacity: .98; }
          50% { transform: scale(1.05); opacity: 1; }
        }

        .sf-free-start-wave-bars {
          width: 120% !important;
          left: -10% !important;
          opacity: .82 !important;
        }

        .sf-free-start-page.is-recording .sf-free-start-wave-bars {
          width: 142% !important;
          left: -21% !important;
          opacity: .95 !important;
        }

        .sf-free-start-page.is-recording .sf-free-start-hero {
          padding-top: 1rem !important;
        }

        .sf-free-start-page.is-recording .sf-free-start-title {
          margin-top: 1rem !important;
        }

        .sf-free-start-recording-pill {
          font-size: 1.05rem !important;
          color: #7253ff !important;
          filter: saturate(1.15);
        }

        .sf-free-start-recording-pill svg {
          width: 1.35rem !important;
          height: 1.35rem !important;
        }

        .sf-free-start-instruction {
          min-height: 2.65rem !important;
          padding: .52rem 1rem !important;
          border-radius: 999px !important;
        }

        .sf-free-start-page.is-recording .sf-free-start-instruction {
          background: rgba(255,255,255,.58) !important;
          border-color: rgba(145,119,255,.22) !important;
          box-shadow: 0 10px 24px rgba(111,78,182,.07) !important;
        }

        .sf-free-start-note {
          font-weight: 560 !important;
          color: rgba(74,74,112,.72) !important;
        }

        .sf-free-start-help-card {
          margin-top: -1.1rem !important;
        }

        .sf-free-start-small-tip {
          box-shadow: 0 20px 40px rgba(111,78,182,.08), inset 0 1px 0 rgba(255,255,255,.95) !important;
        }

        @media (max-width: 360px) {
          .sf-free-start-frame {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .sf-free-start-title {
            font-size: 3.52rem;
          }

          .sf-free-start-page.is-recording .sf-free-start-title {
            font-size: 2.82rem;
          }

          .sf-free-start-flow-item {
            font-size: .78rem;
          }
        }
      `}</style>

      <div className="sf-free-start-frame">
        <main>
          <section className="sf-free-start-hero" aria-live="polite">
            <span className="sf-free-start-spark is-left" aria-hidden="true" />
            <span className="sf-free-start-spark is-right" aria-hidden="true" />
            <h1 className="sf-free-start-title">
              {isRecording ? "正在听你说话..." : "先说中文"}
            </h1>
            <p className="sf-free-start-subtitle">
              {isRecording ? (
                <>
                  大胆说出你想表达的中文
                  <span>AI 会一步步帮你优化</span>
                </>
              ) : (
                "AI 帮你变成自然英语"
              )}
            </p>
            <span className="sf-free-start-recording-pill">
              <WaveGlyph />
              录音中
            </span>
          </section>

          <section className="sf-free-start-mic-area">
            <span className="sf-free-start-wave-bars" aria-hidden="true">
              <span className="sf-free-start-wave-group">
                {[24, 48, 64, 46, 28].map((height) => (
                  <span key={`left-${height}`} style={{ height }} />
                ))}
              </span>
              <span className="sf-free-start-wave-group">
                {[28, 46, 64, 48, 24].map((height) => (
                  <span key={`right-${height}`} style={{ height }} />
                ))}
              </span>
            </span>
            <button
              type="button"
              aria-label={isRecording ? "点击麦克风结束录音" : "点这里说中文"}
              onClick={onMicrophoneClick}
              className="sf-free-start-mic"
            >
              <MicGlyph />
            </button>
          </section>

          <button
            type="button"
            onClick={onMicrophoneClick}
            className="sf-free-start-instruction"
          >
            <span className="sf-free-start-instruction-icon" aria-hidden="true">
              {isRecording ? <MicGlyph /> : <SparklesGlyph />}
            </span>
            {isRecording ? "再次点击上方麦克风，结束录音" : "请点击上方麦克风开始说中文"}
          </button>

          <p className="sf-free-start-note">
            免费体验 5 句 · 登录可保存学习记录
          </p>

          <section className="sf-free-start-help-card" aria-label="怎么练">
            <div className="sf-free-start-help-title">
              <span aria-hidden="true">✦</span>
              <h2>怎么练？</h2>
            </div>
            <div className="sf-free-start-flow">
              {flowSteps.map((step) => (
                <div className="sf-free-start-flow-item" key={step.title}>
                  <span className="sf-free-start-flow-icon">
                    <FlowIcon icon={step.icon} />
                  </span>
                  <span>{step.title}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="sf-free-start-small-tip" aria-label="小提示">
            <span className="sf-free-start-small-tip-icon">
              <LightGlyph />
            </span>
            <span>
              <strong>小提示</strong>
              <span>尽量完整表达，你说得越多，AI 给出的建议会越精准！</span>
            </span>
            <WaveGlyph />
          </section>
        </main>
      </div>

      <nav className="sf-free-start-bottom-nav" aria-label="学习导航">
        <button
          type="button"
          className="sf-free-start-bottom-button is-active"
          onClick={onMenuClick}
          aria-label={menuLabel}
        >
          <BottomHomeIcon />
        </button>
        <button
          type="button"
          className="sf-free-start-bottom-button"
          onClick={openProgress}
          aria-label="查看学习进度"
          aria-haspopup="dialog"
          aria-expanded={isProgressOpen}
        >
          <BottomProgressIcon />
        </button>
        <button
          type="button"
          className="sf-free-start-bottom-button"
          onClick={() => setIsHelpOpen(true)}
          aria-label="打开自由学习帮助"
          aria-haspopup="dialog"
          aria-expanded={isHelpOpen}
        >
          <BottomHelpIcon />
        </button>
        <button
          type="button"
          className="sf-free-start-bottom-button"
          onClick={onAccountClick}
          aria-label="打开账户"
        >
          <BottomAccountIcon />
          {hasProEntitlement ? (
            <span className="sf-free-start-bottom-pro">PRO</span>
          ) : null}
        </button>
      </nav>

      {isHelpOpen ? (
        <FreeStudyHelpModal
          onClose={() => setIsHelpOpen(false)}
          onMenuClick={onMenuClick}
        />
      ) : null}

      {isProgressOpen ? (
        <div
          className="sf-free-start-progress-backdrop"
          role="presentation"
          onClick={() => setIsProgressOpen(false)}
        >
          <section
            className="sf-free-start-progress-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sf-free-start-progress-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sf-free-start-progress-head">
              <div>
                <p className="sf-free-start-progress-kicker">学习进度</p>
                <h2 id="sf-free-start-progress-title">自由学习</h2>
              </div>
              <button
                type="button"
                className="sf-free-start-progress-close"
                onClick={() => setIsProgressOpen(false)}
                aria-label="关闭学习进度"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {progressError ? (
              <div className="sf-free-start-progress-error">{progressError}</div>
            ) : isProgressLoading || !progressSnapshot ? (
              <div className="sf-free-start-progress-loading">
                正在同步学习进度...
              </div>
            ) : (
              <>
                <div className="sf-free-start-progress-grid">
                  <div className="sf-free-start-progress-stat">
                    <span>{todayCompleted}</span>
                    <small>今日完成 / {dailyGoal}</small>
                  </div>
                  <div className="sf-free-start-progress-stat">
                    <span>{streakDays}</span>
                    <small>连续天数</small>
                  </div>
                  <div className="sf-free-start-progress-stat">
                    <span>{totalCompleted}</span>
                    <small>累计完成</small>
                  </div>
                </div>

                <div className="sf-free-start-progress-card">
                  <div className="sf-free-start-progress-card-head">
                    <span>今日挑战</span>
                    <strong>
                      {challengeCompleted}/{challengeGoal}
                    </strong>
                  </div>
                  <div className="sf-free-start-progress-track">
                    <span style={{ width: `${challengePercent}%` }} />
                  </div>
                  <p>{challengePercent}% 已完成</p>
                </div>

                <div className="sf-free-start-progress-steps">
                  {progressStepOrder.map((item, index) => {
                    const step = progressSnapshot?.steps?.[item.id];
                    const status = step?.status ?? "locked";

                    return (
                      <div
                        className={`sf-free-start-progress-step is-${status}`}
                        key={item.id}
                      >
                        <span className="sf-free-start-progress-step-index">
                          {index + 1}
                        </span>
                        <span className="sf-free-start-progress-step-copy">
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
