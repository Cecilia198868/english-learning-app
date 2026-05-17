"use client";

import Link from "next/link";
import Image from "next/image";
import LogoutButton from "@/components/LogoutButton";
import { useLanguage } from "@/components/LanguageProvider";

type EnglishDashboardClientProps = {
  userEmail: string;
  userImage: string;
};

export default function EnglishDashboardClient({
  userEmail,
  userImage,
}: EnglishDashboardClientProps) {
  const { t } = useLanguage();
  const quickActionCards = t("quickActionCards") as string[];

  return (
    <main className="responsive-page-shell min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div className="mx-auto min-h-screen max-w-5xl px-6 py-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userEmail}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl font-semibold">
                  {(userEmail || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">
                  {t("dashboard")}
                </p>
                <h1 className="mt-2 text-3xl font-semibold">
                  {t("welcomeBack")}
                </h1>
                <p className="mt-2 text-sm text-white/60">
                  {userEmail || t("signedInUser")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium hover:bg-white/15"
              >
                {t("goHome")}
              </Link>
              <LogoutButton />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">
              {t("learningWorkspace")}
            </p>
            <p className="mt-4 max-w-xl text-base leading-8 text-white/75">
              {t("languageIntro")}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Link
                href="/dashboard"
                className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-left hover:bg-white/8"
              >
                <div className="text-lg font-semibold">{quickActionCards[0]}</div>
              </Link>
              <Link
                href="/speak-english"
                className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-left hover:bg-white/8"
              >
                <div className="text-lg font-semibold">{quickActionCards[1]}</div>
              </Link>
              <Link
                href="/vocabulary"
                className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-left hover:bg-white/8"
              >
                <div className="text-lg font-semibold">{quickActionCards[2]}</div>
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">
              {t("savedLanguage")}
            </p>
            <div className="mt-4 rounded-[1.5rem] bg-black/20 p-5">
              <p className="text-sm text-white/50">{t("currentLanguage")}</p>
              <p className="mt-2 text-2xl font-semibold">{t("english")}</p>
              <p className="mt-4 text-sm leading-7 text-white/65">
                {t("savedLanguageHint")}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
