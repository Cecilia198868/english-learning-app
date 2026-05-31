"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";

type SessionResponse = {
  user?: {
    avatarUrl?: string | null;
    image?: string | null;
    photoURL?: string | null;
    photoUrl?: string | null;
    picture?: string | null;
  } | null;
};

type MenuEntry = {
  tone: "ai" | "new" | "classic";
  title: string;
  badge?: string;
  primary: string;
  secondary: string;
  route: string;
  ariaLabel: string;
};

const MENU_ENTRIES: MenuEntry[] = [
  {
    tone: "ai",
    title: "AI引导表达（推荐）",
    badge: "推荐",
    primary: "AI一步一步引导你开口",
    secondary: "从想中文 → 说英文 → 更地道表达",
    route: "/ai-guided-expression/step-1",
    ariaLabel: "进入AI引导表达界面",
  },
  {
    tone: "new",
    title: "新表达",
    primary: "收藏、学习和复习你的常用表达",
    secondary: "打造你的专属表达库",
    route: "/new-expressions",
    ariaLabel: "进入新表达下一级菜单",
  },
  {
    tone: "classic",
    title: "经典场景口语练习",
    primary: "按真实生活场景练高频口语",
    secondary: "随时随地，开口自信说",
    route: "/speak-english?menu=1&submenu=classic",
    ariaLabel: "进入经典场景口语练习下一级菜单",
  },
];

function getAvatarSrc(user?: SessionResponse["user"]) {
  return (
    user?.avatarUrl ||
    user?.image ||
    user?.photoURL ||
    user?.photoUrl ||
    user?.picture ||
    "/default-avatar.png"
  );
}

function MenuGlyph() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M9 11h14M9 16h14M9 21h14" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="m13 9 7 7-7 7" />
    </svg>
  );
}

function AiIllustration() {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="menuAiCircle" x1="20" x2="136" y1="18" y2="144">
          <stop stopColor="#f4efff" />
          <stop offset="1" stopColor="#d6c9ff" />
        </linearGradient>
        <linearGradient id="menuAiPurple" x1="20" x2="136" y1="32" y2="128">
          <stop stopColor="#a176ff" />
          <stop offset="1" stopColor="#7757e8" />
        </linearGradient>
      </defs>
      <circle cx="78" cy="86" fill="url(#menuAiCircle)" r="66" />
      <path
        d="M47 67c0-24 18-42 42-42 23 0 40 18 40 42 0 20-12 36-30 42v12l-18-9c-20-2-34-20-34-45Z"
        fill="#ffffff"
        opacity="0.72"
      />
      <path
        d="M51 62c17-24 58-24 75 0"
        fill="none"
        stroke="#b59dff"
        strokeDasharray="7 8"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <rect fill="#f7f4ff" height="44" rx="21" width="76" x="42" y="72" />
      <rect fill="#242379" height="42" rx="18" width="65" x="48" y="75" />
      <path
        d="M62 97c5 8 14 8 19 0M89 97c5 8 14 8 19 0"
        fill="none"
        stroke="#b8f6ff"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path d="M38 78h8v23h-8a9 9 0 0 1-9-9v-5a9 9 0 0 1 9-9ZM122 78h-8v23h8a9 9 0 0 0 9-9v-5a9 9 0 0 0-9-9Z" fill="#8d68ff" />
      <path d="M80 57v-9" stroke="#8d68ff" strokeLinecap="round" strokeWidth="5" />
      <circle cx="80" cy="45" fill="#8d68ff" r="6" />
      <path
        d="M22 27h53a9 9 0 0 1 9 9v20a9 9 0 0 1-9 9H55l-10 13v-13H22a9 9 0 0 1-9-9V36a9 9 0 0 1 9-9Z"
        fill="url(#menuAiPurple)"
      />
      <text fill="#fff" fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="22" fontWeight="650" x="30" y="54">
        中文
      </text>
      <path
        d="M109 54h30a10 10 0 0 1 10 10v19a10 10 0 0 1-10 10h-11l-8 10v-10h-11a10 10 0 0 1-10-10V64a10 10 0 0 1 10-10Z"
        fill="#b99eff"
      />
      <text fill="#fff" fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="23" fontWeight="650" x="115" y="80">
        Hi!
      </text>
      <path d="m27 121 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8ZM134 28l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" fill="#cab9ff" />
    </svg>
  );
}

