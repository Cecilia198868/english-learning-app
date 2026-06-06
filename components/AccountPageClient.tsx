"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import styles from "./AccountPageClient.module.css";
import { playSpeakFlowTts, stopSpeakFlowTts } from "@/lib/speakFlowTtsClient";
import {
  SPEAKFLOW_DEFAULT_VOICE_ID,
  SPEAKFLOW_VOICES,
  getSavedSpeakFlowVoiceId,
  saveSpeakFlowVoiceId,
  type SpeakFlowVoiceId,
} from "@/lib/voiceSettings";

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

type AccountPanelId =
  | "aboutSpeakFlow"
  | "accountManagement"
  | "helpCenter"
  | "interfaceLanguage"
  | "manageSubscription"
  | "notifications"
  | "referrals"
  | "reportIssue"
  | "subscription"
  | "textSize"
  | "voice";

type ReferralAccountState = {
  available?: boolean;
  bonusProUntil?: string | null;
  error?: string;
  friendRewardDays?: number;
  inviteLink?: string;
  invitedCount?: number;
  paidRewardCount?: number;
  pendingRewardCount?: number;
  referralCode?: string;
  rewardDays?: number;
};

type NotificationItem = {
  createdAt: string;
  id: string;
  isRead: boolean;
  message: string;
  title: string;
  type: "account" | "learning" | "referral" | "subscription" | "system";
};

type FeedbackFormState = {
  contactEmail: string;
  issueType: string;
  message: string;
  page: string;
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
type DisplayFontSize = "small" | "standard" | "large";

const accountAvatarStoragePrefix = "speakflow-account-avatar";
const accountPageUrl = (panel: string) => `/account?panel=${panel}`;
const fontSizePreferenceStorageKey = "speakflow-font-size-preference";

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

const accountPanelTitles: Record<AccountPanelId, { eyebrow: string; title: string }> = {
  aboutSpeakFlow: { eyebrow: "关于", title: "关于 SpeakFlow" },
  accountManagement: { eyebrow: "账户", title: "账号管理" },
  helpCenter: { eyebrow: "帮助", title: "帮助中心" },
  interfaceLanguage: { eyebrow: "学习体验", title: "界面语言" },
  manageSubscription: { eyebrow: "订阅", title: "管理订阅" },
  notifications: { eyebrow: "消息", title: "通知" },
  referrals: { eyebrow: "会员奖励", title: "邀请好友" },
  reportIssue: { eyebrow: "帮助", title: "联系与反馈" },
  subscription: { eyebrow: "会员", title: "SpeakFlow Pro" },
  textSize: { eyebrow: "学习体验", title: "文字大小" },
  voice: { eyebrow: "学习体验", title: "声音" },
};

const proPlanCards = [
  {
    description: "适合短期集中练习，按月灵活续订。",
    id: "monthly",
    name: "月付套餐",
    price: "$4.99",
    suffix: "/ 月",
  },
  {
    badge: "推荐",
    description: "适合长期学习，平均约 $3.33 / 月。",
    id: "yearly",
    name: "年付套餐",
    price: "$39.99",
    suffix: "/ 年",
  },
] as const;

const proFeatureRows = [
  "不限次数 AI 口语练习",
  "经典场景和课程完整开放",
  "表达库、收藏和学习记录持续保存",
  "更自然的英文朗读和跟读体验",
];

const interfaceLanguageOptions = [
  { available: true, code: "zh-CN", localName: "简体中文", name: "Chinese (Simplified)" },
  { available: true, code: "en", localName: "English", name: "English" },
  { available: false, code: "es", localName: "Español", name: "Spanish" },
  { available: false, code: "ja", localName: "日本語", name: "Japanese" },
  { available: false, code: "ko", localName: "한국어", name: "Korean" },
  { available: false, code: "fr", localName: "Français", name: "French" },
] as const;

const feedbackIssueTypes = [
  { label: "付款或 Pro 状态", value: "payment" },
  { label: "邀请好友或奖励", value: "referral" },
  { label: "麦克风或朗读", value: "voice" },
  { label: "学习流程", value: "practice_flow" },
  { label: "账号管理", value: "account_management" },
  { label: "功能建议", value: "suggestion" },
  { label: "其他", value: "other" },
] as const;

const helpSections = [
  {
    body:
      "先说中文，让 SpeakFlow 抓住你的真实意思；再看着中文说英文，对比推荐表达，听朗读、跟读，再继续回答追问。",
    title: "最推荐的练习方式",
  },
  {
    body:
      "如果麦克风没有反应，请先检查浏览器麦克风权限、系统输入设备和蓝牙耳机连接。Chrome/Edge 可以点地址栏旁边的权限图标查看。",
    title: "麦克风无法使用怎么办？",
  },
  {
    body:
      "Pro 会解锁更多练习次数、完整课程和更连续的学习体验。订阅、取消、发票和付款方式都通过 Stripe 安全页面处理。",
    title: "订阅和付款在哪里管理？",
  },
  {
    body:
      "经典场景用于银行、政府表格、交通、医疗、餐饮、住宿等真实生活场景。每个课程都应该打开即可练，不需要临时等待生成。",
    title: "经典场景课程怎么学？",
  },
];

function isDisplayFontSize(value: string | null): value is DisplayFontSize {
  return value === "small" || value === "standard" || value === "large";
}

function isTextSizePanel(value: string) {
  return value === "textSize" || value === "displaySettings";
}

function isAccountPanelId(value: string): value is AccountPanelId {
  return value in accountPanelTitles;
}

function formatRelativeNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;

  return formatChineseDate(value);
}

