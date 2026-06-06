"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AiGuidedExpressionHelpModal from "@/components/AiGuidedExpressionHelpModal";
import HomeMenuIcon from "@/components/HomeMenuIcon";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";
import { FREE_PRACTICE_DAILY_LIMIT } from "@/lib/freePracticeLimit";

type AiGuidedExpressionStepOneProps = {
  onHomeClick?: () => void;
  onStartChineseRecording?: () => void;
  onStopChineseRecording?: () => void;
  recordingState?: "idle" | "recording";
  showGuestProgress?: boolean;
};

const learningFlow = [
  { icon: "mic", title: "说中文" },
  { icon: "chat", title: "试着说英文" },
  { icon: "robot", title: "AI 给你表达" },
  { icon: "light", title: "继续下一句" },
] as const;

function MicGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 29a8 8 0 0 0 8-8v-8a8 8 0 0 0-16 0v8a8 8 0 0 0 8 8Z" />
      <path d="M11 22a13 13 0 0 0 26 0M24 35v8M18 43h12" />
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

function SparkleGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 4 29.8 18.2 44 24l-14.2 5.8L24 44l-5.8-14.2L4 24l14.2-5.8L24 4Z" />
      <path d="M39 3.5 41 9l5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2 2-5.5Z" />
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

function HelpBoltGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m13.8 2.6-8.1 11h5.2l-1 7.8 8.4-11.8h-5.4l.9-7Z" />
    </svg>
  );
}

function StepIcon({ icon }: { icon: (typeof learningFlow)[number]["icon"] }) {
  if (icon === "mic") return <MicGlyph />;
  if (icon === "chat") return <ChatGlyph />;
  if (icon === "robot") return <RobotGlyph />;
  return <LightGlyph />;
}

function WaveBars({ side }: { side: "left" | "right" }) {
  return (
    <span
      className={`sf-ai-guide-start-wave-bars sf-ai-guide-start-wave-bars-${side}`}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={`${side}-${index}`} />
      ))}
    </span>
  );
}

