"use client";

import { getSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./LoginPageClient.module.css";

type LoginPageClientProps = {
  isAppleEnabled?: boolean;
  isGoogleEnabled?: boolean;
  isWechatEnabled?: boolean;
  isXEnabled?: boolean;
};

type OAuthProvider = "apple" | "google";
type SearchParamReader = {
  get(name: string): string | null;
};

const productionAuthOrigin = "https://web-english-app.vercel.app";
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

function getLoginEnvironment() {
  if (typeof window === "undefined") {
    return {
      browser: "server",
      isMobile: false,
      mode: "server",
      standalone: false,
      userAgent: "",
    };
  }

  const userAgent = navigator.userAgent;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const browser = /CriOS/i.test(userAgent)
    ? "chrome-ios"
    : /Chrome|Chromium|Edg/i.test(userAgent)
      ? "chrome"
      : /Safari/i.test(userAgent)
        ? "safari"
        : "other";

  return {
    browser,
    isMobile,
    mode: standalone ? "standalone" : "browser",
    standalone,
    userAgent,
  };
}

function buildRedirectTo(callbackUrl: string) {
  try {
    const redirectUrl = new URL(callbackUrl, productionAuthOrigin);
    if (redirectUrl.origin !== productionAuthOrigin) {
      return new URL("/start", productionAuthOrigin).toString();
    }

    return redirectUrl.toString();
  } catch {
    return new URL("/start", productionAuthOrigin).toString();
  }
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
  isWechatEnabled = false,
  isXEnabled = false,
}: LoginPageClientProps) {
  const searchParams = useSearchParams();
  const [manualNotice, setManualNotice] = useState("");
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null
  );
  const resetTimerRef = useRef<number | null>(null);
  const callbackUrl = searchParams.get("callbackUrl") || "/start";
  const searchParamsString = searchParams.toString();
  const sessionNotice =
    searchParams.get("session") === "replaced"
      ? "你的账号已在另一台设备登录，本设备已退出。"
      : "";
  const queryNotice =
    getProviderQueryNotice(searchParams, "wechat", "微信") ||
    getProviderQueryNotice(searchParams, "x", "X") ||
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

  const resetPendingProvider = useCallback((reason: string) => {
    clearPendingResetTimer();
    setPendingProvider((current) => {
      if (current) {
        console.log("[auth][mobile.pendingReset]", {
          provider: current,
          reason,
        });
      }

      return null;
    });
  }, [clearPendingResetTimer]);

  function startOAuth(provider: OAuthProvider, path: string) {
    if (pendingProvider) {
      console.warn("[auth][mobile.clickIgnoredWhilePending]", {
        pendingProvider,
        provider,
      });
      return;
    }

    const startUrl = withCallback(path);
    const redirectTo = buildRedirectTo(callbackUrl);
    const environment = getLoginEnvironment();

    setManualNotice("");
    setPendingProvider(provider);

    console.log("[auth][mobile.click]", {
      callbackUrl,
      environment,
      provider,
      redirectTo,
      startUrl,
    });

    try {
      console.log("[auth][mobile.signInWithOAuth.execute]", {
        note: "This app uses NextAuth OAuth start route instead of Supabase Auth signInWithOAuth.",
        provider,
        redirectTo,
      });
      window.location.href = startUrl;
      console.log("[auth][mobile.enteringRedirect]", {
        provider,
        startUrl,
      });
    } catch (error) {
      console.error("[auth][mobile.redirectError]", {
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
          console.warn("[auth][mobile.redirectTimeoutReset]", {
            provider,
            startUrl,
          });
          setPendingProvider((current) =>
            current === provider ? null : current
          );
        }
      }, 8000);
    }
  }

  useEffect(() => {
    const params = Object.fromEntries(
      new URLSearchParams(searchParamsString).entries()
    );

    console.log("[auth][loginPage.urlParams]", {
      environment: getLoginEnvironment(),
      params,
    });

    getSession()
      .then((session) => {
        console.log("[auth][loginPage.getSession]", {
          hasSession: Boolean(session),
          hasUser: Boolean(session?.user),
          userEmail: session?.user?.email || null,
        });
      })
      .catch((error) => {
        console.error("[auth][loginPage.getSessionError]", { error });
      });
  }, [searchParamsString]);

  useEffect(() => {
    const resetFromPageLifecycle = () => {
      resetPendingProvider("page-visible-or-restored");
    };
    const resetFromVisibility = () => {
      if (document.visibilityState === "visible") {
        resetPendingProvider("visibilitychange-visible");
      }
    };

    window.addEventListener("pageshow", resetFromPageLifecycle);
    window.addEventListener("focus", resetFromPageLifecycle);
    document.addEventListener("visibilitychange", resetFromVisibility);

    return () => {
      clearPendingResetTimer();
      window.removeEventListener("pageshow", resetFromPageLifecycle);
      window.removeEventListener("focus", resetFromPageLifecycle);
      document.removeEventListener("visibilitychange", resetFromVisibility);
    };
  }, [clearPendingResetTimer, resetPendingProvider]);

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.backButton} aria-label="返回首页">
        <BackMark />
      </Link>
      <section className={styles.card} aria-label="登录 SpeakFlow">
        <h1>欢迎使用 SpeakFlow <span aria-hidden="true">👋</span></h1>
        <p>选择一种继续方式</p>

        <div className={styles.oauthStack}>
          {isGoogleEnabled ? (
            <button
              type="button"
              className={styles.oauthButton}
              aria-busy={pendingProvider === "google"}
              disabled={Boolean(pendingProvider)}
              onClick={() => startOAuth("google", "/api/auth/google/start")}
            >
              <GoogleMark />
              <span>{pendingProvider === "google" ? "Google..." : "Google"}</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.oauthButton}
              disabled={Boolean(pendingProvider)}
              onClick={() => setManualNotice("Google 登录暂未配置，请稍后再试。")}
            >
              <GoogleMark />
              <span>Google</span>
            </button>
          )}

          {isAppleEnabled ? (
            <button
              type="button"
              className={styles.oauthButton}
              aria-busy={pendingProvider === "apple"}
              disabled={Boolean(pendingProvider)}
              onClick={() => startOAuth("apple", "/api/auth/apple/start")}
            >
              <AppleMark />
              <span>{pendingProvider === "apple" ? "Apple..." : "Apple"}</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.oauthButton}
              disabled={Boolean(pendingProvider)}
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
