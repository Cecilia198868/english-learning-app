"use client";

import { signOut } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

export default function LogoutButton() {
  const { t } = useLanguage();

  return (
    <button
      onClick={() => void signOut({ callbackUrl: "/" })}
      className="rounded-[18px] border border-fuchsia-300/28 bg-[linear-gradient(180deg,rgba(83,58,145,0.44),rgba(56,37,99,0.34))] px-4 py-2.5 font-[var(--font-sora)] text-sm font-semibold text-white/92 shadow-[0_0_0_1px_rgba(188,92,255,0.10),0_0_16px_rgba(139,92,246,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(188,92,255,0.14),0_0_22px_rgba(139,92,246,0.24)]"
    >
      {t("signOut")}
    </button>
  );
}
