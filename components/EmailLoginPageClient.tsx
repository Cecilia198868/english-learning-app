"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function EmailLoginPageClient() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(() =>
    searchParams.get("registered") === "1"
      ? "Account created. Please sign in with your password."
      : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const registeredEmail = searchParams.get("email");
    window.setTimeout(() => {
      if (registeredEmail) {
        setEmail(registeredEmail);
      }

      if (searchParams.get("registered") === "1") {
        setMessage("Account created. Please sign in with your password.");
      }
    }, 0);
  }, [searchParams]);

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

    setIsSubmitting(true);
    setMessage("");

    const result = await signIn("email-login", {
      email: normalizedEmail,
      password,
      redirect: false,
      callbackUrl: "/speak-english",
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      setMessage(t("emailLoginFailed"));
      return;
    }

    window.location.assign("/speak-english");
  }

  return (
    <main className="responsive-page-shell sf-brand-page relative min-h-[100dvh] overflow-x-hidden">
      <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl items-start justify-center px-6 py-6 sm:items-center sm:py-10">
        <section className="sf-brand-glass w-full max-w-[560px] rounded-[34px] px-6 py-8 text-center sm:px-10 sm:py-12">
          <p className="font-[var(--font-sora)] text-xs font-semibold uppercase tracking-[0.28em] text-[#6d55ef]">
            Email Access
          </p>
          <h1 className="mt-6 font-[var(--font-sora)] text-4xl font-semibold tracking-[-0.04em] text-[#201833] sm:text-5xl">
            {t("emailEntryTitle")}
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
              name="current-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("passwordPlaceholder")}
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
                {isSubmitting ? `${t("continue")}...` : t("continue")}
              </button>

              <Link
                href="/register"
                className="inline-flex justify-center font-[var(--font-sora)] text-base font-semibold tracking-[0.08em] text-[#6d55ef] transition hover:text-[#4f8dff]"
              >
                {t("createAccount")}
              </Link>

              <Link
                href="/login"
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
