"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./LoginPageClient.module.css";

type LoginPageClientProps = {
  isAppleEnabled?: boolean;
  isGoogleEnabled?: boolean;
};

type OAuthProvider = "apple" | "google";
type SearchParamReader = {
  get(name: string): string | null;
};

const providerLabels: Record<OAuthProvider, string> = {
  apple: "Apple",
  google: "Google",
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
      <path
        d="M7 9h18v14H7z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path
        d="m8 10 8 6.5L24 10"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function BackMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M19 8 11 16l8 8M12 16h14" />
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

function getProviderQueryNotice(
  searchParams: SearchParamReader,
  provider: string,
  label: string
) {
  const state = searchParams.get(provider);

  switch (state) {
    case "not-configured":
      return `${label} 登录暂未配置，请稍后再试。`;
    case "csrf":
      return `${label} 登录安全校验失败，请刷新页面后重试。`;
    case "signin":
      return `${label} 登录启动失败，请重试。`;
    case "exception":
      return `${label} 登录启动时发生异常，请重试。`;
    case "registration-not-completed":
      return "Apple 登录未完成注册，可能是没有授权邮箱或中途取消。请重新发起 Apple 登录并完成授权。";
    case "identity-already-exists":
      return `${label} 账号已绑定到另一个登录身份，请使用原来的登录方式或联系客服处理。`;
    case "user-already-exists":
      return `${label} 返回的邮箱已存在，请使用这个邮箱原来的登录方式。`;
    case "provider-error":
      return `${label} 服务返回错误，请稍后重试。`;
    default:
      return "";
  }
}

function getNextAuthErrorNotice(searchParams: SearchParamReader) {
  const error = searchParams.get("error");
  if (!error) return "";

  switch (error) {
    case "OAuthAccountNotLinked":
      return "这个邮箱已经绑定到另一种登录方式，请使用原来的登录方式。";
    case "OAuthCallback":
    case "Callback":
      return "登录回调失败，请重新尝试。如果是 Apple 登录，请确认已完成邮箱授权。";
    case "AccessDenied":
      return "登录被取消或未授权，请重新尝试。";
    case "Configuration":
      return "登录配置异常，请稍后重试。";
    default:
      return `登录失败：${error}。请重新尝试。`;
  }
}

export default function LoginPageClient({
  isAppleEnabled = true,
  isGoogleEnabled = true,
}: LoginPageClientProps) {
  const searchParams = useSearchParams();
  const [manualNotice, setManualNotice] = useState("");
  const [toast, setToast] = useState("");
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null
  );
  const resetTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const callbackUrl = searchParams.get("callbackUrl") || "/start";
  const sessionNotice =
    searchParams.get("session") === "replaced"
      ? "你的账号已在另一台设备登录，本设备已退出。"
      : "";
  const queryNotice =
    getProviderQueryNotice(searchParams, "apple", "Apple") ||
    getProviderQueryNotice(searchParams, "google", "Google") ||
    getNextAuthErrorNotice(searchParams);
  const notice = manualNotice || sessionNotice || queryNotice;

  function withCallback(path: string) {
    const params = new URLSearchParams({ callbackUrl });
    return `${path}?${params.toString()}`;
  }

  const clearPendingResetTimer = useCallback(() => {
    if (resetTimerRef.current === null) return;
    window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }, []);

  const resetPendingProvider = useCallback(() => {
    clearPendingResetTimer();
    setPendingProvider(null);
  }, [clearPendingResetTimer]);

  useEffect(() => {
    const resetFromPageLifecycle = () => {
      resetPendingProvider();
    };
    const resetFromVisibility = () => {
      if (document.visibilityState === "visible") {
        resetPendingProvider();
      }
    };

    window.addEventListener("pageshow", resetFromPageLifecycle);
    window.addEventListener("focus", resetFromPageLifecycle);
    document.addEventListener("visibilitychange", resetFromVisibility);

    return () => {
      clearPendingResetTimer();
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      window.removeEventListener("pageshow", resetFromPageLifecycle);
      window.removeEventListener("focus", resetFromPageLifecycle);
      document.removeEventListener("visibilitychange", resetFromVisibility);
    };
  }, [clearPendingResetTimer, resetPendingProvider]);

  function showToast(message: string) {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
      toastTimerRef.current = null;
    }, 2600);
  }

  function startOAuth(provider: OAuthProvider, path: string) {
    if (pendingProvider) return;

    const startUrl = withCallback(path);
    setManualNotice("");
    setPendingProvider(provider);

    try {
      window.location.href = startUrl;
    } catch (error) {
      console.error("[auth][oauth.redirectFailed]", {
        error,
        provider,
        startUrl,
      });
      setManualNotice(`${providerLabels[provider]} 登录跳转失败，请重试。`);
      setPendingProvider(null);
    } finally {
      clearPendingResetTimer();
      resetTimerRef.current = window.setTimeout(() => {
        if (document.visibilityState !== "hidden") {
          setPendingProvider((current) =>
            current === provider ? null : current
          );
        }
      }, 8000);
    }
  }

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.backButton} aria-label="返回首页">
        <BackMark />
      </Link>
      <section className={styles.card} aria-label="登录 SpeakFlow">
        <h1>登录 SpeakFlow</h1>
        <p>选择一种登录方式，继续保存练习记录、表达库和订阅状态。</p>

        <div className={styles.oauthStack}>
          {isAppleEnabled ? (
            <button
              type="button"
              className={styles.oauthButton}
              aria-busy={pendingProvider === "apple"}
              disabled={Boolean(pendingProvider)}
              onClick={() => startOAuth("apple", "/api/auth/apple/start")}
            >
              <span className={styles.providerIcon}>
                <AppleMark />
              </span>
              <span className={styles.providerLabel}>
                {pendingProvider === "apple"
                  ? "正在打开 Apple..."
                  : "Apple 登录"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.oauthButton}
              disabled={Boolean(pendingProvider)}
              onClick={() => setManualNotice("Apple 登录暂未配置，请稍后再试。")}
            >
              <span className={styles.providerIcon}>
                <AppleMark />
              </span>
              <span className={styles.providerLabel}>Apple 登录</span>
            </button>
          )}

          <button
            type="button"
            className={styles.oauthButton}
            disabled={Boolean(pendingProvider)}
            onClick={() => showToast("微信登录正在开发中，敬请期待。")}
          >
            <span className={`${styles.providerIcon} ${styles.wechatIcon}`}>
              <WechatMark />
            </span>
            <span className={styles.providerLabel}>微信登录</span>
            <span className={styles.badge}>即将上线</span>
          </button>

          {isGoogleEnabled ? (
            <button
              type="button"
              className={styles.oauthButton}
              aria-busy={pendingProvider === "google"}
              disabled={Boolean(pendingProvider)}
              onClick={() => startOAuth("google", "/api/auth/google/start")}
            >
              <span className={styles.providerIcon}>
                <GoogleMark />
              </span>
              <span className={styles.providerLabel}>
                {pendingProvider === "google"
                  ? "正在打开 Google..."
                  : "Google 登录"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.oauthButton}
              disabled={Boolean(pendingProvider)}
              onClick={() => setManualNotice("Google 登录暂未配置，请稍后再试。")}
            >
              <span className={styles.providerIcon}>
                <GoogleMark />
              </span>
              <span className={styles.providerLabel}>Google 登录</span>
            </button>
          )}

          <Link href={withCallback("/login/email")} className={styles.oauthButton}>
            <span className={styles.providerIcon}>
              <MailMark />
            </span>
            <span className={styles.providerLabel}>邮箱登录</span>
          </Link>
        </div>

        {notice ? (
          <div className={styles.notice} role="status">
            {notice}
          </div>
        ) : null}

        <footer className={styles.footerNote}>
          <ShieldMark />
          <span>无需设置密码，首次登录自动创建账号。</span>
        </footer>
      </section>

      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
