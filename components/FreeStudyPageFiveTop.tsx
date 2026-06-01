"use client";

import type { ReactNode } from "react";

type FreeStudyPageFiveTopProps = {
  userEnglishText: string;
  expressions: string[];
  selectedExpressionIndex: number;
  avatarSrc?: string;
  avatarAlt?: string;
  accountLabel?: string;
  onAiGuidedPractice: () => void;
  onRetryEnglish: () => void;
  onMenuClick: () => void;
  onAccountClick: () => void;
  onAvatarError?: () => void;
  onPlayExpression: (index: number, rate?: number) => void;
  onSelectExpression: (index: number) => void;
  renderExpressionText?: (
    text: string,
    index: number,
    tone: string
  ) => ReactNode;
  renderUserExpressionText?: (text: string) => ReactNode;
};

const COPY = {
  accountLabel: "\u6253\u5f00\u8d26\u6237\u754c\u9762",
  aiBody: "AI \u5e2e\u6211\u7ec3",
  aiTitle: "\u4e0d\u77e5\u9053\u8bf4\u4ec0\u4e48\uff1f",
  change: "\u6362\u4e00\u6362",
  freeMode: "\u81ea\u7531\u5b66\u4e60",
  menuLabel: "\u6253\u5f00\u8d26\u6237\u754c\u9762",
  pageLabel: "\u81ea\u7531\u5b66\u4e60\u82f1\u6587\u7ed3\u679c",
  playExpression: "\u64ad\u653e\u5f53\u524d\u53e5\u5b50",
  recommended: "\u63a8\u8350\u8868\u8fbe",
  seeMore: "\u5411\u4e0b\u67e5\u770b\u66f4\u591a\u8868\u8fbe",
  retry: "\u91cd\u65b0\u8bf4",
  retryAria: "\u56de\u5230\u7b2c\u56db\u9875\u91cd\u65b0\u5f55\u82f1\u8bed",
  toolbarBack: "\u8fd4\u56de",
  userExpression: "\u4f60\u7684\u8868\u8fbe",
} as const;

