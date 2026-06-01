"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FREE_PRACTICE_DAILY_LIMIT } from "@/lib/freePracticeLimit";
import styles from "./HomePageClient.module.css";

const featureCards = [
  {
    title: "口语练习",
    subtitle: "随时开口",
    icon: "chat",
    action: "practice",
  },
  {
    title: "出国生活",
    subtitle: "轻松交流",
    icon: "globe",
    href: "/classic-scenes",
  },
  {
    title: "工作沟通",
    subtitle: "自信表达",
    icon: "briefcase",
    href: "/classic-scenes",
  },
  {
    title: "日常表达",
    subtitle: "自然地道",
    icon: "heart",
    href: "/new-expressions",
  },
] as const;

function FeatureIcon({ type }: { type: (typeof featureCards)[number]["icon"] }) {
  if (type === "globe") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="14" />
        <path d="M6 20h28M20 6c4.2 4.2 6.1 8.8 6.1 14S24.2 29.8 20 34M20 6c-4.2 4.2-6.1 8.8-6.1 14S15.8 29.8 20 34" />
      </svg>
    );
  }

  if (type === "briefcase") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M12 15h16a5 5 0 0 1 5 5v10H7V20a5 5 0 0 1 5-5Z" />
        <path d="M15 15v-3.2A2.8 2.8 0 0 1 17.8 9h4.4a2.8 2.8 0 0 1 2.8 2.8V15M7 23h26" />
      </svg>
    );
  }

  if (type === "heart") {
    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 32s-12-7.2-12-16a6.6 6.6 0 0 1 11.7-4.2A6.6 6.6 0 0 1 32 16c0 8.8-12 16-12 16Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M9 13.5A8.5 8.5 0 0 1 17.5 5h5A8.5 8.5 0 0 1 31 13.5v3A8.5 8.5 0 0 1 22.5 25H20l-7 6v-7.3a8.5 8.5 0 0 1-4-7.2v-3Z" />
      <path d="M15 15h.1M20 15h.1M25 15h.1" />
    </svg>
  );
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <span className={`${styles.sparkle} ${className}`} aria-hidden="true">
      ✦
    </span>
  );
}

export default function HomePageClient() {
  const router = useRouter();

  function startPractice() {
    router.push("/ai-guided-expression/step-1");
  }

  return (
    <main className={styles.page}>
      <section className={styles.phone} aria-label="SpeakFlow 首页">
        <div className={styles.logoWrap}>
          <div className={styles.logoCard}>
            <Image
              src="/brand/speakflow-app-icon.png"
              alt="SpeakFlow"
              width={92}
              height={92}
              priority
              sizes="92px"
            />
          </div>
          <Sparkle className={styles.topSparkle} />
          <span className={styles.helloBubble}>Hello!</span>
        </div>

        <h1 className={styles.brand}>SpeakFlow</h1>
        <h2 className={styles.heroTitle}>
          把你想说的话，
          <br />
          变成自然英语
        </h2>
        <p className={styles.heroCopy}>AI 帮你润色表达，练出地道口语</p>

        <div className={styles.featureGrid} aria-label="学习入口">
          {featureCards.map((card) => {
            const content = (
              <>
                <span className={styles.featureIcon}>
                  <FeatureIcon type={card.icon} />
                </span>
                <strong>{card.title}</strong>
                <small>{card.subtitle}</small>
              </>
            );

            if ("href" in card) {
              return (
                <Link key={card.title} href={card.href} className={styles.featureCard}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={card.title}
                type="button"
                className={styles.featureCard}
                onClick={startPractice}
              >
                {content}
              </button>
            );
          })}
        </div>

        <button type="button" className={styles.primaryCta} onClick={startPractice}>
          <span className={styles.ctaMic} aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <path d="M20 6a5 5 0 0 0-5 5v9a5 5 0 0 0 10 0v-9a5 5 0 0 0-5-5Z" />
              <path d="M10 19.5a10 10 0 0 0 20 0M20 30v5M15 35h10" />
            </svg>
          </span>
          开始练口语
          <span className={styles.ctaArrow} aria-hidden="true">
            ›
          </span>
        </button>

        <Link href="/login" className={styles.loginLink}>
          已有账号？ 登录 <span aria-hidden="true">›</span>
        </Link>

        <div className={styles.trialNote}>
          <span className={styles.shield} aria-hidden="true">
            ♢
          </span>
          <strong>无需登录也可以先体验</strong>
          <small>免费用户每天可先体验 {FREE_PRACTICE_DAILY_LIMIT} 句，登录后可保存记录，同步到所有设备</small>
        </div>
      </section>
    </main>
  );
}
