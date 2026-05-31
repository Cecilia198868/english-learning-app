"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";
import styles from "./NewExpressionsPage.module.css";

type SessionResponse = {
  user?: {
    email?: string | null;
    image?: string | null;
    name?: string | null;
    photoURL?: string | null;
    photoUrl?: string | null;
    picture?: string | null;
  } | null;
};

const accountAvatarStoragePrefix = "speakflow-account-avatar";

function getAccountAvatarStorageKey(identifier: string) {
  return `${accountAvatarStoragePrefix}:${identifier || "local-user"}`;
}

function getSessionAvatar(user?: SessionResponse["user"]) {
  return (
    user?.image ||
    user?.photoURL ||
    user?.photoUrl ||
    user?.picture ||
    ""
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M19 8 11 16l8 8M12 16h12" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M12 8 20 16l-8 8" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48">
      <path d="m24 5.2 5.8 11.7 12.9 1.9-9.4 9.1 2.2 12.9L24 34.7l-11.5 6.1 2.2-12.9-9.4-9.1 12.9-1.9L24 5.2Z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48">
      <path d="M7 15.4c0-2.2 1.8-4 4-4h10.1l4.1 4.7H37c2.2 0 4 1.8 4 4v13.5c0 2.2-1.8 4-4 4H11c-2.2 0-4-1.8-4-4V15.4Z" />
    </svg>
  );
}

function BookBadgeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 76 76">
      <defs>
        <linearGradient id="sfNewExprBook" x1="8" x2="60" y1="10" y2="66">
          <stop stopColor="#75a5ff" />
          <stop offset="1" stopColor="#315cff" />
        </linearGradient>
      </defs>
      <path
        d="M11 17c0-2 1.6-3.6 3.6-3.6H32c4.1 0 7.3 1.4 9.7 4.1 2.4-2.7 5.7-4.1 9.8-4.1h9.9c2 0 3.6 1.6 3.6 3.6v39.2c0 2.5-2.5 4.2-4.8 3.3l-7.4-2.7a25.5 25.5 0 0 0-22 1.7 25.5 25.5 0 0 0-22-1.7l-7.4 2.7C-.9 60.4-3.4 58.7-3.4 56.2V17Z"
        fill="url(#sfNewExprBook)"
        transform="translate(7 2)"
      />
      <path
        d="M38 18v38"
        fill="none"
        stroke="#dbe8ff"
        strokeLinecap="round"
        strokeWidth="3.8"
      />
      <path
        d="M19 27h12M19 36h13M47 27h10M47 36h10"
        fill="none"
        stroke="#dbe8ff"
        strokeLinecap="round"
        strokeWidth="3.8"
      />
    </svg>
  );
}

function LearnIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 250 190">
      <defs>
        <linearGradient id="sfLearnBook" x1="39" x2="203" y1="37" y2="170">
          <stop stopColor="#78a8ff" />
          <stop offset="1" stopColor="#2455ef" />
        </linearGradient>
        <linearGradient id="sfLearnBubble" x1="165" x2="230" y1="72" y2="135">
          <stop stopColor="#8eb6ff" />
          <stop offset="1" stopColor="#3065f3" />
        </linearGradient>
      </defs>
      <path
        d="M69 55c-13 0-23 10-23 23v67c0 9 10 15 18 11 26-13 51-8 70 5 19-13 44-18 70-5 8 4 18-2 18-11V78c0-13-10-23-23-23h-42c-9 0-17 3-23 9-6-6-14-9-23-9H69Z"
        fill="url(#sfLearnBook)"
        opacity=".9"
      />
      <path
        d="M75 45c-12 0-22 9-22 21v63c0 9 10 14 18 10 23-11 45-7 63 5 18-12 40-16 63-5 8 4 18-1 18-10V66c0-12-10-21-22-21h-39c-8 0-15 3-20 8-5-5-12-8-20-8H75Z"
        fill="#f9fbff"
      />
      <path d="M134 54v89" stroke="#e0e7fb" strokeLinecap="round" strokeWidth="5" />
      <path
        d="M82 75h34M82 94h40M82 113h36"
        stroke="#cdd7ec"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <rect
        width="72"
        height="56"
        x="147"
        y="91"
        fill="#fff"
        rx="13"
        transform="rotate(-4 147 91)"
      />
      <path
        d="M166 114h33M166 130h27"
        stroke="#cdd7ec"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <path
        d="M177 52h36c13 0 24 10 24 23v16h-45c-11 0-20-9-20-20V57c0-3 2-5 5-5Z"
        fill="url(#sfLearnBubble)"
      />
      <circle cx="196" cy="75" r="3.8" fill="#fff" />
      <circle cx="211" cy="75" r="3.8" fill="#fff" />
      <circle cx="226" cy="75" r="3.8" fill="#fff" />
      <path
        d="M42 36h9M46.5 31.5v9M214 31h8M218 27v8M227 154h8M231 150v8"
        stroke="#b9ccff"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function LibraryIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 250 190">
      <defs>
        <linearGradient id="sfLibraryFolder" x1="48" x2="209" y1="62" y2="166">
          <stop stopColor="#7ce6c6" />
          <stop offset="1" stopColor="#32bd82" />
        </linearGradient>
        <linearGradient id="sfLibraryLens" x1="169" x2="232" y1="112" y2="174">
          <stop stopColor="#72ddc4" />
          <stop offset="1" stopColor="#31af7c" />
        </linearGradient>
      </defs>
      <path
        d="M52 75c0-12 10-22 22-22h39l17 18h57c12 0 22 10 22 22v49c0 12-10 22-22 22H74c-12 0-22-10-22-22V75Z"
        fill="url(#sfLibraryFolder)"
        opacity=".86"
      />
      <rect
        width="76"
        height="66"
        x="91"
        y="40"
        fill="#fff"
        rx="14"
        transform="rotate(9 91 40)"
      />
      <rect
        width="76"
        height="66"
        x="130"
        y="51"
        fill="#f6fbff"
        rx="14"
        transform="rotate(9 130 51)"
      />
      <path
        d="M113 66h35M113 83h28M153 79h34M153 96h28"
        stroke="#cad6e7"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <path
        d="M109 103h44M149 117h43"
        stroke="#42c592"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <circle cx="193" cy="141" r="33" fill="url(#sfLibraryLens)" />
      <circle cx="193" cy="141" r="14" fill="none" stroke="#fff" strokeWidth="8" />
      <path d="m204 152 14 14" stroke="#fff" strokeLinecap="round" strokeWidth="8" />
      <path
        d="M43 42h8M47 38v8M218 48h8M222 44v8M39 159h8M43 155v8"
        stroke="#9fe6d2"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function HomeTabIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36">
      <path d="M6 17.2 18 7l12 10.2v11.6c0 1.8-1.4 3.2-3.2 3.2H22v-9h-8v9H9.2A3.2 3.2 0 0 1 6 28.8V17.2Z" />
    </svg>
  );
}

function ChatTabIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36">
      <path d="M18 7C11 7 5.5 11.7 5.5 17.5c0 3.2 1.7 6 4.4 7.9L9 31l5.6-2.9c1.1.2 2.2.4 3.4.4 7 0 12.5-4.7 12.5-10.5S25 7 18 7Z" />
      <circle cx="13" cy="17.7" r="1.5" />
      <circle cx="18" cy="17.7" r="1.5" />
      <circle cx="23" cy="17.7" r="1.5" />
    </svg>
  );
}

function BarsTabIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36">
      <path d="M7 28h5V15H7v13Zm8 0h5V7h-5v21Zm8 0h5V19h-5v9Z" />
    </svg>
  );
}

function UserTabIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36">
      <path d="M18 18.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM6.5 31.5c1.4-6.5 5.6-9.8 11.5-9.8s10.1 3.3 11.5 9.8H6.5Z" />
    </svg>
  );
}

function BookmarkTabIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36">
      <path d="M10 5.5h16c1.4 0 2.5 1.1 2.5 2.5v24L18 26.4 7.5 32V8c0-1.4 1.1-2.5 2.5-2.5Z" />
      <path d="m18 10.2 1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6 1.8-3.6Z" fill="white" />
    </svg>
  );
}

