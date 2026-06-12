"use client";

import { useLayoutEffect, useRef } from "react";
import FreeStudyBottomNav from "@/components/FreeStudyBottomNav";

type FreeStudyPageThreeProps = {
  chineseText: string;
  hasProEntitlement?: boolean;
  menuLabel?: string;
  viewState?: "confirmChinese" | "recordingEnglish";
  onEditChinese: (value: string) => void;
  onRetryChinese: () => void;
  onStartEnglishPractice: () => void;
  onStopEnglishRecording?: () => void;
  onAccountClick?: () => void;
  onAvatarError?: () => void;
  onMenuClick?: () => void;
};

const COPY = {
  confirmAria: "确认中文并开始录制英语",
  confirmButton: "确认，点击麦克风说英文",
  editChinese: "编辑中文",
  editRecognized: "编辑识别出的中文",
  emptyChinese: "这里会显示你刚才说的中文",
  pageLabel: "自由学习确认中文和录英文",
  retryAria: "重新录制中文",
  retryButton: "重新说中文",
} as const;

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

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3 19 6v6.2c0 4.3-2.7 7.3-7 8.8-4.3-1.5-7-4.5-7-8.8V6l7-3Z" />
      <path d="m8.8 12 2.3 2.3 5-5.4" />
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

function WaveGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M9 21v6M16 14v20M23 10v28M30 14v20M37 21v6" />
    </svg>
  );
}

