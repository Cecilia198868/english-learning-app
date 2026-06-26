"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import styles from "./PasswordlessLoginPageClient.module.css";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailStartResponse = {
  emailRedirectTo?: string;
  error?: string;
  ok?: boolean;
};

function isValidEmail(value: string) {
  return emailRegex.test(value);
}

async function readEmailStartResponse(response: Response) {
  try {
    return (await response.json()) as EmailStartResponse;
  } catch {
    return {};
  }
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
      const navigatorWithStandalone = window.navigator as Navigator & {
        standalone?: boolean;
      };

      console.log("[auth][email.start.click]", {
        callbackUrl,
        locationOrigin: window.location.origin,
        standalone:
          window.matchMedia("(display-mode: standalone)").matches ||
          Boolean(navigatorWithStandalone.standalone),
      });

      const response = await fetch("/api/email-auth/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callbackUrl,
          email: trimmedEmail,
        }),
        cache: "no-store",
      });
      const result = await readEmailStartResponse(response);

      console.log("[auth][email.start.response]", {
        emailRedirectTo: result.emailRedirectTo,
        error: result.error,
        ok: result.ok,
        status: response.status,
      });

      if (!response.ok || !result.ok) {
        setMessage(result.error || "邮箱验证码发送失败，请重试。");
        return;
      }

      setEmail(trimmedEmail);
      setCode("");
      setStep("sent");
      setMessage("验证码已发送，请检查邮箱。");
    } catch (error) {
      console.error("[auth][email.start.error]", error);
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
