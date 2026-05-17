"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

const REGISTER_DRAFT_STORAGE_KEY = "english-app-register-draft";

function loadRegisterDraft() {
  if (typeof window === "undefined") {
    return { email: "", password: "", confirmPassword: "" };
  }

  try {
    const rawDraft = window.sessionStorage.getItem(REGISTER_DRAFT_STORAGE_KEY);
    if (!rawDraft) return { email: "", password: "", confirmPassword: "" };

    const draft = JSON.parse(rawDraft) as {
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    return {
      email: typeof draft.email === "string" ? draft.email : "",
      password: typeof draft.password === "string" ? draft.password : "",
      confirmPassword:
        typeof draft.confirmPassword === "string" ? draft.confirmPassword : "",
    };
  } catch {
    window.sessionStorage.removeItem(REGISTER_DRAFT_STORAGE_KEY);
    return { email: "", password: "", confirmPassword: "" };
  }
}

export default function RegisterPageClient() {
  const { t } = useLanguage();
  const [email, setEmail] = useState(() => loadRegisterDraft().email);
  const [password, setPassword] = useState(() => loadRegisterDraft().password);
  const [confirmPassword, setConfirmPassword] = useState(
    () => loadRegisterDraft().confirmPassword
  );
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        REGISTER_DRAFT_STORAGE_KEY,
        JSON.stringify({ email, password, confirmPassword })
      );
    } catch {
      // Ignore storage failures so typing never gets interrupted on mobile.
    }
  }, [email, password, confirmPassword]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setMessage(t("emailRequired"));
      return;
    }

    if (password.trim().length < 6) {
      setMessage(t("passwordRequired"));
      return;
    }

    if (password !== confirmPassword) {
      setMessage(t("passwordMismatch"));
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
      }),
    });

    const result = (await response.json().catch(() => null)) as
      | { error?: string; ok?: boolean }
      | null;

    if (!response.ok) {
      setIsSubmitting(false);
      if (result?.error === "USER_EXISTS") {
        setMessage(t("userExists"));
        return;
      }

      setMessage(t("emailRegisterFailed"));
      return;
    }

    setIsSubmitting(false);
    window.sessionStorage.removeItem(REGISTER_DRAFT_STORAGE_KEY);
    window.location.assign(
      `/login/email?registered=1&email=${encodeURIComponent(normalizedEmail)}`
    );
  }

  return (
    <main className="responsive-page-shell sf-brand-page relative min-h-[100dvh] overflow-x-hidden">
      <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl items-start justify-center px-6 py-6 sm:items-center sm:py-10">
        <section className="sf-brand-glass w-full max-w-[560px] rounded-[34px] px-6 py-8 text-center sm:px-10 sm:py-12">
          <p className="font-[var(--font-sora)] text-xs font-semibold uppercase tracking-[0.28em] text-[#6d55ef]">
            New Account
          </p>
          <h1 className="mt-6 font-[var(--font-sora)] text-4xl font-semibold tracking-[-0.04em] text-[#201833] sm:text-5xl">
            {t("registerTitle")}
          </h1>
          <div className="sf-brand-hairline mx-auto mt-6 w-40" />

          <form onSubmit={handleSubmit} noValidate className="mt-8 text-left">
            <label className="block font-[var(--font-sora)] text-sm font-semibold uppercase tracking-[0.14em] text-[#655b78]">
              {t("emailAddress")}
            </label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("emailPlaceholder")}
              className="sf-brand-input mt-3 w-full rounded-[24px] px-5 py-4 text-base outline-none focus:border-[#5b8cff]/36"
            />

            <label className="mt-5 block font-[var(--font-sora)] text-sm font-semibold uppercase tracking-[0.14em] text-[#655b78]">
              {t("password")}
            </label>
            <input
              name="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="sf-brand-input mt-3 w-full rounded-[24px] px-5 py-4 text-base outline-none focus:border-[#5b8cff]/36"
            />

            <label className="mt-5 block font-[var(--font-sora)] text-sm font-semibold uppercase tracking-[0.14em] text-[#655b78]">
              {t("confirmPassword")}
            </label>
            <input
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t("confirmPasswordPlaceholder")}
              className="sf-brand-input mt-3 w-full rounded-[24px] px-5 py-4 text-base outline-none focus:border-[#5b8cff]/36"
            />

            {message ? (
              <p className="mt-4 text-sm font-medium text-[#6d55ef]">{message}</p>
            ) : null}

            <div className="mt-6 grid gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="sf-brand-primary w-full rounded-full px-6 py-4 font-[var(--font-sora)] text-lg font-semibold transition hover:scale-[1.01] disabled:opacity-55"
              >
                {isSubmitting ? `${t("register")}...` : t("register")}
              </button>

              <Link
                href="/login/email"
                className="sf-brand-button block w-full rounded-full px-6 py-4 text-center font-[var(--font-sora)] text-lg font-semibold transition hover:scale-[1.01]"
              >
                {t("back")}
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
