"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";
import type { AiGuidedProgressSnapshot } from "@/lib/aiGuidedExpressionProgress";
import { FREE_PRACTICE_DAILY_LIMIT } from "@/lib/freePracticeLimit";

type SubscriptionStatus = "free" | "pro" | "cancels_at_period_end";

type AccountSubscriptionResponse = {
  cancelAtPeriodEnd?: boolean | null;
  subscriptionStatus?: SubscriptionStatus;
};

const defaultProgress: AiGuidedProgressSnapshot = {
  challenge: {
    completed: 0,
    goal: 10,
    percent: 0,
  },
  dailyGoal: 10,
  level: 1,
  steps: {
    english: { id: "english", label: "待解锁", status: "locked" },
    follow: { id: "follow", label: "待解锁", status: "locked" },
    native: { id: "native", label: "开始练习", status: "active" },
    suggestions: { id: "suggestions", label: "待解锁", status: "locked" },
  },
  streakDays: 0,
  todayCompleted: 0,
  totalCompleted: 0,
};

const ringCircumference = 302;

const learningFlow = [
  {
    description: "说出你的想法",
    icon: "mic",
    title: "说中文",
    tone: "violet",
  },
  {
    description: "确认识别结果",
    icon: "check",
    title: "检查",
    tone: "blue",
  },
  {
    description: "大胆开口表达",
    icon: "speak",
    title: "说英文",
    tone: "blue",
  },
  {
    description: "获得更自然表达",
    icon: "sparkle",
    title: "AI优化",
    tone: "violet",
  },
  {
    description: "AI引导继续对话",
    icon: "light",
    title: "下一句",
    tone: "blue",
  },
] as const;

const learningWays = [
  ["1", "先说出你想表达的中文", "从自己的想法开始"],
  ["2", "尝试自己说英文", "不怕说错，大胆开口"],
  ["3", "AI提供多种更地道的表达", "准确 · 地道 · 礼貌 · 简洁"],
  ["4", "AI推荐下一句继续对话", "不会冷场，不会卡壳"],
] as const;

function normalizeSubscriptionStatus(
  subscriptionStatus?: SubscriptionStatus | null,
  cancelAtPeriodEnd?: boolean | null
): SubscriptionStatus {
  if (cancelAtPeriodEnd === true) return "cancels_at_period_end";

  return subscriptionStatus === "pro" ||
    subscriptionStatus === "cancels_at_period_end"
    ? subscriptionStatus
    : "free";
}

function hasProAccess(subscriptionStatus: SubscriptionStatus) {
  return subscriptionStatus !== "free";
}

function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 7h14M5 12h14M5 17h14" />
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

function SparkleGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="m25 5 4.6 11.4L41 21l-11.4 4.6L25 37l-4.6-11.4L9 21l11.4-4.6L25 5Z" />
      <path d="m10 31 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5ZM38 4l1.4 3.6L43 9l-3.6 1.4L38 14l-1.4-3.6L33 9l3.6-1.4L38 4Z" />
    </svg>
  );
}

function FlameGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M25 44c8.2 0 14-5.7 14-13.2 0-7.8-5.2-12.2-9.1-16.4-1.2 5.1-4.1 7.4-6.5 9.4.7-6.3-1.7-12-6.9-16.8.3 8.6-7.5 12.3-7.5 23.2C9 38.3 15.9 44 25 44Z" />
    </svg>
  );
}

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 5 40 12v11c0 10.2-6.4 16.4-16 20-9.6-3.6-16-9.8-16-20V12L24 5Z" />
    </svg>
  );
}

function CheckListGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M15 8v7M33 8v7M12 13h24a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5V18a5 5 0 0 1 5-5Z" />
      <path d="m16 28 5 5 11-13" />
    </svg>
  );
}

function SpeakingGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M23 41c-8-2-13-8.2-13-16.3C10 14.6 16.1 8 25.4 8 33 8 38 13.4 38 20.4c0 3.6-1.3 6.8-3.7 9.1" />
      <path d="M29 27c2.2.5 4 1.5 6 3M31 21h9M30 15c2.2-.5 4-1.5 6-3" />
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

function BookmarkGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M11 6h26v36L24 34l-13 8V6Z" />
      <path d="m24 14 2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8L24 14Z" />
    </svg>
  );
}

