"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import styles from "./ClassicScenesMenuPage.module.css";

type SceneCardIcon =
  | "bank"
  | "bag"
  | "utensils"
  | "car"
  | "home"
  | "shield"
  | "wrench"
  | "graduation"
  | "ai"
  | "chat";

type SceneCard = {
  accent: string;
  badge?: string;
  description: string;
  href?: string;
  icon: SceneCardIcon;
  iconBackground: string;
  id: string;
  meta: string;
  title: string;
};

const sceneCards: SceneCard[] = [
  {
    accent: "#2f6a39",
    description: "银行、支付、税务、\n签证等场景",
    href: "/classic-scenes/finance-government",
    icon: "bank",
    iconBackground: "#edf4e8",
    id: "finance-government",
    meta: "70 个课程",
    title: "金融与行政事务",
  },
  {
    accent: "#d86835",
    description: "购物、退换、支付、\n讨价还价",
    href: "/classic-scenes/shopping-consumption",
    icon: "bag",
    iconBackground: "#fff1e8",
    id: "shopping-consumption",
    meta: "课程整理中",
    title: "购物与消费",
  },
  {
    accent: "#d45d35",
    description: "点餐、外卖、咖啡、\n餐厅沟通",
    href: "/classic-scenes/restaurant-takeout",
    icon: "utensils",
    iconBackground: "#fff0eb",
    id: "restaurant-takeout",
    meta: "课程整理中",
    title: "餐饮与外卖",
  },
  {
    accent: "#3d8990",
    description: "机场、地铁、打车、\n问路",
    href: "/classic-scenes/transportation-travel",
    icon: "car",
    iconBackground: "#ecf6f4",
    id: "transportation-travel",
    meta: "课程整理中",
    title: "交通与出行",
  },
  {
    accent: "#7d965d",
    description: "酒店入住、租房、\n家居生活",
    href: "/classic-scenes/housing-home",
    icon: "home",
    iconBackground: "#f3f5e9",
    id: "housing-home",
    meta: "课程整理中",
    title: "住宿与家居",
  },
  {
    accent: "#4f9567",
    description: "看病、买药、体检、\n健康咨询",
    href: "/classic-scenes/health-medical",
    icon: "shield",
    iconBackground: "#edf6ec",
    id: "health-medical",
    meta: "课程整理中",
    title: "健康与医疗",
  },
  {
    accent: "#df8b22",
    description: "快递、售后、维修、\n美容美发",
    href: "/classic-scenes/service-repair",
    icon: "wrench",
    iconBackground: "#fff6dd",
    id: "service-repair",
    meta: "课程整理中",
    title: "服务与维修",
  },
  {
    accent: "#766c83",
    description: "工作沟通、面试、社交、\n学校生活",
    href: "/classic-scenes/education-work-social",
    icon: "graduation",
    iconBackground: "#f3eef1",
    id: "education-work-social",
    meta: "课程整理中",
    title: "教育、工作与社交生活",
  },
];

type ClassicProgressSnapshot = {
  challenge?: {
    completed?: number;
    goal?: number;
    percent?: number;
  };
  dailyGoal?: number;
  streakDays?: number;
  todayCompleted?: number;
  totalCompleted?: number;
};

type ClassicProgressApiPayload = ClassicProgressSnapshot & {
  data?: ClassicProgressSnapshot;
  progress?: ClassicProgressSnapshot;
  snapshot?: ClassicProgressSnapshot;
};

function normalizeProgressPayload(
  payload: ClassicProgressApiPayload,
): ClassicProgressSnapshot {
  return payload.progress ?? payload.snapshot ?? payload.data ?? payload;
}

function ArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function ClassicHomeIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <path d="M4.8 13.4 14 5.8l9.2 7.6v9.4a1.8 1.8 0 0 1-1.8 1.8h-4.8v-6.7h-5.2v6.7H6.6a1.8 1.8 0 0 1-1.8-1.8v-9.4Z" />
    </svg>
  );
}

function ClassicProgressIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <circle cx="14" cy="14" r="10.8" />
      <path d="m12.1 9.9 6.3 4.1-6.3 4.1V9.9Z" />
    </svg>
  );
}

function ClassicHelpIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <circle cx="14" cy="14" r="10.7" />
      <path d="M10.9 11a3.2 3.2 0 0 1 3.2-2.4c2 0 3.6 1.2 3.6 3.1 0 1.4-.8 2.2-2.3 3.1-1 .6-1.4 1.1-1.4 2.3" />
      <path d="M14 20.6h.1" />
    </svg>
  );
}

function ClassicAccountIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <circle cx="14" cy="9.6" r="4.1" />
      <path d="M5.8 24.2c.9-4.4 4-6.8 8.2-6.8s7.3 2.4 8.2 6.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="6.5" y="10.5" width="11" height="9" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14v2.5" />
    </svg>
  );
}