function getNotificationTypeLabel(type: NotificationItem["type"]) {
  const labels: Record<NotificationItem["type"], string> = {
    account: "账号",
    learning: "学习",
    referral: "邀请",
    subscription: "订阅",
    system: "系统",
  };

  return labels[type];
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
  const [displayFontSize, setDisplayFontSize] =
    useState<DisplayFontSize>("standard");
  const [displayPreferencesLoaded, setDisplayPreferencesLoaded] =
    useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormState>({
    contactEmail: userEmail,
    issueType: "other",
    message: "",
    page: "",
  });
  const [feedbackStatus, setFeedbackStatus] = useState<
    "error" | "idle" | "success" | "submitting"
  >("idle");
  const [interfaceLanguage, setInterfaceLanguage] = useState("zh-CN");
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(
    null
  );
  const [referralNotice, setReferralNotice] = useState("");
  const [referralState, setReferralState] =
    useState<ReferralAccountState | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] =
    useState<SpeakFlowVoiceId>(SPEAKFLOW_DEFAULT_VOICE_ID);
  const [voicePreferenceLoaded, setVoicePreferenceLoaded] = useState(false);
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

    const savedFontSize = window.localStorage.getItem(fontSizePreferenceStorageKey);

    if (isDisplayFontSize(savedFontSize)) {
      setDisplayFontSize(savedFontSize);
    }

    setDisplayPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !displayPreferencesLoaded) return;

    document.documentElement.dataset.speakflowFontSize = displayFontSize;
    window.localStorage.setItem(fontSizePreferenceStorageKey, displayFontSize);
  }, [displayFontSize, displayPreferencesLoaded]);

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

  useEffect(() => {
    setFeedbackForm((current) => ({
      ...current,
      contactEmail: current.contactEmail || userEmail,
    }));
  }, [userEmail]);

  useEffect(() => {
    if (activePanel !== "referrals" || referralState) return;

    const controller = new AbortController();

    async function loadReferralState() {
      try {
        const response = await fetch(`/api/referrals/me?t=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as ReferralAccountState;

        if (!response.ok) {
          setReferralState({ available: false, error: data.error || "邀请信息读取失败" });
          return;
        }

        setReferralState(data);
      } catch {
        if (!controller.signal.aborted) {
          setReferralState({ available: false, error: "邀请信息读取失败" });
        }
      }
    }

    void loadReferralState();

    return () => controller.abort();
  }, [activePanel, referralState]);

  useEffect(() => {
    if (activePanel !== "notifications" || notifications) return;

    const controller = new AbortController();

    async function loadNotifications() {
      try {
        const response = await fetch(`/api/notifications?t=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as {
          notifications?: NotificationItem[];
        };

        setNotifications(
          response.ok && Array.isArray(data.notifications) ? data.notifications : []
        );
      } catch {
        if (!controller.signal.aborted) {
          setNotifications([]);
        }
      }
    }

    void loadNotifications();

    return () => controller.abort();
  }, [activePanel, notifications]);

  useEffect(() => {
    setSelectedVoiceId(getSavedSpeakFlowVoiceId());
    setVoicePreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (activePanel !== "voice") return;

    return () => {
      stopSpeakFlowTts();
    };
  }, [activePanel]);

  useEffect(() => {
    if (!voicePreferenceLoaded) return;

    saveSpeakFlowVoiceId(selectedVoiceId);
  }, [selectedVoiceId, voicePreferenceLoaded]);

  function closeProSuccessModal() {
    setIsProSuccessDismissed(true);
    clearCheckoutSuccessUrl();
  }

  function startLearning() {
    setIsProSuccessDismissed(true);
    router.push("/start");
  }

  function openPanel(panel: AccountPanelId) {
    setActionMessage("");
    setActivePanel(panel);
    router.push(accountPageUrl(panel), { scroll: false });
  }

  function closePanel() {
    setActivePanel("");
    router.replace("/account", { scroll: false });
  }

  async function createStripeCheckout(plan: "monthly" | "yearly") {
    setActionMessage("");
    setBusyAction(`checkout-${plan}`);

    try {
      const response = await fetch("/api/stripe/checkout", {
        body: JSON.stringify({ plan }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "创建订阅页面失败");
      }

      window.location.href = data.url;
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "创建订阅页面失败");
    } finally {
      setBusyAction("");
    }
  }

  async function openBillingPortal() {
    setActionMessage("");
    setBusyAction("portal");

    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "无法打开订阅管理");
      }

      window.location.href = data.url;
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "无法打开订阅管理");
    } finally {
      setBusyAction("");
    }
  }

  async function restorePurchase() {
    setActionMessage("");
    setBusyAction("restore");

    try {
      const response = await fetch("/api/stripe/restore", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as
        | AccountSubscriptionResponse
        | { error?: string };

      if (!response.ok || ("error" in data && data.error)) {
        throw new Error(("error" in data && data.error) || "没有找到可恢复的订阅");
      }

      setSubscription(data as AccountSubscriptionResponse);
      setActionMessage("已刷新你的订阅状态。");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "恢复购买失败");
    } finally {
      setBusyAction("");
    }
  }

  async function copyReferralInviteLink() {
    if (!referralState?.inviteLink) return;

    try {
      await window.navigator.clipboard.writeText(referralState.inviteLink);
      setReferralNotice("邀请链接已复制。");
    } catch {
      setReferralNotice(referralState.inviteLink);
    }
  }

  function previewVoice(voiceId: SpeakFlowVoiceId) {
    void playSpeakFlowTts({
      rate: 0.92,
      text: "Hello, this is the SpeakFlow practice voice.",
      voiceId,
    });
  }

  function requestAccountDeletion() {
    setFeedbackForm((current) => ({
      ...current,
      issueType: "account_management",
      message:
        "我想删除我的 SpeakFlow 账号，请帮我核对并处理这个请求。",
      page: "账号管理",
    }));
    openPanel("reportIssue");
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (feedbackForm.message.trim().length < 6) {
      setFeedbackStatus("error");
      setActionMessage("请把问题描述得更具体一点。");
      return;
    }

    setActionMessage("");
    setFeedbackStatus("submitting");

    try {
      const response = await fetch("/api/support/feedback", {
        body: JSON.stringify({
          contactEmail: feedbackForm.contactEmail,
          issueType: feedbackForm.issueType,
          language: "zh-CN",
          message: feedbackForm.message,
          page: feedbackForm.page,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "反馈发送失败");
      }

      setFeedbackStatus("success");
      setActionMessage("反馈已发送，SpeakFlow 会尽快查看。");
      setFeedbackForm((current) => ({ ...current, message: "" }));
    } catch (error) {
      setFeedbackStatus("error");
      setActionMessage(error instanceof Error ? error.message : "反馈发送失败");
    }
  }

  if (isTextSizePanel(activePanel)) {
    return (
      <main className={styles.page}>
        <section className={`${styles.phone} ${styles.settingsPhone}`} aria-label="文字大小">
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
              <h1>文字大小</h1>
            </div>
          </header>

          <section className={styles.settingsSection} aria-labelledby="text-size-title">
            <h2 id="text-size-title">选择文字大小</h2>
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

          <section className={styles.settingsNote}>
            <MenuIcon name="text" />
            <p>
              这个选择会保存在这台设备上，并同步影响首页、学习页、表达库、账户页和弹窗。
            </p>
          </section>
        </section>
      </main>
    );
  }

  const secondaryPanel =
    isAccountPanelId(activePanel) && !isTextSizePanel(activePanel)
      ? activePanel
      : null;

  if (secondaryPanel) {
    const panelTitle = accountPanelTitles[secondaryPanel];
    const selectedLanguage =
      interfaceLanguageOptions.find((option) => option.code === interfaceLanguage) ||
      interfaceLanguageOptions[0];

    const panelContent =
      secondaryPanel === "subscription" ? (
        <div className={styles.panelStack}>
          <section className={styles.panelHero}>
            <span className={styles.panelHeroIcon}>
              <MenuIcon name="star" />
            </span>
            <div>
              <h2>让练习不再被次数打断</h2>
              <p>
                Pro 适合每天稳定练口语的学习者，解锁更多练习次数、课程和表达复习能力。
              </p>
            </div>
          </section>

          <div className={styles.planGrid}>
            {proPlanCards.map((plan) => (
              <button
                type="button"
                className={styles.planCard}
                data-featured={plan.id === "yearly"}
                key={plan.id}
                onClick={() => void createStripeCheckout(plan.id)}
                disabled={busyAction === `checkout-${plan.id}`}
              >
                <span className={styles.planTopLine}>
                  <strong>{plan.name}</strong>
                  {"badge" in plan ? <em>{plan.badge}</em> : null}
                </span>
                <span className={styles.planPrice}>
                  {plan.price}
                  <small>{plan.suffix}</small>
                </span>
                <span>{plan.description}</span>
              </button>
            ))}
          </div>

          <section className={styles.panelCard}>
            <h3>Pro 包含</h3>
            <ul className={styles.checkList}>
              {proFeatureRows.map((feature) => (
                <li key={feature}>
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : secondaryPanel === "manageSubscription" ? (
        <div className={styles.panelStack}>
          <section className={styles.panelHero}>
            <span className={styles.panelHeroIcon}>
              <MenuIcon name="card" />
            </span>
            <div>
              <h2>{subscriptionCopy.badge}</h2>
              <p>{subscriptionCopy.subtitle}</p>
            </div>
          </section>

          <section className={styles.panelCard}>
            <h3>订阅管理</h3>
            <p>
              你可以在 Stripe 安全页面中更新付款方式、查看账单、取消订阅或恢复订阅状态。
            </p>
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => void openBillingPortal()}
                disabled={busyAction === "portal"}
              >
                {busyAction === "portal" ? "正在打开..." : "打开订阅管理"}
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => void restorePurchase()}
                disabled={busyAction === "restore"}
              >
                {busyAction === "restore" ? "正在恢复..." : "恢复购买"}
              </button>
            </div>
          </section>
        </div>
      ) : secondaryPanel === "referrals" ? (
        <div className={styles.panelStack}>
          <section className={styles.panelHero}>
            <span className={styles.panelHeroIcon}>
              <MenuIcon name="gift" />
            </span>
            <div>
              <h2>邀请好友一起练口语</h2>
              <p>
                好友通过你的链接注册后可获得试用奖励；好友首次付费后，你也会获得 Pro 奖励。
              </p>
            </div>
          </section>

          <section className={styles.panelCard}>
            {referralState ? (
              referralState.available ? (
                <>
                  <h3>你的邀请链接</h3>
                  <p className={styles.copyBox}>{referralState.inviteLink}</p>
                  <button
                    type="button"
                    className={`${styles.primaryAction} ${styles.inviteCopyAction}`}
                    onClick={() => void copyReferralInviteLink()}
                  >
                    复制邀请链接
                  </button>
                  {referralNotice ? (
                    <p className={styles.panelMessage}>{referralNotice}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <h3>暂时无法读取邀请信息</h3>
                  <p>{referralState.error || "请稍后再试。"}</p>
                </>
              )
            ) : (
              <p>正在读取邀请信息...</p>
            )}
          </section>

          <div className={styles.statsGrid}>
            <span>
              <strong>{referralState?.invitedCount || 0}</strong>
              已邀请
            </span>
            <span>
              <strong>{referralState?.pendingRewardCount || 0}</strong>
              待奖励
            </span>
            <span>
              <strong>{referralState?.paidRewardCount || 0}</strong>
              已奖励
            </span>
          </div>
        </div>
      ) : secondaryPanel === "accountManagement" ? (
        <div className={styles.panelStack}>
          <section className={styles.panelHero}>
            <span className={styles.panelHeroIcon}>
              <MenuIcon name="lock" />
            </span>
            <div>
              <h2>账号与安全</h2>
              <p>管理登录邮箱、订阅识别和账号删除请求。</p>
            </div>
          </section>

          <section className={styles.panelCard}>
            <h3>联系邮箱</h3>
            <p className={styles.copyBox}>{userEmail || "未绑定邮箱"}</p>
            <p>SpeakFlow 使用这个邮箱识别登录、订阅状态、客服回复和账号记录。</p>
          </section>

          <section className={styles.panelCard}>
            <h3>登录与安全</h3>
            <p>
              请使用同一个邮箱登录练习、管理订阅和恢复购买。不要把登录状态分享给他人。
            </p>
          </section>

          <section className={styles.dangerCard}>
            <h3>删除账号</h3>
            <p>
              删除账号是不可恢复操作。SpeakFlow 会先通过反馈入口核对身份，再处理账号记录。
            </p>
            <button
              type="button"
              className={styles.dangerAction}
              onClick={requestAccountDeletion}
            >
              申请删除账号
            </button>
          </section>
        </div>
      ) : secondaryPanel === "voice" ? (
        <div className={styles.panelStack}>
          <section className={styles.panelHero}>
            <span className={styles.panelHeroIcon}>
              <MenuIcon name="headphones" />
            </span>
            <div>
              <h2>选择英文朗读声音</h2>
              <p>这里会影响练习页里的英文播放和跟读预览。</p>
            </div>
          </section>

          <div className={styles.optionStack}>
            {SPEAKFLOW_VOICES.map((voice) => (
                <button
                  type="button"
                  className={styles.choiceRow}
                  data-selected={selectedVoiceId === voice.id}
                  key={voice.id}
                  onClick={() => {
                    setSelectedVoiceId(voice.id);
                    previewVoice(voice.id);
                  }}
                >
                  <span className={styles.choiceDot}>
                    {selectedVoiceId === voice.id ? <CheckIcon /> : null}
                  </span>
                  <span>
                    <strong>{voice.name}</strong>
                    <small>
                      {voice.gender} · {voice.tone}
                    </small>
                  </span>
                  <em>{voice.description}</em>
                </button>
            ))}
            {SPEAKFLOW_VOICES.length === 0 ? (
              <section className={styles.panelCard}>
                <h3>没有读取到可用英文声音</h3>
                <p>请检查浏览器或系统的语音服务，稍后重新进入这个页面。</p>
              </section>
            ) : null}
          </div>
        </div>
      ) : secondaryPanel === "interfaceLanguage" ? (
        <div className={styles.panelStack}>
          <section className={styles.panelHero}>
            <span className={styles.panelHeroIcon}>
              <MenuIcon name="globe" />
            </span>
            <div>
              <h2>当前语言：{selectedLanguage.localName}</h2>
              <p>选择 SpeakFlow 菜单、账户页和设置页使用的界面语言。</p>
            </div>
          </section>

          <div className={styles.optionStack}>
            {interfaceLanguageOptions.map((option) => (
              <button
                type="button"
                className={styles.choiceRow}
                data-selected={interfaceLanguage === option.code}
                key={option.code}
                disabled={!option.available}
                onClick={() => option.available && setInterfaceLanguage(option.code)}
              >
                <span className={styles.choiceDot}>
                  {interfaceLanguage === option.code ? <CheckIcon /> : null}
                </span>
                <span>
                  <strong>{option.localName}</strong>
                  <small>{option.name}</small>
                </span>
                <em>{option.available ? "可用" : "计划中"}</em>
              </button>
            ))}
          </div>
        </div>
      ) : secondaryPanel === "notifications" ? (
        <div className={styles.panelStack}>
          <section className={styles.panelHero}>
            <span className={styles.panelHeroIcon}>
              <MenuIcon name="bell" />
            </span>
            <div>
              <h2>通知收件箱</h2>
              <p>订阅、邀请奖励、客服回复、账号安全和系统消息会显示在这里。</p>
            </div>
          </section>

          <div className={styles.notificationStack}>
            {notifications ? (
              notifications.length ? (
                notifications.map((notification) => (
                  <article className={styles.notificationCard} key={notification.id}>
                    <span>{getNotificationTypeLabel(notification.type)}</span>
                    <h3>{notification.title}</h3>
                    <p>{notification.message}</p>
                    <small>{formatRelativeNotificationTime(notification.createdAt)}</small>
                  </article>
                ))
              ) : (
                <section className={styles.panelCard}>
                  <h3>暂无新通知</h3>
                  <p>重要系统消息、订阅变化和客服回复会出现在这里。</p>
                </section>
              )
            ) : (
              <section className={styles.panelCard}>
                <p>正在读取通知...</p>
              </section>
            )}
          </div>
        </div>
      ) : secondaryPanel === "helpCenter" ? (
        <div className={styles.panelStack}>
          <section className={styles.panelHero}>
            <span className={styles.panelHeroIcon}>
              <MenuIcon name="help" />
            </span>
            <div>
              <h2>常见问题</h2>
              <p>这里整理了练习流程、麦克风、订阅和经典场景课程的常见问题。</p>
            </div>
          </section>

          {helpSections.map((item) => (
            <section className={styles.panelCard} key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </section>
          ))}
        </div>
      ) : secondaryPanel === "reportIssue" ? (
        <form className={styles.feedbackForm} onSubmit={submitFeedback}>
          <section className={styles.panelHero}>
            <span className={styles.panelHeroIcon}>
              <MenuIcon name="feedback" />
            </span>
            <div>
              <h2>告诉我们发生了什么</h2>
              <p>请写清楚页面、设备、账号状态和具体问题，方便快速定位。</p>
            </div>
          </section>

          <label>
            <span>问题类型</span>
            <select
              value={feedbackForm.issueType}
              onChange={(event) =>
                setFeedbackForm((current) => ({
                  ...current,
                  issueType: event.target.value,
                }))
              }
            >
              {feedbackIssueTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>相关页面</span>
            <input
              value={feedbackForm.page}
              onChange={(event) =>
                setFeedbackForm((current) => ({
                  ...current,
                  page: event.target.value,
                }))
              }
              placeholder="例如：邀请好友、声音、订阅管理"
            />
          </label>

          <label>
            <span>回复邮箱</span>
            <input
              value={feedbackForm.contactEmail}
              onChange={(event) =>
                setFeedbackForm((current) => ({
                  ...current,
                  contactEmail: event.target.value,
                }))
              }
              placeholder="you@example.com"
            />
          </label>

          <label>
            <span>具体问题</span>
            <textarea
              value={feedbackForm.message}
              onChange={(event) =>
                setFeedbackForm((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              placeholder="请描述你遇到的问题或建议。"
              rows={7}
            />
          </label>

          <button
            type="submit"
            className={`${styles.primaryAction} ${styles.feedbackSubmitAction}`}
            disabled={feedbackStatus === "submitting"}
          >
            {feedbackStatus === "submitting" ? "正在发送..." : "发送反馈"}
          </button>
        </form>
      ) : (
        <div className={styles.panelStack}>
          <section className={styles.panelHero}>
            <span className={styles.panelHeroIcon}>
              <MenuIcon name="info" />
            </span>
            <div>
              <h2>SpeakFlow</h2>
              <p>把真实想法练成能开口说出来的英语。</p>
            </div>
          </section>

          <section className={styles.panelCard}>
            <h3>产品定位</h3>
            <p>
              SpeakFlow 是为真实口语输出设计的英语练习工具，帮助学习者从中文想法过渡到自然英文表达。
            </p>
          </section>

          <section className={styles.panelCard}>
            <h3>核心学习方式</h3>
            <p>
              先说真实想法，再学习推荐表达、跟读、复述，并把高频表达沉淀到自己的表达库。
            </p>
          </section>
        </div>
      );

    return (
      <main className={styles.page}>
        <section className={`${styles.phone} ${styles.settingsPhone}`} aria-label={panelTitle.title}>
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
              <p>{panelTitle.eyebrow}</p>
              <h1>{panelTitle.title}</h1>
            </div>
          </header>

          {actionMessage ? (
            <p
              className={styles.panelMessage}
              data-status={
                feedbackStatus === "error" ? "error" : "success"
              }
            >
              {actionMessage}
            </p>
          ) : null}

          {panelContent}
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
          <Row
            href={accountPageUrl("textSize")}
            icon="text"
            label="文字大小"
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
