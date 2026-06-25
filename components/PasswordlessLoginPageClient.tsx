"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./PasswordlessLoginPageClient.module.css";

type RequestResponse = {
  devCode?: string;
  error?: string;
  message?: string;
  ok?: boolean;
};

export default function PasswordlessLoginPageClient() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/start";
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const targetValue = useMemo(() => email.trim().toLowerCase(), [email]);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRequesting(true);
    setMessage("");

    const response = await fetch("/api/auth/email-code/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetValue }),
    });
    const data = (await response.json().catch(() => ({}))) as RequestResponse;
    setIsRequesting(false);

    if (!response.ok || !data.ok) {
      setMessage(data.error || "请输入有效邮箱地址。");
      return;
    }

    setStep("verify");
    setCode(data.devCode || "");
    setMessage(data.message || "验证码已发送，请检查邮箱。");
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsVerifying(true);
    setMessage("");

    const result = await signIn("email-code", {
      callbackUrl,
      code,
      email: targetValue,
      redirect: false,
    });
    setIsVerifying(false);

    if (!result || result.error) {
      setMessage("验证码不正确或已过期，请重新获取。");
      return;
    }

    window.location.assign(result.url || callbackUrl);
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="Email login">
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className={styles.back}
          aria-label="返回登录"
        >
          <span aria-hidden="true">‹</span>
        </Link>
        <span className={styles.handle} aria-hidden="true" />
        <h1>Email Login</h1>
        <p>Enter your email address and continue with a verification code.</p>

        {step === "input" ? (
          <form onSubmit={requestCode} className={styles.form} noValidate>
            <label>
              <span>Email address</span>
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
              {isRequesting ? "Sending..." : "Send verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className={styles.form} noValidate>
            <label>
              <span>Verification code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit code"
              />
            </label>

            {message ? <div className={styles.message}>{message}</div> : null}

            <button type="submit" disabled={isVerifying}>
              {isVerifying ? "Verifying..." : "Verify and continue"}
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
              Edit email
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