function NewExpressionIllustration() {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="menuNewCircle" x1="28" x2="132" y1="22" y2="138">
          <stop stopColor="#eef6ff" />
          <stop offset="1" stopColor="#cfe3ff" />
        </linearGradient>
        <linearGradient id="menuNewBlue" x1="38" x2="124" y1="50" y2="130">
          <stop stopColor="#78b3ff" />
          <stop offset="1" stopColor="#3679ee" />
        </linearGradient>
      </defs>
      <circle cx="78" cy="84" fill="url(#menuNewCircle)" r="66" />
      <path d="M35 56c17-13 36-10 47 2v72c-14-12-31-14-47-5V56Z" fill="#ffffff" />
      <path d="M84 58c15-12 34-13 48-2v69c-15-8-33-7-48 5V58Z" fill="#ffffff" />
      <path d="M39 63c13-8 25-8 37-2M39 79c12-7 25-7 37-2M39 95c12-7 25-7 37-2M91 64c13-8 25-8 37-2M91 80c12-7 25-7 37-2M91 96c12-7 25-7 37-2" stroke="#d9e2f5" strokeLinecap="round" strokeWidth="5" />
      <path d="M50 58h20v51l-10-8-10 8V58Z" fill="url(#menuNewBlue)" />
      <path d="M32 126c34-15 62 8 100-1" fill="none" stroke="#4b8bff" strokeLinecap="round" strokeWidth="6" />
      <path d="M48 23h46a12 12 0 0 1 12 12v26a12 12 0 0 1-12 12H76l-12 13V73H48a12 12 0 0 1-12-12V35a12 12 0 0 1 12-12Z" fill="#dcecff" />
      <text fill="#5e94ff" fontFamily="PingFang SC, Microsoft YaHei, sans-serif" fontSize="27" fontWeight="700" x="55" y="55">
        AI
      </text>
      <circle cx="118" cy="119" fill="#5e94ff" r="23" />
      <path d="m118 106 4.2 8.5 9.4 1.3-6.8 6.6 1.6 9.4-8.4-4.4-8.4 4.4 1.6-9.4-6.8-6.6 9.4-1.3L118 106Z" fill="#ffffff" />
      <path d="m130 30 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5ZM22 126l2.4 6.5 6.5 2.4-6.5 2.4-2.4 6.5-2.4-6.5-6.5-2.4 6.5-2.4 2.4-6.5Z" fill="#b9d4ff" />
    </svg>
  );
}

function ClassicIllustration() {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="menuClassicCircle" x1="26" x2="136" y1="22" y2="138">
          <stop stopColor="#e9fff0" />
          <stop offset="1" stopColor="#b9f1cf" />
        </linearGradient>
      </defs>
      <circle cx="79" cy="83" fill="url(#menuClassicCircle)" r="66" />
      <path d="M31 132c3-30 20-48 43-48 22 0 38 18 40 48H31Z" fill="#31b874" />
      <path d="M85 132c3-29 20-47 43-47 22 0 36 18 39 47H85Z" fill="#64d892" />
      <circle cx="65" cy="62" fill="#ffd8c8" r="20" />
      <path d="M43 58c8-21 33-27 45-8-7-3-19-2-27 8-7 8-12 9-18 0Z" fill="#27326e" />
      <path d="M71 68c5 6 12 6 17 0" fill="none" stroke="#ef7d63" strokeLinecap="round" strokeWidth="3" />
      <circle cx="118" cy="62" fill="#ffd3c5" r="19" />
      <path d="M103 58c6-20 31-24 42-5-8-2-15 0-22 8-6 6-13 6-20-3Z" fill="#30326f" />
      <path d="M110 69c5 5 12 5 17 0" fill="none" stroke="#ef7d63" strokeLinecap="round" strokeWidth="3" />
      <path d="M67 83c7 6 17 7 26 1" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="4" opacity="0.65" />
      <path d="M87 91c8 5 17 5 25 0" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="4" opacity="0.65" />
      <rect fill="#41bf74" height="28" rx="13" width="43" x="73" y="18" />
      <circle cx="88" cy="32" fill="#fff" opacity="0.92" r="3.2" />
      <circle cx="96" cy="32" fill="#fff" opacity="0.92" r="3.2" />
      <circle cx="104" cy="32" fill="#fff" opacity="0.92" r="3.2" />
      <path d="M91 46 82 56v-11" fill="#41bf74" />
      <rect fill="#d8f7e4" height="22" rx="11" width="35" x="74" y="59" />
      <rect fill="#41bf74" height="22" rx="11" width="35" x="78" y="92" />
      <rect fill="#d8f7e4" height="22" rx="11" width="35" x="75" y="119" />
      <circle cx="86" cy="70" fill="#6ad88f" r="2.8" />
      <circle cx="94" cy="70" fill="#6ad88f" r="2.8" />
      <circle cx="101" cy="70" fill="#6ad88f" r="2.8" />
      <circle cx="90" cy="103" fill="#fff" r="2.8" />
      <circle cx="98" cy="103" fill="#fff" r="2.8" />
      <circle cx="105" cy="103" fill="#fff" r="2.8" />
      <path d="m29 32 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5ZM131 27l2.2 5.8 5.8 2.2-5.8 2.2-2.2 5.8-2.2-5.8-5.8-2.2 5.8-2.2 2.2-5.8Z" fill="#b8efd2" />
    </svg>
  );
}

