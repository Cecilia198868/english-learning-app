"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import type { AppLanguage } from "@/lib/i18n";

type LanguageOption = {
  code: AppLanguage;
  label: string;
};

const popularLanguages: LanguageOption[] = [
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "en", label: "English" },
];

const launchLanguages = popularLanguages;

export default function LanguagePicker() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-[24px] px-5 py-4 text-center font-[var(--font-sora)] text-[0.94rem] font-semibold tracking-[0.22em] text-white transition duration-300 hover:scale-[1.01] hover:tracking-[0.24em] sm:text-[1rem]"
      >
        <span className="absolute inset-x-[8%] bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/90 to-cyan-200/90" />
        <span className="absolute left-1/2 top-1/2 h-16 w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(255,0,153,0.18),rgba(0,245,255,0.14),rgba(217,255,77,0.12))] opacity-95 blur-xl transition duration-300 group-hover:scale-110 group-hover:opacity-100" />
        <span className="absolute left-1/2 top-1/2 h-[56px] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.03)]" />
        <span className="relative uppercase text-white [text-shadow:0_0_18px_rgba(255,255,255,0.28)]">
          Choose Your Base Language
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${
          isOpen
            ? "mt-8 max-h-[1200px] opacity-100"
            : "mt-0 max-h-0 opacity-0"
        }`}
      >
        <div className="rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[0_30px_90px_rgba(2,8,23,0.46)] backdrop-blur-2xl sm:p-6">
          <div className="rounded-[26px] border border-fuchsia-300/12 bg-[#12081d]/78 p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.34em] text-fuchsia-50/80">
              Popular
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {popularLanguages.map((item) => {
                const isSelected = language === item.code;

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setLanguage(item.code);
                      setIsOpen(false);
                      router.push("/login");
                      router.refresh();
                    }}
                    className={`rounded-full border px-5 py-2.5 text-sm font-medium transition duration-200 ${
                      isSelected
                        ? "border-fuchsia-300/40 bg-[linear-gradient(90deg,rgba(255,0,153,0.22),rgba(0,245,255,0.14))] text-white shadow-[0_16px_34px_rgba(255,0,153,0.2)]"
                        : "border-white/10 bg-white/[0.03] text-white hover:border-cyan-200/22 hover:bg-white/[0.08]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-[26px] border border-cyan-300/12 bg-[#09061a]/76 p-4 sm:p-5">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.34em] text-cyan-50/80">
              Launch Languages
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {launchLanguages.map((item) => {
                const isSelected = language === item.code;

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setLanguage(item.code);
                      setIsOpen(false);
                      router.push("/login");
                      router.refresh();
                    }}
                    className={`rounded-[22px] border px-4 py-3 text-sm font-medium transition duration-200 ${
                      isSelected
                        ? "border-cyan-300/40 bg-[linear-gradient(135deg,rgba(0,245,255,0.22),rgba(139,92,246,0.18))] text-white shadow-[0_18px_38px_rgba(0,245,255,0.16)]"
                        : "border-white/10 bg-white/[0.03] text-white hover:border-fuchsia-200/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
