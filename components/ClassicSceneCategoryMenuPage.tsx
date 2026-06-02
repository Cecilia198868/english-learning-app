"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type {
  ClassicSceneCategoryIcon,
  ClassicSceneCategoryMenu,
  ClassicSceneSubcategory,
} from "@/data/classicSceneCategoryMenus";
import styles from "./ClassicSceneCategoryMenuPage.module.css";

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 5.5c3-.4 5.7.2 8 2v12c-2.4-1.6-5.1-2.2-8-1.8V5.5Z" />
      <path d="M20 5.5c-3-.4-5.7.2-8 2v12c2.4-1.6 5.1-2.2 8-1.8V5.5Z" />
    </svg>
  );
}

function TipIcon() {
  return (
    <svg className={styles.iconSvg} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M17 32c-3.6-2.5-5.5-6.3-5.5-10.5C11.5 14.6 17 9 24 9s12.5 5.6 12.5 12.5c0 4.2-1.9 8-5.5 10.5" />
      <path d="M19 35h10M20 40h8M24 32v-8" />
      <path d="M18 22h12" />
    </svg>
  );
}

function SceneIcon({ type }: { type: ClassicSceneCategoryIcon }) {
  return (
    <svg className={styles.iconSvg} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {type === "airport" ? (
        <>
          <path d="M8 34h32v6H8V23l8-8h16l8 8v11" />
          <path d="M14 34V23h20v11M17 29h4M27 29h4" />
          <path d="M25 9 37 5l2 4-11 7v9l-4 2-4-8-8 3-2-3 9-6v-5l3-1 3 2Z" />
        </>
      ) : type === "bag" || type === "store" ? (
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
      ) : type === "briefcase" ? (
        <>
          <rect x="9" y="16" width="30" height="22" rx="4" />
          <path d="M18 16v-5h12v5M9 25h30M22 25v4h4v-4" />
        </>
      ) : type === "bus" ? (
        <>
          <rect x="9" y="10" width="30" height="27" rx="5" />
          <path d="M14 17h20M14 25h20M15 37v3M33 37v3" />
          <circle cx="16" cy="32" r="2" />
          <circle cx="32" cy="32" r="2" />
        </>
      ) : type === "calendar" ? (
        <>
          <rect x="10" y="12" width="28" height="27" rx="4" />
          <path d="M16 8v8M32 8v8M10 20h28M18 29l4 4 8-9" />
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
          <path d="M14 34V22M24 34V14M34 34V9" />
          <path d="M12 20h8l-4-5 4-5h-8v10Z" />
        </>
      ) : type === "clipboard" ? (
        <>
          <rect x="13" y="12" width="22" height="28" rx="4" />
          <path d="M19 12c.4-2.6 2-4 5-4s4.6 1.4 5 4M18 22h12M18 29h12M18 35h8" />
        </>
      ) : type === "community" ? (
        <>
          <circle cx="16" cy="21" r="5" />
          <circle cx="32" cy="21" r="5" />
          <path d="M7 38c1.2-7 4.6-10.5 9-10.5S23.8 31 25 38" />
          <path d="M23 38c1.2-7 4.6-10.5 9-10.5S39.8 31 41 38" />
          <path d="M24 12c2.8-3.2 7.8-1.5 7.8 2.6 0 4-4.8 6-7.8 8.6-3-2.6-7.8-4.6-7.8-8.6C16.2 10.5 21.2 8.8 24 12Z" />
        </>
      ) : type === "delivery" ? (
        <>
          <path d="M11 14h20v19H11V14Z" />
          <path d="M31 21h6l4 5v7H31" />
          <circle cx="17" cy="36" r="3" />
          <circle cx="35" cy="36" r="3" />
          <path d="M17 14v8h8v-8" />
        </>
      ) : type === "document" || type === "interview" ? (
        <>
          <path d="M14 8h16l5 6v26H14V8Z" />
          <path d="M30 8v7h5M19 23h10M19 30h10M19 36h7" />
          <circle cx="21" cy="16" r="2.5" />
        </>
      ) : type === "education" ? (
        <>
          <path d="m6 18 18-9 18 9-18 9-18-9Z" />
          <path d="M13 22v10c6.7 4.2 15.3 4.2 22 0V22" />
          <path d="M39 20v12" />
        </>
      ) : type === "emergency" ? (
        <>
          <path d="M24 7 42 39H6L24 7Z" />
          <path d="M24 18v10M24 34h.1" />
        </>
      ) : type === "food" ? (
        <>
          <path d="M14 8v14M10 8v10.5a4 4 0 0 0 8 0V8" />
          <path d="M29 8v32" />
          <path d="M37 9c-5 3.4-8.2 9.2-8.2 17.4H37" />
        </>
      ) : type === "graduation" ? (
        <>
          <path d="m6 17 18-9 18 9-18 9-18-9Z" />
          <path d="M13 21v10c6.7 4.2 15.3 4.2 22 0V21" />
        </>
      ) : type === "health" ? (
        <>
          <path d="M24 7 39 13v10c0 9-6.1 15-15 18-8.9-3-15-9-15-18V13l15-6Z" />
          <path d="M24 16v16M16 24h16" />
        </>
      ) : type === "home" ? (
        <>
          <path d="M7 24 24 10l17 14" />
          <path d="M12 22v18h24V22" />
          <path d="M21 40V29h6v11" />
        </>
      ) : type === "hotel" ? (
        <>
          <path d="M10 33h28M13 33V15h16v18M29 22h9v11" />
          <path d="M17 21h4M17 27h4" />
          <path d="M14 12h12" />
        </>
      ) : type === "map" ? (
        <>
          <path d="M12 15 24 10l12 5v23l-12-5-12 5V15Z" />
          <path d="M24 10v23" />
          <path d="M31 23h9M36 18l5 5-5 5" />
          <path d="M16 22h4" />
        </>
      ) : type === "medicine" ? (
        <>
          <rect x="12" y="13" width="20" height="25" rx="4" />
          <path d="M16 13V9h12v4M22 20v10M17 25h10" />
          <path d="M31 30c4-3.8 8.5-1.2 8.5 3.5 0 4-3.5 6-8.5 7-5-1-8.5-3-8.5-7 0-4.7 4.5-7.3 8.5-3.5Z" />
        </>
      ) : type === "menu" ? (
        <>
          <path d="M13 9h22v30H13V9Z" />
          <path d="M18 17h12M18 24h12M18 31h8" />
          <path d="M11 15H8M11 24H8M11 33H8" />
        </>
      ) : type === "plane" ? (
        <>
          <path d="M25 9 39 5l2 4-13 8v10l-4 2-5-9-9 3-3-4 10-7V7l4-1 4 3Z" />
          <rect x="12" y="29" width="20" height="10" rx="3" />
        </>
      ) : type === "repair" ? (
        <>
          <rect x="14" y="8" width="20" height="32" rx="4" />
          <path d="M20 14h8M20 34h8M11 30l8-8M15 22l4 4" />
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
      ) : type === "scissors" ? (
        <>
          <circle cx="14" cy="33" r="5" />
          <circle cx="14" cy="15" r="5" />
          <path d="M19 18 38 8M19 30 38 40M20 24h18" />
        </>
      ) : type === "shield" ? (
        <>
          <path d="M24 7 39 13v10c0 9-6.1 15-15 18-8.9-3-15-9-15-18V13l15-6Z" />
          <path d="M17 24 22 29l10-12" />
        </>
      ) : type === "taxi" ? (
        <>
          <path d="m9 27 4-11h22l4 11" />
          <path d="M8 27h32v10H8V27Z" />
          <path d="M17 12h14v5H17z" />
          <text x="24" y="16.2" textAnchor="middle">
            TAXI
          </text>
        </>
      ) : type === "tools" || type === "wrench" ? (
        <>
          <path d="M31 8a9 9 0 0 0-10.8 11.3L9 30.5a4 4 0 1 0 5.6 5.6l11.2-11.2A9 9 0 0 0 37 14l-6.3 6.3-5-5L31 8Z" />
        </>
      ) : (
        <>
          <rect x="10" y="15" width="28" height="21" rx="4" />
          <path d="M14 15v-4h20v4M15 24h18M15 30h11" />
          <circle cx="34" cy="34" r="7" />
          <path d="M34 30v8M31 34h6" />
        </>
      )}
    </svg>
  );
}