function CardIcon({ icon }: { icon: SceneCardIcon }) {
  if (icon === "ai") {
    return <span className={styles.aiLetters}>AI</span>;
  }

  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      {icon === "bank" && (
        <>
          <path d="M6.5 17.2 20 8.5l13.5 8.7H6.5Z" />
          <path d="M10.5 18.8v12M16.8 18.8v12M23.2 18.8v12M29.5 18.8v12M7.5 32.8h25" />
        </>
      )}
      {icon === "bag" && (
        <>
          <path d="M10.5 16h19l-1.3 17H11.8L10.5 16Z" />
          <path d="M15.2 16a4.8 4.8 0 0 1 9.6 0" />
          <path d="M16 22h.1M24 22h.1" />
        </>
      )}
      {icon === "utensils" && (
        <>
          <path d="M11 7.5v11M7.8 7.5v8.4a3.2 3.2 0 1 0 6.4 0V7.5" />
          <path d="M23.2 7.5v25" />
          <path d="M30.2 8.2c-4.1 2.8-6.8 7.6-6.8 14.4h6.8" />
        </>
      )}
      {icon === "car" && (
        <>
          <path d="m8.5 22 3-8.2h17l3 8.2" />
          <path d="M7.2 22h25.6v8.5H7.2V22Z" />
          <path d="M12.2 30.5v2M27.8 30.5v2" />
          <circle cx="13.2" cy="26.2" r="1.8" />
          <circle cx="26.8" cy="26.2" r="1.8" />
        </>
      )}
      {icon === "home" && (
        <>
          <path d="M6.5 20 20 8.8 33.5 20" />
          <path d="M10.2 18.8v14h19.6v-14" />
          <path d="M16.5 32.8v-9h7v9" />
        </>
      )}
      {icon === "shield" && (
        <>
          <path d="M20 6.5 32 11v8.5c0 7-4.9 11.8-12 14-7.1-2.2-12-7-12-14V11l12-4.5Z" />
          <path d="M20 13.8v12.4M13.8 20h12.4" />
        </>
      )}
      {icon === "wrench" && (
        <path d="M27 7.5a8.5 8.5 0 0 0-10.2 10.7L8.6 26.4a3.6 3.6 0 1 0 5 5l8.2-8.2A8.5 8.5 0 0 0 32.5 13l-6.1 6.1-5.5-5.5L27 7.5Z" />
      )}
      {icon === "graduation" && (
        <>
          <path d="m5.8 15 14.2-7 14.2 7L20 22 5.8 15Z" />
          <path d="M11.2 18.2v7.5c5.4 3.6 12.2 3.6 17.6 0v-7.5" />
          <path d="M33 16.2v10" />
        </>
      )}
      {icon === "chat" && (
        <>
          <path d="M8 11h24v16H16.5L8 33V11Z" />
          <circle cx="16" cy="19" r="1.5" />
          <circle cx="20" cy="19" r="1.5" />
          <circle cx="24" cy="19" r="1.5" />
        </>
      )}
    </svg>
  );
}

