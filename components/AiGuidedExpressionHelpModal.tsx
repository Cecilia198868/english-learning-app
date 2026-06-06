"use client";

import { useEffect } from "react";

type AiGuidedExpressionHelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const practiceSteps = [
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

const tips = [
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

const faqItems = [
  "语音识别不准确怎么办？",
  "可以修改识别出的中文吗？",
  "每天可以免费练习几句？",
  "我的学习记录会保存吗？",
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

function VoiceGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M12 22v4M18 15v18M24 10v28M30 15v18M36 22v4" />
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

function SparkleGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m12 2.7 2.7 6.6 6.6 2.7-6.6 2.7-2.7 6.6-2.7-6.6-6.6-2.7 6.6-2.7L12 2.7Z" />
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

function FlowIcon({ icon }: { icon: (typeof practiceSteps)[number]["icon"] }) {
  if (icon === "mic") return <MicGlyph />;
  if (icon === "chat") return <ChatGlyph />;
  if (icon === "robot") return <RobotGlyph />;
  return <LightGlyph />;
}

function TipIcon({ icon }: { icon: (typeof tips)[number]["icon"] }) {
  if (icon === "smile") return <SmileGlyph />;
  if (icon === "book") return <BookGlyph />;
  return <VoiceGlyph />;
}

export default function AiGuidedExpressionHelpModal({
  isOpen,
  onClose,
}: AiGuidedExpressionHelpModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="sf-ai-guided-help-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <style>{`
        .sf-ai-guided-help-backdrop,
        .sf-ai-guided-help-backdrop * {
          box-sizing: border-box;
        }

        .sf-ai-guided-help-backdrop {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: calc(env(safe-area-inset-top, 0px) + 5.6rem) 0.62rem calc(env(safe-area-inset-bottom, 0px) + 1rem);
          background: rgba(8, 14, 34, 0.34);
          backdrop-filter: blur(10px);
          overflow-y: auto;
          font-family: var(--sf-font-zh, "PingFang SC", "Microsoft YaHei", sans-serif);
        }

        .sf-ai-guided-help-modal {
          width: min(100%, 25.35rem);
          max-height: min(79dvh, 45rem);
          overflow-y: auto;
          border: 1px solid rgba(220, 229, 248, 0.94);
          border-radius: clamp(1.18rem, 5vw, 1.62rem);
          background:
            radial-gradient(circle at 90% 7%, rgba(226, 216, 255, 0.72), transparent 9.5rem),
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 252, 255, 0.97));
          box-shadow:
            0 1.65rem 4.2rem rgba(15, 23, 58, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.96);
          padding: clamp(1.02rem, 4vw, 1.38rem);
          color: #081038;
        }

        .sf-ai-guided-help-modal::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .sf-ai-guided-help-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .sf-ai-guided-help-title {
          margin: 0;
          color: #081038;
          font-size: clamp(1.35rem, 6vw, 1.9rem);
          font-weight: 1000;
          letter-spacing: 0;
          line-height: 1.08;
        }

        .sf-ai-guided-help-subtitle {
          margin: 0.48rem 0 0;
          color: rgba(62, 72, 117, 0.76);
          font-size: clamp(0.84rem, 3.8vw, 1.05rem);
          font-weight: 760;
          line-height: 1.36;
        }

        .sf-ai-guided-help-close {
          width: clamp(2.35rem, 10vw, 3rem);
          height: clamp(2.35rem, 10vw, 3rem);
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          color: #11183f;
          display: grid;
          place-items: center;
          box-shadow:
            0 0.8rem 1.8rem rgba(80, 93, 150, 0.13),
            inset 0 0 0 1px rgba(210, 222, 246, 0.9);
          cursor: pointer;
        }

        .sf-ai-guided-help-close svg {
          width: 46%;
          height: 46%;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.7;
          stroke-linecap: round;
        }

        .sf-ai-guided-help-section {
          margin-top: clamp(1rem, 4vw, 1.28rem);
          border: 1px solid rgba(219, 228, 249, 0.92);
          border-radius: clamp(1rem, 4.5vw, 1.3rem);
          background: rgba(255, 255, 255, 0.72);
          box-shadow:
            0 0.9rem 2rem rgba(82, 98, 160, 0.09),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          padding: clamp(0.86rem, 3.6vw, 1.12rem);
        }

        .sf-ai-guided-help-section-title {
          margin: 0 0 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.42rem;
          color: #081038;
          font-size: clamp(1rem, 4.6vw, 1.28rem);
          font-weight: 950;
          line-height: 1.1;
        }

        .sf-ai-guided-help-section-title svg {
          width: 1.16rem;
          height: 1.16rem;
          fill: #875cff;
        }

        .sf-ai-guided-help-flow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(0.34rem, 1.8vw, 0.62rem);
        }

        .sf-ai-guided-help-flow-step {
          position: relative;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .sf-ai-guided-help-flow-step:not(:last-child)::after {
          content: "";
          position: absolute;
          left: calc(50% + 1.42rem);
          top: 1.72rem;
          width: clamp(1.3rem, 5vw, 2.2rem);
          border-top: 2px dashed rgba(160, 178, 246, 0.56);
        }

        .sf-ai-guided-help-flow-icon {
          width: clamp(2.72rem, 12vw, 3.52rem);
          height: clamp(2.72rem, 12vw, 3.52rem);
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #6e62ff;
          background: rgba(238, 242, 255, 0.94);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.96);
        }

        .sf-ai-guided-help-flow-icon svg {
          width: 54%;
          height: 54%;
          fill: none;
          stroke: currentColor;
          stroke-width: 3.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-ai-guided-help-flow-index {
          margin-top: -0.52rem;
          width: 1.28rem;
          height: 1.28rem;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #8d60ff, #377dff);
          font-size: 0.74rem;
          font-weight: 950;
          box-shadow: 0 0.45rem 0.9rem rgba(88, 99, 231, 0.2);
        }

        .sf-ai-guided-help-flow-name {
          margin-top: 0.5rem;
          color: #081038;
          font-size: clamp(0.74rem, 3.1vw, 0.86rem);
          font-weight: 900;
          line-height: 1.12;
        }

        .sf-ai-guided-help-flow-copy {
          margin-top: 0.34rem;
          color: rgba(61, 73, 117, 0.72);
          font-size: clamp(0.62rem, 2.55vw, 0.74rem);
          font-weight: 700;
          line-height: 1.36;
        }

        .sf-ai-guided-help-tip-list {
          border: 1px solid rgba(220, 229, 249, 0.9);
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.66);
          overflow: hidden;
        }

        .sf-ai-guided-help-tip {
          display: grid;
          grid-template-columns: 2.85rem minmax(0, 1fr);
          gap: 0.72rem;
          align-items: center;
          padding: 0.76rem;
        }

        .sf-ai-guided-help-tip + .sf-ai-guided-help-tip {
          border-top: 1px solid rgba(210, 220, 245, 0.8);
        }

        .sf-ai-guided-help-tip-icon {
          width: 2.58rem;
          height: 2.58rem;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #bd78ff, #6958ff);
        }

        .sf-ai-guided-help-tip:nth-child(2) .sf-ai-guided-help-tip-icon {
          background: linear-gradient(135deg, #9ed7ff, #3f83ff);
        }

        .sf-ai-guided-help-tip-icon svg {
          width: 54%;
          height: 54%;
          fill: none;
          stroke: currentColor;
          stroke-width: 3.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-ai-guided-help-tip strong {
          display: block;
          color: #081038;
          font-size: clamp(0.88rem, 3.7vw, 1rem);
          font-weight: 950;
          line-height: 1.16;
        }

        .sf-ai-guided-help-tip span:last-child {
          display: block;
          margin-top: 0.22rem;
          color: rgba(62, 73, 116, 0.74);
          font-size: clamp(0.72rem, 3vw, 0.82rem);
          font-weight: 700;
          line-height: 1.38;
        }

        .sf-ai-guided-help-faq {
          display: grid;
          gap: 0.46rem;
        }

        .sf-ai-guided-help-faq-row {
          min-height: 2.62rem;
          border: 1px solid rgba(219, 228, 249, 0.94);
          border-radius: 0.78rem;
          background: rgba(255, 255, 255, 0.76);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.7rem;
          padding: 0 0.78rem;
          color: rgba(32, 43, 83, 0.82);
          font-size: clamp(0.76rem, 3.2vw, 0.9rem);
          font-weight: 820;
          text-align: left;
        }

        .sf-ai-guided-help-faq-row svg {
          width: 1rem;
          height: 1rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.72;
          flex: 0 0 auto;
        }

        .sf-ai-guided-help-encourage {
          margin-top: clamp(1rem, 4vw, 1.22rem);
          min-height: 4.9rem;
          border: 1px solid rgba(219, 228, 249, 0.92);
          border-radius: clamp(1rem, 4.5vw, 1.28rem);
          background: rgba(255, 255, 255, 0.72);
          box-shadow:
            0 0.9rem 2rem rgba(82, 98, 160, 0.09),
            inset 0 1px 0 rgba(255, 255, 255, 0.95);
          display: grid;
          grid-template-columns: 3.2rem minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.8rem;
          padding: 0.85rem 1rem;
        }

        .sf-ai-guided-help-heart {
          width: 3rem;
          height: 3rem;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #c7b4ff, #7358ff);
        }

        .sf-ai-guided-help-heart svg {
          width: 62%;
          height: 62%;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-ai-guided-help-encourage strong {
          display: block;
          color: #081038;
          font-size: clamp(0.9rem, 3.8vw, 1.05rem);
          font-weight: 950;
          line-height: 1.18;
        }

        .sf-ai-guided-help-encourage span span {
          display: block;
          margin-top: 0.22rem;
          color: rgba(62, 73, 116, 0.75);
          font-size: clamp(0.72rem, 3vw, 0.82rem);
          font-weight: 740;
          line-height: 1.28;
        }

        .sf-ai-guided-help-stars {
          color: #8b63ff;
          font-size: 1rem;
          letter-spacing: 0.18rem;
          white-space: nowrap;
        }

        @media (max-width: 370px) {
          .sf-ai-guided-help-backdrop {
            padding-top: calc(env(safe-area-inset-top, 0px) + 4.8rem);
          }

          .sf-ai-guided-help-modal {
            padding: 0.9rem;
          }

          .sf-ai-guided-help-flow-step:not(:last-child)::after {
            width: 1.1rem;
            left: calc(50% + 1.18rem);
          }

          .sf-ai-guided-help-encourage {
            grid-template-columns: 2.7rem minmax(0, 1fr);
          }

          .sf-ai-guided-help-stars {
            display: none;
          }
        }
      `}</style>

      <section
        className="sf-ai-guided-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sf-ai-guided-help-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sf-ai-guided-help-head">
          <div>
            <h2 className="sf-ai-guided-help-title" id="sf-ai-guided-help-title">
              使用帮助
            </h2>
            <p className="sf-ai-guided-help-subtitle">
              AI 会一步步帮你练习，提升表达能力
            </p>
          </div>
          <button
            type="button"
            className="sf-ai-guided-help-close"
            aria-label="关闭帮助"
            onClick={onClose}
          >
            <CloseGlyph />
          </button>
        </header>

        <section className="sf-ai-guided-help-section">
          <h3 className="sf-ai-guided-help-section-title">
            <SparkleGlyph />
            <span>怎么练？</span>
          </h3>
          <div className="sf-ai-guided-help-flow">
            {practiceSteps.map((step, index) => (
              <div className="sf-ai-guided-help-flow-step" key={step.title}>
                <span className="sf-ai-guided-help-flow-icon" aria-hidden="true">
                  <FlowIcon icon={step.icon} />
                </span>
                <span className="sf-ai-guided-help-flow-index">{index + 1}</span>
                <strong className="sf-ai-guided-help-flow-name">
                  {step.title}
                </strong>
                <span className="sf-ai-guided-help-flow-copy">
                  {step.description}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="sf-ai-guided-help-section">
          <h3 className="sf-ai-guided-help-section-title">
            <SparkleGlyph />
            <span>小贴士</span>
          </h3>
          <div className="sf-ai-guided-help-tip-list">
            {tips.map((tip) => (
              <div className="sf-ai-guided-help-tip" key={tip.title}>
                <span className="sf-ai-guided-help-tip-icon" aria-hidden="true">
                  <TipIcon icon={tip.icon} />
                </span>
                <span>
                  <strong>{tip.title}</strong>
                  <span>{tip.description}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="sf-ai-guided-help-section">
          <h3 className="sf-ai-guided-help-section-title">
            <SparkleGlyph />
            <span>常见问题</span>
          </h3>
          <div className="sf-ai-guided-help-faq">
            {faqItems.map((item) => (
              <div className="sf-ai-guided-help-faq-row" key={item}>
                <span>{item}</span>
                <ChevronGlyph />
              </div>
            ))}
          </div>
        </section>

        <div className="sf-ai-guided-help-encourage">
          <span className="sf-ai-guided-help-heart" aria-hidden="true">
            <HeartBubbleGlyph />
          </span>
          <span>
            <strong>坚持练习，你会越来越棒！</strong>
            <span>SpeakFlow 一直陪伴你提升表达能力</span>
          </span>
          <span className="sf-ai-guided-help-stars" aria-hidden="true">
            ✦ ✦ ✦
          </span>
        </div>
      </section>
    </div>
  );
}
