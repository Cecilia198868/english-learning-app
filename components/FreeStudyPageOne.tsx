"use client";

import { useRef } from "react";

type FreeStudyPageOneProps = {
  accountLabel?: string;
  avatarAlt?: string;
  avatarSrc?: string;
  menuLabel?: string;
  onAccountClick: () => void;
  onAvatarError?: () => void;
  onMenuClick: () => void;
  onMicrophoneClick: () => void;
};

const practiceSteps = [
  {
    description: "说出你想表达的内容，尽量具体",
    icon: "mic",
    title: "点击麦克风，说出中文",
  },
  {
    description: "尝试用英语表达这句话",
    icon: "mic",
    title: "点击麦克风，说出英文",
  },
  {
    description: "多种表达方式对比，帮你优化",
    icon: "sparkles",
    title: "AI 给出地道英语表达",
  },
  {
    description: "跟读练习，收藏生词和实用表达",
    icon: "book",
    title: "朗读准确英文，收藏词汇",
  },
] as const;

const helperActions = [
  { icon: "idea", label: "获取灵感" },
  { icon: "book", label: "例句参考" },
  { icon: "translate", label: "翻译助手" },
] as const;

function WaveGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 36 36"
    >
      <path
        d="M7 16v4M12.5 11v14M18 7v22M23.5 11v14M29 16v4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.4"
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
        strokeWidth="2.5"
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

function BookGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 40 40">
      <path
        d="M8 9.2c0-1.2 1-2.2 2.2-2.2H17c2 0 3.6.9 4.8 2.2A6.4 6.4 0 0 1 26.6 7h3.2C31 7 32 8 32 9.2v22.2c0 .8-.8 1.4-1.6 1.1l-3.8-1.3a8.4 8.4 0 0 0-6.6.4 8.4 8.4 0 0 0-6.6-.4l-3.8 1.3c-.8.3-1.6-.3-1.6-1.1V9.2Z"
        fill="currentColor"
      />
      <path d="M20 10v21" stroke="white" strokeOpacity=".42" strokeWidth="2.2" />
    </svg>
  );
}

function IdeaGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <path
        d="M10 14.2a6 6 0 1 1 9.6 4.8c-1.2.9-1.6 1.8-1.6 3.1h-4c0-1.3-.4-2.2-1.6-3.1a5.9 5.9 0 0 1-2.4-4.8Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M13.6 25h4.8M14.6 28h2.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function TranslateGlyph() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 32 32">
      <rect
        height="13"
        rx="3"
        stroke="currentColor"
        strokeWidth="2.2"
        width="13"
        x="6"
        y="6"
      />
      <rect fill="currentColor" height="13" rx="3" width="13" x="13" y="13" />
      <path
        d="M10 11h5M12.5 9v6M10.2 15c1.8-.8 3.3-2.3 4.2-4M21.8 17.4l-3.2 6M19.4 21h4.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M21.8 17.4 25 23.4"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function StepIcon({ name }: { name: (typeof practiceSteps)[number]["icon"] }) {
  if (name === "sparkles") return <SparklesGlyph />;
  if (name === "book") return <BookGlyph />;
  return <MicGlyph />;
}

function HelperIcon({ name }: { name: (typeof helperActions)[number]["icon"] }) {
  if (name === "idea") return <IdeaGlyph />;
  if (name === "translate") return <TranslateGlyph />;
  return <BookGlyph />;
}

