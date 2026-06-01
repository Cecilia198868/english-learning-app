"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./AccountPageClient.module.css";

type AccountPageClientProps = {
  isAdmin: boolean;
  userEmail: string;
  userImage: string;
  userName: string;
};

const accountAvatarStoragePrefix = "speakflow-account-avatar";

function getAccountAvatarStorageKey(identifier: string) {
  return `${accountAvatarStoragePrefix}:${identifier || "local-user"}`;
}

function getDisplayName(userName: string, userEmail: string) {
  const cleaned = userName.trim();
  if (cleaned) return cleaned;

  const localPart = userEmail.split("@")[0]?.trim();
  return localPart || "SpeakFlow 用户";
}

function getAvatarLabel(name: string, email: string) {
  return (name || email || "SF").slice(0, 2).toUpperCase();
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
      <path d="M5 15.2 16 6l11 9.2v11.3a2 2 0 0 1-2 2h-5.3v-8.2h-7.4v8.2H7a2 2 0 0 1-2-2V15.2Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
      <path d="M16 20.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" />
      <path d="m25.8 17.6.1-3.2-3.2-.7a7.7 7.7 0 0 0-.8-1.8l1.7-2.7-2.3-2.3-2.7 1.7a7.7 7.7 0 0 0-1.8-.8L16.1 4h-3.2l-.7 3.8a7.7 7.7 0 0 0-1.8.8L7.7 6.9 5.4 9.2l1.7 2.7a7.7 7.7 0 0 0-.8 1.8l-3.2.7.1 3.2 3.1.7c.2.6.5 1.2.8 1.8l-1.7 2.7 2.3 2.3 2.7-1.7c.6.3 1.2.6 1.8.8l.7 3.8h3.2l.7-3.8c.6-.2 1.2-.5 1.8-.8l2.7 1.7 2.3-2.3-1.7-2.7c.3-.6.6-1.2.8-1.8l3.1-.7Z" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
      <path d="M16 4.5 26 8.4v7.2c0 6.2-4.1 10.3-10 12-5.9-1.7-10-5.8-10-12V8.4l10-3.9Z" />
      <path d="M11.4 15.9h9.2M11.4 20h9.2M13 11.8h6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export default function AccountPageClient({
  isAdmin,
  userEmail,
  userImage,
  userName,
}: AccountPageClientProps) {
  const displayName = useMemo(
    () => getDisplayName(userName, userEmail),
    [userEmail, userName]
  );
  const avatarLabel = useMemo(
    () => getAvatarLabel(displayName, userEmail),
    [displayName, userEmail]
  );
  const [avatarState, setAvatarState] = useState({
    failed: false,
    src: userImage,
  });

  useEffect(() => {
    const identifier = userEmail || userName || "local-user";
    const timer = window.setTimeout(() => {
      try {
        const savedAvatar = window.localStorage.getItem(
          getAccountAvatarStorageKey(identifier)
        );
        setAvatarState({ failed: false, src: savedAvatar || userImage });
      } catch {
        setAvatarState({ failed: false, src: userImage });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [userEmail, userImage, userName]);

  return (
    <main className={styles.page}>
      <section className={styles.phone} aria-label="SpeakFlow 账户">
        <header className={styles.profile}>
          <div className={styles.avatar}>
            {avatarState.src && !avatarState.failed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarState.src}
                alt=""
                draggable={false}
                onError={() =>
                  setAvatarState((current) => ({ ...current, failed: true }))
                }
              />
            ) : (
              <span>{avatarLabel}</span>
            )}
          </div>

          <div className={styles.profileCopy}>
            <p>账户</p>
            <h1>{displayName}</h1>
            <span>{userEmail || "已登录 SpeakFlow"}</span>
          </div>
        </header>

        <nav className={styles.optionList} aria-label="账户选项">
          <Link className={styles.optionRow} href="/start">
            <span className={styles.optionIcon} data-tone="home">
              <HomeIcon />
            </span>
            <span className={styles.optionCopy}>
              <strong>首页</strong>
              <small>返回学习首页</small>
            </span>
            <span className={styles.chevron}>
              <ChevronIcon />
            </span>
          </Link>

          <Link className={styles.optionRow} href="/speak-english?account=1">
            <span className={styles.optionIcon} data-tone="settings">
              <SettingsIcon />
            </span>
            <span className={styles.optionCopy}>
              <strong>账户设置</strong>
              <small>管理订阅、头像和学习偏好</small>
            </span>
            <span className={styles.chevron}>
              <ChevronIcon />
            </span>
          </Link>

          {isAdmin ? (
            <Link className={styles.optionRow} href="/admin">
              <span className={styles.optionIcon} data-tone="admin">
                <AdminIcon />
              </span>
              <span className={styles.optionCopy}>
                <strong>后台管理</strong>
                <small>查看只读运营数据</small>
              </span>
              <span className={styles.chevron}>
                <ChevronIcon />
              </span>
            </Link>
          ) : null}
        </nav>
      </section>
    </main>
  );
}
