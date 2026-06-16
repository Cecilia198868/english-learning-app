"use client";

import type { ReactNode } from "react";
import FreeStudyBottomNav from "@/components/FreeStudyBottomNav";

type FreeStudyPageFiveTopProps = {
  userEnglishText: string;
  expressions: string[];
  selectedExpressionIndex: number;
  avatarSrc?: string;
  avatarAlt?: string;
  accountLabel?: string;
  hasProEntitlement?: boolean;
  onAiGuidedPractice: () => void;
  onRetryEnglish: () => void;
  onMenuClick: () => void;
  onAccountClick: () => void;
  onAvatarError?: () => void;
  onContinueNext: () => void;
  onPlayExpression: (index: number, rate?: number) => void;
  onSelectExpression: (index: number) => void;
  renderExpressionText?: (
    text: string,
    index: number,
    tone: string
  ) => ReactNode;
  renderUserExpressionText?: (text: string) => ReactNode;
};

const expressionMeta = [
  {
    badge: "最自然地道",
    description: "自然地道 · 最推荐",
    icon: "star",
    tone: "violet",
  },
  {
    badge: "更地道",
    description: "",
    icon: "tree",
    tone: "green",
  },
  {
    badge: "更简单",
    description: "",
    icon: "leaf",
    tone: "blue",
  },
  {
    badge: "更口语",
    description: "",
    icon: "chat",
    tone: "purple",
  },
] as const;

function WaveGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M9 21v6M16 14v20M23 10v28M30 14v20M37 21v6" />
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

function LightGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M15 21a9 9 0 1 1 18 0c0 4.8-3.4 7.2-5.2 10.5h-7.6C18.4 28.2 15 25.8 15 21Z" />
      <path d="M20 36h8M21 41h6M24 4v4M9.5 10.5l2.8 2.8M38.5 10.5l-2.8 2.8" />
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

function PlayGlyph() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M11.2 8.4v15.2L22.8 16 11.2 8.4Z" />
    </svg>
  );
}

function ContinueArrowGlyph() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M6 16h19" />
      <path d="m18 8 8 8-8 8" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" />
      <path d="m7.8 12.2 2.6 2.5 5.8-6" />
    </svg>
  );
}

function StarGlyph() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="m20 5 4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L20 28.6 10.7 33.5l1.8-10.3L5 15.9l10.4-1.5L20 5Z" />
    </svg>
  );
}

function TreeGlyph() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M20 5c5 4.2 7.2 8.6 6.5 13.2-3.5-.5-5.8-2-7-4.4-1.2 2.8-3.6 4.6-7.2 5.4-.8-5.1 1.8-9.8 7.7-14.2Z" />
      <path d="M20 17v15M20 24c-3 0-5.8-1.2-8-3.6M20 24c3 0 5.8-1.2 8-3.6" />
    </svg>
  );
}

function LeafGlyph() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M23 5C29 10 30.5 16 27.5 23.2c-5.2-.3-8.6-2.7-10.1-7.2-2 2.9-4.6 4.8-7.9 5.7C8.2 14.9 12.7 9.4 23 5Z" />
      <path d="M18.5 21.5 11 32M18.5 21.5c3-.4 5.6-1.8 7.8-4.4" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M20 8c-7 0-12.5 4.8-12.5 10.7 0 3.4 1.9 6.4 4.9 8.3l-1 4.8 5-2.7c1.1.2 2.3.4 3.6.4 7 0 12.5-4.8 12.5-10.8S27 8 20 8Z" />
      <path d="M15 19h.1M20 19h.1M25 19h.1" />
    </svg>
  );
}

function ExpressionIcon({ name }: { name: (typeof expressionMeta)[number]["icon"] }) {
  if (name === "tree") return <TreeGlyph />;
  if (name === "leaf") return <LeafGlyph />;
  if (name === "chat") return <ChatGlyph />;
  return <StarGlyph />;
}

function renderExpressionText(text: string, tone: string) {
  const normalized = text.trim() || "Preparing a better expression.";
  const match = normalized.match(/^(.*?)([A-Za-z]+(?:\s+[A-Za-z]+)?)([.!?。！？]*)$/);

  if (!match) return normalized;

  return (
    <>
      {match[1]}
      <span className={`sf-free-result-emphasis is-${tone}`}>{match[2]}</span>
      {match[3]}
    </>
  );
}

