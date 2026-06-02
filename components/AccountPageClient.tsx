"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import styles from "./AccountPageClient.module.css";

type AccountPageClientProps = {
  initialPanel?: string;
  isAdmin: boolean;
  showProSuccessOnLoad: boolean;
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
  | "display"
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

type ProFeatureIconName = "bookmark" | "cloud" | "graduation" | "infinity";
type DisplayTheme = "light" | "dark";
type DisplayBrightness = "dim" | "standard" | "bright";
type DisplayFontSize = "small" | "standard" | "large";

const accountAvatarStoragePrefix = "speakflow-account-avatar";
const accountPageUrl = (panel: string) => `/account?panel=${panel}`;
const appearancePreferenceStorageKey = "speakflow-appearance-preference";
const brightnessPreferenceStorageKey = "speakflow-display-brightness";
const fontSizePreferenceStorageKey = "speakflow-font-size-preference";

const displayThemeOptions: Array<{
  description: string;
  label: string;
  value: DisplayTheme;
}> = [
  {
    description: "清爽明亮，适合白天使用",
    label: "浅色屏幕",
    value: "light",
  },
  {
    description: "降低眩光，适合夜间练习",
    label: "深色屏幕",
    value: "dark",
  },
];

const displayFontSizeOptions: Array<{
  description: string;
  label: string;
  value: DisplayFontSize;
}> = [
  {
    description: "信息更紧凑",
    label: "小",
    value: "small",
  },
  {
    description: "默认阅读大小",
    label: "标准",
    value: "standard",
  },
  {
    description: "文字更醒目",
    label: "大",
    value: "large",
  },
];

function isDisplayTheme(value: string | null): value is DisplayTheme {
  return value === "light" || value === "dark";
}

function isDisplayBrightness(value: string | null): value is DisplayBrightness {
  return value === "dim" || value === "standard" || value === "bright";
}

function isDisplayFontSize(value: string | null): value is DisplayFontSize {
  return value === "small" || value === "standard" || value === "large";
}

function brightnessToSliderValue(value: DisplayBrightness) {
  if (value === "dim") return 0;
  if (value === "bright") return 2;
  return 1;
}

function sliderValueToBrightness(value: string): DisplayBrightness {
  if (value === "0") return "dim";
  if (value === "2") return "bright";
  return "standard";
}

const proSuccessFeatures: Array<{
  description: string;
  icon: ProFeatureIconName;
  title: string;
}> = [
  {
    description: "不限制练习次数，想练就练",
    icon: "infinity",
    title: "无限练习",
  },
  {
    description: "随心收藏表达，永久保存",
    icon: "bookmark",
    title: "无限收藏",
  },
  {
    description: "所有课程和场景，全部为你开放",
    icon: "graduation",
    title: "全部课程开放",
  },
  {
    description: "学习进度云端保存，永不丢失",
    icon: "cloud",
    title: "学习记录永久保存",
  },
];

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
    case "display":
      return (
        <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
          <rect x="5" y="7" width="22" height="15" rx="3" />
          <path d="M12 27h8M16 22v5M21.5 11.5l2 2-2 2M10.5 11.5l-2 2 2 2" />
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

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="m6 12.5 4 4L18 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function PartyIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 96 96">
      <path
        d="M22 78 39 26l31 31-52 17c-2.4.8-4.2-1-3.4-3.4L22 78Z"
        fill="#6d4cff"
      />
      <path d="m30 53 19 19-27 8 8-27Z" fill="#4a6cff" />
      <path d="m35 39 23 23-8 2-18-18 3-7Z" fill="#ffd45a" />
      <path d="m40 26 31 31" fill="none" stroke="#ffb33f" strokeWidth="6" />
      <path
        d="M51 23c2-8 9-6 8 0-1 5-5 5-5 10M63 32c8-7 14-1 8 5-4 4-8 1-11 8M48 15c-1-8 8-9 9-2M71 23c3-8 12-4 8 3"
        fill="none"
        stroke="#6d6cff"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M58 20c7 1 10 6 10 13M69 43c5-2 9-1 12 3"
        fill="none"
        stroke="#ff5f91"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M40 20h.1M73 17h.1M84 37h.1M63 8h.1"
        fill="none"
        strokeLinecap="round"
        strokeWidth="7"
      />
    </svg>
  );
}

function ProFeatureIcon({ name }: { name: ProFeatureIconName }) {
  if (name === "bookmark") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
        <path d="M10 6h12a2 2 0 0 1 2 2v20l-8-5-8 5V8a2 2 0 0 1 2-2Z" />
      </svg>
    );
  }

  if (name === "cloud") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
        <path d="M11 25h15a5 5 0 0 0 0-10 8.2 8.2 0 0 0-15.8-2.2A6.3 6.3 0 0 0 11 25Z" />
        <path d="M16 23v-8M12.5 18.5 16 15l3.5 3.5" />
      </svg>
    );
  }

  if (name === "graduation") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
        <path d="m4 12 12-6 12 6-12 6-12-6Z" />
        <path d="M9 15v6c3 4 11 4 14 0v-6M27 13v7" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
      <path d="M11 21c-4 0-6-3.1-6-5s2-5 6-5c5 0 7 10 12 10 4 0 6-3.1 6-5s-2-5-6-5c-5 0-7 10-12 10Z" />
    </svg>
  );
}

function ShieldStarIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 80 80">
      <path d="M40 7 64 16v17c0 15-9.8 26.7-24 33-14.2-6.3-24-18-24-33V16L40 7Z" />
      <path d="m40 21 5.2 10.5 11.6 1.7-8.4 8.2 2 11.5L40 47.5 29.6 53l2-11.5-8.4-8.2 11.6-1.7L40 21Z" />
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
  initialPanel = "",
  isAdmin,
  showProSuccessOnLoad,
  userEmail,
  userImage,
  userName,
}: AccountPageClientProps) {
  const router = useRouter();
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
  const [isProSuccessDismissed, setIsProSuccessDismissed] = useState(false);
  const [activePanel, setActivePanel] = useState(initialPanel);
  const [displayTheme, setDisplayTheme] = useState<DisplayTheme>("light");
  const [displayBrightness, setDisplayBrightness] =
    useState<DisplayBrightness>("standard");
  const [displayFontSize, setDisplayFontSize] =
    useState<DisplayFontSize>("standard");
  const [displayPreferencesLoaded, setDisplayPreferencesLoaded] =
    useState(false);
  const subscriptionCopy = useMemo(
    () => getSubscriptionCopy(subscription),
    [subscription]
  );
  const isProSubscription =
    subscription?.subscriptionStatus === "pro" ||
    subscription?.subscriptionStatus === "cancels_at_period_end";
  const showProSuccessModal =
    showProSuccessOnLoad && isProSubscription && !isProSuccessDismissed;

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
    setActivePanel(initialPanel);
  }, [initialPanel]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTheme = window.localStorage.getItem(appearancePreferenceStorageKey);
    const savedBrightness = window.localStorage.getItem(
      brightnessPreferenceStorageKey
    );
    const savedFontSize = window.localStorage.getItem(fontSizePreferenceStorageKey);

    if (isDisplayTheme(savedTheme)) {
      setDisplayTheme(savedTheme);
    }

    if (isDisplayBrightness(savedBrightness)) {
      setDisplayBrightness(savedBrightness);
    }

    if (isDisplayFontSize(savedFontSize)) {
      setDisplayFontSize(savedFontSize);
    }

    setDisplayPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !displayPreferencesLoaded) return;

    document.documentElement.dataset.appTheme = displayTheme;
    document.documentElement.dataset.speakflowTheme = displayTheme;
    window.localStorage.setItem(appearancePreferenceStorageKey, displayTheme);
  }, [displayPreferencesLoaded, displayTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || !displayPreferencesLoaded) return;

    document.documentElement.dataset.appBrightness = displayBrightness;
    window.localStorage.setItem(brightnessPreferenceStorageKey, displayBrightness);
  }, [displayBrightness, displayPreferencesLoaded]);

  useEffect(() => {
    if (typeof window === "undefined" || !displayPreferencesLoaded) return;

    document.documentElement.dataset.speakflowFontSize = displayFontSize;
    window.localStorage.setItem(fontSizePreferenceStorageKey, displayFontSize);
  }, [displayFontSize, displayPreferencesLoaded]);

  function updateDisplayTheme(value: DisplayTheme) {
    setDisplayTheme(value);
  }

  function updateDisplayBrightness(value: DisplayBrightness) {
    setDisplayBrightness(value);
  }

  function updateDisplayFontSize(value: DisplayFontSize) {
    setDisplayFontSize(value);
  }

  function clearCheckoutSuccessUrl() {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete("checkout");
    router.replace(`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`, {
      scroll: false,
    });
  }

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

  function closeProSuccessModal() {
    setIsProSuccessDismissed(true);
    clearCheckoutSuccessUrl();
  }

  function startLearning() {
    setIsProSuccessDismissed(true);
    router.push("/start");
  }

  function closePanel() {
    setActivePanel("");
    router.replace("/account", { scroll: false });
  }

  if (activePanel === "displayBrightness") {
    return (
      <main className={styles.page}>
        <section className={`${styles.phone} ${styles.settingsPhone}`} aria-label="显示与亮度设置">
          <header className={styles.settingsHeader}>
            <button
              type="button"
              className={styles.settingsBack}
              onClick={closePanel}
              aria-label="返回账户设置"
            >
              <ChevronIcon />
            </button>
            <div className={styles.settingsTitle}>
              <p>学习体验</p>
              <h1>显示与亮度</h1>
            </div>
          </header>

          <section className={styles.settingsSection} aria-labelledby="display-theme-title">
            <h2 id="display-theme-title">屏幕模式</h2>
            <div className={styles.themeChoiceGrid}>
              {displayThemeOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={styles.themeChoice}
                  data-selected={displayTheme === option.value}
                  onClick={() => updateDisplayTheme(option.value)}
                >
                  <span
                    className={styles.themePreview}
                    data-theme-preview={option.value}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.settingsSection} aria-labelledby="display-font-title">
            <h2 id="display-font-title">文字大小</h2>
            <div className={styles.optionStack}>
              {displayFontSizeOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={styles.optionRow}
                  data-selected={displayFontSize === option.value}
                  onClick={() => updateDisplayFontSize(option.value)}
                >
                  <span className={styles.optionText}>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  <span className={styles.sampleText} data-size={option.value}>
                    Aa
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.settingsSection} aria-labelledby="display-brightness-title">
            <div className={styles.brightnessHeader}>
              <h2 id="display-brightness-title">亮度</h2>
              <strong>
                {displayBrightness === "dim"
                  ? "柔和"
                  : displayBrightness === "bright"
                    ? "明亮"
                    : "标准"}
              </strong>
            </div>
            <div className={styles.brightnessCard}>
              <div className={styles.brightnessPreview} aria-hidden="true">
                <span />
                <span />
              </div>
              <input
                aria-label="选择屏幕亮度"
                className={styles.brightnessSlider}
                type="range"
                min="0"
                max="2"
                step="1"
                value={brightnessToSliderValue(displayBrightness)}
                onChange={(event) =>
                  updateDisplayBrightness(
                    sliderValueToBrightness(event.currentTarget.value)
                  )
                }
              />
              <div className={styles.brightnessLabels} aria-hidden="true">
                <span>柔和</span>
                <span>标准</span>
                <span>明亮</span>
              </div>
            </div>
          </section>

          <section className={styles.settingsNote}>
            <MenuIcon name="display" />
            <p>
              设置会保存在这台设备上，并同步影响首页、学习页、表达库、账户页和弹窗。
            </p>
          </section>
        </section>
      </main>
    );
  }

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
            href={accountPageUrl("subscription")}
            icon="star"
            label="SpeakFlow Pro"
            description={subscriptionCopy.subtitle}
            badge={subscriptionCopy.badge}
          />
          <Row
            href={accountPageUrl("manageSubscription")}
            icon="card"
            label="管理订阅"
          />
          <Row href={accountPageUrl("referrals")} icon="gift" label="邀请好友" />
          <Row
            href={accountPageUrl("accountManagement")}
            icon="lock"
            label="账号管理"
          />
          {isAdmin ? (
            <Row href="/admin" icon="grid" label="后台管理" />
          ) : null}
        </Section>

        <Section title="学习体验">
          <Row href={accountPageUrl("voice")} icon="headphones" label="声音" />
          <Row href={accountPageUrl("fontSize")} icon="text" label="字体大小" />
          <Row
            href={accountPageUrl("displayBrightness")}
            icon="display"
            label="显示与亮度"
          />
          <Row
            href={accountPageUrl("interfaceLanguage")}
            icon="globe"
            label="界面语言"
          />
          <Row
            href={accountPageUrl("notifications")}
            icon="bell"
            label="通知"
          />
        </Section>

        <Section title="帮助">
          <Row href={accountPageUrl("helpCenter")} icon="help" label="帮助中心" />
          <Row
            href={accountPageUrl("reportIssue")}
            icon="feedback"
            label="联系与反馈"
          />
          <Row href="/terms" icon="document" label="用户协议" />
          <Row href="/privacy" icon="lock" label="隐私政策" />
          <Row
            href={accountPageUrl("aboutSpeakFlow")}
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
      {showProSuccessModal ? (
        <div
          className={styles.proSuccessOverlay}
          aria-labelledby="pro-success-title"
          aria-modal="true"
          role="dialog"
        >
          <div className={styles.proConfettiLayer} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <section className={styles.proSuccessDialog}>
            <button
              type="button"
              className={styles.proSuccessClose}
              aria-label="关闭订阅成功弹窗"
              onClick={closeProSuccessModal}
            >
              <CloseIcon />
            </button>

            <div className={styles.proSuccessHero}>
              <span className={styles.proPartyIcon}>
                <PartyIcon />
              </span>
              <h2 id="pro-success-title">
                <span>订阅成功！</span>
                欢迎加入 <strong>SpeakFlow Pro</strong>
              </h2>
              <p>从现在开始，解锁完整学习体验</p>
            </div>

            <div className={styles.proFeaturePanel}>
              {proSuccessFeatures.map((feature) => (
                <div className={styles.proFeatureRow} key={feature.title}>
                  <span className={styles.proFeatureIcon}>
                    <ProFeatureIcon name={feature.icon} />
                  </span>
                  <span className={styles.proFeatureCopy}>
                    <strong>
                      {feature.title}
                      <em>∞</em>
                    </strong>
                    <small>{feature.description}</small>
                  </span>
                  <span className={styles.proFeatureCheck}>
                    <CheckIcon />
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.proMemberCard}>
              <span className={styles.proMemberBadge}>
                <ShieldStarIcon />
              </span>
              <span className={styles.proMemberCopy}>
                <strong>你已成为 SpeakFlow Pro 会员</strong>
                <small>让我们一起，持续提升英语表达能力吧！</small>
              </span>
            </div>

            <button
              type="button"
              className={styles.proStartButton}
              onClick={startLearning}
            >
              开始学习
              <ArrowRightIcon />
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
