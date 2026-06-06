"use client";

import HomeMenuIcon from "@/components/HomeMenuIcon";

type FreeStudyHelpModalProps = {
  onClose: () => void;
  onMenuClick?: () => void;
};

const helpSteps = [
  {
    body: "点击麦克风，说出你现在想表达的内容。",
    icon: "mic",
    title: "先说中文",
  },
  {
    body: "如果识别有误，可以先编辑中文，再继续练习。",
    icon: "edit",
    title: "修改中文",
  },
  {
    body: "看着中文，用你自己的英文先说出来，不需要一开始就完美。",
    icon: "speak",
    title: "大胆说英文",
  },
  {
    body: "AI 会给你准确、地道、简洁等不同表达，你可以播放、跟读，并收藏有用句子。",
    icon: "listen",
    title: "看推荐表达并跟读",
  },
] as const;

function WaveMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M7 22v4M13.5 15v18M20 9v30M26.5 13v22M33 17v14M39 21v6" />
    </svg>
  );
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
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M12 38h8L36 22a4.2 4.2 0 0 0-6-6L14 32l-2 6Z" />
      <path d="m27 19 4 4M11 41h29" />
      <path d="M12 11h16M12 18h11" />
    </svg>
  );
}

function SpeakGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M19 10c-5 3-7 8-7 14s2.2 10.5 7 14" />
      <path d="M24 17c4 2 6 4.5 6 7s-2 5-6 7M34 14c5 4 7.5 7.5 7.5 10S39 30 34 34" />
    </svg>
  );
}

function ListenGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M11 25v-3a13 13 0 0 1 26 0v3" />
      <rect x="7" y="23" width="10" height="15" rx="5" />
      <rect x="31" y="23" width="10" height="15" rx="5" />
      <path d="M21 14h6M19 36l5-4 5 4" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M8 18.5C8 11.8 14 7 24 7s16 4.8 16 11.5S34 30 24 30c-1.5 0-3-.1-4.4-.4L10.8 36l2.2-8.1C9.8 25.8 8 23.2 8 18.5Z" />
      <path d="M17 19.5h.1M24 19.5h.1M31 19.5h.1" />
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

function BookGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M10 12c5-2.6 9.8-2.2 14 1.2v27c-4.2-3.4-8.8-3.8-14-1.2V12Z" />
      <path d="M24 13.2c4.2-3.4 8.8-3.8 14-1.2v27c-5.2-2.6-9.8-2.2-14 1.2" />
      <path d="M16 19h3M16 25h4M30 19h3M30 25h4" />
    </svg>
  );
}

function RobotGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="9" y="16" width="30" height="22" rx="8" />
      <path d="M18 16v-5M30 16v-5M17 27h.1M31 27h.1M20 32c2.8 2 8.2 2 11 0" />
    </svg>
  );
}

function StepIcon({ icon }: { icon: (typeof helpSteps)[number]["icon"] }) {
  if (icon === "edit") return <EditGlyph />;
  if (icon === "speak") return <SpeakGlyph />;
  if (icon === "listen") return <ListenGlyph />;
  return <MicGlyph />;
}

