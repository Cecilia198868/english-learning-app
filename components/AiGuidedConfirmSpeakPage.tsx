"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import AiGuidedExpressionHelpModal from "@/components/AiGuidedExpressionHelpModal";
import HomeMenuIcon from "@/components/HomeMenuIcon";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";

type ConfirmSpeakState = "confirmChinese" | "recordingEnglish";

type AiGuidedConfirmSpeakPageProps = {
  chineseText: string;
  viewState: ConfirmSpeakState;
  headerAddon?: ReactNode;
  menuLabel?: string;
  onMenuClick: () => void;
  onEditChinese: (value: string) => void;
  onRetryChinese: () => void;
  onStartEnglishRecording: () => void;
  onStopEnglishRecording: () => void;
};

const emptyChineseText = "这里会显示你刚才说的中文";

function getChineseCharacterCount(value: string) {
  return Array.from(value.replace(/\s/g, "")).length;
}

function getChineseTextSize(value: string) {
  const count = getChineseCharacterCount(value);
  if (count <= 10) return 1.28;
  if (count <= 22) return 1.18;
  if (count <= 42) return 1.04;
  return 0.94;
}

function MicGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 29a8 8 0 0 0 8-8v-8a8 8 0 0 0-16 0v8a8 8 0 0 0 8 8Z" />
      <path d="M11 22a13 13 0 0 0 26 0M24 35v8M18 43h12" />
    </svg>
  );
}

function EditGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 19h4.2L18.4 9.8a2.2 2.2 0 0 0-3.1-3.1L6.1 15.9 5 19Z" />
      <path d="m13.8 8.2 2 2M4.8 21h14.4" />
    </svg>
  );
}

function RefreshGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6" />
      <path d="M7 18H4v-3M17 6h3v3" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3 19 6v5.2c0 4.6-2.9 7.9-7 9.8-4.1-1.9-7-5.2-7-9.8V6l7-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

function SparkleGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.6 14.9 9l6.5 3-6.5 3-2.9 6.4L9.1 15l-6.5-3 6.5-3L12 2.6Z" />
      <path d="m19 2.5.9 2.1 2.1.9-2.1.9L19 8.5l-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <span className="sf-ai-confirm-speak-title-wave" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function WaveBars({ side }: { side: "left" | "right" }) {
  return (
    <span
      className={`sf-ai-confirm-speak-wave-bars sf-ai-confirm-speak-wave-bars-${side}`}
      aria-hidden="true"
    >
      {Array.from({ length: 7 }).map((_, index) => (
        <span key={`${side}-${index}`} />
      ))}
    </span>
  );
}

