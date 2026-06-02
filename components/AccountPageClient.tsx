"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import styles from "./AccountPageClient.module.css";

type AccountPageClientProps = {
  isAdmin: boolean;
  userEmail: string;
  userImage: string;
  userName: string;
};

type SubscriptionStatus = "free" | "pro" | "cancels_at_period_end";

type AccountSubscriptionResponse = {
  bonusProUntil?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  entitlementSource?: "bonus" | "free" | "stripe";
  subscriptionStatus?: SubscriptionStatus;
};

type IconName =
  | "bell"
  | "card"
  | "document"
  | "feedback"
  | "gift"
  | "globe"
  | "grid"
  | "headphones"
  | "help"
  | "home"
  | "info"
  | "lock"
  | "logout"
  | "shield"
  | "star"
  | "text";

type RowProps = {
  badge?: string;
  description?: string;
  href?: string;
  icon: IconName;
  label: string;
  onClick?: () => void;
  tone?: "blue" | "cyan" | "indigo" | "plain" | "purple";
};

const accountAvatarStoragePrefix = "speakflow-account-avatar";
const accountPanelUrl = (panel: string) =>
  `/speak-english?account=1&fromAccount=1&panel=${panel}`;

function getAccountAvatarStorageKey(identifier: string) {
  return `${accountAvatarStoragePrefix}:${identifier || "local-user"}`;
}

function getDisplayName(userName: string, userEmail: string) {
  const cleaned = userName.trim();
  const email = userEmail.trim();
  if (cleaned && cleaned.toLowerCase() !== email.toLowerCase()) return cleaned;

  const localPart = email.split("@")[0]?.trim();
  return localPart || "SpeakFlow 用户";
}

function formatChineseDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function getSubscriptionCopy(subscription?: AccountSubscriptionResponse | null) {
  if (subscription === undefined) {
    return {
      badge: "同步中",
      subtitle: "正在读取订阅状态",
    };
  }

  const status = subscription?.subscriptionStatus || "free";
  const endDate = formatChineseDate(
    subscription?.currentPeriodEnd || subscription?.bonusProUntil
  );

  if (status === "pro" || status === "cancels_at_period_end") {
    return {
      badge: "已订阅",
      subtitle:
        status === "cancels_at_period_end" && endDate
          ? `到期后停止续订 ${endDate}`
          : endDate
            ? `到期时间 ${endDate}`
            : "订阅权益已开启",
    };
  }

  return {
    badge: "免费版",
    subtitle: "升级后解锁更多练习次数",
  };
}

