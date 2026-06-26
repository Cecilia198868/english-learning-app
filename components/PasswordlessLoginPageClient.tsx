"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import styles from "./PasswordlessLoginPageClient.module.css";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string) {
  return emailRegex.test(value);
}

function getEmailRedirectTo(callbackUrl: string) {
  const redirectUrl = new URL("/login/email", window.location.origin);
  redirectUrl.searchParams.set("callbackUrl", callbackUrl);
  return redirectUrl.toString();
}

export default function PasswordlessLoginPageClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/start";
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [step, setStep] = useState<"input" | "sent">("input");
  const [isRequesting, setIsRequesting] = useState(false);
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

      setStep("sent");
      setMessage("验证码已发送，请检查邮箱。");
    } catch (error) {
      console.error("[auth][email.signInWithOtp.error]", error);
      setMessage(error instanceof Error ? error.message : "邮箱登录失败，请重试。");
    } finally {
      setIsRequesting(false);
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
          <div className={styles.form}>
            {message ? <div className={styles.message}>{message}</div> : null}
            <p className={styles.hint}>
              请打开邮箱中的登录邮件，点击链接后继续使用 SpeakFlow。
            </p>

            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setStep("input");
                setMessage("");
              }}
            >
              重新填写邮箱
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
