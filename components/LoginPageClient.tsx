"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type LoginPageClientProps = {
  isGoogleEnabled?: boolean;
};

export default function LoginPageClient({}: LoginPageClientProps) {
  const { t } = useLanguage();
  const textOutlineStyle: CSSProperties = {
    filter: "none",
    paintOrder: "stroke fill",
    textShadow: "none",
    WebkitFontSmoothing: "antialiased",
    WebkitTextStroke: "0.55px #000",
  };
  const titleOutlineStyle: CSSProperties = {
    filter: "none",
    paintOrder: "stroke fill",
    textShadow: "none",
    WebkitFontSmoothing: "antialiased",
    WebkitTextStroke: "0.85px #000",
  };

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#06020d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(255,255,255,0.20),transparent_28%),radial-gradient(circle_at_12%_17%,rgba(0,229,255,0.42),transparent_38%),radial-gradient(circle_at_88%_19%,rgba(255,33,196,0.38),transparent_34%),linear-gradient(180deg,#180326_0%,#090212_45%,#04010a_100%)]" />
      <div className="lux-grid absolute inset-0 opacity-[0.20]" />
      <div className="aurora-wave absolute left-[-24%] top-[-18%] h-[34rem] w-[44rem] rounded-full bg-[conic-gradient(from_140deg,rgba(0,245,255,0.42),rgba(255,0,199,0.36),rgba(111,77,255,0.32),rgba(0,245,255,0.42))] opacity-85 blur-[86px]" />
      <div className="aurora-wave absolute right-[-44%] top-[22%] h-[34rem] w-[44rem] rounded-full bg-[conic-gradient(from_20deg,rgba(255,255,255,0.18),rgba(255,0,153,0.36),rgba(0,245,255,0.32),rgba(255,255,255,0.18))] opacity-75 blur-[92px]" />
      <div className="hero-glow absolute left-[9%] top-[20%] h-48 w-48 rounded-full bg-cyan-300/24 blur-[76px]" />
      <div className="hero-glow absolute right-[10%] top-[16%] h-56 w-56 rounded-full bg-fuchsia-300/24 blur-[88px]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent)]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section
          className="relative min-w-0 overflow-hidden rounded-[28px] border border-cyan-100/36 bg-[linear-gradient(180deg,rgba(34,23,65,0.94),rgba(13,8,30,0.96)_45%,rgba(5,2,13,0.98))] px-5 py-8 text-center shadow-[0_34px_110px_rgba(0,0,0,0.68),0_0_44px_rgba(0,229,255,0.22),inset_0_1px_0_rgba(255,255,255,0.26)] backdrop-blur-xl sm:rounded-[36px] sm:px-6 sm:py-9"
          style={{ width: "min(100%, 560px)" }}
        >
          <div className="pointer-events-none absolute inset-x-7 top-0 z-0 h-px bg-gradient-to-r from-transparent via-cyan-100/95 to-transparent" />
          <div className="pointer-events-none absolute -left-10 top-8 z-0 h-36 w-36 rounded-full bg-cyan-200/12 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 top-0 z-0 h-44 w-44 rounded-full bg-fuchsia-300/12 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.07)_42%,transparent_56%)] opacity-60" />

          <p
            className="relative z-10 font-[var(--font-sora)] text-xs font-extrabold uppercase tracking-[0.18em] text-white"
            style={textOutlineStyle}
          >
            Access
          </p>
          <h1
            className="relative z-10 mt-5 font-[var(--font-sora)] text-[2.35rem] font-extrabold leading-none tracking-normal text-white sm:text-[2.75rem]"
            style={titleOutlineStyle}
          >
            {t("loginTitle")}
          </h1>
          <div className="relative z-10 mx-auto mt-7 h-px w-44 bg-gradient-to-r from-transparent via-cyan-100 to-transparent shadow-[0_0_18px_rgba(103,232,249,0.75)]" />

          <div className="relative z-10 mt-8 space-y-3.5 sm:mt-10 sm:space-y-4">
            <Link
              href="/api/auth/google/start"
              className="group flex min-w-0 w-full items-center justify-center gap-3 rounded-full border border-white/48 bg-[linear-gradient(90deg,rgba(36,36,51,0.96),rgba(19,15,37,0.96))] px-5 py-3.5 font-[var(--font-sora)] text-sm font-extrabold text-white shadow-[0_18px_44px_rgba(0,0,0,0.46),0_0_26px_rgba(0,229,255,0.22),inset_0_1px_0_rgba(255,255,255,0.22)] transition duration-300 hover:scale-[1.018] hover:border-cyan-100/80 hover:shadow-[0_22px_62px_rgba(0,0,0,0.48),0_0_42px_rgba(0,229,255,0.30)] sm:py-4 sm:text-base"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-extrabold text-[#111111] shadow-[0_0_16px_rgba(255,255,255,0.42)] transition group-hover:scale-105"
                style={textOutlineStyle}
              >
                G
              </span>
              <span style={textOutlineStyle}>谷歌邮箱登录</span>
            </Link>

            <button
              type="button"
              className="group flex min-w-0 w-full items-center justify-center gap-3 rounded-full border border-white/44 bg-[linear-gradient(90deg,rgba(30,30,40,0.96),rgba(12,10,22,0.98))] px-5 py-3.5 font-[var(--font-sora)] text-sm font-extrabold text-white shadow-[0_18px_44px_rgba(0,0,0,0.44),0_0_24px_rgba(255,255,255,0.16),inset_0_1px_0_rgba(255,255,255,0.20)] transition duration-300 hover:scale-[1.018] hover:border-white/76 hover:shadow-[0_22px_62px_rgba(0,0,0,0.48),0_0_34px_rgba(255,255,255,0.22)] sm:py-4 sm:text-base"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-extrabold text-[#111111] shadow-[0_0_16px_rgba(255,255,255,0.36)] transition group-hover:scale-105"
                style={textOutlineStyle}
              >
                A
              </span>
              <span style={textOutlineStyle}>苹果账户登录</span>
            </button>

            <Link
              href="/login/email"
              className="block w-full rounded-full border border-fuchsia-100/42 bg-[linear-gradient(90deg,rgba(36,32,48,0.96),rgba(16,11,28,0.98))] px-5 py-3.5 font-[var(--font-sora)] text-sm font-extrabold text-white shadow-[0_18px_44px_rgba(0,0,0,0.44),0_0_26px_rgba(255,33,196,0.20),inset_0_1px_0_rgba(255,255,255,0.18)] transition duration-300 hover:scale-[1.018] hover:border-fuchsia-100/80 hover:shadow-[0_22px_62px_rgba(0,0,0,0.48),0_0_42px_rgba(255,33,196,0.28)] sm:py-4 sm:text-base"
            >
              <span style={textOutlineStyle}>邮箱登录</span>
            </Link>
          </div>

          <Link
            href="/register"
            className="relative z-10 mt-7 inline-flex font-[var(--font-sora)] text-base font-extrabold tracking-normal text-white underline-offset-4 transition hover:text-cyan-50 hover:underline"
            style={textOutlineStyle}
          >
            {t("createAccount")}
          </Link>
        </section>
      </div>
    </main>
  );
}