export default function FreeStudyPageOne({
  accountLabel = "打开账户页面",
  avatarAlt = "用户头像",
  avatarSrc = "",
  menuLabel = "打开菜单",
  onAccountClick,
  onAvatarError,
  onMenuClick,
  onMicrophoneClick,
}: FreeStudyPageOneProps) {
  const lastMenuActivationRef = useRef(0);

  function activateMenu() {
    const now = Date.now();

    if (now - lastMenuActivationRef.current < 350) return;

    lastMenuActivationRef.current = now;
    onMenuClick();
  }

  return (
    <section className="sf-free-study-page-one" aria-label="自由学习第一页">
      <div className="sf-free-study-page-one-frame">
        <div aria-hidden="true" className="sf-free-study-orbit">
          <span className="sf-free-study-orbit-ring sf-free-study-orbit-ring-one" />
          <span className="sf-free-study-orbit-ring sf-free-study-orbit-ring-two" />
          <span className="sf-free-study-orbit-dot sf-free-study-orbit-dot-one" />
          <span className="sf-free-study-orbit-dot sf-free-study-orbit-dot-two" />
          <span className="sf-free-study-orbit-star sf-free-study-orbit-star-one" />
          <span className="sf-free-study-orbit-star sf-free-study-orbit-star-two" />
        </div>

        <header className="sf-free-study-page-one-header">
          <button
            type="button"
            aria-label={menuLabel}
            onClick={activateMenu}
            onPointerUp={(event) => {
              if (event.pointerType === "mouse") return;

              event.preventDefault();
              activateMenu();
            }}
            className="sf-free-study-page-one-menu"
          >
            <MenuGlyph />
          </button>

          <div className="sf-free-study-page-one-brand" aria-label="SpeakFlow AI Voice Practice">
            <span className="sf-free-study-page-one-logo" aria-hidden="true">
              <WaveGlyph />
            </span>
            <span className="sf-free-study-page-one-brand-copy">
              <span className="sf-free-study-page-one-brand-title">SpeakFlow</span>
              <span className="sf-free-study-page-one-brand-subtitle">
                AI VOICE PRACTICE
              </span>
            </span>
          </div>

          <button
            type="button"
            aria-label={accountLabel}
            onClick={onAccountClick}
            className="sf-free-study-page-one-avatar-button"
            title={avatarAlt}
          >
            <span className="sf-free-study-page-one-avatar-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc || "/default-avatar.png"}
                alt=""
                className="sf-free-study-page-one-avatar-image"
                onError={onAvatarError}
              />
            </span>
          </button>
        </header>

        <main className="sf-free-study-page-one-content">
          <section className="sf-free-study-page-one-hero" aria-labelledby="free-study-title">
            <WaveGlyph className="sf-free-study-page-one-hero-wave" />
            <h1 id="free-study-title">
              先说中文，
              <span>再大胆说英语</span>
            </h1>
            <p>AI 会一步步帮你说得更自然、更地道。</p>
          </section>

          <section className="sf-free-study-steps-card" aria-label="自由学习练习流程">
            <p className="sf-free-study-steps-title">
              练习只需 <strong>4 步</strong>
            </p>

            <ol className="sf-free-study-step-list">
              {practiceSteps.map((step, index) => (
                <li className="sf-free-study-step-item" key={step.title}>
                  <span className="sf-free-study-step-number">{index + 1}</span>
                  <span className="sf-free-study-step-icon">
                    <StepIcon name={step.icon} />
                  </span>
                  <span className="sf-free-study-step-divider" aria-hidden="true" />
                  <span className="sf-free-study-step-copy">
                    <span className="sf-free-study-step-title">{step.title}</span>
                    <span className="sf-free-study-step-description">
                      {step.description}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <ul className="sf-free-study-helper-actions" aria-label="辅助练习工具">
            {helperActions.map((action) => (
              <li className="sf-free-study-helper-pill" key={action.label}>
                <span className="sf-free-study-helper-icon">
                  <HelperIcon name={action.icon} />
                </span>
                <span>{action.label}</span>
              </li>
            ))}
          </ul>

          <div className="sf-free-study-page-one-spacer" aria-hidden="true" />

          <div className="sf-free-study-page-one-record">
            <button
              type="button"
              aria-label="点击麦克风开始练习"
              onClick={onMicrophoneClick}
              className="sf-free-study-page-one-mic"
            >
              <MicGlyph />
            </button>
            <p>
              <span aria-hidden="true" className="sf-free-study-lock-icon">
                <svg fill="none" viewBox="0 0 24 24">
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
              </span>
              点击麦克风开始练习
            </p>
          </div>
        </main>

        <div aria-hidden="true" className="sf-free-study-page-one-waves">
          <span className="sf-free-study-page-one-wave sf-free-study-page-one-wave-back" />
          <span className="sf-free-study-page-one-wave sf-free-study-page-one-wave-front" />
          <span className="sf-free-study-page-one-mic-halo sf-free-study-page-one-mic-halo-one" />
          <span className="sf-free-study-page-one-mic-halo sf-free-study-page-one-mic-halo-two" />
        </div>
      </div>
    </section>
  );
}
