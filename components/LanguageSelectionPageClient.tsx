"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

    window.localStorage.setItem(BASE_LANGUAGE_STORAGE_KEY, option.code);
    document.cookie = `${BASE_LANGUAGE_COOKIE_NAME}=${encodeURIComponent(
      option.code
    )}; path=/; max-age=31536000; samesite=lax`;
    setLanguage(uiLanguage);
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090110] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#120216_0%,#090110_34%,#07191b_68%,#06010d_100%)]" />
      <div className="lux-grid absolute inset-0 opacity-[0.12]" />
      <div className="aurora-wave absolute left-[-10%] top-[-10%] h-[34rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,0,153,0.26),transparent_58%)] blur-[96px]" />
      <div className="aurora-wave absolute right-[-10%] top-[8%] h-[34rem] w-[42rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.24),transparent_58%)] blur-[96px]" />

      <div className="relative mx-auto min-h-screen max-w-[430px] px-5 py-7">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 font-[var(--font-sora)] text-xs font-semibold uppercase tracking-normal text-white/78 transition hover:border-cyan-100/28 hover:text-white"
          >
            Back
          </Link>
          <span className="font-[var(--font-sora)] text-xs font-semibold uppercase tracking-normal text-cyan-50/72">
            Base Language
          </span>
        </div>

        <section className="pt-10 text-center">
          <h1 className="font-[var(--font-sora)] text-[2.15rem] font-semibold uppercase leading-tight tracking-normal text-white">
            Choose Your Base Language
          </h1>
          <div className="mx-auto mt-5 h-px w-36 bg-gradient-to-r from-transparent via-cyan-200/75 to-transparent" />
        </section>

        <div className="sticky top-0 z-10 -mx-5 mt-7 border-y border-white/8 bg-[#090110]/82 px-5 py-4 backdrop-blur-2xl">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search language or country"
            className="w-full rounded-full border border-white/12 bg-black/24 px-5 py-4 font-[var(--font-sora)] text-sm text-white outline-none placeholder:text-white/38 focus:border-cyan-200/42"
          />
        </div>

        <div className="mt-7 space-y-7 pb-16">
          {filteredGroups.map((group) => (
            <section key={group.region}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-[var(--font-sora)] text-sm font-semibold uppercase tracking-normal text-fuchsia-50/78">
                  {group.region}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/16 to-transparent" />
              </div>

              <div className="grid gap-3">
                {group.options.map((option) => (
                  <button
                    key={`${group.region}-${option.code}`}
                    type="button"
                    onClick={() => chooseLanguage(option)}
                    className="group min-h-[92px] rounded-[24px] border border-white/10 bg-white/[0.045] p-4 text-left shadow-[0_20px_48px_rgba(0,0,0,0.22)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-100/28 hover:bg-white/[0.075]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-[var(--font-sora)] text-lg font-semibold text-white">
                        {option.name}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/24 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-normal text-cyan-100/78">
                        {option.code}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/58">
                      {option.countries}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {filteredGroups.length === 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.045] px-5 py-8 text-center text-white/64">
              No matching languages found.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
