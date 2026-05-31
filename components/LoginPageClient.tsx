"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./LoginPageClient.module.css";

type LoginPageClientProps = {
  isAppleEnabled?: boolean;
  isGoogleEnabled?: boolean;
  isWechatEnabled?: boolean;
  isXEnabled?: boolean;
};

function GoogleMark() {
  return (
    <span className={styles.googleMark} aria-hidden="true">
      G
    </span>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.9 3.1c.1 1.3-.4 2.6-1.2 3.5-.8.9-2.1 1.6-3.3 1.5-.2-1.3.4-2.6 1.1-3.5.8-.9 2.2-1.5 3.4-1.5Zm4.2 18.4c-.7 1.5-1.1 2.1-2 3.4-1.3 1.9-3.1 4.2-5.4 4.2-2 0-2.5-1.2-5.3-1.2-2.7 0-3.4 1.2-5.3 1.2-2.3.1-4-2-5.3-3.9-3.6-5.2-4-11.4-1.8-14.7 1.5-2.3 3.9-3.7 6.1-3.7 2.3 0 3.7 1.2 5.5 1.2 1.8 0 2.9-1.2 5.5-1.2 2 0 4.1 1.1 5.6 2.9-4.9 2.7-4.1 9.7.7 11.8Z"
        transform="translate(2 -1) scale(.78)"
      />
    </svg>
  );
}

function WechatMark() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.2 9.5c-5 0-9 3.2-9 7.2 0 2.2 1.2 4.2 3.2 5.5l-.7 2.4 2.9-1.4c1.1.4 2.3.7 3.6.7 5 0 9-3.2 9-7.2s-4-7.2-9-7.2Zm-3.1 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm7.5 1.5c3.6.6 6.2 3.2 6.2 6.3 0 1.9-1 3.6-2.6 4.7l.6 2.1-2.5-1.2c-.9.3-1.9.5-3 .5-3.7 0-6.9-2.2-7.8-5.1.9.2 1.8.3 2.8.3 5.6 0 10.1-3.4 10.3-7.6Zm-3 6a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm5 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
      />
    </svg>
  );
}

function MailMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 9h18v14H7z" />
      <path d="m8 10 8 6.5L24 10" />
    </svg>
  );
}

function PhoneMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="10" y="5" width="12" height="22" rx="3" />
      <path d="M14 8h4M15 24h2" />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8 7l16 18M24 7 8 25" />
    </svg>
  );
}

function ShieldMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 5 25 8.5v6.7c0 5.3-3.7 9.6-9 11.8-5.3-2.2-9-6.5-9-11.8V8.5L16 5Z" />
      <path d="m12.4 16 2.4 2.4 5-5.2" />
    </svg>
  );
}

export default function LoginPageClient({
  isAppleEnabled = true,
  isGoogleEnabled = true,
  isWechatEnabled = false,
  isXEnabled = false,
}: LoginPageClientProps) {
  const searchParams = useSearchParams();
  const [manualNotice, setManualNotice] = useState("");
  const callbackUrl = searchParams.get("callbackUrl") || "/start";
  const queryNotice =
    searchParams.get("wechat") === "not-configured"
      ? "微信登录暂未配置，请稍后再试。"
      : searchParams.get("x") === "not-configured"
        ? "X 登录暂未配置，请稍后再试。"
        : searchParams.get("apple") === "not-configured"
          ? "Apple 登录暂未配置，请稍后再试。"
          : searchParams.get("google") === "not-configured"
            ? "Google 登录暂未配置，请稍后再试。"
            : "";
  const notice = manualNotice || queryNotice;

  function withCallback(path: string) {
    const params = new URLSearchParams({ callbackUrl });
    return `${path}?${params.toString()}`;
  }

  return (
    <main className={styles.page}>
      <section className={styles.sheet} aria-label="登录 SpeakFlow">
        <span className={styles.handle} aria-hidden="true" />
        <h1>欢迎使用 SpeakFlow <span aria-hidden="true">👋</span></h1>
        <p>选择一种继续方式</p>

        <div className={styles.oauthStack}>
          {isGoogleEnabled ? (
            <Link
              href={withCallback("/api/auth/google/start")}
              className={styles.oauthButton}
            >
              <GoogleMark />
              <span>Google</span>
            </Link>
          ) : (
            <button
              type="button"
              className={styles.oauthButton}
              onClick={() => setManualNotice("Google 登录暂未配置，请稍后再试。")}
            >
              <GoogleMark />
              <span>Google</span>
            </button>
          )}

          {isAppleEnabled ? (
            <Link
              href={withCallback("/api/auth/apple/start")}
              className={styles.oauthButton}
            >
              <AppleMark />
              <span>Apple</span>
            </Link>
          ) : (
            <button
              type="button"
              className={styles.oauthButton}
              onClick={() => setManualNotice("Apple 登录暂未配置，请稍后再试。")}
            >
              <AppleMark />
              <span>Apple</span>
            </button>
          )}

          {isWechatEnabled ? (
            <Link
              href={withCallback("/api/auth/wechat/start")}
              className={styles.oauthButton}
            >
              <span className={styles.wechatIcon}>
                <WechatMark />
              </span>
              <span>微信</span>
            </Link>
          ) : (
            <button
              type="button"
              className={styles.oauthButton}
              onClick={() => setManualNotice("微信登录暂未配置，请稍后再试。")}
            >
              <span className={styles.wechatIcon}>
                <WechatMark />
              </span>
              <span>微信</span>
            </button>
          )}
        </div>

        <div className={styles.moreDivider}>更多方式</div>

        <div className={styles.moreGrid}>
          <Link href={withCallback("/login/email")} className={styles.moreItem}>
            <span>
              <MailMark />
            </span>
            邮箱登录
          </Link>
          <Link href={withCallback("/login/phone")} className={styles.moreItem}>
            <span>
              <PhoneMark />
            </span>
            手机号登录
          </Link>
          {isXEnabled ? (
            <Link href={withCallback("/api/auth/x/start")} className={styles.moreItem}>
              <span>
                <XMark />
              </span>
              X 登录
            </Link>
          ) : (
            <button
              type="button"
              className={styles.moreItem}
              onClick={() => setManualNotice("X 登录暂未配置，请稍后再试。")}
            >
              <span>
                <XMark />
              </span>
              X 登录
            </button>
          )}
        </div>

        {notice ? (
          <div className={styles.notice} role="status">
            {notice}
          </div>
        ) : null}

        <footer className={styles.passwordless}>
          <span>
            <ShieldMark />
          </span>
          <strong>无需设置密码</strong>
          <small>首次登录自动创建账号</small>
        </footer>
      </section>
    </main>
  );
}
