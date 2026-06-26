"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import styles from "./PasswordlessLoginPageClient.module.css";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const defaultEmailRedirectOrigin = "https://web-english-app.vercel.app";

function isValidEmail(value: string) {
  return emailRegex.test(value);
}

function toUsableOrigin(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const origin = new URL(withProtocol).origin;
    const hostname = new URL(origin).hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("127.") ||
      hostname.endsWith(".local")
    ) {
      return "";
    }

    return origin;
  } catch {
    return "";
  }
}

function getEmailRedirectOrigin() {
  const currentOrigin = toUsableOrigin(
    typeof window === "undefined" ? undefined : window.location.origin
  );
  if (currentOrigin) return currentOrigin;

  const configuredEmailOrigin = toUsableOrigin(
    process.env.NEXT_PUBLIC_EMAIL_REDIRECT_ORIGIN
  );
  if (configuredEmailOrigin) return configuredEmailOrigin;

  const configuredAppOrigin = toUsableOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredAppOrigin) return configuredAppOrigin;

  return defaultEmailRedirectOrigin;
}

function getEmailRedirectTo(callbackUrl: string) {
  const redirectUrl = new URL("/auth/callback", getEmailRedirectOrigin());
  redirectUrl.searchParams.set("callbackUrl", callbackUrl);
  return redirectUrl.toString();
}

export default function PasswordlessLoginPageClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/start";
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "sent">("input");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hasSupabaseCallback =
      window.location.hash.includes("access_token") ||
      window.location.search.includes("code=") ||
      window.location.search.includes("token_hash=");

    if (!hasSupabaseCallback) return;

    let isCancelled = false;
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        console.log("[auth][email.getSession]", {
          error,
          hasSession: Boolean(data.session),
        });

        if (isCancelled) return;

        if (error) {
          setMessage(error.message);
          return;
        }

        if (data.session) {
          window.location.assign(callbackUrl);
        }
      })
      .catch((error) => {
        console.error("[auth][email.getSession.error]", error);
        if (!isCancelled) {
          setMessage(error instanceof Error ? error.message : "邮箱登录失败，请重试。");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [callbackUrl]);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const validEmail = isValidEmail(trimmedEmail);

    console.log("email input:", email);
    console.log("trimmed email:", trimmedEmail);
    console.log("is valid email:", isValidEmail(trimmedEmail));

    if (!validEmail) {
      setMessage("请输入有效邮箱地址。");
      return;
    }

    setIsRequesting(true);
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const emailRedirectTo = getEmailRedirectTo(callbackUrl);
      const { data, error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo,
        },
      });

      console.log("[auth][email.signInWithOtp]", {
        data,
        emailRedirectTo,
        error,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setEmail(trimmedEmail);
      setCode("");
      setStep("sent");
      setMessage("验证码已发送，请检查邮箱。");
    } catch (error) {
      console.error("[auth][email.signInWithOtp.error]", error);
      setMessage(error instanceof Error ? error.message : "邮箱登录失败，请重试。");
    } finally {
      setIsRequesting(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (!isValidEmail(trimmedEmail)) {
      setMessage("请输入有效邮箱地址。");
      setStep("input");
      return;
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      setMessage("请输入 6 位邮箱验证码。");
      return;
    }

    setIsVerifying(true);
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedCode,
        type: "email",
      });

      console.log("[auth][email.verifyOtp]", {
        error,
        hasSession: Boolean(data.session),
        hasUser: Boolean(data.user),
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("登录成功，正在进入 SpeakFlow...");
      window.location.assign(callbackUrl);
    } catch (error) {
      console.error("[auth][email.verifyOtp.error]", error);
      setMessage(error instanceof Error ? error.message : "邮箱验证码验证失败，请重试。");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="邮箱登录">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className={styles.back}
          aria-label="返回登录"
        >
          <span aria-hidden="true">‹</span>
        </Link>
        <span className={styles.handle} aria-hidden="true" />
        <h1>邮箱登录</h1>
        <p>输入邮箱地址，使用验证码继续登录。</p>

        {step === "input" ? (
          <form onSubmit={requestCode} className={styles.form} noValidate>
            <label>
              <span>邮箱地址</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            {message ? <div className={styles.message}>{message}</div> : null}

            <button type="submit" disabled={isRequesting}>
              {isRequesting ? "发送中..." : "发送验证码"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className={styles.form} noValidate>
            {message ? <div className={styles.message}>{message}</div> : null}
            <label>
              <span>邮箱验证码</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="请输入 6 位验证码"
              />
            </label>
            <p className={styles.hint}>
              也可以打开邮箱中的登录邮件，点击链接后继续使用 SpeakFlow。
            </p>

            <button type="submit" disabled={isVerifying}>
              {isVerifying ? "验证中..." : "验证并继续"}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setStep("input");
                setCode("");
                setMessage("");
              }}
            >
              重新填写邮箱
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
