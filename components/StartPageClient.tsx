"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./StartPageClient.module.css";

type AiProgressSummary = {
  challengeCompleted: number;
  challengeGoal: number;
  dailyGoal: number;
  level: number;
  streakDays: number;
  todayCompleted: number;
  totalCompleted: number;
};

type ContinueStudySummary = {
  categoryLabel: string;
  completed: number;
  href: string;
  statusLabel: string;
  title: string;
  total: number;
};

type StartPageClientProps = {
  aiProgress: AiProgressSummary;
  fallbackContinueStudy: ContinueStudySummary;
  userEmail: string;
  userImage: string;
  userName: string;
};

type StoredLesson = {
  id?: unknown;
  title?: unknown;
  txt_content?: unknown;
};

type StoredLastStudy = {
  courseId?: unknown;
  sentenceIndex?: unknown;
};

type PracticeCardTone = "violet" | "cyan" | "pink";
type PracticeCardIcon = "mic" | "bank" | "star";

const LAST_STUDY_PROGRESS_KEY = "lastStudyProgress";
const LESSONS_STORAGE_KEY = "english-app-lessons";
const ACCOUNT_AVATAR_STORAGE_PREFIX = "speakflow-account-avatar";

const proBenefits = [
  {
    description: "不限制练习次数",
    title: "无限练习",
  },
  {
    description: "随心收藏表达",
    title: "无限收藏",
  },
  {
    description: "所有课程任你学",
    title: "全部课程开放",
  },
];

const subscriberPracticeCards: Array<{
  href: string;
  icon: PracticeCardIcon;
  subtitle: string;
  title: string;
  tone: PracticeCardTone;
}> = [
  {
    href: "/free-study/step-1",
    icon: "mic",
    subtitle: "想说什么就说什么，完全自由练习",
    title: "自由学习",
    tone: "violet",
  },
  {
    href: "/classic-scenes",
    icon: "bank",
    subtitle: "餐厅、银行、机场、工作等场景练习",
    title: "经典场景",
    tone: "cyan",
  },
  {
    href: "/new-expressions",
    icon: "star",
    subtitle: "学习和巩固你学到的地道表达",
    title: "新表达",
    tone: "pink",
  },
];

const starterPracticeCards: Array<{
  href: string;
  icon: PracticeCardIcon;
  subtitle: string;
  title: string;
  tone: PracticeCardTone;
}> = [
  {
    href: "/free-study/step-1",
    icon: "mic",
    subtitle: "想说什么就说什么，完全自由练习",
    title: "自由练习",
    tone: "violet",
  },
  {
    href: "/classic-scenes",
    icon: "bank",
    subtitle: "旅行、职场、购物等场景口语练习",
    title: "经典场景",
    tone: "cyan",
  },
  {
    href: "/new-expressions",
    icon: "star",
    subtitle: "学习和收藏地道表达，丰富你的口语",
    title: "新表达",
    tone: "pink",
  },
];

function clampCount(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.floor(value), 0), Math.max(max, 0));
}

function getPercent(completed: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.round((clampCount(completed, total) / total) * 100));
}

function displayName(userName: string, userEmail: string) {
  const cleaned = userName.trim();
  const email = userEmail.trim();
  if (cleaned && cleaned.toLowerCase() !== email.toLowerCase()) return cleaned;

  const localPart = email.split("@")[0]?.trim();
  return localPart || "SpeakFlow 用户";
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "S";
}

function getAccountAvatarStorageKey(identifier: string) {
  return `${ACCOUNT_AVATAR_STORAGE_PREFIX}:${identifier || "local-user"}`;
}

function parseStoredLessons() {
  try {
    const raw = window.localStorage.getItem(LESSONS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { lessons?: StoredLesson[] }) : {};
    return Array.isArray(parsed.lessons) ? parsed.lessons : [];
  } catch {
    return [];
  }
}

function countTrainingItems(content: string, fallbackTotal: number) {
  const trimmed = content.trim();
  if (!trimmed) return fallbackTotal;

  try {
    const parsed = JSON.parse(trimmed) as { items?: unknown };
    if (Array.isArray(parsed.items)) {
      return Math.max(parsed.items.length, fallbackTotal);
    }
  } catch {
    // Plain text lessons are counted below without importing the full parser.
  }

  const nonEmptyLines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return Math.max(Math.ceil(nonEmptyLines.length / 2), fallbackTotal);
}

