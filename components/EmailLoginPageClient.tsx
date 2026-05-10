"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function EmailLoginPageClient() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      callbackUrl: "/dashboard",
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      setMessage(t("emailLoginFailed"));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090110] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#120216_0%,#090110_28%,#10031f_58%,#06010d_100%)]" />
      <div className="lux-grid absolute inset-0 opacity-[0.14]" />
      <div className="aurora-wave absolute left-[-8%] top-[-10%] h-[34rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,0,153,0.30),transparent_58%)] blur-[96px]" />
      <div className="aurora-wave absolute right-[-8%] top-[8%] h-[34rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.28),transparent_58%)] blur-[96px]" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
        <section className="w-full max-w-[560px] rounded-[34px] border border-white/12 bg-white/[0.05] px-6 py-8 text-center shadow-[0_30px_90px_rgba(2,8,23,0.46)] backdrop-blur-2xl sm:px-10 sm:py-12">
          <p className="font-[var(--font-sora)] text-xs uppercase tracking-[0.4em] text-cyan-100/65">
            Email Access
          </p>
          <h1 className="mt-6 font-[var(--font-sora)] text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
            {t("emailEntryTitle")}
          </h1>
          <div className="mx-auto mt-6 h-px w-40 bg-gradient-to-r from-transparent via-fuchsia-200/80 to-transparent" />

          <form onSubmit={handleSubmit} className="mt-8 text-left">
            <label className="block font-[var(--font-sora)] text-sm font-medium uppercase tracking-[0.16em] text-white/72">
              {t("emailAddress")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("emailPlaceholder")}
              className="mt-3 w-full rounded-[24px] border border-white/12 bg-black/20 px-5 py-4 text-base text-white outline-none placeholder:text-white/30"
            />

            <label className="mt-5 block font-[var(--font-sora)] text-sm font-medium uppercase tracking-[0.16em] text-white/72">
              {t("password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="mt-3 w-full rounded-[24px] border border-white/12 bg-black/20 px-5 py-4 text-base text-white outline-none placeholder:text-white/30"
            />

            {message ? (
              <p className="mt-4 text-sm text-fuchsia-100">{message}</p>
            ) : null}

            <div className="mt-6 grid gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full border border-fuchsia-300/22 bg-[linear-gradient(90deg,rgba(255,0,153,0.18),rgba(0,245,255,0.12),rgba(255,255,255,0.06))] px-6 py-4 font-[var(--font-sora)] text-lg font-semibold text-white shadow-[0_24px_60px_rgba(255,0,153,0.16)] transition hover:scale-[1.01] disabled:opacity-55"
              >
                {isSubmitting ? `${t("continue")}...` : t("continue")}
              </button>

              <Link
                href="/register"
                className="inline-flex justify-center font-[var(--font-sora)] text-base font-medium tracking-[0.12em] text-white/82 transition hover:text-fuchsia-100"
              >
                {t("createAccount")}
              </Link>

              <Link
                href="/login"
                className="block w-full rounded-full border border-cyan-200/18 bg-white/[0.04] px-6 py-4 text-center font-[var(--font-sora)] text-lg font-semibold text-white transition hover:border-cyan-100/34 hover:bg-white/[0.07]"
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
