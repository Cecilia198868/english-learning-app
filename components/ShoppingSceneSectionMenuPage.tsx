import type { CSSProperties } from "react";
import Link from "next/link";
import type { ClassicSceneCategoryIcon } from "@/data/classicSceneCategoryMenus";
import styles from "./ShoppingSceneSectionMenuPage.module.css";

export type ClassicSceneSectionLesson = {
  accent: string;
  description?: string;
  icon: ClassicSceneCategoryIcon;
  id: string;
  number: number;
  tile: string;
  title: string;
};

export type ClassicSceneSectionMenu = {
  accent: string;
  id: string;
  lessons: ClassicSceneSectionLesson[];
  subtitle: string;
  title: string;
};

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

function ShoppingSceneIcon({ type }: { type: ClassicSceneCategoryIcon }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.iconSvg}
      focusable="false"
      viewBox="0 0 48 48"
    >
      {type === "airport" ? (
        <>
          <path d="M8 31h32" />
          <path d="M11 31V17l11-5 11 5v14" />
          <path d="M15 31V20h14v11" />
          <path d="M18 24h8M20 17h4" />
          <path d="M30 13 41 8l-4 9 5 5-9 1-3 10-4-9-10-4 10-3 4-4Z" />
        </>
      ) : type === "bag" ? (
        <>
          <path d="M12 17h24l-2 22H14L12 17Z" />
          <path d="M18 17a6 6 0 0 1 12 0" />
          <circle cx="20" cy="26" r="1.5" />
          <circle cx="28" cy="26" r="1.5" />
        </>
      ) : type === "bill" ? (
        <>
          <path d="M14 8h20v32l-4-3-4 3-4-3-4 3-4-3V8Z" />
          <path d="M19 18h10M19 25h10M19 32h7" />
          <circle cx="34" cy="34" r="7" />
          <path d="M34 30v8M31 34h6" />
        </>
      ) : type === "bus" ? (
        <>
          <rect x="9" y="11" width="30" height="24" rx="5" />
          <path d="M13 21h22M15 15h18" />
          <circle cx="16" cy="30" r="2.5" />
          <circle cx="32" cy="30" r="2.5" />
          <path d="M13 35v4M35 35v4" />
        </>
      ) : type === "calendar" ? (
        <>
          <rect x="10" y="12" width="28" height="27" rx="4" />
          <path d="M16 8v8M32 8v8M10 20h28M16 30h8" />
          <circle cx="32" cy="32" r="6" />
          <path d="M32 29v3.5l2.5 2" />
        </>
      ) : type === "car" ? (
        <>
          <path d="m9 27 4-11h22l4 11" />
          <path d="M8 27h32v10H8V27Z" />
          <path d="M13 37v3M35 37v3" />
          <circle cx="15" cy="32" r="2" />
          <circle cx="33" cy="32" r="2" />
        </>
      ) : type === "cart" ? (
        <>
          <path d="M9 11h5l3 20h19l3-14H16" />
          <path d="M19 37a2.5 2.5 0 1 0 0 .1M34 37a2.5 2.5 0 1 0 0 .1" />
          <path d="M22 17v8M28 17v8" />
        </>
      ) : type === "chart" ? (
        <>
          <path d="M10 38h28" />
          <path d="M14 33V22M24 33V14M34 33V9" />
          <path d="M14 22h8l-4-5 4-5h-8v10Z" />
        </>
      ) : type === "clipboard" ? (
        <>
          <rect x="14" y="12" width="20" height="28" rx="4" />
          <path d="M20 12c.4-2.6 1.8-4 4-4s3.6 1.4 4 4M19 22h10M19 28h10M19 34h7" />
          <path d="M18 26 22 30l8-9" />
        </>
      ) : type === "community" ? (
        <>
          <circle cx="16" cy="21" r="5" />
          <circle cx="32" cy="21" r="5" />
          <path d="M7 38c1.2-7 4.6-10.5 9-10.5S23.8 31 25 38" />
          <path d="M23 38c1.2-7 4.6-10.5 9-10.5S39.8 31 41 38" />
          <path d="M17 12h14" />
        </>
      ) : type === "delivery" ? (
        <>
          <rect x="12" y="16" width="17" height="16" rx="3" />
          <path d="M29 21h6l5 6v5H29" />
          <circle cx="17" cy="35" r="3" />
          <circle cx="34" cy="35" r="3" />
          <path d="M18 16v-4h6v4" />
        </>
      ) : type === "document" ? (
        <>
          <path d="M14 8h16l5 6v26H14V8Z" />
          <path d="M30 8v7h5M19 23h10M19 30h10M19 36h7" />
          <circle cx="32" cy="31" r="6" />
          <path d="M32 28v4M32 35h.1" />
        </>
      ) : type === "emergency" ? (
        <>
          <path d="M24 7 42 39H6L24 7Z" />
          <path d="M24 18v10M24 34h.1" />
          <path d="M13 39h22" />
        </>
      ) : type === "home" ? (
        <>
          <path d="M7 24 24 10l17 14" />
          <path d="M12 22v18h24V22" />
          <path d="M21 40V29h6v11" />
        </>
      ) : type === "hotel" ? (
        <>
          <path d="M10 39V12h28v27" />
          <path d="M15 39V27h18v12" />
          <path d="M16 17h4M28 17h4M16 23h4M28 23h4" />
          <path d="M20 31h8" />
        </>
      ) : type === "map" ? (
        <>
          <path d="M9 13 20 9l9 4 10-4v26l-10 4-9-4-11 4V13Z" />
          <path d="M20 9v26M29 13v26" />
          <path d="M32 20c0 4.5-6 10-6 10s-6-5.5-6-10a6 6 0 0 1 12 0Z" />
          <circle cx="26" cy="20" r="2" />
        </>
      ) : type === "food" ? (
        <>
          <path d="M14 8v14M10 8v10.5a4 4 0 0 0 8 0V8" />
          <path d="M29 8v32" />
          <path d="M37 9c-5 3.4-8.2 9.2-8.2 17.4H37" />
          <path d="M17 34h18" />
        </>
      ) : type === "health" ? (
        <>
          <path d="M24 7 39 13v10c0 9-6.1 15-15 18-8.9-3-15-9-15-18V13l15-6Z" />
          <path d="M24 16v16M16 24h16" />
        </>
      ) : type === "menu" ? (
        <>
          <path d="M13 9h22v30H13V9Z" />
          <path d="M18 17h12M18 24h12M18 31h8" />
          <path d="M11 15H8M11 24H8M11 33H8" />
        </>
      ) : type === "plane" ? (
        <>
          <path d="M8 27 40 12l-8 27-8-10-9 7 4-12L8 27Z" />
          <path d="m19 24 13-7" />
        </>
      ) : type === "medicine" ? (
        <>
          <rect x="13" y="12" width="19" height="26" rx="4" />
          <path d="M17 12V8h11v4M22.5 19v12M16.5 25h12" />
          <path d="M31 30c4-3.8 8.5-1.2 8.5 3.5 0 4-3.5 6-8.5 7-5-1-8.5-3-8.5-7 0-4.7 4.5-7.3 8.5-3.5Z" />
        </>
      ) : type === "repair" ? (
        <>
          <rect x="14" y="8" width="20" height="32" rx="4" />
          <path d="M20 14h8M20 34h8" />
          <path d="M31 29a7 7 0 0 0 8-8l-5 5-4-4 5-5a7 7 0 0 0-8 8" />
        </>
      ) : type === "return" ? (
        <>
          <path d="M12 16h22v20H12V16Z" />
          <path d="M17 16v-4h12v4" />
          <path d="M31 23h-9c-4 0-7 3-7 7" />
          <path d="m22 17-6 6 6 6" />
        </>
      ) : type === "sale" ? (
        <>
          <path d="M10 13h17l11 11-15 15L10 26V13Z" />
          <circle cx="17" cy="20" r="2" />
          <path d="M20 32 31 21M20 22h.1M31 31h.1" />
        </>
      ) : type === "service" ? (
        <>
          <rect x="11" y="13" width="26" height="22" rx="5" />
          <path d="M16 23h16M16 29h10" />
          <path d="M33 15 39 9M37 8h4v4" />
        </>
      ) : type === "shield" ? (
        <>
          <path d="M24 7 39 13v10c0 9-6.1 15-15 18-8.9-3-15-9-15-18V13l15-6Z" />
          <path d="M17 24 22 29l10-12" />
        </>
      ) : type === "store" ? (
        <>
          <path d="M10 18h28l-3-8H13l-3 8Z" />
          <path d="M12 18v21h24V18" />
          <path d="M17 39V27h14v12" />
          <path d="M15 22h18" />
          <path d="M14 18c0 3 2 5 5 5s5-2 5-5c0 3 2 5 5 5s5-2 5-5" />
        </>
      ) : type === "taxi" ? (
        <>
          <path d="m9 27 4-10h22l4 10" />
          <path d="M8 27h32v10H8V27Z" />
          <path d="M18 13h12l2 4H16l2-4Z" />
          <path d="M14 37v3M34 37v3" />
          <circle cx="15" cy="32" r="2" />
          <circle cx="33" cy="32" r="2" />
          <path d="M20 21h8" />
        </>
      ) : type === "wallet" ? (
        <>
          <path d="M10 17h27v20H10V17Z" />
          <path d="M13 17l18-6 3 6" />
          <path d="M28 25h11v8H28a4 4 0 0 1 0-8Z" />
          <circle cx="32" cy="29" r="1.5" />
        </>
      ) : type === "tools" ? (
        <>
          <path d="M31 10a7 7 0 0 0 7 7l-9 9-7-7 9-9Z" />
          <path d="M27 24 12 39l-3-3 15-15" />
          <path d="M12 10l6 6M9 13l6-6 7 7-6 6-7-7Z" />
        </>
      ) : (
        <>
          <rect x="10" y="15" width="28" height="21" rx="4" />
          <path d="M14 15v-4h20v4M15 24h18M15 30h11" />
        </>
      )}
    </svg>
  );
}