function CardIllustration({ tone }: { tone: MenuEntry["tone"] }) {
  if (tone === "new") return <NewExpressionIllustration />;
  if (tone === "classic") return <ClassicIllustration />;
  return <AiIllustration />;
}

export default function MenuPage() {
  const router = useRouter();
  const [avatarSrc, setAvatarSrc] = useState("/default-avatar.png");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const session = (await response.json()) as SessionResponse;

        if (!cancelled) {
          setAvatarSrc(getAvatarSrc(session.user));
        }
      } catch {
        if (!cancelled) {
          setAvatarSrc("/default-avatar.png");
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="sf-menu-page">
      <section className="sf-menu-page-phone" aria-label="SpeakFlow主菜单">
        <div className="sf-menu-page-frame">
          <header className="sf-menu-page-header">
            <button
              type="button"
              aria-label="进入自由学习界面第一页"
              onClick={() => router.push("/free-study/step-1")}
              className="sf-menu-page-menu-button"
            >
              <MenuGlyph />
            </button>

            <div className="sf-menu-page-brand" aria-label="SpeakFlow AI Voice Practice">
              <span aria-hidden="true" className="sf-menu-page-logo">
                <SpeakFlowBrandMark className="sf-menu-page-logo-mark" />
              </span>
              <span className="sf-menu-page-brand-copy">
                <span className="sf-menu-page-brand-title">SpeakFlow</span>
                <span className="sf-menu-page-brand-subtitle">AI VOICE PRACTICE</span>
              </span>
            </div>

            <button
              type="button"
              aria-label="打开账户界面"
              onClick={() => router.push("/account")}
              className="sf-menu-page-avatar-button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc}
                alt=""
                className="sf-menu-page-avatar-image"
                onError={() => setAvatarSrc("/default-avatar.png")}
                draggable={false}
              />
              <span aria-hidden="true" className="sf-menu-page-avatar-dot" />
            </button>
          </header>

          <nav className="sf-menu-page-card-list" aria-label="学习入口">
            {MENU_ENTRIES.map((entry) => (
              <button
                key={entry.tone}
                type="button"
                aria-label={entry.ariaLabel}
                onClick={() => router.push(entry.route)}
                className={`sf-menu-page-card sf-menu-page-card-${entry.tone}`}
              >
                <span aria-hidden="true" className="sf-menu-page-card-visual">
                  <CardIllustration tone={entry.tone} />
                </span>

                <span className="sf-menu-page-card-copy">
                  <span className="sf-menu-page-card-title-row">
                    <span className="sf-menu-page-card-title">{entry.title}</span>
                    {entry.badge ? (
                      <span className="sf-menu-page-card-badge">{entry.badge}</span>
                    ) : null}
                  </span>
                  <span aria-hidden="true" className="sf-menu-page-card-rule" />
                  <span className="sf-menu-page-card-text">{entry.primary}</span>
                  <span className="sf-menu-page-card-text">{entry.secondary}</span>
                </span>

                <span aria-hidden="true" className="sf-menu-page-card-arrow">
                  <ChevronGlyph />
                </span>
              </button>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}
