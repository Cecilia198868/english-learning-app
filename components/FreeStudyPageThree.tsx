"use client";

import { useRef } from "react";

type FreeStudyPageThreeProps = {
  chineseText: string;
  avatarSrc?: string;
  avatarAlt?: string;
  accountLabel?: string;
  menuLabel?: string;
  onEditChinese: (value: string) => void;
  onRetryChinese: () => void;
  onStartEnglishPractice: () => void;
  onAccountClick?: () => void;
  onAvatarError?: () => void;
  onMenuClick?: () => void;
};

const COPY = {
  accountLabel: "\u6253\u5f00\u8d26\u6237\u754c\u9762",
  confirmAria: "\u786e\u8ba4\u4e2d\u6587\u5e76\u5f00\u59cb\u82f1\u8bed\u7ec3\u4e60",
  confirmButton: "\u786e\u8ba4\uff0c\u5f00\u59cb\u7ec3\u4e60",
  confirmLabel: "\u786e\u8ba4\u8bc6\u522b\u51fa\u7684\u4e2d\u6587",
  editChinese: "\u7f16\u8f91\u4e2d\u6587",
  editRecognized: "\u7f16\u8f91\u8bc6\u522b\u51fa\u7684\u4e2d\u6587",
  footnote: "\u4f60\u7684\u7ec3\u4e60\u8bb0\u5f55\u5c06\u5e2e\u52a9 AI \u66f4\u61c2\u4f60",
  nextHeading: "\u63a5\u4e0b\u6765\u6211\u4eec\u4e00\u8d77\uff1a",
  nextLabel: "\u63a5\u4e0b\u6765\u7684\u7ec3\u4e60\u6b65\u9aa4",
  pageLabel: "\u786e\u8ba4\u4e2d\u6587\u8868\u8fbe",
  placeholder: "\u8fd9\u91cc\u4f1a\u663e\u793a\u4f60\u521a\u624d\u8bf4\u7684\u4e2d\u6587",
  received: "\u6536\u5230\u5566\uff01 \u4f60\u60f3\u8868\u8fbe\u7684\u662f\uff1a",
  retryAria: "\u8fd4\u56de\u7b2c\u4e8c\u9875\u91cd\u65b0\u5f55\u97f3",
  retryButton: "\u91cd\u65b0\u8bf4",
} as const;

const nextSteps = [
  {
    badge: "\u4f60\u6765\u8bd5\u8bd5",
    description: "\u8bd5\u7740\u7528\u82f1\u8bed\u8bf4\u51fa\u8fd9\u53e5\u8bdd",
    icon: "mic",
    title: "\u5927\u80c6\u8bf4\u82f1\u8bed",
  },
  {
    badge: "AI \u5e2e\u4f60\u63d0\u5347",
    description: "\u591a\u79cd\u8868\u8fbe\u65b9\u5f0f\u5bf9\u6bd4\uff0c\u5e2e\u4f60\u4f18\u5316",
    icon: "sparkles",
    title: "AI \u7ed9\u51fa\u5730\u9053\u8868\u8fbe",
  },
  {
    badge: "\u7ec3\u5f97\u66f4\u81ea\u7136",
    description: "\u6717\u8bfb\u51c6\u786e\u82f1\u6587\uff0c\u638c\u63e1\u5730\u9053\u53d1\u97f3",
    icon: "speaker",
    title: "\u8ddf\u8bfb\u7ec3\u4e60",
  },
  {
    badge: "\u8bb0\u5f97\u66f4\u7262\u56fa",
    description: "\u6536\u85cf\u6709\u7528\u7684\u8bcd\u6c47\u548c\u8868\u8fbe\uff0c\u968f\u65f6\u590d\u4e60",
    icon: "bookmark",
    title: "\u6536\u85cf\u91cd\u70b9",
  },
] as const;

function BackGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path
        d="m19 8-8 8 8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.7"
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

function EditGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 19h4.2L18.4 9.8a2.2 2.2 0 0 0-3.1-3.1L6.1 15.9 5 19Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m13.8 8.2 2 2M4.8 21h14.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
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

function ArrowGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 12h13M13 7l5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function SparklesGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 40 40">
      <path
        d="M18.5 6.2 22 15l8.8 3.5L22 22l-3.5 8.8L15 22l-8.8-3.5L15 15l3.5-8.8Z"
        fill="currentColor"
      />
      <path
        d="m29.5 5.8 1.5 3.7 3.7 1.5-3.7 1.5-1.5 3.7-1.5-3.7-3.7-1.5L28 9.5l1.5-3.7ZM31 24.4l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MicGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 40 40">
      <path
        d="M20 6.5a6.2 6.2 0 0 0-6.2 6.2v8.1a6.2 6.2 0 1 0 12.4 0v-8.1A6.2 6.2 0 0 0 20 6.5Z"
        fill="currentColor"
      />
      <path
        d="M10.2 19.5a9.8 9.8 0 0 0 19.6 0M20 29.3v5.2M15.4 34.5h9.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.1"
      />
    </svg>
  );
}

function SpeakerGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 40 40">
      <path
        d="M7 15.4v9.2h6.2L22 32V8l-8.8 7.4H7Z"
        fill="currentColor"
      />
      <path
        d="M27 15a7 7 0 0 1 0 10M31 11a12 12 0 0 1 0 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function BookmarkGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 40 40">
      <path
        d="M12 7.5h16c1.4 0 2.5 1.1 2.5 2.5v23L20 27.4 9.5 33V10c0-1.4 1.1-2.5 2.5-2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        width="14"
        x="5"
        y="10"
      />
      <path
        d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10M12 14v2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function StepIcon({ name }: { name: (typeof nextSteps)[number]["icon"] }) {
  if (name === "mic") return <MicGlyph />;
  if (name === "speaker") return <SpeakerGlyph />;
  if (name === "bookmark") return <BookmarkGlyph />;
  return <SparklesGlyph />;
}

export default function FreeStudyPageThree({
  chineseText,
  avatarSrc = "",
  avatarAlt = "user",
  accountLabel = COPY.accountLabel,
  menuLabel = COPY.retryAria,
  onEditChinese,
  onRetryChinese,
  onStartEnglishPractice,
  onAccountClick,
  onAvatarError,
  onMenuClick,
}: FreeStudyPageThreeProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canConfirm = Boolean(chineseText.trim());

  function focusChineseEditor() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
  }

  function returnToRecording() {
    if (onMenuClick) {
      onMenuClick();
      return;
    }

    onRetryChinese();
  }

  return (
    <section className="sf-free-study-page-three" aria-label={COPY.pageLabel}>
      <div className="sf-free-study-page-three-frame">
        <header className="sf-free-study-page-three-header">
          <button
            type="button"
            aria-label={menuLabel}
            onClick={returnToRecording}
            className="sf-free-study-page-three-back"
          >
            <BackGlyph />
          </button>

          <div
            className="sf-free-study-page-three-brand"
            aria-label="SpeakFlow AI Voice Practice"
          >
            <span className="sf-free-study-page-three-logo" aria-hidden="true">
              <WaveGlyph />
            </span>
            <span className="sf-free-study-page-three-brand-copy">
              <span className="sf-free-study-page-three-brand-title">SpeakFlow</span>
              <span className="sf-free-study-page-three-brand-subtitle">
                AI VOICE PRACTICE
              </span>
            </span>
          </div>

          <button
            type="button"
            aria-label={accountLabel}
            onClick={onAccountClick}
            className="sf-free-study-page-three-avatar-button"
            title={avatarAlt}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc || "/default-avatar.png"}
              alt=""
              className="sf-free-study-page-three-avatar-image"
              onError={onAvatarError}
              draggable={false}
            />
          </button>
        </header>

        <main className="sf-free-study-page-three-content">
          <section
            className="sf-free-study-page-three-confirm-card"
            aria-label={COPY.confirmLabel}
          >
            <div className="sf-free-study-page-three-confirm-head">
              <p>
                <SparklesGlyph />
                <span>{COPY.received}</span>
              </p>
              <button
                type="button"
                onClick={focusChineseEditor}
                className="sf-free-study-page-three-edit-button"
              >
                <EditGlyph />
                <span>{COPY.editChinese}</span>
              </button>
            </div>

            <label
              className="sf-free-study-page-three-text-wrap"
              onClick={focusChineseEditor}
            >
              <span className="sr-only">{COPY.editRecognized}</span>
              <textarea
                ref={textareaRef}
                aria-label={COPY.editRecognized}
                lang="zh-CN"
                value={chineseText}
                onChange={(event) => onEditChinese(event.target.value)}
                placeholder={COPY.placeholder}
                className="sf-free-study-page-three-textarea"
              />
            </label>

            <div className="sf-free-study-page-three-actions">
              <button
                type="button"
                aria-label={COPY.retryAria}
                onClick={onRetryChinese}
                className="sf-free-study-page-three-retry"
              >
                <RefreshGlyph />
                <span>{COPY.retryButton}</span>
              </button>

              <button
                type="button"
                aria-label={COPY.confirmAria}
                onClick={onStartEnglishPractice}
                disabled={!canConfirm}
                className="sf-free-study-page-three-confirm"
              >
                <ArrowGlyph />
                <span>{COPY.confirmButton}</span>
              </button>
            </div>
          </section>

          <section
            className="sf-free-study-page-three-next-card"
            aria-label={COPY.nextLabel}
          >
            <h2>
              <SparklesGlyph />
              <span>{COPY.nextHeading}</span>
            </h2>

            <ol className="sf-free-study-page-three-step-list">
              {nextSteps.map((step, index) => (
                <li className="sf-free-study-page-three-step-item" key={step.title}>
                  <span className="sf-free-study-page-three-step-number">{index + 1}</span>
                  <span className="sf-free-study-page-three-step-icon">
                    <StepIcon name={step.icon} />
                  </span>
                  <span className="sf-free-study-page-three-step-copy">
                    <strong>{step.title}</strong>
                    <span>{step.description}</span>
                  </span>
                  <span className="sf-free-study-page-three-step-badge">
                    {step.badge}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <p className="sf-free-study-page-three-footnote">
            <span className="sf-free-study-page-three-lock-icon">
              <LockGlyph />
            </span>
            {COPY.footnote}
          </p>
        </main>
      </div>
    </section>
  );
}