function createContinueStudyFromStorage(
  fallback: ContinueStudySummary
): ContinueStudySummary {
  try {
    const raw = window.localStorage.getItem(LAST_STUDY_PROGRESS_KEY);
    const saved = raw ? (JSON.parse(raw) as StoredLastStudy) : null;
    const courseId =
      typeof saved?.courseId === "string" ? saved.courseId.trim() : "";

    if (!courseId) return fallback;

    const sentenceIndex =
      typeof saved?.sentenceIndex === "number" &&
      Number.isFinite(saved.sentenceIndex)
        ? Math.max(0, Math.floor(saved.sentenceIndex))
        : 0;
    const storedLesson = parseStoredLessons().find(
      (lesson) => lesson.id === courseId
    );

    if (storedLesson) {
      const title =
        typeof storedLesson.title === "string" && storedLesson.title.trim()
          ? storedLesson.title.trim()
          : "未命名课程";
      const content =
        typeof storedLesson.txt_content === "string"
          ? storedLesson.txt_content
          : "";
      const total = countTrainingItems(content, Math.max(sentenceIndex + 1, 1));

      return {
        categoryLabel: "自建课程",
        completed: clampCount(sentenceIndex + 1, total),
        href: `/study/${courseId}`,
        statusLabel: "进行中",
        title,
        total,
      };
    }

    const completed = Math.max(sentenceIndex + 1, 1);
    const total = Math.max(completed, fallback.total || completed);

    return {
      categoryLabel: fallback.categoryLabel,
      completed: clampCount(completed, total),
      href: `/study/${encodeURIComponent(courseId)}`,
      statusLabel: "进行中",
      title: fallback.title,
      total,
    };
  } catch {
    return fallback;
  }
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
      <path d="M8 10h16M8 16h16M8 22h16" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <path d="M8 36h32l3-22-11 8-8-13-8 13-11-8 3 22Z" />
      <path d="M10 40h28" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m6 12 4 4 8-9" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <path d="M24 4c2.8 10.2 5.8 13.2 16 16-10.2 2.8-13.2 5.8-16 16-2.8-10.2-5.8-13.2-16-16 10.2-2.8 13.2-5.8 16-16Z" />
      <path d="M39 30c1.4 5 2.8 6.4 8 8-5.2 1.6-6.6 3-8 8-1.6-5-3-6.4-8-8 5-1.6 6.4-3 8-8Z" />
    </svg>
  );
}

function PracticeIcon({ type }: { type: PracticeCardIcon }) {
  if (type === "bank") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
        <path d="M7 19h34L24 9 7 19Z" />
        <path d="M11 39h26M8 43h32M14 19v17M21 19v17M28 19v17M35 19v17" />
      </svg>
    );
  }

  if (type === "star") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
        <path d="m24 8 4.7 9.5 10.5 1.5-7.6 7.4 1.8 10.5L24 32l-9.4 4.9 1.8-10.5L8.8 19l10.5-1.5L24 8Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <rect x="18" y="7" width="12" height="22" rx="6" />
      <path d="M12 23c0 7 5 12 12 12s12-5 12-12M24 35v7M17 42h14" />
    </svg>
  );
}

function SubscriberStarBuddy() {
  return (
    <svg
      aria-hidden="true"
      className={styles.subscriberStarBuddy}
      focusable="false"
      viewBox="0 0 180 180"
    >
      <defs>
        <linearGradient id="subscriber-star-gradient" x1="28" x2="152" y1="20" y2="152">
          <stop stopColor="#9f82ff" />
          <stop offset="1" stopColor="#6a5bff" />
        </linearGradient>
      </defs>
      <path
        d="m90 16 22.4 47 51.8 7.5-37.5 36.6 8.9 51.6L90 134.5l-45.6 24.2 8.9-51.6L15.8 70.5 67.6 63 90 16Z"
        fill="url(#subscriber-star-gradient)"
      />
      <circle cx="70" cy="78" r="6" fill="#fff" />
      <circle cx="104" cy="78" r="6" fill="#fff" />
      <path
        d="M72 101c5.4 5.6 14.6 8.5 23 6.5 4-.9 7.8-3 10.5-6.5"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="5.2"
      />
      <path
        d="M31 122h.1M145 58h.1M151 98h.1M48 50h.1"
        fill="none"
        stroke="#c4bcff"
        strokeLinecap="round"
        strokeWidth="10"
      />
    </svg>
  );
}