export default function FreeStudyHelpModal({
  onClose,
  onMenuClick,
}: FreeStudyHelpModalProps) {
  return (
    <div
      className="sf-free-help-standard"
      role="dialog"
      aria-modal="true"
      aria-label="自由学习帮助"
      onClick={onClose}
    >
      <style>{`
        .sf-free-help-standard,
        .sf-free-help-standard * {
          box-sizing: border-box;
        }

        .sf-free-help-standard {
          position: fixed;
          inset: 0;
          z-index: 260;
          overflow-y: auto;
          overflow-x: hidden;
          color: #101342;
          background:
            radial-gradient(circle at 74% 10%, rgba(255,255,255,.92), transparent 20%),
            radial-gradient(circle at 8% 30%, rgba(236,221,255,.9), transparent 30%),
            linear-gradient(180deg, rgba(246,238,255,.96), rgba(251,248,255,.96));
          font-family: var(--sf-font-zh, "PingFang SC", "Microsoft YaHei", sans-serif);
        }

        .sf-free-help-standard-frame {
          min-height: 100%;
          padding: calc(env(safe-area-inset-top, 0px) + .68rem) clamp(.82rem, 3.8vw, 1.15rem)
            calc(env(safe-area-inset-bottom, 0px) + .85rem);
        }

        .sf-free-help-standard-header {
          display: grid;
          grid-template-columns: 2.72rem minmax(0, 1fr) 2.72rem;
          align-items: center;
          gap: .5rem;
        }

        .sf-free-help-standard-home,
        .sf-free-help-standard-question {
          display: grid;
          width: 2.52rem;
          height: 2.52rem;
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: rgba(255,255,255,.9);
          color: #101342;
          box-shadow: 0 12px 24px rgba(105,77,177,.14), inset 0 1px 0 rgba(255,255,255,.96);
          cursor: pointer;
        }

        .sf-free-help-standard-home .sf-home-menu-icon,
        .sf-free-help-standard-home .sf-home-menu-icon svg {
          width: 1.5rem;
          height: 1.5rem;
          color: currentColor;
        }

        .sf-free-help-standard-question {
          justify-self: end;
          color: #6f4bea;
          font-size: 1.2rem;
          font-weight: 950;
        }

        .sf-free-help-standard-brand {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          gap: .32rem;
        }

        .sf-free-help-standard-logo {
          display: grid;
          width: 1.9rem;
          height: 1.9rem;
          place-items: center;
          color: #8b55ef;
        }

        .sf-free-help-standard-logo svg {
          width: 1.85rem;
          height: 1.85rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 3.4;
          stroke-linecap: round;
        }

        .sf-free-help-standard-brand-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .sf-free-help-standard-brand-title {
          color: #101342;
          font-size: clamp(1.02rem, 4.8vw, 1.35rem);
          font-weight: 950;
          line-height: .92;
          white-space: nowrap;
        }

        .sf-free-help-standard-brand-subtitle {
          margin-top: .18rem;
          color: rgba(44,45,86,.72);
          font-size: clamp(.44rem, 1.7vw, .58rem);
          font-weight: 850;
          letter-spacing: .16em;
          line-height: 1;
          white-space: nowrap;
        }

        .sf-free-help-standard-hero {
          position: relative;
          margin-top: .9rem;
          text-align: center;
        }

        .sf-free-help-standard-hero h2 {
          margin: 0;
          color: #101342;
          font-size: clamp(1.95rem, 9vw, 2.45rem);
          font-weight: 950;
          line-height: 1.1;
        }

        .sf-free-help-standard-hero p {
          margin: .55rem auto 0;
          max-width: 22rem;
          color: rgba(55,55,104,.72);
          font-size: clamp(.85rem, 3.6vw, 1.02rem);
          font-weight: 650;
          line-height: 1.45;
        }

        .sf-free-help-standard-orbit {
          position: absolute;
          right: .2rem;
          top: .15rem;
          display: grid;
          width: 4.75rem;
          height: 3.35rem;
          place-items: center;
          color: rgba(138,86,238,.56);
          pointer-events: none;
        }

        .sf-free-help-standard-orbit::before {
          content: "";
          position: absolute;
          width: 4.5rem;
          height: 2.1rem;
          border: 1px solid rgba(179,142,247,.36);
          border-radius: 50%;
          transform: rotate(-15deg);
        }

        .sf-free-help-standard-orbit svg {
          width: 2.15rem;
          height: 2.15rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 3.4;
          stroke-linecap: round;
        }

        .sf-free-help-standard-steps {
          display: grid;
          gap: .52rem;
          margin-top: 1.05rem;
        }

        .sf-free-help-standard-step {
          display: grid;
          grid-template-columns: 4.1rem 2.2rem minmax(0, 1fr) 1.1rem;
          align-items: center;
          gap: .58rem;
          border: 1px solid rgba(151,103,235,.14);
          border-radius: 1rem;
          background: rgba(255,255,255,.76);
          padding: .58rem .72rem;
          box-shadow: 0 12px 26px rgba(100,72,170,.08), inset 0 1px 0 rgba(255,255,255,.92);
        }

        .sf-free-help-standard-step-icon {
          display: grid;
          width: 3.55rem;
          height: 3.55rem;
          place-items: center;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(243,236,255,.92), rgba(229,213,255,.9));
          color: #8b55ef;
        }

        .sf-free-help-standard-step-icon svg,
        .sf-free-help-standard-card-icon svg,
        .sf-free-help-standard-tip-icon svg,
        .sf-free-help-standard-book svg,
        .sf-free-help-standard-robot svg {
          width: 2.18rem;
          height: 2.18rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 3.1;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .sf-free-help-standard-step-number {
          display: grid;
          width: 1.9rem;
          height: 1.9rem;
          place-items: center;
          border-radius: .55rem;
          background: linear-gradient(135deg, #d9c8ff, #8c58ef);
          color: white;
          font-size: 1rem;
          font-weight: 950;
        }

        .sf-free-help-standard-step h3 {
          margin: 0;
          color: #101342;
          font-size: clamp(1rem, 4.4vw, 1.22rem);
          font-weight: 950;
          line-height: 1.18;
        }

        .sf-free-help-standard-step p {
          margin: .28rem 0 0;
          color: rgba(41,42,86,.7);
          font-size: clamp(.72rem, 3.05vw, .86rem);
          font-weight: 620;
          line-height: 1.45;
        }

        .sf-free-help-standard-chevron {
          color: #8c58ef;
          font-size: 1.95rem;
          font-weight: 320;
        }

        .sf-free-help-standard-info,
        .sf-free-help-standard-tip {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(151,103,235,.14);
          border-radius: 1rem;
          background: rgba(255,255,255,.74);
          box-shadow: 0 12px 26px rgba(100,72,170,.08), inset 0 1px 0 rgba(255,255,255,.92);
        }

        .sf-free-help-standard-info {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 5.8rem;
          gap: .55rem;
          margin-top: .72rem;
          padding: .9rem .95rem;
        }

        .sf-free-help-standard-card-title,
        .sf-free-help-standard-tip-title {
          display: flex;
          align-items: center;
          gap: .45rem;
          margin: 0;
          color: #101342;
          font-size: clamp(1rem, 4.3vw, 1.24rem);
          font-weight: 950;
          line-height: 1.2;
        }

        .sf-free-help-standard-card-icon,
        .sf-free-help-standard-tip-icon {
          display: grid;
          width: 2.1rem;
          height: 2.1rem;
          place-items: center;
          border-radius: 50%;
          background: rgba(229,213,255,.86);
          color: #8b55ef;
        }

        .sf-free-help-standard-info ul,
        .sf-free-help-standard-tip ul {
          margin: .55rem 0 0;
          padding-left: 1.05rem;
          color: rgba(41,42,86,.72);
          font-size: clamp(.77rem, 3.15vw, .9rem);
          font-weight: 640;
          line-height: 1.68;
        }

        .sf-free-help-standard-info li::marker,
        .sf-free-help-standard-tip li::marker {
          color: #8b55ef;
        }

        .sf-free-help-standard-robot {
          align-self: end;
          display: grid;
          width: 5.2rem;
          height: 4.2rem;
          place-items: center;
          border-radius: 1.2rem;
          background: radial-gradient(circle at 50% 24%, rgba(255,255,255,.95), transparent 44%),
            linear-gradient(145deg, rgba(226,214,255,.86), rgba(187,158,255,.52));
          color: #7b52e9;
        }

        .sf-free-help-standard-tip {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 5.2rem;
          gap: .55rem;
          margin-top: .72rem;
          padding: .85rem .95rem;
        }

        .sf-free-help-standard-book {
          align-self: end;
          display: grid;
          width: 4.8rem;
          height: 3.8rem;
          place-items: center;
          border-radius: 1rem;
          color: #8b55ef;
          background: rgba(245,238,255,.82);
        }

        .sf-free-help-standard-ok {
          display: block;
          width: calc(100% - 1.3rem);
          min-height: 3rem;
          margin: .9rem auto 0;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, #b372ff 0%, #8552ef 100%);
          color: white;
          box-shadow: 0 14px 24px rgba(132,82,236,.26), inset 0 1px 0 rgba(255,255,255,.42);
          font-size: clamp(1rem, 4.4vw, 1.2rem);
          font-weight: 950;
          cursor: pointer;
        }

        @media (max-width: 360px) {
          .sf-free-help-standard-step {
            grid-template-columns: 3.55rem 1.9rem minmax(0, 1fr) .8rem;
            gap: .42rem;
            padding-left: .58rem;
            padding-right: .58rem;
          }

          .sf-free-help-standard-step-icon {
            width: 3.1rem;
            height: 3.1rem;
          }

          .sf-free-help-standard-info,
          .sf-free-help-standard-tip {
            grid-template-columns: 1fr;
          }

          .sf-free-help-standard-robot,
          .sf-free-help-standard-book {
            display: none;
          }
        }
      `}</style>

      <div
        className="sf-free-help-standard-frame"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sf-free-help-standard-header">
          <button
            type="button"
            aria-label="回到首页"
            onClick={onMenuClick}
            className="sf-free-help-standard-home"
          >
            <HomeMenuIcon label={null} showHint={false} />
          </button>

          <div className="sf-free-help-standard-brand" aria-label="SpeakFlow AI Voice Practice">
            <span className="sf-free-help-standard-logo">
              <WaveMark />
            </span>
            <span className="sf-free-help-standard-brand-copy">
              <span className="sf-free-help-standard-brand-title">SpeakFlow</span>
              <span className="sf-free-help-standard-brand-subtitle">AI VOICE PRACTICE</span>
            </span>
          </div>

          <button
            type="button"
            aria-label="关闭帮助"
            onClick={onClose}
            className="sf-free-help-standard-question"
          >
            ?
          </button>
        </header>

        <section className="sf-free-help-standard-hero">
          <span className="sf-free-help-standard-orbit">
            <WaveMark />
          </span>
          <h2>自由学习怎么练？</h2>
          <p>想说什么就说什么，AI 会帮你一步步变成自然英语。</p>
        </section>

        <section className="sf-free-help-standard-steps" aria-label="自由学习步骤">
          {helpSteps.map((step, index) => (
            <article className="sf-free-help-standard-step" key={step.title}>
              <span className="sf-free-help-standard-step-icon">
                <StepIcon icon={step.icon} />
              </span>
              <span className="sf-free-help-standard-step-number">{index + 1}</span>
              <span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </span>
              <span className="sf-free-help-standard-chevron" aria-hidden="true">
                ›
              </span>
            </article>
          ))}
        </section>

        <section className="sf-free-help-standard-info">
          <div>
            <h3 className="sf-free-help-standard-card-title">
              <span className="sf-free-help-standard-card-icon">
                <ChatGlyph />
              </span>
              自由学习和 AI 引导表达有什么不同？
            </h3>
            <ul>
              <li>自由学习：你自己决定想说什么</li>
              <li>没有固定下一句，更适合随时练习</li>
              <li>更像真实表达训练</li>
            </ul>
          </div>
          <span className="sf-free-help-standard-robot">
            <RobotGlyph />
          </span>
        </section>

        <section className="sf-free-help-standard-tip">
          <div>
            <h3 className="sf-free-help-standard-tip-title">
              <span className="sf-free-help-standard-tip-icon">
                <LightGlyph />
              </span>
              小提示
            </h3>
            <ul>
              <li>先自然表达，不要一开始就追求完美。</li>
              <li>中文越清楚，AI 给出的建议通常越准确。</li>
              <li>遇到喜欢的表达，记得收藏到新表达。</li>
            </ul>
          </div>
          <span className="sf-free-help-standard-book">
            <BookGlyph />
          </span>
        </section>

        <button
          type="button"
          className="sf-free-help-standard-ok"
          onClick={onClose}
        >
          我知道了，开始自由学习
        </button>
      </div>
    </div>
  );
}
