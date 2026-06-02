"use client";

import type { ReactNode } from "react";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";

type AiGuidedExpressionStepFiveProps = {
  userEnglishText: string;
  nextChineseText: string;
  isLoadingNextChinese?: boolean;
  expressions: string[];
  selectedExpressionIndex: number;
  avatarSrc?: string;
  avatarAlt?: string;
  headerAddon?: ReactNode;
  accountLabel?: string;
  menuLabel?: string;
  onMenuClick: () => void;
  onRetryEnglish: () => void;
  onUseNextChinese: () => void;
  onChangeNextChinese: () => void;
  onAccountClick: () => void;
  onAvatarError?: () => void;
  onPlayExpression: (index: number, rate?: number) => void;
  onSelectExpression: (index: number) => void;
  onFollowPractice: () => void;
  onSlowPlayback: () => void;
  renderExpressionText?: (
    text: string,
    index: number,
    tone: string
  ) => ReactNode;
  renderUserExpressionText?: (text: string) => ReactNode;
};

const COPY = {
  accountLabel: "打开账户界面",
  back: "返回",
  backAria: "回到第四页重新说英语",
  change: "换一句",
  changeAria: "换一句新的中文建议",
  follow: "跟读练习",
  followAria: "回到第四页跟读练习",
  loadingNext: "正在为你准备下一句...",
  menuLabel: "回到主菜单",
  mode: "AI引导表达",
  nextDescription: "AI 根据上下文和你的情绪，为你推荐的下一句中文",
  nextFallback: "那我们休息一下，过会儿再去散步吧。",
  nextTitle: "下一句，可以这样说",
  pageLabel: "AI引导表达结果页",
  playAria: "播放这句表达",
  records: "表达训练记录",
  retry: "重新说",
  retryAria: "回到第四页重新录制英语",
  seeMore: "向下查看更多表达",
  slow: "倍速",
  slowAria: "以 0.5 倍速播放当前句子",
  speakPrompt: "点击麦克风开始录音",
  useNext: "用这句练习",
  useNextAria: "用这句中文进入第四页练习",
  userExpression: "你的表达",
} as const;

const suggestionTags = ["根据上文", "情绪自然", "可继续表达"] as const;

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

function MenuGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path
        d="M8 10h16M8 16h16M8 22h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

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

function LinkGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m10.2 13.8 3.6-3.6M8.8 10.6l-1.4 1.4a4 4 0 0 0 5.6 5.6l1.4-1.4M15.2 13.4l1.4-1.4A4 4 0 0 0 11 6.4L9.6 7.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function HeartGlyph() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 20.5c-.4-.3-1.5-1.1-3.3-2.6-3.1-2.6-4.7-4.8-4.7-7A4.2 4.2 0 0 1 8.2 6.7c1.5 0 2.7.7 3.8 2 1.1-1.3 2.3-2 3.8-2A4.2 4.2 0 0 1 20 10.9c0 2.2-1.6 4.4-4.7 7-1.8 1.5-2.9 2.3-3.3 2.6Z" />
    </svg>
  );
}

function MiniChatGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M5.2 6.5h11.7a2.6 2.6 0 0 1 2.6 2.6v5.7a2.6 2.6 0 0 1-2.6 2.6H11l-4.1 3v-3H5.2a2.6 2.6 0 0 1-2.6-2.6V9.1a2.6 2.6 0 0 1 2.6-2.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path
        d="M8 12h.1M11 12h.1M14 12h.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
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