const expressionMeta = [
  {
    badge: "\u6700\u81ea\u7136\u5730\u9053",
    description: "\u81ea\u7136\u5730\u9053 \u00b7 \u6700\u63a8\u8350",
    icon: "star",
    tone: "violet",
  },
  {
    badge: "\u66f4\u5730\u9053",
    description: "",
    icon: "leaf",
    tone: "green",
  },
  {
    badge: "\u66f4\u7b80\u5355",
    description: "",
    icon: "feather",
    tone: "blue",
  },
  {
    badge: "\u66f4\u53e3\u8bed",
    description: "",
    icon: "chat",
    tone: "purple",
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

function MenuGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path
        d="M8 10h16M8 16h16M8 22h16"
        stroke="currentColor"
        strokeLinecap="round"
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

function SparklesGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 40 40">
      <path
        d="M18.5 6.2 22 15l8.8 3.5L22 22l-3.5 8.8L15 22l-8.8-3.5L15 15l3.5-8.8Z"
        fill="currentColor"
      />
      <path
        d="m29.5 5.8 1.5 3.7 3.7 1.5-3.7 1.5-1.5 3.7-1.5-3.7-3.7-1.5L28 9.5l1.5-3.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LightbulbGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 44 44">
      <path
        d="M14.2 19.5a7.8 7.8 0 1 1 15.6 0c0 3.2-1.8 5.1-3.3 6.7-1.1 1.1-1.7 2.2-1.8 3.4h-5.4c-.1-1.2-.7-2.3-1.8-3.4-1.5-1.6-3.3-3.5-3.3-6.7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path
        d="M18.6 34h6.8M18.6 38h6.8M22 4.8v4M9.8 9.8l2.8 2.8M34.2 9.8l-2.8 2.8M5.2 22h4M34.8 22h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
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

function PlayGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path
        d="M11.5 8.6v14.8L22.8 16 11.5 8.6Z"
        fill="currentColor"
      />
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

function CheckGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="currentColor" r="10" />
      <path
        d="m7.8 12.2 2.6 2.5 5.8-6"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.1"
      />
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

function ExpressionIcon({ name }: { name: (typeof expressionMeta)[number]["icon"] }) {
  if (name === "leaf") return <LeafGlyph />;
  if (name === "feather") return <FeatherGlyph />;
  if (name === "chat") return <ChatGlyph />;

  return (
    <span className="sf-free-study-page-five-ribbon" aria-hidden="true">
      <span />
    </span>
  );
}

function renderExpressionText(text: string, tone: string) {
  const normalized = text.trim() || "Preparing a better expression...";
  const match = normalized.match(/^(.*?)([A-Za-z]+(?:\s+[A-Za-z]+)?)([.!?。！？]*)$/);

  if (!match) return normalized;

  return (
    <>
      {match[1]}
      <span className={`sf-free-study-page-five-emphasis is-${tone}`}>
        {match[2]}
      </span>
      {match[3]}
    </>
  );
}

export default function FreeStudyPageFiveTop({
  userEnglishText,
  expressions,
  selectedExpressionIndex,
  onAiGuidedPractice,
  onRetryEnglish,
  onMenuClick,
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
      "Preparing a better expression...",
  }));
  const safeSelectedIndex = Math.min(
    Math.max(selectedExpressionIndex, 0),
    preparedExpressions.length - 1,
  );

  return (
    <section className="sf-free-study-page-five-top" aria-label={COPY.pageLabel}>
      <div className="sf-free-study-page-five-top-frame">
        <header className="sf-free-study-page-five-header">
          <button
            type="button"
            aria-label={COPY.menuLabel}
            onClick={onMenuClick}
            className="sf-free-study-page-five-top-menu"
          >
            <MenuGlyph />
          </button>

          <div
            className="sf-free-study-page-five-brand"
            aria-label="SpeakFlow AI Voice Practice"
          >
            <span className="sf-free-study-page-five-logo" aria-hidden="true">
              <WaveGlyph />
            </span>
            <span className="sf-free-study-page-five-brand-copy">
              <span className="sf-free-study-page-five-brand-title">SpeakFlow</span>
              <span className="sf-free-study-page-five-brand-subtitle">
                AI VOICE PRACTICE
              </span>
            </span>
          </div>

          <span className="sf-free-study-page-five-header-spacer" aria-hidden="true" />
        </header>

        <div className="sf-free-study-page-five-toolbar">
          <button
            type="button"
            aria-label={COPY.retryAria}
            onClick={onRetryEnglish}
            className="sf-free-study-page-five-toolbar-back"
          >
            <BackGlyph />
            <span>{COPY.toolbarBack}</span>
          </button>

          <div className="sf-free-study-page-five-mode" aria-label={COPY.freeMode}>
            <SparklesGlyph />
            <span>{COPY.freeMode}</span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Open AI guided expression practice"
          onClick={onAiGuidedPractice}
          className="sf-free-study-page-five-ai-card"
        >
          <span className="sf-free-study-page-five-ai-icon">
            <LightbulbGlyph />
          </span>
          <span className="sf-free-study-page-five-ai-copy">
            <strong>{COPY.aiTitle}</strong>
            <span>{COPY.aiBody}</span>
          </span>
          <span className="sf-free-study-page-five-ai-change">
            <SparklesGlyph />
            {COPY.change}
          </span>
        </button>

        <section className="sf-free-study-page-five-user-card">
          <div className="sf-free-study-page-five-user-title">
            <span>{COPY.userExpression}</span>
            <WaveGlyph />
          </div>
          <p lang="en" className="sf-free-study-page-five-user-text">
            {renderUserExpressionText
              ? renderUserExpressionText(displayText)
              : displayText}
          </p>
          <button
            type="button"
            aria-label={COPY.retryAria}
            onClick={onRetryEnglish}
            className="sf-free-study-page-five-retry"
          >
            <RefreshGlyph />
            <span>{COPY.retry}</span>
          </button>
        </section>

        <div className="sf-free-study-page-five-section-title">
          <SparklesGlyph />
          <span>{COPY.recommended}</span>
        </div>

        <section className="sf-free-study-page-five-expression-list">
          {preparedExpressions.map((expression, index) => {
            const selected = safeSelectedIndex === index;

            return (
              <article
                key={`${expression.tone}-${index}-${expression.text}`}
                className={`sf-free-study-page-five-expression-card is-${expression.tone} ${
                  selected ? "is-selected" : ""
                }`}
                onClick={() => onSelectExpression(index)}
              >
                <div className="sf-free-study-page-five-expression-icon">
                  <ExpressionIcon name={expression.icon} />
                </div>

                <div className="sf-free-study-page-five-expression-copy">
                  {index === 0 ? (
                    <span className="sf-free-study-page-five-expression-badge">
                      {expression.badge}
                    </span>
                  ) : (
                    <strong>{expression.badge}</strong>
                  )}
                  <p lang="en">
                    {renderInteractiveExpressionText
                      ? renderInteractiveExpressionText(
                          expression.text,
                          index,
                          expression.tone
                        )
                      : renderExpressionText(expression.text, expression.tone)}
                  </p>
                  {index === 0 ? (
                    <span className="sf-free-study-page-five-expression-note">
                      <CheckGlyph />
                      {expression.description}
                    </span>
                  ) : null}
                </div>

                <div className="sf-free-study-page-five-expression-actions">
                  <button
                    type="button"
                    aria-label={COPY.playExpression}
                    onClick={(event) => {
                      event.stopPropagation();
                      onPlayExpression(index, 1);
                    }}
                  >
                    <PlayGlyph />
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <div className="sf-free-study-page-five-more">
          <span>{COPY.seeMore}</span>
          <ChevronDownGlyph />
        </div>
      </div>
    </section>
  );
}
