"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { AppLanguage } from "@/lib/i18n";

type BaseLanguageOption = {
  code: string;
  name: string;
  countries: string;
  uiLanguage?: AppLanguage;
};

type LanguageGroup = {
  region: string;
  options: BaseLanguageOption[];
};

const BASE_LANGUAGE_STORAGE_KEY = "english-app-base-language";
const BASE_LANGUAGE_COOKIE_NAME = "english-app-base-language";

const languageGroups: LanguageGroup[] = [
  {
    region: "Most Requested",
    options: [
      { code: "zh-CN", name: "Chinese (Simplified)", countries: "China, Singapore, Malaysia", uiLanguage: "zh-CN" },
      { code: "es", name: "Spanish", countries: "Mexico, Colombia, Spain, Argentina, Chile, Peru" },
      { code: "pt", name: "Portuguese", countries: "Brazil, Portugal, Angola, Mozambique" },
      { code: "hi", name: "Hindi", countries: "India" },
      { code: "ar", name: "Arabic", countries: "Saudi Arabia, Egypt, UAE, Morocco, Jordan" },
      { code: "ja", name: "Japanese", countries: "Japan" },
      { code: "ko", name: "Korean", countries: "South Korea" },
      { code: "vi", name: "Vietnamese", countries: "Vietnam" },
      { code: "id", name: "Indonesian", countries: "Indonesia" },
      { code: "tr", name: "Turkish", countries: "Turkey" },
      { code: "fr", name: "French", countries: "France, Canada, Belgium, Switzerland, West Africa" },
      { code: "de", name: "German", countries: "Germany, Austria, Switzerland" },
    ],
  },
  {
    region: "Asia-Pacific",
    options: [
      { code: "en", name: "English", countries: "United States, Canada, United Kingdom, Australia", uiLanguage: "en" },
      { code: "zh-TW", name: "Chinese (Traditional)", countries: "Taiwan, Hong Kong, Macau" },
      { code: "bn", name: "Bengali", countries: "Bangladesh, India" },
      { code: "ur", name: "Urdu", countries: "Pakistan, India" },
      { code: "pa", name: "Punjabi", countries: "India, Pakistan" },
      { code: "ta", name: "Tamil", countries: "India, Sri Lanka, Singapore, Malaysia" },
      { code: "te", name: "Telugu", countries: "India" },
      { code: "mr", name: "Marathi", countries: "India" },
      { code: "gu", name: "Gujarati", countries: "India" },
      { code: "kn", name: "Kannada", countries: "India" },
      { code: "ml", name: "Malayalam", countries: "India" },
      { code: "th", name: "Thai", countries: "Thailand" },
      { code: "fil", name: "Filipino", countries: "Philippines" },
      { code: "ms", name: "Malay", countries: "Malaysia, Brunei, Singapore" },
      { code: "my", name: "Burmese", countries: "Myanmar" },
      { code: "km", name: "Khmer", countries: "Cambodia" },
      { code: "lo", name: "Lao", countries: "Laos" },
      { code: "ne", name: "Nepali", countries: "Nepal" },
      { code: "si", name: "Sinhala", countries: "Sri Lanka" },
      { code: "mn", name: "Mongolian", countries: "Mongolia" },
    ],
  },
  {
    region: "Europe",
    options: [
      { code: "it", name: "Italian", countries: "Italy, Switzerland" },
      { code: "ru", name: "Russian", countries: "Russia, Kazakhstan, Eastern Europe" },
      { code: "uk", name: "Ukrainian", countries: "Ukraine" },
      { code: "pl", name: "Polish", countries: "Poland" },
      { code: "nl", name: "Dutch", countries: "Netherlands, Belgium" },
      { code: "sv", name: "Swedish", countries: "Sweden, Finland" },
      { code: "no", name: "Norwegian", countries: "Norway" },
      { code: "da", name: "Danish", countries: "Denmark" },
      { code: "fi", name: "Finnish", countries: "Finland" },
      { code: "el", name: "Greek", countries: "Greece, Cyprus" },
      { code: "cs", name: "Czech", countries: "Czechia" },
      { code: "sk", name: "Slovak", countries: "Slovakia" },
      { code: "hu", name: "Hungarian", countries: "Hungary" },
      { code: "ro", name: "Romanian", countries: "Romania, Moldova" },
      { code: "bg", name: "Bulgarian", countries: "Bulgaria" },
      { code: "sr", name: "Serbian", countries: "Serbia, Bosnia and Herzegovina, Montenegro" },
      { code: "hr", name: "Croatian", countries: "Croatia, Bosnia and Herzegovina" },
      { code: "sl", name: "Slovenian", countries: "Slovenia" },
      { code: "sq", name: "Albanian", countries: "Albania, Kosovo" },
      { code: "lt", name: "Lithuanian", countries: "Lithuania" },
      { code: "lv", name: "Latvian", countries: "Latvia" },
      { code: "et", name: "Estonian", countries: "Estonia" },
    ],
  },
  {
    region: "Middle East and Africa",
    options: [
      { code: "fa", name: "Persian", countries: "Iran, Afghanistan, Tajikistan" },
      { code: "he", name: "Hebrew", countries: "Israel" },
      { code: "ku", name: "Kurdish", countries: "Turkey, Iraq, Iran, Syria" },
      { code: "sw", name: "Swahili", countries: "Kenya, Tanzania, Uganda" },
      { code: "am", name: "Amharic", countries: "Ethiopia" },
      { code: "ha", name: "Hausa", countries: "Nigeria, Niger, Ghana" },
      { code: "yo", name: "Yoruba", countries: "Nigeria, Benin, Togo" },
      { code: "ig", name: "Igbo", countries: "Nigeria" },
      { code: "so", name: "Somali", countries: "Somalia, Djibouti, Ethiopia, Kenya" },
      { code: "om", name: "Oromo", countries: "Ethiopia, Kenya" },
      { code: "zu", name: "Zulu", countries: "South Africa" },
      { code: "xh", name: "Xhosa", countries: "South Africa" },
      { code: "af", name: "Afrikaans", countries: "South Africa, Namibia" },
    ],
  },
  {
    region: "Americas and Caribbean",
    options: [
      { code: "ht", name: "Haitian Creole", countries: "Haiti" },
      { code: "qu", name: "Quechua", countries: "Peru, Bolivia, Ecuador" },
      { code: "ay", name: "Aymara", countries: "Bolivia, Peru, Chile" },
      { code: "gn", name: "Guarani", countries: "Paraguay, Bolivia, Argentina, Brazil" },
      { code: "jam", name: "Jamaican Creole", countries: "Jamaica" },
    ],
  },
];