export default function AiGuidedExpressionStepFive({
  userEnglishText,
  nextChineseText,
  isLoadingNextChinese = false,
  expressions,
  selectedExpressionIndex,
  avatarSrc = "",
  avatarAlt = "user",
  headerAddon,
  accountLabel = COPY.accountLabel,
  menuLabel = COPY.menuLabel,
  onMenuClick,
  onRetryEnglish,
  onUseNextChinese,
  onChangeNextChinese,
  onAccountClick,
  onAvatarError,
  onPlayExpression,
  onSelectExpression,
  onFollowPractice,
  onSlowPlayback,
  renderExpressionText: renderInteractiveExpressionText,
  renderUserExpressionText,
}: AiGuidedExpressionStepFiveProps) {
  const displayEnglish = userEnglishText.trim() || "I'm practicing this sentence.";
  const displayNextChinese =
    nextChineseText.trim() || (isLoadingNextChinese ? COPY.loadingNext : COPY.nextFallback);
  const safeExpressions =
    expressions.length > 0 ? expressions : ["That's why I'm looking for a better job."];

  return (
    <section className="sf-ai-guided-step-five" aria-label={COPY.pageLabel}>
      <div className="sf-ai-guided-step-five-frame">
        <header className="sf-ai-guided-step-five-header">
          <button
            type="button"
            aria-label={menuLabel}
            onClick={onMenuClick}
            className="sf-ai-guided-step-five-menu"
          >
            <MenuGlyph />
          </button>

          <div
            className="sf-ai-guided-step-five-brand"
            aria-label="SpeakFlow AI Voice Practice"
          >
            <span className="sf-ai-guided-step-five-logo">
              <SpeakFlowBrandMark className="sf-ai-guided-step-five-logo-mark" />
            </span>
            <span className="sf-ai-guided-step-five-brand-copy">
              <span className="sf-ai-guided-step-five-brand-title">SpeakFlow</span>
              <span className="sf-ai-guided-step-five-brand-subtitle">
                AI VOICE PRACTICE
              </span>
            </span>
          </div>

          <button
            type="button"
            aria-label={accountLabel}
            onClick={onAccountClick}
            className="sf-ai-guided-step-five-avatar-button"
            title={avatarAlt}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc || "/default-avatar.png"}
              alt=""
              className="sf-ai-guided-step-five-avatar-image"
              onError={onAvatarError}
              draggable={false}
            />
          </button>
        </header>

        {headerAddon}

        <main className="sf-ai-guided-step-five-scroll">
          <section className="sf-ai-guided-step-five-user-card">
            <div className="sf-ai-guided-step-five-card-heading">
              <span>{COPY.userExpression}</span>
              <span className="sf-ai-guided-step-five-mini-wave" aria-hidden="true">
                <WaveGlyph />
              </span>
            </div>
            <p lang="en" className="sf-ai-guided-step-five-user-text">
              {renderUserExpressionText
                ? renderUserExpressionText(displayEnglish)
                : displayEnglish}
            </p>
            <button
              type="button"
              aria-label={COPY.retryAria}
              onClick={onRetryEnglish}
              className="sf-ai-guided-step-five-retry"
            >
              <RefreshGlyph />
              <span>{COPY.retry}</span>
            </button>
          </section>

          <section className="sf-ai-guided-step-five-next-card">
            <div className="sf-ai-guided-step-five-next-robot" aria-hidden="true">
              <span className="sf-ai-guided-step-five-robot-face">
                <span />
                <span />
              </span>
            </div>
            <h2>
              <SparklesGlyph />
              <span>{COPY.nextTitle}</span>
            </h2>
            <p lang="zh-CN" className="sf-ai-guided-step-five-next-text">
              {isLoadingNextChinese ? COPY.loadingNext : displayNextChinese}
            </p>
            <p className="sf-ai-guided-step-five-next-description">
              {COPY.nextDescription}
            </p>
            <div className="sf-ai-guided-step-five-tags" aria-label="AI suggestion basis">
              {suggestionTags.map((tag, index) => (
                <span key={tag}>
                  {index === 0 ? <LinkGlyph /> : index === 1 ? <HeartGlyph /> : <MiniChatGlyph />}
                  {tag}
                </span>
              ))}
            </div>
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
                const meta = expressionMeta[index] || expressionMeta[expressionMeta.length - 1];
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
                      <p className={`sf-ai-guided-step-five-record-badge is-${meta.tone}`}>
                        {meta.badge}
                      </p>
                      <p lang="en" className="sf-ai-guided-step-five-record-text">
                        {renderInteractiveExpressionText
                          ? renderInteractiveExpressionText(
                              text,
                              index,
                              meta.tone
                            )
                          : renderExpressionText(text, meta.tone)}
                      </p>
                    </div>
                    <div className="sf-ai-guided-step-five-record-actions">
                      <button
                        type="button"
                        aria-label={`${COPY.playAria} ${index + 1}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onPlayExpression(index, 1);
                        }}
                        className="sf-ai-guided-step-five-play"
                      >
                        <PlayGlyph />
                      </button>
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

        <nav className="sf-ai-guided-step-five-bottom-bar" aria-label="AI guided result actions">
          <button
            type="button"
            aria-label={COPY.followAria}
            onClick={onFollowPractice}
            className="sf-ai-guided-step-five-follow"
          >
            <RefreshGlyph />
            <span>{COPY.follow}</span>
          </button>

          <button
            type="button"
            aria-label={COPY.useNextAria}
            onClick={onUseNextChinese}
            disabled={isLoadingNextChinese}
            className="sf-ai-guided-step-five-main-mic"
          >
            <MicGlyph />
          </button>

          <button
            type="button"
            aria-label={COPY.slowAria}
            onClick={onSlowPlayback}
            className="sf-ai-guided-step-five-slow"
          >
            <span>
              <PlayGlyph />
              0.5x
            </span>
            <span>{COPY.slow}</span>
          </button>
          <p>{COPY.speakPrompt}</p>
        </nav>
      </div>
    </section>
  );
}