function HeroVisual() {
  return (
    <div className={styles.heroVisual} aria-hidden="true">
      <span className={styles.heroGlow} />
      <span className={`${styles.spark} ${styles.sparkGold}`} />
      <span className={`${styles.spark} ${styles.sparkWhite}`} />
      <span className={styles.backCard}>
        <span />
        <span />
      </span>
      <span className={styles.frontCard}>
        <span className={styles.bubble}>
          <i />
          <i />
          <i />
        </span>
      </span>
      <span className={styles.leaf}>
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

export default function ClassicScenesMenuPage({
  isGuest = false,
}: {
  isGuest?: boolean;
}) {
  const router = useRouter();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProgressLoading, setIsProgressLoading] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [progressSnapshot, setProgressSnapshot] =
    useState<ClassicProgressSnapshot | null>(null);

  const openHome = () => router.push("/start");
  const openUpperMenu = () => router.push("/start");
  const openAccount = () => router.push("/account");
  const openCard = (card: SceneCard) => {
    if (card.href) {
      router.push(card.href);
    }
  };
  const closeModals = () => {
    setIsHelpOpen(false);
    setIsProgressOpen(false);
  };

  useEffect(() => {
    if (!isHelpOpen && !isProgressOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModals();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHelpOpen, isProgressOpen]);

  useEffect(() => {
    if (!isProgressOpen) return;

    const controller = new AbortController();

    async function loadProgress() {
      setIsProgressLoading(true);
      setProgressError("");

      try {
        const response = await fetch("/api/ai-guided-expression/progress", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load progress");
        }

        const payload = (await response.json()) as ClassicProgressApiPayload;

        if (!controller.signal.aborted) {
          setProgressSnapshot(normalizeProgressPayload(payload));
        }
      } catch {
        if (!controller.signal.aborted) {
          setProgressError("暂时无法读取后台学习进度，请稍后再试。");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsProgressLoading(false);
        }
      }
    }

    loadProgress();

    return () => controller.abort();
  }, [isProgressOpen]);

  const todayCompleted =
    progressSnapshot?.todayCompleted ?? progressSnapshot?.challenge?.completed ?? 0;
  const dailyGoal =
    progressSnapshot?.dailyGoal ?? progressSnapshot?.challenge?.goal ?? 5;
  const challengePercent =
    progressSnapshot?.challenge?.percent ??
    Math.min(100, Math.round((todayCompleted / Math.max(dailyGoal, 1)) * 100));
  const streakDays = progressSnapshot?.streakDays ?? 0;
  const totalCompleted = progressSnapshot?.totalCompleted ?? todayCompleted;

  return (
    <main className={styles.pageShell}>
      <section className={styles.panel} aria-label="经典场景口语练习一级菜单">
        <section className={styles.hero}>
          <button
            className={styles.backLink}
            type="button"
            aria-label="返回上一级菜单"
            onClick={openUpperMenu}
          >
            <ArrowLeft />
            <span>返回上一级</span>
          </button>

          <div className={styles.heroText}>
            <h1>经典场景口语练习</h1>
            <p>覆盖日常生活场景，按分类练高频表达</p>
          </div>
          <HeroVisual />
        </section>

        <section className={styles.cardGrid} aria-label="经典场景分类">
          {sceneCards.map((card, index) => {
            const isLocked = isGuest && index > 0;
            const tileStyle = {
              "--card-accent": card.accent,
              "--icon-bg": card.iconBackground,
            } as CSSProperties;

            return (
              <button
                key={card.id}
                type="button"
                className={[
                  styles.sceneCard,
                  card.meta ? "" : styles.shortCard,
                  isLocked ? styles.lockedCard : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={tileStyle}
                onClick={() => {
                  if (!isLocked) openCard(card);
                }}
                disabled={isLocked}
                aria-label={
                  isLocked
                    ? `${card.title}，游客没有权限`
                    : card.href
                      ? `进入${card.title}`
                      : `${card.title}，课程整理中`
                }
              >
                {isLocked ? (
                  <span className={styles.lockBadge}>
                    <LockIcon />
                    游客无权限
                  </span>
                ) : null}
                {card.badge ? <span className={styles.badge}>{card.badge}</span> : null}
                <span className={styles.iconTile} aria-hidden="true">
                  <CardIcon icon={card.icon} />
                </span>
                <span className={styles.cardCopy}>
                  <strong>{card.title}</strong>
                  <span>{card.description}</span>
                </span>
                {card.meta ? <span className={styles.cardMeta}>{card.meta}</span> : null}
                <span className={styles.arrowCircle} aria-hidden="true">
                  <ArrowRight />
                </span>
              </button>
            );
          })}
        </section>

        <nav className={styles.bottomNav} aria-label="经典场景学习导航">
          <button
            className={`${styles.bottomNavButton} ${styles.bottomNavButtonActive}`}
            type="button"
            aria-label="回到学习首页"
            onClick={openHome}
          >
            <ClassicHomeIcon />
          </button>
          <button
            className={styles.bottomNavButton}
            type="button"
            aria-label="查看学习进度"
            onClick={() => setIsProgressOpen(true)}
          >
            <ClassicProgressIcon />
          </button>
          <button
            className={styles.bottomNavButton}
            type="button"
            aria-label="打开使用帮助"
            onClick={() => setIsHelpOpen(true)}
          >
            <ClassicHelpIcon />
          </button>
          <button
            className={styles.bottomNavButton}
            type="button"
            aria-label="打开账户界面"
            onClick={openAccount}
          >
            <ClassicAccountIcon />
          </button>
        </nav>
      </section>

      {isProgressOpen ? (
        <div className={styles.modalBackdrop} onClick={closeModals}>
          <section
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="classic-progress-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              type="button"
              aria-label="关闭学习进度"
              onClick={closeModals}
            >
              <CloseIcon />
            </button>
            <h2 id="classic-progress-title">学习进度</h2>
            <p>进度会读取后台学习记录，和你的学习数据保持一致。</p>
            {isProgressLoading ? (
              <div className={styles.modalStatus}>正在读取学习进度...</div>
            ) : progressError ? (
              <div className={styles.modalStatus}>{progressError}</div>
            ) : (
              <div className={styles.progressGrid}>
                <span>
                  <strong>{todayCompleted}</strong>
                  <small>今日完成</small>
                </span>
                <span>
                  <strong>{challengePercent}%</strong>
                  <small>今日目标</small>
                </span>
                <span>
                  <strong>{streakDays}</strong>
                  <small>连续天数</small>
                </span>
                <span>
                  <strong>{totalCompleted}</strong>
                  <small>累计练习</small>
                </span>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isHelpOpen ? (
        <div className={styles.modalBackdrop} onClick={closeModals}>
          <section
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="classic-help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              type="button"
              aria-label="关闭使用帮助"
              onClick={closeModals}
            >
              <CloseIcon />
            </button>
            <h2 id="classic-help-title">使用帮助</h2>
            <p>选择一个生活场景分类，进入后按主题练习高频口语表达。</p>
            <ul className={styles.helpList}>
              <li>金融与行政事务已开放课程，其余分类会继续补齐。</li>
              <li>底部首页、进度、帮助、账户入口都可以直接使用。</li>
              <li>如果是游客模式，未开放课程会保持锁定。</li>
            </ul>
          </section>
        </div>
      ) : null}
    </main>
  );
}