export default function FreeStudyPageFiveTop({
  userEnglishText,
  expressions,
  selectedExpressionIndex,
  hasProEntitlement = false,
  onAiGuidedPractice,
  onRetryEnglish,
  onMenuClick,
  onAccountClick,
  onContinueNext,
  onPlayExpression,
  onSelectExpression,
  renderExpressionText: renderInteractiveExpressionText,
  renderUserExpressionText,
}: FreeStudyPageFiveTopProps) {
  const displayText = userEnglishText.trim() || " ";
  const preparedExpressions = expressionMeta.map((meta, index) => ({
    ...meta,
    text:
      expressions[index]?.trim() ||
      expressions[0]?.trim() ||
      "Preparing a better expression.",
  }));
  const safeSelectedIndex = Math.min(
    Math.max(selectedExpressionIndex, 0),
    preparedExpressions.length - 1
  );

  return (
    <section className="sf-free-result-page" aria-label="自由学习英语结果">
      <style>{`
        .sf-free-result-page,
        .sf-free-result-page * {
          box-sizing: border-box;
        }

        .sf-speak-page:has(.sf-free-result-page) {
          min-height: 100dvh;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 0%, rgba(244,231,255,.95), transparent 36%),
            radial-gradient(circle at 82% 78%, rgba(228,216,255,.82), transparent 40%),
            linear-gradient(180deg, #f4edff 0%, #fbfaff 45%, #f4edff 100%);
        }

        .sf-speak-page:has(.sf-free-result-page) > div {
          width: 100%;
          max-width: none;
          min-height: 100dvh;
          padding: 0;
        }

        .sf-speak-page:has(.sf-free-result-page) .sf-speak-phone {
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

        .sf-speak-page:has(.sf-free-result-page) .sf-speak-phone::before,
        .sf-speak-page:has(.sf-free-result-page) .sf-speak-phone::after,
        .sf-speak-page:has(.sf-free-result-page) .sf-speak-phone > .pointer-events-none {
          display: none;
        }

        .sf-speak-page:has(.sf-free-result-page) .sf-speak-phone > .absolute:has(.sf-free-result-page) {
          z-index: 120;
        }

        .sf-free-result-page {
          --sf-free-result-cta-height: clamp(3.8rem, 15vw, 4.35rem);
          --sf-free-result-nav-height: clamp(4.86rem, 20.2vw, 5.65rem);
          --sf-free-result-fixed-gap: clamp(0.72rem, 3vw, 0.95rem);
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
            radial-gradient(circle at 50% 0%, rgba(244,231,255,.95), transparent 36%),
            radial-gradient(circle at 82% 78%, rgba(228,216,255,.82), transparent 40%),
            linear-gradient(180deg, #f4edff 0%, #fbfaff 45%, #f4edff 100%);
          font-family: var(--sf-font-zh, "PingFang SC", "Microsoft YaHei", sans-serif);
        }

        .sf-free-result-frame {
          min-height: 100%;
          padding:
            calc(env(safe-area-inset-top, 0px) + clamp(.62rem, 2dvh, .9rem))
            clamp(.82rem, 3.8vw, 1.08rem)
            calc(
              env(safe-area-inset-bottom, 0px) +
              var(--sf-free-result-cta-height) +
              var(--sf-free-result-nav-height) +
              2.45rem
            );
        }

        .sf-free-result-header,
        .sf-free-result-ai-card,
        .sf-free-result-user-card,
        .sf-free-result-expression-card {
          border: 1px solid rgba(157,111,233,.12);
          background: rgba(255,255,255,.82);
          box-shadow: 0 16px 36px rgba(110,74,180,.1), inset 0 1px 0 rgba(255,255,255,.96);
        }

        .sf-free-result-header {
          display: grid;
          grid-template-columns: clamp(2.2rem, 10vw, 2.7rem) minmax(0, 1fr) clamp(2.2rem, 10vw, 2.7rem);
          align-items: center;
          gap: clamp(.28rem, 1.5vw, .5rem);
          min-height: clamp(4.1rem, 16vw, 4.75rem);
          border-radius: 1.22rem;
          padding: .48rem .62rem;
        }

        .sf-free-result-home,
        .sf-free-result-help,
        .sf-free-result-help-close {
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: rgba(255,255,255,.92);
          color: #101342;
          box-shadow: 0 12px 24px rgba(97,73,170,.14), inset 0 1px 0 rgba(255,255,255,.98);
          cursor: pointer;
        }

        .sf-free-result-home,
        .sf-free-result-help {
          width: clamp(2.15rem, 9.2vw, 2.55rem);
          height: clamp(2.15rem, 9.2vw, 2.55rem);
        }

        .sf-free-result-home .sf-home-menu-icon,
        .sf-free-result-home .sf-home-menu-icon svg {
          width: clamp(1.2rem, 5.4vw, 1.55rem);
          height: clamp(1.2rem, 5.4vw, 1.55rem);
          color: currentColor;
        }

        .sf-free-result-help {
          justify-self: end;
          font-size: clamp(1rem, 4.7vw, 1.25rem);
          font-weight: 950;
        }

        .sf-free-result-brand {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          gap: clamp(.24rem, 1.6vw, .42rem);
        }

        .sf-free-result-logo {
          display: grid;
          width: clamp(1.45rem, 6.5vw, 1.9rem);
          height: clamp(1.45rem, 6.5vw, 1.9rem);
          place-items: center;
        }

        .sf-free-result-logo svg {
          width: clamp(1.4rem, 6.2vw, 1.82rem);
          height: clamp(1.4rem, 6.2vw, 1.82rem);
        }

        .sf-free-result-brand-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .sf-free-result-brand-title {
          color: #0b1244;
          font-size: clamp(.95rem, 4.45vw, 1.38rem);
          font-weight: 950;
          line-height: .92;
          letter-spacing: 0;
          white-space: nowrap;
        }

        .sf-free-result-brand-subtitle {
          margin-top: .2rem;
          color: #202344;
          font-size: clamp(.42rem, 1.65vw, .58rem);
          font-weight: 800;
          line-height: 1;
          letter-spacing: .18em;
          white-space: nowrap;
        }

        .sf-free-result-ai-card {
          display: grid;
          grid-template-columns: 3.05rem minmax(0, 1fr) auto;
          align-items: center;
          gap: .54rem;
          min-height: clamp(5.72rem, 22vw, 6.42rem);
          margin-top: clamp(.88rem, 3dvh, 1.12rem);
          border-radius: 1.36rem;
          padding: .84rem .78rem .84rem .86rem;
        }

        .sf-free-result-ai-icon {
          display: grid;
          width: 3.05rem;
          height: 3.05rem;
          place-items: center;
          border-radius: 50%;
          background: rgba(236,228,255,.86);
          color: #8353ef;
        }

        .sf-free-result-ai-icon svg,
        .sf-free-result-section-title svg,
        .sf-free-result-user-title svg {
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-result-ai-icon svg {
          width: 1.82rem;
          height: 1.82rem;
          stroke-width: 3;
        }

        .sf-free-result-ai-copy {
          min-width: 0;
        }

        .sf-free-result-ai-copy strong {
          display: block;
          color: #101342;
          font-size: 1.28rem;
          font-weight: 950;
          line-height: 1.08;
          white-space: nowrap;
        }

        .sf-free-result-ai-copy span {
          display: block;
          margin-top: .15rem;
          color: #8353ef;
          font-size: 1.22rem;
          font-weight: 900;
          line-height: 1.1;
          white-space: nowrap;
        }

        .sf-free-result-change {
          display: inline-flex;
          align-items: center;
          gap: .34rem;
          min-width: 5.05rem;
          min-height: 2.55rem;
          border: 1px solid #9a61ef;
          border-radius: 999px;
          background: rgba(255,255,255,.7);
          padding: 0 .66rem;
          color: #8353ef;
          font-size: .9rem;
          font-weight: 900;
          white-space: nowrap;
          cursor: pointer;
        }

        .sf-free-result-change svg {
          width: 1rem;
          height: 1rem;
          fill: currentColor;
        }

        .sf-free-result-user-card {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: .82rem .78rem;
          min-height: clamp(8.35rem, 30vw, 9.7rem);
          margin-top: .92rem;
          border-radius: 1.42rem;
          padding: clamp(1.08rem, 4.2vw, 1.28rem) clamp(1.02rem, 4.5vw, 1.32rem);
        }

        .sf-free-result-user-title {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          gap: .55rem;
          color: #101342;
          font-size: clamp(1.25rem, 5.45vw, 1.65rem);
          font-weight: 950;
          line-height: 1;
        }

        .sf-free-result-user-title svg {
          width: 1rem;
          height: 1rem;
          color: #8655ef;
          stroke-width: 3.4;
        }

        .sf-free-result-user-text {
          align-self: center;
          margin: 0;
          color: #101342;
          font-size: clamp(1.55rem, 6.65vw, 2rem);
          font-weight: 950;
          line-height: 1.08;
          letter-spacing: 0;
          word-break: normal;
          overflow-wrap: anywhere;
        }

        .sf-free-result-user-highlight {
          display: inline;
          border-radius: .46rem;
          background:
            linear-gradient(180deg, rgba(255,244,178,.88), rgba(255,224,111,.88));
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          padding: .03em .16em .08em;
          box-shadow: inset 0 -.26em 0 rgba(255,211,75,.45);
        }

        .sf-free-result-user-highlight :where(button, span) {
          display: inline !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: inherit !important;
          padding: 0 !important;
          font: inherit !important;
          line-height: inherit !important;
        }

        .sf-free-result-retry {
          align-self: center;
          display: inline-flex;
          align-items: center;
          gap: .44rem;
          min-height: clamp(2.65rem, 11.3vw, 3.15rem);
          border: 1px solid #9a61ef;
          border-radius: 1rem;
          background: rgba(255,255,255,.78);
          padding: 0 clamp(.72rem, 3.4vw, 1rem);
          color: #101342;
          font-size: clamp(.96rem, 4.05vw, 1.16rem);
          font-weight: 900;
          white-space: nowrap;
          cursor: pointer;
        }

        .sf-free-result-retry svg {
          width: 1.05rem;
          height: 1.05rem;
          fill: none;
          stroke: #8a54ee;
          stroke-width: 2.3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-result-section-title {
          display: flex;
          align-items: center;
          gap: .48rem;
          margin: clamp(.9rem, 3.1dvh, 1.12rem) 0 .6rem;
          color: #101342;
          font-size: clamp(1.28rem, 5.6vw, 1.72rem);
          font-weight: 950;
        }

        .sf-free-result-section-title svg {
          width: 1.18rem;
          height: 1.18rem;
          color: #8a54ee;
          fill: currentColor;
        }

        .sf-free-result-list {
          display: grid;
          gap: clamp(.68rem, 2.7vw, .84rem);
        }

        .sf-free-result-expression-card {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: clamp(.54rem, 2.4vw, .72rem);
          min-height: clamp(5.52rem, 20vw, 6.28rem);
          overflow: hidden;
          border-radius: 1.22rem;
          padding:
            clamp(.78rem, 3.2vw, .96rem)
            clamp(.66rem, 3vw, .82rem)
            clamp(.78rem, 3.2vw, .96rem)
            clamp(2.95rem, 13vw, 3.56rem);
          cursor: pointer;
        }

        .sf-free-result-expression-card.is-selected {
          box-shadow: 0 16px 34px rgba(110,74,180,.13), inset 0 0 0 1px rgba(139,86,238,.32);
        }

        .sf-free-result-expression-icon {
          position: absolute;
          left: clamp(.65rem, 3vw, .86rem);
          top: 50%;
          transform: translateY(-50%);
          display: grid;
          width: clamp(2.4rem, 10.8vw, 2.9rem);
          height: clamp(2.4rem, 10.8vw, 2.9rem);
          place-items: center;
          border-radius: 50%;
          color: #8353ef;
          background: rgba(237,229,255,.86);
          opacity: .78;
        }

        .sf-free-result-expression-card.is-green .sf-free-result-expression-icon {
          color: #18a85d;
          background: rgba(221,249,232,.9);
        }

        .sf-free-result-expression-card.is-blue .sf-free-result-expression-icon {
          color: #2e78ee;
          background: rgba(226,239,255,.9);
        }

        .sf-free-result-expression-card.is-purple .sf-free-result-expression-icon {
          color: #7b55e8;
          background: rgba(237,229,255,.9);
        }

        .sf-free-result-expression-icon svg {
          width: 1.62rem;
          height: 1.62rem;
          fill: currentColor;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-result-badge {
          display: inline-flex;
          align-items: center;
          min-height: 1.32rem;
          border-radius: .44rem;
          background: linear-gradient(90deg, #9c66ff, #7452ed);
          padding: 0 .52rem;
          color: white;
          font-size: clamp(.68rem, 2.95vw, .82rem);
          font-weight: 900;
          line-height: 1;
        }

        .sf-free-result-expression-card.is-green .sf-free-result-badge {
          background: linear-gradient(90deg, #49c989, #1fa85f);
        }

        .sf-free-result-expression-card.is-blue .sf-free-result-badge {
          background: linear-gradient(90deg, #5797ff, #2d78ee);
        }

        .sf-free-result-expression-text {
          margin: .46rem 0 0;
          color: #101342;
          font-size: clamp(1.2rem, 5.28vw, 1.62rem);
          font-weight: 900;
          line-height: 1.12;
          letter-spacing: 0;
          word-break: normal;
          overflow-wrap: anywhere;
        }

        .sf-free-result-expression-text :where(button, span),
        .sf-free-result-emphasis {
          display: inline !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: inherit !important;
          padding: 0 !important;
          font: inherit !important;
          line-height: inherit !important;
        }

        .sf-free-result-note {
          display: inline-flex;
          align-items: center;
          gap: .34rem;
          margin-top: .42rem;
          color: rgba(54,55,98,.72);
          font-size: clamp(.82rem, 3.3vw, .96rem);
          font-weight: 650;
        }

        .sf-free-result-note svg {
          width: .92rem;
          height: .92rem;
          fill: #7a58dc;
        }

        .sf-free-result-note svg path {
          fill: none;
          stroke: white;
          stroke-width: 2.1;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-result-actions {
          display: flex;
          gap: .44rem;
          align-items: center;
        }

        .sf-free-result-play,
        .sf-free-result-slow {
          display: grid;
          place-items: center;
          border: 1px solid rgba(157,111,233,.12);
          border-radius: 999px;
          background: rgba(255,255,255,.88);
          color: #101342;
          box-shadow: 0 10px 22px rgba(100,74,168,.1);
          cursor: pointer;
        }

        .sf-free-result-play {
          width: clamp(2.62rem, 11vw, 3.08rem);
          height: clamp(2.62rem, 11vw, 3.08rem);
        }

        .sf-free-result-play svg {
          width: 1.15rem;
          height: 1.15rem;
          fill: currentColor;
        }

        .sf-free-result-slow {
          min-width: clamp(3rem, 12.8vw, 3.48rem);
          height: clamp(2.62rem, 11vw, 3.08rem);
          padding: 0 .45rem;
          color: #6f4dea;
          font-size: clamp(1rem, 4.25vw, 1.2rem);
          font-weight: 850;
        }

        .sf-free-result-expression-card.is-green .sf-free-result-slow {
          color: #1d9b59;
        }

        .sf-free-result-more {
          display: none;
          align-items: center;
          justify-content: center;
          gap: .5rem;
          padding: 1rem 0 .15rem;
          color: #6f4dea;
          font-size: 1rem;
          font-weight: 800;
        }

        .sf-free-result-more::after {
          content: "⌄";
          font-size: 1.25rem;
          line-height: 1;
        }

        .sf-free-result-continue-wrap {
          position: fixed;
          z-index: 157;
          left: 50%;
          bottom: calc(
            max(0.58rem, env(safe-area-inset-bottom, 0px)) +
            var(--sf-free-result-nav-height) +
            var(--sf-free-result-fixed-gap)
          );
          width: min(calc(100% - 1.55rem), 398px);
          transform: translateX(-50%);
        }

        .sf-free-result-continue {
          display: flex;
          width: 100%;
          min-height: var(--sf-free-result-cta-height);
          align-items: center;
          justify-content: center;
          gap: clamp(0.58rem, 2.8vw, 0.86rem);
          border: 0;
          border-radius: clamp(1rem, 4.7vw, 1.28rem);
          background: linear-gradient(100deg, #7b55ff 0%, #6239e9 54%, #4d32d9 100%);
          color: #ffffff !important;
          box-shadow:
            0 1rem 2rem rgba(86, 58, 210, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.22);
          font-size: clamp(1.1rem, 4.7vw, 1.38rem);
          font-weight: 950;
          line-height: 1;
          letter-spacing: 0;
          white-space: nowrap;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .sf-free-result-continue:active {
          transform: translateY(1px) scale(0.99);
        }

        .sf-free-result-continue:focus-visible {
          outline: 3px solid rgba(117, 84, 241, 0.35);
          outline-offset: 3px;
        }

        .sf-free-result-continue svg,
        .sf-free-result-continue :global(svg) {
          width: clamp(1.35rem, 5.8vw, 1.7rem);
          height: clamp(1.35rem, 5.8vw, 1.7rem);
          fill: none;
          stroke: currentColor;
          stroke-width: 3.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-result-continue span,
        .sf-free-result-continue svg,
        .sf-free-result-continue :global(svg) {
          color: #ffffff !important;
        }

        .sf-free-result-continue span {
          color: #ffffff !important;
          font-weight: 950;
        }

        .sf-free-result-help-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: grid;
          place-items: center;
          background: rgba(25,27,44,.36);
          padding: 1rem;
          backdrop-filter: blur(10px);
        }

        .sf-free-result-help-modal {
          width: min(100%, 24rem);
          border: 1px solid rgba(159,121,230,.18);
          border-radius: 1.8rem;
          background: rgba(255,255,255,.96);
          padding: 1.35rem;
          box-shadow: 0 28px 60px rgba(37,31,78,.24);
        }

        .sf-free-result-help-modal header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .sf-free-result-help-modal h2 {
          margin: 0;
          color: #101342;
          font-size: 1.4rem;
          font-weight: 950;
        }

        .sf-free-result-help-close {
          width: 2.6rem;
          height: 2.6rem;
        }

        .sf-free-result-help-close svg {
          width: 1.35rem;
          height: 1.35rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.6;
          stroke-linecap: round;
        }

        .sf-free-result-help-modal p {
          margin: 1rem 0 0;
          color: rgba(37,39,83,.72);
          font-size: 1rem;
          font-weight: 650;
          line-height: 1.65;
        }

        /* Final free-study result page polish: compact, clean standard layout. */
        .sf-free-result-frame {
          gap: .78rem !important;
          padding-top: calc(env(safe-area-inset-top, 0px) + .52rem) !important;
          padding-bottom: calc(
            env(safe-area-inset-bottom, 0px) +
            var(--sf-free-result-cta-height) +
            var(--sf-free-result-nav-height) +
            2.45rem
          ) !important;
        }

        .sf-free-result-header {
          min-height: 3.85rem !important;
          border-radius: 1.35rem !important;
          padding: .45rem .7rem !important;
        }

        .sf-free-result-home,
        .sf-free-result-help {
          width: 2.62rem !important;
          height: 2.62rem !important;
        }

        .sf-free-result-logo {
          width: 2.16rem !important;
          height: 2.16rem !important;
        }

        .sf-free-result-brand {
          transform: scale(.92) !important;
        }

        .sf-free-result-ai-card {
          min-height: 4.8rem !important;
          grid-template-columns: 3.65rem minmax(0, 1fr) auto !important;
          padding: .78rem .92rem !important;
          border-radius: 1.28rem !important;
        }

        .sf-free-result-ai-icon {
          width: 3rem !important;
          height: 3rem !important;
        }

        .sf-free-result-change {
          min-height: 2.5rem !important;
          padding: 0 .88rem !important;
          font-size: .9rem !important;
        }

        .sf-free-result-user-card {
          display: block !important;
          position: relative !important;
          min-height: 6.8rem !important;
          padding: 1.05rem 1rem 1.18rem !important;
          border-radius: 1.38rem !important;
        }

        .sf-free-result-user-title {
          margin: 0;
          padding-right: clamp(7.4rem, 34vw, 8.9rem);
        }

        .sf-free-result-user-text {
          display: inline-block !important;
          width: auto !important;
          max-width: 100% !important;
          margin-top: 1.05rem !important;
          padding: .14rem .38rem .2rem !important;
          border-radius: .5rem !important;
          background: linear-gradient(180deg, rgba(255,238,148,.78), rgba(255,222,91,.68)) !important;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          line-height: 1.06 !important;
          white-space: normal !important;
        }

        .sf-free-result-user-highlight {
          display: inline !important;
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        .sf-free-result-retry {
          position: absolute !important;
          top: .78rem !important;
          right: .82rem !important;
          min-height: 2.45rem !important;
          padding: 0 .88rem !important;
          border-width: 1px !important;
          border-color: rgba(122,104,255,.42) !important;
          background: rgba(255,255,255,.86) !important;
          color: #1260f3 !important;
          font-size: .9rem !important;
          box-shadow: 0 10px 22px rgba(84,93,160,.1), inset 0 1px 0 rgba(255,255,255,.98) !important;
        }

        .sf-free-result-section-title {
          margin: .38rem 0 .62rem !important;
          font-size: 1.18rem !important;
          font-weight: 850 !important;
        }

        .sf-free-result-list {
          gap: .78rem !important;
        }

        .sf-free-result-expression-card {
          display: block !important;
          position: relative !important;
          min-height: 5.05rem !important;
          overflow: hidden !important;
          padding: .86rem 1.05rem .94rem !important;
          border: 1px solid rgba(139,116,240,.1) !important;
          border-radius: 1.15rem !important;
          box-shadow: 0 10px 20px rgba(79,86,130,.08), inset 0 1px 0 rgba(255,255,255,.96) !important;
        }

        .sf-free-result-expression-icon {
          display: none !important;
        }

        .sf-free-result-badge {
          align-self: start !important;
          width: fit-content !important;
          max-width: calc(100% - 7.05rem) !important;
          border-radius: .55rem !important;
        }

        .sf-free-result-expression-card.is-selected .sf-free-result-badge {
          background: linear-gradient(90deg, #7a68ff, #8f78ff) !important;
          color: white !important;
        }

        .sf-free-result-expression-card.is-green .sf-free-result-badge {
          background: rgba(65,181,115,.18) !important;
          color: #22945c !important;
        }

        .sf-free-result-expression-card.is-blue .sf-free-result-badge {
          background: rgba(72,132,245,.16) !important;
          color: #2f75e6 !important;
        }

        .sf-free-result-expression-card.is-purple .sf-free-result-badge {
          background: rgba(122,104,255,.15) !important;
          color: #7654f1 !important;
        }

        .sf-free-result-expression-text {
          max-width: 100% !important;
          margin-top: .82rem !important;
          font-size: clamp(1.2rem, 5.2vw, 1.55rem) !important;
          line-height: 1.2 !important;
        }

        .sf-free-result-actions {
          position: absolute !important;
          top: .66rem !important;
          right: .78rem !important;
          gap: .5rem !important;
          z-index: 2 !important;
        }

        .sf-free-result-play {
          width: clamp(2.88rem, 12vw, 3.28rem) !important;
          height: clamp(2.88rem, 12vw, 3.28rem) !important;
          box-shadow: 0 12px 24px rgba(87,76,150,.12), inset 0 1px 0 rgba(255,255,255,.98) !important;
        }

        .sf-free-result-slow {
          min-width: clamp(3.12rem, 13.4vw, 3.62rem) !important;
          height: clamp(2.72rem, 11.4vw, 3.12rem) !important;
          background: rgba(255,255,255,.9) !important;
        }

        .sf-free-result-user-highlight,
        .sf-free-result-emphasis {
          color: inherit !important;
        }

        @media (max-width: 340px) {
          .sf-free-result-frame {
            padding-left: .75rem;
            padding-right: .75rem;
          }

          .sf-free-result-ai-card {
            grid-template-columns: 3.6rem minmax(0, 1fr);
          }

          .sf-free-result-change {
            grid-column: 1 / -1;
            justify-content: center;
          }

          .sf-free-result-user-card {
            display: block !important;
          }

          .sf-free-result-retry {
            top: .72rem !important;
            right: .72rem !important;
            min-height: 2.28rem !important;
            padding: 0 .7rem !important;
            font-size: .82rem !important;
          }

          .sf-free-result-expression-card {
            display: block !important;
            padding-left: .92rem !important;
            padding-right: .92rem !important;
          }

          .sf-free-result-actions {
            top: .62rem !important;
            right: .62rem !important;
            gap: .36rem !important;
          }
        }

        .sf-free-result-ai-card {
          grid-template-columns: clamp(3.35rem, 14vw, 3.85rem) minmax(0, 1fr) auto !important;
          min-height: clamp(5.15rem, 18dvh, 5.85rem) !important;
          align-items: center !important;
          gap: clamp(.58rem, 2.5vw, .78rem) !important;
          padding: .86rem .94rem !important;
          border-radius: 1.35rem !important;
        }

        .sf-free-result-ai-icon {
          width: clamp(3.18rem, 13.4vw, 3.68rem) !important;
          height: clamp(3.18rem, 13.4vw, 3.68rem) !important;
        }

        .sf-free-result-ai-icon svg {
          width: 2.05rem !important;
          height: 2.05rem !important;
        }

        .sf-free-result-ai-copy {
          display: grid;
          min-width: 0;
          gap: .2rem;
        }

        .sf-free-result-ai-copy strong {
          font-size: clamp(1.22rem, 4.85vw, 1.5rem) !important;
          line-height: 1.08 !important;
          white-space: nowrap !important;
        }

        .sf-free-result-ai-copy span {
          margin-top: 0 !important;
          font-size: clamp(1.12rem, 4.65vw, 1.38rem) !important;
          line-height: 1.06 !important;
          white-space: nowrap !important;
        }

        .sf-free-result-change {
          min-width: clamp(5.35rem, 22vw, 6.2rem) !important;
          min-height: clamp(2.58rem, 10.7vw, 3rem) !important;
          padding: 0 .78rem !important;
          border-radius: 999px !important;
          font-size: clamp(.82rem, 3.3vw, .96rem) !important;
          white-space: nowrap !important;
        }

        .sf-free-result-user-card {
          min-height: clamp(8.1rem, 25dvh, 10.4rem) !important;
        }

        .sf-free-result-user-text {
          display: block !important;
          width: 100% !important;
          margin-top: .78rem !important;
          padding: 0 !important;
          background: transparent !important;
          font-size: clamp(1.48rem, 6.2vw, 2.02rem) !important;
          line-height: 1.36 !important;
        }

        .sf-free-result-user-highlight {
          display: inline !important;
          padding: .08rem .34rem .13rem !important;
          border-radius: .48rem !important;
          background: linear-gradient(180deg, rgba(255, 241, 155, .82), rgba(255, 225, 87, .72)) !important;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }

        .sf-free-result-section-title {
          margin-top: .72rem !important;
        }

        .sf-free-result-expression-card {
          min-height: clamp(6.45rem, 20.5dvh, 8.6rem) !important;
          padding: .86rem .98rem .98rem !important;
        }

        .sf-free-result-expression-text {
          margin-top: .72rem !important;
          padding-right: 0 !important;
          font-size: clamp(1.12rem, 4.85vw, 1.42rem) !important;
          line-height: 1.34 !important;
          text-wrap: normal !important;
          overflow-wrap: normal !important;
          word-break: normal !important;
        }

        .sf-free-result-play {
          width: clamp(2.72rem, 11vw, 3.05rem) !important;
          height: clamp(2.72rem, 11vw, 3.05rem) !important;
        }

        .sf-free-result-slow {
          min-width: clamp(3.02rem, 12.6vw, 3.45rem) !important;
          height: clamp(2.58rem, 10.8vw, 2.95rem) !important;
          color: #1260f3 !important;
        }

        @media (max-width: 360px) {
          .sf-free-result-ai-card {
            grid-template-columns: 2.72rem minmax(0, 1fr) auto !important;
            gap: .4rem !important;
            padding-inline: .64rem !important;
          }

          .sf-free-result-ai-icon {
            width: 2.72rem !important;
            height: 2.72rem !important;
          }

          .sf-free-result-ai-icon svg {
            width: 1.62rem !important;
            height: 1.62rem !important;
          }

          .sf-free-result-ai-copy strong {
            font-size: 1.06rem !important;
          }

          .sf-free-result-ai-copy span {
            font-size: 1rem !important;
          }

          .sf-free-result-change {
            min-width: 4.45rem !important;
            min-height: 2.34rem !important;
            padding-inline: .46rem !important;
            font-size: .76rem !important;
          }
        }

        /* Free-study result sentence width lock: controls never shrink English copy. */
        .sf-free-result-user-text {
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          text-align: left !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
          hyphens: none !important;
        }

        .sf-free-result-user-text :where(button, span),
        .sf-free-result-user-highlight {
          display: inline !important;
          width: auto !important;
          max-width: none !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
          hyphens: none !important;
        }

        .sf-free-result-expression-card {
          display: block !important;
          grid-template-columns: none !important;
          padding: .9rem 1rem 1rem !important;
        }

        .sf-free-result-expression-copy {
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          text-align: left !important;
        }

        .sf-free-result-badge {
          display: inline-flex !important;
          max-width: calc(100% - 6.9rem) !important;
          margin-right: 6.9rem !important;
        }

        .sf-free-result-actions {
          position: absolute !important;
          top: .68rem !important;
          right: .78rem !important;
          display: flex !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          flex: 0 0 auto !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: .44rem !important;
        }

        .sf-free-result-expression-text {
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          margin-top: 1.32rem !important;
          padding-right: 0 !important;
          text-align: left !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
          hyphens: none !important;
          text-wrap: normal !important;
        }

        .sf-free-result-expression-text :where(button, span),
        .sf-free-result-emphasis {
          display: inline !important;
          width: auto !important;
          max-width: none !important;
          text-align: left !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
          hyphens: none !important;
          text-wrap: normal !important;
        }
      `}</style>

      <div className="sf-free-result-frame">
        <section className="sf-free-result-ai-card">
          <span className="sf-free-result-ai-icon" aria-hidden="true">
            <LightGlyph />
          </span>
          <span className="sf-free-result-ai-copy">
            <strong>不知道说什么？</strong>
            <span>AI 帮我练</span>
          </span>
          <button
            type="button"
            onClick={onAiGuidedPractice}
            className="sf-free-result-change"
          >
            <SparklesGlyph />
            换一换
          </button>
        </section>

        <section className="sf-free-result-user-card">
          <h1 className="sf-free-result-user-title">
            你的表达
            <WaveGlyph />
          </h1>
          <p lang="en" className="sf-free-result-user-text">
            <span className="sf-free-result-user-highlight">
              {renderUserExpressionText
                ? renderUserExpressionText(displayText)
                : displayText}
            </span>
          </p>
          <button
            type="button"
            onClick={onRetryEnglish}
            className="sf-free-result-retry"
          >
            <RefreshGlyph />
            重新说
          </button>
        </section>

        <h2 className="sf-free-result-section-title">
          <SparklesGlyph />
          推荐表达
        </h2>

        <section className="sf-free-result-list">
          {preparedExpressions.map((expression, index) => {
            const selected = safeSelectedIndex === index;

            return (
              <article
                key={`${expression.tone}-${index}-${expression.text}`}
                className={`sf-free-result-expression-card is-${expression.tone} ${
                  selected ? "is-selected" : ""
                }`}
                onClick={() => onSelectExpression(index)}
              >
                <span className="sf-free-result-expression-icon" aria-hidden="true">
                  <ExpressionIcon name={expression.icon} />
                </span>

                <span className="sf-free-result-expression-copy">
                  <span className="sf-free-result-badge">{expression.badge}</span>
                  <p lang="en" className="sf-free-result-expression-text">
                    {renderInteractiveExpressionText
                      ? renderInteractiveExpressionText(
                          expression.text,
                          index,
                          expression.tone
                        )
                      : renderExpressionText(expression.text, expression.tone)}
                  </p>
                  {expression.description ? (
                    <span className="sf-free-result-note">
                      <CheckGlyph />
                      {expression.description}
                    </span>
                  ) : null}
                </span>

                <span className="sf-free-result-actions">
                  <button
                    type="button"
                    aria-label="播放这句表达"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectExpression(index);
                      onPlayExpression(index, 1);
                    }}
                    className="sf-free-result-play"
                  >
                    <PlayGlyph />
                  </button>
                  <button
                    type="button"
                    aria-label="0.75倍速播放这句表达"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectExpression(index);
                      onPlayExpression(index, 0.75);
                    }}
                    className="sf-free-result-slow"
                  >
                    0.75x
                  </button>
                </span>
              </article>
            );
          })}
        </section>

        <div className="sf-free-result-more">向下查看更多表达</div>
      </div>

      <div className="sf-free-result-continue-wrap">
        <button
          type="button"
          className="sf-free-result-continue"
          onClick={onContinueNext}
        >
          <ContinueArrowGlyph />
          <span>{"\u7ee7\u7eed\u7ec3\u4e60\u4e0b\u4e00\u53e5"}</span>
        </button>
      </div>

      <FreeStudyBottomNav
        hasProEntitlement={hasProEntitlement}
        menuLabel={"\u56de\u5230\u5b66\u4e60\u9996\u9875"}
        onAccountClick={onAccountClick}
        onMenuClick={onMenuClick}
      />
    </section>
  );
}
