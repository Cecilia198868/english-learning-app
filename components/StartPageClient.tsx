"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { parseTrainingContent } from "@/lib/training";
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

type FeaturedLessonSummary = {
  id: string;
  title: string;
  total: number;
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
  featuredLessons: FeaturedLessonSummary[];
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

type PracticeCardTone = "violet" | "blue" | "cyan" | "pink";
type PracticeCardIcon = "mic" | "chat" | "bank" | "star";

const LAST_STUDY_PROGRESS_KEY = "lastStudyProgress";
const LESSONS_STORAGE_KEY = "english-app-lessons";
const BEGINNER_BADGE_LABEL = "🌱 初学者勋章";
const ACCOUNT_AVATAR_STORAGE_PREFIX = "speakflow-account-avatar";

const practiceCards: Array<{
  href: string;
  icon: PracticeCardIcon;
  subtitle: string;
  title: string;
  tone: PracticeCardTone;
}> = [
  {
    href: "/free-study/step-1",
    icon: "mic",
    subtitle: "想到什么说什么，完全自由练习",
    title: "自由学习",
    tone: "violet",
  },
  {
    href: "/ai-guided-expression/step-1",
    icon: "chat",
    subtitle: "不知道说什么？AI 带你聊",
    title: "AI 引导表达",
    tone: "blue",
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
    subtitle: "复习和巩固你学到的地道表达",
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

function createContinueStudyFromStorage(
  featuredLessons: FeaturedLessonSummary[],
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
      const total =
        parseTrainingContent(content).length || Math.max(sentenceIndex + 1, 1);

      return {
        categoryLabel: "自建课程",
        completed: clampCount(sentenceIndex + 1, total),
        href: `/study/${courseId}`,
        statusLabel: "进行中",
        title,
        total,
      };
    }

    const featuredLesson = featuredLessons.find((lesson) => lesson.id === courseId);
    if (featuredLesson) {
      const total = featuredLesson.total || Math.max(sentenceIndex + 1, 1);

      return {
        categoryLabel: "场景练习",
        completed: clampCount(sentenceIndex + 1, total),
        href: `/study/${courseId}`,
        statusLabel: "进行中",
        title: featuredLesson.title,
        total,
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
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

function PracticeIcon({ type }: { type: PracticeCardIcon }) {
  if (type === "chat") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
        <path d="M9 22c0-8 6.8-14 16-14s16 6 16 14-6.8 14-16 14c-1.8 0-3.5-.2-5.1-.7L10 40l2.6-8A13.5 13.5 0 0 1 9 22Z" />
        <path d="M17 23h.1M24 23h.1M31 23h.1" />
        <path d="m34 8 1.7 3.5 3.8.5-2.7 2.7.6 3.8-3.4-1.8-3.4 1.8.6-3.8-2.7-2.7 3.8-.5L34 8Z" />
      </svg>
    );
  }

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

function StarBuddy() {
  return (
    <svg aria-hidden="true" className={styles.starBuddy} focusable="false" viewBox="0 0 168 168">
      <defs>
        <linearGradient id="start-star-gradient" x1="30" x2="132" y1="24" y2="144">
          <stop stopColor="#a985ff" />
          <stop offset="1" stopColor="#5e73ff" />
        </linearGradient>
      </defs>
      <path
        d="m84 17 20.2 42.8 45.5 6.9-33 33.2 7.8 46.9L84 124.5l-40.5 22.3 7.8-46.9-33-33.2 45.5-6.9L84 17Z"
        fill="url(#start-star-gradient)"
      />
      <path d="M66 83c4 5.2 10 8 18 8s14-2.8 18-8" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="5" />
      <circle cx="68" cy="70" r="5" fill="#fff" />
      <circle cx="100" cy="70" r="5" fill="#fff" />
      <path d="M29 98h.1M139 46h.1M147 78h.1M42 42h.1" fill="none" stroke="#c7beff" strokeLinecap="round" strokeWidth="10" />
    </svg>
  );
}

function CoffeeScene() {
  return (
    <svg aria-hidden="true" className={styles.coffeeScene} focusable="false" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="start-coffee-bg" x1="10" x2="108" y1="8" y2="112">
          <stop stopColor="#f8f4ea" />
          <stop offset="1" stopColor="#dbe9f6" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill="url(#start-coffee-bg)" />
      <path d="M0 84c27-22 56-24 120-18v54H0V84Z" fill="#c99f70" opacity=".38" />
      <ellipse cx="57" cy="83" fill="#a87344" opacity=".28" rx="42" ry="11" />
      <path d="M33 47h44v19c0 14-10 23-22 23S33 80 33 66V47Z" fill="#fff" />
      <path d="M77 54h9c7 0 12 5 12 12s-5 12-12 12h-9" fill="none" stroke="#fff" strokeWidth="8" />
      <ellipse cx="55" cy="48" fill="#8c5730" rx="23" ry="8" />
      <ellipse cx="55" cy="45" fill="#c98a4a" rx="21" ry="6" />
      <path d="M45 33c-5-7 4-11-1-17M60 34c-6-7 4-12-1-18M74 35c-5-7 4-10 0-16" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="4" opacity=".82" />
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

export default function StartPageClient({
  aiProgress,
  fallbackContinueStudy,
  featuredLessons,
  userEmail,
  userImage,
  userName,
}: StartPageClientProps) {
  const name = displayName(userName, userEmail);
  const [continueStudy, setContinueStudy] = useState(fallbackContinueStudy);
  const [heroAvatar, setHeroAvatar] = useState({
    failed: false,
    src: userImage,
  });
  const challengeGoal = Math.max(aiProgress.challengeGoal, 1);
  const challengeCompleted = clampCount(
    aiProgress.challengeCompleted,
    challengeGoal
  );
  const challengeRemaining = Math.max(challengeGoal - challengeCompleted, 0);
  const challengeRewardText =
    challengeRemaining > 0
      ? `再完成 ${challengeRemaining} 句，即可解锁`
      : "已解锁";
  const continuePercent = getPercent(continueStudy.completed, continueStudy.total);

  useEffect(() => {
    setContinueStudy(
      createContinueStudyFromStorage(featuredLessons, fallbackContinueStudy)
    );
  }, [fallbackContinueStudy, featuredLessons]);

  useEffect(() => {
    const identifier = userEmail || userName || "local-user";
    const timer = window.setTimeout(() => {
      try {
        const savedAvatar = window.localStorage.getItem(
          getAccountAvatarStorageKey(identifier)
        );
        setHeroAvatar({ failed: false, src: savedAvatar || userImage });
      } catch {
        setHeroAvatar({ failed: false, src: userImage });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [userEmail, userImage, userName]);

  const continueProgressStyle = useMemo(
    () => ({ "--progress-percent": `${continuePercent}%` }) as CSSProperties,
    [continuePercent]
  );

  return (
    <main className={styles.page}>
      <section className={styles.phone} aria-label="登录后的 SpeakFlow 首页">
        <header className={styles.topBar}>
          <Link href="/account" className={styles.menuButton} aria-label="打开账户界面">
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
        </header>

        <section className={styles.hero} aria-labelledby="start-title">
          <div className={styles.heroCopy}>
            <p className={styles.heroKicker}>
              太好了！<span aria-hidden="true">🎉</span>
            </p>
            <h1 id="start-title">欢迎回来 {name}</h1>
            <p className={styles.heroSubcopy}>今天也一起大胆开口说英语吧！</p>
          </div>
          {heroAvatar.src && !heroAvatar.failed ? (
            <span className={styles.heroAvatar} aria-label="用户头像">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroAvatar.src}
                alt=""
                draggable={false}
                onError={() =>
                  setHeroAvatar((current) => ({ ...current, failed: true }))
                }
              />
            </span>
          ) : (
            <StarBuddy />
          )}
        </section>

        <section className={styles.newPractice} aria-labelledby="new-practice-title">
          <div className={styles.sectionHeading}>
            <h2 id="new-practice-title">开始新的练习</h2>
            <p>选择你想要的练习方式</p>
          </div>

          <div className={styles.practiceStack}>
            {practiceCards.map((card) => (
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
            <small>
              {challengeRewardText}{" "}
              <span className={styles.badgeReward}>{BEGINNER_BADGE_LABEL}</span>
            </small>
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