function ChatGlyph() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
      <path d="M17 23c0-9.9 8.1-18 18-18h27c9.9 0 18 8.1 18 18v22c0 9.9-8.1 18-18 18H42L20 78l5.4-16.8C20.4 58 17 52.6 17 46V23Z" />
      <path d="M58 55c0-8.8 7.2-16 16-16h3c8.8 0 16 7.2 16 16v8c0 8.8-7.2 16-16 16h-7.5L56 89l3.2-11.2C48.9 76.9 42 70 42 60v-5h16Z" />
      <circle cx="38" cy="35" r="3.5" />
      <circle cx="49" cy="35" r="3.5" />
      <circle cx="60" cy="35" r="3.5" />
      <circle cx="66" cy="61" r="3" />
      <circle cx="76" cy="61" r="3" />
    </svg>
  );
}

function RocketGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M42 7c-8.8 2.1-16 8.7-21.4 19.7L9 27l8.7 5.1L15 44l11.6-2.8L32 50l.3-11.6C43.3 33 49.9 25.8 52 17l5-10-15 0Z" />
      <path d="M38 18a4.5 4.5 0 1 0 9 0 4.5 4.5 0 0 0-9 0Z" />
      <path d="M14 42c-3.8 1.2-6.4 3.7-8 7.8 4.1-1.6 6.6-4.2 7.8-8" />
    </svg>
  );
}

function FlowIcon({ icon }: { icon: (typeof learningFlow)[number]["icon"] }) {
  if (icon === "check") return <CheckListGlyph />;
  if (icon === "speak") return <SpeakingGlyph />;
  if (icon === "sparkle") return <SparkleGlyph />;
  if (icon === "light") return <LightGlyph />;
  return <MicGlyph />;
}

