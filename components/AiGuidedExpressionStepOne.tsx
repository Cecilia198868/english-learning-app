"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomeMenuIcon from "@/components/HomeMenuIcon";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";
import type { AiGuidedProgressSnapshot } from "@/lib/aiGuidedExpressionProgress";
import { FREE_PRACTICE_DAILY_LIMIT } from "@/lib/freePracticeLimit";

type SubscriptionStatus = "free" | "pro" | "cancels_at_period_end";

type AccountSubscriptionResponse = {
  cancelAtPeriodEnd?: boolean | null;
  subscriptionStatus?: SubscriptionStatus;
};

type AiGuidedExpressionStepOneProps = {
  onHomeClick?: () => void;
  onStartChineseRecording?: () => void;
  onStopChineseRecording?: () => void;
  recordingState?: "idle" | "recording";
  showGuestProgress?: boolean;
};

const defaultProgress: AiGuidedProgressSnapshot = {
  challenge: {
    completed: 0,
    goal: 10,
    percent: 0,
  },
  dailyGoal: 10,
  level: 1,
  steps: {
    english: { id: "english", label: "待解锁", status: "locked" },
    follow: { id: "follow", label: "待解锁", status: "locked" },
    native: { id: "native", label: "开始练习", status: "active" },
    suggestions: { id: "suggestions", label: "待解锁", status: "locked" },
  },
  streakDays: 0,
  todayCompleted: 0,
  totalCompleted: 0,
};

const learningFlow = [
  {
    icon: "mic",
    title: "说中文",
  },
  {
    icon: "chat",
    title: "试着说英文",
  },
  {
    icon: "robot",
    title: "AI 给你表达",
  },
  {
    icon: "light",
    title: "继续下一句",
  },
] as const;

const helpPracticeSteps = [
  {
    description: "点击麦克风，说出你的想法",
    icon: "mic",
    title: "说中文",
  },
  {
    description: "看着中文，试着用英语表达",
    icon: "chat",
    title: "试着说英文",
  },
  {
    description: "AI 给出更自然、地道的表达方式",
    icon: "robot",
    title: "AI 给你表达",
  },
  {
    description: "跟读并练习，不断进步",
    icon: "light",
    title: "继续下一句",
  },
] as const;

const helpTips = [
  {
    description: "说得越多，AI 理解越准确，给出的建议越好",
    icon: "voice",
    title: "尽量完整表达",
  },
  {
    description: "大胆说就好，AI 会帮你优化表达",
    icon: "smile",
    title: "不用担心语法",
  },
  {
    description: "跟读推荐表达，能帮助你更快掌握地道发音和语感",
    icon: "book",
    title: "跟读更有效",
  },
] as const;

const helpFaqItems = [
  "语音识别不准确怎么办？",
  "可以修改识别出的中文吗？",
  "每天可以免费练习几句？",
  "我的学习记录会保存吗？",
] as const;

function normalizeSubscriptionStatus(
  subscriptionStatus?: SubscriptionStatus | null,
  cancelAtPeriodEnd?: boolean | null
): SubscriptionStatus {
  if (cancelAtPeriodEnd === true) return "cancels_at_period_end";

  return subscriptionStatus === "pro" ||
    subscriptionStatus === "cancels_at_period_end"
    ? subscriptionStatus
    : "free";
}

function hasProAccess(subscriptionStatus: SubscriptionStatus) {
  return subscriptionStatus !== "free";
}

function MicGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 29a8 8 0 0 0 8-8v-8a8 8 0 0 0-16 0v8a8 8 0 0 0 8 8Z" />
      <path d="M11 22a13 13 0 0 0 26 0M24 35v8M18 43h12" />
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

function ChatGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M8 18c0-7 6-12 16-12s16 5 16 12-6 12-16 12c-1.7 0-3.4-.1-4.9-.5L10 36l2.4-8.2C9.6 25.8 8 23.2 8 18Z" />
      <path d="M17 19h.1M24 19h.1M31 19h.1" />
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

function CheckCircleGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="17" />
      <path d="m16 24 6 6 11-13" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 5 19 19M19 5 5 19" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function VoiceWaveGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M13 21v6M19 14v20M25 18v12M31 10v28M37 18v12" />
    </svg>
  );
}

function SmileGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="15" />
      <path d="M18 21h.1M30 21h.1M17 28c4 5 12 5 16 0" />
    </svg>
  );
}

function BookGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M9 13c0-2.2 1.8-4 4-4h11v31H13c-2.2 0-4-1.8-4-4V13ZM24 9h11c2.2 0 4 1.8 4 4v23c0 2.2-1.8 4-4 4H24" />
      <path d="M15 17h5M15 24h5M29 17h5M29 24h5" />
    </svg>
  );
}

function HeartBubbleGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M9 18c0-7 6.2-12 15-12s15 5 15 12-6.2 12-15 12c-1.6 0-3.2-.2-4.6-.5L11 36l2.1-8C10.5 25.9 9 23.1 9 18Z" />
      <path d="M24 24s-6-3.4-6-7.1c0-2 1.5-3.4 3.4-3.4 1.2 0 2.2.6 2.6 1.5.5-.9 1.5-1.5 2.7-1.5 1.9 0 3.3 1.4 3.3 3.4 0 3.7-6 7.1-6 7.1Z" />
    </svg>
  );
}

function FlowIcon({ icon }: { icon: (typeof learningFlow)[number]["icon"] }) {
  if (icon === "robot") return <RobotGlyph />;
  if (icon === "chat") return <ChatGlyph />;
  if (icon === "light") return <LightGlyph />;
  return <MicGlyph />;
}

function HelpTipIcon({ icon }: { icon: (typeof helpTips)[number]["icon"] }) {
  if (icon === "smile") return <SmileGlyph />;
  if (icon === "book") return <BookGlyph />;
  return <VoiceWaveGlyph />;
}

function HelpBoltGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m13.7 2.7-8 11h5.2l-1.1 7.6 8.4-11.6h-5.3l.8-7Z" />
    </svg>
  );
}

function CurvedArrowGlyph() {
  return (
    <svg viewBox="0 0 112 88" aria-hidden="true" focusable="false">
      <path d="M96 8C84 43 60 61 24 63" />
      <path d="M35 47 20 64l20 12" />
    </svg>
  );
}

