"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import HomeMenuIcon from "@/components/HomeMenuIcon";
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

function BrandMarkIcon() {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <path d="M35.5 9.5c14.8 0 26.7 11.2 26.7 25.3S50.3 60.2 35.5 60.2c-3.7 0-7.2-.7-10.3-2.1l-13.1 4.5 4.1-12.3a24.3 24.3 0 0 1-7.4-17.4C8.8 20.7 20.8 9.5 35.5 9.5Z" />
      <path d="M24.8 32.4v7.2M31.8 26.8v18.4M38.8 30.4v11.2M45.8 34.2v3.6" />
      <circle cx="51.2" cy="36" r="2.1" />
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

export default function ClassicScenesMenuPage() {
  const router = useRouter();
  const openHome = () => router.push("/start");
  const openCard = (card: SceneCard) => {
    if (card.href) {
      router.push(card.href);
    }
  };

  return (
    <main className={styles.pageShell}>
      <section className={styles.panel} aria-label="经典场景口语练习一级菜单">
        <header className={styles.header}>
          <button
            className={styles.menuButton}
            type="button"
            aria-label="回到首页"
            onClick={openHome}
          >
            <HomeMenuIcon label={null} />
          </button>

          <div className={styles.brand} aria-label="SpeakFlow Voice Practice">
            <span className={styles.brandMark}>
              <BrandMarkIcon />
            </span>
            <div className={styles.brandText}>
              <strong>SpeakFlow</strong>
              <span>VOICE PRACTICE</span>
            </div>
          </div>

          <span aria-hidden="true" />
        </header>

        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1>经典场景口语练习</h1>
            <p>覆盖日常生活场景，按分类练高频表达</p>
          </div>
          <HeroVisual />
        </section>

        <section className={styles.cardGrid} aria-label="经典场景分类">
          {sceneCards.map((card) => {
            const tileStyle = {
              "--card-accent": card.accent,
              "--icon-bg": card.iconBackground,
            } as CSSProperties;

            return (
              <button
                key={card.id}
                type="button"
                className={
                  card.meta
                    ? styles.sceneCard
                    : `${styles.sceneCard} ${styles.shortCard}`
                }
                style={tileStyle}
                onClick={() => openCard(card)}
                aria-label={card.href ? `进入${card.title}` : `${card.title}，课程整理中`}
              >
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
      </section>
    </main>
  );
}