export default function LanguageSelectionPageClient() {
  const { setLanguage } = useLanguage();
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return languageGroups;
    }

    return languageGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => {
          const searchable = `${option.name} ${option.countries} ${option.code}`;
          return searchable.toLowerCase().includes(normalizedQuery);
        }),
      }))
      .filter((group) => group.options.length > 0);
  }, [query]);

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
    <main className="responsive-page-shell sf-brand-page relative min-h-[100dvh] w-full overflow-x-hidden">
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="sf-brand-button rounded-full px-4 py-2 font-[var(--font-sora)] text-xs font-semibold uppercase tracking-normal transition"
          >
            Back
          </Link>
          <span className="font-[var(--font-sora)] text-xs font-semibold uppercase tracking-normal text-[#6d55ef]">
            Base Language
          </span>
        </div>

        <section className="pt-10 text-center">
          <h1 className="font-[var(--font-sora)] text-[clamp(2.25rem,7vw,4.15rem)] font-semibold uppercase leading-tight tracking-normal text-[#201833]">
            Choose Your Base Language
          </h1>
          <div className="sf-brand-hairline mx-auto mt-5 w-40" />
          <p className="mx-auto mt-5 max-w-xl text-sm font-medium leading-6 text-[#655b78]">
            Pick the language you think in first. SpeakFlow will shape practice around it.
          </p>
        </section>

        <div className="sticky top-0 z-10 -mx-5 mt-7 border-y border-[#7b61ff]/10 bg-[#efe7ff]/72 px-5 py-4 backdrop-blur-2xl">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search language or country"
            className="sf-brand-input w-full rounded-full px-5 py-4 font-[var(--font-sora)] text-sm outline-none focus:border-[#5b8cff]/36"
          />
        </div>

        <div className="mt-7 space-y-7 pb-16">
          {filteredGroups.map((group) => (
            <section key={group.region}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-[var(--font-sora)] text-sm font-semibold uppercase tracking-normal text-[#6d55ef]">
                  {group.region}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-[#7b61ff]/22 to-transparent" />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.options.map((option) => (
                  <Link
                    key={`${group.region}-${option.code}`}
                    href="/login"
                    onClick={() => chooseLanguage(option)}
                    className="sf-language-card group block min-h-[92px] rounded-[24px] p-4 text-left transition duration-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-[var(--font-sora)] text-lg font-semibold text-[#201833]">
                        {option.name}
                      </span>
                      <span className="rounded-full border border-[#7b61ff]/16 bg-[#7b61ff]/8 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-normal text-[#5c48d9]">
                        {option.code}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#655b78]">
                      {option.countries}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          {filteredGroups.length === 0 ? (
            <div className="sf-brand-glass rounded-[24px] px-5 py-8 text-center text-[#655b78]">
              No matching languages found.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
