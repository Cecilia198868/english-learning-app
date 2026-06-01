"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type {
  FinanceGovernmentLesson,
  FinanceGovernmentLessonIcon,
  FinanceGovernmentSection,
} from "@/data/financeGovernmentSections";
import styles from "./FinanceGovernmentSectionMenuPage.module.css";

const backToFinanceMenuHref = "/classic-scenes/finance-government";

function rememberLessonTitle(title: string) {
  window.localStorage.setItem("currentLessonTitle", title);
}

function BackIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M15 5 8 12l7 7" />
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

function LessonIcon({ type }: { type: FinanceGovernmentLessonIcon }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.lessonIcon}
      focusable="false"
      viewBox="0 0 48 48"
    >
      {type === "account" ? (
        <>
          <circle cx="22" cy="15" r="6" />
          <path d="M10 34c1.5-7 6.2-11 12-11 5.6 0 10.2 3.8 11.8 10.2" />
          <path d="M34 24v11M28.5 29.5h11" />
        </>
      ) : type === "atm" ? (
        <>
          <rect x="10" y="9" width="28" height="30" rx="5" />
          <path d="M15 16h18M15 25h4M22 25h4M29 25h4M15 31h4M22 31h4M29 31h4" />
          <text x="24" y="22" textAnchor="middle">
            ATM
          </text>
        </>
      ) : type === "bank" || type === "government" ? (
        <>
          <path d="M7 19 24 8l17 11H7Z" />
          <path d="M11 20.8v14M18.5 20.8v14M29.5 20.8v14M37 20.8v14M8 37h32" />
        </>
      ) : type === "book" || type === "library" ? (
        <>
          <path d="M10 12c4.6-.6 8.6.5 12 3.2v22c-3.6-2.4-7.6-3.4-12-3V12Z" />
          <path d="M38 12c-4.6-.6-8.6.5-12 3.2v22c3.6-2.4 7.6-3.4 12-3V12Z" />
        </>
      ) : type === "car" ? (
        <>
          <path d="m9 26 3.6-9.4h22.8L39 26" />
          <path d="M8 26h32v10H8V26Z" />
          <path d="M13 36v3M35 36v3" />
          <circle cx="15" cy="31" r="2" />
          <circle cx="33" cy="31" r="2" />
        </>
      ) : type === "cash" ? (
        <>
          <path d="M17 17h14l3 20H14l3-20Z" />
          <path d="M20 17c0-4 2-7 4-7s4 3 4 7" />
          <path d="M24 22v10M20.5 25.5h7M20.5 30h7" />
        </>
      ) : type === "chart" ? (
        <>
          <path d="M11 36h27" />
          <path d="M14 31 22 23l6 5 9-13" />
          <path d="M32 15h5v5" />
        </>
      ) : type === "check" ? (
        <>
          <rect x="12" y="10" width="24" height="28" rx="5" />
          <path d="M18 24.5 22 28l8-9" />
        </>
      ) : type === "clipboard" ? (
        <>
          <rect x="14" y="12" width="20" height="28" rx="4" />
          <path d="M20 12c.4-2.6 1.8-4 4-4s3.6 1.4 4 4M19 22h10M19 28h10M19 34h7" />
        </>
      ) : type === "cone" ? (
        <>
          <path d="M18.5 8h11L37 39H11l7.5-31Z" />
          <path d="M16 24h16M14.5 31h19" />
        </>
      ) : type === "exchange" ? (
        <>
          <circle cx="17" cy="18" r="7" />
          <circle cx="31" cy="30" r="7" />
          <path d="M17 14v8M14 18h6M31 26v8M28 30h6" />
          <path d="M29 12h6v6M35 12l-7 7M19 36h-6v-6M13 36l7-7" />
        </>
      ) : type === "globe" ? (
        <>
          <circle cx="24" cy="24" r="15" />
          <path d="M9 24h30M24 9c4.2 4 6 9 6 15s-1.8 11-6 15c-4.2-4-6-9-6-15s1.8-11 6-15Z" />
        </>
      ) : type === "health" ? (
        <>
          <path d="M24 8 37 13v9c0 8-5.4 14-13 18-7.6-4-13-10-13-18v-9l13-5Z" />
          <path d="M24 17v14M17 24h14" />
        </>
      ) : type === "home" ? (
        <>
          <path d="M8 23 24 10l16 13" />
          <path d="M13 22v17h22V22" />
          <path d="M21 39V28h6v11" />
        </>
      ) : type === "id" || type === "passport" ? (
        <>
          <rect x="13" y="8" width="22" height="32" rx="4" />
          <circle cx="24" cy="21" r="4" />
          <path d="M18 32c1.4-4.2 10.6-4.2 12 0M18 14h12" />
        </>
      ) : type === "lock" ? (
        <>
          <rect x="13" y="21" width="22" height="17" rx="4" />
          <path d="M18 21v-5c0-4 2.8-7 6-7s6 3 6 7v5M24 28v5" />
        </>
      ) : type === "mail" ? (
        <>
          <rect x="9" y="14" width="30" height="22" rx="4" />
          <path d="m10 16 14 11 14-11" />
        </>
      ) : type === "phone" ? (
        <>
          <rect x="15" y="7" width="18" height="34" rx="4" />
          <path d="M21 12h6M21 35h6M19 29l5-5 5 5M24 24v8" />
        </>
      ) : type === "police" || type === "shield" ? (
        <>
          <path d="M24 8 37 13v9c0 8-5.4 14-13 18-7.6-4-13-10-13-18v-9l13-5Z" />
          <path d="M18 24 22 28l8-9" />
        </>
      ) : type === "service" ? (
        <>
          <path d="M14 10h20v13c0 8-4 13-10 16-6-3-10-8-10-16V10Z" />
          <path d="M18 19h12M18 25h12" />
        </>
      ) : type === "tax" || type === "document" || type === "visa" ? (
        <>
          <path d="M14 7h15l5 5v29H14V7Z" />
          <path d="M29 7v6h5M19 21h10M19 27h10M19 33h7" />
        </>
      ) : (
        <>
          <path d="M8 24c2-8 8-13 16-13s14 5 16 13H8Z" />
          <path d="M24 24v11c0 3 1.7 5 4.5 5 2.2 0 3.5-1.3 3.5-3.2" />
        </>
      )}
    </svg>
  );
}

