"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import styles from "./BankFinancePage.module.css";

type BankLessonIcon =
  | "account"
  | "headset"
  | "atm"
  | "phone"
  | "cash"
  | "exchange"
  | "globe"
  | "safe"
  | "clipboard"
  | "lock"
  | "shieldAlert"
  | "question"
  | "call"
  | "person"
  | "house"
  | "shield"
  | "umbrella"
  | "chart"
  | "retirement"
  | "power";

type BankLesson = {
  accent: string;
  href: string;
  icon: BankLessonIcon;
  id: string;
  number: number;
  tile: string;
  title: string;
};

const backToFinanceMenuHref =
  "/speak-english?menu=1&submenu=classic&classicCategory=finance-government";

const lessons: BankLesson[] = [
  {
    number: 1,
    title: "新开银行账户",
    id: "bank_open_new_account_zh",
    href: "/study/bank_open_new_account_zh",
    icon: "account",
    accent: "#7b61ff",
    tile: "#eee9ff",
  },
  {
    number: 2,
    title: "银行事务口语课",
    id: "bank_general_banking_zh",
    href: "/study/bank_general_banking_zh",
    icon: "headset",
    accent: "#14b879",
    tile: "#e7fbf2",
  },
  {
    number: 3,
    title: "使用 ATM 机和自我服务",
    id: "bank_atm_self_service_zh",
    href: "/study/bank_atm_self_service_zh",
    icon: "atm",
    accent: "#ff843f",
    tile: "#fff0e5",
  },
  {
    number: 4,
    title: "网上银行与手机App操作",
    id: "bank_online_banking_app_zh",
    href: "/study/bank_online_banking_app_zh",
    icon: "phone",
    accent: "#2f8ae8",
    tile: "#eaf4ff",
  },
  {
    number: 5,
    title: "存款和取款",
    id: "bank_deposit_withdrawal_zh",
    href: "/study/bank_deposit_withdrawal_zh",
    icon: "cash",
    accent: "#f7a92f",
    tile: "#fff4df",
  },
  {
    number: 6,
    title: "货币兑换与国际汇款",
    id: "bank_currency_exchange_remittance_zh",
    href: "/study/bank_currency_exchange_remittance_zh",
    icon: "exchange",
    accent: "#10af75",
    tile: "#e4faf0",
  },
  {
    number: 7,
    title: "国际电汇与海外付款",
    id: "bank_international_wire_zh",
    href: "/study/bank_international_wire_zh",
    icon: "globe",
    accent: "#8270e8",
    tile: "#f0edff",
  },
  {
    number: 8,
    title: "设立储蓄和定期存款账户",
    id: "bank_savings_fixed_deposit_zh",
    href: "/study/bank_savings_fixed_deposit_zh",
    icon: "safe",
    accent: "#2f8ae8",
    tile: "#e9f5ff",
  },
  {
    number: 9,
    title: "信用卡申请与审批流程",
    id: "bank_credit_card_application_zh",
    href: "/study/bank_credit_card_application_zh",
    icon: "clipboard",
    accent: "#ed5190",
    tile: "#fff0f8",
  },
  {
    number: 10,
    title: "信用卡挂失口语课",
    id: "bank_credit_card_lost_report_zh",
    href: "/study/bank_credit_card_lost_report_zh",
    icon: "lock",
    accent: "#e64d88",
    tile: "#fff0f7",
  },
  {
    number: 11,
    title: "信用卡报告欺诈收费口语课",
    id: "bank_credit_card_fraud_report_zh",
    href: "/study/bank_credit_card_fraud_report_zh",
    icon: "shieldAlert",
    accent: "#ff7f35",
    tile: "#fff0e7",
  },
  {
    number: 12,
    title: "银行费用查询与争议解决",
    id: "bank_fee_disputes_zh",
    href: "/study/bank_fee_disputes_zh",
    icon: "question",
    accent: "#2f8ae8",
    tile: "#eaf5ff",
  },
  {
    number: 13,
    title: "银行客服电话口语课",
    id: "bank_customer_service_calls_zh",
    href: "/study/bank_customer_service_calls_zh",
    icon: "call",
    accent: "#0eb97b",
    tile: "#e5fbf2",
  },
  {
    number: 14,
    title: "申请个人贷款",
    id: "bank_personal_loan_zh",
    href: "/study/bank_personal_loan_zh",
    icon: "person",
    accent: "#8067e8",
    tile: "#f0edff",
  },
  {
    number: 15,
    title: "房屋抵押贷款咨询",
    id: "bank_mortgage_consultation_zh",
    href: "/study/bank_mortgage_consultation_zh",
    icon: "house",
    accent: "#f4ad36",
    tile: "#fff4df",
  },
  {
    number: 16,
    title: "银行保险箱",
    id: "bank_safe_deposit_box_zh",
    href: "/study/bank_safe_deposit_box_zh",
    icon: "shield",
    accent: "#2f8ae8",
    tile: "#eaf5ff",
  },
  {
    number: 17,
    title: "银行提供的保险产品",
    id: "bank_insurance_products_zh",
    href: "/study/bank_insurance_products_zh",
    icon: "umbrella",
    accent: "#18ad7c",
    tile: "#e6fbf2",
  },
  {
    number: 18,
    title: "投资产品与财富管理",
    id: "bank_wealth_management_zh",
    href: "/study/bank_wealth_management_zh",
    icon: "chart",
    accent: "#f06d42",
    tile: "#fff0e8",
  },
  {
    number: 19,
    title: "退休储蓄与养老金计划",
    id: "bank_retirement_pension_zh",
    href: "/study/bank_retirement_pension_zh",
    icon: "retirement",
    accent: "#8067e8",
    tile: "#f0edff",
  },
  {
    number: 20,
    title: "关闭银行账户",
    id: "bank_close_account_zh",
    href: "/study/bank_close_account_zh",
    icon: "power",
    accent: "#7d86a6",
    tile: "#eff2f7",
  },
];