export default function AiGuidedExpressionStepOne({
  onHomeClick,
  onStartChineseRecording,
  onStopChineseRecording,
  recordingState,
  showGuestProgress = false,
}: AiGuidedExpressionStepOneProps) {
  void showGuestProgress;

  const router = useRouter();
  const [localRecordingState, setLocalRecordingState] = useState<
    "idle" | "recording"
  >("idle");
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const effectiveRecordingState = recordingState ?? localRecordingState;
  const isRecording = effectiveRecordingState === "recording";

  function handleHomeClick() {
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
    if (isRecording) {
      stopChineseRecording();
      return;
    }

    startChineseRecording();
  }

  const titleText = isRecording ? "正在听你说话..." : "先说中文";
  const instructionText = isRecording
    ? "再次点击上方麦克风，结束录音"
    : "点击上方麦克风开始说中文";

  return (
    <main
      className={`sf-ai-guide-start-page ${
        isRecording ? "is-recording" : "is-idle"
      } ${isHelpOpen ? "is-help-open" : ""}`}
    >
      <style>{`
        .sf-ai-guide-start-page,
        .sf-ai-guide-start-page * {
          box-sizing: border-box;
        }

        .sf-speak-page:has(.sf-ai-guide-start-page) {
          background:
            radial-gradient(circle at 18% 3%, rgba(220, 239, 255, 0.9), transparent 30%),
            radial-gradient(circle at 88% 0%, rgba(233, 225, 255, 0.86), transparent 28%),
            linear-gradient(180deg, #f4fbff 0%, #fbfdff 48%, #f2f6ff 100%) !important;
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
          background: transparent !important;
          overflow: hidden !important;
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
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          justify-content: center;
          color: #080d33;
          background:
            radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.92), transparent 24rem),
            radial-gradient(circle at 7% 28%, rgba(202, 234, 255, 0.56), transparent 9rem),
            radial-gradient(circle at 95% 33%, rgba(226, 217, 255, 0.72), transparent 10rem),
            linear-gradient(180deg, #eef9ff 0%, #fbfdff 43%, #f3f6ff 100%);
          font-family: var(--sf-font-zh, "PingFang SC", "Microsoft YaHei", sans-serif);
          -webkit-font-smoothing: antialiased;
        }

        .sf-ai-guide-start-page.is-help-open {
          overflow: hidden;
        }

        .sf-ai-guide-start-shell {
          position: relative;
          width: min(100%, 430px);
          min-height: 100%;
          padding: clamp(0.62rem, 2.2dvh, 0.98rem) clamp(0.95rem, 4.6vw, 1.36rem) 1rem;
          display: flex;
          flex-direction: column;
          isolation: isolate;
        }

        .sf-ai-guide-start-shell::before {
          content: "";
          position: absolute;
          z-index: -1;
          inset: 3.6rem -7.8rem auto;
          height: min(56vw, 15rem);
          border: 1px solid rgba(255, 255, 255, 0.88);
          border-bottom: 0;
          border-radius: 999px 999px 0 0;
          opacity: 0.75;
        }

        .sf-ai-guide-start-shell::after {
          content: "";
          position: absolute;
          z-index: -1;
          inset: 4.85rem -4.2rem auto;
          height: min(47vw, 12.8rem);
          border: 1px solid rgba(255, 255, 255, 0.62);
          border-bottom: 0;
          border-radius: 999px 999px 0 0;
          opacity: 0.65;
        }

        .sf-ai-guide-start-header {
          position: relative;
          z-index: 3;
          min-height: clamp(2.72rem, 10.5vw, 3.45rem);
          padding: 0.33rem clamp(0.45rem, 2.6vw, 0.72rem);
          border: 1px solid rgba(199, 214, 244, 0.66);
          border-radius: clamp(1.05rem, 5vw, 1.6rem);
          background: rgba(255, 255, 255, 0.76);
          display: grid;
          grid-template-columns: clamp(2.05rem, 9.2vw, 2.55rem) minmax(0, 1fr) clamp(2.05rem, 9.2vw, 2.55rem);
          align-items: center;
          gap: 0.42rem;
          box-shadow:
            0 1.1rem 2.3rem rgba(112, 139, 196, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(18px);
        }

        .sf-ai-guide-start-home-button,
        .sf-ai-guide-start-help-button,
        .sf-ai-guide-start-mic-button {
          border: 0;
          padding: 0;
          font: inherit;
          cursor: pointer;
          appearance: none;
          -webkit-tap-highlight-color: transparent;
        }

        .sf-ai-guide-start-home-button,
        .sf-ai-guide-start-help-button {
          width: clamp(2.05rem, 9.2vw, 2.55rem);
          height: clamp(2.05rem, 9.2vw, 2.55rem);
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #07103d;
          background: #ffffff;
          box-shadow:
            0 0.75rem 1.45rem rgba(85, 99, 154, 0.15),
            inset 0 0 0 1px rgba(216, 223, 244, 0.74);
          transition: transform 150ms ease, box-shadow 150ms ease;
        }

        .sf-ai-guide-start-home-button:active,
        .sf-ai-guide-start-help-button:active,
        .sf-ai-guide-start-mic-button:active,
        .sf-ai-guide-start-instruction:active {
          transform: scale(0.97);
        }

        .sf-ai-guide-start-home-button:focus-visible,
        .sf-ai-guide-start-help-button:focus-visible,
        .sf-ai-guide-start-mic-button:focus-visible,
        .sf-ai-guide-start-help-close:focus-visible,
        .sf-ai-guide-start-instruction:focus-visible {
          outline: 3px solid rgba(132, 103, 255, 0.36);
          outline-offset: 3px;
        }

        .sf-ai-guide-start-home-button .sf-home-menu-icon {
          width: 54%;
          height: 54%;
        }

        .sf-ai-guide-start-home-button .sf-home-menu-icon svg {
          width: 100%;
          height: 100%;
          stroke-width: 2.7px;
        }

        .sf-ai-guide-start-help-button {
          font-size: clamp(1.08rem, 4.8vw, 1.45rem);
          font-weight: 950;
          line-height: 1;
        }

        .sf-ai-guide-start-brand {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(0.36rem, 1.8vw, 0.52rem);
        }

        .sf-ai-guide-start-logo {
          width: clamp(1.7rem, 8.1vw, 2.2rem);
          height: clamp(1.7rem, 8.1vw, 2.2rem);
          border-radius: 0.62rem;
          background: rgba(255, 255, 255, 0.9);
          display: grid;
          place-items: center;
          box-shadow: inset 0 0 0 1px rgba(226, 220, 255, 0.76);
          flex: 0 0 auto;
        }

        .sf-ai-guide-start-logo-mark {
          width: 78%;
          height: 78%;
        }

        .sf-ai-guide-start-brand-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1;
        }

        .sf-ai-guide-start-brand-title {
          color: #070c31;
          font-size: clamp(0.92rem, 4.6vw, 1.32rem);
          font-weight: 1000;
          letter-spacing: 0;
          white-space: nowrap;
        }

        .sf-ai-guide-start-brand-subtitle {
          margin-top: 0.18rem;
          color: #4d66ff;
          font-size: clamp(0.4rem, 2vw, 0.58rem);
          font-weight: 900;
          letter-spacing: 0.17em;
          white-space: nowrap;
        }

        .sf-ai-guide-start-hero {
          position: relative;
          z-index: 2;
          margin-top: clamp(1.02rem, 4.4dvh, 1.8rem);
          text-align: center;
        }

        .sf-ai-guide-start-sparkle {
          position: absolute;
          color: rgba(139, 109, 255, 0.76);
          filter: drop-shadow(0 0.34rem 0.85rem rgba(147, 113, 255, 0.2));
        }

        .sf-ai-guide-start-sparkle svg {
          display: block;
          width: 100%;
          height: 100%;
          fill: currentColor;
        }

        .sf-ai-guide-start-sparkle-left {
          left: clamp(0.5rem, 5vw, 1.5rem);
          top: clamp(1.1rem, 5.8vw, 2.1rem);
          width: clamp(0.78rem, 4.5vw, 1.28rem);
          height: clamp(0.78rem, 4.5vw, 1.28rem);
        }

        .sf-ai-guide-start-sparkle-right {
          right: clamp(0.62rem, 5.6vw, 1.8rem);
          top: clamp(0.22rem, 1.5vw, 0.55rem);
          width: clamp(0.62rem, 3.5vw, 1.05rem);
          height: clamp(0.62rem, 3.5vw, 1.05rem);
          color: rgba(255, 255, 255, 0.95);
        }

        .sf-ai-guide-start-title {
          margin: 0;
          color: transparent;
          background: linear-gradient(93deg, #071047 0%, #14217a 47%, #3d67ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          font-size: clamp(2.15rem, 11.4vw, 3.25rem);
          font-weight: 1000;
          line-height: 1.04;
          letter-spacing: 0;
          text-shadow: 0 0.7rem 1.55rem rgba(63, 83, 183, 0.08);
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-title {
          background: linear-gradient(93deg, #17208c 0%, #7257ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          font-size: clamp(1.78rem, 9.2vw, 2.64rem);
        }

        .sf-ai-guide-start-subtitle {
          margin: clamp(0.4rem, 2vw, 0.68rem) 0 0;
          color: rgba(73, 79, 124, 0.7);
          font-size: clamp(0.82rem, 4.1vw, 1.1rem);
          font-weight: 800;
          line-height: 1.38;
          letter-spacing: 0.02em;
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-subtitle {
          display: flex;
          flex-direction: column;
          gap: 0.08rem;
          color: rgba(70, 75, 119, 0.72);
        }

        .sf-ai-guide-start-recording-status {
          margin-top: clamp(0.42rem, 1.8dvh, 0.74rem);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.38rem;
          color: #7656ff;
          font-size: clamp(0.72rem, 3.5vw, 0.94rem);
          font-weight: 950;
        }

        .sf-ai-guide-start-status-bars {
          display: inline-flex;
          align-items: center;
          gap: 0.12rem;
          height: 1rem;
        }

        .sf-ai-guide-start-status-bars span {
          width: 0.14rem;
          border-radius: 999px;
          background: currentColor;
          animation: sf-ai-guide-start-wave 840ms ease-in-out infinite;
        }

        .sf-ai-guide-start-status-bars span:nth-child(1) { height: 0.44rem; }
        .sf-ai-guide-start-status-bars span:nth-child(2) { height: 0.78rem; animation-delay: 80ms; }
        .sf-ai-guide-start-status-bars span:nth-child(3) { height: 1rem; animation-delay: 160ms; }
        .sf-ai-guide-start-status-bars span:nth-child(4) { height: 0.68rem; animation-delay: 240ms; }

        .sf-ai-guide-start-mic-zone {
          position: relative;
          z-index: 2;
          margin-top: clamp(0.72rem, 3.2dvh, 1.24rem);
          min-height: clamp(11rem, 50vw, 14.9rem);
          display: grid;
          place-items: center;
        }

        .sf-ai-guide-start-mic-ring {
          position: relative;
          width: clamp(8.85rem, 53vw, 13.45rem);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
        }

        .sf-ai-guide-start-mic-ring::before,
        .sf-ai-guide-start-mic-ring::after {
          content: "";
          position: absolute;
          inset: -1.15rem;
          border-radius: 999px;
          pointer-events: none;
        }

        .sf-ai-guide-start-mic-ring::before {
          background:
            radial-gradient(circle, rgba(179, 124, 255, 0.22), rgba(100, 145, 255, 0.1) 52%, transparent 70%);
          filter: blur(0.22rem);
        }

        .sf-ai-guide-start-mic-ring::after {
          border: 1px solid rgba(255, 255, 255, 0.72);
          box-shadow:
            0 0 0 0.55rem rgba(255, 255, 255, 0.42),
            0 0 0 1.45rem rgba(218, 226, 255, 0.24),
            0 0 3.2rem rgba(122, 111, 255, 0.24);
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-mic-ring::before {
          animation: sf-ai-guide-start-pulse 1.7s ease-in-out infinite;
          background:
            radial-gradient(circle, rgba(170, 109, 255, 0.28), rgba(125, 141, 255, 0.18) 52%, transparent 73%);
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-mic-ring::after {
          box-shadow:
            0 0 0 0.65rem rgba(255, 255, 255, 0.52),
            0 0 0 1.8rem rgba(214, 199, 255, 0.3),
            0 0 4.4rem rgba(142, 91, 255, 0.35);
        }

        .sf-ai-guide-start-mic-button {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background:
            radial-gradient(circle at 31% 22%, rgba(255, 255, 255, 0.54), transparent 18%),
            linear-gradient(135deg, #f2a2ff 0%, #9474ff 48%, #39a2ff 100%);
          box-shadow:
            inset 0 0 0 0.18rem rgba(255, 255, 255, 0.88),
            inset -1.1rem -1.4rem 2.6rem rgba(32, 72, 218, 0.18),
            0 1.2rem 2.55rem rgba(105, 90, 223, 0.2);
          transition: transform 170ms ease, box-shadow 170ms ease, filter 170ms ease;
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-mic-button {
          background:
            radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.45), transparent 18%),
            linear-gradient(135deg, #eba0ff 0%, #9c62ff 50%, #5c75ff 100%);
          box-shadow:
            inset 0 0 0 0.18rem rgba(255, 255, 255, 0.92),
            inset -1.3rem -1.5rem 2.4rem rgba(42, 44, 184, 0.2),
            0 1.35rem 2.8rem rgba(126, 87, 255, 0.26);
          filter: saturate(1.07);
        }

        .sf-ai-guide-start-mic-button svg {
          width: clamp(4.2rem, 24vw, 6.3rem);
          height: clamp(4.2rem, 24vw, 6.3rem);
          fill: none;
          stroke: currentColor;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 0.42rem 0.78rem rgba(31, 51, 130, 0.12));
        }

        .sf-ai-guide-start-wave-bars {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: clamp(3.65rem, 18vw, 5.1rem);
          height: clamp(3rem, 15vw, 4.3rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: rgba(116, 180, 255, 0.48);
          pointer-events: none;
        }

        .sf-ai-guide-start-wave-bars-left {
          right: calc(50% + clamp(5.1rem, 28vw, 7.55rem));
        }

        .sf-ai-guide-start-wave-bars-right {
          left: calc(50% + clamp(5.1rem, 28vw, 7.55rem));
        }

        .sf-ai-guide-start-wave-bars span {
          width: clamp(0.13rem, 0.8vw, 0.24rem);
          border-radius: 999px;
          background: currentColor;
          opacity: 0.75;
          animation: sf-ai-guide-start-wave 1.34s ease-in-out infinite;
        }

        .sf-ai-guide-start-wave-bars span:nth-child(1),
        .sf-ai-guide-start-wave-bars span:nth-child(8) { height: 22%; animation-delay: 0ms; }
        .sf-ai-guide-start-wave-bars span:nth-child(2),
        .sf-ai-guide-start-wave-bars span:nth-child(7) { height: 48%; animation-delay: 110ms; }
        .sf-ai-guide-start-wave-bars span:nth-child(3),
        .sf-ai-guide-start-wave-bars span:nth-child(6) { height: 70%; animation-delay: 220ms; }
        .sf-ai-guide-start-wave-bars span:nth-child(4),
        .sf-ai-guide-start-wave-bars span:nth-child(5) { height: 88%; animation-delay: 330ms; }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-wave-bars {
          color: rgba(163, 111, 255, 0.58);
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-wave-bars span {
          opacity: 0.9;
          animation-duration: 820ms;
        }

        .sf-ai-guide-start-action-area {
          position: relative;
          z-index: 3;
          margin-top: clamp(0.58rem, 2.3dvh, 0.9rem);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(0.5rem, 1.8dvh, 0.72rem);
        }

        .sf-ai-guide-start-instruction {
          width: min(100%, 19.2rem);
          min-height: clamp(2.32rem, 10.4vw, 2.8rem);
          border: 1px solid rgba(205, 205, 240, 0.82);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.6);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.46rem;
          color: rgba(72, 76, 116, 0.74);
          font-size: clamp(0.77rem, 3.55vw, 0.98rem);
          font-weight: 850;
          letter-spacing: 0;
          box-shadow:
            0 0.66rem 1.25rem rgba(105, 119, 181, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(14px);
          cursor: pointer;
          transition: transform 150ms ease, border-color 150ms ease, color 150ms ease;
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-instruction {
          color: rgba(77, 73, 128, 0.75);
        }

        .sf-ai-guide-start-instruction-icon {
          width: 1.28rem;
          height: 1.28rem;
          display: grid;
          place-items: center;
          color: #b88cff;
          border-radius: 999px;
          flex: 0 0 auto;
        }

        .sf-ai-guide-start-instruction-icon svg {
          width: 100%;
          height: 100%;
          fill: currentColor;
          stroke: none;
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-instruction-icon {
          width: 1.18rem;
          height: 1.18rem;
          background: rgba(174, 129, 255, 0.22);
          color: #8a62ff;
        }

        .sf-ai-guide-start-page.is-recording .sf-ai-guide-start-instruction-icon svg {
          fill: none;
          stroke: currentColor;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-ai-guide-start-note {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.34rem;
          margin: 0;
          color: rgba(74, 80, 125, 0.68);
          font-size: clamp(0.64rem, 3vw, 0.78rem);
          font-weight: 760;
          line-height: 1.25;
          text-align: center;
        }

        .sf-ai-guide-start-note svg {
          width: 0.98rem;
          height: 0.98rem;
          fill: none;
          stroke: #ac86ff;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          flex: 0 0 auto;
        }

        .sf-ai-guide-start-help-card {
          position: relative;
          z-index: 2;
          margin-top: auto;
          border: 1px solid rgba(219, 225, 246, 0.82);
          border-radius: clamp(0.92rem, 4.8vw, 1.34rem);
          background: rgba(255, 255, 255, 0.72);
          padding: clamp(0.74rem, 3vw, 1rem) clamp(0.64rem, 3.2vw, 0.95rem) clamp(0.72rem, 3vw, 0.95rem);
          box-shadow:
            0 1rem 2.3rem rgba(98, 111, 168, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(18px);
        }

        .sf-ai-guide-start-help-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.38rem;
          color: #081039;
          font-size: clamp(0.86rem, 4vw, 1.02rem);
          font-weight: 950;
          line-height: 1;
        }

        .sf-ai-guide-start-help-title svg {
          width: 1.05rem;
          height: 1.05rem;
          fill: #8b63ff;
          flex: 0 0 auto;
        }

        .sf-ai-guide-start-steps {
          margin-top: clamp(0.62rem, 2.8vw, 0.85rem);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(0.24rem, 1.4vw, 0.42rem);
        }

        .sf-ai-guide-start-step {
          position: relative;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.34rem;
          color: #1f2856;
          text-align: center;
          font-size: clamp(0.62rem, 2.8vw, 0.75rem);
          font-weight: 760;
          line-height: 1.12;
        }

        .sf-ai-guide-start-step:not(:last-child)::after {
          content: "";
          position: absolute;
          top: clamp(0.88rem, 4.3vw, 1.15rem);
          left: calc(50% + clamp(1.08rem, 5vw, 1.38rem));
          width: clamp(0.9rem, 4.5vw, 1.25rem);
          border-top: 2px dashed rgba(170, 146, 244, 0.48);
        }

        .sf-ai-guide-start-step-icon {
          width: clamp(2.08rem, 10vw, 2.7rem);
          height: clamp(2.08rem, 10vw, 2.7rem);
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #9a5dff;
          background: rgba(157, 111, 255, 0.1);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.75);
        }

        .sf-ai-guide-start-step-icon svg {
          width: 55%;
          height: 55%;
          fill: none;
          stroke: currentColor;
          stroke-width: 3.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-ai-guide-start-help-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          padding: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(9, 14, 38, 0.34);
          backdrop-filter: blur(12px);
        }

        .sf-ai-guide-start-help-modal {
          width: min(100%, 24rem);
          max-height: min(86dvh, 39rem);
          overflow-y: auto;
          border: 1px solid rgba(218, 226, 248, 0.9);
          border-radius: 1.35rem;
          background:
            radial-gradient(circle at 92% 8%, rgba(218, 204, 255, 0.55), transparent 8rem),
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 252, 255, 0.96));
          padding: 1.1rem;
          box-shadow: 0 1.7rem 4rem rgba(28, 36, 78, 0.2);
        }

        .sf-ai-guide-start-help-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .sf-ai-guide-start-help-head h2 {
          margin: 0;
          color: #090e36;
          font-size: 1.32rem;
          font-weight: 950;
          line-height: 1.2;
        }

        .sf-ai-guide-start-help-head p {
          margin: 0.38rem 0 0;
          color: rgba(52, 61, 105, 0.72);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .sf-ai-guide-start-help-close {
          width: 2.25rem;
          height: 2.25rem;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.78);
          color: #11183f;
          display: grid;
          place-items: center;
          box-shadow: inset 0 0 0 1px rgba(211, 221, 244, 0.9);
          cursor: pointer;
        }

        .sf-ai-guide-start-help-close svg {
          width: 1.02rem;
          height: 1.02rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.6;
          stroke-linecap: round;
        }

        .sf-ai-guide-start-help-list {
          margin-top: 1rem;
          display: grid;
          gap: 0.7rem;
        }

        .sf-ai-guide-start-help-row {
          display: grid;
          grid-template-columns: 2.35rem 1fr;
          gap: 0.72rem;
          align-items: center;
          padding: 0.8rem;
          border-radius: 1rem;
          border: 1px solid rgba(221, 226, 245, 0.88);
          background: rgba(255, 255, 255, 0.75);
        }

        .sf-ai-guide-start-help-row-icon {
          width: 2.35rem;
          height: 2.35rem;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #8a63ff;
          background: rgba(144, 96, 255, 0.1);
        }

        .sf-ai-guide-start-help-row-icon svg {
          width: 56%;
          height: 56%;
          fill: none;
          stroke: currentColor;
          stroke-width: 3.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-ai-guide-start-help-row strong {
          display: block;
          color: #0a1037;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .sf-ai-guide-start-help-row-copy > span {
          display: block;
          margin-top: 0.2rem;
          color: rgba(62, 70, 113, 0.72);
          font-size: 0.76rem;
          font-weight: 700;
          line-height: 1.45;
        }

        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-title {
          color: transparent !important;
        }

        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-mic-button,
        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-mic-button * {
          color: #ffffff !important;
        }

        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-mic-button svg,
        html[data-app-theme] body .sf-ai-guide-start-page .sf-ai-guide-start-mic-button svg * {
          stroke: #ffffff !important;
        }

        @keyframes sf-ai-guide-start-wave {
          0%, 100% {
            transform: scaleY(0.58);
          }
          50% {
            transform: scaleY(1);
          }
        }

        @keyframes sf-ai-guide-start-pulse {
          0%, 100% {
            transform: scale(0.98);
            opacity: 0.72;
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }

        @media (min-width: 720px) {
          .sf-ai-guide-start-shell {
            width: 430px;
          }
        }

        @media (max-width: 370px) {
          .sf-ai-guide-start-shell {
            padding-left: 0.74rem;
            padding-right: 0.74rem;
          }

          .sf-ai-guide-start-mic-zone {
            min-height: 10.4rem;
          }

          .sf-ai-guide-start-wave-bars {
            width: 2.75rem;
          }

          .sf-ai-guide-start-wave-bars-left {
            right: calc(50% + 4.65rem);
          }

          .sf-ai-guide-start-wave-bars-right {
            left: calc(50% + 4.65rem);
          }

          .sf-ai-guide-start-step:not(:last-child)::after {
            width: 0.72rem;
            left: calc(50% + 0.98rem);
          }
        }

        @media (max-height: 680px) {
          .sf-ai-guide-start-shell {
            padding-top: 0.5rem;
          }

          .sf-ai-guide-start-hero {
            margin-top: 0.72rem;
          }

          .sf-ai-guide-start-mic-zone {
            margin-top: 0.45rem;
            min-height: 9.8rem;
          }

          .sf-ai-guide-start-mic-ring {
            width: clamp(7.75rem, 45vw, 11.2rem);
          }

          .sf-ai-guide-start-action-area {
            margin-top: 0.42rem;
            gap: 0.38rem;
          }

          .sf-ai-guide-start-help-card {
            padding-top: 0.64rem;
            padding-bottom: 0.68rem;
          }

          .sf-ai-guide-start-steps {
            margin-top: 0.54rem;
          }
        }
      `}</style>

      <div className="sf-ai-guide-start-shell">
        <header className="sf-ai-guide-start-header">
          <button
            type="button"
            className="sf-ai-guide-start-home-button"
            onClick={handleHomeClick}
            aria-label="返回首页"
          >
            <HomeMenuIcon />
          </button>

          <div className="sf-ai-guide-start-brand" aria-label="SpeakFlow">
            <span className="sf-ai-guide-start-logo" aria-hidden="true">
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
            className="sf-ai-guide-start-help-button"
            aria-label="打开帮助"
            aria-haspopup="dialog"
            aria-expanded={isHelpOpen}
            onClick={() => setIsHelpOpen(true)}
          >
            ?
          </button>
        </header>

        <section className="sf-ai-guide-start-hero" aria-live="polite">
          <span className="sf-ai-guide-start-sparkle sf-ai-guide-start-sparkle-left">
            <SparkleGlyph />
          </span>
          <span className="sf-ai-guide-start-sparkle sf-ai-guide-start-sparkle-right">
            <SparkleGlyph />
          </span>

          <h1 className="sf-ai-guide-start-title">{titleText}</h1>
          {isRecording ? (
            <p className="sf-ai-guide-start-subtitle">
              <span>大胆说出你想表达的中文</span>
              <span>AI 会一步步帮你优化</span>
            </p>
          ) : (
            <p className="sf-ai-guide-start-subtitle">
              AI 帮你变成自然英语
            </p>
          )}

          {isRecording ? (
            <div className="sf-ai-guide-start-recording-status">
              <span className="sf-ai-guide-start-status-bars" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
              <span>录音中</span>
            </div>
          ) : null}
        </section>

        <section className="sf-ai-guide-start-mic-zone" aria-label={titleText}>
          <WaveBars side="left" />
          <div className="sf-ai-guide-start-mic-ring">
            <button
              type="button"
              className="sf-ai-guide-start-mic-button"
              onClick={handleMicrophoneClick}
              aria-label={isRecording ? "结束中文录音" : "开始中文录音"}
              aria-pressed={isRecording}
            >
              <MicGlyph />
            </button>
          </div>
          <WaveBars side="right" />
        </section>

        <section className="sf-ai-guide-start-action-area">
          <button
            type="button"
            className="sf-ai-guide-start-instruction"
            onClick={handleMicrophoneClick}
            aria-label={isRecording ? "结束中文录音" : "开始中文录音"}
          >
            <span className="sf-ai-guide-start-instruction-icon" aria-hidden="true">
              {isRecording ? <MicGlyph /> : <SparkleGlyph />}
            </span>
            <span>{instructionText}</span>
          </button>

          <p className="sf-ai-guide-start-note">
            <CheckCircleGlyph />
            <span>
              免费体验 {FREE_PRACTICE_DAILY_LIMIT} 句 · 登录可保存学习记录
            </span>
          </p>
        </section>

        <section className="sf-ai-guide-start-help-card" aria-label="怎么练">
          <h2 className="sf-ai-guide-start-help-title">
            <HelpBoltGlyph />
            <span>怎么练?</span>
          </h2>
          <div className="sf-ai-guide-start-steps">
            {learningFlow.map((item) => (
              <div className="sf-ai-guide-start-step" key={item.title}>
                <span className="sf-ai-guide-start-step-icon" aria-hidden="true">
                  <StepIcon icon={item.icon} />
                </span>
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AiGuidedExpressionHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </main>
  );
}