function LessonCard({ lesson }: { lesson: FinanceGovernmentLesson }) {
  const cardStyle = {
    "--lesson-accent": lesson.accent,
    "--lesson-tile": lesson.tile,
  } as CSSProperties;

  const cardContent = (
    <>
      <span className={styles.iconTile}>
        <LessonIcon type={lesson.icon} />
      </span>
      <span className={styles.numberBadge}>{lesson.number}</span>
      <span className={styles.lessonTitle}>{lesson.title}</span>
      <span className={styles.chevron}>
        <ChevronIcon />
      </span>
    </>
  );

  if (!lesson.href) {
    return (
      <div
        aria-disabled="true"
        className={`${styles.lessonCard} ${styles.pendingCard}`}
        style={cardStyle}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      aria-label={`进入${lesson.title}学习界面第一页`}
      className={styles.lessonCard}
      href={lesson.href}
      onClick={() => rememberLessonTitle(lesson.title)}
      style={cardStyle}
    >
      {cardContent}
    </Link>
  );
}

export default function FinanceGovernmentSectionMenuPage({
  section,
}: {
  section: FinanceGovernmentSection;
}) {
  return (
    <main className={styles.pageShell}>
      <section className={styles.phone} aria-labelledby="finance-section-title">
        <header className={styles.header}>
          <Link
            aria-label="返回金融与行政事务菜单"
            className={styles.backButton}
            href={backToFinanceMenuHref}
          >
            <BackIcon />
          </Link>
          <h1 className={styles.title} id="finance-section-title">
            {section.title}
          </h1>
        </header>

        <nav className={styles.lessonList} aria-label={`${section.title}话题`}>
          {section.lessons.map((lesson) => (
            <LessonCard key={`${lesson.number}-${lesson.title}`} lesson={lesson} />
          ))}
        </nav>
      </section>
    </main>
  );
}