function CoffeeScene() {
  return (
    <svg
      aria-hidden="true"
      className={styles.coffeeScene}
      focusable="false"
      viewBox="0 0 120 88"
    >
      <defs>
        <linearGradient id="start-coffee-bg" x1="8" x2="112" y1="2" y2="86">
          <stop stopColor="#f2efe8" />
          <stop offset=".5" stopColor="#d5e0e7" />
          <stop offset="1" stopColor="#bb8e62" />
        </linearGradient>
      </defs>
      <rect width="120" height="88" rx="16" fill="url(#start-coffee-bg)" />
      <rect y="58" width="120" height="30" fill="#a36d42" opacity=".35" />
      <ellipse cx="60" cy="62" rx="39" ry="9" fill="#6f4d32" opacity=".26" />
      <path d="M36 31h42v17c0 13-9.5 21-21 21S36 61 36 48V31Z" fill="#fff" />
      <path
        d="M78 38h7c6 0 10 4.5 10 10s-4 10-10 10h-7"
        fill="none"
        stroke="#fff"
        strokeWidth="7"
      />
      <ellipse cx="57" cy="31" rx="22" ry="7" fill="#8d552f" />
      <ellipse cx="57" cy="29" rx="20" ry="5" fill="#c68748" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <rect x="10" y="12" width="28" height="28" rx="6" />
      <path d="M16 8v8M32 8v8M10 20h28M17 28h4M27 28h4M17 34h4" />
    </svg>
  );
}

function StarterBenefitIcon({ type }: { type: "bolt" | "shield" }) {
  if (type === "shield") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M12 3 19 6v5.4c0 4.1-2.7 7.8-7 9.6-4.3-1.8-7-5.5-7-9.6V6l7-3Z" />
        <path d="m9.5 12 1.7 1.7 3.5-4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" />
    </svg>
  );
}

function StarterStarIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.2L12 17.4 6.4 20.3l1.1-6.2L2.9 9.6l6.3-.9L12 3Z" />
    </svg>
  );
}

function StarterRobot() {
  return (
    <Image
      alt=""
      className={styles.starterRobot}
      draggable={false}
      height={330}
      priority
      sizes="170px"
      src="/images/starter-robot-standard.png"
      width={328}
    />
  );
}

function SubscriberRobot() {
  return (
    <Image
      alt=""
      className={styles.subscriberRobotImage}
      draggable={false}
      height={330}
      sizes="178px"
      src="/images/starter-robot-standard.png"
      width={328}
    />
  );
}