export default function AiGuidedExpressionStepOne() {
  const router = useRouter();
  const [progress, setProgress] =
    useState<AiGuidedProgressSnapshot>(defaultProgress);
  const [isAccountPro, setIsAccountPro] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      try {
        const [progressResponse, subscriptionResponse] = await Promise.all([
          fetch("/api/ai-guided-expression/progress", { cache: "no-store" }),
          fetch("/api/me/subscription", { cache: "no-store" }).catch(() => null),
        ]);
        const progressData =
          (await progressResponse.json()) as AiGuidedProgressSnapshot;
        const subscriptionData =
          subscriptionResponse?.ok
            ? ((await subscriptionResponse.json()) as AccountSubscriptionResponse)
            : null;

        if (!cancelled) {
          setProgress(progressData);
          setIsAccountPro(
            hasProAccess(
              normalizeSubscriptionStatus(
                subscriptionData?.subscriptionStatus,
                subscriptionData?.cancelAtPeriodEnd
              )
            )
          );
        }
      } catch {
        if (!cancelled) {
          setProgress(defaultProgress);
          setIsAccountPro(false);
        }
      }
    }

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, []);

  function openStepTwo() {
    router.push("/ai-guided-expression/step-2");
  }

  const dailyGoal = Math.max(progress.dailyGoal, 1);
  const todayCompleted = Math.max(progress.todayCompleted, 0);
  const ringPercent = Math.min(100, Math.round((todayCompleted / dailyGoal) * 100));
  const ringOffset =
    ringCircumference - (ringCircumference * ringPercent) / 100;
  const ringStyle = {
    "--ai-guided-ring-offset": `${ringOffset}`,
  } as CSSProperties;
  const freeUsed = Math.min(
    todayCompleted,
    FREE_PRACTICE_DAILY_LIMIT
  );
  const trialLabel = isAccountPro ? "今日AI引导练习" : "今日免费AI引导试用";
  const trialCount = isAccountPro
    ? `${todayCompleted}/${dailyGoal}`
    : `${freeUsed}/${FREE_PRACTICE_DAILY_LIMIT}`;

  return (
    <main className="sf-ai-guided-step-one-page">
      <section
        className="sf-ai-guided-step-one-phone"
        aria-label="AI引导表达学习第一页"
      >
        <div className="sf-ai-guided-step-one-frame">
          <header className="sf-ai-guided-step-one-header">
            <button
              type="button"
              aria-label="打开账户界面"
              onClick={() => router.push("/account")}
              className="sf-ai-guided-step-one-menu"
            >
              <MenuGlyph />
            </button>

            <div
              className="sf-ai-guided-step-one-brand"
              aria-label="SpeakFlow AI Voice Practice"
            >
              <span aria-hidden="true" className="sf-ai-guided-step-one-logo">
                <SpeakFlowBrandMark className="sf-ai-guided-step-one-logo-mark" />
              </span>
              <span className="sf-ai-guided-step-one-brand-copy">
                <span className="sf-ai-guided-step-one-brand-title">
                  SpeakFlow
                </span>
                <span className="sf-ai-guided-step-one-brand-subtitle">
                  AI VOICE PRACTICE
                </span>
              </span>
            </div>

            <span aria-hidden="true" />
          </header>

          <section className="sf-ai-guided-step-one-hero">
            <span
              aria-hidden="true"
              className="sf-ai-guided-step-one-diamond sf-ai-guided-step-one-diamond-left"
            />
            <span
              aria-hidden="true"
              className="sf-ai-guided-step-one-diamond sf-ai-guided-step-one-diamond-top"
            />
            <span aria-hidden="true" className="sf-ai-guided-rocket">
              <RocketGlyph />
            </span>
            <span aria-hidden="true" className="sf-ai-guided-rocket-trail" />

            <h1>
              先说中文，
              <span>再大胆说英语</span>
            </h1>
            <p>AI 会一步步帮你说得更自然、更地道。</p>
          </section>

          <section className="sf-ai-guided-stats" aria-label="学习进度">
            <div className="sf-ai-guided-stat sf-ai-guided-stat-left">
              <span aria-hidden="true" className="sf-ai-guided-stat-icon">
                <FlameGlyph />
              </span>
              <span>
                <span>连续练习</span>
                <strong>{progress.streakDays} 天</strong>
              </span>
            </div>

            <div
              className="sf-ai-guided-progress"
              aria-label={`今日练习 ${todayCompleted}/${dailyGoal}`}
              style={ringStyle}
            >
              <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
                <circle cx="60" cy="60" r="48" />
                <circle cx="60" cy="60" r="48" />
              </svg>
              <strong>
                {todayCompleted}<span>/{dailyGoal}</span>
              </strong>
              <small>今日练习</small>
            </div>

            <div className="sf-ai-guided-stat sf-ai-guided-stat-right">
              <span aria-hidden="true" className="sf-ai-guided-stat-icon">
                <ShieldGlyph />
              </span>
              <span>
                <span>表达提升</span>
                <strong>Lv.{progress.level}</strong>
              </span>
            </div>
          </section>

          <section
            className="sf-ai-guided-free-card"
            aria-label={`${trialLabel} ${trialCount}`}
          >
            <div className="sf-ai-guided-free-card-top">
              <strong>{trialLabel}</strong>
              <span>{trialCount}</span>
            </div>
            <div className="sf-ai-guided-free-bars" aria-hidden="true">
              {Array.from({ length: FREE_PRACTICE_DAILY_LIMIT }).map((_, index) => (
                <span
                  key={index}
                  className={index < freeUsed ? "is-used" : undefined}
                />
              ))}
            </div>
          </section>

          <section className="sf-ai-guided-flow-section" aria-label="学习流程">
            <h2>
              <span aria-hidden="true" />
              <strong>学习流程</strong>
              <span aria-hidden="true" />
            </h2>

            <div className="sf-ai-guided-flow-list">
              {learningFlow.map((item) => (
                <div className="sf-ai-guided-flow-item" key={item.title}>
                  <span
                    aria-hidden="true"
                    className={`sf-ai-guided-flow-icon is-${item.tone}`}
                  >
                    <FlowIcon icon={item.icon} />
                  </span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="sf-ai-guided-method-card" aria-label="SpeakFlow 学习方式">
            <span aria-hidden="true" className="sf-ai-guided-method-ribbon">
              <BookmarkGlyph />
            </span>
            <span
              aria-hidden="true"
              className="sf-ai-guided-method-sparkle sf-ai-guided-method-sparkle-one"
            />
            <span
              aria-hidden="true"
              className="sf-ai-guided-method-sparkle sf-ai-guided-method-sparkle-two"
            />

            <div className="sf-ai-guided-method-content">
              <h2>SpeakFlow 学习方式</h2>
              <div className="sf-ai-guided-method-rows">
                {learningWays.map(([number, title, detail]) => (
                  <div className="sf-ai-guided-method-row" key={number}>
                    <span>{number}</span>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </div>
                ))}
              </div>
            </div>

            <span aria-hidden="true" className="sf-ai-guided-method-chat">
              <ChatGlyph />
            </span>
          </section>

          <button
            type="button"
            aria-label="进入AI引导表达学习第二页"
            onClick={openStepTwo}
            className="sf-ai-guided-start-button"
          >
            <MicGlyph />
            <span>开始练习</span>
          </button>
        </div>
      </section>
    </main>
  );
}
