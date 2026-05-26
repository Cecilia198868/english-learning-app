"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import type { AppLanguage } from "@/lib/i18n";

type BaseLanguageOption = {
  code: string;
  name: string;
  localName: string;
  tone: "violet" | "rose" | "blue" | "orange" | "green" | "gold" | "sky" | "lavender" | "pink";
  uiLanguage?: AppLanguage;
};

const BASE_LANGUAGE_STORAGE_KEY = "english-app-base-language";
const BASE_LANGUAGE_COOKIE_NAME = "english-app-base-language";

const baseLanguageOptions: BaseLanguageOption[] = [
  { code: "zh-CN", name: "Chinese", localName: "中文", tone: "violet", uiLanguage: "zh-CN" },
  { code: "ja", name: "Japanese", localName: "日本語", tone: "rose" },
  { code: "ko", name: "Korean", localName: "한국어", tone: "blue" },
  { code: "es", name: "Spanish", localName: "es", tone: "orange" },
  { code: "pt", name: "Portuguese", localName: "pt", tone: "green" },
  { code: "vi", name: "Vietnamese", localName: "tiếng\nviệt", tone: "gold" },
  { code: "ar", name: "Arabic", localName: "العربية", tone: "sky" },
  { code: "th", name: "Thai", localName: "ไทย", tone: "lavender" },
  { code: "id", name: "Indonesian", localName: "Indonesia", tone: "pink" },
];

export default function LanguageSelectionPageClient() {
  const { setLanguage } = useLanguage();

  function chooseLanguage(option: BaseLanguageOption) {
    const uiLanguage = option.uiLanguage ?? "en";

    try {
      window.localStorage.setItem(BASE_LANGUAGE_STORAGE_KEY, option.code);
      Reflect.set(window.document, "cookie", `${BASE_LANGUAGE_COOKIE_NAME}=${encodeURIComponent(
        option.code
      )}; path=/; max-age=31536000; samesite=lax`);
      setLanguage(uiLanguage);
    } catch (error) {
      console.error("保存语言选择失败:", error);
    }
  }

  return (
    <main className="responsive-page-shell sf-brand-page sf-language-selection-page relative min-h-[100dvh] w-full overflow-x-hidden">
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-6xl px-5 py-7 sm:px-7 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="sf-brand-button rounded-full px-5 py-3 font-[var(--font-sora)] text-sm font-semibold tracking-normal transition"
          >
            <span aria-hidden="true" className="mr-2 text-lg leading-none">←</span>
            Back
          </Link>
          <span className="inline-flex items-center gap-2 font-[var(--font-sora)] text-sm font-semibold tracking-normal text-[#5c5684]">
            <span aria-hidden="true" className="sf-language-top-icon" />
            Language
          </span>
        </div>

        <section className="pt-6 text-center sm:pt-5">
          <h1 className="font-[var(--font-sora)] text-5xl font-bold leading-[0.98] tracking-normal text-[#100a2d] sm:text-6xl lg:text-[5rem]">
            Choose Your Base Language
          </h1>
          <p className="mx-auto mt-5 max-w-[30rem] text-lg font-medium leading-tight text-[#5b5784] sm:text-xl">
            Pick the language you think in first.<br />
            SpeakFlow will shape practice around it.
          </p>
          <div className="mx-auto mt-5 flex w-28 items-center justify-center gap-2">
            <span className="h-1.5 flex-1 rounded-full bg-[linear-gradient(90deg,#c7b8ff,#7456ff,#c4b4ff)] shadow-[0_0_18px_rgba(116,86,255,0.42)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#b9a6ff]" />
          </div>
        </section>

        <div className="mx-auto mt-8 grid w-full max-w-[69rem] grid-cols-1 gap-4 pb-4 sm:mt-9 md:grid-cols-2 lg:grid-cols-3">
          {baseLanguageOptions.map((option) => (
            <Link
              key={option.code}
              href="/login"
              onClick={() => chooseLanguage(option)}
              className="sf-language-card sf-language-visual-card group relative block min-h-[154px] overflow-hidden rounded-[22px] px-6 pb-6 pt-5 text-center transition duration-200 sm:min-h-[166px]"
              data-code={option.code}
              data-tone={option.tone}
            >
              <span aria-hidden="true" className="sf-language-card-scene" />
              <span className="relative z-10 ml-auto block w-fit text-4xl leading-none text-[#171032] transition group-hover:translate-x-1">
                ›
              </span>
              <span className="sf-language-token relative z-10 mx-auto -mt-3 grid h-[7.5rem] w-[7.5rem] place-items-center rounded-full border text-[2.05rem] font-black leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_18px_34px_rgba(73,58,145,0.12)]">
                {option.localName.split("\n").map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
              <span className="relative z-10 mt-2 block font-[var(--font-sora)] text-[1.38rem] font-bold leading-tight text-[#100a2d]">
                {option.name}
              </span>
            </Link>
          ))}
        </div>

        <div className="pb-8 text-center text-sm font-medium text-[#625d8d]">
          <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-md bg-[#7658ff] text-xs font-bold text-white shadow-[0_10px_22px_rgba(118,88,255,0.28)]">
            +
          </span>
          You can change your language later in Settings.
        </div>
      </div>
    </main>
  );
}