export default function AiGuidedConfirmSpeakPage({
  chineseText,
  viewState,
  headerAddon,
  menuLabel = "回到学习首页",
  onMenuClick,
  onEditChinese,
  onRetryChinese,
  onStartEnglishRecording,
  onStopEnglishRecording,
}: AiGuidedConfirmSpeakPageProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const isRecordingEnglish = viewState === "recordingEnglish";
  const displayChineseText = chineseText.trim() || emptyChineseText;
  const chineseTextSize = getChineseTextSize(displayChineseText);
  const chineseTextStyle = {
    "--sf-ai-confirm-speak-chinese-size": `${chineseTextSize.toFixed(3)}rem`,
  } as CSSProperties;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const maxHeight = Number.parseFloat(getComputedStyle(textarea).maxHeight);
    const nextHeight = Number.isFinite(maxHeight)
      ? Math.min(textarea.scrollHeight, maxHeight)
      : textarea.scrollHeight;
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > nextHeight + 1 ? "auto" : "hidden";
  }, [chineseText]);

  function focusChineseText() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
  }

  function handleStartEnglishRecording() {
    if (!chineseText.trim() || isRecordingEnglish) return;
    onStartEnglishRecording();
  }

  return (
    <section
      className={`sf-ai-confirm-speak-page ${
        isRecordingEnglish ? "is-recording-english" : "is-confirm-chinese"
      }`}
      aria-label={isRecordingEnglish ? "看着中文说英文" : "确认识别出的中文"}
    >
      <style>{`
        .sf-ai-confirm-speak-page,
        .sf-ai-confirm-speak-page * {
          box-sizing: border-box;
        }

        .sf-ai-confirm-speak-page {
          width: 100%;
          height: 100%;
          min-height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          color: #080d33;
          background:
            radial-gradient(circle at 14% 12%, rgba(224, 244, 255, 0.82), transparent 32%),
            radial-gradient(circle at 86% 40%, rgba(236, 229, 255, 0.7), transparent 34%),
            linear-gradient(180deg, #eff9ff 0%, #fbfdff 47%, #f4f6ff 100%);
          font-family: var(--sf-font-zh, "PingFang SC", "Microsoft YaHei", sans-serif);
          -webkit-font-smoothing: antialiased;
        }

        .sf-ai-confirm-speak-frame {
          position: relative;
          isolation: isolate;
          width: min(100%, 430px);
          min-height: 100%;
          margin: 0 auto;
          padding: calc(env(safe-area-inset-top, 0px) + clamp(0.66rem, 2.5dvh, 1rem))
            clamp(0.88rem, 4.5vw, 1.2rem)
            calc(env(safe-area-inset-bottom, 0px) + 0.86rem);
          overflow: hidden;
        }

        .sf-ai-confirm-speak-frame::before {
          content: "";
          position: absolute;
          inset: 3.4rem -4rem auto;
          z-index: -1;
          height: 13rem;
          border: 1px solid rgba(255, 255, 255, 0.68);
          border-bottom: 0;
          border-radius: 999px 999px 0 0;
          opacity: 0.54;
        }

        .sf-ai-confirm-speak-header {
          display: grid;
          grid-template-columns: clamp(2.2rem, 10vw, 2.7rem) minmax(0, 1fr) clamp(2.2rem, 10vw, 2.7rem);
          align-items: center;
          gap: clamp(0.42rem, 2vw, 0.62rem);
          min-height: clamp(2.5rem, 10.8vw, 3.15rem);
        }

        .sf-ai-confirm-speak-home,
        .sf-ai-confirm-speak-help,
        .sf-ai-confirm-speak-retry-button,
        .sf-ai-confirm-speak-confirm-button,
        .sf-ai-confirm-speak-mic,
        .sf-ai-confirm-speak-stop-button {
          border: 0;
          padding: 0;
          font: inherit;
          cursor: pointer;
          appearance: none;
          -webkit-tap-highlight-color: transparent;
        }

        .sf-ai-confirm-speak-home,
        .sf-ai-confirm-speak-help {
          display: grid;
          width: clamp(2.2rem, 10vw, 2.7rem);
          height: clamp(2.2rem, 10vw, 2.7rem);
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.86);
          color: #07103a;
          box-shadow:
            0 0.7rem 1.4rem rgba(72, 92, 149, 0.13),
            inset 0 0 0 1px rgba(218, 226, 246, 0.78);
          transition: transform 150ms ease;
        }

        .sf-ai-confirm-speak-home:active,
        .sf-ai-confirm-speak-help:active,
        .sf-ai-confirm-speak-edit:active,
        .sf-ai-confirm-speak-retry-button:active,
        .sf-ai-confirm-speak-confirm-button:active,
        .sf-ai-confirm-speak-mic:active,
        .sf-ai-confirm-speak-stop-button:active {
          transform: scale(0.97);
        }

        .sf-ai-confirm-speak-home:focus-visible,
        .sf-ai-confirm-speak-help:focus-visible,
        .sf-ai-confirm-speak-edit:focus-visible,
        .sf-ai-confirm-speak-retry-button:focus-visible,
        .sf-ai-confirm-speak-confirm-button:focus-visible,
        .sf-ai-confirm-speak-mic:focus-visible,
        .sf-ai-confirm-speak-stop-button:focus-visible {
          outline: 3px solid rgba(132, 88, 255, 0.34);
          outline-offset: 3px;
        }

        .sf-ai-confirm-speak-home .sf-home-menu-icon,
        .sf-ai-confirm-speak-home .sf-home-menu-icon svg {
          width: 58%;
          height: 58%;
        }

        .sf-ai-confirm-speak-home .sf-home-menu-icon svg {
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2.85;
        }

        .sf-ai-confirm-speak-help {
          justify-self: end;
          font-size: clamp(1rem, 4.8vw, 1.35rem);
          font-weight: 950;
          line-height: 1;
        }

        .sf-ai-confirm-speak-brand {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(0.32rem, 1.7vw, 0.48rem);
        }

        .sf-ai-confirm-speak-logo {
          display: grid;
          width: clamp(1.55rem, 7.6vw, 2rem);
          height: clamp(1.55rem, 7.6vw, 2rem);
          flex: 0 0 auto;
          place-items: center;
          border-radius: 0.62rem;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: inset 0 0 0 1px rgba(224, 218, 255, 0.72);
        }

        .sf-ai-confirm-speak-logo-mark {
          width: 78%;
          height: 78%;
        }

        .sf-ai-confirm-speak-brand-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1;
        }

        .sf-ai-confirm-speak-brand-title {
          max-width: 100%;
          color: #07103a;
          font-size: clamp(0.98rem, 4.35vw, 1.28rem);
          font-weight: 1000;
          letter-spacing: 0;
          line-height: 0.95;
          white-space: nowrap;
        }

        .sf-ai-confirm-speak-brand-subtitle {
          margin-top: 0.18rem;
          color: #4e62ff !important;
          font-size: clamp(0.38rem, 1.85vw, 0.54rem);
          font-weight: 900;
          letter-spacing: 0.16em;
          line-height: 1;
          white-space: nowrap;
        }

        .sf-ai-confirm-speak-addon {
          margin-top: 0.36rem;
        }

        .sf-ai-confirm-speak-content {
          display: flex;
          flex-direction: column;
          min-height: calc(100dvh - 5.1rem);
          padding-top: clamp(0.78rem, 3.4dvh, 1.25rem);
        }

        .sf-ai-confirm-speak-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.42rem;
          color: #07103a;
          font-size: clamp(1.12rem, 5.2vw, 1.36rem);
          font-weight: 950;
          letter-spacing: 0;
          line-height: 1.12;
          text-align: left;
        }

        .sf-ai-confirm-speak-title svg {
          width: 1.22rem;
          height: 1.22rem;
          fill: #875cff;
          flex: 0 0 auto;
          filter: drop-shadow(0 0.32rem 0.6rem rgba(142, 98, 255, 0.18));
        }

        .sf-ai-confirm-speak-chinese-card {
          position: relative;
          margin-top: clamp(0.65rem, 2.8dvh, 0.95rem);
          min-height: clamp(7.1rem, 28dvh, 9.2rem);
          border: 1px solid rgba(214, 224, 247, 0.9);
          border-radius: clamp(0.9rem, 4vw, 1.15rem);
          background: rgba(255, 255, 255, 0.78);
          box-shadow:
            0 1rem 2.4rem rgba(81, 96, 156, 0.11),
            inset 0 1px 0 rgba(255, 255, 255, 0.96);
          padding: clamp(0.75rem, 3.2vw, 0.96rem);
          backdrop-filter: blur(16px);
        }

        .sf-ai-confirm-speak-card-head {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-height: 1.35rem;
        }

        .sf-ai-confirm-speak-edit {
          display: inline-flex;
          align-items: center;
          gap: 0.28rem;
          border: 0;
          border-radius: 999px;
          background: rgba(239, 243, 255, 0.84);
          color: #754dff;
          padding: 0.25rem 0.5rem;
          font-size: clamp(0.58rem, 2.65vw, 0.7rem);
          font-weight: 900;
          line-height: 1;
          cursor: pointer;
        }

        .sf-ai-confirm-speak-edit svg {
          width: 0.8rem;
          height: 0.8rem;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2.25;
        }

        .sf-ai-confirm-speak-textarea {
          width: 100%;
          min-height: clamp(4.8rem, 16dvh, 6.2rem);
          max-height: clamp(6.3rem, 22dvh, 8rem);
          margin-top: 0.34rem;
          border: 0;
          background: transparent;
          color: #070d34;
          resize: none;
          text-align: left;
          font: inherit;
          font-size: var(--sf-ai-confirm-speak-chinese-size);
          font-weight: 920;
          letter-spacing: 0;
          line-height: 1.55;
          outline: none;
          padding: 0.18rem clamp(0.38rem, 2.8vw, 1.15rem);
        }

        .sf-ai-confirm-speak-textarea::placeholder {
          color: rgba(61, 72, 114, 0.52);
        }

        .sf-ai-confirm-speak-card-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.42rem;
          margin: clamp(0.46rem, 2dvh, 0.68rem) 0 0;
          color: rgba(61, 67, 110, 0.64);
          font-size: clamp(0.61rem, 2.8vw, 0.73rem);
          font-weight: 720;
          line-height: 1.35;
          text-align: center;
        }

        .sf-ai-confirm-speak-card-note svg {
          width: 1.02rem;
          height: 1.02rem;
          flex: 0 0 auto;
          fill: url(#sf-ai-confirm-shield-gradient);
          stroke: #ffffff;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 0.35rem 0.72rem rgba(118, 90, 255, 0.22));
        }

        .sf-ai-confirm-speak-actions {
          display: grid;
          grid-template-columns: minmax(0, 0.84fr) minmax(0, 1.22fr);
          gap: clamp(0.48rem, 2.4vw, 0.72rem);
          margin-top: clamp(0.62rem, 2.7dvh, 0.82rem);
        }

        .sf-ai-confirm-speak-retry-button,
        .sf-ai-confirm-speak-confirm-button {
          min-width: 0;
          min-height: clamp(2.58rem, 10.5vw, 3.05rem);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.38rem;
          border-radius: 0.86rem;
          font-weight: 920;
          letter-spacing: 0;
          line-height: 1.16;
          box-shadow:
            0 0.82rem 1.7rem rgba(76, 92, 151, 0.11),
            inset 0 1px 0 rgba(255, 255, 255, 0.92);
          transition: opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease;
        }

        .sf-ai-confirm-speak-retry-button {
          background: rgba(255, 255, 255, 0.84);
          color: #08103a;
          font-size: clamp(0.73rem, 3.35vw, 0.88rem);
        }

        .sf-ai-confirm-speak-confirm-button {
          background: linear-gradient(135deg, #c686ff 0%, #7a54ff 100%);
          color: #fff !important;
          font-size: clamp(0.64rem, 2.9vw, 0.78rem);
          padding-inline: 0.48rem;
          text-align: center;
          box-shadow:
            0 0.9rem 1.9rem rgba(124, 86, 255, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.52);
        }

        .sf-ai-confirm-speak-confirm-button:disabled,
        .sf-ai-confirm-speak-confirm-button.is-recording-disabled {
          cursor: default;
          color: rgba(123, 96, 190, 0.56) !important;
          background: rgba(255, 255, 255, 0.54);
          box-shadow: inset 0 0 0 1px rgba(193, 169, 255, 0.58);
        }

        .sf-ai-confirm-speak-retry-button svg,
        .sf-ai-confirm-speak-confirm-button svg {
          width: clamp(0.96rem, 4.2vw, 1.14rem);
          height: clamp(0.96rem, 4.2vw, 1.14rem);
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2.45;
          flex: 0 0 auto;
        }

        .sf-ai-confirm-speak-divider {
          margin: clamp(0.7rem, 3.2dvh, 0.96rem) 0 clamp(0.55rem, 2.5dvh, 0.78rem);
          border-top: 2px dashed rgba(185, 162, 245, 0.42);
        }

        .sf-ai-confirm-speak-record-panel {
          position: relative;
          border: 1px solid rgba(217, 224, 247, 0.9);
          border-radius: clamp(0.95rem, 4.6vw, 1.28rem);
          background: rgba(255, 255, 255, 0.74);
          box-shadow:
            0 1.05rem 2.35rem rgba(86, 99, 153, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.96);
          padding: clamp(0.78rem, 3.3vw, 0.98rem) clamp(0.7rem, 3.4vw, 1rem);
          text-align: center;
          overflow: hidden;
          transition: opacity 180ms ease, transform 180ms ease, box-shadow 180ms ease;
        }

        .sf-ai-confirm-speak-record-panel::before {
          content: "";
          position: absolute;
          inset: auto 8% -25% 8%;
          height: 8rem;
          background: radial-gradient(circle, rgba(169, 133, 255, 0.13), transparent 67%);
          pointer-events: none;
        }

        .sf-ai-confirm-speak-record-panel-idle {
          opacity: 0.58;
        }

        .sf-ai-confirm-speak-record-panel-active {
          opacity: 1;
          box-shadow:
            0 1.22rem 2.8rem rgba(114, 91, 214, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.98);
        }

        .sf-ai-confirm-speak-record-title {
          position: relative;
          z-index: 1;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          color: #8b61ff;
          font-size: clamp(0.9rem, 4.1vw, 1.08rem);
          font-weight: 950;
          line-height: 1.18;
        }

        .sf-ai-confirm-speak-record-title > svg {
          width: 1rem;
          height: 1rem;
          fill: currentColor;
          flex: 0 0 auto;
        }

        .sf-ai-confirm-speak-record-panel-idle .sf-ai-confirm-speak-record-title {
          color: rgba(70, 69, 107, 0.66);
          font-size: clamp(0.88rem, 3.9vw, 1.02rem);
          line-height: 1.3;
        }

        .sf-ai-confirm-speak-record-copy {
          position: relative;
          z-index: 1;
          margin: 0.28rem 0 0;
          color: rgba(54, 62, 106, 0.68);
          font-size: clamp(0.62rem, 2.85vw, 0.74rem);
          font-weight: 720;
          line-height: 1.32;
        }

        .sf-ai-confirm-speak-listening-copy {
          position: relative;
          z-index: 1;
          margin: 0.48rem 0 0;
          color: #9a61ff;
          font-size: clamp(0.76rem, 3.35vw, 0.9rem);
          font-weight: 900;
          line-height: 1.15;
        }

        .sf-ai-confirm-speak-title-wave {
          display: inline-flex;
          align-items: center;
          gap: 0.1rem;
          height: 1rem;
          color: #b080ff;
        }

        .sf-ai-confirm-speak-title-wave span {
          width: 0.12rem;
          border-radius: 999px;
          background: currentColor;
          animation: sf-ai-confirm-speak-wave 860ms ease-in-out infinite;
        }

        .sf-ai-confirm-speak-title-wave span:nth-child(1),
        .sf-ai-confirm-speak-title-wave span:nth-child(5) { height: 0.38rem; }
        .sf-ai-confirm-speak-title-wave span:nth-child(2),
        .sf-ai-confirm-speak-title-wave span:nth-child(4) { height: 0.72rem; animation-delay: 90ms; }
        .sf-ai-confirm-speak-title-wave span:nth-child(3) { height: 1rem; animation-delay: 180ms; }

        .sf-ai-confirm-speak-mic-area {
          position: relative;
          z-index: 1;
          min-height: clamp(5.35rem, 22vw, 6.35rem);
          margin-top: clamp(0.55rem, 2.4vw, 0.76rem);
          display: grid;
          place-items: center;
        }

        .sf-ai-confirm-speak-mic-wrap {
          position: relative;
          display: grid;
          width: clamp(4.4rem, 19vw, 5.3rem);
          aspect-ratio: 1;
          place-items: center;
        }

        .sf-ai-confirm-speak-mic-wrap::before,
        .sf-ai-confirm-speak-mic-wrap::after {
          content: "";
          position: absolute;
          inset: -0.44rem;
          border-radius: 999px;
          background: rgba(170, 133, 255, 0.1);
          pointer-events: none;
        }

        .sf-ai-confirm-speak-mic-wrap::after {
          inset: -0.92rem;
          border: 1px solid rgba(162, 139, 255, 0.14);
          background: transparent;
        }

        .sf-ai-confirm-speak-record-panel-active .sf-ai-confirm-speak-mic-wrap::before {
          animation: sf-ai-confirm-speak-pulse 1.75s ease-in-out infinite;
          background: rgba(170, 103, 255, 0.16);
        }

        .sf-ai-confirm-speak-record-panel-active .sf-ai-confirm-speak-mic-wrap::after {
          animation: sf-ai-confirm-speak-pulse 1.75s ease-in-out infinite 260ms;
        }

        .sf-ai-confirm-speak-mic {
          position: relative;
          z-index: 1;
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          border-radius: 999px;
          background: linear-gradient(135deg, #f3f6ff 0%, #e4e8ff 100%);
          color: rgba(118, 123, 151, 0.54);
          box-shadow:
            0 0.74rem 1.6rem rgba(96, 105, 158, 0.1),
            inset 0 0 0 0.28rem rgba(255, 255, 255, 0.78);
        }

        .sf-ai-confirm-speak-mic-active {
          background:
            radial-gradient(circle at 33% 22%, rgba(255, 255, 255, 0.52), transparent 18%),
            linear-gradient(135deg, #b56cff 0%, #744dff 52%, #3042e6 100%);
          color: #ffffff;
          box-shadow:
            0 1rem 2.2rem rgba(101, 70, 226, 0.32),
            inset 0 0 0 0.3rem rgba(255, 255, 255, 0.88);
        }

        .sf-ai-confirm-speak-mic svg {
          width: 48%;
          height: 48%;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 3.75;
        }

        .sf-ai-confirm-speak-wave-bars {
          position: absolute;
          top: 50%;
          width: clamp(3rem, 14vw, 3.85rem);
          height: clamp(2.7rem, 12vw, 3.45rem);
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: rgba(159, 188, 255, 0.42);
          pointer-events: none;
        }

        .sf-ai-confirm-speak-wave-bars-left {
          right: calc(50% + clamp(2.85rem, 13vw, 3.6rem));
        }

        .sf-ai-confirm-speak-wave-bars-right {
          left: calc(50% + clamp(2.85rem, 13vw, 3.6rem));
        }

        .sf-ai-confirm-speak-wave-bars span {
          width: 0.14rem;
          border-radius: 999px;
          background: currentColor;
          animation: sf-ai-confirm-speak-wave 1.1s ease-in-out infinite;
        }

        .sf-ai-confirm-speak-wave-bars span:nth-child(1),
        .sf-ai-confirm-speak-wave-bars span:nth-child(7) { height: 24%; }
        .sf-ai-confirm-speak-wave-bars span:nth-child(2),
        .sf-ai-confirm-speak-wave-bars span:nth-child(6) { height: 48%; animation-delay: 100ms; }
        .sf-ai-confirm-speak-wave-bars span:nth-child(3),
        .sf-ai-confirm-speak-wave-bars span:nth-child(5) { height: 72%; animation-delay: 200ms; }
        .sf-ai-confirm-speak-wave-bars span:nth-child(4) { height: 100%; animation-delay: 300ms; }

        .sf-ai-confirm-speak-record-panel-active .sf-ai-confirm-speak-wave-bars {
          color: rgba(145, 97, 255, 0.58);
        }

        .sf-ai-confirm-speak-record-panel-idle .sf-ai-confirm-speak-wave-bars span,
        .sf-ai-confirm-speak-record-panel-idle .sf-ai-confirm-speak-title-wave span {
          animation: none;
        }

        .sf-ai-confirm-speak-stop-button {
          position: relative;
          z-index: 1;
          width: min(100%, 13rem);
          min-height: clamp(2rem, 8.5vw, 2.34rem);
          margin-top: clamp(0.42rem, 1.9vw, 0.62rem);
          border: 1px solid rgba(155, 104, 255, 0.76);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.68);
          color: #8a54ff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.34rem;
          font-size: clamp(0.66rem, 3vw, 0.78rem);
          font-weight: 900;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .sf-ai-confirm-speak-stop-button.is-idle {
          color: rgba(120, 106, 156, 0.52);
          border-color: rgba(174, 153, 222, 0.42);
          cursor: default;
        }

        .sf-ai-confirm-speak-stop-button svg {
          width: 0.96rem;
          height: 0.96rem;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 3;
        }

        .sf-ai-confirm-speak-tip {
          position: relative;
          z-index: 1;
          width: min(100%, 17.6rem);
          margin: clamp(0.48rem, 2vw, 0.62rem) auto 0;
          border-radius: 999px;
          background: rgba(237, 238, 255, 0.72);
          color: rgba(85, 72, 132, 0.72);
          padding: 0.45rem 0.7rem;
          font-size: clamp(0.6rem, 2.65vw, 0.72rem);
          font-weight: 760;
          line-height: 1.2;
        }

        .sf-ai-confirm-speak-tip svg {
          display: inline-block;
          width: 0.76rem;
          height: 0.76rem;
          margin-right: 0.24rem;
          fill: #a36eff;
          vertical-align: -0.1rem;
        }

        .sf-ai-confirm-speak-hidden-gradient {
          position: absolute;
          width: 0;
          height: 0;
          pointer-events: none;
        }

        html[data-app-theme] body .sf-ai-confirm-speak-page .sf-ai-confirm-speak-confirm-button:not(:disabled):not(.is-recording-disabled),
        html[data-app-theme] body .sf-ai-confirm-speak-page .sf-ai-confirm-speak-confirm-button:not(:disabled):not(.is-recording-disabled) * {
          color: #ffffff !important;
        }

        @keyframes sf-ai-confirm-speak-wave {
          0%, 100% {
            transform: scaleY(0.58);
            opacity: 0.68;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }

        @keyframes sf-ai-confirm-speak-pulse {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0.62;
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }

        @media (max-height: 720px) {
          .sf-ai-confirm-speak-frame {
            padding-top: calc(env(safe-area-inset-top, 0px) + 0.54rem);
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.64rem);
          }

          .sf-ai-confirm-speak-content {
            padding-top: 0.58rem;
          }

          .sf-ai-confirm-speak-chinese-card {
            min-height: 6.45rem;
            margin-top: 0.54rem;
            padding-top: 0.62rem;
            padding-bottom: 0.62rem;
          }

          .sf-ai-confirm-speak-textarea {
            min-height: 4.05rem;
            max-height: 5.15rem;
            line-height: 1.42;
          }

          .sf-ai-confirm-speak-card-note {
            margin-top: 0.38rem;
          }

          .sf-ai-confirm-speak-actions {
            margin-top: 0.5rem;
          }

          .sf-ai-confirm-speak-divider {
            margin-top: 0.58rem;
            margin-bottom: 0.48rem;
          }

          .sf-ai-confirm-speak-record-panel {
            padding-top: 0.66rem;
            padding-bottom: 0.72rem;
          }

          .sf-ai-confirm-speak-mic-area {
            min-height: 4.85rem;
            margin-top: 0.38rem;
          }

          .sf-ai-confirm-speak-mic-wrap {
            width: 4.1rem;
          }

          .sf-ai-confirm-speak-tip {
            margin-top: 0.42rem;
          }
        }

        @media (max-width: 360px) {
          .sf-ai-confirm-speak-frame {
            padding-inline: 0.72rem;
          }

          .sf-ai-confirm-speak-brand-title {
            font-size: 0.92rem;
          }

          .sf-ai-confirm-speak-brand-subtitle {
            font-size: 0.35rem;
          }

          .sf-ai-confirm-speak-actions {
            gap: 0.4rem;
          }

          .sf-ai-confirm-speak-retry-button {
            font-size: 0.68rem;
          }

          .sf-ai-confirm-speak-confirm-button {
            font-size: 0.6rem;
          }
        }
      `}</style>

      <svg className="sf-ai-confirm-speak-hidden-gradient" aria-hidden="true">
        <defs>
          <linearGradient id="sf-ai-confirm-shield-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="#b083ff" />
            <stop offset="1" stopColor="#6b4bff" />
          </linearGradient>
        </defs>
      </svg>

      <div className="sf-ai-confirm-speak-frame">
        <header className="sf-ai-confirm-speak-header">
          <button
            type="button"
            aria-label={menuLabel}
            onClick={onMenuClick}
            className="sf-ai-confirm-speak-home"
          >
            <HomeMenuIcon label={null} showHint={false} />
          </button>

          <div
            className="sf-ai-confirm-speak-brand"
            aria-label="SpeakFlow AI Voice Practice"
          >
            <span className="sf-ai-confirm-speak-logo">
              <SpeakFlowBrandMark className="sf-ai-confirm-speak-logo-mark" />
            </span>
            <span className="sf-ai-confirm-speak-brand-copy">
              <span className="sf-ai-confirm-speak-brand-title">SpeakFlow</span>
              <span className="sf-ai-confirm-speak-brand-subtitle">
                AI VOICE PRACTICE
              </span>
            </span>
          </div>

          <button
            type="button"
            aria-label="查看帮助"
            className="sf-ai-confirm-speak-help"
            aria-haspopup="dialog"
            aria-expanded={isHelpOpen}
            onClick={() => setIsHelpOpen(true)}
          >
            ?
          </button>
        </header>

        {headerAddon ? (
          <div className="sf-ai-confirm-speak-addon">{headerAddon}</div>
        ) : null}

        <main className="sf-ai-confirm-speak-content">
          <h1 className="sf-ai-confirm-speak-title">
            <SparkleGlyph />
            <span>你想表达的是：</span>
          </h1>

          <section className="sf-ai-confirm-speak-chinese-card">
            <div className="sf-ai-confirm-speak-card-head">
              <button
                type="button"
                className="sf-ai-confirm-speak-edit"
                onClick={focusChineseText}
              >
                <EditGlyph />
                <span>编辑中文</span>
              </button>
            </div>
            <textarea
              ref={textareaRef}
              aria-label="识别出的中文，可以编辑"
              className="sf-ai-confirm-speak-textarea"
              placeholder={emptyChineseText}
              style={chineseTextStyle}
              value={chineseText}
              onChange={(event) => onEditChinese(event.target.value)}
            />
          </section>

          <p className="sf-ai-confirm-speak-card-note">
            <ShieldGlyph />
            <span>这是我们听到的内容，你可以修改后再确认</span>
          </p>

          <section className="sf-ai-confirm-speak-actions">
            <button
              type="button"
              className="sf-ai-confirm-speak-retry-button"
              onClick={onRetryChinese}
            >
              <RefreshGlyph />
              <span>重新说中文</span>
            </button>
            <button
              type="button"
              className={`sf-ai-confirm-speak-confirm-button ${
                isRecordingEnglish ? "is-recording-disabled" : ""
              }`}
              onClick={handleStartEnglishRecording}
              disabled={!chineseText.trim() || isRecordingEnglish}
            >
              <CheckGlyph />
              <span>确认，点击麦克风说英文</span>
            </button>
          </section>

          <div className="sf-ai-confirm-speak-divider" />

          <section
            className={`sf-ai-confirm-speak-record-panel ${
              isRecordingEnglish
                ? "sf-ai-confirm-speak-record-panel-active"
                : "sf-ai-confirm-speak-record-panel-idle"
            }`}
            aria-label={
              isRecordingEnglish
                ? "看着中文说英文，正在录音"
                : "确认后开始英文录音"
            }
          >
            {isRecordingEnglish ? (
              <>
                <h2 className="sf-ai-confirm-speak-record-title">
                  <WaveIcon />
                  <span>看着中文，说英文</span>
                  <WaveIcon />
                </h2>
                <p className="sf-ai-confirm-speak-record-copy">
                  可以不完美，大胆说出来
                </p>
                <p className="sf-ai-confirm-speak-listening-copy">
                  正在听你说...
                </p>
              </>
            ) : (
              <>
                <h2 className="sf-ai-confirm-speak-record-title">
                  <SparkleGlyph />
                  <span>确认后，就可以看着中文说英文</span>
                </h2>
                <p className="sf-ai-confirm-speak-record-copy">
                  下方麦克风会在确认后亮起
                </p>
              </>
            )}

            <div className="sf-ai-confirm-speak-mic-area">
              <WaveBars side="left" />
              <div className="sf-ai-confirm-speak-mic-wrap">
                <button
                  type="button"
                  aria-label={
                    isRecordingEnglish
                      ? "点击麦克风结束录音"
                      : "确认后可开始英文录音"
                  }
                  className={`sf-ai-confirm-speak-mic ${
                    isRecordingEnglish ? "sf-ai-confirm-speak-mic-active" : ""
                  }`}
                  onClick={
                    isRecordingEnglish ? onStopEnglishRecording : undefined
                  }
                  disabled={!isRecordingEnglish}
                >
                  <MicGlyph />
                </button>
              </div>
              <WaveBars side="right" />
            </div>

            <button
              type="button"
              className={`sf-ai-confirm-speak-stop-button ${
                isRecordingEnglish ? "" : "is-idle"
              }`}
              onClick={isRecordingEnglish ? onStopEnglishRecording : undefined}
              disabled={!isRecordingEnglish}
            >
              <MicGlyph />
              <span>
                {isRecordingEnglish
                  ? "点击麦克风结束录音"
                  : "点击麦克风开始说英文"}
              </span>
            </button>

            {isRecordingEnglish ? (
              <p className="sf-ai-confirm-speak-tip">
                <SparkleGlyph />
                <span>说完后，AI 会给你更自然的英文表达</span>
              </p>
            ) : null}
          </section>
        </main>
      </div>

      <AiGuidedExpressionHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </section>
  );
}