function LessonRow({ lesson }: { lesson: ClassicSceneSectionLesson }) {
  const style = {
    "--lesson-accent": lesson.accent,
    "--lesson-tile": lesson.tile,
  } as CSSProperties;

  return (
    <Link
      aria-label={`进入${lesson.title}`}
      className={styles.lessonRow}
      href={`/study/${lesson.id}`}
      style={style}
    >
      <span className={styles.iconTile}>
        <ShoppingSceneIcon type={lesson.icon} />
      </span>
      <span className={styles.numberBadge}>{lesson.number}</span>
      <span className={styles.lessonText}>
        <span className={styles.lessonTitle}>{lesson.title}</span>
        {lesson.description ? (
          <span className={styles.lessonDescription}>
            {lesson.description}
          </span>
        ) : null}
      </span>
      <span className={styles.chevron}>
        <ChevronIcon />
      </span>
    </Link>
  );
}

export default function ShoppingSceneSectionMenuPage({
  backHref = "/classic-scenes/shopping-consumption",
  backLabel = "返回上一级",
  section,
}: {
  backHref?: string;
  backLabel?: string;
  section: ClassicSceneSectionMenu;
}) {
  const pageStyle = {
    "--section-accent": section.accent,
  } as CSSProperties;

  return (
    <main className={styles.pageShell} style={pageStyle}>
      <section className={styles.phone} aria-labelledby="shopping-section-title">
        <header className={styles.header}>
          <Link
            aria-label={backLabel}
            className={styles.backButton}
            href={backHref}
          >
            <BackIcon />
          </Link>
          <h1 className={styles.title} id="shopping-section-title">
            {section.title}
          </h1>
          <p className={styles.subtitle}>{section.subtitle}</p>
        </header>

        <nav className={styles.lessonList} aria-label={`${section.title}三级菜单`}>
          {section.lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
        </nav>
      </section>
    </main>
  );
}
