"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./PasswordlessLoginPageClient.module.css";

type PasswordlessLoginPageClientProps = {
  mode: "email" | "phone";
};

type RequestResponse = {
  devCode?: string;
  error?: string;
  message?: string;
  ok?: boolean;
};

const countryCodes = [
  { label: "中国 +86", value: "+86" },
  { label: "美国 +1", value: "+1" },
  { label: "英国 +44", value: "+44" },
  { label: "加拿大 +1", value: "+1" },
  { label: "澳大利亚 +61", value: "+61" },
];

export default function PasswordlessLoginPageClient({
  mode,
}: PasswordlessLoginPageClientProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/start";
  const isEmail = mode === "email";
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [countryCode, setCountryCode] = useState("+86");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("");

  const title = isEmail ? "邮箱登录" : "手机号登录";
  const subtitle = isEmail
    ? "输入邮箱，使用验证码继续登录。"
    : "选择国家区号，输入手机号，使用短信验证码继续登录。";
  const targetLabel = isEmail ? "邮箱地址" : "手机号";
  const targetValue = useMemo(
    () => (isEmail ? email.trim().toLowerCase() : phone.trim()),
    [email, isEmail, phone]
  );

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRequesting(true);
    setMessage("");

    const response = await fetch(
      isEmail ? "/api/auth/email-code/request" : "/api/auth/phone-code/request",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEmail
            ? { email: targetValue }
            : { countryCode, phone: targetValue }
        ),
      }
    );
    const data = (await response.json().catch(() => ({}))) as RequestResponse;
    setIsRequesting(false);

    if (!response.ok || !data.ok) {
      setMessage(data.error || (isEmail ? "请输入有效邮箱地址。" : "请输入有效手机号。"));
      return;
    }

    setStep("verify");
    setCode(data.devCode || "");
    setMessage(data.message || "验证码已发送。");
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsVerifying(true);
    setMessage("");

    const result = await signIn(isEmail ? "email-code" : "phone-code", {
      callbackUrl,
      code,
      countryCode,
      email: targetValue,
      phone: targetValue,
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
      <section className={styles.panel} aria-label={title}>
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className={styles.back}>
          ‹
        </Link>
        <span className={styles.handle} aria-hidden="true" />
        <h1>{title}</h1>
        <p>{subtitle}</p>

        {step === "input" ? (
          <form onSubmit={requestCode} className={styles.form} noValidate>
            {!isEmail ? (
              <label>
                <span>国家区号</span>
                <select
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                >
                  {countryCodes.map((item) => (
                    <option key={`${item.label}-${item.value}`} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label>
              <span>{targetLabel}</span>
              <input
                type={isEmail ? "email" : "tel"}
                inputMode={isEmail ? "email" : "tel"}
                autoComplete={isEmail ? "email" : "tel"}
                value={isEmail ? email : phone}
                onChange={(event) =>
                  isEmail ? setEmail(event.target.value) : setPhone(event.target.value)
                }
                placeholder={isEmail ? "you@example.com" : "请输入手机号"}
              />
            </label>

            {message ? <div className={styles.message}>{message}</div> : null}

            <button type="submit" disabled={isRequesting}>
              {isRequesting ? "发送中..." : "发送验证码"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className={styles.form} noValidate>
            <label>
              <span>验证码</span>
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

            {message ? <div className={styles.message}>{message}</div> : null}

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
              重新填写
            </button>
          </form>
        )}

        <footer className={styles.footer}>
          无需设置密码，验证成功后自动创建账号并登录。
        </footer>
      </section>
    </main>
  );
}
