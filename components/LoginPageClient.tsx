"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type LoginPageClientProps = {
  isGoogleEnabled?: boolean;
};

function GoogleMark() {
  return <span aria-hidden="true">G</span>;
}

function AppleMark() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-8 w-8">
      <path
        fill="currentColor"
        d="M18.9 3.1c.1 1.3-.4 2.6-1.2 3.5-.8.9-2.1 1.6-3.3 1.5-.2-1.3.4-2.6 1.1-3.5.8-.9 2.2-1.5 3.4-1.5Zm4.2 18.4c-.7 1.5-1.1 2.1-2 3.4-1.3 1.9-3.1 4.2-5.4 4.2-2 0-2.5-1.2-5.3-1.2-2.7 0-3.4 1.2-5.3 1.2-2.3.1-4-2-5.3-3.9-3.6-5.2-4-11.4-1.8-14.7 1.5-2.3 3.9-3.7 6.1-3.7 2.3 0 3.7 1.2 5.5 1.2 1.8 0 2.9-1.2 5.5-1.2 2 0 4.1 1.1 5.6 2.9-4.9 2.7-4.1 9.7.7 11.8Z"
        transform="translate(2 -1) scale(.78)"
      />
    </svg>
  );
}

function MailMark() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-8 w-8">
      <path
        d="M5.2 7.5h17.6v13H5.2v-13Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.3"
      />
      <path
        d="m5.8 8.4 8.2 6.2 8.2-6.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.3"
      />
    </svg>
  );
}

function UserPlusMark() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-8 w-8">
      <path
        d="M14 14.1a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
      />
      <path
        d="M6.6 23.1c1.1-3.5 3.6-5.5 7.4-5.5 1.3 0 2.5.2 3.5.7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.3"
      />
      <path
        d="M21.6 17.8v6.1M18.6 20.9h6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.3"
      />
    </svg>
  );
}

function ShieldMark() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-7 w-7">
      <path
        d="M14 3.8 22 7v6.3c0 5.1-3.2 9.4-8 11-4.8-1.6-8-5.9-8-11V7l8-3.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.1"
      />
    </svg>
  );
}

export default function LoginPageClient({
  isGoogleEnabled = true,
}: LoginPageClientProps) {
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
  const agreementLead = isChinese
    ? "登录即表示你同意我们的"
    : "By signing in, you agree to our";
  const termsLabel = isChinese ? "用户协议" : "Terms";
  const andLabel = isChinese ? "和" : "and";
  const privacyLabel = isChinese ? "隐私政策" : "Privacy Policy";
  const languageSelectionLabel = isChinese
    ? "返回语言选择"
    : "Back to language selection";

  const loginOptions = [
    ...(isGoogleEnabled
      ? [
          {
            href: "/api/auth/google/start",
            label: googleLabel,
            icon: <GoogleMark />,
            className: "sf-login-google",
          },
        ]
      : []),
    {
      href: "/api/auth/apple/start",
      label: appleLabel,
      icon: <AppleMark />,
      className: "sf-login-apple",
    },
    {
      href: "/login/email",
      label: emailLabel,
      icon: <MailMark />,
      className: "sf-login-email",
    },
    {
      href: "/register",
      label: createLabel,
      icon: <UserPlusMark />,
      className: "sf-login-create-icon",
    },
  ];

  return (
    <main className="responsive-page-shell sf-brand-page sf-login-page relative min-h-[100dvh] w-full overflow-x-hidden">
      <div className="sf-login-wrap relative mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="sf-login-topbar relative z-20 flex items-center justify-between">
          <Link
            href="/languages"
            aria-label={languageSelectionLabel}
            className="sf-login-back"
          >
            <span aria-hidden="true" />
          </Link>
        </div>

        <section className="sf-login-panel relative min-w-0">
          <h1 className="sf-login-title font-[var(--font-sora)] text-2xl font-semibold leading-[1.5] text-[#201833] sm:text-3xl">
            {welcomeLabel}
          </h1>
          <p className="sf-login-subtitle mt-3 text-sm font-medium leading-[1.5] text-[#655b78]">
            {subtitle}
          </p>

          <div className="sf-login-options relative z-10">
            {loginOptions.map((option) => (
              <Link
                key={option.href}
                href={option.href}
                className="sf-login-action group flex min-w-0 w-full items-center font-[var(--font-sora)] text-sm font-semibold transition duration-300 sm:text-base"
              >
                <span className={`sf-auth-icon ${option.className}`}>
                  {option.icon}
                </span>
                <span className="sf-login-action-label">{option.label}</span>
                <span className="sf-login-chevron" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <footer className="sf-login-terms">
          <ShieldMark />
          <span>{agreementLead}</span>
          <a href="#">{termsLabel}</a>
          <span>{andLabel}</span>
          <a href="#">{privacyLabel}</a>
        </footer>
      </div>
    </main>
  );
}
