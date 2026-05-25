"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type NotificationType =
  | "subscription"
  | "referral"
  | "learning"
  | "account"
  | "system";

type UserNotification = {
  createdAt: string;
  id: string;
  isRead: boolean;
  message: string;
  title: string;
  type: NotificationType;
  userEmail: string;
};

const notificationPageCopy = {
  en: {
    back: "Back",
    emptyBody:
      "Subscription changes, invite reward messages, learning reminders, account safety messages, and replies from SpeakFlow will appear here.",
    emptyTitle: "No notifications yet",
    error: "Unable to load notifications. Please try again later.",
    loading: "Loading notifications...",
    read: "Read",
    subtitle:
      "System messages, subscription updates, and invite reward messages from SpeakFlow are collected here, like an inbox.",
    title: "Notifications",
    typeLabels: {
      account: "Account",
      learning: "Learning",
      referral: "Referral",
      subscription: "Subscription",
      system: "System",
    },
    unread: "Unread",
  },
  "zh-CN": {
    back: "返回",
    emptyBody:
      "订阅变化、邀请奖励、学习提醒、账号安全消息和 SpeakFlow 的回复都会出现在这里。",
    emptyTitle: "暂时没有通知",
    error: "通知加载失败，请稍后再试。",
    loading: "正在加载通知...",
    read: "已读",
    subtitle: "SpeakFlow 发给你的系统消息、订阅更新和邀请奖励会集中显示在这里，就像收件箱。",
    title: "通知",
    typeLabels: {
      account: "账号",
      learning: "学习",
      referral: "邀请奖励",
      subscription: "订阅",
      system: "系统",
    },
    unread: "未读",
  },
} as const;

function formatNotificationTime(value: string, language: "en" | "zh-CN") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(language === "en" ? "en-US" : "zh-CN", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTypeTone(type: NotificationType) {
  if (type === "subscription") {
    return "bg-[#fff2db] text-[#b45d05] ring-[#ffd99a]";
  }

  if (type === "referral") {
    return "bg-[#f0ebff] text-[#7460e8] ring-[#e2d8ff]";
  }

  if (type === "learning") {
    return "bg-[#ecfff7] text-[#14845f] ring-[#c8f3df]";
  }

  if (type === "account") {
    return "bg-[#eef6ff] text-[#3b6ed6] ring-[#d6e7ff]";
  }

  return "bg-[#f0ebff] text-[#7460e8] ring-[#e2d8ff]";
}

export default function NotificationsPage() {
  const { language } = useLanguage();
  const copy = notificationPageCopy[language];
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      setIsLoading(true);
      setNotice("");

      try {
        const response = await fetch(`/api/notifications?t=${Date.now()}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as {
          notifications?: UserNotification[];
        };

        if (!response.ok || !Array.isArray(data.notifications)) {
          throw new Error(copy.error);
        }

        if (!cancelled) {
          setNotifications(data.notifications);
        }
      } catch {
        if (!cancelled) {
          setNotice(copy.error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [copy.error]);

  async function markAsRead(notificationId: string) {
    const current = notifications.find(
      (notification) => notification.id === notificationId
    );

    if (!current || current.isRead) return;

    setNotifications((items) =>
      items.map((item) =>
        item.id === notificationId ? { ...item, isRead: true } : item
      )
    );

    try {
      const response = await fetch(
        `/api/notifications/${encodeURIComponent(notificationId)}`,
        {
          cache: "no-store",
          method: "PATCH",
        }
      );

      if (!response.ok) {
        throw new Error(copy.error);
      }
    } catch {
      setNotifications((items) =>
        items.map((item) =>
          item.id === notificationId ? { ...item, isRead: false } : item
        )
      );
      setNotice(copy.error);
    }
  }

  return (
    <main className="responsive-page-shell min-h-[100dvh] bg-[linear-gradient(180deg,#cfc3ff_0%,#eeeaff_48%,#f8f6ff_100%)] px-4 py-5 font-[var(--font-sora)] text-[#201833]">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-[520px] flex-col rounded-[34px] border border-white/60 bg-[#f2edff]/72 px-5 pb-8 pt-5 shadow-[0_30px_80px_rgba(84,72,146,0.18)]">
        <header className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3">
          <Link
            href="/speak-english?account=1"
            aria-label={copy.back}
            className="grid h-11 w-11 place-items-center rounded-[18px] bg-[#efeaff] text-[1.45rem] font-black text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
          >
            ‹
          </Link>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-[1.35rem] font-black leading-7">
              {copy.title}
            </h1>
            <p className="mt-1 text-[0.78rem] font-extrabold text-[#7f7896]">
              {unreadCount ? `${copy.unread} ${unreadCount}` : copy.read}
            </p>
          </div>
          <span />
        </header>

        <section className="mt-6 rounded-[28px] bg-white/78 px-5 py-5 shadow-[0_20px_54px_rgba(84,72,146,0.12)] ring-1 ring-white/88">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
              <svg
                aria-hidden="true"
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 32 32"
              >
                <path d="M9 23h14l-1.5-2.4V15a5.5 5.5 0 0 0-11 0v5.6L9 23Z" />
                <path d="M13.4 25a3 3 0 0 0 5.2 0" />
              </svg>
            </span>
            <div>
              <h2 className="text-[1.2rem] font-black leading-7">
                {copy.title}
              </h2>
              <p className="mt-2 text-[0.94rem] font-bold leading-7 text-[#4b4267]">
                {copy.subtitle}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 min-h-0 flex-1">
          {isLoading ? (
            <p className="rounded-[24px] bg-white/70 px-5 py-6 text-center text-[0.96rem] font-extrabold text-[#7f7896] ring-1 ring-white/85">
              {copy.loading}
            </p>
          ) : notice ? (
            <p className="rounded-[24px] bg-white/70 px-5 py-6 text-center text-[0.96rem] font-extrabold text-[#d33b46] ring-1 ring-white/85">
              {notice}
            </p>
          ) : notifications.length ? (
            <div className="overflow-hidden rounded-[26px] bg-white/82 shadow-[0_18px_50px_rgba(84,72,146,0.1)] ring-1 ring-white/88">
              {notifications.map((notification, index) => {
                const toneClass = getTypeTone(notification.type);

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void markAsRead(notification.id)}
                    className={`flex w-full items-start gap-3 px-5 py-5 text-left transition hover:bg-[#fbf9ff] ${
                      index ? "border-t border-[#ece8f6]" : ""
                    }`}
                  >
                    <span
                      className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-[16px] text-[0.82rem] font-black ring-1 ${toneClass}`}
                    >
                      {notification.isRead ? "✓" : "•"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold leading-none ${toneClass}`}
                        >
                          {copy.typeLabels[notification.type]}
                        </span>
                        {!notification.isRead ? (
                          <span className="rounded-full bg-[#fff2db] px-2.5 py-1 text-[0.68rem] font-extrabold leading-none text-[#b45d05]">
                            {copy.unread}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-2 block text-[1.04rem] font-black leading-6 text-[#201833]">
                        {notification.title}
                      </span>
                      <span className="mt-2 block text-[0.9rem] font-bold leading-6 text-[#5f5680]">
                        {notification.message}
                      </span>
                      <span className="mt-3 block text-[0.76rem] font-extrabold text-[#9a91ad]">
                        {formatNotificationTime(notification.createdAt, language)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[26px] bg-white/78 px-5 py-8 text-center shadow-[0_16px_38px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
              <p className="text-[1.08rem] font-black">{copy.emptyTitle}</p>
              <p className="mt-2 text-[0.9rem] font-bold leading-6 text-[#7f7896]">
                {copy.emptyBody}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