function MenuIcon({ name }: { name: IconName }) {
  switch (name) {
    case "home":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <path d="M5 15.2 16 6l11 9.2v11.3a2 2 0 0 1-2 2h-5.3v-8.2h-7.4v8.2H7a2 2 0 0 1-2-2V15.2Z" />
        </svg>
      );
    case "star":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <path d="m16 4.6 3.3 7 7.7 1.1-5.6 5.4 1.3 7.7L16 22.2l-6.8 3.6 1.3-7.7-5.5-5.4 7.7-1.1L16 4.6Z" />
        </svg>
      );
    case "card":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <rect x="5" y="8" width="22" height="16" rx="3" />
          <path d="M5 13h22M9 20h6" />
        </svg>
      );
    case "gift":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <path d="M5 13h22v13H5V13Zm11 0v13M4 13V9h24v4" />
          <path d="M16 9c-1.8-4.2-7.2-3.4-6.7.2C9.6 11.2 13 11 16 9Zm0 0c1.8-4.2 7.2-3.4 6.7.2C22.4 11.2 19 11 16 9Z" />
        </svg>
      );
    case "lock":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <rect x="6" y="14" width="20" height="12" rx="3" />
          <path d="M11 14v-3a5 5 0 0 1 10 0v3M16 19v3" />
        </svg>
      );
    case "grid":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <rect x="5" y="5" width="8" height="8" rx="2" />
          <rect x="19" y="5" width="8" height="8" rx="2" />
          <rect x="5" y="19" width="8" height="8" rx="2" />
          <rect x="19" y="19" width="8" height="8" rx="2" />
        </svg>
      );
    case "shield":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <path d="M16 4.5 26 8.4v7.2c0 6.2-4.1 10.3-10 12-5.9-1.7-10-5.8-10-12V8.4l10-3.9Z" />
          <path d="M11.4 15.9h9.2M11.4 20h9.2M13 11.8h6" />
        </svg>
      );
    case "headphones":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <path d="M7 19v-3a9 9 0 0 1 18 0v3" />
          <rect x="5" y="18" width="5" height="8" rx="2" />
          <rect x="22" y="18" width="5" height="8" rx="2" />
        </svg>
      );
    case "text":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <path d="M5 24 12 7h2l7 17M8 18h10M21 13h6M24 13v11" />
        </svg>
      );
    case "globe":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="11" />
          <path d="M5 16h22M16 5c3 3.2 4.4 6.8 4.4 11S19 23.8 16 27M16 5c-3 3.2-4.4 6.8-4.4 11S13 23.8 16 27" />
        </svg>
      );
    case "bell":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <path d="M8 23h16l-2-3.2V15a6 6 0 0 0-12 0v4.8L8 23Z" />
          <path d="M13.5 25a2.8 2.8 0 0 0 5 0" />
        </svg>
      );
    case "help":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="11" />
          <path d="M12.5 13a3.8 3.8 0 0 1 7.1 1.9c0 2.5-2.5 3-3.2 4.6M16 24h.1" />
        </svg>
      );
    case "feedback":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <path d="M6 8h20v13H13l-6 5V8Z" />
          <path d="M11 13h10M11 17h7" />
        </svg>
      );
    case "document":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <path d="M9 5h10l5 5v17H9V5Z" />
          <path d="M19 5v6h5M13 16h7M13 21h7" />
        </svg>
      );
    case "info":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="11" />
          <path d="M16 14v8M16 10h.1" />
        </svg>
      );
    case "logout":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <path d="M13 7H7v18h6M18 11l5 5-5 5M23 16H12" />
        </svg>
      );
    default:
      return null;
  }
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function Row({ badge, description, href, icon, label, onClick, tone = "plain" }: RowProps) {
  const content = (
    <>
      <span className={styles.rowIcon} data-tone={tone}>
        <MenuIcon name={icon} />
      </span>
      <span className={styles.rowCopy}>
        <span className={styles.rowTitleLine}>
          <strong>{label}</strong>
          {badge ? <em>{badge}</em> : null}
        </span>
        {description ? <small>{description}</small> : null}
      </span>
      <span className={styles.chevron}>
        <ChevronIcon />
      </span>
    </>
  );

  if (href) {
    return (
      <Link className={styles.row} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={styles.row} onClick={onClick}>
      {content}
    </button>
  );
}

function Section({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <section className={styles.section}>
      {title ? <h2>{title}</h2> : null}
      <div className={styles.sectionCard}>{children}</div>
    </section>
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
  const [avatarState, setAvatarState] = useState({
    failed: false,
    src: userImage,
  });
  const [subscription, setSubscription] =
    useState<AccountSubscriptionResponse | null | undefined>(undefined);
  const subscriptionCopy = useMemo(
    () => getSubscriptionCopy(subscription),
    [subscription]
  );

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

  useEffect(() => {
    const controller = new AbortController();

    async function loadSubscription() {
      try {
        const response = await fetch("/api/me/subscription", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = (await response.json()) as AccountSubscriptionResponse;
        setSubscription(data);
      } catch {
        if (!controller.signal.aborted) {
          setSubscription(null);
        }
      }
    }

    void loadSubscription();

    return () => controller.abort();
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.phone} aria-label="SpeakFlow 账户中心">
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
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/default-avatar.png" alt="" draggable={false} />
            )}
          </div>

          <div className={styles.profileCopy}>
            <p>账户</p>
            <h1>{displayName}</h1>
            <span>{userEmail || "已登录 SpeakFlow"}</span>
          </div>
        </header>

        <Section>
          <Row
            href="/start"
            icon="home"
            label="首页"
            description="返回学习首页"
            tone="purple"
          />
        </Section>

        <Section>
          <Row
            href="/speak-english?pro=1&fromAccount=1"
            icon="star"
            label="SpeakFlow Pro"
            description={subscriptionCopy.subtitle}
            badge={subscriptionCopy.badge}
          />
          <Row
            href={accountPanelUrl("manageSubscription")}
            icon="card"
            label="管理订阅"
          />
          <Row href={accountPanelUrl("referrals")} icon="gift" label="邀请好友" />
          <Row
            href={accountPanelUrl("accountManagement")}
            icon="lock"
            label="账号管理"
          />
          {isAdmin ? (
            <Row href="/admin" icon="grid" label="后台管理" />
          ) : null}
        </Section>

        <Section title="学习体验">
          <Row href={accountPanelUrl("voice")} icon="headphones" label="声音" />
          <Row href={accountPanelUrl("fontSize")} icon="text" label="字体大小" />
          <Row
            href={accountPanelUrl("interfaceLanguage")}
            icon="globe"
            label="界面语言"
          />
          <Row
            href={accountPanelUrl("notifications")}
            icon="bell"
            label="通知"
          />
        </Section>

        <Section title="帮助">
          <Row href={accountPanelUrl("helpCenter")} icon="help" label="帮助中心" />
          <Row
            href={accountPanelUrl("reportIssue")}
            icon="feedback"
            label="联系与反馈"
          />
          <Row href="/terms" icon="document" label="用户协议" />
          <Row href="/privacy" icon="lock" label="隐私政策" />
          <Row
            href={accountPanelUrl("aboutSpeakFlow")}
            icon="info"
            label="关于 SpeakFlow"
          />
        </Section>

        <button
          type="button"
          className={styles.logoutRow}
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          <span className={styles.logoutIcon}>
            <MenuIcon name="logout" />
          </span>
          <strong>退出登录</strong>
        </button>
      </section>
    </main>
  );
}