function HeroVisual({ icon }: { icon: ClassicSceneCategoryIcon }) {
  return (
    <div className={styles.heroVisual} aria-hidden="true">
      <span className={styles.visualGlow} />
      <span className={styles.visualBubble}>
        <span className={styles.visualIcon}>
          <SceneIcon type={icon} />
        </span>
      </span>
      <span className={styles.visualCard}>
        <span className={styles.visualIcon}>
          <SceneIcon type={icon} />
        </span>
      </span>
      <span className={styles.heroLeaf}>
        <i />
        <i />
        <i />
      </span>
      <span className={`${styles.spark} ${styles.sparkOne}`} />
      <span className={`${styles.spark} ${styles.sparkTwo}`} />
    </div>
  );
}

function SceneCard({ card }: { card: ClassicSceneSubcategory }) {
  const style = {
    "--card-accent": card.accent,
    "--card-tile": card.tile,
  } as CSSProperties;

  const className = `${styles.sceneCard} ${card.wide ? styles.sceneCardWide : ""}`;
  const content = (
    <>
      <span className={styles.cardIconWrap} aria-hidden="true">
        <SceneIcon type={card.icon} />
      </span>
      <span className={styles.cardCopy}>
        <strong>{card.title}</strong>
        <span>{card.description}</span>
        <span className={styles.cardMeta}>
          <BookIcon />
          {card.count} 个课程
        </span>
      </span>
      <span className={styles.arrowCircle} aria-hidden="true">
        <ArrowRightIcon />
      </span>
    </>
  );

  if (card.href) {
    return (
      <Link
        aria-label={`进入${card.title}三级菜单，${card.count} 个课程`}
        className={className}
        href={card.href}
        style={style}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-label={`${card.title}，${card.count} 个课程`}
    >
      {content}
    </button>
  );
}

export default function ClassicSceneCategoryMenuPage({
  menu,
}: {
  menu: ClassicSceneCategoryMenu;
}) {
  const categoryStyle = {
    "--category-accent": menu.accent,
  } as CSSProperties;

  return (
    <main className={styles.pageShell} style={categoryStyle}>
      <section className={styles.panel} aria-labelledby="classic-category-title">
        <header className={styles.topbar}>
          <Link
            className={styles.topBackLink}
            href="/classic-scenes"
            aria-label="返回经典场景一级菜单"
          >
            <ArrowLeftIcon />
            返回上一级
          </Link>

          <div className={styles.titleBlock}>
            <h1 id="classic-category-title">{menu.title}</h1>
            <p className={styles.subtitle}>
              <span className={styles.subtitleIcon} aria-hidden="true">
                <SceneIcon type={menu.heroIcon} />
              </span>
              {menu.subtitle}
            </p>
          </div>

          <span aria-hidden="true" />
        </header>

        <section className={styles.hero} aria-label={menu.title}>
          <div className={styles.heroCopy}>
            <h2>{menu.title}</h2>
            <p>{menu.description}</p>
          </div>
          <HeroVisual icon={menu.heroIcon} />
        </section>

        <section className={styles.cardGrid} aria-label={`${menu.title}二级菜单`}>
          {menu.cards.map((card) => (
            <SceneCard key={card.id} card={card} />
          ))}
        </section>

        <div className={styles.tip}>
          <span className={styles.tipIcon} aria-hidden="true">
            <TipIcon />
          </span>
          丰富的真实场景，帮你轻松开口说英语！
        </div>
      </section>
    </main>
  );
}
