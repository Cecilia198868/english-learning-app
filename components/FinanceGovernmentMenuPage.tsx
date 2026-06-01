"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import styles from "./FinanceGovernmentMenuPage.module.css";

type FinanceCardIcon =
  | "bank"
  | "id"
  | "government"
  | "car"
  | "shield"
  | "cone"
  | "document"
  | "grid";

type FinanceCard = {
  accent: string;
  count: number;
  description: string;
  href: string;
  icon: FinanceCardIcon;
  iconBackground: string;
  id: string;
  title: string;
};

const financeCards: FinanceCard[] = [
  {
    id: "bank-finance",
    title: "银行与金融交易",
    description: "开户、存款、取款、转账、理财等常用表达",
    count: 20,
    href: "/classic-scenes/finance-government/bank-finance",
    icon: "bank",
    accent: "#4d7f42",
    iconBackground: "#edf4e8",
  },
  {
    id: "identity-immigration",
    title: "身份与移民相关",
    description: "护照、签证、居留申请、移民面试等场景",
    count: 8,
    href: "/classic-scenes/finance-government/identity-immigration",
    icon: "id",
    accent: "#db7743",
    iconBackground: "#fff0e4",
  },
  {
    id: "public-services",
    title: "政府福利与公共服务",
    description: "社保、失业救济、公共服务申请等表达",
    count: 10,
    href: "/classic-scenes/finance-government/public-services",
    icon: "government",
    accent: "#d99b24",
    iconBackground: "#fff7df",
  },
  {
    id: "driver-vehicle",
    title: "驾照与车辆管理",
    description: "驾照考试、换证、车辆注册、年检等场景",
    count: 16,
    href: "/classic-scenes/finance-government/driver-vehicle",
    icon: "car",
    accent: "#3f838b",
    iconBackground: "#eef7f4",
  },
  {
    id: "insurance-consulting",
    title: "保险咨询",
    description: "咨询保险、购买保险、理赔、保险条款解读等",
    count: 10,
    href: "/classic-scenes/finance-government/insurance-consulting",
    icon: "shield",
    accent: "#7b6794",
    iconBackground: "#f4eef5",
  },
  {
    id: "traffic-safety",
    title: "交通安全",
    description: "交通规则、违章处理、罚款、交通事故等场景",
    count: 8,
    href: "/classic-scenes/finance-government/insurance-traffic-safety",
    icon: "cone",
    accent: "#d6763c",
    iconBackground: "#fff1e5",
  },
  {
    id: "tax-government-forms",
    title: "税务与政府表格",
    description: "报税、税务咨询、填写政府表格等常用表达",
    count: 10,
    href: "/classic-scenes/finance-government/tax-government-forms",
    icon: "document",
    accent: "#a5678f",
    iconBackground: "#f7eef3",
  },
  {
    id: "all-finance",
    title: "查看全部",
    description: "从金融、身份、政府、车辆等多领域扩展更多场景",
    count: 83,
    href: "/classic-scenes/finance-government/all-finance",
    icon: "grid",
    accent: "#4a8a62",
    iconBackground: "#eef7ef",
  },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M8.5 10.5h15M8.5 16h15M8.5 21.5h15" />
    </svg>
  );
}

function BrandMarkIcon() {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <path d="M35.5 9.5c14.8 0 26.7 11.2 26.7 25.3S50.3 60.2 35.5 60.2c-3.7 0-7.2-.7-10.3-2.1l-13.1 4.5 4.1-12.3a24.3 24.3 0 0 1-7.4-17.4C8.8 20.7 20.8 9.5 35.5 9.5Z" />
      <path d="M24.8 32.4v7.2M31.8 26.8v18.4M38.8 30.4v11.2M45.8 34.2v3.6" />
      <circle cx="51.2" cy="36" r="2.1" />
    </svg>
  );
}

function ArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M19 12H5M11 6l-6 6 6 6" />
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

function CardIcon({ icon }: { icon: FinanceCardIcon }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      {icon === "bank" && (
        <>
          <path d="M6.5 17.2 20 8.5l13.5 8.7H6.5Z" />
          <path d="M10.5 18.8v12M16.8 18.8v12M23.2 18.8v12M29.5 18.8v12M7.5 32.8h25" />
        </>
      )}
      {icon === "id" && (
        <>
          <path d="M11 7h18v26H11V7Z" />
          <circle cx="20" cy="17.2" r="3.6" />
          <path d="M14.2 28.3c1.3-4 10.3-4 11.6 0M15.5 11.5h9" />
        </>
      )}
      {icon === "government" && (
        <>
          <path d="M6.5 17.2 20 8.5l13.5 8.7H6.5Z" />
          <path d="M10.5 18.8v12M16.8 18.8v12M23.2 18.8v12M29.5 18.8v12M7.5 32.8h25" />
          <path d="M20 6v3.2" />
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
      {icon === "shield" && (
        <>
          <path d="M20 6.5 32 11v8.5c0 7-4.9 11.8-12 14-7.1-2.2-12-7-12-14V11l12-4.5Z" />
          <path d="M20 13.8v12.4M13.8 20h12.4" />
        </>
      )}
      {icon === "cone" && (
        <>
          <path d="M16.2 7.5h7.6l6 25H10.2l6-25Z" />
          <path d="M13.5 21h13M12.3 27h15.4" />
        </>
      )}
      {icon === "document" && (
        <>
          <path d="M11 6.8h15.5l4.5 4.8v21.6H11V6.8Z" />
          <path d="M26.5 6.8v6h4.5M15.5 18.2h10M15.5 23.4h10M15.5 28.6h7.5" />
        </>
      )}
      {icon === "grid" && (
        <>
          <rect x="9" y="9" width="8" height="8" rx="1.8" />
          <rect x="23" y="9" width="8" height="8" rx="1.8" />
          <rect x="9" y="23" width="8" height="8" rx="1.8" />
          <rect x="23" y="23" width="8" height="8" rx="1.8" />
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

export default function FinanceGovernmentMenuPage() {
  const router = useRouter();
  const goBack = () => router.push("/classic-scenes");
  const openAccount = () => router.push("/account");

  return (
    <main className={styles.pageShell}>
      <section className={styles.panel} aria-label="金融与行政事务二级菜单">
        <header className={styles.header}>
          <button
            className={styles.menuButton}
            type="button"
            aria-label="打开账户界面"
            onClick={openAccount}
          >
            <MenuIcon />
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
          <button className={styles.backLink} type="button" onClick={goBack}>
            <ArrowLeft />
            返回上一级
          </button>
          <div className={styles.heroText}>
            <h1>金融与行政事务</h1>
            <p>银行、支付、税务、签证等场景</p>
          </div>
          <HeroVisual />
        </section>

        <section className={styles.cardGrid} aria-label="金融与行政事务分类">
          {financeCards.map((card) => (
            <button
              key={card.id}
              type="button"
              className={styles.sceneCard}
              style={
                {
                  "--card-accent": card.accent,
                  "--icon-bg": card.iconBackground,
                } as CSSProperties
              }
              onClick={() => router.push(card.href)}
              aria-label={`进入${card.title}`}
            >
              <span className={styles.iconTile} aria-hidden="true">
                <CardIcon icon={card.icon} />
              </span>
              <span className={styles.cardCopy}>
                <strong>{card.title}</strong>
                <span>{card.description}</span>
              </span>
              <span className={styles.cardMeta}>{card.count} 个课程</span>
              <span className={styles.arrowCircle} aria-hidden="true">
                <ArrowRight />
              </span>
            </button>
          ))}
        </section>
      </section>
    </main>
  );
}