export default function StartPageClient({
  aiProgress,
  fallbackContinueStudy,
  userEmail,
  userImage,
  userName,
}: StartPageClientProps) {
  const name = displayName(userName, userEmail);
  const isSignedIn = Boolean(userEmail.trim() || userName.trim());
  const [continueStudy, setContinueStudy] = useState(fallbackContinueStudy);
  const [accountAvatar, setAccountAvatar] = useState({
    failed: false,
    src: userImage,
  });
  const challengeGoal = Math.max(aiProgress.challengeGoal, 1);
  const challengeCompleted = clampCount(
    aiProgress.challengeCompleted,
    challengeGoal
  );
  const continuePercent = getPercent(continueStudy.completed, continueStudy.total);

  useEffect(() => {
    setContinueStudy(createContinueStudyFromStorage(fallbackContinueStudy));
  }, [fallbackContinueStudy]);

  useEffect(() => {
    const identifier = userEmail || userName || "local-user";
    const timer = window.setTimeout(() => {
      try {
        const savedAvatar = window.localStorage.getItem(
          getAccountAvatarStorageKey(identifier)
        );
        setAccountAvatar({ failed: false, src: savedAvatar || userImage });
      } catch {
        setAccountAvatar({ failed: false, src: userImage });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [userEmail, userImage, userName]);

  const continueProgressStyle = useMemo(
    () => ({ "--progress-percent": `${continuePercent}%` }) as CSSProperties,
    [continuePercent]
  );
  const menuHref = "/menu";
  const menuLabel = isSignedIn ? "打开学习菜单" : "打开游客菜单";
  const showStarterHome = !isSignedIn;

  if (showStarterHome) {
    return (
      <main className={styles.starterPage}>
        <section
          className={styles.starterPhone}
          aria-label="游客的 SpeakFlow 学习首页"
        >
          <header className={styles.starterTopBar}>
            <Link
              href={menuHref}
              className={styles.starterMenuButton}
              aria-label={menuLabel}
            >
              <MenuIcon />
            </Link>
            <Link href="/start" className={styles.starterBrand} aria-label="SpeakFlow 首页">
              <span className={styles.starterBrandIcon}>
                <Image
                  alt=""
                  height={64}
                  priority
                  sizes="54px"
                  src="/brand/speakflow-app-icon.png"
                  width={64}
                />
              </span>
              <span className={styles.starterBrandCopy}>
                <strong>SpeakFlow</strong>
                <small>AI 英语口语练习伙伴</small>
              </span>
            </Link>
            <span className={styles.starterTopSpacer} aria-hidden="true" />
          </header>

          <section className={styles.starterHero} aria-labelledby="starter-title">
            <div className={styles.starterHeroCopy}>
              <h1 id="starter-title">
                你好，
                <br />
                先体验一下 <span>SpeakFlow。</span>
                <span aria-hidden="true">👋</span>
              </h1>
              <div className={styles.starterBenefitRow} aria-label="体验说明">
                <span>
                  <StarterBenefitIcon type="bolt" />
                  30 秒开始开口说英语
                </span>
                <i aria-hidden="true" />
                <span>
                  <StarterBenefitIcon type="shield" />
                  无需注册即可体验
                </span>
              </div>
            </div>
            <StarterRobot />
          </section>

          <section
            className={styles.starterRecommended}
            aria-labelledby="starter-recommended-title"
          >
            <div className={styles.starterRibbon}>
              <StarterStarIcon />
              推荐体验
            </div>
            <div className={styles.starterRecommendedBody}>
              <div className={styles.starterRecommendedCopy}>
                <h2 id="starter-recommended-title">
                  从 <span>AI 引导表达</span> 开始
                </h2>
                <p>AI 会一步一步引导你表达想法，轻松开口，自信说英语。</p>
              </div>
              <div className={styles.starterBubbleArt} aria-hidden="true">
                <Image
                  alt=""
                  className={styles.starterBubbleImage}
                  draggable={false}
                  height={260}
                  sizes="150px"
                  src="/images/starter-bubbles-standard.png"
                  width={300}
                />
              </div>
              <Link
                className={styles.starterPrimaryCta}
                href="/ai-guided-expression/step-1"
              >
                <span className={styles.starterCtaIcon}>
                  <PracticeIcon type="mic" />
                </span>
                开始 AI 引导表达
                <span className={styles.starterCtaChevron}>
                  <ChevronIcon />
                </span>
              </Link>
            </div>
          </section>

          <section className={styles.starterMore} aria-labelledby="starter-more-title">
            <div className={styles.starterSectionHeading}>
              <h2 id="starter-more-title">更多练习方式</h2>
              <span>选择适合你的方式</span>
            </div>
            <div className={styles.starterPracticeStack}>
              {starterPracticeCards.map((card) => (
                <Link
                  key={card.href}
                  className={styles.starterPracticeCard}
                  data-tone={card.tone}
                  href={card.href}
                >
                  <span className={styles.starterPracticeIcon}>
                    <PracticeIcon type={card.icon} />
                  </span>
                  <span className={styles.starterPracticeCopy}>
                    <strong>{card.title}</strong>
                    <small>{card.subtitle}</small>
                  </span>
                  <span className={styles.starterPracticeChevron}>
                    <ChevronIcon />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <footer className={styles.starterTrust}>
            <StarterBenefitIcon type="shield" />
            完全免费体验 · 无需注册 · 随时开始
          </footer>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.phone} aria-label="订阅者 SpeakFlow 学习首页">
        <header className={styles.topBar}>
          <Link href={menuHref} className={styles.menuButton} aria-label={menuLabel}>
            <MenuIcon />
          </Link>
          <Link href="/start" className={styles.brand} aria-label="SpeakFlow 首页">
            <span className={styles.brandIcon}>
              <Image
                alt=""
                height={64}
                priority
                sizes="48px"
                src="/brand/speakflow-app-icon.png"
                width={64}
              />
            </span>
            <span className={styles.brandCopy}>
              <strong>SpeakFlow</strong>
              <small>AI VOICE PRACTICE</small>
            </span>
          </Link>
          <Link
            href="/account"
            className={styles.subscriberAvatarButton}
            aria-label="打开账户界面"
          >
            <span className={styles.subscriberAvatar}>
              {accountAvatar.src && !accountAvatar.failed ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={accountAvatar.src}
                    alt=""
                    draggable={false}
                    onError={() =>
                      setAccountAvatar((current) => ({ ...current, failed: true }))
                    }
                  />
                </>
              ) : (
                <span>{getInitial(name)}</span>
              )}
            </span>
            <span className={styles.subscriberProBadge}>PRO</span>
          </Link>
        </header>

        <section className={styles.proStatusCard} aria-label="SpeakFlow Pro 状态">
          <div className={styles.proStatusHeader}>
            <span className={styles.proCrown}>
              <CrownIcon />
            </span>
            <h1>
              <CheckIcon />
              SpeakFlow Pro 已激活
            </h1>
            <span className={styles.proSparkle}>
              <SparkleIcon />
            </span>
          </div>
          <div className={styles.proBenefitGrid}>
            {proBenefits.map((benefit) => (
              <div className={styles.proBenefit} key={benefit.title}>
                <strong>
                  <span aria-hidden="true">∞</span>
                  {benefit.title}
                </strong>
                <small>{benefit.description}</small>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.subscriberWelcome} aria-labelledby="subscriber-title">
          <div className={styles.subscriberWelcomeCopy}>
            <p>
              太好了！<span aria-hidden="true">🎉</span>
            </p>
            <h2 id="subscriber-title">欢迎回来 {name}</h2>
            <small>今天也一起大胆开口说英语吧！</small>
          </div>
          <SubscriberStarBuddy />
        </section>

        <section
          className={styles.subscriberRecommended}
          aria-labelledby="subscriber-recommended-title"
        >
          <div className={styles.subscriberRibbon}>
            <StarterStarIcon />
            推荐开始
          </div>
          <div className={styles.subscriberRecommendedBody}>
            <div className={styles.subscriberRecommendedCopy}>
              <h2 id="subscriber-recommended-title">AI 引导表达</h2>
              <span className={styles.subscriberTitleUnderline} aria-hidden="true" />
              <p>
                不知道说什么？
                <br />
                AI 带你聊，轻松开口说英语。
              </p>
            </div>
            <div className={styles.subscriberRobotArt} aria-hidden="true">
              <span className={styles.subscriberSpeechBubble}>
                <i />
                <i />
                <i />
              </span>
              <SubscriberRobot />
            </div>
            <Link
              className={styles.subscriberPrimaryCta}
              href="/ai-guided-expression/step-1"
            >
              <span className={styles.subscriberCtaIcon}>
                <PracticeIcon type="mic" />
              </span>
              开始练习
              <span className={styles.subscriberCtaChevron}>
                <ChevronIcon />
              </span>
            </Link>
          </div>
        </section>

        <section className={styles.subscriberOther} aria-labelledby="other-title">
          <div className={styles.sectionHeading}>
            <h2 id="other-title">选择其他学习方式</h2>
          </div>

          <div className={styles.practiceStack}>
            {subscriberPracticeCards.map((card) => (
              <Link
                key={card.href}
                className={styles.practiceCard}
                data-tone={card.tone}
                href={card.href}
              >
                <span className={styles.practiceIcon}>
                  <PracticeIcon type={card.icon} />
                </span>
                <span className={styles.practiceCopy}>
                  <strong>{card.title}</strong>
                  <small>{card.subtitle}</small>
                </span>
                <span className={styles.practiceChevron}>
                  <ChevronIcon />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.resumeSection} aria-labelledby="resume-title">
          <div className={styles.sectionHeading}>
            <h2 id="resume-title">继续上次学习</h2>
          </div>

          <Link className={styles.resumeCard} href={continueStudy.href}>
            <span className={styles.resumeVisual}>
              <CoffeeScene />
            </span>
            <span className={styles.resumeContent}>
              <strong>{continueStudy.title}</strong>
              <span className={styles.resumeMeta}>
                <span>{continueStudy.categoryLabel}</span>
                <small>{continueStudy.statusLabel}</small>
              </span>
              <span
                aria-label={`学习进度 ${continueStudy.completed} / ${continueStudy.total} 句`}
                className={styles.resumeProgressRow}
              >
                <span className={styles.progressTrack} style={continueProgressStyle}>
                  <span />
                </span>
                <small>
                  {continueStudy.completed} / {continueStudy.total} 句
                </small>
              </span>
            </span>
            <span className={styles.resumeButton}>继续练习</span>
          </Link>
        </section>

        <Link className={styles.challengeCard} href="/ai-guided-expression/step-1">
          <span className={styles.challengeIcon}>
            <CalendarIcon />
          </span>
          <span className={styles.challengeCopy}>
            <strong>每日挑战</strong>
            <small>完成 {challengeGoal} 句表达练习，解锁专属勋章！</small>
          </span>
          <span className={styles.challengeCount}>
            {challengeCompleted}/{challengeGoal}
          </span>
          <span className={styles.challengeChevron}>
            <ChevronIcon />
          </span>
        </Link>
      </section>
    </main>
  );
}