export default function AiGuidedExpressionStepOne({
  onHomeClick,
  onStartChineseRecording,
  onStopChineseRecording,
  recordingState,
  showGuestProgress = false,
}: AiGuidedExpressionStepOneProps) {
  const router = useRouter();
  const [localRecordingState, setLocalRecordingState] =
    useState<"idle" | "recording">("idle");
  const [progress, setProgress] =
    useState<AiGuidedProgressSnapshot>(defaultProgress);
  const [isAccountPro, setIsAccountPro] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      try {
        const [progressResponse, subscriptionResponse] = await Promise.all([
          fetch("/api/ai-guided-expression/progress", { cache: "no-store" }),
          fetch("/api/me/subscription", { cache: "no-store" }).catch(() => null),
        ]);
        const progressData =
          (await progressResponse.json()) as AiGuidedProgressSnapshot;
        const subscriptionData =
          subscriptionResponse?.ok
            ? ((await subscriptionResponse.json()) as AccountSubscriptionResponse)
            : null;

        if (!cancelled) {
          setProgress(progressData);
          setIsAccountPro(
            hasProAccess(
              normalizeSubscriptionStatus(
                subscriptionData?.subscriptionStatus,
                subscriptionData?.cancelAtPeriodEnd
              )
            )
          );
        }
      } catch {
        if (!cancelled) {
          setProgress(defaultProgress);
          setIsAccountPro(false);
        }
      }
    }

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHelpModalOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsHelpModalOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isHelpModalOpen]);

  const effectiveRecordingState = recordingState ?? localRecordingState;
  const isRecordingChinese = effectiveRecordingState === "recording";

  function openHome() {
    if (onHomeClick) {
      onHomeClick();
      return;
    }

    router.push("/start");
  }

  function startChineseRecording() {
    setLocalRecordingState("recording");
    onStartChineseRecording?.();
  }

  function stopChineseRecording() {
    setLocalRecordingState("idle");
    onStopChineseRecording?.();
  }

  function handleMicrophoneClick() {
    if (isRecordingChinese) {
      stopChineseRecording();
      return;
    }

    startChineseRecording();
  }

  const dailyGoal = Math.max(progress.dailyGoal, 1);
  const todayCompleted = Math.max(progress.todayCompleted, 0);
  const freeUsed = Math.min(todayCompleted, FREE_PRACTICE_DAILY_LIMIT);
  const isGuestTrial = showGuestProgress || !isAccountPro;
  const trialCompleted = isGuestTrial ? freeUsed : todayCompleted;
  const trialGoal = isGuestTrial ? FREE_PRACTICE_DAILY_LIMIT : dailyGoal;
  const practiceStatusLabel = isGuestTrial
    ? `今日免费 ${trialCompleted}/${trialGoal}`
    : `今日练习 ${trialCompleted}/${trialGoal}`;
  const noteText = `免费体验 ${FREE_PRACTICE_DAILY_LIMIT} 句 · 登录可保存学习记录`;
  const titleText = isRecordingChinese ? "正在听你说话..." : "先说中文";
  const subtitleText = isRecordingChinese
    ? "大胆说出你想表达的中文"
    : "AI 帮你变成自然英语";
  const secondarySubtitleText = isRecordingChinese
    ? "AI 会一步步帮你优化"
    : "";
  const primaryButtonText = isRecordingChinese
    ? "点击麦克风结束录音"
    : "点我说中文";

  return (
    <main
      className={`sf-ai-guide-start-page ${
        isRecordingChinese ? "is-recording" : "is-idle"
      } ${isHelpModalOpen ? "is-help-open" : ""}`}
    >
      <style>{`
        .sf-ai-guide-start-page,
        .sf-ai-guide-start-page * {
          box-sizing: border-box;
        }

        .sf-speak-page:has(.sf-ai-guide-start-page) {
          background:
            radial-gradient(circle at 16% 4%, rgba(220, 239, 255, 0.86), transparent 30%),
            radial-gradient(circle at 92% 0%, rgba(235, 229, 255, 0.88), transparent 28%),
            linear-gradient(180deg, #eef8ff 0%, #f9fcff 48%, #edf5ff 100%) !important;
        }

        .sf-speak-page:has(.sf-ai-guide-start-page) > div {
          width: 100vw !important;
          max-width: none !important;
          min-height: 100dvh !important;
          align-items: stretch !important;
          justify-content: center !important;
          padding: 0 !important;
        }

        .sf-speak-page:has(.sf-ai-guide-start-page) .sf-speak-phone {
          width: min(100vw, 430px) !important;
          max-width: 430px !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          border: 0 !important;
          border-radius: 0 !important;
          background:
            radial-gradient(circle at 50% 34%, rgba(255, 255, 255, 0.76), transparent 34%),
            radial-gradient(circle at 82% 36%, rgba(230, 238, 255, 0.68), transparent 35%),
            linear-gradient(180deg, #eef8ff 0%, #f9fcff 44%, #edf5ff 100%) !important;
          box-shadow: none !important;
        }

        .sf-speak-page:has(.sf-ai-guide-start-page) .sf-speak-phone::before,
        .sf-speak-page:has(.sf-ai-guide-start-page) .sf-speak-phone::after,
        .sf-speak-page:has(.sf-ai-guide-start-page) .sf-speak-phone > .pointer-events-none {
          display: none !important;
        }

        .sf-speak-page:has(.sf-ai-guide-start-page) .sf-speak-phone > .absolute:has(.sf-ai-guide-start-page) {
          z-index: 200 !important;
          overflow: hidden !important;
        }

        .sf-ai-guide-start-page {
          width: 100%;
          height: 100%;
          min-height: 100%;
          display: flex;
          align-items: stretch;
          justify-content: flex-start;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 0;
          color: #08143f;
          background:
            radial-gradient(circle at 18% 18%, rgba(220, 242, 255, 0.78), transparent 34%),
            radial-gradient(circle at 78% 38%, rgba(238, 232, 255, 0.64), transparent 33%),
            linear-gradient(180deg, #eef8ff 0%, #f8fbff 48%, #f4f8ff 100%);
          font-family: var(--sf-font-zh, "PingFang SC", "Microsoft YaHei", sans-serif);
        }

        .sf-ai-guide-start-page.is-help-open {
          overflow: hidden;
        }

        .sf-ai-guide-start-phone {
          width: 100%;
          max-width: 100%;
          min-height: 100%;
          margin: 0;
        }

        .sf-ai-guide-start-frame {
          position: relative;
          isolation: isolate;
          min-height: 100%;
          overflow-x: hidden;
          padding: calc(env(safe-area-inset-top, 0px) + 1.2rem) clamp(1.3rem, 5vw, 1.9rem)
            calc(env(safe-area-inset-bottom, 0px) + 1.5rem);
        }

        .sf-ai-guide-start-frame::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -2;
          background:
            radial-gradient(circle at 50% 44%, rgba(255, 255, 255, 0.96), transparent 36%),
            radial-gradient(circle at 50% 57%, rgba(146, 196, 255, 0.28), transparent 43%);
        }

        .sf-ai-guide-start-frame::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.16) 1px, transparent 1px),
            linear-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1px);
          background-size: 4.2rem 4.2rem;
          opacity: 0.22;
        }

        .sf-ai-guide-start-header {
          display: grid;
          grid-template-columns: 3rem minmax(0, 1fr) 3rem;
          align-items: center;
          gap: 0.6rem;
          min-height: 4.6rem;
        }

        .sf-ai-guide-start-home-button,
        .sf-ai-guide-start-help-button {
          display: grid;
          width: 3rem;
          height: 3rem;
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.8);
          color: #11162f;
          box-shadow:
            0 14px 28px rgba(67, 101, 176, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .sf-ai-guide-start-home-button:active,
        .sf-ai-guide-start-help-button:active,
        .sf-ai-guide-start-mic-button:active,
        .sf-ai-guide-start-primary-button:active {
          transform: scale(0.97);
        }

        .sf-ai-guide-start-home-button:focus-visible,
        .sf-ai-guide-start-help-button:focus-visible,
        .sf-ai-guide-start-mic-button:focus-visible,
        .sf-ai-guide-start-primary-button:focus-visible,
        .sf-ai-guide-start-help-modal-close:focus-visible,
        .sf-ai-guide-start-faq-row:focus-visible {
          outline: 3px solid rgba(61, 115, 255, 0.36);
          outline-offset: 4px;
        }

        .sf-ai-guide-start-home-button .sf-home-menu-icon {
          display: grid;
          width: 1.95rem;
          height: 1.95rem;
          place-items: center;
          color: #12162f;
        }

        .sf-ai-guide-start-home-button .sf-home-menu-icon svg {
          width: 1.95rem;
          height: 1.95rem;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2.8;
        }

        .sf-ai-guide-start-help-button {
          justify-self: end;
          font-size: 1.42rem;
          font-weight: 900;
          line-height: 1;
        }

        .sf-ai-guide-start-brand {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          gap: clamp(0.65rem, 2.4vw, 0.9rem);
          text-align: left;
        }

        .sf-ai-guide-start-logo {
          display: grid;
          width: 3.1rem;
          height: 3.1rem;
          flex: 0 0 auto;
          place-items: center;
          border-radius: 1.18rem;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 18px 34px rgba(91, 118, 201, 0.15);
        }

        .sf-ai-guide-start-logo-mark {
          width: 72%;
          height: 72%;
        }

        .sf-ai-guide-start-brand-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .sf-ai-guide-start-brand-title {
          color: #08133f;
          font-size: 1.95rem;
          font-weight: 950;
          letter-spacing: 0;
          line-height: 0.94;
        }

        .sf-ai-guide-start-brand-subtitle {
          margin-top: 0.32rem;
          color: #3473f4 !important;
          font-size: 0.72rem;
          font-weight: 760;
          letter-spacing: 0;
          line-height: 1;
        }

        .sf-ai-guide-start-hero {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: clamp(2.2rem, 7dvh, 3.4rem);
          text-align: center;
        }

        .sf-ai-guide-start-sparkle {
          position: absolute;
          width: 1rem;
          height: 1rem;
          pointer-events: none;
          transform: rotate(45deg);
          background: linear-gradient(135deg, #9d6bff, #5792ff);
          clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
          opacity: 0.9;
        }

        .sf-ai-guide-start-sparkle-left {
          left: 8%;
          top: 1.2rem;
        }

        .sf-ai-guide-start-sparkle-right {
          right: 5%;
          top: 0.1rem;
          width: 1.2rem;
          height: 1.2rem;
          background: rgba(255, 255, 255, 0.95);
        }

        .sf-ai-guide-start-title {
          margin: 0;
          color: transparent !important;
          background: linear-gradient(94deg, #07133f 0%, #07133f 38%, #306fff 72%, #3c7cff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          font-size: 4.08rem;
          font-weight: 950 !important;
          letter-spacing: 0;
          line-height: 0.98;
          text-shadow: 0 24px 54px rgba(52, 109, 255, 0.12);
        }

        .sf-ai-guide-start-subtitle {
          position: relative;
          margin: clamp(1rem, 3vw, 1.25rem) 0 0;
          color: rgba(40, 50, 91, 0.72) !important;
          font-size: 1.42rem;
          font-weight: 620 !important;
          letter-spacing: 0;
          line-height: 1.22;
        }

        .sf-ai-guide-start-subtitle::after {
          content: "";
          position: absolute;
          right: 0.2rem;
          bottom: -0.5rem;
          width: 54%;
          height: 0.32rem;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(57, 125, 255, 0.48), transparent);
          transform: rotate(-1deg);
        }

        .sf-ai-guide-start-subtitle-secondary {
          margin-top: 0.5rem;
        }

        .sf-ai-guide-start-subtitle-secondary::after {
          display: none;
        }

        .sf-ai-guide-start-recording-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          margin-top: 1.05rem;
          color: #2d74ff !important;
          font-size: 1.08rem;
          font-weight: 880 !important;
          line-height: 1;
        }

        .sf-ai-guide-start-status-wave {
          display: inline-flex;
          height: 2rem;
          align-items: center;
          gap: 0.18rem;
          color: #2d74ff !important;
        }

        .sf-ai-guide-start-status-wave span {
          display: block;
          width: 0.18rem;
          border-radius: 999px;
          background: currentColor;
          animation: sf-ai-guide-start-wave 920ms ease-in-out infinite;
        }

        .sf-ai-guide-start-status-wave span:nth-child(2) {
          animation-delay: 90ms;
        }

        .sf-ai-guide-start-status-wave span:nth-child(3) {
          animation-delay: 180ms;
        }

        .sf-ai-guide-start-status-wave span:nth-child(4) {
          animation-delay: 270ms;
        }

        .sf-ai-guide-start-status-wave span:nth-child(5) {
          animation-delay: 360ms;
        }

        .sf-ai-guide-start-mic-wrap {
          position: relative;
          display: grid;
          place-items: center;
          margin: clamp(2.8rem, 7dvh, 4.2rem) auto 0;
          width: min(72vw, 17rem);
          aspect-ratio: 1;
        }

        .sf-ai-guide-start-mic-wrap::before,
        .sf-ai-guide-start-mic-wrap::after {
          content: "";
          position: absolute;
          inset: -18%;
          border-radius: 999px;
          border: 1px solid rgba(133, 178, 255, 0.2);
          background: radial-gradient(circle, rgba(80, 133, 255, 0.17), transparent 62%);
          filter: blur(0.2px);
        }

        .sf-ai-guide-start-mic-wrap::after {
          inset: -8%;
          border-color: rgba(255, 255, 255, 0.68);
          background: transparent;
          box-shadow:
            0 0 0 0.75rem rgba(255, 255, 255, 0.45),
            0 0 4.4rem rgba(52, 111, 255, 0.28);
        }

        .sf-ai-guide-start-mic-button {
          position: relative;
          z-index: 1;
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          border: 3px solid rgba(255, 255, 255, 0.92);
          border-radius: 999px;
          background:
            radial-gradient(circle at 34% 25%, rgba(255, 255, 255, 0.22), transparent 30%),
            linear-gradient(135deg, #b35cff 0%, #5b65ff 48%, #1976ff 100%);
          color: #ffffff !important;
          box-shadow:
            0 2rem 4.5rem rgba(44, 105, 232, 0.28),
            0 0 3rem rgba(152, 96, 255, 0.28),
            inset 0 0.22rem 0.5rem rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .sf-ai-guide-start-mic-button:hover {
          box-shadow:
            0 2.2rem 5rem rgba(44, 105, 232, 0.32),
            0 0 3.6rem rgba(152, 96, 255, 0.34),
            inset 0 0.22rem 0.5rem rgba(255, 255, 255, 0.24);
        }

        .sf-ai-guide-start-mic-button svg {
          width: 48%;
          height: 48%;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 3.2;
        }

        .sf-ai-guide-start-mic-button svg,
        .sf-ai-guide-start-mic-button svg * {
          color: #ffffff !important;
          stroke: currentColor !important;
        }

        .sf-ai-guide-start-record-wave {
          position: absolute;
          top: 50%;
          z-index: 0;
          width: 5.5rem;
          height: 4.9rem;
          transform: translateY(-50%);
          opacity: 0.5;
          background:
            linear-gradient(90deg, transparent 0 8%, rgba(126, 97, 255, 0.22) 8% 13%, transparent 13% 20%),
            linear-gradient(90deg, transparent 20% 27%, rgba(126, 97, 255, 0.32) 27% 33%, transparent 33% 41%),
            linear-gradient(90deg, transparent 41% 47%, rgba(70, 125, 255, 0.42) 47% 54%, transparent 54% 62%),
            linear-gradient(90deg, transparent 62% 68%, rgba(70, 125, 255, 0.32) 68% 74%, transparent 74% 82%),
            linear-gradient(90deg, transparent 82% 88%, rgba(126, 97, 255, 0.22) 88% 93%, transparent 93% 100%);
          border-radius: 999px;
          filter: blur(0.2px);
          animation: sf-ai-guide-start-wave-float 1.8s ease-in-out infinite;
        }

        .sf-ai-guide-start-record-wave-left {
          left: -2.45rem;
        }

        .sf-ai-guide-start-record-wave-right {
          right: -2.45rem;
          transform: translateY(-50%) scaleX(-1);
          animation-delay: 220ms;
        }

        .sf-ai-guide-start-tip-bubble {
          position: absolute;
          right: -0.1rem;
          top: -2.7rem;
          z-index: 3;
          display: inline-flex;
          min-height: 3.15rem;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(161, 183, 222, 0.45);
          border-radius: 999px;
          padding: 0 1.1rem;
          background: rgba(255, 255, 255, 0.82);
          color: #2d74ff !important;
          font-size: 1rem;
          font-weight: 860 !important;
          letter-spacing: 0;
          line-height: 1.1;
          white-space: nowrap;
          box-shadow:
            0 16px 34px rgba(72, 111, 190, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .sf-ai-guide-start-tip-arrow {
          position: absolute;
          right: 1rem;
          top: 1rem;
          z-index: 2;
          width: 5rem;
          height: 4.6rem;
          color: #4d7dff;
          transform: translate(38%, 10%);
        }

        .sf-ai-guide-start-tip-arrow svg {
          width: 100%;
          height: 100%;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 7;
        }

        .sf-ai-guide-start-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: clamp(1.8rem, 4.8dvh, 2.8rem);
        }

        .sf-ai-guide-start-primary-button {
          display: flex;
          width: min(100%, 21.5rem);
          max-width: calc(100vw - 3rem);
          min-height: clamp(4.35rem, 10dvh, 5.05rem);
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          border: 0;
          border-radius: 999px;
          padding: 0.6rem 1.8rem;
          background: linear-gradient(100deg, #39b9ff 0%, #3479ff 46%, #154cff 100%);
          color: #ffffff !important;
          box-shadow:
            0 1.2rem 2.4rem rgba(34, 91, 239, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.35);
          cursor: pointer;
          font-size: 1.85rem;
          font-weight: 940;
          letter-spacing: 0;
          line-height: 1.1;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .sf-ai-guide-start-primary-button:hover {
          box-shadow:
            0 1.45rem 2.8rem rgba(34, 91, 239, 0.26),
            inset 0 1px 0 rgba(255, 255, 255, 0.42);
        }

        .sf-ai-guide-start-primary-button,
        .sf-ai-guide-start-primary-button * {
          color: #ffffff !important;
        }

        .sf-ai-guide-start-button-icon {
          font-size: 1.95rem;
          line-height: 1;
        }

        .sf-ai-guide-start-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          margin: 1rem 0 0;
          color: rgba(50, 60, 100, 0.72) !important;
          font-size: 1.02rem;
          font-weight: 620;
          line-height: 1.35;
          text-align: center;
        }

        .sf-ai-guide-start-note svg {
          width: 1.2rem;
          height: 1.2rem;
          flex: 0 0 auto;
          fill: none;
          stroke: #a779ff;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 3.2;
        }

        .sf-ai-guide-start-help-card {
          margin: clamp(1.45rem, 3.5dvh, 2.2rem) 0 0;
          border: 1px solid rgba(222, 231, 246, 0.72);
          border-radius: 1.35rem;
          padding: clamp(1.1rem, 4vw, 1.45rem);
          background: rgba(255, 255, 255, 0.74);
          box-shadow:
            0 22px 48px rgba(73, 101, 166, 0.11),
            inset 0 1px 0 rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .sf-ai-guide-start-tip-content {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 1rem;
        }

        .sf-ai-guide-start-tip-icon {
          display: grid;
          width: 3.8rem;
          height: 3.8rem;
          place-items: center;
          border-radius: 999px;
          background: rgba(239, 242, 255, 0.95);
          color: #5f72ff !important;
        }

        .sf-ai-guide-start-tip-icon svg {
          width: 58%;
          height: 58%;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 3.2;
        }

        .sf-ai-guide-start-tip-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 0.35rem;
          color: #26325f !important;
          line-height: 1.45;
          text-align: left;
        }

        .sf-ai-guide-start-tip-copy strong {
          color: #101943 !important;
          font-size: 1.08rem;
          font-weight: 920 !important;
          line-height: 1.2;
        }

        .sf-ai-guide-start-tip-copy span {
          color: rgba(50, 60, 100, 0.78) !important;
          font-size: 0.95rem;
          font-weight: 640 !important;
          line-height: 1.45;
        }

        .sf-ai-guide-start-tip-mini-wave {
          display: inline-flex;
          height: 3rem;
          align-items: center;
          gap: 0.18rem;
          color: #ae8cff !important;
        }

        .sf-ai-guide-start-tip-mini-wave span {
          display: block;
          width: 0.22rem;
          border-radius: 999px;
          background: currentColor;
          opacity: 0.72;
          animation: sf-ai-guide-start-wave 1s ease-in-out infinite;
        }

        .sf-ai-guide-start-help-title {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin: 0;
          color: #101943 !important;
          font-size: 1.16rem;
          font-weight: 920;
          letter-spacing: 0;
          line-height: 1.2;
        }

        .sf-ai-guide-start-help-title svg {
          width: 1.25rem;
          height: 1.25rem;
          fill: #5d73ff;
        }

        .sf-ai-guide-start-steps {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: start;
          gap: 0.55rem;
          margin-top: 1.1rem;
        }

        .sf-ai-guide-start-step {
          position: relative;
          display: grid;
          min-width: 0;
          justify-items: center;
          gap: 0.48rem;
          color: #26325f !important;
          text-align: center;
        }

        .sf-ai-guide-start-step:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 1.25rem;
          left: calc(50% + 1.75rem);
          width: calc(100% - 2.7rem);
          border-top: 2px dashed rgba(99, 127, 255, 0.28);
        }

        .sf-ai-guide-start-step-icon {
          display: grid;
          width: clamp(2.9rem, 11vw, 3.45rem);
          height: clamp(2.9rem, 11vw, 3.45rem);
          place-items: center;
          border-radius: 999px;
          background: rgba(242, 246, 255, 0.92);
          color: #5d75ff !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
        }

        .sf-ai-guide-start-step-icon svg {
          width: 58%;
          height: 58%;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 3.2;
        }

        .sf-ai-guide-start-step:nth-child(1) .sf-ai-guide-start-step-icon {
          color: #8d65ff !important;
        }

        .sf-ai-guide-start-step span:last-child {
          max-width: 4.5rem;
          color: #26325f !important;
          font-size: 0.88rem;
          font-weight: 720;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-title {
          color: transparent !important;
        }

        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-subtitle,
        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-note {
          color: rgba(50, 60, 100, 0.72) !important;
        }

        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-primary-button,
        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-primary-button *,
        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-mic-button,
        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-mic-button * {
          color: #ffffff !important;
        }

        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-mic-button svg,
        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-mic-button svg * {
          stroke: #ffffff !important;
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-hero {
          margin-top: clamp(2.2rem, 5.5dvh, 3rem);
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-title {
          font-size: 3.45rem;
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-mic-wrap {
          margin-top: clamp(2.2rem, 5.2dvh, 3.4rem);
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-mic-wrap::before {
          animation: sf-ai-guide-start-pulse 1.7s ease-in-out infinite;
          background:
            radial-gradient(circle, rgba(132, 93, 255, 0.22), transparent 62%);
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-mic-wrap::after {
          box-shadow:
            0 0 0 0.75rem rgba(255, 255, 255, 0.55),
            0 0 5.2rem rgba(122, 88, 255, 0.34);
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-primary-button {
          font-size: 1.42rem;
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-help-card {
          margin-top: 1.35rem;
        }

        .sf-ai-guide-start-help-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow: hidden;
          padding: calc(env(safe-area-inset-top, 0px) + 5.8rem)
            clamp(0.6rem, 3vw, 1.1rem)
            calc(env(safe-area-inset-bottom, 0px) + 1rem);
          background: rgba(18, 28, 48, 0.38);
          backdrop-filter: blur(12px);
        }

        .sf-ai-guide-start-help-modal {
          width: min(100%, 24.1rem);
          max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 6.8rem);
          overflow-y: auto;
          overscroll-behavior: contain;
          border: 1px solid rgba(211, 225, 255, 0.92);
          border-radius: 1.55rem;
          background:
            radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.98), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(248, 252, 255, 0.97));
          box-shadow:
            0 34px 74px rgba(20, 36, 77, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          padding: clamp(1.15rem, 4.4vw, 1.55rem);
          scrollbar-width: none;
        }

        .sf-ai-guide-start-help-modal::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .sf-ai-guide-start-help-modal-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 3rem;
          align-items: start;
          gap: 1rem;
        }

        .sf-ai-guide-start-help-modal-title {
          margin: 0;
          color: #08133f;
          font-size: 1.48rem;
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1.12;
        }

        .sf-ai-guide-start-help-modal-subtitle {
          margin: 0.55rem 0 0;
          color: rgba(55, 71, 120, 0.76);
          font-size: 0.98rem;
          font-weight: 560;
          line-height: 1.32;
        }

        .sf-ai-guide-start-help-modal-close {
          display: grid;
          width: 2.7rem;
          height: 2.7rem;
          place-items: center;
          justify-self: end;
          border: 1px solid rgba(207, 222, 252, 0.88);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          color: #172147;
          box-shadow:
            0 12px 24px rgba(67, 101, 176, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          cursor: pointer;
        }

        .sf-ai-guide-start-help-modal-close svg {
          width: 1.45rem;
          height: 1.45rem;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-width: 2.4;
        }

        .sf-ai-guide-start-help-section {
          margin-top: 1rem;
          border: 1px solid rgba(215, 226, 250, 0.86);
          border-radius: 1.02rem;
          background: rgba(255, 255, 255, 0.78);
          box-shadow:
            0 16px 34px rgba(69, 105, 174, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.94);
          padding: 1rem;
        }

        .sf-ai-guide-start-help-section-title {
          display: inline-flex;
          align-items: center;
          gap: 0.54rem;
          margin: 0;
          color: #07123c;
          font-size: 1.08rem;
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1.1;
        }

        .sf-ai-guide-start-help-section-title svg {
          width: 1rem;
          height: 1rem;
          fill: #865fff;
          filter: drop-shadow(0 6px 12px rgba(126, 99, 255, 0.2));
        }

        .sf-ai-guide-start-help-flow-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: start;
          gap: 0.5rem;
          margin-top: 0.95rem;
        }

        .sf-ai-guide-start-help-flow-step {
          position: relative;
          display: grid;
          min-width: 0;
          justify-items: center;
          text-align: center;
        }

        .sf-ai-guide-start-help-flow-step:not(:last-child)::after {
          content: "";
          position: absolute;
          left: calc(50% + 1.7rem);
          top: 1.45rem;
          width: calc(100% - 2.7rem);
          border-top: 2px dashed rgba(91, 120, 252, 0.25);
        }

        .sf-ai-guide-start-help-flow-icon {
          display: grid;
          width: 3.15rem;
          height: 3.15rem;
          place-items: center;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(241, 246, 255, 0.98), rgba(233, 239, 255, 0.8));
          color: #4c7eff;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.96);
        }

        .sf-ai-guide-start-help-flow-icon svg {
          width: 1.75rem;
          height: 1.75rem;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 3.2;
        }

        .sf-ai-guide-start-help-flow-index {
          display: grid;
          width: 1.5rem;
          height: 1.5rem;
          place-items: center;
          margin-top: -0.2rem;
          border-radius: 999px;
          background: linear-gradient(135deg, #9362ff, #377dff);
          color: #fff;
          font-size: 0.76rem;
          font-weight: 900;
          box-shadow: 0 8px 16px rgba(78, 111, 255, 0.24);
        }

        .sf-ai-guide-start-help-flow-name {
          margin-top: 0.42rem;
          color: #07133f;
          font-size: 0.83rem;
          font-weight: 850;
          line-height: 1.18;
        }

        .sf-ai-guide-start-help-flow-description {
          margin-top: 0.42rem;
          color: rgba(54, 72, 122, 0.74);
          font-size: 0.7rem;
          font-weight: 540;
          line-height: 1.34;
        }

        .sf-ai-guide-start-tip-list {
          margin-top: 0.85rem;
          border: 1px solid rgba(217, 228, 252, 0.92);
          border-radius: 0.9rem;
          background: rgba(255, 255, 255, 0.58);
          overflow: hidden;
        }

        .sf-ai-guide-start-tip-row {
          display: grid;
          grid-template-columns: 3rem minmax(0, 1fr);
          align-items: center;
          gap: 0.8rem;
          padding: 0.72rem 0.75rem;
        }

        .sf-ai-guide-start-tip-row + .sf-ai-guide-start-tip-row {
          border-top: 1px solid rgba(216, 226, 249, 0.85);
        }

        .sf-ai-guide-start-tip-row-icon {
          display: grid;
          width: 2.72rem;
          height: 2.72rem;
          place-items: center;
          border-radius: 999px;
          background: linear-gradient(135deg, #a269ff, #377fff);
          color: #fff;
          box-shadow: 0 10px 22px rgba(79, 111, 255, 0.23);
        }

        .sf-ai-guide-start-tip-row:nth-child(2) .sf-ai-guide-start-tip-row-icon {
          background: linear-gradient(135deg, #83b8ff, #397fff);
        }

        .sf-ai-guide-start-tip-row-icon svg {
          width: 1.55rem;
          height: 1.55rem;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2.6;
        }

        .sf-ai-guide-start-tip-row-title {
          display: block;
          color: #08143f;
          font-size: 0.95rem;
          font-weight: 870;
          line-height: 1.18;
        }

        .sf-ai-guide-start-tip-row-description {
          display: block;
          margin-top: 0.25rem;
          color: rgba(54, 72, 122, 0.74);
          font-size: 0.76rem;
          font-weight: 540;
          line-height: 1.32;
        }

        .sf-ai-guide-start-faq-list {
          display: grid;
          gap: 0.48rem;
          margin-top: 0.85rem;
        }

        .sf-ai-guide-start-faq-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 1.2rem;
          align-items: center;
          width: 100%;
          min-height: 2.5rem;
          border: 1px solid rgba(217, 228, 252, 0.86);
          border-radius: 0.72rem;
          background: rgba(255, 255, 255, 0.76);
          color: rgba(33, 49, 88, 0.88);
          padding: 0 0.68rem 0 0.82rem;
          text-align: left;
          cursor: default;
          box-shadow: 0 8px 18px rgba(67, 101, 176, 0.06);
        }

        .sf-ai-guide-start-faq-row span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.86rem;
          font-weight: 620;
          line-height: 1.2;
        }

        .sf-ai-guide-start-faq-row svg {
          width: 1.05rem;
          height: 1.05rem;
          justify-self: end;
          fill: none;
          stroke: rgba(40, 57, 101, 0.72);
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2.2;
        }

        .sf-ai-guide-start-encourage-card {
          position: relative;
          display: grid;
          grid-template-columns: 3.8rem minmax(0, 1fr);
          align-items: center;
          gap: 0.85rem;
          margin-top: 1rem;
          border: 1px solid rgba(215, 226, 250, 0.82);
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.7);
          box-shadow:
            0 14px 30px rgba(69, 105, 174, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.94);
          padding: 0.9rem 1.02rem;
          overflow: hidden;
        }

        .sf-ai-guide-start-encourage-icon {
          display: grid;
          width: 3.2rem;
          height: 3.2rem;
          place-items: center;
          border-radius: 1.2rem;
          background: linear-gradient(135deg, rgba(171, 140, 255, 0.32), rgba(86, 132, 255, 0.16));
          color: #7b62ff;
        }

        .sf-ai-guide-start-encourage-icon svg {
          width: 2.25rem;
          height: 2.25rem;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2.4;
        }

        .sf-ai-guide-start-encourage-title {
          display: block;
          color: #07133f;
          font-size: 1.02rem;
          font-weight: 900;
          line-height: 1.2;
        }

        .sf-ai-guide-start-encourage-copy {
          display: block;
          margin-top: 0.32rem;
          color: rgba(54, 72, 122, 0.72);
          font-size: 0.86rem;
          font-weight: 560;
          line-height: 1.25;
        }

        .sf-ai-guide-start-encourage-sparkles {
          position: absolute;
          right: 1rem;
          top: 1.15rem;
          display: flex;
          gap: 0.45rem;
          color: #7a65ff;
          font-size: 1.08rem;
          opacity: 0.86;
        }

        @keyframes sf-ai-guide-start-wave {
          0%,
          100% {
            transform: scaleY(0.58);
            opacity: 0.58;
          }

          50% {
            transform: scaleY(1.12);
            opacity: 1;
          }
        }

        @keyframes sf-ai-guide-start-pulse {
          0%,
          100% {
            transform: scale(0.98);
            opacity: 0.72;
          }

          50% {
            transform: scale(1.04);
            opacity: 1;
          }
        }

        @keyframes sf-ai-guide-start-wave-float {
          0%,
          100% {
            opacity: 0.36;
          }

          50% {
            opacity: 0.66;
          }
        }

        @media (min-width: 720px) {
          .sf-ai-guide-start-page {
            justify-content: center;
          }

          .sf-ai-guide-start-phone {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
          }

          .sf-ai-guide-start-frame {
            min-height: 100%;
            padding-top: calc(env(safe-area-inset-top, 0px) + 1.55rem);
          }

          .sf-ai-guide-start-brand-title {
            font-size: 2.9rem;
          }

          .sf-ai-guide-start-title {
            font-size: 5.55rem;
          }

          .sf-ai-guide-start-subtitle {
            font-size: 1.95rem;
          }

          .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-title {
            font-size: 4.2rem;
          }

          .sf-ai-guide-start-primary-button {
            width: min(100%, 25.8rem);
          }
        }

        @media (max-width: 480px) {
          .sf-ai-guide-start-frame {
            padding-inline: 1.05rem;
          }

          .sf-ai-guide-start-header {
            grid-template-columns: 2.8rem minmax(0, 1fr) 2.8rem;
          }

          .sf-ai-guide-start-home-button,
          .sf-ai-guide-start-help-button {
            width: 2.8rem;
            height: 2.8rem;
          }

          .sf-ai-guide-start-logo {
            width: 2.8rem;
            height: 2.8rem;
            border-radius: 0.95rem;
          }

          .sf-ai-guide-start-brand-title {
            font-size: 1.72rem;
          }

          .sf-ai-guide-start-brand-subtitle {
            font-size: 0.68rem;
          }

          .sf-ai-guide-start-title {
            font-size: 3.75rem;
          }

          .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-title {
            font-size: 2.95rem;
          }

          .sf-ai-guide-start-subtitle {
            font-size: 1.34rem;
          }

          .sf-ai-guide-start-subtitle-secondary {
            font-size: 1.2rem;
          }

          .sf-ai-guide-start-tip-bubble {
            right: -0.25rem;
            top: -2.55rem;
            min-height: 2.75rem;
            padding-inline: 0.88rem;
            font-size: 0.96rem;
          }

          .sf-ai-guide-start-tip-arrow {
            right: 0.15rem;
            width: 4.4rem;
          }

          .sf-ai-guide-start-primary-button {
            min-height: 4rem;
            font-size: 1.45rem;
          }

          .sf-ai-guide-start-button-icon {
            font-size: 1.55rem;
          }

          .sf-ai-guide-start-note {
            font-size: 0.86rem;
          }

          .sf-ai-guide-start-tip-content {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .sf-ai-guide-start-tip-icon {
            width: 3.1rem;
            height: 3.1rem;
          }

          .sf-ai-guide-start-tip-mini-wave {
            display: none;
          }

          .sf-ai-guide-start-help-title {
            font-size: 0.98rem;
          }

          .sf-ai-guide-start-steps {
            gap: 0.3rem;
          }

          .sf-ai-guide-start-step span:last-child {
            font-size: 0.74rem;
          }

          .sf-ai-guide-start-step:not(:last-child)::after {
            left: calc(50% + 1.45rem);
            width: calc(100% - 2.35rem);
          }

          .sf-ai-guide-start-help-modal-backdrop {
            padding-top: calc(env(safe-area-inset-top, 0px) + 5.15rem);
          }

          .sf-ai-guide-start-help-modal {
            max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 6rem);
            padding: 1.08rem;
          }

          .sf-ai-guide-start-help-section {
            padding: 0.86rem;
          }

          .sf-ai-guide-start-help-flow-grid {
            gap: 0.35rem;
          }

          .sf-ai-guide-start-help-flow-icon {
            width: 2.72rem;
            height: 2.72rem;
          }

          .sf-ai-guide-start-help-flow-icon svg {
            width: 1.55rem;
            height: 1.55rem;
          }

          .sf-ai-guide-start-help-flow-index {
            width: 1.34rem;
            height: 1.34rem;
            font-size: 0.68rem;
          }

          .sf-ai-guide-start-help-flow-name {
            font-size: 0.76rem;
          }

          .sf-ai-guide-start-help-flow-description {
            font-size: 0.64rem;
          }

          .sf-ai-guide-start-tip-row {
            grid-template-columns: 2.55rem minmax(0, 1fr);
            gap: 0.68rem;
            padding: 0.64rem;
          }

          .sf-ai-guide-start-tip-row-icon {
            width: 2.42rem;
            height: 2.42rem;
          }

          .sf-ai-guide-start-faq-row span {
            font-size: 0.8rem;
          }
        }

        @media (max-height: 760px) {
          .sf-ai-guide-start-frame {
            overflow-y: auto;
          }

          .sf-ai-guide-start-hero {
            margin-top: 1.5rem;
          }

          .sf-ai-guide-start-mic-wrap {
            margin-top: 3.1rem;
            width: min(64vw, 15rem);
          }

          .sf-ai-guide-start-actions {
            margin-top: 2.2rem;
          }

          .sf-ai-guide-start-help-card {
            margin-top: 2rem;
          }
        }
      `}</style>
      <section
        className="sf-ai-guide-start-phone"
        aria-label="AI 引导表达学习第一页"
      >
        <div className="sf-ai-guide-start-frame">
          <header className="sf-ai-guide-start-header">
            <button
              type="button"
              aria-label="回到首页"
              onClick={openHome}
              className="sf-ai-guide-start-home-button"
            >
              <HomeMenuIcon label={null} showHint={false} />
            </button>

            <div
              className="sf-ai-guide-start-brand"
              aria-label="SpeakFlow AI Voice Practice"
            >
              <span className="sf-ai-guide-start-logo">
                <SpeakFlowBrandMark className="sf-ai-guide-start-logo-mark" />
              </span>
              <span className="sf-ai-guide-start-brand-copy">
                <span className="sf-ai-guide-start-brand-title">SpeakFlow</span>
                <span className="sf-ai-guide-start-brand-subtitle">
                  AI VOICE PRACTICE
                </span>
              </span>
            </div>

            <button
              type="button"
              aria-label="查看帮助"
              className="sf-ai-guide-start-help-button"
              aria-expanded={isHelpModalOpen}
              aria-controls="sf-ai-guide-start-help-modal"
              onClick={() => setIsHelpModalOpen(true)}
            >
              ?
            </button>
          </header>

          <section className="sf-ai-guide-start-hero">
            <span
              aria-hidden="true"
              className="sf-ai-guide-start-sparkle sf-ai-guide-start-sparkle-left"
            />
            <span
              aria-hidden="true"
              className="sf-ai-guide-start-sparkle sf-ai-guide-start-sparkle-right"
            />
            <h1 className="sf-ai-guide-start-title">{titleText}</h1>
            <p className="sf-ai-guide-start-subtitle">{subtitleText}</p>
            {secondarySubtitleText ? (
              <p className="sf-ai-guide-start-subtitle sf-ai-guide-start-subtitle-secondary">
                {secondarySubtitleText}
              </p>
            ) : null}
            {isRecordingChinese ? (
              <div className="sf-ai-guide-start-recording-status" aria-label="录音中">
                <span aria-hidden="true" className="sf-ai-guide-start-status-wave">
                  {[12, 22, 34, 22, 12].map((height, index) => (
                    <span key={`ai-guide-status-wave-${index}`} style={{ height }} />
                  ))}
                </span>
                <span>录音中</span>
              </div>
            ) : null}
          </section>

          <section
            className="sf-ai-guide-start-mic-wrap"
            aria-label={isRecordingChinese ? "正在录音" : "开始练习"}
          >
            {!isRecordingChinese ? (
              <>
                <span className="sf-ai-guide-start-tip-bubble">
                  点这里，说中文
                </span>
                <span className="sf-ai-guide-start-tip-arrow">
                  <CurvedArrowGlyph />
                </span>
              </>
            ) : null}
            {isRecordingChinese ? (
              <>
                <span
                  aria-hidden="true"
                  className="sf-ai-guide-start-record-wave sf-ai-guide-start-record-wave-left"
                />
                <span
                  aria-hidden="true"
                  className="sf-ai-guide-start-record-wave sf-ai-guide-start-record-wave-right"
                />
              </>
            ) : null}
            <button
              type="button"
              aria-label={
                isRecordingChinese ? "点击麦克风结束录音" : "点这里，说中文"
              }
              onClick={handleMicrophoneClick}
              className="sf-ai-guide-start-mic-button"
            >
              <MicGlyph />
            </button>
          </section>

          <section className="sf-ai-guide-start-actions">
            <button
              type="button"
              aria-label={primaryButtonText}
              onClick={handleMicrophoneClick}
              className="sf-ai-guide-start-primary-button"
            >
              <span className="sf-ai-guide-start-button-icon" aria-hidden="true">
                🎤
              </span>
              <span>{primaryButtonText}</span>
            </button>
            <p
              className="sf-ai-guide-start-note"
              aria-label={`${noteText}，${practiceStatusLabel}`}
            >
              <CheckCircleGlyph />
              <span>{noteText}</span>
            </p>
          </section>

          <section
            className={`sf-ai-guide-start-help-card ${
              isRecordingChinese ? "is-recording-tip" : "is-idle-help"
            }`}
            aria-label={isRecordingChinese ? "小提示" : "怎么练"}
            id="sf-ai-guide-start-help"
          >
            {isRecordingChinese ? (
              <div className="sf-ai-guide-start-tip-content">
                <span
                  aria-hidden="true"
                  className="sf-ai-guide-start-tip-icon"
                >
                  <LightGlyph />
                </span>
                <span className="sf-ai-guide-start-tip-copy">
                  <strong>小提示</strong>
                  <span>
                    尽量完整表达，你说得越多，AI 给出的建议会越精准！
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="sf-ai-guide-start-tip-mini-wave"
                >
                  {[10, 18, 30, 42, 30, 18].map((height, index) => (
                    <span key={`ai-guide-tip-wave-${index}`} style={{ height }} />
                  ))}
                </span>
              </div>
            ) : (
              <>
                <h2 className="sf-ai-guide-start-help-title">
                  <HelpBoltGlyph />
                  <span>怎么练？</span>
                </h2>

                <div className="sf-ai-guide-start-steps">
                  {learningFlow.map((item) => (
                    <div className="sf-ai-guide-start-step" key={item.title}>
                      <span
                        className="sf-ai-guide-start-step-icon"
                        aria-hidden="true"
                      >
                        <FlowIcon icon={item.icon} />
                      </span>
                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </section>

      {isHelpModalOpen ? (
        <div
          className="sf-ai-guide-start-help-modal-backdrop"
          onClick={() => setIsHelpModalOpen(false)}
        >
          <section
            className="sf-ai-guide-start-help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sf-ai-guide-start-help-modal-title"
            id="sf-ai-guide-start-help-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="sf-ai-guide-start-help-modal-head">
              <span>
                <h2
                  className="sf-ai-guide-start-help-modal-title"
                  id="sf-ai-guide-start-help-modal-title"
                >
                  使用帮助
                </h2>
                <p className="sf-ai-guide-start-help-modal-subtitle">
                  AI 会一步步帮你练习，提升表达能力
                </p>
              </span>
              <button
                type="button"
                aria-label="关闭帮助"
                className="sf-ai-guide-start-help-modal-close"
                onClick={() => setIsHelpModalOpen(false)}
              >
                <CloseGlyph />
              </button>
            </header>

            <section className="sf-ai-guide-start-help-section">
              <h3 className="sf-ai-guide-start-help-section-title">
                <HelpBoltGlyph />
                <span>怎么练？</span>
              </h3>
              <div className="sf-ai-guide-start-help-flow-grid">
                {helpPracticeSteps.map((step, index) => (
                  <div
                    className="sf-ai-guide-start-help-flow-step"
                    key={step.title}
                  >
                    <span
                      className="sf-ai-guide-start-help-flow-icon"
                      aria-hidden="true"
                    >
                      <FlowIcon icon={step.icon} />
                    </span>
                    <span className="sf-ai-guide-start-help-flow-index">
                      {index + 1}
                    </span>
                    <strong className="sf-ai-guide-start-help-flow-name">
                      {step.title}
                    </strong>
                    <span className="sf-ai-guide-start-help-flow-description">
                      {step.description}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="sf-ai-guide-start-help-section">
              <h3 className="sf-ai-guide-start-help-section-title">
                <HelpBoltGlyph />
                <span>小贴士</span>
              </h3>
              <div className="sf-ai-guide-start-tip-list">
                {helpTips.map((tip) => (
                  <div className="sf-ai-guide-start-tip-row" key={tip.title}>
                    <span
                      className="sf-ai-guide-start-tip-row-icon"
                      aria-hidden="true"
                    >
                      <HelpTipIcon icon={tip.icon} />
                    </span>
                    <span>
                      <strong className="sf-ai-guide-start-tip-row-title">
                        {tip.title}
                      </strong>
                      <span className="sf-ai-guide-start-tip-row-description">
                        {tip.description}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="sf-ai-guide-start-help-section">
              <h3 className="sf-ai-guide-start-help-section-title">
                <HelpBoltGlyph />
                <span>常见问题</span>
              </h3>
              <div className="sf-ai-guide-start-faq-list">
                {helpFaqItems.map((item) => (
                  <button
                    type="button"
                    className="sf-ai-guide-start-faq-row"
                    key={item}
                    aria-label={item}
                  >
                    <span>{item}</span>
                    <ChevronGlyph />
                  </button>
                ))}
              </div>
            </section>

            <div className="sf-ai-guide-start-encourage-card">
              <span className="sf-ai-guide-start-encourage-icon">
                <HeartBubbleGlyph />
              </span>
              <span>
                <strong className="sf-ai-guide-start-encourage-title">
                  坚持练习，你会越来越棒！
                </strong>
                <span className="sf-ai-guide-start-encourage-copy">
                  SpeakFlow 一直陪伴你提升表达能力
                </span>
              </span>
              <span
                className="sf-ai-guide-start-encourage-sparkles"
                aria-hidden="true"
              >
                <span>✦</span>
                <span>✦</span>
                <span>✦</span>
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