export default function FreeStudyPageThree({
  chineseText,
  hasProEntitlement = false,
  menuLabel = "回到学习首页",
  viewState = "confirmChinese",
  onEditChinese,
  onRetryChinese,
  onStartEnglishPractice,
  onStopEnglishRecording,
  onAccountClick,
  onMenuClick,
}: FreeStudyPageThreeProps) {
  const pageRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isRecordingEnglish = viewState === "recordingEnglish";
  const canConfirm = Boolean(chineseText.trim()) && !isRecordingEnglish;

  useLayoutEffect(() => {
    pageRef.current?.scrollTo({ top: 0, left: 0 });
  }, [viewState]);

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

  function focusChineseEditor() {
    const textarea = textareaRef.current;
    if (!textarea || isRecordingEnglish) return;

    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
  }

  function stopEnglishRecording() {
    onStopEnglishRecording?.();
  }

  return (
    <section
      ref={pageRef}
      className={`sf-free-confirm-page ${
        isRecordingEnglish ? "is-recording-english" : "is-confirming"
      }`}
      aria-label={COPY.pageLabel}
    >
      <style>{`
        .sf-free-confirm-page,
        .sf-free-confirm-page * {
          box-sizing: border-box;
        }

        .sf-speak-page:has(.sf-free-confirm-page) {
          min-height: 100dvh;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 12%, rgba(246,232,255,.92), transparent 38%),
            radial-gradient(circle at 78% 78%, rgba(230,217,255,.72), transparent 36%),
            linear-gradient(180deg, #f5ecff 0%, #fbf8ff 45%, #f4eaff 100%);
        }

        .sf-speak-page:has(.sf-free-confirm-page) > div {
          width: 100%;
          max-width: none;
          min-height: 100dvh;
          padding: 0;
        }

        .sf-speak-page:has(.sf-free-confirm-page) .sf-speak-phone {
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

        .sf-speak-page:has(.sf-free-confirm-page) .sf-speak-phone::before,
        .sf-speak-page:has(.sf-free-confirm-page) .sf-speak-phone::after,
        .sf-speak-page:has(.sf-free-confirm-page) .sf-speak-phone > .pointer-events-none {
          display: none;
        }

        .sf-speak-page:has(.sf-free-confirm-page) .sf-speak-phone > .absolute:has(.sf-free-confirm-page) {
          z-index: 120;
        }

        .sf-free-confirm-page {
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
            radial-gradient(circle at 50% 11%, rgba(244,231,255,.92), transparent 38%),
            radial-gradient(circle at 80% 75%, rgba(230,217,255,.75), transparent 38%),
            linear-gradient(180deg, #f5ecff 0%, #fbf8ff 45%, #f4eaff 100%);
          font-family: var(--sf-font-zh, "PingFang SC", "Microsoft YaHei", sans-serif);
        }

        .sf-free-confirm-frame {
          min-height: 100%;
          padding:
            calc(env(safe-area-inset-top, 0px) + clamp(2.25rem, 6.6dvh, 3.2rem))
            clamp(1.02rem, 4.6vw, 1.34rem)
            calc(env(safe-area-inset-bottom, 0px) + 6.2rem);
        }

        .sf-free-confirm-header {
          display: grid;
          grid-template-columns: 3.25rem minmax(0, 1fr) 3.25rem !important;
          align-items: center;
          gap: .5rem !important;
          height: 4.35rem !important;
          min-height: 4.35rem !important;
          max-height: 4.35rem !important;
          margin-bottom: clamp(1.35rem, 3.8dvh, 2.05rem);
          padding: 0 !important;
        }

        .sf-free-confirm-home,
        .sf-free-confirm-help,
        .sf-free-confirm-help-close {
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: rgba(255,255,255,.88);
          color: #101342;
          box-shadow: 0 16px 30px rgba(97,73,170,.15), inset 0 1px 0 rgba(255,255,255,.96);
          cursor: pointer;
        }

        .sf-free-confirm-home,
        .sf-free-confirm-help {
          width: 3.25rem !important;
          min-width: 3.25rem !important;
          height: 3.25rem !important;
          min-height: 3.25rem !important;
        }

        .sf-free-confirm-home .sf-home-menu-icon,
        .sf-free-confirm-home .sf-home-menu-icon svg {
          width: 2.12rem;
          height: 2.12rem;
          color: currentColor;
        }

        .sf-free-confirm-help {
          justify-self: end;
          color: #7a4dea;
          font-size: 1.38rem !important;
          font-weight: 950;
        }

        .sf-free-confirm-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .52rem !important;
          min-width: 0;
          overflow: visible;
        }

        .sf-free-confirm-logo {
          width: 2.45rem !important;
          min-width: 2.45rem !important;
          height: 2.45rem !important;
          display: grid;
          place-items: center;
        }

        .sf-free-confirm-logo svg {
          width: 2.45rem !important;
          height: 2.45rem !important;
        }

        .sf-free-confirm-brand-copy {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .sf-free-confirm-brand-title {
          color: #0b1244;
          font-size: clamp(1.46rem, 5.45vw, 1.78rem) !important;
          font-weight: 950;
          line-height: .94 !important;
          letter-spacing: 0;
          white-space: nowrap !important;
        }

        .sf-free-confirm-brand-subtitle {
          margin-top: .24rem !important;
          color: #7c4eed;
          font-size: clamp(.52rem, 2.05vw, .66rem) !important;
          font-weight: 850;
          line-height: 1 !important;
          letter-spacing: .13em !important;
          white-space: nowrap !important;
        }

        .sf-free-confirm-title {
          display: flex;
          align-items: center;
          gap: .52rem;
          margin: 0 0 .86rem;
          color: #101342;
          font-size: clamp(1.55rem, 6.15vw, 2rem);
          font-weight: 950;
          line-height: 1.08;
          letter-spacing: 0;
        }

        .sf-free-confirm-title svg {
          width: 1.58rem;
          height: 1.58rem;
          flex: 0 0 auto;
          fill: #8a56ee;
        }

        .sf-free-confirm-card {
          border: 1px solid rgba(157,111,233,.11);
          border-radius: 1.68rem;
          background: rgba(255,255,255,.86);
          min-height: clamp(11.9rem, 25dvh, 14.2rem);
          padding: clamp(1rem, 4.1vw, 1.34rem) clamp(1.12rem, 4.7vw, 1.52rem);
          box-shadow:
            0 18px 40px rgba(111, 77, 180, .11),
            inset 0 1px 0 rgba(255,255,255,.96);
        }

        .sf-free-confirm-card-head {
          display: flex;
          justify-content: flex-end;
          margin-bottom: clamp(.95rem, 2.75dvh, 1.42rem);
        }

        .sf-free-confirm-edit {
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          border: 0;
          background: transparent;
          color: #8a54ee;
          font-size: clamp(.9rem, 3.65vw, 1.06rem);
          font-weight: 900;
          cursor: pointer;
        }

        .sf-free-confirm-edit:disabled {
          opacity: .55;
          cursor: default;
        }

        .sf-free-confirm-edit svg,
        .sf-free-confirm-retry svg,
        .sf-free-confirm-button svg {
          width: 1.42rem;
          height: 1.42rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-confirm-textarea {
          display: block;
          width: 100%;
          min-height: clamp(5.9rem, 13dvh, 7.4rem);
          max-height: clamp(7.2rem, 18dvh, 9.4rem);
          resize: none;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #101342 !important;
          padding: 0 !important;
          font-family: var(--sf-font-zh, "PingFang SC", "Microsoft YaHei", sans-serif) !important;
          font-size: clamp(2.05rem, 8.25vw, 2.75rem) !important;
          font-weight: 950 !important;
          line-height: 1.38 !important;
          letter-spacing: 0 !important;
          caret-color: #8a54ee;
        }

        .sf-free-confirm-page .sf-free-confirm-card .sf-free-confirm-textarea {
          border-color: transparent !important;
          background: transparent !important;
          color: #101342 !important;
          font-size: clamp(2.05rem, 8.25vw, 2.75rem) !important;
          font-weight: 950 !important;
          line-height: 1.38 !important;
          appearance: none;
        }

        .sf-free-confirm-page .sf-free-confirm-textarea::placeholder {
          color: rgba(81, 73, 126, .42) !important;
        }

        .sf-free-confirm-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .56rem;
          margin: .72rem 0 .85rem;
          color: rgba(48,48,93,.72);
          font-size: clamp(.78rem, 3.15vw, .94rem);
          font-weight: 650;
          line-height: 1.35;
          text-align: center;
          white-space: nowrap;
        }

        .sf-free-confirm-note svg {
          width: 1.28rem;
          height: 1.28rem;
          flex: 0 0 auto;
          fill: #7f56ee;
          stroke: white;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-confirm-actions {
          display: grid;
          grid-template-columns: minmax(0, .88fr) minmax(0, 1.45fr);
          gap: .78rem;
          margin-bottom: .9rem;
        }

        .sf-free-confirm-retry,
        .sf-free-confirm-button {
          display: flex;
          min-height: clamp(3.05rem, 8.6dvh, 3.65rem);
          align-items: center;
          justify-content: center;
          gap: .52rem;
          border-radius: 1.18rem;
          font-size: clamp(.84rem, 3.45vw, 1.08rem);
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .sf-free-confirm-retry {
          border: 0;
          background: rgba(255,255,255,.86);
          color: #101342;
          box-shadow: 0 14px 28px rgba(104,75,173,.1), inset 0 1px 0 rgba(255,255,255,.96);
        }

        .sf-free-confirm-button {
          border: 1px solid rgba(255,255,255,.6);
          background: linear-gradient(90deg, #dca2ff 0%, #9b60ef 52%, #7654f1 100%);
          color: white;
          box-shadow: 0 16px 30px rgba(136,82,239,.24), inset 0 1px 0 rgba(255,255,255,.52);
        }

        .sf-free-confirm-button:disabled {
          border-color: rgba(160,115,237,.32);
          background: rgba(255,255,255,.46);
          color: rgba(122,80,221,.46);
          box-shadow: inset 0 0 0 1px rgba(153,111,235,.18);
          cursor: default;
        }

        .sf-free-record-divider {
          height: 1px;
          margin: 0 0 .78rem;
          background-image: linear-gradient(90deg, transparent 0, transparent 2%, rgba(161,117,238,.34) 2%, rgba(161,117,238,.34) 4%, transparent 4%, transparent 7%);
          background-size: 1.4rem 1px;
        }

        .sf-free-record-panel {
          border: 1px solid rgba(157,111,233,.13);
          border-radius: 1.5rem;
          background: rgba(255,255,255,.78);
          padding: .92rem .92rem 1rem;
          text-align: center;
          box-shadow: 0 18px 42px rgba(111,78,182,.1), inset 0 1px 0 rgba(255,255,255,.95);
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-panel {
          background: rgba(255,255,255,.62);
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-panel h2,
        .sf-free-confirm-page.is-confirming .sf-free-record-mic-row,
        .sf-free-confirm-page.is-confirming .sf-free-record-stop {
          opacity: .42;
        }

        .sf-free-record-panel h2 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
          margin: 0;
          color: #8a54ee;
          font-size: clamp(1.16rem, 4.85vw, 1.56rem);
          font-weight: 950;
          line-height: 1.14;
        }

        .sf-free-record-panel h2 svg {
          width: 1.55rem;
          height: 1.55rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 3.1;
          stroke-linecap: round;
        }

        .sf-free-record-panel > p {
          margin: .3rem 0 0;
          color: rgba(41,43,86,.72);
          font-size: clamp(.82rem, 3.35vw, .98rem);
          font-weight: 650;
        }

        .sf-free-record-status {
          display: none;
          margin-top: .54rem;
          color: #8a54ee;
          font-size: clamp(.96rem, 3.9vw, 1.12rem);
          font-weight: 900;
        }

        .sf-free-confirm-page.is-recording-english .sf-free-record-status {
          display: block;
        }

        .sf-free-record-mic-row {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(.78rem, 5vw, 1.7rem);
          margin: .72rem 0 .66rem;
        }

        .sf-free-record-wave {
          display: flex;
          align-items: center;
          gap: .34rem;
          color: #a36df4;
          opacity: .68;
        }

        .sf-free-record-wave span {
          width: .34rem;
          border-radius: 999px;
          background: currentColor;
        }

        .sf-free-record-mic {
          display: grid;
          width: clamp(4.55rem, 19.6vw, 5.65rem);
          aspect-ratio: 1;
          place-items: center;
          border: .55rem solid rgba(255,255,255,.82);
          border-radius: 50%;
          background: linear-gradient(135deg, #dba0ff, #8a54ee 62%, #6f4af0);
          color: white;
          box-shadow: 0 15px 34px rgba(133,78,235,.24), 0 0 0 .85rem rgba(148,94,238,.12);
          cursor: pointer;
        }

        .sf-free-confirm-page.is-recording-english .sf-free-record-mic {
          width: clamp(5rem, 21vw, 6.2rem);
          box-shadow:
            0 16px 36px rgba(133,78,235,.26),
            0 0 0 .76rem rgba(148,94,238,.12),
            0 0 0 1.35rem rgba(190,160,246,.1);
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-mic {
          cursor: default;
        }

        .sf-free-record-mic svg {
          width: 46%;
          height: 46%;
          fill: currentColor;
          stroke: currentColor;
          stroke-width: 3.4;
          stroke-linecap: round;
        }

        .sf-free-record-stop {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .45rem;
          width: min(100%, 16.7rem);
          min-height: 2.55rem;
          border: 1px solid #9b63ef;
          border-radius: 999px;
          background: rgba(255,255,255,.74);
          color: #8353ef;
          font-size: clamp(.82rem, 3.35vw, .98rem);
          font-weight: 850;
          cursor: pointer;
        }

        .sf-free-record-tip {
          margin: .65rem auto 0;
          border-radius: .86rem;
          background: rgba(240,232,255,.78);
          padding: .62rem .82rem;
          color: rgba(76,62,125,.72);
          font-size: clamp(.78rem, 3.1vw, .92rem);
          font-weight: 650;
        }

        .sf-free-confirm-help-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: grid;
          place-items: center;
          background: rgba(25,27,44,.36);
          padding: 1rem;
          backdrop-filter: blur(10px);
        }

        .sf-free-confirm-help-modal {
          width: min(100%, 24rem);
          border: 1px solid rgba(159,121,230,.18);
          border-radius: 1.8rem;
          background: rgba(255,255,255,.96);
          padding: 1.35rem;
          box-shadow: 0 28px 60px rgba(37,31,78,.24);
        }

        .sf-free-confirm-help-modal header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .sf-free-confirm-help-modal h2 {
          margin: 0;
          color: #101342;
          font-size: 1.4rem;
          font-weight: 950;
        }

        .sf-free-confirm-help-close {
          width: 2.6rem;
          height: 2.6rem;
        }

        .sf-free-confirm-help-close svg {
          width: 1.35rem;
          height: 1.35rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.6;
          stroke-linecap: round;
        }

        .sf-free-confirm-help-modal p {
          margin: 1rem 0 0;
          color: rgba(37,39,83,.72);
          font-size: 1rem;
          font-weight: 650;
          line-height: 1.65;
        }

        /* Final free-study confirm/speak polish against the standard reference. */
        .sf-speak-page:has(.sf-free-confirm-page) {
          background:
            radial-gradient(circle at 50% 8%, rgba(255,255,255,.95), transparent 24%),
            radial-gradient(circle at 50% 58%, rgba(168,128,255,.12), transparent 48%),
            linear-gradient(180deg, #fcfbff 0%, #faf7ff 52%, #f8f3ff 100%) !important;
        }

        .sf-free-confirm-frame {
          padding-top: calc(env(safe-area-inset-top, 0px) + clamp(2.25rem, 6.6dvh, 3.2rem)) !important;
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6.2rem) !important;
          gap: .78rem !important;
        }

        .sf-free-confirm-header {
          transform: translateY(-1rem);
          margin-bottom: -.45rem !important;
        }

        .sf-free-confirm-brand {
          transform: scale(1.08);
        }

        .sf-free-confirm-home,
        .sf-free-confirm-help {
          border-radius: 999px !important;
          background: rgba(255,255,255,.92) !important;
          box-shadow: 0 14px 26px rgba(112,83,184,.12), inset 0 1px 0 rgba(255,255,255,.98) !important;
        }

        .sf-free-confirm-title {
          margin: .35rem 0 .95rem !important;
          padding-left: 2.15rem !important;
          gap: .55rem !important;
        }

        .sf-free-confirm-card {
          min-height: clamp(14.8rem, 34dvh, 18rem) !important;
          border-radius: 1.55rem !important;
          padding: 1.08rem 1.18rem 1.35rem !important;
          box-shadow: 0 20px 42px rgba(111,78,182,.08), inset 0 1px 0 rgba(255,255,255,.96) !important;
        }

        .sf-free-confirm-edit {
          color: #8b5cf6 !important;
          font-size: .88rem !important;
          gap: .32rem !important;
        }

        .sf-free-confirm-edit svg {
          width: 1rem !important;
          height: 1rem !important;
        }

        .sf-free-confirm-textarea {
          min-height: 9.4rem !important;
          padding: 1.45rem 1.15rem !important;
          font-size: clamp(1.85rem, 8.4vw, 2.62rem) !important;
          line-height: 1.42 !important;
          align-content: center;
        }

        .sf-free-confirm-note {
          margin-top: .96rem !important;
          color: rgba(66,61,111,.82) !important;
          font-weight: 700 !important;
        }

        .sf-free-confirm-actions {
          grid-template-columns: minmax(0, .78fr) minmax(0, 1.42fr) !important;
          gap: .92rem !important;
          margin: .95rem 0 1.02rem !important;
        }

        .sf-free-confirm-retry,
        .sf-free-confirm-button {
          min-height: 4rem !important;
          border-radius: 1.38rem !important;
          font-size: clamp(.86rem, 3.25vw, 1.02rem) !important;
        }

        .sf-free-confirm-button {
          background: linear-gradient(100deg, #dda4ff 0%, #a064f4 48%, #754df0 100%) !important;
          color: rgba(255,255,255,.96) !important;
          box-shadow: 0 17px 30px rgba(137,82,238,.22), inset 0 1px 0 rgba(255,255,255,.52) !important;
        }

        .sf-free-confirm-button:disabled {
          color: rgba(135,93,218,.42) !important;
          background: rgba(255,255,255,.5) !important;
        }

        .sf-free-record-divider {
          margin-bottom: .95rem !important;
          background-size: 1.22rem 1px !important;
          background-image: linear-gradient(90deg, transparent 0, transparent 22%, rgba(216,199,255,.55) 22%, rgba(216,199,255,.55) 55%, transparent 55%, transparent 100%) !important;
        }

        .sf-free-record-panel {
          border-radius: 1.45rem !important;
          padding: 1.05rem .9rem 1.1rem !important;
          background: rgba(255,255,255,.74) !important;
          box-shadow: 0 18px 38px rgba(111,78,182,.07), inset 0 1px 0 rgba(255,255,255,.96) !important;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-panel {
          background: linear-gradient(180deg, rgba(255,255,255,.62), rgba(250,246,255,.5)) !important;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-panel h2,
        .sf-free-confirm-page.is-confirming .sf-free-record-mic-row,
        .sf-free-confirm-page.is-confirming .sf-free-record-stop {
          opacity: .34 !important;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-panel h2 {
          font-size: clamp(1.08rem, 4.25vw, 1.36rem) !important;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-mic-row {
          margin: .5rem 0 .5rem !important;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-mic {
          width: clamp(3.7rem, 16vw, 4.55rem) !important;
          border-width: .45rem !important;
          background: linear-gradient(135deg, #efe8ff, #c7aff7) !important;
          color: white !important;
          box-shadow: 0 0 0 .72rem rgba(180,150,245,.1), 0 12px 22px rgba(116,82,178,.08) !important;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-wave {
          opacity: .32 !important;
          transform: scale(.92) !important;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-stop {
          width: min(100%, 14.6rem) !important;
          min-height: 2.25rem !important;
          font-size: .82rem !important;
          background: rgba(255,255,255,.58) !important;
          border-color: rgba(153,111,235,.22) !important;
        }

        .sf-free-confirm-page.is-recording-english .sf-free-record-mic {
          width: clamp(4.55rem, 18.5vw, 5.35rem) !important;
        }

        @media (max-width: 360px) {
          .sf-free-confirm-frame {
            padding-left: .86rem;
            padding-right: .86rem;
          }

          .sf-free-confirm-header {
            grid-template-columns: 3rem minmax(0, 1fr) 3rem !important;
          }

          .sf-free-confirm-textarea {
            font-size: 1.85rem !important;
          }

          .sf-free-confirm-retry,
          .sf-free-confirm-button {
            font-size: .82rem;
          }
        }

        .sf-free-confirm-frame {
          padding-top: calc(env(safe-area-inset-top, 0px) + clamp(1.05rem, 3.8dvh, 1.55rem)) !important;
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6.3rem) !important;
        }

        .sf-free-confirm-frame > main {
          display: grid;
          gap: clamp(.62rem, 1.7dvh, .86rem);
        }

        .sf-free-confirm-title {
          margin: 0 !important;
          padding-left: clamp(1.1rem, 5vw, 1.72rem) !important;
          font-size: clamp(1.42rem, 5.6vw, 1.76rem) !important;
        }

        .sf-free-confirm-title svg {
          width: 1.42rem !important;
          height: 1.42rem !important;
        }

        .sf-free-confirm-card {
          min-height: clamp(12.15rem, 27dvh, 14.55rem) !important;
          padding: .82rem 1.1rem 1rem !important;
        }

        .sf-free-confirm-card-head {
          margin-bottom: .26rem !important;
        }

        .sf-free-confirm-textarea {
          min-height: clamp(8.2rem, 18.4dvh, 10.7rem) !important;
          max-height: clamp(9.4rem, 22dvh, 12rem) !important;
          padding: .72rem .88rem !important;
          font-size: clamp(1.74rem, 7.45vw, 2.36rem) !important;
          line-height: 1.34 !important;
        }

        .sf-free-confirm-note {
          margin: .06rem 0 0 !important;
          font-size: clamp(.78rem, 3.1vw, .92rem) !important;
        }

        .sf-free-confirm-actions {
          gap: .86rem !important;
          margin: 0 !important;
        }

        .sf-free-confirm-retry,
        .sf-free-confirm-button {
          min-height: clamp(3.18rem, 7.4dvh, 3.58rem) !important;
          border-radius: 1.18rem !important;
          font-size: clamp(.84rem, 3.25vw, 1rem) !important;
        }

        .sf-free-record-divider {
          margin: .02rem 0 .02rem !important;
        }

        .sf-free-record-panel {
          min-height: clamp(12rem, 25.2dvh, 14.2rem) !important;
          overflow: hidden;
          padding: .86rem .9rem .96rem !important;
        }

        .sf-free-record-panel h2 {
          flex-wrap: nowrap;
          gap: .42rem !important;
          font-size: clamp(1.14rem, 4.7vw, 1.46rem) !important;
          white-space: nowrap;
        }

        .sf-free-record-panel h2 span {
          white-space: nowrap;
        }

        .sf-free-record-panel h2 svg {
          width: 1.28rem !important;
          height: 1.28rem !important;
          flex: 0 0 auto;
        }

        .sf-free-record-panel > p {
          margin-top: .22rem !important;
        }

        .sf-free-record-status {
          margin-top: .42rem !important;
        }

        .sf-free-record-mic-row {
          margin: .5rem 0 .54rem !important;
          gap: clamp(.7rem, 4.2vw, 1.35rem) !important;
        }

        .sf-free-record-mic {
          width: clamp(4.18rem, 17.2vw, 5rem) !important;
        }

        .sf-free-record-stop {
          width: min(100%, 15.7rem) !important;
          min-height: 2.38rem !important;
          font-size: clamp(.82rem, 3.25vw, .96rem) !important;
        }

        .sf-free-record-stop svg {
          width: 1.06rem !important;
          height: 1.06rem !important;
          flex: 0 0 auto;
          fill: currentColor;
          stroke: currentColor;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-panel {
          min-height: clamp(12.2rem, 25.5dvh, 14.25rem) !important;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-panel h2 {
          color: rgba(132, 101, 205, .62) !important;
          font-size: clamp(.96rem, 3.9vw, 1.18rem) !important;
          opacity: .52 !important;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-mic {
          width: clamp(3.8rem, 15.4vw, 4.45rem) !important;
        }

        .sf-free-confirm-page.is-confirming .sf-free-record-stop {
          width: min(100%, 15.5rem) !important;
          min-height: 2.34rem !important;
          color: rgba(132, 101, 205, .52) !important;
        }

        .sf-free-confirm-page.is-recording-english .sf-free-record-panel {
          min-height: clamp(18rem, 38dvh, 21.4rem) !important;
          padding-top: 1rem !important;
        }

        .sf-free-confirm-page.is-recording-english .sf-free-record-panel h2 {
          color: #8a54ee !important;
        }

        .sf-free-confirm-page.is-recording-english .sf-free-record-mic {
          width: clamp(4.9rem, 19.4vw, 5.72rem) !important;
        }

        .sf-free-confirm-page.is-recording-english .sf-free-record-tip {
          margin-top: .58rem !important;
        }
      `}</style>

      <div className="sf-free-confirm-frame">
        <main>
          <h1 className="sf-free-confirm-title">
            <SparklesGlyph />
            你想表达的是：
          </h1>

          <section className="sf-free-confirm-card">
            <div className="sf-free-confirm-card-head">
              <button
                type="button"
                onClick={focusChineseEditor}
                disabled={isRecordingEnglish}
                className="sf-free-confirm-edit"
              >
                <EditGlyph />
                {COPY.editChinese}
              </button>
            </div>

            <textarea
              ref={textareaRef}
              aria-label={COPY.editRecognized}
              lang="zh-CN"
              value={chineseText}
              onChange={(event) => onEditChinese(event.target.value)}
              placeholder={COPY.emptyChinese}
              readOnly={isRecordingEnglish}
              className="sf-free-confirm-textarea"
            />
          </section>

          <p className="sf-free-confirm-note">
            <ShieldGlyph />
            这是我们听到的内容，你可以修改后再确认
          </p>

          <div className="sf-free-confirm-actions">
            <button
              type="button"
              aria-label={COPY.retryAria}
              onClick={onRetryChinese}
              className="sf-free-confirm-retry"
            >
              <RefreshGlyph />
              {COPY.retryButton}
            </button>

            <button
              type="button"
              aria-label={COPY.confirmAria}
              onClick={onStartEnglishPractice}
              disabled={!canConfirm}
              className="sf-free-confirm-button"
            >
              {COPY.confirmButton}
            </button>
          </div>

          <div className="sf-free-record-divider" />

          <section className="sf-free-record-panel" aria-live="polite">
            <h2>
              {isRecordingEnglish ? (
                <>
                  <WaveGlyph />
                  <span>看着中文，说英文</span>
                  <WaveGlyph />
                </>
              ) : (
                <>
                  <SparklesGlyph />
                  <span>确认后，就可以看着中文说英文</span>
                </>
              )}
            </h2>
            {isRecordingEnglish ? <p>可以不完美，大胆说出来</p> : null}
            <span className="sf-free-record-status">正在听你说...</span>

            <div className="sf-free-record-mic-row">
              <span className="sf-free-record-wave" aria-hidden="true">
                {[24, 42, 64, 48, 28].map((height) => (
                  <span key={`left-${height}`} style={{ height }} />
                ))}
              </span>
              <button
                type="button"
                aria-label={
                  isRecordingEnglish ? "点击麦克风结束录音" : "等待确认中文后录英文"
                }
                onClick={isRecordingEnglish ? stopEnglishRecording : undefined}
                className="sf-free-record-mic"
              >
                <MicGlyph />
              </button>
              <span className="sf-free-record-wave" aria-hidden="true">
                {[28, 48, 64, 42, 24].map((height) => (
                  <span key={`right-${height}`} style={{ height }} />
                ))}
              </span>
            </div>

            {isRecordingEnglish ? (
              <>
                <button
                  type="button"
                  onClick={stopEnglishRecording}
                  className="sf-free-record-stop"
                >
                  <MicGlyph />
                  点击麦克风结束录音
                </button>
                <p className="sf-free-record-tip">
                  说完后，AI 会给你更自然的英文表达
                </p>
              </>
            ) : (
              <button
                type="button"
                disabled
                className="sf-free-record-stop"
              >
                <MicGlyph />
                点击麦克风开始说英文
              </button>
            )}
          </section>
        </main>
      </div>

      <FreeStudyBottomNav
        hasProEntitlement={hasProEntitlement}
        menuLabel={menuLabel}
        onAccountClick={onAccountClick}
        onMenuClick={onMenuClick}
      />
    </section>
  );
}