export default function NewExpressionsPage() {
  const [avatarSrc, setAvatarSrc] = useState("/default-avatar.png");
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const session = (await response.json()) as SessionResponse;
        const identifier =
          session.user?.email || session.user?.name || "local-user";
        const savedAvatar = window.localStorage.getItem(
          getAccountAvatarStorageKey(identifier)
        );
        const nextAvatar = savedAvatar || getSessionAvatar(session.user);

        if (!cancelled) {
          setAvatarSrc(nextAvatar || "/default-avatar.png");
          setAvatarFailed(false);
        }
      } catch {
        if (!cancelled) {
          setAvatarSrc("/default-avatar.png");
          setAvatarFailed(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={`${styles.mount} sf-new-expressions-page`}>
      <section className="sf-new-expressions-phone" aria-label="新表达菜单">
        <header className="sf-new-expressions-header">
          <Link href="/menu" aria-label="返回主菜单" className="sf-new-expressions-back">
            <BackIcon />
          </Link>

          <div className="sf-new-expressions-brand" aria-label="SpeakFlow AI Voice Practice">
            <SpeakFlowBrandMark className="sf-new-expressions-logo" />
            <span>
              <strong>SpeakFlow</strong>
              <small>AI VOICE PRACTICE</small>
            </span>
          </div>

          <Link href="/account" aria-label="打开账户界面" className="sf-new-expressions-avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarFailed ? "/default-avatar.png" : avatarSrc}
              alt=""
              draggable={false}
              onError={() => setAvatarFailed(true)}
            />
            <span />
          </Link>
        </header>

        <section className="sf-new-expressions-hero" aria-labelledby="new-expressions-title">
          <BookBadgeIcon />
          <div>
            <h1 id="new-expressions-title">新表达</h1>
            <p>收藏、学习和复习你的常用表达</p>
          </div>
        </section>

        <div className="sf-new-expressions-card-list">
          <Link href="/vocabulary" className="sf-new-expressions-card is-learn">
            <span className="sf-new-expressions-card-icon">
              <StarIcon />
            </span>
            <span className="sf-new-expressions-card-copy">
              <strong>学习新表达</strong>
              <i />
              <span>复习你收藏的单词、词组和句型</span>
              <span className="sf-new-expressions-check">中文意思</span>
              <span className="sf-new-expressions-check">英文例句</span>
              <span className="sf-new-expressions-check">跟读练习</span>
              <span>帮助你真正掌握这些表达</span>
            </span>
            <span className="sf-new-expressions-card-art">
              <LearnIllustration />
            </span>
            <span className="sf-new-expressions-cta is-blue">
              开始学习
              <ArrowIcon />
            </span>
            <span className="sf-new-expressions-sparkle one" />
            <span className="sf-new-expressions-sparkle two" />
          </Link>

          <Link href="/vocabulary?library=1" className="sf-new-expressions-card is-library">
            <span className="sf-new-expressions-card-icon">
              <FolderIcon />
            </span>
            <span className="sf-new-expressions-card-copy">
              <strong>表达库</strong>
              <i />
              <span>查看全部收藏内容</span>
              <span className="sf-new-expressions-check">搜索表达</span>
              <span className="sf-new-expressions-check">删除表达</span>
              <span className="sf-new-expressions-check">分类管理</span>
              <span>打造属于你的英语表达库</span>
            </span>
            <span className="sf-new-expressions-card-art">
              <LibraryIllustration />
            </span>
            <span className="sf-new-expressions-cta is-green">
              打开表达库
              <ArrowIcon />
            </span>
            <span className="sf-new-expressions-sparkle three" />
          </Link>
        </div>

        <nav className="sf-new-expressions-tabs" aria-label="底部导航">
          <Link href="/menu" className="sf-new-expressions-tab">
            <HomeTabIcon />
            <span>首页</span>
          </Link>
          <Link href="/ai-guided-expression/step-1" className="sf-new-expressions-tab">
            <ChatTabIcon />
            <span>AI引导表达</span>
          </Link>
          <Link href="/new-expressions" className="sf-new-expressions-tab is-active" aria-current="page">
            <BookmarkTabIcon />
            <span>新表达</span>
          </Link>
          <Link href="/free-study/step-1" className="sf-new-expressions-tab">
            <BarsTabIcon />
            <span>自由学习</span>
          </Link>
          <Link href="/account" className="sf-new-expressions-tab">
            <UserTabIcon />
            <span>我的</span>
          </Link>
        </nav>
      </section>
    </main>
  );
}