function rememberLessonTitle(title: string) {
  window.localStorage.setItem("currentLessonTitle", title);
}

function LessonIcon({ type }: { type: BankLessonIcon }) {
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
      ) : type === "headset" ? (
        <>
          <path d="M10 26v-3.5C10 14.5 16 9 24 9s14 5.5 14 13.5V26" />
          <path d="M10 26c0-2.2 1.7-4 3.9-4h2.3v11h-2.3c-2.2 0-3.9-1.8-3.9-4v-3Z" />
          <path d="M38 26c0-2.2-1.7-4-3.9-4h-2.3v11h2.3c2.2 0 3.9-1.8 3.9-4v-3Z" />
          <path d="M31 34c-1.5 2.2-3.8 3.3-7 3.3" />
        </>
      ) : type === "atm" ? (
        <>
          <rect x="9" y="9" width="30" height="30" rx="7" />
          <text x="24" y="22" textAnchor="middle">
            ATM
          </text>
          <text x="24" y="32" textAnchor="middle">
            ATM
          </text>
        </>
      ) : type === "phone" ? (
        <>
          <rect x="15" y="7" width="18" height="34" rx="4" />
          <path d="M21 12h6M21 35h6" />
        </>
      ) : type === "cash" ? (
        <>
          <path d="M17 17h14l3 20H14l3-20Z" />
          <path d="M20 17c0-4 2-7 4-7s4 3 4 7" />
          <path d="M24 22v10M20.5 25.5h7M20.5 30h7" />
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
      ) : type === "safe" ? (
        <>
          <rect x="12" y="10" width="24" height="28" rx="4" />
          <rect x="17" y="15" width="14" height="14" rx="2" />
          <circle cx="24" cy="22" r="4" />
          <path d="M24 18v8M20 22h8M17 34h14" />
        </>
      ) : type === "clipboard" ? (
        <>
          <rect x="14" y="12" width="20" height="28" rx="4" />
          <path d="M20 12c.4-2.6 1.8-4 4-4s3.6 1.4 4 4M19 22h10M19 28h10M19 34h7" />
        </>
      ) : type === "lock" ? (
        <>
          <rect x="13" y="21" width="22" height="17" rx="4" />
          <path d="M18 21v-5c0-4 2.8-7 6-7s6 3 6 7v5M24 28v5" />
        </>
      ) : type === "shieldAlert" ? (
        <>
          <path d="M24 8 37 13v9c0 8-5.4 14-13 18-7.6-4-13-10-13-18v-9l13-5Z" />
          <path d="M24 17v10M24 33h.1" />
        </>
      ) : type === "question" ? (
        <>
          <path d="M12 14c3.2-3.8 7.1-5.7 11.8-5.7 6.7 0 11.8 4.5 11.8 10.6 0 6.5-5.6 10.7-13.4 10.7h-2.7L12 37v-8.3c-3-2-4.6-5.3-4.6-9.3 0-2 .5-3.8 1.5-5.4" />
          <path d="M20 18c.8-1.8 2.3-2.8 4.5-2.8 2.5 0 4.2 1.5 4.2 3.8 0 2.1-1.2 3.2-3.1 4.3-1.4.9-2 1.7-2 3.4M23.8 32h.1" />
        </>
      ) : type === "call" ? (
        <path d="M17 10 11 16c1.7 9.8 10.2 18.2 20 20l6-6-7-5-3.6 3.5c-3.2-1.4-5.6-3.8-7-7l3.6-3.5-5-8Z" />
      ) : type === "person" ? (
        <>
          <circle cx="24" cy="16" r="7" />
          <path d="M11 38c2-8 6.7-12 13-12s11 4 13 12" />
        </>
      ) : type === "house" ? (
        <>
          <path d="M8 23 24 10l16 13" />
          <path d="M13 22v17h22V22" />
          <path d="M21 39V28h6v11" />
        </>
      ) : type === "shield" ? (
        <>
          <path d="M24 8 37 13v9c0 8-5.4 14-13 18-7.6-4-13-10-13-18v-9l13-5Z" />
          <path d="M18 24 22 28l8-9" />
        </>
      ) : type === "umbrella" ? (
        <>
          <path d="M8 24c2-8 8-13 16-13s14 5 16 13H8Z" />
          <path d="M24 24v11c0 3 1.7 5 4.5 5 2.2 0 3.5-1.3 3.5-3.2" />
        </>
      ) : type === "chart" ? (
        <>
          <path d="M11 36h27" />
          <path d="M14 31 22 23l6 5 9-13" />
          <path d="M32 15h5v5" />
        </>
      ) : type === "retirement" ? (
        <>
          <circle cx="24" cy="14" r="5" />
          <path d="M15 35c1.2-6 4.3-9.2 9-9.2S31.8 29 33 35" />
          <path d="M8 37c1.2-5 4.5-8 8.8-8M40 37c-1.2-5-4.5-8-8.8-8" />
          <circle cx="13" cy="22" r="4" />
          <circle cx="35" cy="22" r="4" />
        </>
      ) : (
        <>
          <path d="M24 9v15" />
          <path d="M16 14.5A15 15 0 1 0 32 14.5" />
        </>
      )}
    </svg>
  );
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

export default function BankFinanceTransactionsPage() {
  return (
    <main className={styles.pageShell}>
      <section className={styles.phone} aria-labelledby="bank-finance-title">
        <header className={styles.header}>
          <Link
            aria-label="返回银行与金融菜单界面"
            className={styles.backButton}
            href={backToFinanceMenuHref}
          >
            <BackIcon />
          </Link>
          <h1 className={styles.title} id="bank-finance-title">
            银行与金融交易
          </h1>
        </header>

        <nav className={styles.lessonList} aria-label="银行与金融交易话题">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              aria-label={`进入${lesson.title}学习界面第一页`}
              className={styles.lessonCard}
              href={lesson.href}
              onClick={() => rememberLessonTitle(lesson.title)}
              style={
                {
                  "--lesson-accent": lesson.accent,
                  "--lesson-tile": lesson.tile,
                } as CSSProperties
              }
            >
              <span className={styles.iconTile}>
                <LessonIcon type={lesson.icon} />
              </span>
              <span className={styles.numberBadge}>{lesson.number}</span>
              <span className={styles.lessonTitle}>{lesson.title}</span>
              <span className={styles.chevron}>
                <ChevronIcon />
              </span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
