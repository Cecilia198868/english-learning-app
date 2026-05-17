"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type LoginPageClientProps = {
  isGoogleEnabled?: boolean;
};

export default function LoginPageClient({}: LoginPageClientProps) {
  const { language, t } = useLanguage();
  const isChinese = language === "zh-CN";
  const welcomeLabel = isChinese ? "欢迎回来" : t("welcomeBack");
  const subtitle = isChinese
    ? "继续你的英语口语练习"
    : "Continue your English speaking practice.";
  const googleLabel = isChinese ? "Google 登录" : t("signInWithGoogle");
  const appleLabel = isChinese ? "Apple 登录" : "Sign in with Apple";
  const emailLabel = isChinese ? "邮箱登录" : t("signInWithEmail");
  const createLabel = isChinese ? "创建账号" : "Create Account";

  return (
    <main className="responsive-page-shell sf-brand-page relative min-h-[100dvh] w-full overflow-x-hidden">
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section
          className="sf-brand-glass relative min-w-0 overflow-hidden rounded-[32px] px-5 py-8 text-center sm:rounded-[38px] sm:px-7 sm:py-10"
          style={{ width: "min(100%, 560px)" }}
        >
          <div className="sf-brand-hairline pointer-events-none absolute inset-x-10 top-0" />

          <h1 className="text-left font-[var(--font-sora)] text-2xl font-semibold leading-tight text-[#201833] sm:text-3xl">
            {welcomeLabel}
          </h1>
          <p className="mt-3 text-left text-sm font-medium leading-6 text-[#655b78]">
            {subtitle}
          </p>

          <div className="relative z-10 mt-7 space-y-3.5 sm:space-y-4">
            <Link
              href="/api/auth/google/start"
              className="sf-brand-primary group flex min-w-0 w-full items-center justify-center gap-3 rounded-full px-5 py-3.5 font-[var(--font-sora)] text-sm font-semibold transition duration-300 hover:scale-[1.01] sm:py-4 sm:text-base"
            >
              <span className="sf-auth-icon flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold shadow-[0_8px_18px_rgba(84,72,146,0.14)]">
                G
              </span>
              <span>{googleLabel}</span>
            </Link>

            <Link
              href="/api/auth/apple/start"
              className="sf-brand-button group flex min-w-0 w-full items-center justify-center gap-3 rounded-full px-5 py-3.5 font-[var(--font-sora)] text-sm font-semibold transition duration-300 hover:scale-[1.01] sm:py-4 sm:text-base"
            >
              <span className="sf-auth-icon flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold shadow-[0_8px_18px_rgba(84,72,146,0.14)]">
                A
              </span>
              <span>{appleLabel}</span>
            </Link>

            <Link
              href="/login/email"
              className="sf-brand-button block w-full rounded-full px-5 py-3.5 font-[var(--font-sora)] text-sm font-semibold transition duration-300 hover:scale-[1.01] sm:py-4 sm:text-base"
            >
              {emailLabel}
            </Link>
          </div>

          <Link
            href="/register"
            className="relative z-10 mt-7 inline-flex font-[var(--font-sora)] text-base font-semibold tracking-normal text-[#6d55ef] underline-offset-4 transition hover:text-[#4f8dff] hover:underline"
          >
            {createLabel}
          </Link>
        </section>
      </div>
    </main>
  );
}
