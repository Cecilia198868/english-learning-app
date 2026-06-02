"use client";

import Link from "next/link";
import { useEffect } from "react";
import HomeMenuIcon from "@/components/HomeMenuIcon";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";
import { syncVocabularyWordsWithCloud } from "@/lib/vocabulary";
import styles from "./NewExpressionsPage.module.css";

type SessionResponse = {
  user?: {
    email?: string | null;
    name?: string | null;
  } | null;
};

const learnFeatures = [
  "精选高频表达",
  "场景化例句",
  "地道发音跟读",
  "帮助你自然表达",
];

const libraryFeatures = [
  "查看全部收藏内容",
  "继续学习中的表达",
  "复习和巩固掌握",
  "分类管理更高效",
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M12 7.5 20.5 16 12 24.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6.2 12.2 3.5 3.5 8.1-8.4" />
    </svg>
  );
}

function BookHeaderIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 72 72">
      <defs>
        <linearGradient id="newExpressionHeaderBook" x1="12" x2="58" y1="12" y2="62">
          <stop stopColor="#9bb8ff" />
          <stop offset="1" stopColor="#5d7ff2" />
        </linearGradient>
      </defs>
      <path
        d="M10 18.5c0-3.1 2.5-5.6 5.6-5.6h16c3.1 0 5.7 1.2 7.9 3.5 2.2-2.3 4.9-3.5 8-3.5h10.9c3.1 0 5.6 2.5 5.6 5.6v35.8c0 2.8-2.9 4.6-5.4 3.4l-5.9-2.8c-6.4-3-13.2-2.6-20.4 1.3-7.2-3.9-14-4.3-20.4-1.3l-5.5 2.6C3.6 58.8 1 56.9 1 54.1V18.5Z"
        fill="url(#newExpressionHeaderBook)"
        opacity=".9"
        transform="translate(3 0)"
      />
      <path d="M36 18v39" stroke="#dce7ff" strokeLinecap="round" strokeWidth="4" />
      <path
        d="M18 27h14M18 36h14M46 27h11M46 36h11"
        stroke="#eef4ff"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48">
      <path d="m24 5.2 5.9 12 13.2 1.9-9.6 9.3 2.3 13.1L24 35.3l-11.8 6.2 2.3-13.1-9.6-9.3 13.2-1.9L24 5.2Z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48">
      <path d="M7 15.6c0-2.4 1.9-4.3 4.3-4.3h9.8l4.4 5H37c2.4 0 4.3 1.9 4.3 4.3v14.1c0 2.4-1.9 4.3-4.3 4.3H11.3C9 39 7 37.1 7 34.7V15.6Z" />
    </svg>
  );
}

function TipIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 44 44">
      <path d="M22 4.8c-7.1 0-12.8 5.5-12.8 12.3 0 4.1 2 7.3 5.2 9.7 1.6 1.2 2.5 3 2.5 5v.7h10.2v-.7c0-2 .9-3.8 2.5-5 3.2-2.4 5.2-5.6 5.2-9.7C34.8 10.3 29.1 4.8 22 4.8Z" />
      <path d="M16.8 36h10.4M18.8 40h6.4" />
    </svg>
  );
}

function LearnIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 260 220">
      <defs>
        <linearGradient id="newExpressionLearnBook" x1="42" x2="204" y1="70" y2="182">
          <stop stopColor="#a9bfff" />
          <stop offset="1" stopColor="#5279f5" />
        </linearGradient>
        <linearGradient id="newExpressionLearnBubble" x1="184" x2="247" y1="44" y2="104">
          <stop stopColor="#bdd0ff" />
          <stop offset="1" stopColor="#6f91f6" />
        </linearGradient>
      </defs>
      <circle cx="68" cy="90" r="31" fill="#ffffff" opacity=".96" />
      <path
        d="M53 92c8.5-6.4 20-6.4 28.5 0M84 78v34"
        fill="none"
        stroke="#4a73f4"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path
        d="M80 75c-14 0-25 11-25 25v61c0 10 11 17 20 12 25-13 48-8 68 6 20-14 43-19 68-6 9 5 20-2 20-12v-61c0-14-11-25-25-25h-43c-9 0-16 3-22 9-6-6-13-9-22-9H80Z"
        fill="url(#newExpressionLearnBook)"
      />
      <path
        d="M82 63c-13 0-23 10-23 23v58c0 9 10 15 18 11 22-11 43-7 62 5 19-12 40-16 62-5 8 4 18-2 18-11V86c0-13-10-23-23-23h-39c-8 0-15 3-20 8-5-5-12-8-20-8H82Z"
        fill="#fbfdff"
      />
      <path d="M139 72v88" stroke="#dce5f8" strokeLinecap="round" strokeWidth="5" />
      <path
        d="M84 90h41M84 111h48M84 132h36M161 93h43M161 114h36M161 135h40"
        stroke="#d6deef"
        strokeLinecap="round"
        strokeWidth="9"
      />
      <path
        d="M190 45h48c9 0 16 7 16 16v40l-15-10h-49c-9 0-16-7-16-16V61c0-9 7-16 16-16Z"
        fill="url(#newExpressionLearnBubble)"
        transform="rotate(5 214 76)"
      />
      <text
        x="196"
        y="86"
        fill="#ffffff"
        fontFamily="Arial, sans-serif"
        fontSize="42"
        fontWeight="800"
        transform="rotate(5 214 76)"
      >
        Aa
      </text>
      <path
        d="M32 30h8M36 26v8M222 26h8M226 22v8M235 172h8M239 168v8"
        stroke="#c3d2ff"
        strokeLinecap="round"
        strokeWidth="5"
      />
    </svg>
  );
}

function LibraryIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 260 220">
      <defs>
        <linearGradient id="newExpressionLibraryFolder" x1="43" x2="215" y1="82" y2="178">
          <stop stopColor="#9be0c2" />
          <stop offset="1" stopColor="#4fc086" />
        </linearGradient>
        <linearGradient id="newExpressionLibraryLens" x1="174" x2="238" y1="118" y2="190">
          <stop stopColor="#97dec8" />
          <stop offset="1" stopColor="#42b37f" />
        </linearGradient>
      </defs>
      <path
        d="M67 82c0-12 10-22 22-22h38l17 18h71c12 0 22 10 22 22v58c0 12-10 22-22 22H67c-12 0-22-10-22-22v-58c0-12 10-22 22-22Z"
        fill="url(#newExpressionLibraryFolder)"
      />
      <rect
        width="91"
        height="76"
        x="125"
        y="38"
        fill="#ffffff"
        rx="15"
        transform="rotate(8 125 38)"
      />
      <path
        d="M147 65h45M145 84h50M143 103h38"
        stroke="#d4deef"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        d="m99 121 7.1 14.4 15.9 2.3-11.5 11.2 2.7 15.8L99 157.3l-14.2 7.4 2.7-15.8L76 137.7l15.9-2.3L99 121Z"
        fill="#ffffff"
        opacity=".95"
      />
      <circle cx="195" cy="150" r="37" fill="url(#newExpressionLibraryLens)" />
      <circle cx="195" cy="150" r="16" fill="none" stroke="#ffffff" strokeWidth="9" />
      <path d="m207 162 20 20" stroke="#ffffff" strokeLinecap="round" strokeWidth="9" />
      <path
        d="M42 52h8M46 48v8M229 53h8M233 49v8M40 174h8M44 170v8"
        stroke="#9ee7d0"
        strokeLinecap="round"
        strokeWidth="5"
      />
    </svg>
  );
}

export default function NewExpressionsPage() {
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const session = (await response.json()) as SessionResponse;

        if (!cancelled && (session.user?.email || session.user?.name)) {
          void syncVocabularyWordsWithCloud();
        }
      } catch {}
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.phone} aria-label="新表达菜单">
        <header className={styles.header}>
          <Link href="/start" aria-label="返回学习首页" className={styles.homeButton}>
            <span className={styles.homeIconBox}>
              <HomeMenuIcon label={null} showHint={false} />
            </span>
            <span>学习首页</span>
          </Link>

          <div className={styles.brand} aria-label="SpeakFlow AI Voice Practice">
            <SpeakFlowBrandMark className={styles.brandLogo} />
            <span>
              <strong>SpeakFlow</strong>
              <small>AI VOICE PRACTICE</small>
            </span>
          </div>

          <span aria-hidden="true" />
        </header>

        <section className={styles.hero} aria-labelledby="new-expressions-title">
          <span className={styles.heroIcon}>
            <BookHeaderIcon />
          </span>
          <div>
            <h1 id="new-expressions-title">新表达</h1>
            <p>发现、学习和掌握地道表达</p>
          </div>
        </section>

        <section className={styles.cardList} aria-label="新表达功能入口">
          <Link href="/vocabulary" className={`${styles.actionCard} ${styles.learnCard}`}>
            <span className={styles.cardIcon}>
              <StarIcon />
            </span>
            <span className={styles.cardCopy}>
              <strong>发现新表达</strong>
              <span>学习地道、实用的英语表达</span>
            </span>
            <span className={styles.featureList}>
              {learnFeatures.map((feature) => (
                <span key={feature} className={styles.featureItem}>
                  <span className={styles.checkIcon}>
                    <CheckIcon />
                  </span>
                  {feature}
                </span>
              ))}
            </span>
            <span className={`${styles.cardButton} ${styles.blueButton}`}>
              去学习新表达
              <ArrowIcon />
            </span>
            <span className={styles.learnArt}>
              <LearnIllustration />
            </span>
            <span className={`${styles.sparkle} ${styles.sparkleOne}`} />
            <span className={`${styles.sparkle} ${styles.sparkleTwo}`} />
          </Link>

          <Link
            href="/vocabulary?library=1"
            className={`${styles.actionCard} ${styles.libraryCard}`}
          >
            <span className={styles.cardIcon}>
              <FolderIcon />
            </span>
            <span className={styles.cardCopy}>
              <strong>我的表达库</strong>
              <span>查看收藏、复习和管理你的表达</span>
            </span>
            <span className={styles.featureList}>
              {libraryFeatures.map((feature) => (
                <span key={feature} className={styles.featureItem}>
                  <span className={styles.checkIcon}>
                    <CheckIcon />
                  </span>
                  {feature}
                </span>
              ))}
            </span>
            <span className={`${styles.cardButton} ${styles.greenButton}`}>
              打开我的表达库
              <ArrowIcon />
            </span>
            <span className={styles.libraryArt}>
              <LibraryIllustration />
            </span>
            <span className={`${styles.sparkle} ${styles.sparkleThree}`} />
            <span className={`${styles.sparkle} ${styles.sparkleFour}`} />
          </Link>
        </section>

        <section className={styles.tipCard} aria-label="小贴士">
          <span className={styles.tipIcon}>
            <TipIcon />
          </span>
          <div>
            <h2>小贴士</h2>
            <p>坚持学习和复习，你会发现自己的表达越来越自然！</p>
          </div>
        </section>
      </section>
    </main>
  );
}
