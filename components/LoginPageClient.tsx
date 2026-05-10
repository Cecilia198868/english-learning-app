"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

type LoginPageClientProps = {
  isGoogleEnabled: boolean;
};

export default function LoginPageClient({
  isGoogleEnabled,
}: LoginPageClientProps) {
  const { t } = useLanguage();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090110] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#120216_0%,#090110_28%,#10031f_58%,#06010d_100%)]" />
      <div className="lux-grid absolute inset-0 opacity-[0.14]" />
      <div className="aurora-wave absolute left-[-8%] top-[-10%] h-[34rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,0,153,0.30),transparent_58%)] blur-[96px]" />
      <div className="aurora-wave absolute right-[-8%] top-[8%] h-[34rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.28),transparent_58%)] blur-[96px]" />
      <div className="hero-glow absolute left-[16%] top-[24%] h-44 w-44 rounded-full bg-fuchsia-400/14 blur-[90px]" />
      <div className="hero-glow absolute right-[18%] top-[18%] h-56 w-56 rounded-full bg-cyan-300/14 blur-[110px]" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
        <section className="w-full max-w-[560px] rounded-[34px] border border-white/12 bg-white/[0.05] px-6 py-8 text-center shadow-[0_30px_90px_rgba(2,8,23,0.46)] backdrop-blur-2xl sm:px-10 sm:py-12">
          <p className="font-[var(--font-sora)] text-xs uppercase tracking-[0.4em] text-cyan-100/65">
            Access
          </p>
          <h1 className="mt-6 font-[var(--font-sora)] text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
            {t("loginTitle")}
          </h1>
          <div className="mx-auto mt-6 h-px w-40 bg-gradient-to-r from-transparent via-fuchsia-200/80 to-transparent" />

          <div className="mt-10 space-y-4">
            {isGoogleEnabled ? (
              <button
                type="button"
                onClick={() => {
                  void signIn("google", { callbackUrl: "/dashboard" });
                }}
                className="w-full rounded-full border border-white/14 bg-[linear-gradient(90deg,rgba(255,0,153,0.18),rgba(0,245,255,0.12),rgba(255,255,255,0.06))] px-6 py-4 font-[var(--font-sora)] text-lg font-semibold text-white shadow-[0_24px_60px_rgba(255,0,153,0.16)] transition hover:scale-[1.01] hover:border-fuchsia-200/30"
              >
                {t("signInWithGoogle")}
              </button>
            ) : null}

            <Link
              href="/login/email"
              className="block w-full rounded-full border border-cyan-200/18 bg-[linear-gradient(90deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] px-6 py-4 font-[var(--font-sora)] text-lg font-semibold text-white shadow-[0_24px_60px_rgba(0,245,255,0.10)] transition hover:scale-[1.01] hover:border-cyan-100/34"
            >
              {t("signInWithEmail")}
            </Link>
          </div>

          <Link
            href="/register"
            className="mt-6 inline-flex font-[var(--font-sora)] text-base font-medium tracking-[0.12em] text-white/82 transition hover:text-fuchsia-100"
          >
            {t("createAccount")}
          </Link>
        </section>
      </div>
    </main>
  );
}
