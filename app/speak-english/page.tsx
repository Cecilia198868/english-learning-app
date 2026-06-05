"use client";

import type { ChangeEvent, MutableRefObject, PointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import FreePracticeLimitModal from "@/components/FreePracticeLimitModal";
import FreeStudyHeader from "@/components/FreeStudyHeader";
import FreeStudyPageOne from "@/components/FreeStudyPageOne";
import FreeStudyPageTwo from "@/components/FreeStudyPageTwo";
import FreeStudyPageThree from "@/components/FreeStudyPageThree";
import FreeStudyPageFour from "@/components/FreeStudyPageFour";
import FreeStudyPageFiveTop from "@/components/FreeStudyPageFiveTop";
import FreeStudyPageFiveBottomBar from "@/components/FreeStudyPageFiveBottomBar";
import GuestAiPracticeProgress from "@/components/GuestAiPracticeProgress";
import HomeMenuIcon from "@/components/HomeMenuIcon";
import AiGuidedExpressionStepFour from "@/components/AiGuidedExpressionStepFour";
import AiGuidedExpressionStepFive from "@/components/AiGuidedExpressionStepFive";
import FreeUsageMeter from "@/components/FreeUsageMeter";
import { useLanguage } from "@/components/LanguageProvider";
import PlayIcon from "@/components/PlayIcon";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";
import {
  addVocabularyWord,
  flushVocabularyCloudSync,
  generateVocabularyDefinition,
  hasUsableMeaning,
  syncVocabularyWordsWithCloud,
  tokenizeEnglishSentence,
  updateVocabularyWord,
} from "@/lib/vocabulary";
import { featuredLessonRecords } from "@/data/featuredCourses";
import {
  createFallbackHighlightedExpressions,
  splitSentenceByHighlightedExpressions,
  type HighlightedExpression,
} from "@/lib/expressionHighlights";
import {
  FREE_PRACTICE_DAILY_LIMIT,
  type FreePracticeScope,
  getFreePracticeUsage,
  hasFreePracticeCompletion,
  isFreePracticeLimitReached,
  recordFreePracticeCompletion,
} from "@/lib/freePracticeLimit";
import type { AppLanguage } from "@/lib/i18n";
import { createLoginUrl, subscriptionCallbackUrl } from "@/lib/loginRedirect";

type KeyboardMode = "zh" | "en" | "handwriting" | "symbols";
type PracticeStage = "native" | "english";
type TrainingGroundMode = "default" | "guided";
type GuidedConversationTurn = {
  chinese: string;
  userEnglish: string;
  recommendedEnglish: string;
};
type FreeConversationResponse = {
  simple: string;
  standard: string;
  natural: string;
  questionEnglish: string;
  questionChinese: string;
  hintChinese: string;
};
type FreeConversationPrefetch = {
  requestKey: string;
  response: FreeConversationResponse;
};

type ClassicCourseLesson = { id?: string; title: string };

type ClassicCourseSection = {
  id: string;
  label: string;
  lessons: ClassicCourseLesson[];
};

type ClassicCourseCategory = {
  id: string;
  label: string;
  sections: ClassicCourseSection[];
};

type ExpressionVariantKey = "standard" | "idiomatic" | "simple" | "natural";

type ExpressionVariant = {
  key: ExpressionVariantKey;
  label: string;
  text: string;
};

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = {
  0?: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultEventLike = Event & {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SubscriptionStatus = "free" | "pro" | "cancels_at_period_end";

type SessionResponse = {
  user?: {
    avatarUrl?: string | null;
    email?: string | null;
    image?: string | null;
    name?: string | null;
    photoURL?: string | null;
    photoUrl?: string | null;
    picture?: string | null;
    role?: "user" | "admin" | null;
  } | null;
};

type AccountSubscriptionResponse = {
  bonusProUntil?: string | null;
  currentPeriodEnd?: string | null;
  entitlementSource?: "bonus" | "free" | "stripe";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
};

type ReferralAccountResponse = {
  available?: boolean;
  bonusProUntil?: string | null;
  inviteLink?: string;
  invitedCount?: number;
  paidRewardCount?: number;
  referralCode?: string;
  referredByEmail?: string | null;
  signupBonusUntil?: string | null;
};

function normalizeSubscriptionStatus(
  subscriptionStatus?: SubscriptionStatus | null
): SubscriptionStatus {
  return subscriptionStatus === "pro" ||
    subscriptionStatus === "cancels_at_period_end"
    ? subscriptionStatus
    : "free";
}

function createAccountSubscriptionUrl() {
  return `/api/me/subscription?t=${Date.now()}`;
}

function createReferralAccountUrl() {
  return `/api/referrals/me?t=${Date.now()}`;
}

function hasProAccess(subscriptionStatus: SubscriptionStatus) {
  return subscriptionStatus !== "free";
}

type AccountPanelView =
  | "menu"
  | "account"
  | "subscription"
  | "checkout"
  | "voice"
  | "manageSubscription"
  | "referrals"
  | "helpCenter"
  | "reportIssue"
  | "aboutSpeakFlow"
  | "accountManagement"
  | "interfaceLanguage"
  | "notifications"
  | "fontSize";

type ProPlan = "monthly" | "yearly";
type FontSizePreference = "small" | "standard" | "large";

type InterfaceLanguageOption = {
  code: string;
  englishName: string;
  localName: string;
  region: string;
  uiLanguage?: AppLanguage;
};

type AccountMenuAction =
  | "adminDashboard"
  | "subscription"
  | "voice"
  | "manageSubscription"
  | "referrals"
  | "helpCenter"
  | "reportIssue"
  | "aboutSpeakFlow"
  | "accountManagement"
  | "interfaceLanguage"
  | "notifications"
  | "fontSize"
  | "terms"
  | "privacy";

type AccountMenuItem = {
  action?: AccountMenuAction;
  children?: readonly string[];
  icon?: string;
  label: string;
  trailing?: string;
};

type AccountMenuSection = {
  items: readonly AccountMenuItem[];
  title: string;
};

type AccountHomeRow = {
  action?: AccountMenuAction;
  badge?: string;
  danger?: boolean;
  icon: AccountMenuIconName;
  label: string;
  onClick?: () => void;
};

type AccountHomeGroup = {
  rows: readonly AccountHomeRow[];
  title?: string;
};

type NotificationInboxItem = {
  body: string;
  id: string;
  sender: string;
  tag: string;
  time: string;
  title: string;
  tone: "blue" | "green" | "orange" | "purple";
  unread?: boolean;
};

type AccountMenuIconName =
  | "star"
  | "card"
  | "gift"
  | "refresh"
  | "headphones"
  | "font"
  | "globe"
  | "moon"
  | "bell"
  | "help"
  | "chat"
  | "file"
  | "lock"
  | "info"
  | "dashboard"
  | "logout";

type HelpCenterArticle = {
  body: readonly string[];
  bullets?: readonly string[];
  title: string;
};

type HelpCenterSection = {
  articles: readonly HelpCenterArticle[];
  description: string;
  title: string;
};

const accountAvatarStoragePrefix = "speakflow-account-avatar";
const fontSizePreferenceStorageKey = "speakflow-font-size-preference";
const freeStudyRouteStateStorageKey = "speakflow-free-study-route-state";
const selectedVoiceStorageKey = "speakflow-selected-voice-uri";
const speechSilenceDelayMs = 1000;
const englishSpeechSilenceDelayMs = 2000;
const speechNoInputTimeoutMs = 12000;
const speechStopFallbackMs = 900;
const speechMaxDurationMs = 45000;

type FreeStudyRouteState = {
  nativeSpeech?: string;
  userEnglishText?: string;
};

function getAccountAvatarStorageKey(identifier: string) {
  return `${accountAvatarStoragePrefix}:${identifier || "local-user"}`;
}

function getSessionAvatar(user?: SessionResponse["user"]) {
  return (
    user?.avatarUrl ||
    user?.image ||
    user?.photoURL ||
    user?.photoUrl ||
    user?.picture ||
    ""
  );
}

function readFreeStudyRouteState(): FreeStudyRouteState | null {
  if (typeof window === "undefined") return null;

  try {
    const rawState = window.sessionStorage.getItem(freeStudyRouteStateStorageKey);
    if (!rawState) return null;
    const parsedState = JSON.parse(rawState) as FreeStudyRouteState;

    return {
      nativeSpeech:
        typeof parsedState.nativeSpeech === "string"
          ? parsedState.nativeSpeech
          : "",
      userEnglishText:
        typeof parsedState.userEnglishText === "string"
          ? parsedState.userEnglishText
          : "",
    };
  } catch {
    return null;
  }
}

function createFreePracticeRoundId() {
  return `free:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function getSpeechSilenceDelay(stage: PracticeStage) {
  if (stage === "native") return speechSilenceDelayMs;

  return englishSpeechSilenceDelayMs;
}

function isFontSizePreference(value: string): value is FontSizePreference {
  return value === "small" || value === "standard" || value === "large";
}

function CloseGlyph({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative block h-4 w-4 ${className}`}>
      <span className="absolute left-1/2 top-1/2 h-[2.4px] w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current" />
      <span className="absolute left-1/2 top-1/2 h-[2.4px] w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
    </span>
  );
}

function SoundWaveIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <path d="M5 9.5h3.2L12.5 6v12l-4.3-3.5H5v-5Z" />
      <path d="M15.4 9.2a4.2 4.2 0 0 1 0 5.6" />
      <path d="M18.2 6.8a7.8 7.8 0 0 1 0 10.4" />
    </svg>
  );
}

function ProFeatureIcon({ name }: { name: string }) {
  if (name !== "speaker") {
    return (
      <span aria-hidden="true" className="text-[1.75rem] leading-none">
        {name}
      </span>
    );
  }

  return <SoundWaveIcon className="h-8 w-8 text-[#7460e8]" />;
}

function AccountLineIcon({
  danger = false,
  name,
}: {
  danger?: boolean;
  name: AccountMenuIconName;
}) {
  const className = `h-8 w-8 ${danger ? "text-[#ff3b5f]" : "text-[#8264ff]"}`;

  if (name === "font") {
    return (
      <span
        aria-hidden="true"
        className={`grid h-8 w-8 place-items-center font-[var(--font-sora)] text-[1.55rem] font-semibold leading-none ${
          danger ? "text-[#ff3b5f]" : "text-[#8264ff]"
        }`}
      >
        Aa
      </span>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 32 32"
    >
      {name === "star" ? (
        <path d="m16 4.6 3.45 7 7.73 1.12-5.59 5.45 1.32 7.7L16 22.23 9.09 25.87l1.32-7.7-5.59-5.45 7.73-1.12L16 4.6Z" />
      ) : null}
      {name === "card" ? (
        <>
          <rect height="18" rx="2.8" width="22" x="5" y="7" />
          <path d="M5 13h22M9.5 20h3.5M17 20h4.5" />
        </>
      ) : null}
      {name === "gift" ? (
        <>
          <path d="M6.5 14h19v12h-19V14Z" />
          <path d="M5 10h22v4H5v-4ZM16 10v16" />
          <path d="M16 10c-3.8 0-6.5-1.2-6.5-3.1 0-1.3 1-2.4 2.4-2.4 2.3 0 3.7 3 4.1 5.5ZM16 10c3.8 0 6.5-1.2 6.5-3.1 0-1.3-1-2.4-2.4-2.4-2.3 0-3.7 3-4.1 5.5Z" />
        </>
      ) : null}
      {name === "refresh" ? (
        <>
          <path d="M8.1 11.2A9 9 0 1 1 7 18.9" />
          <path d="M8.1 6.2v5h5" />
        </>
      ) : null}
      {name === "headphones" ? (
        <>
          <path d="M7 18v-2a9 9 0 0 1 18 0v2" />
          <path d="M7 18v5a2 2 0 0 0 2 2h2v-9H9a2 2 0 0 0-2 2ZM25 18v5a2 2 0 0 1-2 2h-2v-9h2a2 2 0 0 1 2 2Z" />
        </>
      ) : null}
      {name === "globe" ? (
        <>
          <circle cx="16" cy="16" r="10.5" />
          <path d="M5.5 16h21M16 5.5c3 3 4.4 6.5 4.4 10.5S19 23.5 16 26.5M16 5.5c-3 3-4.4 6.5-4.4 10.5S13 23.5 16 26.5" />
        </>
      ) : null}
      {name === "moon" ? (
        <path d="M23.7 21.8A10 10 0 0 1 10.2 8.3 10.3 10.3 0 1 0 23.7 21.8Z" />
      ) : null}
      {name === "bell" ? (
        <>
          <path d="M9 23h14l-1.5-2.4V15a5.5 5.5 0 0 0-11 0v5.6L9 23Z" />
          <path d="M13.4 25a3 3 0 0 0 5.2 0" />
        </>
      ) : null}
      {name === "help" ? (
        <>
          <circle cx="16" cy="16" r="10.5" />
          <path d="M12.9 13a3.3 3.3 0 0 1 6.2 1.6c0 2.9-3.4 2.8-3.4 5.2M16 24h.02" />
        </>
      ) : null}
      {name === "chat" ? (
        <>
          <path d="M7 9.8A4.8 4.8 0 0 1 11.8 5h8.4A4.8 4.8 0 0 1 25 9.8v6.4a4.8 4.8 0 0 1-4.8 4.8h-7.4L7 26V9.8Z" />
          <path d="M12 13h.02M16 13h.02M20 13h.02" />
        </>
      ) : null}
      {name === "file" ? (
        <>
          <path d="M9 5h9l5 5v17H9V5Z" />
          <path d="M18 5v6h5M13 16h6M13 21h6" />
        </>
      ) : null}
      {name === "lock" ? (
        <>
          <rect height="13" rx="2.5" width="18" x="7" y="14" />
          <path d="M11 14v-3a5 5 0 0 1 10 0v3M16 19v3" />
        </>
      ) : null}
      {name === "info" ? (
        <>
          <circle cx="16" cy="16" r="10.5" />
          <path d="M16 14v7M16 10.5h.02" />
        </>
      ) : null}
      {name === "dashboard" ? (
        <>
          <rect height="8" rx="2" width="8" x="5" y="6" />
          <rect height="8" rx="2" width="8" x="19" y="6" />
          <rect height="8" rx="2" width="8" x="5" y="18" />
          <rect height="8" rx="2" width="8" x="19" y="18" />
        </>
      ) : null}
      {name === "logout" ? (
        <>
          <path d="M13 6H8v20h5M18 11l5 5-5 5M23 16H12" />
        </>
      ) : null}
    </svg>
  );
}

function CrownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M4.2 9.2 8.8 12 12 5.5 15.2 12l4.6-2.8-1.3 8.3h-13L4.2 9.2Z"
        fill="currentColor"
      />
      <path d="M12 9.3 14.2 11.7 12 14.1l-2.2-2.4L12 9.3Z" fill="white" />
      <path
        d="M6.4 20h11.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M12 5.5h.01M4.2 9.2h.01M19.8 9.2h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

const accountPanelCopy = {
  en: {
    accountTitle: "Account",
    accountMenuSections: [
      {
        title: "Account",
        items: [
          {
            action: "subscription",
            icon: "⭐",
            label: "SpeakFlow Pro",
            trailing: "Not subscribed",
          },
          {
            action: "manageSubscription",
            icon: "💳",
            label: "Manage Subscription",
          },
          {
            action: "referrals",
            icon: "🎁",
            label: "Invite Friends",
          },
          {
            action: "accountManagement",
            icon: "🔏",
            label: "Account Management",
          },
        ],
      },
      {
        title: "Learning Experience",
        items: [
          { action: "voice", icon: "headphones", label: "Voice" },
          { action: "fontSize", icon: "🔤", label: "Font Size" },
          { icon: "🌐", label: "Interface Language" },
          { icon: "🔔", label: "Notifications" },
        ],
      },
      {
        title: "Help",
        items: [
          { action: "helpCenter", icon: "❓", label: "Help Center" },
          { action: "reportIssue", icon: "⚑", label: "Contact & Feedback" },
          { action: "terms", icon: "📄", label: "Terms of Service" },
          { action: "privacy", icon: "🔏", label: "Privacy Policy" },
          { action: "aboutSpeakFlow", icon: "ℹ️", label: "About SpeakFlow" },
        ],
      },
    ] as readonly AccountMenuSection[],
    aboutSpeakFlowTitle: "About SpeakFlow",
    accountSecurity: "Account & Security",
    billingPortalDescription:
      "Manage your plan, payment method, invoices, and cancellation on Stripe's secure page.",
    billingPortalPrimary: "Open subscription management",
    billingPortalStatusNote:
      "After you finish in Stripe, you will return to SpeakFlow automatically.",
    billingNoteMonthly: "Monthly billing",
    cancelSafety: "Cancel anytime · Secure payment",
    checkoutSafety: "Secure payment · Cancel anytime",
    choosePlan: "Choose your plan",
    closeAccountMenu: "Close account menu",
    closeAvatarEditor: "Close avatar editor",
    confirmAndPay: "Confirm and Pay",
    confirmSubscription: "Confirm Subscription",
    data: "Data",
    deleteAccount: "Delete Account",
    editAvatar: "Edit avatar",
    editAvatarTitle: "Edit Avatar",
    fallbackEmail: "No email connected",
    fallbackUser: "SpeakFlow User",
    help: "Help",
    helpCenterTitle: "Help Center",
    fontSizeTitle: "Font Size",
    included: "Plan includes",
    invalidImage: "Please choose an image file",
    imageReadFailed: "Could not read the avatar. Please choose again.",
    learningData: "Learning Data",
    loginSecurity: "Login & Security",
    member: "Membership",
    currentPlan: "Current plan",
    manageSubscription: "Manage Subscription",
    manageSubscriptionTitle: "Manage Subscription",
    noBillingPortal:
      "No Stripe subscription is linked to this account. If you already paid, sign in with the purchase email and restore purchases.",
    notSubscribed: "Not subscribed",
    other: "Other",
    openAccountMenu: "Open account menu",
    paymentMethods: ["Apple Pay", "Google Pay", "Credit Card"],
    paymentMethodTitle: "Payment Method",
    proBenefits: "Pro Benefits",
    proCta: "Start SpeakFlow Pro",
    proDescription:
      "AI practice, smart courses, and immersive learning help you speak English with confidence.",
    proFeatures: [
      {
        icon: "🎙",
        title: "Unlimited AI Speaking Practice",
        description: "Speak anytime with intelligent correction and feedback.",
      },
      {
        icon: "🧠",
        title: "AI Course Generation",
        description: "Turn video, subtitles, and audio into personal training courses.",
      },
      {
        icon: "speaker",
        title: "Premium AI Voice",
        description: "More natural, realistic pronunciation and intonation.",
      },
      {
        icon: "📚",
        title: "Unlimited Learning Content",
        description: "Create unlimited courses and vocabulary lists.",
      },
      {
        icon: "☁",
        title: "Cloud Sync",
        description: "Sync progress automatically across phone and computer.",
      },
    ],
    proLearners: "10,000+ learners are practicing",
    proPlans: {
      monthly: {
        billingNote: "Monthly billing",
        label: "Monthly Plan",
        period: "/ month",
        price: "$4.99",
      },
      yearly: {
        billingNote: "33% OFF",
        checkoutSummary: "Equivalent to $3.33 / month",
        discount: "Save 33%",
        label: "Yearly Plan",
        period: "/ year",
        price: "$39.99",
        recommended: "Recommended",
      },
    },
    proTagline: "Turn English input into real expression",
    restorePurchaseDescription:
      "If you already paid but this device still shows Free, refresh the subscription saved for your current login email.",
    restorePurchaseEmpty: "No active Pro subscription was found for this account.",
    restorePurchaseFailed: "Unable to restore purchases. Please try again.",
    restorePurchasePrimary: "Restore purchases",
    restorePurchaseSuccess: "SpeakFlow Pro has been restored.",
    reportIssueTitle: "Contact & Feedback",
    returnAccountMenu: "Back to account menu",
    returnLearningHome: "Back to learning home",
    returnProPage: "Back to Pro page",
    save: "Save",
    saveAvatarFailed: "Save failed. Please choose a smaller image.",
    settings: "Settings",
    signOut: "Sign Out",
    signedInAs: "Signed in as",
    subscriptionTitle: "Subscription",
    chooseAvatarFirst: "Please choose an avatar first",
    changeAvatar: "Change Avatar",
  },
  "zh-CN": {
    accountTitle: "账户",
    accountMenuSections: [
      {
        title: "账户",
        items: [
          {
            action: "subscription",
            icon: "⭐",
            label: "SpeakFlow Pro",
            trailing: "未订阅",
          },
          { action: "manageSubscription", icon: "💳", label: "管理订阅" },
          { action: "referrals", icon: "🎁", label: "邀请好友" },
          { action: "accountManagement", icon: "🔏", label: "账号管理" },
        ],
      },
      {
        title: "学习体验",
        items: [
          { action: "voice", icon: "headphones", label: "声音" },
          { action: "fontSize", icon: "🔤", label: "字体大小" },
          { icon: "🌐", label: "界面语言" },
          { icon: "🔔", label: "通知" },
        ],
      },
      {
        title: "帮助",
        items: [
          { action: "helpCenter", icon: "❓", label: "帮助中心" },
          { action: "reportIssue", icon: "⚑", label: "联系与反馈" },
          { action: "terms", icon: "📄", label: "用户协议" },
          { action: "privacy", icon: "🔏", label: "隐私政策" },
          { action: "aboutSpeakFlow", icon: "ℹ️", label: "关于 SpeakFlow" },
        ],
      },
    ] as readonly AccountMenuSection[],
    aboutSpeakFlowTitle: "关于 SpeakFlow",
    accountSecurity: "账户与安全",
    billingPortalDescription:
      "在 Stripe 安全页面中更换套餐、取消订阅、更新付款方式或查看账单。",
    billingPortalPrimary: "打开订阅管理",
    billingPortalStatusNote: "在 Stripe 完成管理后，会自动回到 SpeakFlow。",
    billingNoteMonthly: "按月计费",
    cancelSafety: "可随时取消 · 安全支付保障",
    checkoutSafety: "安全支付保障 · 可随时取消订阅",
    choosePlan: "选择适合你的套餐",
    closeAccountMenu: "关闭账户菜单",
    closeAvatarEditor: "关闭头像编辑",
    confirmAndPay: "确认并付款",
    confirmSubscription: "确认订阅",
    data: "数据",
    deleteAccount: "删除账户",
    editAvatar: "修改头像",
    editAvatarTitle: "修改头像",
    fallbackEmail: "未绑定邮箱",
    fallbackUser: "SpeakFlow 用户",
    help: "帮助",
    helpCenterTitle: "帮助中心",
    fontSizeTitle: "字体大小",
    included: "套餐包含",
    invalidImage: "请选择图片文件",
    imageReadFailed: "头像读取失败，请重新选择",
    learningData: "学习数据",
    loginSecurity: "登录与安全",
    member: "会员",
    currentPlan: "当前套餐",
    manageSubscription: "管理订阅",
    manageSubscriptionTitle: "管理订阅",
    noBillingPortal:
      "当前账号还没有关联可管理的 Stripe 订阅。如果你已经付款，请用付款时的邮箱登录后点击恢复购买。",
    notSubscribed: "未订阅",
    other: "其他",
    openAccountMenu: "打开账户菜单",
    paymentMethods: ["Apple Pay", "Google Pay", "信用卡"],
    paymentMethodTitle: "付款方式",
    proBenefits: "Pro 专享功能",
    proCta: "立即开通 SpeakFlow Pro",
    proDescription: "通过 AI 练习、智能课程和沉浸式学习，帮你自信开口说英语。",
    proFeatures: [
      {
        icon: "🎙",
        title: "无限 AI 口语练习",
        description: "随时开口说英语，AI 智能纠错与反馈。",
      },
      {
        icon: "🧠",
        title: "AI 智能生成课程",
        description: "视频、字幕、音频一键变成专属训练课程。",
      },
      {
        icon: "speaker",
        title: "高级 AI 语音",
        description: "更自然、更真实的发音与语调。",
      },
      {
        icon: "📚",
        title: "无限学习内容",
        description: "无限创建课程与单词本，学习不受限制。",
      },
      {
        icon: "☁",
        title: "云端同步",
        description: "手机与电脑自动同步学习进度。",
      },
    ],
    proLearners: "10,000+ 学习者正在使用",
    proPlans: {
      monthly: {
        billingNote: "按月计费",
        label: "月付套餐",
        period: "/ 月",
        price: "$4.99",
      },
      yearly: {
        billingNote: "33% OFF",
        checkoutSummary: "相当于 $3.33 / 月",
        discount: "节省 33%",
        label: "年付套餐",
        period: "/ 年",
        price: "$39.99",
        recommended: "推荐",
      },
    },
    proTagline: "让英语真正从“输入”变成“输出”",
    restorePurchaseDescription:
      "如果你已经付款，但这台设备仍显示未订阅，请用当前登录邮箱刷新订阅状态。",
    restorePurchaseEmpty: "没有找到这个账号的有效 Pro 订阅。",
    restorePurchaseFailed: "恢复购买失败，请稍后再试。",
    restorePurchasePrimary: "恢复购买",
    restorePurchaseSuccess: "已恢复 SpeakFlow Pro。",
    reportIssueTitle: "联系与反馈",
    returnAccountMenu: "返回账户菜单",
    returnLearningHome: "返回学习首页",
    returnProPage: "返回 Pro 页面",
    save: "Save",
    saveAvatarFailed: "保存失败，请换一张更小的图片",
    settings: "设置",
    signOut: "退出登录",
    signedInAs: "当前账号",
    subscriptionTitle: "订阅",
    chooseAvatarFirst: "请先选择头像",
    changeAvatar: "更换头像",
  },
} as const;

const helpCenterContent: Record<
  "en" | "zh-CN",
  {
    intro: string;
    quickStart: readonly string[];
    quickStartTitle: string;
    sections: readonly HelpCenterSection[];
  }
> = {
  en: {
    intro:
      "SpeakFlow is built for one job: help you turn real thoughts into spoken English you can actually use. The best practice loop is simple: say your idea in Chinese, try it in English, compare with SpeakFlow's recommendation, listen, repeat, then continue the conversation.",
    quickStartTitle: "Best way to start",
    quickStart: [
      "Open the speaking screen and tap the microphone.",
      "Say one complete idea in Chinese, for example: The yogurt is too sour.",
      "When the Chinese sentence appears, tap the microphone again and say it in English.",
      "Study the recommended expression, use normal and slow playback, then answer the AI follow-up.",
      "Tap highlighted words or phrases you want to keep in your expression bank.",
    ],
    sections: [
      {
        title: "Core Practice Flow",
        description:
          "Use SpeakFlow as a speaking coach, not as a translation box.",
        articles: [
          {
            title: "Why do I say Chinese first?",
            body: [
              "Most learners already know what they want to say, but freeze when they need to say it in English. Speaking Chinese first lets SpeakFlow capture your real meaning before you practice the English.",
              "After that, the app shows the Chinese sentence again and asks you to say it in English. This forces active recall, which is much better than only reading an answer.",
            ],
          },
          {
            title: "What happens after I say English?",
            body: [
              "SpeakFlow shows your expression first, then gives a recommended expression. You can compare your English with a clearer, more natural version.",
              "You can play the English at normal speed or slow speed. Use slow playback for pronunciation, then use normal speed to build speaking rhythm.",
            ],
          },
          {
            title: "What should I do with the AI follow-up?",
            body: [
              "When the AI asks a follow-up question, answer that question instead of starting a new topic. This is how the practice becomes a real conversation.",
              "If you do not know what to say, use a simple answer first. A short, honest answer is better than waiting for a perfect sentence.",
            ],
          },
        ],
      },
      {
        title: "Training Modes",
        description:
          "Choose the mode based on how much support you want today.",
        articles: [
          {
            title: "AI Guided Expression",
            body: [
              "Use this when you do not know what to say. The AI suggests the next Chinese sentence based on the scene, emotional flow, daily realism, and your level.",
              "You can follow the suggested Chinese sentence or ignore it and say your own idea. The goal is to keep you speaking without getting stuck.",
            ],
            bullets: [
              "Good for beginners and tired days.",
              "Good for building topic continuity.",
              "Good when you want the app to lead the conversation.",
            ],
          },
          {
            title: "Free speaking practice",
            body: [
              "Use this when you already have something in mind. Say the Chinese thought, try the English, then continue from the AI reply.",
              "This mode is strongest when you answer the AI's question directly. For example, if the AI asks Why do your eyes hurt?, answer with the reason instead of changing topics.",
            ],
          },
          {
            title: "Classic scenario practice",
            body: [
              "Classic scenarios are for useful daily situations such as banking, government services, driving, customer service, and travel-style conversations.",
              "Use them when you want practical phrases for a predictable real-life situation.",
            ],
          },
        ],
      },
      {
        title: "Expressions and Vocabulary",
        description:
          "Build your personal expression bank from the sentences you actually need.",
        articles: [
          {
            title: "What are highlighted expressions?",
            body: [
              "Bright highlighted words or phrases are expressions worth learning. They are usually useful chunks, not isolated grammar points.",
              "Tap a highlighted phrase to save it. Saved expressions can become material for later review and practice.",
            ],
          },
          {
            title: "Can I save a single word?",
            body: [
              "Yes. If you see a word you want to remember, tap the word. SpeakFlow saves it as vocabulary and keeps the source sentence when available.",
              "This is useful because words are easier to remember when they stay connected to the sentence where you needed them.",
            ],
          },
          {
            title: "How should I use saved expressions?",
            body: [
              "Do not only memorize the phrase. Say a new sentence with it. If you saved too sour, try: This coffee is too bitter, This soup is too salty, or This bag is too heavy.",
              "The goal is flexible use, not passive collection.",
            ],
          },
        ],
      },
      {
        title: "Microphone, Playback, and Voice",
        description:
          "Most speaking problems come from browser permission, silence timing, or audio output.",
        articles: [
          {
            title: "The microphone does not work",
            body: [
              "Check the browser microphone permission first. On Chrome or Edge, click the lock icon near the address bar and allow microphone access for this site.",
              "If you use an external microphone or Bluetooth headset, make sure the correct input device is selected in your system settings before opening SpeakFlow.",
            ],
          },
          {
            title: "The app stops listening before I finish",
            body: [
              "Speak in one steady sentence when possible. Long pauses can make the browser speech recognizer think you are finished.",
              "If the page moves on too early, tap the microphone again and repeat the sentence. SpeakFlow is designed for repeated attempts, so one imperfect capture is not a failure.",
            ],
          },
          {
            title: "I cannot hear playback",
            body: [
              "Check system volume, browser tab mute, and the selected output device. Some browsers also block audio until you have clicked or tapped the page once.",
              "You can change the English playback voice from Account, Settings, Voice.",
            ],
          },
        ],
      },
      {
        title: "Settings and Device Management",
        description:
          "Use Account settings to invite friends, change devices, choose language, read notifications, and manage account records.",
        articles: [
          {
            title: "How does expression library sync work?",
            body: [
              "After you sign in, SpeakFlow syncs your expression library to your account automatically.",
              "When you use another phone, sign in with the same account and your saved expressions will be restored from the cloud.",
            ],
          },
          {
            title: "How do I change the interface language?",
            body: [
              "Open Account, Interface Language. English and Simplified Chinese are available now, and more translation packs are listed as planned languages.",
              "This changes SpeakFlow menus, account pages, and settings on the current device.",
            ],
          },
          {
            title: "What appears in Notifications?",
            body: [
              "Open Account, Notifications to read messages from SpeakFlow, including subscription changes, referral rewards, account security, and support replies.",
              "For example, if a friend registers through your invite link or later subscribes to Pro, reward messages appear in Notifications as unread items.",
            ],
          },
          {
            title: "Where is account management?",
            body: [
              "Open Account, Account Management under Data & Security. It shows your contact email, login guidance, and the account deletion request entry.",
              "Deletion requests go through Contact & Feedback so SpeakFlow can verify identity before removing account records.",
            ],
          },
        ],
      },
      {
        title: "Account and Subscription",
        description:
          "Use the same login email for practice, payment, and restoration.",
        articles: [
          {
            title: "How do referral rewards work?",
            body: [
              "Open Account, Invite Friends, then copy your invite link and send it to a friend.",
              "Your friend gets 7 days of Pro after registering through the link. You get 30 days of Pro after their first successful paid subscription. Reward messages are written to Notifications.",
            ],
          },
          {
            title: "What does SpeakFlow Pro unlock?",
            body: [
              "Pro removes free practice limits and is intended for learners who want regular AI speaking practice, more AI conversation, and more course generation.",
              "If your account is Pro, the free practice completion popup should not block speaking practice.",
            ],
          },
          {
            title: "How do I manage my subscription?",
            body: [
              "Open Account, Manage Subscription. SpeakFlow sends you to Stripe's secure customer portal, where you can update payment method, review invoices, change plan, or cancel.",
              "After finishing in Stripe, you return to SpeakFlow and the app refreshes your account status.",
            ],
          },
          {
            title: "How do I restore a purchase?",
            body: [
              "Open Account, Restore Purchases. SpeakFlow checks the subscription linked to your current login email and updates your local Pro status.",
              "If restoration says no active subscription was found, confirm that you are logged in with the same email used during checkout.",
            ],
          },
        ],
      },
      {
        title: "Common Learning Problems",
        description:
          "These are normal issues. Use them as signals for how to practice next.",
        articles: [
          {
            title: "The AI's English is different from mine. Was I wrong?",
            body: [
              "Not always. There are many correct ways to say the same idea. Treat SpeakFlow's version as a recommended expression: clearer, more natural, or easier to reuse.",
              "If your meaning is understandable, repeat the recommended version once, then continue the conversation.",
            ],
          },
          {
            title: "The sentence is too hard",
            body: [
              "Shorten the idea. Instead of trying to say a long Chinese sentence in one perfect English sentence, split it into two.",
              "For example: Fruit is too much trouble. I have to wash it and cut it. This is often more natural than forcing one long sentence.",
            ],
          },
          {
            title: "I do not know how to answer the AI",
            body: [
              "Answer with a reason, preference, feeling, example, or next action. These five answer types keep almost any conversation moving.",
              "Example: Because..., I prefer..., I feel..., For example..., Maybe I will...",
            ],
          },
        ],
      },
      {
        title: "Privacy and Data",
        description:
          "SpeakFlow keeps the product focused on learning and uses payment systems for payment data.",
        articles: [
          {
            title: "Does SpeakFlow store my card information?",
            body: [
              "No. Card payment and subscription management are handled by Stripe. SpeakFlow stores subscription status and Stripe IDs needed to recognize your Pro account.",
            ],
          },
          {
            title: "Why does SpeakFlow need my email?",
            body: [
              "Your email connects login, subscription status, restore purchases, and your account display. Using the same email is important for payment recognition.",
            ],
          },
          {
            title: "What should I include when reporting a problem?",
            body: [
              "Include what you were trying to do, the exact screen, your browser, whether you are Pro or Free, and one example sentence if the issue is related to speech recognition or AI output.",
            ],
          },
        ],
      },
    ],
  },
  "zh-CN": {
    intro:
      "SpeakFlow 的核心目标很简单：帮你把真实想法变成能开口说出来的英语。最有效的练习循环是：先用中文说出想法，再看着中文说英文，对比 AI 推荐表达，听朗读，跟读，然后继续回答 AI 的追问。",
    quickStartTitle: "最推荐的开始方式",
    quickStart: [
      "进入口语练习界面，点击底部麦克风。",
      "先说一句完整中文，例如：酸奶太酸了。",
      "页面出现这句中文后，再点麦克风，看着中文说英文。",
      "学习推荐表达，用正常朗读和慢速朗读跟读，然后回答 AI 的追问。",
      "看到亮色标出的词组或单词时，可以点击收藏进表达库。",
    ],
    sections: [
      {
        title: "核心练习流程",
        description: "把 SpeakFlow 当成口语陪练，而不是普通翻译器。",
        articles: [
          {
            title: "为什么要先说中文？",
            body: [
              "很多学习者不是没有想法，而是想法到了嘴边，不知道怎么变成英语。先说中文，可以让 SpeakFlow 抓住你真正想表达的意思。",
              "接着页面会重新显示这句中文，让你看着中文说英文。这一步是主动回忆，比直接看答案有效得多。",
            ],
          },
          {
            title: "我说完英文后会发生什么？",
            body: [
              "SpeakFlow 会先显示你的表达，再给出推荐表达。你可以对比自己的英文和更清楚、更自然的说法。",
              "你可以听正常速度朗读，也可以听慢速朗读。慢速用来练发音，正常速度用来练真实说话节奏。",
            ],
          },
          {
            title: "AI 继续问我时，我应该怎么做？",
            body: [
              "当 AI 问出追问时，最好直接回答这个问题，不要重新换一个话题。这样练习才会变成真正的聊天。",
              "如果不知道怎么说，先说一个简单答案。一个短而真实的回答，比一直等完美句子更有价值。",
            ],
          },
        ],
      },
      {
        title: "训练模式",
        description: "根据当天需要的辅助程度选择模式。",
        articles: [
          {
            title: "AI 引导表达",
            body: [
              "当你不知道说什么时，用 AI 引导表达。AI 会根据情景连续性、情绪递进、日常真实感和你的水平，推荐下一句中文。",
              "你可以照着 AI 推荐的中文说，也可以不采用建议，继续说自己脑子里的内容。它的作用是让你不断有话可说。",
            ],
            bullets: [
              "适合初学者和状态比较累的时候。",
              "适合练一个话题的连续表达。",
              "适合让 AI 带着你一步一步开口。",
            ],
          },
          {
            title: "自由口语练习",
            body: [
              "当你本来就有想法时，用自由练习。你先说中文，再尝试说英文，然后接着 AI 的回复继续聊。",
              "这个模式最重要的是回答 AI 的问题。例如 AI 问 Why do your eyes hurt?，你就回答原因，而不是换新话题。",
            ],
          },
          {
            title: "经典场景口语练习",
            body: [
              "经典场景适合银行、政府办事、开车、客服、生活服务等可预期的真实场景。",
              "当你想准备某个实际生活场景时，可以优先用经典场景练高频句子。",
            ],
          },
        ],
      },
      {
        title: "表达库和单词收藏",
        description: "把你真正需要的句子，沉淀成自己的表达库。",
        articles: [
          {
            title: "亮色词组是什么意思？",
            body: [
              "AI 会把值得掌握的词组用亮色标出来。这些通常是可以直接套用的表达块，而不是孤立语法点。",
              "点击亮色词组，就可以收藏进表达库。以后复习时，这些表达会更贴近你真实想说的话。",
            ],
          },
          {
            title: "可以只收藏一个单词吗？",
            body: [
              "可以。看到某个单词想记住时，直接点这个单词就可以收藏。系统会尽量保留它所在的句子。",
              "单词放在原句里更容易记住，因为你记住的是使用场景，不只是中文意思。",
            ],
          },
          {
            title: "收藏后应该怎么学？",
            body: [
              "不要只背词组本身，要用它造新句。比如收藏了 too sour，可以继续练：This coffee is too bitter. This soup is too salty. This bag is too heavy.",
              "表达库的目标不是越收越多，而是让你能在新场景里灵活说出来。",
            ],
          },
        ],
      },
      {
        title: "麦克风、朗读和声音",
        description: "口语问题多数和浏览器权限、停顿时间、音频输出有关。",
        articles: [
          {
            title: "麦克风不能用怎么办？",
            body: [
              "先检查浏览器麦克风权限。Chrome 或 Edge 里可以点击地址栏旁边的锁形图标，允许这个网站使用麦克风。",
              "如果你用外接麦克风或蓝牙耳机，打开 SpeakFlow 前，先确认系统设置里选中了正确的输入设备。",
            ],
          },
          {
            title: "我还没说完，页面就跳走了怎么办？",
            body: [
              "尽量用稳定的一句话说完。停顿太久时，浏览器语音识别可能会判断你已经说完。",
              "如果提前结束，重新点麦克风再说一次就可以。SpeakFlow 本来就是用来反复尝试的，一次识别不完美不算失败。",
            ],
          },
          {
            title: "听不到朗读怎么办？",
            body: [
              "检查系统音量、浏览器标签页是否静音、输出设备是否正确。有些浏览器需要你先点击页面一次，才允许播放声音。",
              "你也可以在账户里的 设置、声音 中切换英文朗读声音。",
            ],
          },
        ],
      },
      {
        title: "设置与设备管理",
        description:
          "在账户设置里处理邀请好友、界面语言、通知收件箱和账号管理。",
        articles: [
          {
            title: "表达库如何云端同步？",
            body: [
              "登录后，SpeakFlow 会自动把你的表达库同步到账号云端。",
              "换手机时，用同一个账号登录，保存过的表达会自动从云端恢复。",
            ],
          },
          {
            title: "如何更改界面语言？",
            body: [
              "打开 账户、界面语言。目前英文和简体中文可用，其他语言会作为计划中的翻译包显示。",
              "这会改变当前设备上 SpeakFlow 的菜单、账户页和设置页语言。",
            ],
          },
          {
            title: "通知里会出现什么？",
            body: [
              "打开 账户、通知，可以查看 SpeakFlow 发给你的消息，包括订阅变动、邀请奖励、账号安全和客服回复。",
              "例如，好友通过你的邀请链接注册，或之后成功订阅 Pro，相关奖励会以未读通知出现。",
            ],
          },
          {
            title: "账号管理在哪里？",
            body: [
              "打开 账户、数据与安全、账号管理。这里会显示联系邮箱、登录安全说明和删除账号入口。",
              "删除账号会先进入联系与反馈，这样 SpeakFlow 可以先核对身份再处理。",
            ],
          },
        ],
      },
      {
        title: "账户和订阅",
        description: "登录、付款、恢复购买最好始终使用同一个邮箱。",
        articles: [
          {
            title: "邀请奖励如何生效？",
            body: [
              "打开 账户、邀请好友，复制你的邀请链接并发给好友。",
              "好友通过链接注册后，会获得 7 天 Pro；好友首次成功付费订阅后，你会获得 30 天 Pro。奖励到账消息会写入通知。",
            ],
          },
          {
            title: "SpeakFlow Pro 有什么作用？",
            body: [
              "Pro 会解除免费练习限制，适合需要长期进行 AI 口语练习、AI 对话和课程生成的学习者。",
              "如果账户已经是 Pro，练习页面不应该再用免费次数弹窗阻止你继续练习。",
            ],
          },
          {
            title: "如何管理订阅？",
            body: [
              "打开 账户、管理订阅。SpeakFlow 会跳转到 Stripe 的安全管理页面，你可以更新付款方式、查看账单、更换套餐或取消订阅。",
              "在 Stripe 完成操作后，会返回 SpeakFlow，并刷新你的账户订阅状态。",
            ],
          },
          {
            title: "如何恢复购买？",
            body: [
              "打开 账户、恢复购买。SpeakFlow 会检查当前登录邮箱对应的订阅，并把 Pro 状态更新到本地账户。",
              "如果提示没有找到有效订阅，请确认你现在登录的邮箱，就是付款时使用的邮箱。",
            ],
          },
        ],
      },
      {
        title: "常见学习问题",
        description: "这些问题很正常，可以用来判断下一步怎么练。",
        articles: [
          {
            title: "AI 给的英文和我说的不一样，是我错了吗？",
            body: [
              "不一定。同一个意思可以有很多正确说法。SpeakFlow 给的是推荐表达，通常更清楚、更自然，或者更容易复用。",
              "如果你的表达能被理解，就先跟读一遍推荐表达，然后继续聊天，不要停在纠错焦虑里。",
            ],
          },
          {
            title: "句子太难，说不出来怎么办？",
            body: [
              "把中文意思拆短。不要强迫自己把很长的中文塞进一句完美英文里，可以拆成两句。",
              "例如：Fruit is too much trouble. I have to wash it and cut it. 这比硬凑一个长句更自然。",
            ],
          },
          {
            title: "不知道怎么回答 AI 怎么办？",
            body: [
              "可以从原因、喜好、感受、例子、下一步行动这五个方向回答。几乎所有聊天都能靠这五类回答继续下去。",
              "常用开头包括：Because..., I prefer..., I feel..., For example..., Maybe I will...",
            ],
          },
        ],
      },
      {
        title: "隐私和数据",
        description: "SpeakFlow 会尽量把数据用途限制在学习和账户识别上。",
        articles: [
          {
            title: "SpeakFlow 会保存我的银行卡信息吗？",
            body: [
              "不会。银行卡付款和订阅管理由 Stripe 处理。SpeakFlow 只保存识别 Pro 账户所需的订阅状态和 Stripe ID。",
            ],
          },
          {
            title: "为什么需要邮箱？",
            body: [
              "邮箱用来连接登录、订阅状态、恢复购买和账户展示。付款和登录使用同一个邮箱，才能正确识别 Pro。",
            ],
          },
          {
            title: "报告问题时应该提供什么？",
            body: [
              "请说明你当时想做什么、在哪个界面、使用什么浏览器、账号是 Pro 还是免费，以及一条相关例句。",
              "如果是语音识别或 AI 表达问题，提供你说的原句会更容易排查。",
            ],
          },
        ],
      },
    ],
  },
};

const supportFeedbackContent = {
  en: {
    categories: [
      { label: "Payment or Pro status", value: "payment" },
      { label: "Invite friends or rewards", value: "referral" },
      { label: "Microphone or playback", value: "voice" },
      { label: "AI expression quality", value: "ai_expression" },
      { label: "Practice flow", value: "practice_flow" },
      { label: "Expression library sync", value: "vocabulary_sync" },
      { label: "Interface language", value: "interface_language" },
      { label: "Notifications", value: "notifications" },
      { label: "Account management or deletion", value: "account_management" },
      { label: "Account or login", value: "account" },
      { label: "Suggestion", value: "suggestion" },
      { label: "Other", value: "other" },
    ],
    contactEmail: "Reply email",
    contactPlaceholder: "you@example.com",
    description:
      "Use this to contact SpeakFlow about bugs, payment issues, Pro status, invite rewards, voice problems, expression library sync, interface language, notifications, account management, AI output, or product suggestions.",
    detailHelp:
      "Helpful details: what you were doing, the exact screen, browser, Pro or Free status, device type, and one example sentence if speech or AI output was involved.",
    error: "Unable to send feedback. Please try again.",
    message: "What happened?",
    messagePlaceholder:
      "Describe the issue or suggestion. If possible, include the sentence you were practicing and what you expected.",
    page: "Related screen",
    pagePlaceholder:
      "For example: Invite Friends, Expression Library, Interface Language, Notifications, Account Management, Pro page",
    required: "Please describe the issue in more detail.",
    submit: "Send feedback",
    submitting: "Sending...",
    success:
      "Feedback sent. SpeakFlow has saved your message and will review it.",
    type: "Issue type",
  },
  "zh-CN": {
    categories: [
      { label: "付款或 Pro 状态", value: "payment" },
      { label: "邀请好友或奖励", value: "referral" },
      { label: "麦克风或朗读", value: "voice" },
      { label: "AI 表达质量", value: "ai_expression" },
      { label: "练习流程", value: "practice_flow" },
      { label: "表达库云同步", value: "vocabulary_sync" },
      { label: "界面语言", value: "interface_language" },
      { label: "通知", value: "notifications" },
      { label: "账号管理或删除", value: "account_management" },
      { label: "账户或登录", value: "account" },
      { label: "功能建议", value: "suggestion" },
      { label: "其他", value: "other" },
    ],
    contactEmail: "回复邮箱",
    contactPlaceholder: "you@example.com",
    description:
      "这里是用户联系 SpeakFlow 的入口。付款异常、Pro 状态、邀请奖励、麦克风、表达库云同步、界面语言、通知、账号管理、AI 表达和功能建议，都可以从这里发给你。",
    detailHelp:
      "最好写清楚：当时在做什么、在哪个界面、用什么浏览器或手机、账号是 Pro 还是免费；如果和语音或 AI 表达有关，附上一条例句最有用。",
    error: "反馈发送失败，请稍后再试。",
    message: "具体问题",
    messagePlaceholder:
      "请描述遇到的问题或建议。可以写下正在练习的句子，以及你原本期待的结果。",
    page: "相关界面",
    pagePlaceholder: "例如：邀请好友、表达库、界面语言、通知、账号管理、Pro 页面",
    required: "请把问题描述得更具体一点。",
    submit: "发送反馈",
    submitting: "正在发送...",
    success: "反馈已发送。SpeakFlow 已保存你的消息，会尽快查看。",
    type: "问题类型",
  },
} as const;

const interfaceLanguageOptions: readonly InterfaceLanguageOption[] = [
  {
    code: "en",
    englishName: "English",
    localName: "English",
    region: "Global",
    uiLanguage: "en",
  },
  {
    code: "zh-CN",
    englishName: "Chinese (Simplified)",
    localName: "\u7b80\u4f53\u4e2d\u6587",
    region: "Asia-Pacific",
    uiLanguage: "zh-CN",
  },
  { code: "es", englishName: "Spanish", localName: "Espa\u00f1ol", region: "Americas / Europe" },
  { code: "pt-BR", englishName: "Portuguese (Brazil)", localName: "Portugu\u00eas", region: "Americas" },
  { code: "fr", englishName: "French", localName: "Fran\u00e7ais", region: "Europe / Africa" },
  { code: "de", englishName: "German", localName: "Deutsch", region: "Europe" },
  { code: "ja", englishName: "Japanese", localName: "\u65e5\u672c\u8a9e", region: "Asia-Pacific" },
  { code: "ko", englishName: "Korean", localName: "\ud55c\uad6d\uc5b4", region: "Asia-Pacific" },
  { code: "vi", englishName: "Vietnamese", localName: "Ti\u1ebfng Vi\u1ec7t", region: "Asia-Pacific" },
  { code: "id", englishName: "Indonesian", localName: "Bahasa Indonesia", region: "Asia-Pacific" },
  { code: "th", englishName: "Thai", localName: "\u0e44\u0e17\u0e22", region: "Asia-Pacific" },
  { code: "hi", englishName: "Hindi", localName: "\u0939\u093f\u0928\u094d\u0926\u0940", region: "South Asia" },
  { code: "ar", englishName: "Arabic", localName: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", region: "Middle East / Africa" },
  { code: "tr", englishName: "Turkish", localName: "T\u00fcrk\u00e7e", region: "Europe / Middle East" },
  { code: "ru", englishName: "Russian", localName: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", region: "Europe / Asia" },
  { code: "it", englishName: "Italian", localName: "Italiano", region: "Europe" },
  { code: "nl", englishName: "Dutch", localName: "Nederlands", region: "Europe" },
  { code: "pl", englishName: "Polish", localName: "Polski", region: "Europe" },
  { code: "uk", englishName: "Ukrainian", localName: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430", region: "Europe" },
  { code: "sv", englishName: "Swedish", localName: "Svenska", region: "Europe" },
  { code: "he", englishName: "Hebrew", localName: "\u05e2\u05d1\u05e8\u05d9\u05ea", region: "Middle East" },
];

const displaySettingsContent = {
  en: {
    fontSizeDescription:
      "Adjust the reading size used across SpeakFlow on this device.",
    fontSizeOptions: [
      {
        description: "More compact text for smaller screens.",
        label: "Small",
        value: "small",
      },
      {
        description: "Balanced size for everyday practice.",
        label: "Standard",
        value: "standard",
      },
      {
        description: "Larger text for easier reading.",
        label: "Large",
        value: "large",
      },
    ] as const,
    interfaceLanguageAvailable: "Available now",
    interfaceLanguageComingSoon: "Translation pack planned",
    interfaceLanguageCurrent: "Current interface language",
    interfaceLanguageDescription:
      "Choose the language used by SpeakFlow's menus, account screens, and settings. Only completed translation packs can be selected.",
    interfaceLanguageMore:
      "More interface languages are listed so global learners can see what is planned next.",
    saved: "Saved on this device.",
  },
  "zh-CN": {
    fontSizeDescription: "调整 SpeakFlow 在这台设备上的整体文字大小。",
    fontSizeOptions: [
      {
        description: "文字更紧凑，适合小屏幕。",
        label: "小",
        value: "small",
      },
      {
        description: "日常练习推荐的平衡大小。",
        label: "标准",
        value: "standard",
      },
      {
        description: "文字更大，更容易阅读。",
        label: "大",
        value: "large",
      },
    ] as const,
    interfaceLanguageAvailable: "\u73b0\u5728\u53ef\u7528",
    interfaceLanguageComingSoon: "\u7ffb\u8bd1\u5305\u8ba1\u5212\u4e2d",
    interfaceLanguageCurrent: "\u5f53\u524d\u754c\u9762\u8bed\u8a00",
    interfaceLanguageDescription:
      "\u9009\u62e9 SpeakFlow \u83dc\u5355\u3001\u8d26\u6237\u9875\u548c\u8bbe\u7f6e\u9875\u4f7f\u7528\u7684\u754c\u9762\u8bed\u8a00\u3002\u53ea\u6709\u5df2\u5b8c\u6210\u7ffb\u8bd1\u7684\u8bed\u8a00\u53ef\u4ee5\u5207\u6362\u3002",
    interfaceLanguageMore:
      "\u66f4\u591a\u754c\u9762\u8bed\u8a00\u5df2\u5217\u5165\u8ba1\u5212\uff0c\u65b9\u4fbf\u9762\u5411\u5168\u7403\u7528\u6237\u9010\u6b65\u6269\u5c55\u3002",
    saved: "已保存到这台设备。",
  },
} satisfies Record<
  "en" | "zh-CN",
  {
    fontSizeDescription: string;
    fontSizeOptions: readonly {
      description: string;
      label: string;
      value: FontSizePreference;
    }[];
    interfaceLanguageAvailable: string;
    interfaceLanguageComingSoon: string;
    interfaceLanguageCurrent: string;
    interfaceLanguageDescription: string;
    interfaceLanguageMore: string;
    saved: string;
  }
>;

const notificationSettingsContent = {
  en: {
    activeProBody:
      "Your SpeakFlow Pro access is active. Subscription and billing changes will appear here.",
    activeProTitle: "SpeakFlow Pro is active",
    canceledBodyPrefix:
      "Your subscription has been canceled, but your Pro access remains available until",
    canceledBodySuffix: "You can keep using Pro features before that date.",
    canceledTitle: "Your subscription has been canceled",
    description:
      "System messages, subscription updates, invite rewards, account security, and support replies from SpeakFlow appear here.",
    emptyBody:
      "Subscription updates, invite rewards, support replies, security alerts, and important system messages will appear in this inbox.",
    emptyTitle: "No new notifications",
    inboxTitle: "Inbox",
    justNow: "Just now",
    read: "Read",
    senderSupport: "SpeakFlow Support",
    senderSystem: "SpeakFlow System",
    systemBody:
      "Notifications now work like an inbox. Subscription, invite reward, support, and security messages are collected here instead of being mixed with settings.",
    systemTag: "System",
    systemTitle: "Notification inbox is ready",
    tagAccount: "Account",
    tagSubscription: "Subscription",
    unread: "Unread",
  },
  "zh-CN": {
    activeProBody:
      "\u4f60\u7684 SpeakFlow Pro \u6743\u9650\u6b63\u5e38\u751f\u6548\u3002\u8ba2\u9605\u548c\u8d26\u5355\u53d8\u52a8\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002",
    activeProTitle: "SpeakFlow Pro \u5df2\u751f\u6548",
    canceledBodyPrefix:
      "\u60a8\u7684\u8ba2\u9605\u5df2\u53d6\u6d88\uff0c\u4f46 Pro \u6743\u9650\u4ecd\u53ef\u4e00\u76f4\u4f7f\u7528\u5230",
    canceledBodySuffix:
      "\u5728\u6b64\u65e5\u671f\u524d\uff0c\u6240\u6709 Pro \u529f\u80fd\u4e0d\u53d7\u5f71\u54cd\u3002",
    canceledTitle: "\u60a8\u7684\u8ba2\u9605\u5df2\u53d6\u6d88",
    description:
      "SpeakFlow \u53d1\u7ed9\u4f60\u7684\u7cfb\u7edf\u6d88\u606f\u3001\u8ba2\u9605\u53d8\u52a8\u3001\u9080\u8bf7\u5956\u52b1\u3001\u8d26\u6237\u5b89\u5168\u548c\u5ba2\u670d\u56de\u590d\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002",
    emptyBody:
      "\u8ba2\u9605\u53d8\u52a8\u3001\u9080\u8bf7\u5956\u52b1\u3001\u5ba2\u670d\u56de\u590d\u3001\u5b89\u5168\u63d0\u9192\u548c\u91cd\u8981\u7cfb\u7edf\u6d88\u606f\u4f1a\u51fa\u73b0\u5728\u8fd9\u4e2a\u6536\u4ef6\u7bb1\u91cc\u3002",
    emptyTitle: "\u6682\u65e0\u65b0\u901a\u77e5",
    inboxTitle: "\u6536\u4ef6\u7bb1",
    justNow: "\u521a\u521a",
    read: "\u5df2\u8bfb",
    senderSupport: "SpeakFlow \u5ba2\u670d",
    senderSystem: "SpeakFlow \u7cfb\u7edf",
    systemBody:
      "\u901a\u77e5\u5df2\u6539\u4e3a\u6536\u4ef6\u7bb1\u5f62\u5f0f\u3002\u8ba2\u9605\u3001\u9080\u8bf7\u5956\u52b1\u3001\u5ba2\u670d\u548c\u5b89\u5168\u6d88\u606f\u4f1a\u7edf\u4e00\u6536\u5728\u8fd9\u91cc\uff0c\u4e0d\u518d\u548c\u8bbe\u7f6e\u5f00\u5173\u6df7\u5728\u4e00\u8d77\u3002",
    systemTag: "\u7cfb\u7edf",
    systemTitle: "\u901a\u77e5\u6536\u4ef6\u7bb1\u5df2\u542f\u7528",
    tagAccount: "\u8d26\u6237",
    tagSubscription: "\u8ba2\u9605",
    unread: "\u672a\u8bfb",
  },
} satisfies Record<
  "en" | "zh-CN",
  {
    activeProBody: string;
    activeProTitle: string;
    canceledBodyPrefix: string;
    canceledBodySuffix: string;
    canceledTitle: string;
    description: string;
    emptyBody: string;
    emptyTitle: string;
    inboxTitle: string;
    justNow: string;
    read: string;
    senderSupport: string;
    senderSystem: string;
    systemBody: string;
    systemTag: string;
    systemTitle: string;
    tagAccount: string;
    tagSubscription: string;
    unread: string;
  }
>;

const accountManagementContent = {
  en: {
    contactEmailDescription:
      "This is the login email SpeakFlow uses for subscription status, support replies, and account identification.",
    contactEmailTitle: "Contact email",
    deleteButton: "Request account deletion",
    deleteDescription:
      "Account deletion is permanent. SpeakFlow support will verify the request before removing account records and subscription links.",
    deleteMessage:
      "I want to delete my SpeakFlow account. Please help me verify and process this request.",
    deleteTitle: "Delete account",
    description:
      "Manage the account details that affect login, support contact, and account removal.",
    feedbackPageName: "Account Management",
    loginSecurityDescription:
      "Use the same sign-in email for practice, subscription management, and purchase restoration. Do not share your login session with others.",
    loginSecurityTitle: "Login and security",
    supportNote:
      "For now, deletion requests are handled through Contact & Feedback so support can verify identity and protect paid accounts.",
    title: "Account Management",
  },
  "zh-CN": {
    contactEmailDescription:
      "\u8fd9\u662f SpeakFlow \u7528\u6765\u8bc6\u522b\u767b\u5f55\u3001\u8ba2\u9605\u72b6\u6001\u3001\u5ba2\u670d\u56de\u590d\u548c\u8d26\u6237\u8bb0\u5f55\u7684\u90ae\u7bb1\u3002",
    contactEmailTitle: "\u8054\u7cfb\u65b9\u5f0f",
    deleteButton: "\u7533\u8bf7\u5220\u9664\u8d26\u53f7",
    deleteDescription:
      "\u5220\u9664\u8d26\u53f7\u662f\u4e0d\u53ef\u6062\u590d\u7684\u64cd\u4f5c\u3002SpeakFlow \u9700\u8981\u5148\u6838\u5bf9\u8eab\u4efd\uff0c\u518d\u5904\u7406\u8d26\u6237\u8bb0\u5f55\u548c\u8ba2\u9605\u5173\u8054\u3002",
    deleteMessage:
      "\u6211\u60f3\u5220\u9664\u6211\u7684 SpeakFlow \u8d26\u53f7\uff0c\u8bf7\u5e2e\u6211\u6838\u5bf9\u5e76\u5904\u7406\u8fd9\u4e2a\u8bf7\u6c42\u3002",
    deleteTitle: "\u5220\u9664\u8d26\u53f7",
    description:
      "\u7ba1\u7406\u4e0e\u767b\u5f55\u3001\u5ba2\u670d\u8054\u7cfb\u548c\u8d26\u53f7\u5220\u9664\u76f8\u5173\u7684\u4fe1\u606f\u3002",
    feedbackPageName: "\u8d26\u53f7\u7ba1\u7406",
    loginSecurityDescription:
      "\u8bf7\u7528\u540c\u4e00\u4e2a\u90ae\u7bb1\u767b\u5f55\u7ec3\u4e60\u3001\u7ba1\u7406\u8ba2\u9605\u548c\u6062\u590d\u8d2d\u4e70\u3002\u4e0d\u8981\u628a\u767b\u5f55\u72b6\u6001\u5206\u4eab\u7ed9\u5176\u4ed6\u4eba\u3002",
    loginSecurityTitle: "\u767b\u5f55\u4e0e\u5b89\u5168",
    supportNote:
      "\u76ee\u524d\u5220\u9664\u8bf7\u6c42\u4f1a\u901a\u8fc7\u300c\u8054\u7cfb\u4e0e\u53cd\u9988\u300d\u5904\u7406\uff0c\u8fd9\u6837\u53ef\u4ee5\u5148\u6838\u5bf9\u8eab\u4efd\uff0c\u907f\u514d\u4ed8\u8d39\u8d26\u53f7\u88ab\u8bef\u5220\u3002",
    title: "\u8d26\u53f7\u7ba1\u7406",
  },
} as const;

const accountHomeContent = {
  en: {
    account: "Account",
    accountManagement: "Account Management",
    adminDashboard: "Admin Dashboard",
    contactFeedback: "Contact & Feedback",
    dataAndSecurity: "Data & Security",
    fontSize: "Font Size",
    help: "Help",
    helpCenter: "Help Center",
    interfaceLanguage: "Interface Language",
    inviteFriends: "Invite Friends",
    learningExperience: "Learning Experience",
    notifications: "Notifications",
    privacyPolicy: "Privacy Policy",
    signOut: "Sign Out",
    terms: "Terms of Service",
  },
  "zh-CN": {
    account: "账户",
    accountManagement: "\u8d26\u53f7\u7ba1\u7406",
    adminDashboard: "\u540e\u53f0\u7ba1\u7406",
    contactFeedback: "联系与反馈",
    dataAndSecurity: "数据与安全",
    fontSize: "字体大小",
    help: "帮助",
    helpCenter: "帮助中心",
    interfaceLanguage: "界面语言",
    inviteFriends: "邀请好友",
    learningExperience: "学习体验",
    notifications: "通知",
    privacyPolicy: "隐私政策",
    signOut: "退出登录",
    terms: "用户协议",
  },
} as const;

const referralContent = {
  en: {
    bonusUntil: "Bonus Pro until",
    code: "Invite code",
    copied: "Copied",
    copy: "Copy",
    friendReward: "7 days of Pro after first registration",
    friendRewardTitle: "Friend reward",
    inviteLink: "Invite link",
    invited: "Invited",
    loading: "Preparing your invite link...",
    noBonus: "No bonus Pro yet",
    paidRewards: "Paid rewards",
    rewardsUnit: "rewards",
    statsTitle: "Reward status",
    subtitle:
      "Share your link with a friend. They get 7 days of Pro after registering, and you get 30 days of Pro after their first paid subscription.",
    title: "Invite Friends",
    unavailable: "Invite rewards are temporarily unavailable. Please try again later.",
    yourReward: "30 days of Pro after their first paid subscription",
    yourRewardTitle: "Your reward",
  },
  "zh-CN": {
    bonusUntil: "奖励 Pro 有效期",
    code: "邀请码",
    copied: "已复制",
    copy: "复制",
    friendReward: "首次注册后获得 7 天 Pro",
    friendRewardTitle: "好友奖励",
    inviteLink: "邀请链接",
    invited: "已邀请",
    loading: "正在生成邀请链接...",
    noBonus: "暂无 Pro 奖励",
    paidRewards: "付费奖励",
    rewardsUnit: "次",
    statsTitle: "奖励状态",
    subtitle:
      "把链接发给好友。对方注册后获得 7 天 Pro；对方首次付费后，你获得 30 天 Pro。",
    title: "邀请好友",
    unavailable: "邀请奖励暂时不可用，请稍后再试。",
    yourReward: "对方首次付费后获得 30 天 Pro",
    yourRewardTitle: "你的奖励",
  },
} as const;

const aboutSpeakFlowContent = {
  en: {
    intro:
      "SpeakFlow is an AI speaking practice app for learners who understand English input but still struggle to speak naturally. It helps you turn real thoughts into usable spoken English through guided practice, feedback, listening, and repetition.",
    principlesTitle: "What SpeakFlow believes",
    principles: [
      "Speaking improves when practice starts from your own meaning, not from memorized textbook sentences.",
      "A useful English sentence should be clear, natural, repeatable, and connected to a real situation.",
      "Good AI practice should keep the conversation moving instead of only correcting isolated mistakes.",
      "Vocabulary is easier to remember when it is saved from sentences you actually wanted to say.",
      "Account settings should make practical tasks easy: inviting friends, syncing saved expressions, choosing interface language, reading reward notifications, and managing account records.",
    ],
    sections: [
      {
        body: [
          "SpeakFlow is designed around a simple loop: say your idea in Chinese, try to say it in English, compare with a recommended expression, listen at normal and slow speed, then continue the conversation.",
          "This loop trains active speaking. You are not only reading English. You are practicing the moment when a thought has to become a sentence.",
        ],
        title: "What this app is for",
      },
      {
        body: [
          "AI Guided Expression helps when you do not know what to say next. It suggests the next Chinese idea based on the scene, emotional flow, daily realism, and your level.",
          "Free speaking practice is for your own thoughts. You say the Chinese idea, try the English, then answer the AI follow-up so the exchange becomes a real conversation.",
          "Classic scenario practice focuses on predictable real-life situations, such as banking, government services, driving, and everyday communication.",
        ],
        title: "Main learning tools",
      },
      {
        body: [
          "SpeakFlow highlights useful words and phrases in recommended sentences. Tap them to save them into your expression bank.",
          "The goal is not to collect as many words as possible. The goal is to build a personal library of expressions you can use again in real speech.",
        ],
        title: "Expression bank",
      },
      {
        body: [
          "Expression library sync keeps saved expressions connected to the learner's account across phones.",
          "Invite Friends, Interface Language, Notifications, and Account Management keep learners in control of referral rewards, app language, system messages, support contact, and account deletion requests.",
        ],
        title: "Account settings",
      },
      {
        body: [
          "SpeakFlow is not meant to replace a human teacher, and it is not a general chatbot. It is a focused speaking trainer.",
          "Compared with open-ended chat, SpeakFlow gives learners a more structured path: Chinese meaning, English attempt, recommended expression, playback, follow-up, and vocabulary capture.",
        ],
        title: "How it is different",
      },
      {
        body: [
          "SpeakFlow Pro removes free practice limits and supports regular AI speaking practice, AI conversation, and course generation.",
          "Payments and subscription management are handled through Stripe. SpeakFlow stores only the subscription and reward information needed to recognize your Pro access.",
        ],
        title: "Pro and privacy",
      },
      {
        body: [
          "If you have a question, payment issue, invite reward issue, microphone problem, or product suggestion, use Contact & Feedback in the Help section.",
          "Real learner feedback is important because SpeakFlow is built around practical speaking problems, not abstract feature lists.",
        ],
        title: "Contact",
      },
    ],
    tagline: "Voice practice for real expression.",
  },
  "zh-CN": {
    intro:
      "SpeakFlow 是一个 AI 口语练习软件，适合那些能看懂不少英语、但真正开口时仍然卡住的学习者。它通过引导、反馈、朗读和重复，帮助你把真实想法变成能说出口的英语。",
    principlesTitle: "SpeakFlow 的学习理念",
    principles: [
      "口语练习应该从你自己的意思出发，而不是只背课本句子。",
      "一句有用的英文，应该清楚、自然、能复用，并且连接真实生活场景。",
      "好的 AI 口语练习，不只是纠错，还应该让对话继续往前走。",
      "从自己真正想说的句子里收藏词汇和表达，会比孤立背单词更容易记住。",
      "账户设置应该让真实任务变简单：邀请好友、同步表达库、选择界面语言、查看奖励通知和处理账号记录。",
    ],
    sections: [
      {
        body: [
          "SpeakFlow 围绕一个简单循环设计：先用中文说出想法，再尝试说英文，对比推荐表达，听正常和慢速朗读，然后继续回答 AI 的追问。",
          "这个流程训练的是主动开口。你不是只看英语，而是在练习“脑子里的意思变成英文句子”的那一刻。",
        ],
        title: "这个软件用来做什么",
      },
      {
        body: [
          "AI 引导表达适合不知道说什么的时候。AI 会根据情景连续性、情绪递进、日常真实感和你的水平，推荐下一句中文。",
          "自由口语练习适合你已经有想法的时候。你先说中文，再尝试英文，然后回答 AI 的追问，让练习变成真实聊天。",
          "经典场景口语练习适合银行、政府办事、开车、日常沟通等可预期的真实生活场景。",
        ],
        title: "主要学习工具",
      },
      {
        body: [
          "SpeakFlow 会在推荐表达里用亮色标出值得掌握的词和词组。点击后，就可以收藏进表达库。",
          "表达库的目标不是越收越多，而是沉淀一套你自己真的会在口语里再次用到的表达。",
        ],
        title: "表达库",
      },
      {
        body: [
          "表达库云同步会把收藏过的表达保存到账号中，换手机登录后自动恢复。",
          "邀请好友、界面语言、通知和账号管理让用户可以管理邀请奖励、软件语言、系统消息、客服联系方式和删除账号请求。",
        ],
        title: "账户设置",
      },
      {
        body: [
          "SpeakFlow 不是为了取代真人老师，也不是普通泛聊天机器人。它更像一个专注的口语训练场。",
          "和开放式聊天相比，SpeakFlow 给学习者更清晰的路径：中文意思、英文尝试、推荐表达、朗读、追问、表达收藏。",
        ],
        title: "它和普通聊天有什么不同",
      },
      {
        body: [
          "SpeakFlow Pro 会解除免费练习限制，支持更长期的 AI 口语练习、AI 对话和课程生成。",
          "付款和订阅管理由 Stripe 处理。SpeakFlow 只保存识别 Pro 权限所需的订阅和奖励信息。",
        ],
        title: "Pro 和隐私",
      },
      {
        body: [
          "如果你有问题、付款异常、邀请奖励、麦克风问题或功能建议，可以在帮助里的“联系与反馈”提交。",
          "真实学习者的反馈很重要，因为 SpeakFlow 是围绕实际开口问题做出来的，不是为了堆功能清单。",
        ],
        title: "联系",
      },
    ],
    tagline: "为真实表达而设计的英语口语练习。",
  },
} as const;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const letterRows = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", "backspace"],
] as const;

const symbolRows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  [".", ",", "?", "!", "'", '"', "-", ":", ";"],
  ["@", "#", "$", "&", "(", ")", "/", "+", "backspace"],
] as const;

const modeMeta: Record<KeyboardMode, { label: string; short: string; lang: string }> = {
  zh: { label: "Chinese", short: "中文", lang: "zh-CN" },
  en: { label: "English", short: "EN", lang: "en-US" },
  handwriting: { label: "Handwriting", short: "手写", lang: "zh-CN" },
  symbols: { label: "Symbols", short: "123", lang: "zh-CN" },
};

const pinyinDictionary: Record<string, string[]> = {
  ai: ["爱"],
  bu: ["不"],
  chi: ["吃"],
  dong: ["懂"],
  hao: ["好", "号码"],
  hen: ["很"],
  kan: ["看"],
  la: ["啦"],
  ma: ["吗", "嘛"],
  ni: ["你", "呢"],
  nihao: ["你好", "你好吗"],
  qu: ["去"],
  shuo: ["说"],
  ta: ["他", "她"],
  ting: ["听"],
  wo: ["我"],
  xiang: ["想"],
  xiexie: ["谢谢"],
  xue: ["学"],
  yao: ["要"],
  yingwen: ["英文"],
  yingyu: ["英语"],
  you: ["有"],
  zhe: ["这"],
  zhongwen: ["中文"],
};

const defaultChineseCandidates = ["？", "！", "我", "你", "好", "这", "谢谢"];
const defaultFreeLearningPrompt = "用中文说出你想表达的内容";
const handwritingCandidates = ["我", "你", "好", "吗", "谢", "爱", "说"];
type InitialStudyRouteViewState = {
  hasNativeSpeech: boolean;
  isNativeSpeechConfirmed: boolean;
  keyboardMode: KeyboardMode;
  message: string;
  nativeSpeech: string;
  practiceStage: PracticeStage;
  primingPracticeStage: PracticeStage | null;
  trainingGroundMode: TrainingGroundMode;
};

function createInitialStudyRouteViewState(
  pathname: string | null
): InitialStudyRouteViewState {
  const baseState: InitialStudyRouteViewState = {
    hasNativeSpeech: false,
    isNativeSpeechConfirmed: false,
    keyboardMode: "zh",
    message: defaultFreeLearningPrompt,
    nativeSpeech: "",
    practiceStage: "native",
    primingPracticeStage: null,
    trainingGroundMode: pathname?.startsWith("/ai-guided-expression")
      ? "guided"
      : "default",
  };

  if (
    pathname === "/free-study/step-2" ||
    pathname === "/ai-guided-expression/step-2"
  ) {
    return {
      ...baseState,
      message: "正在听你说话...",
      primingPracticeStage: "native",
    };
  }

  if (
    pathname === "/free-study/step-4" ||
    pathname === "/ai-guided-expression/step-4"
  ) {
    return {
      ...baseState,
      hasNativeSpeech: true,
      isNativeSpeechConfirmed: true,
      keyboardMode: "en",
      practiceStage: "english",
      primingPracticeStage: "english",
    };
  }

  return baseState;
}

const freePracticeLandingSteps = [
  {
    description: "说出你想表达的内容，尽量具体",
    icon: "mic",
    step: "1",
    title: "点击麦克风，说出中文",
  },
  {
    description: "尝试用英语表达这句话",
    icon: "mic",
    step: "2",
    title: "点击麦克风，说出英文",
  },
  {
    description: "多种表达方式对比，帮你优化",
    icon: "sparkle",
    step: "3",
    title: "AI 给出地道英语表达",
  },
  {
    description: "跟读练习，收藏生词和实用表达",
    icon: "book",
    step: "4",
    title: "朗读准确英文，收藏词汇",
  },
] as const;

const freePracticeLandingChips = [
  { icon: "bulb", label: "获取灵感" },
  { icon: "book", label: "例句参考" },
  { icon: "translate", label: "翻译助手" },
] as const;
const quickPracticeStarters: Array<{
  id: "guided" | "expression" | "classic";
  title: string;
  description: string;
}> = [
  {
    id: "guided",
    title: "AI引导表达（推荐）",
    description: "AI一步一步引导你开口",
  },
  {
    id: "expression",
    title: "新表达",
    description: "收藏、学习和复习你的常用表达",
  },
  {
    id: "classic",
    title: "经典场景口语练习",
    description: "按真实生活场景练高频口语",
  },
];
const bankLessonOrder = [
  "新开银行账户",
  "银行事务口语课",
  "使用 ATM 机和自我服务",
  "网上银行与手机App操作",
  "存款和取款",
  "货币兑换与国际汇款",
  "国际电汇与海外付款",
  "设立储蓄和定期存款账户",
  "信用卡申请与审批流程",
  "信用卡挂失口语课",
  "信用卡报告欺诈收费口语课",
  "银行费用查询与争议解决",
  "银行客服电话口语课",
  "申请个人贷款",
  "房屋抵押贷款咨询",
  "银行保险箱",
  "银行提供的保险产品",
  "投资产品与财富管理",
  "退休储蓄与养老金计划",
  "关闭银行账户",
] as const;
const bankLessons = bankLessonOrder
  .map((title) => {
    const lesson = featuredLessonRecords.find((item) => item.title === title);
    return lesson ? { id: lesson.id, title: lesson.title } : null;
  })
  .filter((lesson): lesson is { id: string; title: string } => Boolean(lesson));

const createClassicLessons = (
  lessons: readonly { id: string; title: string }[]
): ClassicCourseLesson[] => {
  const existingLessonIds = new Set(
    featuredLessonRecords.map((lesson) => lesson.id)
  );

  return lessons.filter((lesson) => existingLessonIds.has(lesson.id));
};

const identityImmigrationLessons = createClassicLessons([
  { id: "government_apply_ssn_zh", title: "申请社会安全号码（SSN）" },
  { id: "government_uscis_registration_zh", title: "申报入境并向USCIS注册" },
  { id: "government_apply_itin_zh", title: "申请个人纳税识别号码（ITIN）" },
  { id: "government_lost_stolen_passport_zh", title: "申报护照遗失或被盗" },
  { id: "government_immigration_office_zh", title: "在移民局办理事务" },
  { id: "government_extend_visa_status_zh", title: "续签或延长签证身份有效期" },
  { id: "government_voter_registration_zh", title: "注册选民资格" },
  { id: "government_official_documents_zh", title: "申请官方证明文件" },
]);

const driverVehicleLessons = createClassicLessons([
  { id: "government_state_id_driver_license_zh", title: "办理州身份证或驾驶执照" },
  { id: "government_dmv_vehicle_registration_zh", title: "在DMV办理车辆注册登记" },
  { id: "driver_vehicle_registration_plates_zh", title: "办理车辆注册及申领车牌" },
  { id: "driver_apply_first_learner_permit_zh", title: "申领首张学习驾驶许可" },
  { id: "driver_prepare_written_test_zh", title: "备考驾驶笔试" },
  { id: "driver_take_official_knowledge_test_zh", title: "参加官方驾驶知识笔试" },
  { id: "driver_prepare_take_road_test_zh", title: "准备并参加路考" },
  { id: "driver_receive_driver_license_zh", title: "领取驾驶执照" },
  { id: "driver_renew_replace_lost_license_zh", title: "续期或补办遗失的驾驶执照" },
  { id: "driver_update_address_name_zh", title: "更新执照上的住址或姓名信息" },
  { id: "driver_convert_foreign_license_zh", title: "将境外驾驶执照转换为美国执照" },
  { id: "driver_license_classes_restrictions_zh", title: "了解不同的执照类别及限制条件" },
  { id: "driver_apply_international_permit_zh", title: "在美国申领国际驾驶许可" },
  { id: "driver_interstate_transfer_rules_zh", title: "跨州驾驶及执照转移规则" },
  { id: "driver_understand_us_traffic_laws_zh", title: "了解美国驾驶法规" },
  { id: "driver_suspension_points_zh", title: "处理执照被吊销或驾照记录扣分问题" },
]);

const insuranceTrafficSafetyLessons = createClassicLessons([
  { id: "driver_accident_insurance_claim_zh", title: "报告交通事故及提交保险理赔申请" },
  { id: "driver_pay_traffic_ticket_zh", title: "缴纳交通罚单及罚款" },
  { id: "driver_defensive_driving_course_zh", title: "参加防御性驾驶或驾驶技能提升课程" },
  { id: "driver_cdl_basics_zh", title: "商业驾驶执照（CDL）申请基础知识" },
  { id: "driver_police_traffic_stop_zh", title: "应对警方例行截停检查" },
]);

const publicServiceLessons = createClassicLessons([
  { id: "government_snap_benefits_zh", title: "申请食品券 / SNAP福利" },
  { id: "government_public_housing_zh", title: "申请公共住房" },
  { id: "government_unemployment_benefits_zh", title: "申请失业救济金" },
  { id: "government_free_resources_zh", title: "利用免费政府资源" },
  { id: "government_file_complaint_zh", title: "向政府机构提交投诉" },
  { id: "government_police_emergency_services_zh", title: "应对警方或紧急救援服务" },
  { id: "government_vaccine_records_zh", title: "接种疫苗并获取健康记录" },
  { id: "government_usps_services_zh", title: "使用美国邮政服务（USPS）" },
  { id: "government_library_card_zh", title: "申请图书证" },
  { id: "government_selective_service_zh", title: "注册兵役登记" },
]);

const insuranceConsultingLessons: ClassicCourseLesson[] = [
  ...createClassicLessons([
    { id: "driver_new_driver_car_insurance_zh", title: "新手司机购买汽车保险" },
  ]),
  ...createClassicLessons([
    { id: "bank_insurance_products_zh", title: "银行提供的保险产品" },
  ]),
  { id: "health_insurance_basic_types_zh", title: "了解美国医疗保险基本类型" },
  { id: "health_insurance_obamacare_aca_zh", title: "新移民如何申请 Obamacare（ACA）医疗保险" },
  { id: "health_insurance_choose_plan_zh", title: "选择合适的健康保险计划" },
  { id: "health_insurance_coverage_consultation_zh", title: "保险覆盖范围咨询" },
  { id: "health_insurance_find_primary_care_doctor_zh", title: "寻找初级保健医生" },
  { id: "health_insurance_denial_preauthorization_zh", title: "处理保险拒赔或预授权问题" },
  { id: "renter_insurance_consultation_zh", title: "租房者保险咨询" },
  { id: "homeowners_insurance_purchase_zh", title: "购买房屋保险" },
  { title: "财产损失或盗窃后的理赔流程" },
  { title: "了解洪水保险和地震保险" },
  { title: "申请雇主提供的团体保险福利" },
  { title: "了解牙科保险和视力保险" },
  { title: "人寿保险基础咨询" },
  { title: "旅行保险或短期保险咨询" },
];

const taxGovernmentFormLessons: ClassicCourseLesson[] = [
  { title: "了解美国联邦所得税与州所得税基本规则" },
  { id: "government_apply_itin_zh", title: "新移民如何申请ITIN（个人纳税识别号码）" },
  { title: "第一次报税需要准备哪些文件" },
  { title: "区分W-2工薪收入与1099独立承包人收入" },
  { title: "申报联邦所得税表格（Form 1040）" },
  { title: "申请退税及追踪退税状态" },
  { title: "了解常见税务抵扣项目（标准扣除 vs 分项扣除）" },
  { title: "申请儿童税收抵免（Child Tax Credit）" },
  { title: "自雇人士预估税款（Estimated Tax）申报" },
  { title: "申报教育费用抵免或学生贷款利息扣除" },
  { title: "房屋租金或房贷利息扣除相关表格" },
  { title: "医疗费用高额扣除申请" },
  { title: "更新个人地址变更表格（Form 8822）" },
  { title: "申请或更新社会安全号码（SSN）相关税务处理" },
  { title: "处理税务局信件与审计通知（IRS Notice）" },
  { title: "申请延期报税（Form 4868）" },
  { title: "了解州政府特定税务表格与截止日期" },
  { title: "报税软件使用与免费报税资源（VITA项目）" },
];

const classicCourseCategories: ClassicCourseCategory[] = [
  {
    id: "finance-government",
    label: "金融与行政事务",
    sections: [
      {
        id: "bank-finance",
        label: "银行与金融交易",
        lessons: bankLessons,
      },
      {
        id: "identity-immigration",
        label: "身份与移民相关",
        lessons: identityImmigrationLessons,
      },
      {
        id: "public-services",
        label: "政府福利与公共服务",
        lessons: publicServiceLessons,
      },
      {
        id: "driver-vehicle",
        label: "驾照与车辆管理",
        lessons: driverVehicleLessons,
      },
      {
        id: "insurance-consulting",
        label: "保险咨询",
        lessons: insuranceConsultingLessons,
      },
      {
        id: "insurance-traffic-safety",
        label: "交通安全",
        lessons: insuranceTrafficSafetyLessons,
      },
      {
        id: "tax-government-forms",
        label: "税务与政府表格",
        lessons: taxGovernmentFormLessons,
      },
    ],
  },
  {
    id: "shopping-consumption",
    label: "购物与消费",
    sections: [
      { id: "grocery-shopping", label: "超市购物", lessons: [] },
      {
        id: "general-shopping",
        label: "购物：衣服、电子产品、一般商店",
        lessons: [],
      },
      { id: "coffee-ordering", label: "咖啡店点单", lessons: [] },
      { id: "fast-casual-dining", label: "快餐和休闲餐饮", lessons: [] },
      { id: "market-shopping", label: "市场购物", lessons: [] },
      {
        id: "electronics-tech-support",
        label: "买电子产品和技术支持",
        lessons: [],
      },
    ],
  },
  {
    id: "restaurant-takeout",
    label: "餐饮与外卖",
    sections: [
      { id: "restaurant-dining", label: "餐厅用餐", lessons: [] },
      { id: "takeout-ordering", label: "点外卖或打包食物", lessons: [] },
    ],
  },
  {
    id: "transportation-travel",
    label: "交通与出行",
    sections: [
      { id: "public-transit", label: "公共交通", lessons: [] },
      { id: "taxi-rideshare", label: "出租车或网约车", lessons: [] },
      {
        id: "airport-customs-immigration",
        label: "机场入境、海关和移民",
        lessons: [],
      },
      {
        id: "car-rental-gas-driving-directions",
        label: "租车、加油站、开车问路",
        lessons: [],
      },
      { id: "directions-navigation", label: "问路和导航", lessons: [] },
    ],
  },
  {
    id: "housing-home",
    label: "住宿与家居",
    sections: [
      { id: "hotel-checkin-stay", label: "酒店入住和住宿", lessons: [] },
      { id: "renting-apartment-house", label: "租公寓或房子", lessons: [] },
      {
        id: "utilities-internet-setup",
        label: "设置水电煤气和网络",
        lessons: [],
      },
      { id: "home-repair-request", label: "房屋维修请求", lessons: [] },
      { id: "moving-home-goods", label: "搬家和家居用品", lessons: [] },
      {
        id: "home-repair-services",
        label: "修理服务（Plumber, Electrician, etc.）",
        lessons: [],
      },
    ],
  },
  {
    id: "health-medical",
    label: "健康与医疗",
    sections: [
      { id: "doctor-hospital-er", label: "看医生、医院和急诊", lessons: [] },
      { id: "pharmacy-medicine", label: "药店买药", lessons: [] },
      { id: "pet-vet-pet-store", label: "宠物兽医或宠物店", lessons: [] },
      { id: "checkup-vaccine", label: "健康检查/疫苗", lessons: [] },
    ],
  },
  {
    id: "service-repair",
    label: "服务与维修",
    sections: [
      { id: "post-office-mail-package", label: "邮局寄邮件或包裹", lessons: [] },
      { id: "hair-salon", label: "理发店/美容院", lessons: [] },
      { id: "gym-membership", label: "健身房/健身中心会员", lessons: [] },
      { id: "library-books", label: "图书馆借书", lessons: [] },
      { id: "laundry-dry-cleaning", label: "洗衣和干洗", lessons: [] },
      { id: "spa-nails", label: "美容服务：水疗、美甲", lessons: [] },
      {
        id: "repair-home-auto",
        label: "维修服务：房屋维修、汽车修理",
        lessons: [],
      },
      {
        id: "customer-service-returns",
        label: "客服投诉和退货",
        lessons: [],
      },
      { id: "auto-repair", label: "汽车维修", lessons: [] },
      { id: "delivery-shipping", label: "快递收发", lessons: [] },
    ],
  },
  {
    id: "education-work-social",
    label: "教育、工作与社交生活",
    sections: [
      {
        id: "job-interview-workplace",
        label: "求职面试和工作场所沟通",
        lessons: [],
      },
      {
        id: "school-university-class",
        label: "学校/大学入学和上课",
        lessons: [],
      },
      { id: "emergency-911", label: "紧急情况：报警、消防、911", lessons: [] },
      {
        id: "entertainment",
        label: "娱乐：电影院、剧院、演唱会",
        lessons: [],
      },
      {
        id: "phone-sim-store",
        label: "手机设置：买SIM卡、商店互动",
        lessons: [],
      },
      {
        id: "social-friends-party-chat",
        label: "社交：交朋友、派对闲聊",
        lessons: [],
      },
      {
        id: "tourist-attractions-museum",
        label: "参观旅游景点/博物馆",
        lessons: [],
      },
      { id: "weather-small-talk", label: "天气和日常闲聊", lessons: [] },
      {
        id: "buying-tickets",
        label: "买票（电影、活动、火车）",
        lessons: [],
      },
      { id: "neighbor-interaction", label: "邻里互动", lessons: [] },
      {
        id: "parent-teacher-conference",
        label: "家长教师会议",
        lessons: [],
      },
      {
        id: "community-volunteering",
        label: "社区活动和志愿服务",
        lessons: [],
      },
      {
        id: "party-social-prep",
        label: "派对或社交活动准备",
        lessons: [],
      },
      {
        id: "religious-community-center",
        label: "宗教或社区中心",
        lessons: [],
      },
    ],
  },
];

const classicSceneMenuHotspots: Array<{
  id: string;
  label: string;
  kind: "category" | "search" | "guided" | "expression";
  rect: { x: number; y: number; width: number; height: number };
}> = [
  {
    id: "search",
    label: "\u641c\u7d22\u7ecf\u5178\u573a\u666f\u8bfe\u7a0b",
    kind: "search",
    rect: { x: 902, y: 52, width: 76, height: 76 },
  },
  {
    id: "finance-government",
    label: "\u91d1\u878d\u4e0e\u884c\u653f\u4e8b\u52a1",
    kind: "category",
    rect: { x: 47, y: 195, width: 456, height: 282 },
  },
  {
    id: "shopping-consumption",
    label: "\u8d2d\u7269\u4e0e\u6d88\u8d39",
    kind: "category",
    rect: { x: 521, y: 195, width: 456, height: 282 },
  },
  {
    id: "restaurant-takeout",
    label: "\u9910\u996e\u4e0e\u5916\u5356",
    kind: "category",
    rect: { x: 47, y: 491, width: 456, height: 257 },
  },
  {
    id: "transportation-travel",
    label: "\u4ea4\u901a\u4e0e\u51fa\u884c",
    kind: "category",
    rect: { x: 521, y: 491, width: 456, height: 257 },
  },
  {
    id: "housing-home",
    label: "\u4f4f\u5bbf\u4e0e\u5bb6\u5c45",
    kind: "category",
    rect: { x: 47, y: 765, width: 456, height: 242 },
  },
  {
    id: "health-medical",
    label: "\u5065\u5eb7\u4e0e\u533b\u7597",
    kind: "category",
    rect: { x: 521, y: 765, width: 456, height: 242 },
  },
  {
    id: "service-repair",
    label: "\u670d\u52a1\u4e0e\u7ef4\u4fee",
    kind: "category",
    rect: { x: 47, y: 1020, width: 456, height: 242 },
  },
  {
    id: "education-work-social",
    label: "\u6559\u80b2\u3001\u5de5\u4f5c\u4e0e\u793e\u4ea4\u751f\u6d3b",
    kind: "category",
    rect: { x: 521, y: 1020, width: 456, height: 242 },
  },
  {
    id: "guided",
    label: "AI \u5f15\u5bfc\u8868\u8fbe",
    kind: "guided",
    rect: { x: 47, y: 1280, width: 456, height: 122 },
  },
  {
    id: "expression",
    label: "\u65b0\u8868\u8fbe",
    kind: "expression",
    rect: { x: 521, y: 1280, width: 456, height: 122 },
  },
];

const classicCategoryDescriptions: Record<string, string> = {
  "finance-government": "\u94f6\u884c\u3001\u652f\u4ed8\u3001\u7a0e\u52a1\u3001\u7b7e\u8bc1\u7b49\u573a\u666f",
  "shopping-consumption": "\u8d2d\u7269\u3001\u9000\u6362\u3001\u652f\u4ed8\u3001\u8ba8\u4ef7\u8fd8\u4ef7",
  "restaurant-takeout": "\u70b9\u9910\u3001\u5916\u5356\u3001\u5496\u5561\u3001\u9910\u5385\u6c9f\u901a",
  "transportation-travel": "\u673a\u573a\u3001\u5730\u94c1\u3001\u6253\u8f66\u3001\u95ee\u8def",
  "housing-home": "\u9152\u5e97\u5165\u4f4f\u3001\u79df\u623f\u3001\u5bb6\u5c45\u751f\u6d3b",
  "health-medical": "\u770b\u75c5\u3001\u4e70\u836f\u3001\u4f53\u68c0\u3001\u5065\u5eb7\u54a8\u8be2",
  "service-repair": "\u5feb\u9012\u3001\u552e\u540e\u3001\u7ef4\u4fee\u3001\u7f8e\u5bb9\u7f8e\u53d1",
  "education-work-social": "\u5de5\u4f5c\u6c9f\u901a\u3001\u9762\u8bd5\u3001\u793e\u4ea4\u3001\u5b66\u6821\u751f\u6d3b",
};

type ClassicMenuCardVisual = {
  accent: string;
  background: string;
  icon: string;
  iconBackground?: string;
};

const defaultClassicMenuCardVisual: ClassicMenuCardVisual = {
  accent: "#735cff",
  background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#f7f5ff 100%)",
  icon: "\u8bfe",
  iconBackground: "#f0edff",
};

const classicMenuCardVisuals: Record<string, ClassicMenuCardVisual> = {
  "finance-government": {
    accent: "#5b63ff",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#f7f5ff 100%)",
    icon: "\u91d1",
    iconBackground: "#eeeaff",
  },
  "shopping-consumption": {
    accent: "#7b61ff",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#faf7ff 100%)",
    icon: "\u8d2d",
    iconBackground: "#f0eaff",
  },
  "restaurant-takeout": {
    accent: "#ec5b9f",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#fff7fb 100%)",
    icon: "\u9910",
    iconBackground: "#ffeaf4",
  },
  "transportation-travel": {
    accent: "#2f8de4",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#f5fbff 100%)",
    icon: "\u884c",
    iconBackground: "#e8f4ff",
  },
  "housing-home": {
    accent: "#0fa37d",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#f3fffb 100%)",
    icon: "\u4f4f",
    iconBackground: "#ddf8ef",
  },
  "health-medical": {
    accent: "#2ab99b",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#f3fffa 100%)",
    icon: "\u533b",
    iconBackground: "#dcf7ef",
  },
  "service-repair": {
    accent: "#f26f26",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#fff7ef 100%)",
    icon: "\u4fee",
    iconBackground: "#fff0e6",
  },
  "education-work-social": {
    accent: "#735cff",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#f8f6ff 100%)",
    icon: "\u5b66",
    iconBackground: "#eeeaff",
  },
  guided: {
    accent: "#7b61ff",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#faf8ff 100%)",
    icon: "AI",
    iconBackground: "#f0eaff",
  },
  expression: {
    accent: "#2d99f0",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 64%,#f4fbff 100%)",
    icon: "\u65b0",
    iconBackground: "#e5f4ff",
  },
};

function getClassicCourseLessonCount(category: ClassicCourseCategory) {
  return category.sections.reduce(
    (total, section) =>
      total + section.lessons.filter((lesson) => Boolean(lesson.id)).length,
    0
  );
}

function ClassicMenuArrow({ accent }: { accent: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#eef0fa] bg-white shadow-[0_8px_18px_rgba(84,72,146,0.08)] transition group-hover:translate-x-0.5"
      style={{ color: accent }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.7"
      >
        <path d="m9 5 7 7-7 7" />
      </svg>
    </span>
  );
}

function ClassicMenuIcon({
  accent,
  id,
}: {
  accent: string;
  id: string;
}) {
  if (id === "guided") {
    return (
      <span
        aria-hidden="true"
        className="font-[var(--font-sora)] text-[1.18rem] font-black leading-none"
        style={{ color: accent }}
      >
        AI
      </span>
    );
  }

  const iconProps = {
    className: "h-6 w-6",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.2,
    viewBox: "0 0 24 24",
  };

  return (
    <svg aria-hidden="true" style={{ color: accent }} {...iconProps}>
      {id === "finance-government" ? (
        <>
          <path d="M3.5 10h17L12 4.8 3.5 10Z" />
          <path d="M5.5 19h13M4.5 21h15M7 10v8M11 10v8M15 10v8M19 10v8" />
        </>
      ) : id === "bank-finance" || id === "public-services" ? (
        <>
          <path d="M3.5 10h17L12 4.8 3.5 10Z" />
          <path d="M5.5 19h13M4.5 21h15M7 10v8M11 10v8M15 10v8M19 10v8" />
        </>
      ) : id === "identity-immigration" ? (
        <>
          <path d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 17 19.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5Z" />
          <path d="M9 8h6M9 16h6" />
          <path d="M10 12.2a2 2 0 0 1 4 0" />
          <path d="M9.1 14.3h5.8" />
        </>
      ) : id === "driver-vehicle" ? (
        <>
          <path d="M6.5 17h11M7 17v2M17 17v2M5.5 13.5h13" />
          <path d="M6.6 7.5h10.8l1.1 6v3.5h-13v-3.5l1.1-6Z" />
          <path d="M8.5 14.8h.1M15.4 14.8h.1" />
        </>
      ) : id === "insurance-consulting" ? (
        <>
          <path d="M12 21s7-3.2 7-9.2V6.5L12 4 5 6.5v5.3C5 17.8 12 21 12 21Z" />
          <path d="m9.2 12.3 1.9 1.9 3.8-4.4" />
        </>
      ) : id === "insurance-traffic-safety" ? (
        <>
          <path d="M9 4.5h6l1.2 11h-8.4L9 4.5Z" />
          <path d="M7 19.5h10M8.2 15.5h7.6M8.6 9h6.8" />
        </>
      ) : id === "tax-government-forms" ? (
        <>
          <path d="M7 4.5h7l3 3v12H7v-15Z" />
          <path d="M14 4.5v3h3M9.5 12h5M9.5 15h5M9.5 9h2" />
        </>
      ) : id === "all-finance-government" ? (
        <>
          <path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z" />
        </>
      ) : id === "shopping-consumption" ? (
        <>
          <path d="M6.5 9h11l1 11h-13l1-11Z" />
          <path d="M9 9a3 3 0 0 1 6 0" />
        </>
      ) : id === "restaurant-takeout" ? (
        <>
          <path d="M7 4v16M4.5 4v5.5a2.5 2.5 0 0 0 5 0V4" />
          <path d="M16 4v16M16 4c2.2 1 3.5 2.8 3.5 5.2V11H16" />
        </>
      ) : id === "transportation-travel" ? (
        <>
          <path d="M6.5 17h11M7 17v2M17 17v2M5.5 13.5h13" />
          <path d="M6.6 7.5h10.8l1.1 6v3.5h-13v-3.5l1.1-6Z" />
          <path d="M8.5 14.8h.1M15.4 14.8h.1" />
        </>
      ) : id === "housing-home" ? (
        <>
          <path d="m4 11 8-6.5 8 6.5" />
          <path d="M6.5 10v9h11v-9" />
          <path d="M10 19v-5h4v5" />
        </>
      ) : id === "health-medical" ? (
        <>
          <path d="M12 21s7-3.2 7-9.2V6.5L12 4 5 6.5v5.3C5 17.8 12 21 12 21Z" />
          <path d="M12 8.6v6.8M8.6 12h6.8" />
        </>
      ) : id === "service-repair" ? (
        <>
          <path d="M14.5 5.5a4.6 4.6 0 0 0 4.8 6.5l-7.5 7.5a2.2 2.2 0 0 1-3.1-3.1l7.5-7.5a4.6 4.6 0 0 0-1.7-3.4Z" />
          <path d="m5 7 3 3M4.5 4.5l3 3" />
        </>
      ) : id === "education-work-social" ? (
        <>
          <path d="m3.5 8.5 8.5-4 8.5 4-8.5 4-8.5-4Z" />
          <path d="M7 10.4v4.1c1.4 1.3 3 2 5 2s3.6-.7 5-2v-4.1" />
          <path d="M20.5 9v5" />
        </>
      ) : (
        <>
          <path d="M5 6.5h14v9H9l-4 3v-12Z" />
          <path d="M9 11h.1M12 11h.1M15 11h.1" />
        </>
      )}
    </svg>
  );
}

function ClassicMenuHeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-[-0.75rem] top-7 hidden h-[9.5rem] w-[11rem] min-[390px]:block"
    >
      <span className="absolute right-0 top-3 h-[7.5rem] w-[8.8rem] rotate-[13deg] rounded-[2.4rem] bg-[#eeeaff]/82" />
      <span className="absolute left-4 top-6 h-[5.8rem] w-[6.7rem] rotate-[8deg] rounded-[1.4rem] border border-[#a99bff]/50 bg-[#e4ddff]/64 shadow-[0_18px_36px_rgba(123,97,255,0.2)]" />
      <span className="absolute left-[3.4rem] top-[3.2rem] grid h-[5.6rem] w-[6.5rem] -rotate-[8deg] place-items-center rounded-[1.35rem] border border-white/82 bg-white/78 shadow-[0_20px_44px_rgba(84,72,146,0.2)] backdrop-blur-md">
        <span className="relative grid h-[3.9rem] w-[4.6rem] place-items-center rounded-full bg-white text-[#735cff] shadow-[0_10px_24px_rgba(84,72,146,0.14)]">
          <span className="absolute -bottom-1.5 left-4 h-4 w-4 rotate-45 bg-white" />
          <span className="relative flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-current" />
            <span className="h-2 w-2 rounded-full bg-current" />
            <span className="h-2 w-2 rounded-full bg-current" />
          </span>
        </span>
      </span>
      <span className="absolute left-1 top-3 text-[1.2rem] font-black text-white">
        ✦
      </span>
      <span className="absolute right-8 top-1 text-[0.8rem] font-black text-white">
        ✦
      </span>
    </div>
  );
}

function FreePracticeLandingIcon({
  icon,
}: {
  icon: (typeof freePracticeLandingSteps)[number]["icon"] | "bulb" | "translate";
}) {
  const commonProps = {
    className: "h-8 w-8",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.2,
    viewBox: "0 0 24 24",
  };

  return (
    <svg aria-hidden="true" {...commonProps}>
      {icon === "mic" ? (
        <>
          <path d="M12 4.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3Z" />
          <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" />
        </>
      ) : icon === "sparkle" ? (
        <>
          <path d="M12 3.8 14.4 9l5.2 2.4-5.2 2.4L12 19l-2.4-5.2-5.2-2.4L9.6 9 12 3.8Z" />
          <path d="m18.4 4.8.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" />
        </>
      ) : icon === "book" ? (
        <>
          <path d="M5 5.5h5.2A2.8 2.8 0 0 1 13 8.3v11.2a2.8 2.8 0 0 0-2.8-2.8H5V5.5Z" />
          <path d="M19 5.5h-5.2A2.8 2.8 0 0 0 11 8.3v11.2a2.8 2.8 0 0 1 2.8-2.8H19V5.5Z" />
        </>
      ) : icon === "bulb" ? (
        <>
          <path d="M15.5 14.8c1.1-.9 2-2.4 2-4.1a5.5 5.5 0 0 0-11 0c0 1.7.9 3.2 2 4.1.7.6 1 1.2 1 2v.2h5v-.2c0-.8.3-1.4 1-2Z" />
          <path d="M9.5 20h5M10 17h4" />
        </>
      ) : (
        <>
          <path d="M5 5h6v6H5zM13 13h6v6h-6z" />
          <path d="M14 5h2.5A2.5 2.5 0 0 1 19 7.5V10M10 19H7.5A2.5 2.5 0 0 1 5 16.5V14" />
          <path d="m15 7 1.5-1.5L18 7M9 17l-1.5 1.5L6 17" />
        </>
      )}
    </svg>
  );
}

const financeGovernmentMenuHotspots: Array<{
  id: string;
  label: string;
  kind: "back" | "home" | "section" | "all";
  rect: { x: number; y: number; width: number; height: number };
}> = [
  {
    id: "back",
    label: "\u8fd4\u56de\u7ecf\u5178\u573a\u666f\u5206\u7c7b",
    kind: "back",
    rect: { x: 30, y: 32, width: 58, height: 58 },
  },
  {
    id: "home",
    label: "\u8fd4\u56de\u9996\u9875",
    kind: "home",
    rect: { x: 926, y: 32, width: 58, height: 58 },
  },
  {
    id: "bank-finance",
    label: "\u94f6\u884c\u4e0e\u91d1\u878d\u4ea4\u6613",
    kind: "section",
    rect: { x: 48, y: 357, width: 458, height: 289 },
  },
  {
    id: "identity-immigration",
    label: "\u8eab\u4efd\u4e0e\u79fb\u6c11\u76f8\u5173",
    kind: "section",
    rect: { x: 518, y: 357, width: 458, height: 289 },
  },
  {
    id: "public-services",
    label: "\u653f\u5e9c\u798f\u5229\u4e0e\u516c\u5171\u670d\u52a1",
    kind: "section",
    rect: { x: 48, y: 663, width: 458, height: 277 },
  },
  {
    id: "driver-vehicle",
    label: "\u9a7e\u7167\u4e0e\u8f66\u8f86\u7ba1\u7406",
    kind: "section",
    rect: { x: 518, y: 663, width: 458, height: 277 },
  },
  {
    id: "insurance-consulting",
    label: "\u4fdd\u9669\u54a8\u8be2",
    kind: "section",
    rect: { x: 48, y: 958, width: 458, height: 267 },
  },
  {
    id: "insurance-traffic-safety",
    label: "\u4ea4\u901a\u5b89\u5168",
    kind: "section",
    rect: { x: 518, y: 958, width: 458, height: 267 },
  },
  {
    id: "tax-government-forms",
    label: "\u7a0e\u52a1\u4e0e\u653f\u5e9c\u8868\u683c",
    kind: "section",
    rect: { x: 48, y: 1244, width: 458, height: 205 },
  },
  {
    id: "all-finance-government",
    label: "\u67e5\u770b\u5168\u90e8\u91d1\u878d\u4e0e\u884c\u653f\u8bfe\u7a0b",
    kind: "all",
    rect: { x: 518, y: 1244, width: 458, height: 205 },
  },
];

const financeGovernmentSectionDescriptions: Record<string, string> = {
  "bank-finance":
    "\u5f00\u6237\u3001\u5b58\u6b3e\u3001\u53d6\u6b3e\u3001\u8f6c\u8d26\u3001\u7406\u8d22\u7b49\u5e38\u7528\u8868\u8fbe",
  "driver-vehicle":
    "\u9a7e\u7167\u8003\u8bd5\u3001\u6362\u8bc1\u3001\u8f66\u8f86\u6ce8\u518c\u3001\u5e74\u68c0\u7b49\u573a\u666f",
  "identity-immigration":
    "\u62a4\u7167\u3001\u7b7e\u8bc1\u3001\u5c45\u7559\u7533\u8bf7\u3001\u79fb\u6c11\u9762\u8bd5\u7b49\u573a\u666f",
  "insurance-consulting":
    "\u54a8\u8be2\u4fdd\u9669\u3001\u8d2d\u4e70\u4fdd\u9669\u3001\u7406\u8d54\u3001\u4fdd\u9669\u6761\u6b3e\u7406\u89e3\u7b49\u8868\u8fbe",
  "insurance-traffic-safety":
    "\u4ea4\u901a\u89c4\u5219\u3001\u8fdd\u7ae0\u5904\u7406\u3001\u7f5a\u6b3e\u3001\u4ea4\u901a\u4e8b\u6545\u7b49\u573a\u666f",
  "public-services":
    "\u793e\u4fdd\u3001\u5931\u4e1a\u6551\u6d4e\u3001\u516c\u5171\u670d\u52a1\u7533\u8bf7\u7b49\u8868\u8fbe",
  "tax-government-forms":
    "\u62a5\u7a0e\u3001\u7a0e\u52a1\u54a8\u8be2\u3001\u586b\u5199\u653f\u5e9c\u8868\u683c\u7b49\u5e38\u7528\u8868\u8fbe",
};

const financeGovernmentSectionVisuals: Record<string, ClassicMenuCardVisual> = {
  "bank-finance": {
    accent: "#735cff",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 62%,#f7f5ff 100%)",
    icon: "\u94f6",
    iconBackground: "#eeeaff",
  },
  "driver-vehicle": {
    accent: "#14a980",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 62%,#f2fffa 100%)",
    icon: "\u8f66",
    iconBackground: "#ddf8ef",
  },
  "identity-immigration": {
    accent: "#438ce8",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 62%,#f4f9ff 100%)",
    icon: "\u8bc1",
    iconBackground: "#e8f3ff",
  },
  "insurance-consulting": {
    accent: "#ef4d8b",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 62%,#fff5fa 100%)",
    icon: "\u4fdd",
    iconBackground: "#ffe8f3",
  },
  "insurance-traffic-safety": {
    accent: "#f28a00",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 62%,#fff8ed 100%)",
    icon: "\u5b89",
    iconBackground: "#fff0d8",
  },
  "public-services": {
    accent: "#b654e4",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 62%,#fff7ff 100%)",
    icon: "\u653f",
    iconBackground: "#faeaff",
  },
  "tax-government-forms": {
    accent: "#428ee8",
    background: "linear-gradient(135deg,#ffffff 0%,#ffffff 62%,#f5faff 100%)",
    icon: "\u7a0e",
    iconBackground: "#e8f3ff",
  },
};

const financeGovernmentSectionDisplayCounts: Record<string, number> = {
  "bank-finance": 20,
  "driver-vehicle": 16,
  "identity-immigration": 8,
  "insurance-consulting": 10,
  "insurance-traffic-safety": 8,
  "public-services": 10,
  "tax-government-forms": 10,
};

const financeGovernmentTotalDisplayCount = 83;

const emojis = ["😊", "👍", "🙏", "❤️", "😂", "😅"] as const;
const expressionVariantLabels: Array<{
  key: ExpressionVariantKey;
  label: string;
}> = [
  { key: "standard", label: "推荐表达" },
  { key: "idiomatic", label: "更地道" },
  { key: "simple", label: "更简单" },
  { key: "natural", label: "更自然" },
];

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function createFallbackExpressionVariants(standardEnglish: string) {
  return expressionVariantLabels.map(({ key, label }) => ({
    key,
    label,
    text: standardEnglish || "This sentence is still being prepared.",
  }));
}

const distortedVoiceNamePattern =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|jester|organ|princess|superstar|trinoids|whisper|zarvox/i;

function isEnglishVoice(voice: SpeechSynthesisVoice) {
  return voice.lang.toLowerCase().startsWith("en");
}

function isStableSpeechVoice(voice: SpeechSynthesisVoice) {
  return isEnglishVoice(voice) && !distortedVoiceNamePattern.test(voice.name);
}

function pickPreferredEnglishVoice(voices: SpeechSynthesisVoice[]) {
  const candidates = voices.filter(isStableSpeechVoice);

  return (
    candidates.find((voice) => /samantha/i.test(voice.name)) ||
    candidates.find((voice) => /google us english/i.test(voice.name)) ||
    candidates.find((voice) => /microsoft.*(jenny|aria|zira|guy|david)/i.test(voice.name)) ||
    candidates.find((voice) => /english.*united states|en-US/i.test(`${voice.name} ${voice.lang}`)) ||
    candidates.find((voice) => voice.localService) ||
    candidates[0] ||
    null
  );
}

function normalizeSpeechRate(rate: number) {
  return Math.min(Math.max(rate, 0.5), 1.15);
}

const SLOW_READ_RATE = 0.5;

function MenuGlyph({
  level,
  className = "",
}: {
  level: 2 | 3 | 4 | 5;
  className?: string;
}) {
  if (level === 2) {
    return (
      <span
        aria-hidden="true"
        className={`mr-2 inline-grid h-5 w-5 shrink-0 place-items-center text-[1.1rem] font-bold leading-none text-[#201833] ${className}`}
      >
        ⌄
      </span>
    );
  }

  if (level === 4) {
    return (
      <span
        aria-hidden="true"
        className={`mr-2 inline-grid h-5 w-5 shrink-0 place-items-center ${className}`}
      >
        <span className="relative block h-3 w-3">
          <span className="absolute left-0 top-[1px] h-px w-3 rounded-full bg-[#6e5d9e]" />
          <span className="absolute left-0 top-[5px] h-px w-3 rounded-full bg-[#6e5d9e]" />
          <span className="absolute left-0 top-[9px] h-px w-3 rounded-full bg-[#6e5d9e]" />
          <span className="absolute left-[2px] top-[-1px] h-1.5 w-1.5 rounded-full bg-[#6e5d9e]" />
          <span className="absolute right-[1px] top-[3px] h-1.5 w-1.5 rounded-full bg-[#6e5d9e]" />
          <span className="absolute left-[5px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#6e5d9e]" />
        </span>
      </span>
    );
  }

  const glyphByLevel = {
    3: "›",
    5: "•",
  } as const;
  const classByLevel = {
    3: "h-5 w-5 text-[1.05rem] font-bold text-[#4b4267]",
    5: "h-3 w-3 text-[0.62rem] text-[#8b7ab8]",
  } as const;

  return (
    <span
      aria-hidden="true"
      className={`mr-2 inline-grid shrink-0 place-items-center leading-none ${classByLevel[level]} ${className}`}
    >
      {glyphByLevel[level]}
    </span>
  );
}

function VoiceGlyph({ active = false }: { active?: boolean }) {
  return (
    <span className="flex items-end gap-0.5">
      {[8, 15, 23, 16].map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`w-1.5 rounded-full bg-white ${
            active ? "animate-pulse" : ""
          }`}
          style={{ height }}
        />
      ))}
    </span>
  );
}

export default function SpeakEnglishPage() {
  return <SpeakEnglishClient />;
}

function SpeakEnglishClient() {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const initialRouteViewStateRef = useRef<InitialStudyRouteViewState | null>(
    null
  );
  if (initialRouteViewStateRef.current === null) {
    initialRouteViewStateRef.current = createInitialStudyRouteViewState(pathname);
  }
  const initialRouteViewState = initialRouteViewStateRef.current!;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const isDrawingRef = useRef(false);
  const speechBufferRef = useRef("");
  const shouldCommitSpeechRef = useRef(false);
  const speechSilenceTimerRef = useRef<number | null>(null);
  const speechNoInputTimerRef = useRef<number | null>(null);
  const speechStopFallbackTimerRef = useRef<number | null>(null);
  const speechMaxTimerRef = useRef<number | null>(null);
  const activeRecognitionStageRef = useRef<PracticeStage>(
    initialRouteViewState.practiceStage
  );
  const freePracticeRoundIdRef = useRef(createFreePracticeRoundId());
  const aiGuidedFollowPracticePendingRef = useRef(false);
  const guidedConversationTurnsRef = useRef<GuidedConversationTurn[]>([]);
  const guidedFollowupRequestKeyRef = useRef("");
  const freeConversationRequestKeyRef = useRef("");
  const freeConversationFetchRequestKeyRef = useRef("");
  const authoritativeEnglishRequestKeyRef = useRef("");
  const freeConversationPrefetchRef =
    useRef<FreeConversationPrefetch | null>(null);
  const hasEnglishAttemptRef = useRef(false);
  const messageRef = useRef("");
  const handledStepRouteRef = useRef("");

  const [message, setMessage] = useState(initialRouteViewState.message);
  const [inputText, setInputText] = useState("");
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>(
    initialRouteViewState.keyboardMode
  );
  const [trainingGroundMode, setTrainingGroundMode] =
    useState<TrainingGroundMode>(initialRouteViewState.trainingGroundMode);
  const [composingPinyin, setComposingPinyin] = useState("");
  const [isShifted, setIsShifted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecognizingNativeSpeech, setIsRecognizingNativeSpeech] =
    useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [practiceStage, setPracticeStage] = useState<PracticeStage>(
    initialRouteViewState.practiceStage
  );
  const [nativeSpeech, setNativeSpeech] = useState(
    initialRouteViewState.nativeSpeech
  );
  const [isNativeSpeechConfirmed, setIsNativeSpeechConfirmed] = useState(
    initialRouteViewState.isNativeSpeechConfirmed
  );
  const [authoritativeEnglish, setAuthoritativeEnglish] = useState("");
  const [hasEnglishAttempt, setHasEnglishAttempt] = useState(false);
  const [standardEnglish, setStandardEnglish] = useState("");
  const [hasNativeSpeech, setHasNativeSpeech] = useState(
    initialRouteViewState.hasNativeSpeech
  );
  const [primingPracticeStage, setPrimingPracticeStage] =
    useState<PracticeStage | null>(
      initialRouteViewState.primingPracticeStage
    );
  const [expressionVariants, setExpressionVariants] = useState<
    ExpressionVariant[]
  >([]);
  const [selectedExpressionIndex, setSelectedExpressionIndex] = useState(0);
  const [isLoadingExpressionVariants, setIsLoadingExpressionVariants] =
    useState(false);
  const [pendingExpression, setPendingExpression] = useState<{
    phrase: string;
    meaning: string;
    sourceSentence: string;
    kind: "phrase" | "word";
  } | null>(null);
  const [isSavingExpression, setIsSavingExpression] = useState(false);
  const [vocabularyNotice, setVocabularyNotice] = useState("");
  const [highlightedExpressions, setHighlightedExpressions] = useState<
    HighlightedExpression[]
  >([]);
  const [hasInk, setHasInk] = useState(false);
  const [showQuickPanel, setShowQuickPanel] = useState(false);
  const previousShowQuickPanelRef = useRef(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [accountPanelView, setAccountPanelView] =
    useState<AccountPanelView>("menu");
  const [accountPanelReturnTarget, setAccountPanelReturnTarget] = useState<
    "account" | "local"
  >("local");
  const [fontSizePreference, setFontSizePreference] =
    useState<FontSizePreference>("standard");
  const [selectedProPlan, setSelectedProPlan] = useState<ProPlan>("yearly");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false);
  const [billingPortalNotice, setBillingPortalNotice] = useState("");
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
  const [restorePurchaseNotice, setRestorePurchaseNotice] = useState("");
  const [supportIssueType, setSupportIssueType] = useState("payment");
  const [supportContactEmail, setSupportContactEmail] = useState("");
  const [supportRelatedPage, setSupportRelatedPage] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportNotice, setSupportNotice] = useState("");
  const [isSubmittingSupportFeedback, setIsSubmittingSupportFeedback] =
    useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountImage, setAccountImage] = useState("");
  const [accountRole, setAccountRole] = useState<"user" | "admin">("user");
  const [accountImageFailed, setAccountImageFailed] = useState(false);
  const [hasLoadedAccountSession, setHasLoadedAccountSession] =
    useState(false);
  const [accountSubscriptionStatus, setAccountSubscriptionStatus] =
    useState<SubscriptionStatus>("free");
  const [accountCurrentPeriodEnd, setAccountCurrentPeriodEnd] = useState("");
  const [isLoadingAccountSubscription, setIsLoadingAccountSubscription] =
    useState(false);
  const [hasCheckedAccountSubscription, setHasCheckedAccountSubscription] =
    useState(false);
  const [accountSubscriptionRefreshKey, setAccountSubscriptionRefreshKey] =
    useState(0);
  const [referralState, setReferralState] =
    useState<ReferralAccountResponse | null>(null);
  const [isLoadingReferralState, setIsLoadingReferralState] = useState(false);
  const [referralNotice, setReferralNotice] = useState("");
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarEditorNotice, setAvatarEditorNotice] = useState("");
  const [guidedFollowupSuggestion, setGuidedFollowupSuggestion] = useState("");
  const [isLoadingGuidedFollowup, setIsLoadingGuidedFollowup] = useState(false);
  const [guidedFollowupRefreshKey, setGuidedFollowupRefreshKey] = useState(0);
  const [freeConversationResponse, setFreeConversationResponse] =
    useState<FreeConversationResponse | null>(null);
  const [freeConversationQuestionPrompt, setFreeConversationQuestionPrompt] =
    useState<{ english: string; hintChinese: string } | null>(null);
  const [isFreeConversationHintVisible, setIsFreeConversationHintVisible] =
    useState(false);
  const [isLoadingFreeConversation, setIsLoadingFreeConversation] =
    useState(false);
  const [showExpressionMenu, setShowExpressionMenu] = useState(false);
  const [showClassicCoursePicker, setShowClassicCoursePicker] = useState(false);
  const [selectedClassicCourseCategoryId, setSelectedClassicCourseCategoryId] =
    useState("");
  const [selectedClassicCourseSectionId, setSelectedClassicCourseSectionId] =
    useState("");
  const [classicCourseSearchQuery, setClassicCourseSearchQuery] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>(
    []
  );
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showPreviewKeyboard, setShowPreviewKeyboard] = useState(true);
  const [showFreePracticeLimitModal, setShowFreePracticeLimitModal] =
    useState(false);
  const [freePracticeUsageCount, setFreePracticeUsageCount] = useState(0);

  const activeRows = keyboardMode === "symbols" ? symbolRows : letterRows;
  const baseInputValue =
    keyboardMode === "zh" && composingPinyin
      ? `${inputText}${composingPinyin}`
      : inputText;
  const renderedInputValue =
    isListening && liveTranscript.trim()
      ? `${baseInputValue}${baseInputValue ? " " : ""}${liveTranscript}`
      : baseInputValue;
  const currentMode = modeMeta[keyboardMode];
  const accountCopy = accountPanelCopy[language];
  const helpCenter = helpCenterContent[language];
  const supportFeedback = supportFeedbackContent[language];
  const aboutSpeakFlow = aboutSpeakFlowContent[language];
  const displaySettings = displaySettingsContent[language];
  const notificationSettings = notificationSettingsContent[language];
  const accountManagement = accountManagementContent[language];
  const accountHome = accountHomeContent[language];
  const referrals = referralContent[language];
  const currentInterfaceLanguage =
    interfaceLanguageOptions.find((option) => option.uiLanguage === language) ||
    interfaceLanguageOptions[0];
  const proFeatureItems = accountCopy.proFeatures;
  const voiceMenuItemLabel = language === "en" ? "Voice" : "声音";
  const isAiGuidedMode = trainingGroundMode === "guided";
  const activeFreePracticeScope: FreePracticeScope = isAiGuidedMode
    ? "guided"
    : "free";
  const isFreeConversationMode = false;
  const isPrimingNativeSpeech =
    primingPracticeStage === "native" &&
    practiceStage === "native" &&
    !hasNativeSpeech &&
    !hasEnglishAttempt;
  const isPrimingEnglishSpeech =
    primingPracticeStage === "english" &&
    practiceStage === "english" &&
    !hasEnglishAttempt;
  const trainingGroundTitle = isAiGuidedMode ? "AI引导表达" : "";
  const chineseCandidates = useMemo(() => {
    const pinyin = composingPinyin.toLowerCase();
    if (!pinyin) return defaultChineseCandidates;

    const exact = pinyinDictionary[pinyin] ?? [];
    const prefixMatches = Object.entries(pinyinDictionary)
      .filter(([key]) => key.startsWith(pinyin))
      .flatMap(([, values]) => values);

    return unique([...exact, ...prefixMatches, pinyin]).slice(0, 7);
  }, [composingPinyin]);
  const hasPracticeActivity =
    Boolean(primingPracticeStage) ||
    hasNativeSpeech ||
    hasEnglishAttempt ||
    Boolean(standardEnglish) ||
    isListening ||
    (isFreeConversationMode && Boolean(freeConversationQuestionPrompt)) ||
    Boolean(inputText.trim()) ||
    Boolean(liveTranscript.trim());
  const showLandingPrompt = !hasPracticeActivity;
  const showNativeConfirmationPrompt =
    hasNativeSpeech &&
    !isNativeSpeechConfirmed &&
    !hasEnglishAttempt &&
    !isListening;
  const showNativeCompletePrompt =
    hasNativeSpeech &&
    isNativeSpeechConfirmed &&
    !hasEnglishAttempt &&
    !standardEnglish;
  const showListeningPrompt = isListening;
  const showNativeRecognitionPrompt =
    isRecognizingNativeSpeech &&
    practiceStage === "native" &&
    !hasNativeSpeech;
  const showFreeConversationAnswerPrompt =
    isFreeConversationMode &&
    Boolean(freeConversationQuestionPrompt) &&
    !hasEnglishAttempt &&
    !nativeSpeech;
  const showFreePracticeNativeListeningPrompt =
    (showListeningPrompt ||
      showNativeRecognitionPrompt ||
      isPrimingNativeSpeech) &&
    !(practiceStage === "english" && nativeSpeech) &&
    !(isFreeConversationMode && freeConversationQuestionPrompt);
  const showVoiceOnlyPrompt =
    showLandingPrompt ||
    showNativeCompletePrompt ||
    showListeningPrompt ||
    showFreeConversationAnswerPrompt;
  const showReferenceLanding =
    showLandingPrompt && !isAiGuidedMode && !showQuickPanel && !showAccountMenu;
  const showReferenceListening =
    showFreePracticeNativeListeningPrompt &&
    !isAiGuidedMode &&
    !showQuickPanel &&
    !showAccountMenu;
  const showReferenceConfirmation =
    showNativeConfirmationPrompt &&
    !isAiGuidedMode &&
    !showQuickPanel &&
    !showAccountMenu;
  const showReferenceEnglishPrompt =
    showNativeCompletePrompt &&
    !isAiGuidedMode &&
    !showQuickPanel &&
    !showAccountMenu;
  const showReferenceEnglishListening =
    (showListeningPrompt || isPrimingEnglishSpeech) &&
    practiceStage === "english" &&
    (Boolean(nativeSpeech) || isPrimingEnglishSpeech) &&
    !isAiGuidedMode &&
    !showQuickPanel &&
    !showAccountMenu;
  const showReferenceResult =
    hasEnglishAttempt &&
    !isFreeConversationMode &&
    !isAiGuidedMode &&
    !showQuickPanel &&
    !showAccountMenu;
  const showGuidedReferenceLanding =
    isAiGuidedMode && showLandingPrompt && !showQuickPanel && !showAccountMenu;
  const showGuidedReferenceListening =
    isAiGuidedMode &&
    showFreePracticeNativeListeningPrompt &&
    !showQuickPanel &&
    !showAccountMenu;
  const showGuidedReferenceConfirmation =
    isAiGuidedMode &&
    showNativeConfirmationPrompt &&
    !showQuickPanel &&
    !showAccountMenu;
  const showGuidedReferenceEnglishReady =
    isAiGuidedMode &&
    practiceStage === "english" &&
    Boolean(nativeSpeech) &&
    isNativeSpeechConfirmed &&
    !hasEnglishAttempt &&
    !showQuickPanel &&
    !showAccountMenu;
  const showGuidedReferenceEnglishListening =
    isAiGuidedMode &&
    (showListeningPrompt ||
      isPrimingEnglishSpeech ||
      showGuidedReferenceEnglishReady) &&
    practiceStage === "english" &&
    (Boolean(nativeSpeech) || isPrimingEnglishSpeech) &&
    !showQuickPanel &&
    !showAccountMenu;
  const showGuidedReferenceResult =
    isAiGuidedMode &&
    hasEnglishAttempt &&
    !isFreeConversationMode &&
    !showQuickPanel &&
    !showAccountMenu;
  const showPracticeKeyboardPanel =
    hasPracticeActivity &&
    !hasEnglishAttempt &&
    !showNativeConfirmationPrompt &&
    !showNativeCompletePrompt &&
    !showListeningPrompt &&
    !showFreeConversationAnswerPrompt;
  const showAiGuidedNudge = hasEnglishAttempt && !isAiGuidedMode;
  const expressionVariantsForDisplay = expressionVariants.length
    ? expressionVariants
    : createFallbackExpressionVariants(standardEnglish);
  const selectedExpression =
    expressionVariantsForDisplay[
      Math.min(selectedExpressionIndex, expressionVariantsForDisplay.length - 1)
    ] || expressionVariantsForDisplay[0];
  const referenceResultVariantTexts = expressionVariantLabels.map((_, index) => {
    const variantText = expressionVariantsForDisplay[index]?.text?.trim() || "";
    const fallbackText =
      standardEnglish.trim() ||
      authoritativeEnglish.trim() ||
      (isLoadingExpressionVariants ? "Preparing a better expression..." : "");

    return variantText && variantText !== "This sentence is still being prepared."
      ? variantText
      : fallbackText;
  });
  const guidedResultSuggestion =
    guidedFollowupSuggestion.trim() || "我还想多说一点我的感受。";
  const freeConversationExpressionVariants = useMemo(() => {
    const standard =
      freeConversationResponse?.standard ||
      standardEnglish ||
      "It's very hot today.";
    const natural = freeConversationResponse?.natural || standard;
    const simple = freeConversationResponse?.simple || standard;

    return [
      { label: "推荐表达", text: natural },
      { label: "标准表达", text: standard },
      { label: "简单表达", text: simple },
    ];
  }, [freeConversationResponse, standardEnglish]);
  const selectedFreeConversationExpression =
    freeConversationExpressionVariants[
      Math.min(selectedExpressionIndex, freeConversationExpressionVariants.length - 1)
    ] || freeConversationExpressionVariants[0];
  const selectedFreeConversationExpressionSegments = useMemo(
    () =>
      splitSentenceByHighlightedExpressions(
        selectedFreeConversationExpression.text || "",
        highlightedExpressions
      ),
    [highlightedExpressions, selectedFreeConversationExpression.text]
  );
  const accountAvatarLabel = (
    accountName || accountEmail || "CL"
  )
    .slice(0, 2)
    .toUpperCase();
  const accountPanelTitle =
    accountPanelView === "subscription"
      ? accountCopy.subscriptionTitle
      : accountPanelView === "manageSubscription"
        ? accountCopy.manageSubscriptionTitle
      : accountPanelView === "referrals"
        ? referrals.title
      : accountPanelView === "helpCenter"
        ? accountCopy.helpCenterTitle
      : accountPanelView === "reportIssue"
        ? accountCopy.reportIssueTitle
      : accountPanelView === "aboutSpeakFlow"
        ? accountCopy.aboutSpeakFlowTitle
      : accountPanelView === "accountManagement"
        ? accountManagement.title
      : accountPanelView === "interfaceLanguage"
        ? accountHome.interfaceLanguage
      : accountPanelView === "notifications"
        ? accountHome.notifications
      : accountPanelView === "fontSize"
        ? accountCopy.fontSizeTitle
      : accountPanelView === "voice"
        ? voiceMenuItemLabel
      : accountCopy.accountTitle;
  const accountDisplayName =
    accountName ||
    (accountEmail ? accountEmail.split("@")[0] : accountCopy.fallbackUser);
  const selectedProPlanDetails = accountCopy.proPlans[selectedProPlan];
  const hasCanceledAtPeriodEnd =
    accountSubscriptionStatus === "cancels_at_period_end";
  const isAccountPro = hasProAccess(accountSubscriptionStatus);
  const isAccountAdmin = accountRole === "admin";
  const shouldShowFreePracticeUsageMeter =
    !isAccountPro &&
    hasLoadedAccountSession &&
    (!accountEmail || hasCheckedAccountSubscription) &&
    !isLoadingAccountSubscription;
  const shouldShowGuestAiProgress =
    isAiGuidedMode && hasLoadedAccountSession && !accountEmail;
  const accountSubscriptionLabel = isLoadingAccountSubscription
    ? language === "en"
      ? "Checking..."
      : "查询中"
    : isAccountPro
      ? language === "en"
        ? "Subscribed"
        : "已订阅"
      : accountCopy.notSubscribed;
  const accountSubscriptionBadgeClass = isAccountPro
    ? hasCanceledAtPeriodEnd
      ? "bg-[#fff2db] text-[#b45d05]"
      : "bg-[#e8fff5] text-[#14845f]"
    : "bg-[#efeaff] text-[#7460e8]";
  const accountCurrentPeriodEndDateLabel =
    isAccountPro && accountCurrentPeriodEnd
      ? (() => {
          const periodEndDate = new Date(accountCurrentPeriodEnd);
          if (Number.isNaN(periodEndDate.getTime())) return "";

          if (hasCanceledAtPeriodEnd) {
            return periodEndDate.toISOString().slice(0, 10);
          }

          const formattedDate = periodEndDate.toLocaleDateString(
            language === "en" ? "en-US" : "zh-CN",
            {
              day: "numeric",
              month: "short",
              year: "numeric",
            }
          );

          return formattedDate;
        })()
      : "";
  const accountCurrentPeriodEndLabel = accountCurrentPeriodEndDateLabel
    ? hasCanceledAtPeriodEnd
      ? language === "en"
        ? `Usable until ${accountCurrentPeriodEndDateLabel}`
        : `\u81f3 ${accountCurrentPeriodEndDateLabel} \u524d\u4ecd\u53ef\u4f7f\u7528`
      : language === "en"
        ? `Renews ${accountCurrentPeriodEndDateLabel}`
        : `\u5230\u671f\u65f6\u95f4 ${accountCurrentPeriodEndDateLabel}`
    : "";
  const referralBonusUntilLabel = referralState?.bonusProUntil
    ? (() => {
        const bonusDate = new Date(referralState.bonusProUntil || "");
        if (Number.isNaN(bonusDate.getTime())) return "";

        return bonusDate.toLocaleDateString(language === "en" ? "en-US" : "zh-CN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      })()
    : "";
  const referralCodeDisplayLabel = referralState?.referralCode
    ? referralState.referralCode.length > 24
      ? `${referralState.referralCode.slice(0, 12)}...${referralState.referralCode.slice(-6)}`
      : referralState.referralCode
    : "";
  const accountSubscriptionDisplayLabel = isLoadingAccountSubscription
    ? accountSubscriptionLabel
    : hasCanceledAtPeriodEnd
    ? language === "en"
      ? "Canceled"
      : "\u5df2\u53d6\u6d88"
    : accountSubscriptionLabel;
  const subscriptionManagementCopy =
    language === "en"
      ? {
          cancelDescription:
            "Cancel or manage billing securely in Stripe.",
          cancelSubscription: "Cancel Subscription",
          currentPlan: "Current plan",
          expiration: "Expiration",
          freePlan: "SpeakFlow Free",
          noExpiration: "No expiration date yet",
          opening: "Opening...",
          proPlan: "SpeakFlow Pro",
          restoreDescription:
            "Refresh Pro status for this login email.",
          restoring: "Restoring...",
        }
      : {
          cancelDescription:
            "\u5728 Stripe \u5b89\u5168\u9875\u9762\u53d6\u6d88\u8ba2\u9605\u6216\u7ba1\u7406\u4ed8\u6b3e\u3002",
          cancelSubscription: "\u53d6\u6d88\u8ba2\u9605",
          currentPlan: "\u5f53\u524d\u5957\u9910",
          expiration: "\u5230\u671f\u65f6\u95f4",
          freePlan: "SpeakFlow \u514d\u8d39\u7248",
          noExpiration: "\u6682\u65e0\u5230\u671f\u65f6\u95f4",
          opening: "\u6b63\u5728\u6253\u5f00...",
          proPlan: "SpeakFlow Pro",
          restoreDescription:
            "\u7528\u5f53\u524d\u767b\u5f55\u90ae\u7bb1\u5237\u65b0 Pro \u8ba2\u9605\u72b6\u6001\u3002",
          restoring: "\u6b63\u5728\u6062\u590d...",
        };
  const accountPlanName = isAccountPro
    ? subscriptionManagementCopy.proPlan
    : subscriptionManagementCopy.freePlan;

  const refreshFreePracticeUsageCount = useCallback(() => {
    setFreePracticeUsageCount(
      getFreePracticeUsage(activeFreePracticeScope).count
    );
  }, [activeFreePracticeScope]);

  useEffect(() => {
    refreshFreePracticeUsageCount();
  }, [refreshFreePracticeUsageCount]);
  const accountCurrentPeriodEndValue =
    accountCurrentPeriodEndDateLabel || subscriptionManagementCopy.noExpiration;
  const notificationPeriodEndLabel =
    accountCurrentPeriodEndDateLabel ||
    (language === "en"
      ? "the end of your current billing period"
      : "\u5f53\u524d\u8ba1\u8d39\u5468\u671f\u7ed3\u675f");
  const notificationInboxItems: NotificationInboxItem[] = [
    ...(hasCanceledAtPeriodEnd
      ? [
          {
            body:
              language === "en"
                ? `${notificationSettings.canceledBodyPrefix} ${notificationPeriodEndLabel}. ${notificationSettings.canceledBodySuffix}`
                : `${notificationSettings.canceledBodyPrefix} ${notificationPeriodEndLabel}\u3002${notificationSettings.canceledBodySuffix}`,
            id: "subscription-canceled",
            sender: notificationSettings.senderSystem,
            tag: notificationSettings.tagSubscription,
            time: notificationSettings.justNow,
            title: notificationSettings.canceledTitle,
            tone: "orange" as const,
            unread: true,
          },
        ]
      : isAccountPro
        ? [
            {
              body: notificationSettings.activeProBody,
              id: "subscription-active",
              sender: notificationSettings.senderSystem,
              tag: notificationSettings.tagSubscription,
              time: notificationSettings.justNow,
              title: notificationSettings.activeProTitle,
              tone: "green" as const,
            },
          ]
        : []),
    {
      body: notificationSettings.systemBody,
      id: "notification-inbox-ready",
      sender: notificationSettings.senderSystem,
      tag: notificationSettings.systemTag,
      time: notificationSettings.justNow,
      title: notificationSettings.systemTitle,
      tone: "purple",
    },
  ];
  const avatarEditorImage =
    avatarPreview || (accountImageFailed ? "" : accountImage);

  useEffect(() => {
    hasEnglishAttemptRef.current = hasEnglishAttempt;
  }, [hasEnglishAttempt]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedFontSize = window.localStorage.getItem(
      fontSizePreferenceStorageKey
    );

    if (savedFontSize && isFontSizePreference(savedFontSize)) {
      setFontSizePreference(savedFontSize);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    document.documentElement.dataset.speakflowFontSize = fontSizePreference;
    window.localStorage.setItem(fontSizePreferenceStorageKey, fontSizePreference);
  }, [fontSizePreference]);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }, [renderedInputValue]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    function loadVoices() {
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(isEnglishVoice);
      const sortedVoices = (englishVoices.length ? englishVoices : voices).sort(
        (a, b) => a.name.localeCompare(b.name)
      );
      const preferredVoice = pickPreferredEnglishVoice(sortedVoices);

      setAvailableVoices(sortedVoices);
      setSelectedVoiceURI((current) => {
        const savedVoiceURI = window.localStorage.getItem(selectedVoiceStorageKey);

        if (
          current &&
          sortedVoices.some(
            (voice) =>
              voice.voiceURI === current && !distortedVoiceNamePattern.test(voice.name)
          )
        ) {
          return current;
        }

        if (
          savedVoiceURI &&
          sortedVoices.some(
            (voice) =>
              voice.voiceURI === savedVoiceURI &&
              !distortedVoiceNamePattern.test(voice.name)
          )
        ) {
          return savedVoiceURI;
        }

        return preferredVoice?.voiceURI || "";
      });
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  useEffect(() => {
    if (!selectedVoiceURI || typeof window === "undefined") return;

    window.localStorage.setItem(selectedVoiceStorageKey, selectedVoiceURI);
  }, [selectedVoiceURI]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const session = (await response.json()) as SessionResponse;
        if (cancelled) return;

        const nextName = session.user?.name || "";
        const nextEmail = (
          session.user?.email ||
          session.user?.name ||
          ""
        )
          .trim()
          .toLowerCase();
        const nextRole = session.user?.role === "admin" ? "admin" : "user";
        const savedAvatar = window.localStorage.getItem(
          getAccountAvatarStorageKey(nextEmail || nextName)
        );

        setAccountName(nextName);
        setAccountEmail(nextEmail);
        setAccountRole(nextRole);
        setAccountImage(savedAvatar || getSessionAvatar(session.user));
        setAccountImageFailed(false);
      } catch {
        if (!cancelled) {
          setAccountName("");
          setAccountEmail("");
          setAccountRole("user");
          setAccountImage("");
        }
      } finally {
        if (!cancelled) {
          setHasLoadedAccountSession(true);
        }
      }
    }

    void loadAccountSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!accountEmail) return;

    void syncVocabularyWordsWithCloud();
  }, [accountEmail]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const flushVocabulary = () => {
      void flushVocabularyCloudSync();
    };
    const flushVocabularyWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        flushVocabulary();
      }
    };

    window.addEventListener("pagehide", flushVocabulary);
    document.addEventListener("visibilitychange", flushVocabularyWhenHidden);

    return () => {
      window.removeEventListener("pagehide", flushVocabulary);
      document.removeEventListener("visibilitychange", flushVocabularyWhenHidden);
    };
  }, []);

  const refreshAccountSubscription = useCallback(async () => {
    setHasCheckedAccountSubscription(false);
    setIsLoadingAccountSubscription(true);

    try {
      const response = await fetch(createAccountSubscriptionUrl(), {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Load subscription failed");
      }

      const data = (await response.json()) as AccountSubscriptionResponse;
      const nextSubscriptionStatus = normalizeSubscriptionStatus(
        data.subscriptionStatus
      );

      setAccountSubscriptionStatus(nextSubscriptionStatus);
      setAccountCurrentPeriodEnd(data.currentPeriodEnd || "");
      if (hasProAccess(nextSubscriptionStatus)) {
        setShowFreePracticeLimitModal(false);
      }

      return nextSubscriptionStatus;
    } catch {
      setAccountSubscriptionStatus("free");
      setAccountCurrentPeriodEnd("");
      return "free";
    } finally {
      setIsLoadingAccountSubscription(false);
      setHasCheckedAccountSubscription(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedAccountSession) return;

    if (!accountEmail) {
      setHasCheckedAccountSubscription(true);
      setAccountSubscriptionStatus("free");
      setAccountCurrentPeriodEnd("");
      return;
    }

    void refreshAccountSubscription();
  }, [accountEmail, hasLoadedAccountSession, refreshAccountSubscription]);

  const loadReferralState = useCallback(async () => {
    setIsLoadingReferralState(true);
    setReferralNotice("");

    try {
      const response = await fetch(createReferralAccountUrl(), {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Load referrals failed");
      }

      const data = (await response.json()) as ReferralAccountResponse;
      setReferralState(data);
    } catch {
      setReferralState({ available: false });
    } finally {
      setIsLoadingReferralState(false);
    }
  }, []);

  useEffect(() => {
    if (!showAccountMenu) return;

    void refreshAccountSubscription();
  }, [
    accountPanelView,
    accountSubscriptionRefreshKey,
    refreshAccountSubscription,
    showAccountMenu,
  ]);

  useEffect(() => {
    if (!showAccountMenu || accountPanelView !== "referrals") return;

    void loadReferralState();
  }, [accountPanelView, loadReferralState, showAccountMenu]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const shouldOpenAccount = searchParams.get("account") === "1";
    const shouldOpenPro = searchParams.get("pro") === "1";
    if (!shouldOpenAccount && !shouldOpenPro) return;
    if (!hasLoadedAccountSession) return;

    if (shouldOpenPro) {
      router.replace(
        accountEmail
          ? "/account?panel=subscription"
          : createLoginUrl("/account?panel=subscription")
      );
      return;
    }

    router.replace(accountEmail ? "/account" : "/menu");
  }, [accountEmail, hasLoadedAccountSession, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const shouldOpenPro = searchParams.get("pro") === "1";
    const shouldOpenAccount = searchParams.get("account") === "1";
    if (shouldOpenPro || shouldOpenAccount) return;

    const requestedSubmenu = searchParams.get("submenu");
    const requestedClassicCategory = searchParams.get("classicCategory");
    const requestedClassicSection = searchParams.get("classicSection");
    if (searchParams.get("menu") !== "1") return;

    const refreshTimers: number[] = [];
    setAccountPanelReturnTarget("local");
    setShowQuickPanel(true);
    if (requestedSubmenu === "expression") {
      setShowExpressionMenu(true);
      setShowClassicCoursePicker(false);
      setSelectedClassicCourseCategoryId("");
      setSelectedClassicCourseSectionId("");
      setClassicCourseSearchQuery("");
    } else if (requestedSubmenu === "classic") {
      const classicCategory = classicCourseCategories.find(
        (category) => category.id === requestedClassicCategory
      );
      const classicSection =
        classicCategory?.sections.find(
          (section) => section.id === requestedClassicSection
        ) || null;

      setShowExpressionMenu(false);
      setShowClassicCoursePicker(true);
      setSelectedClassicCourseCategoryId(classicCategory?.id || "");
      setSelectedClassicCourseSectionId(classicSection?.id || "");
      setClassicCourseSearchQuery("");
    }
    window.history.replaceState(null, "", "/speak-english");

    return () => {
      refreshTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    const wasQuickPanelOpen = previousShowQuickPanelRef.current;
    previousShowQuickPanelRef.current = showQuickPanel;

    if (wasQuickPanelOpen && !showQuickPanel) {
      setShowExpressionMenu(false);
      setShowClassicCoursePicker(false);
      resetClassicCoursePicker();
      return;
    }
  }, [showQuickPanel]);

  useEffect(() => {
    function clearLifecycleSpeechTimers() {
      const timerRefs = [
        speechSilenceTimerRef,
        speechNoInputTimerRef,
        speechStopFallbackTimerRef,
        speechMaxTimerRef,
      ];

      timerRefs.forEach((timerRef) => {
        if (!timerRef.current) return;

        clearTimeout(timerRef.current);
        timerRef.current = null;
      });
    }

    function resetStaleRecognition() {
      if (!recognitionRef.current) return;

      shouldCommitSpeechRef.current = false;
      recognitionRef.current.abort?.();
      recognitionRef.current = null;
      clearLifecycleSpeechTimers();
      speechBufferRef.current = "";
      setLiveTranscript("");
      setIsListening(false);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        resetStaleRecognition();
      }
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        resetStaleRecognition();
      }
    }

    window.addEventListener("pagehide", resetStaleRecognition);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      shouldCommitSpeechRef.current = false;
      clearLifecycleSpeechTimers();
      recognitionRef.current?.abort?.();
      window.removeEventListener("pagehide", resetStaleRecognition);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function focusInput() {
    textareaRef.current?.focus();
  }

  function resetClassicCoursePicker() {
    setSelectedClassicCourseCategoryId("");
    setSelectedClassicCourseSectionId("");
    setClassicCourseSearchQuery("");
  }

  function showFreePracticeLimit() {
    refreshFreePracticeUsageCount();
    setShowFreePracticeLimitModal(true);
  }

  function showFreePracticeLimitAfterCompletion() {
    refreshFreePracticeUsageCount();

    if (!accountEmail) {
      setShowFreePracticeLimitModal(true);
      return;
    }

    void refreshAccountSubscription().then((nextSubscriptionStatus) => {
      if (hasProAccess(nextSubscriptionStatus)) {
        setShowFreePracticeLimitModal(false);
        return;
      }

      setShowFreePracticeLimitModal(true);
    });
  }

  function openProFromFreePracticeLimit() {
    setShowFreePracticeLimitModal(false);

    if (!accountEmail) {
      router.push(createLoginUrl(subscriptionCallbackUrl));
      return;
    }

    setShowQuickPanel(false);
    setShowAccountMenu(false);
    setAccountPanelView("menu");
    setShowAvatarEditor(false);
    setShowExpressionMenu(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
    router.push("/account?panel=subscription");
  }

  function openLoginFromFreePracticeLimit() {
    setShowFreePracticeLimitModal(false);
    router.push(createLoginUrl("/start"));
  }

  function openRegisterFromFreePracticeLimit() {
    setShowFreePracticeLimitModal(false);
    router.push("/register");
  }

  async function ensureFreePracticeAvailable(
    completionId = freePracticeRoundIdRef.current
  ) {
    if (hasFreePracticeCompletion(activeFreePracticeScope, completionId)) {
      return true;
    }

    if (!isFreePracticeLimitReached(activeFreePracticeScope)) return true;

    const nextSubscriptionStatus = await refreshAccountSubscription();

    if (hasProAccess(nextSubscriptionStatus)) {
      setShowFreePracticeLimitModal(false);
      return true;
    }

    showFreePracticeLimit();
    return false;
  }

  function markFreePracticeRoundCompleted() {
    if (hasProAccess(accountSubscriptionStatus)) return;

    const result = recordFreePracticeCompletion(
      activeFreePracticeScope,
      freePracticeRoundIdRef.current
    );
    setFreePracticeUsageCount(result.count);

    if (result.didRecord && result.limitReached) {
      showFreePracticeLimitAfterCompletion();
    }
  }

  function recordAiGuidedBackendProgress(payload: {
    completionId?: string;
    countExpression?: boolean;
    step?: "native" | "english" | "suggestions" | "follow";
  }) {
    if (typeof window === "undefined") return;

    void fetch("/api/ai-guided-expression/progress", {
      body: JSON.stringify(payload),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => {});
  }

  function requestAccountDeletion() {
    setShowAvatarEditor(false);
    setSupportIssueType("account_management");
    setSupportContactEmail((current) => current || accountEmail);
    setSupportRelatedPage(accountManagement.feedbackPageName);
    setSupportMessage(accountManagement.deleteMessage);
    setSupportNotice("");
    setAccountPanelView("reportIssue");
  }

  function handleAccountMenuAction(action?: AccountMenuAction) {
    if (action === "adminDashboard") {
      window.location.href = "/admin";
      return;
    }

    if (action === "subscription") {
      setAccountPanelView("subscription");
      return;
    }

    if (action === "manageSubscription") {
      setBillingPortalNotice("");
      setRestorePurchaseNotice("");
      setShowAvatarEditor(false);
      setAccountPanelView("manageSubscription");
      return;
    }

    if (action === "referrals") {
      setShowAvatarEditor(false);
      setReferralNotice("");
      setAccountPanelView("referrals");
      return;
    }

    if (action === "helpCenter") {
      setShowAvatarEditor(false);
      setAccountPanelView("helpCenter");
      return;
    }

    if (action === "reportIssue") {
      setShowAvatarEditor(false);
      setSupportNotice("");
      setSupportContactEmail((current) => current || accountEmail);
      setAccountPanelView("reportIssue");
      return;
    }

    if (action === "aboutSpeakFlow") {
      setShowAvatarEditor(false);
      setAccountPanelView("aboutSpeakFlow");
      return;
    }

    if (action === "accountManagement") {
      setShowAvatarEditor(false);
      setAccountPanelView("accountManagement");
      return;
    }

    if (action === "interfaceLanguage") {
      setShowAvatarEditor(false);
      setAccountPanelView("interfaceLanguage");
      return;
    }

    if (action === "fontSize") {
      setShowAvatarEditor(false);
      setAccountPanelView("fontSize");
      return;
    }

    if (action === "notifications") {
      setShowAvatarEditor(false);
      window.location.href = "/notifications";
      return;
    }

    if (action === "voice") {
      setShowAvatarEditor(false);
      setAccountPanelView("voice");
      return;
    }

    if (action === "terms") {
      window.location.href = "/terms";
      return;
    }

    if (action === "privacy") {
      window.location.href = "/privacy";
    }
  }

  async function copyReferralInviteLink() {
    const inviteLink = referralState?.inviteLink || "";
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setReferralNotice(referrals.copied);
    } catch {
      setReferralNotice(inviteLink);
    }
  }

  async function openBillingPortal() {
    if (isOpeningBillingPortal) return;

    setIsOpeningBillingPortal(true);
    setBillingPortalNotice("");
    let didRedirect = false;

    try {
      const response = await fetch(`/api/stripe/portal?t=${Date.now()}`, {
        cache: "no-store",
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        url?: unknown;
      };
      const url = typeof data.url === "string" ? data.url : "";

      if (!response.ok || !url) {
        const errorMessage =
          response.status === 400
            ? accountCopy.noBillingPortal
            : typeof data.error === "string" && data.error.trim()
              ? data.error
              : accountCopy.noBillingPortal;
        throw new Error(errorMessage);
      }

      didRedirect = true;
      window.location.href = url;
    } catch (error) {
      setBillingPortalNotice(
        error instanceof Error && error.message
          ? error.message
          : accountCopy.noBillingPortal
      );
    } finally {
      if (!didRedirect) {
        setIsOpeningBillingPortal(false);
      }
    }
  }

  async function restoreAccountPurchases() {
    if (isRestoringPurchases) return;

    setIsRestoringPurchases(true);
    setRestorePurchaseNotice("");

    try {
      const response = await fetch(`/api/stripe/restore?t=${Date.now()}`, {
        cache: "no-store",
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: unknown;
      };

      if (!response.ok) {
        const errorMessage =
          "error" in data && typeof data.error === "string" && data.error.trim()
            ? data.error
            : accountCopy.restorePurchaseFailed;
        throw new Error(errorMessage);
      }

      const nextSubscriptionStatus = await refreshAccountSubscription();

      if (hasProAccess(nextSubscriptionStatus)) {
        setShowFreePracticeLimitModal(false);
        setRestorePurchaseNotice(accountCopy.restorePurchaseSuccess);
      } else {
        setRestorePurchaseNotice(accountCopy.restorePurchaseEmpty);
      }
    } catch (error) {
      setRestorePurchaseNotice(
        error instanceof Error && error.message
          ? error.message
          : accountCopy.restorePurchaseFailed
      );
    } finally {
      setIsRestoringPurchases(false);
    }
  }

  async function submitSupportFeedback() {
    if (isSubmittingSupportFeedback) return;

    const trimmedMessage = supportMessage.trim();

    if (trimmedMessage.length < 6) {
      setSupportNotice(supportFeedback.required);
      return;
    }

    setIsSubmittingSupportFeedback(true);
    setSupportNotice("");

    try {
      const response = await fetch("/api/support/feedback", {
        body: JSON.stringify({
          contactEmail: supportContactEmail,
          issueType: supportIssueType,
          language,
          message: trimmedMessage,
          page: supportRelatedPage,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: unknown;
      };

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : supportFeedback.error
        );
      }

      setSupportNotice(supportFeedback.success);
      setSupportMessage("");
      setSupportRelatedPage("");
    } catch (error) {
      setSupportNotice(
        error instanceof Error && error.message
          ? error.message
          : supportFeedback.error
      );
    } finally {
      setIsSubmittingSupportFeedback(false);
    }
  }

  async function startStripeCheckout(selectedPlan: ProPlan = selectedProPlan) {
    if (isStartingCheckout) return;

    if (!accountEmail) {
      router.push(createLoginUrl(subscriptionCallbackUrl));
      return;
    }

    setIsStartingCheckout(true);
    setCheckoutError("");

    try {
      const response = await fetch(`/api/stripe/checkout?t=${Date.now()}`, {
        body: JSON.stringify({ plan: selectedPlan }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        url?: unknown;
      };
      const url = typeof data.url === "string" ? data.url : "";

      if (response.status === 401) {
        router.push(createLoginUrl(subscriptionCallbackUrl));
        return;
      }

      if (!response.ok || !url) {
        const errorMessage =
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : "Unable to start checkout. Please try again.";
        throw new Error(errorMessage);
      }

      window.location.href = url;
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : "Unable to start checkout. Please try again.";
      setCheckoutError("Unable to start checkout. Please try again.");
      window.alert(errorMessage);
      setIsStartingCheckout(false);
    }
  }

  function openAvatarEditor() {
    setAvatarPreview(accountImageFailed ? "" : accountImage);
    setAvatarEditorNotice("");
    setShowAvatarEditor(true);
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarEditorNotice(accountCopy.invalidImage);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
        setAvatarEditorNotice("");
      }
    };
    reader.onerror = () => {
      setAvatarEditorNotice(accountCopy.imageReadFailed);
    };
    reader.readAsDataURL(file);
  }

  function saveAvatarChange() {
    if (!avatarPreview) {
      setAvatarEditorNotice(accountCopy.chooseAvatarFirst);
      return;
    }

    try {
      window.localStorage.setItem(
        getAccountAvatarStorageKey(accountEmail || accountName),
        avatarPreview
      );
    } catch {
      setAvatarEditorNotice(accountCopy.saveAvatarFailed);
      return;
    }

    setAccountImage(avatarPreview);
    setAccountImageFailed(false);
    setShowAvatarEditor(false);
    setAvatarEditorNotice("");
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = "";
    }
  }

  function appendText(value: string) {
    setInputText((current) => `${current}${value}`);

    if (typeof window !== "undefined") {
      window.setTimeout(focusInput, 0);
    }
  }

  function deleteLastCharacter() {
    if (keyboardMode === "zh" && composingPinyin) {
      setComposingPinyin((current) => current.slice(0, -1));
      return;
    }

    setInputText((current) => Array.from(current).slice(0, -1).join(""));
  }

  function commitChineseCandidate(candidate?: string) {
    const value = candidate ?? chineseCandidates[0] ?? composingPinyin;
    if (!value) return;

    appendText(value);
    setComposingPinyin("");
  }

  function switchKeyboardMode(mode?: KeyboardMode) {
    setKeyboardMode((current) => {
      if (mode) return mode;
      if (current === "zh") return "en";
      if (current === "en") return "handwriting";
      if (current === "handwriting") return "zh";
      return "zh";
    });
    setComposingPinyin("");
    setShowEmojiPanel(false);
    setShowQuickPanel(false);
    setShowExpressionMenu(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
    focusInput();
  }

  function getRecognitionConstructor() {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function clearTimer(timerRef: MutableRefObject<number | null>) {
    if (!timerRef.current) return;

    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function clearSpeechSilenceTimer() {
    clearTimer(speechSilenceTimerRef);
  }

  function clearAllSpeechTimers() {
    clearTimer(speechSilenceTimerRef);
    clearTimer(speechNoInputTimerRef);
    clearTimer(speechStopFallbackTimerRef);
    clearTimer(speechMaxTimerRef);
  }

  function resetAuthoritativeEnglish() {
    authoritativeEnglishRequestKeyRef.current = "";
    setAuthoritativeEnglish("");
  }

  function prepareNextNativeRound(roundId = createFreePracticeRoundId()) {
    freePracticeRoundIdRef.current = roundId;
    setPrimingPracticeStage(null);
    setPracticeStage("native");
    setNativeSpeech("");
    setIsNativeSpeechConfirmed(false);
    setIsRecognizingNativeSpeech(false);
    resetAuthoritativeEnglish();
    setHasNativeSpeech(false);
    setHasEnglishAttempt(false);
    setStandardEnglish("");
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setIsLoadingExpressionVariants(false);
    setHighlightedExpressions([]);
    setVocabularyNotice("");
    resetGuidedFollowupState();
    resetFreeConversationState();
  }

  function prepareGuidedSuggestedEnglishRound(
    suggestion: string,
    roundId = createFreePracticeRoundId()
  ) {
    freePracticeRoundIdRef.current = roundId;
    setPrimingPracticeStage("english");
    setPracticeStage("english");
    setNativeSpeech(suggestion);
    setIsNativeSpeechConfirmed(true);
    resetAuthoritativeEnglish();
    setHasNativeSpeech(true);
    setHasEnglishAttempt(false);
    setStandardEnglish("");
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setIsLoadingExpressionVariants(false);
    setHighlightedExpressions([]);
    setVocabularyNotice("");
    resetGuidedFollowupState();
    resetFreeConversationState();
  }

  function prepareFreeConversationAnswerRound(
    roundId = createFreePracticeRoundId()
  ) {
    const activeQuestion = freeConversationResponse
      ? {
          english: freeConversationResponse.questionEnglish,
          hintChinese:
            freeConversationResponse.hintChinese ||
            freeConversationResponse.questionChinese,
        }
      : freeConversationQuestionPrompt;

    freePracticeRoundIdRef.current = roundId;
    setPrimingPracticeStage("english");
    setPracticeStage("english");
    setNativeSpeech("");
    setIsNativeSpeechConfirmed(false);
    resetAuthoritativeEnglish();
    setHasNativeSpeech(false);
    setHasEnglishAttempt(false);
    setStandardEnglish("");
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setIsLoadingExpressionVariants(false);
    setHighlightedExpressions([]);
    setVocabularyNotice("");
    resetGuidedFollowupState();
    resetFreeConversationState({ keepHint: true, keepQuestionPrompt: true });
    setFreeConversationQuestionPrompt(activeQuestion);
  }

  function resetGuidedFollowupState() {
    guidedFollowupRequestKeyRef.current = "";
    setGuidedFollowupSuggestion("");
    setIsLoadingGuidedFollowup(false);
    setGuidedFollowupRefreshKey(0);
  }

  function resetFreeConversationState(
    options: { keepHint?: boolean; keepQuestionPrompt?: boolean } = {}
  ) {
    freeConversationRequestKeyRef.current = "";
    freeConversationFetchRequestKeyRef.current = "";
    freeConversationPrefetchRef.current = null;
    setFreeConversationResponse(null);
    setIsLoadingFreeConversation(false);
    if (!options.keepQuestionPrompt) {
      setFreeConversationQuestionPrompt(null);
    }
    if (!options.keepHint) {
      setIsFreeConversationHintVisible(false);
    }
  }

  function returnToFreeLearningHome() {
    setTrainingGroundMode("default");
    guidedConversationTurnsRef.current = [];
    prepareNextNativeRound();
    setInputText("");
    setComposingPinyin("");
    setLiveTranscript("");
    setKeyboardMode("zh");
    setMessage(defaultFreeLearningPrompt);
    setShowQuickPanel(false);
    setShowExpressionMenu(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
  }

  function togglePracticeMenu() {
    if (isListening) {
      cancelRecognition();
    }

    setPrimingPracticeStage(null);
    setShowAccountMenu(false);
    setAccountPanelView("menu");
    setShowAvatarEditor(false);

    if (showQuickPanel) {
      returnToFreeLearningHome();
      return;
    }

    setShowQuickPanel(true);
  }

  function openLoggedInHomePage() {
    if (isListening) {
      cancelRecognition();
    }

    setPrimingPracticeStage(null);
    setShowAccountMenu(false);
    setAccountPanelView("menu");
    setAccountPanelReturnTarget("local");
    setShowAvatarEditor(false);
    setShowQuickPanel(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
    router.push("/start");
  }

  function returnToStandaloneAccountPage() {
    setShowAccountMenu(false);
    setAccountPanelView("menu");
    setAccountPanelReturnTarget("local");
    setShowAvatarEditor(false);
    router.push("/account");
  }

  function closeAccountPanel() {
    if (accountPanelReturnTarget === "account") {
      returnToStandaloneAccountPage();
      return;
    }

    setShowAccountMenu(false);
    setAccountPanelView("menu");
    setShowAvatarEditor(false);
  }

  function returnFromAccountPanel() {
    setShowAvatarEditor(false);

    if (accountPanelReturnTarget === "account") {
      returnToStandaloneAccountPage();
      return;
    }

    setAccountPanelView("menu");
  }

  function returnFromSubscriptionPanel() {
    if (accountPanelReturnTarget === "account") {
      returnToStandaloneAccountPage();
      return;
    }

    openLoggedInHomePage();
  }

  function openAccountPage() {
    if (isListening) {
      cancelRecognition();
    }

    setPrimingPracticeStage(null);
    setShowQuickPanel(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
    setShowAccountMenu(false);
    setAccountPanelView("menu");
    setAccountPanelReturnTarget("local");
    setShowAvatarEditor(false);
    router.push(accountEmail ? "/account" : "/menu");
  }

  function openReferenceAccountMenu() {
    if (isListening) {
      cancelRecognition();
    }

    setPrimingPracticeStage(null);
    setShowQuickPanel(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
    setShowAccountMenu(false);
    setAccountPanelView("menu");
    setAccountPanelReturnTarget("local");
    setShowAvatarEditor(false);
    router.push(accountEmail ? "/account" : "/menu");
  }

  function openTrainingGroundMode() {
    setTrainingGroundMode("guided");
    aiGuidedFollowPracticePendingRef.current = false;
    guidedConversationTurnsRef.current = [];
    resetGuidedFollowupState();
    prepareNextNativeRound();
    setInputText("");
    setComposingPinyin("");
    setLiveTranscript("");
    setKeyboardMode("zh");
    setMessage(defaultFreeLearningPrompt);
    setShowQuickPanel(false);
    setShowExpressionMenu(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
  }

  function startAiGuidedStepTwoNativeRound() {
    if (isListening) {
      cancelRecognition();
    }

    openTrainingGroundMode();
    setPrimingPracticeStage("native");

    if (typeof window === "undefined") return;

    window.setTimeout(() => {
      void startRecognition("native");
    }, 0);
  }

  function saveFreeStudyRouteState(nextUserEnglishText = message) {
    if (typeof window === "undefined") return;

    const savedNativeSpeech =
      readFreeStudyRouteState()?.nativeSpeech?.trim() || "";

    window.sessionStorage.setItem(
      freeStudyRouteStateStorageKey,
      JSON.stringify({
        nativeSpeech: nativeSpeech.trim() || savedNativeSpeech,
        userEnglishText: nextUserEnglishText.trim(),
      } satisfies FreeStudyRouteState)
    );
  }

  function startFreeStudyStepFourEnglishRound(confirmedSpeech: string) {
    const normalizedSpeech = confirmedSpeech.trim();
    if (!normalizedSpeech) return;

    if (isListening) {
      cancelRecognition();
    }

    freePracticeRoundIdRef.current = createFreePracticeRoundId();
    setTrainingGroundMode("default");
    guidedConversationTurnsRef.current = [];
    setPrimingPracticeStage("english");
    setPracticeStage("english");
    setNativeSpeech(normalizedSpeech);
    setMessage(normalizedSpeech);
    setIsNativeSpeechConfirmed(true);
    setIsRecognizingNativeSpeech(false);
    resetAuthoritativeEnglish();
    setHasNativeSpeech(true);
    setHasEnglishAttempt(false);
    setStandardEnglish("");
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setIsLoadingExpressionVariants(false);
    setHighlightedExpressions([]);
    setVocabularyNotice("");
    resetGuidedFollowupState();
    resetFreeConversationState();
    setInputText("");
    setComposingPinyin("");
    setLiveTranscript("");
    setKeyboardMode("en");
    setShowQuickPanel(false);
    setShowExpressionMenu(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();

    if (typeof window === "undefined") return;

    window.setTimeout(() => {
      void startRecognition("english");
    }, 0);
  }

  function startAiGuidedStepFourEnglishRound(confirmedSpeech: string) {
    const normalizedSpeech = confirmedSpeech.trim();
    if (!normalizedSpeech) return;

    if (isListening) {
      cancelRecognition();
    }

    freePracticeRoundIdRef.current = createFreePracticeRoundId();
    setTrainingGroundMode("guided");
    setPrimingPracticeStage("english");
    setPracticeStage("english");
    setNativeSpeech(normalizedSpeech);
    setMessage(normalizedSpeech);
    setIsNativeSpeechConfirmed(true);
    setIsRecognizingNativeSpeech(false);
    resetAuthoritativeEnglish();
    setHasNativeSpeech(true);
    setHasEnglishAttempt(false);
    setStandardEnglish("");
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setIsLoadingExpressionVariants(false);
    setHighlightedExpressions([]);
    setVocabularyNotice("");
    resetGuidedFollowupState();
    resetFreeConversationState();
    setInputText("");
    setComposingPinyin("");
    setLiveTranscript("");
    setKeyboardMode("en");
    setShowQuickPanel(false);
    setShowExpressionMenu(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();

    if (typeof window === "undefined") return;

    window.setTimeout(() => {
      void startRecognition("english");
    }, 0);
  }

  function openAiGuidedExpressionStepOne() {
    if (isListening) {
      cancelRecognition();
    }

    setPrimingPracticeStage(null);
    setShowQuickPanel(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
    router.push("/ai-guided-expression/step-1");
  }

  function openFreeStudyStepFourForRetry() {
    const confirmedSpeech = nativeSpeech.trim();
    if (!confirmedSpeech) return;

    saveFreeStudyRouteState(message);
    handledStepRouteRef.current = `/free-study/step-4:${confirmedSpeech}`;
    router.push("/free-study/step-4");
    startFreeStudyStepFourEnglishRound(confirmedSpeech);
  }

  function openAiGuidedStepFourForRetry() {
    const confirmedSpeech = nativeSpeech.trim();
    if (!confirmedSpeech) return;

    aiGuidedFollowPracticePendingRef.current = true;
    saveFreeStudyRouteState(message);
    handledStepRouteRef.current = `/ai-guided-expression/step-4:${confirmedSpeech}`;
    router.push("/ai-guided-expression/step-4");
    startAiGuidedStepFourEnglishRound(confirmedSpeech);
  }

  function startAiGuidedSuggestedRound() {
    const suggestedSpeech = guidedResultSuggestion.trim();
    if (!suggestedSpeech || isLoadingGuidedFollowup) return;

    aiGuidedFollowPracticePendingRef.current = true;
    saveFreeStudyRouteState("");
    handledStepRouteRef.current = `/ai-guided-expression/step-4:${suggestedSpeech}`;
    router.push("/ai-guided-expression/step-4");
    startAiGuidedStepFourEnglishRound(suggestedSpeech);
  }

  function startFreeStudyStepTwoChineseRound(
    options: { navigate?: boolean } = {}
  ) {
    if (isListening) {
      cancelRecognition();
    }

    setTrainingGroundMode("default");
    guidedConversationTurnsRef.current = [];
    prepareNextNativeRound();
    setPrimingPracticeStage("native");
    setInputText("");
    setComposingPinyin("");
    setLiveTranscript("");
    setKeyboardMode("zh");
    setMessage("正在听你说话…");
    setShowQuickPanel(false);
    setShowExpressionMenu(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();

    if (typeof window === "undefined") return;

    if (options.navigate !== false) {
      handledStepRouteRef.current = "/free-study/step-2";
      router.push("/free-study/step-2");
    }

    window.setTimeout(() => {
      void startRecognition("native");
    }, 0);
  }

  function openFreeStudyStepTwoForNextChinese() {
    startFreeStudyStepTwoChineseRound();
  }

  function finishRecognition(finalTranscript = speechBufferRef.current.trim()) {
    const completedStage = activeRecognitionStageRef.current;

    if (shouldCommitSpeechRef.current && finalTranscript) {
      setMessage(finalTranscript);
      if (completedStage === "native") {
        resetGuidedFollowupState();
        if (isFreeConversationMode) {
          resetFreeConversationState();
        }
        setNativeSpeech(finalTranscript);
        setIsNativeSpeechConfirmed(false);
        resetAuthoritativeEnglish();
        setStandardEnglish("");
        setExpressionVariants([]);
        setSelectedExpressionIndex(0);
        setHasEnglishAttempt(false);
        setHasNativeSpeech(true);
        setPracticeStage("native");
        if (isAiGuidedMode) {
          recordAiGuidedBackendProgress({ step: "native" });
        }
      } else {
        saveFreeStudyRouteState(finalTranscript);
        setHasEnglishAttempt(true);
        if (isAiGuidedMode) {
          const guidedStep = aiGuidedFollowPracticePendingRef.current
            ? "follow"
            : "english";

          recordAiGuidedBackendProgress({
            completionId: freePracticeRoundIdRef.current,
            countExpression: true,
            step: guidedStep,
          });
          aiGuidedFollowPracticePendingRef.current = false;
        }
        markFreePracticeRoundCompleted();
      }
    }

    clearAllSpeechTimers();
    speechBufferRef.current = "";
    shouldCommitSpeechRef.current = false;
    recognitionRef.current = null;
    setLiveTranscript("");
    setIsListening(false);
    setPrimingPracticeStage(null);
    setIsRecognizingNativeSpeech(false);
  }

  function cancelRecognition(options: { message?: string } = {}) {
    shouldCommitSpeechRef.current = false;
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    clearAllSpeechTimers();
    speechBufferRef.current = "";
    setLiveTranscript("");
    setIsListening(false);
    setPrimingPracticeStage(null);
    setIsRecognizingNativeSpeech(false);
    if (options.message) {
      setMessage(options.message);
    }
  }

  function handlePrimaryPracticeAction() {
    if (isListening) {
      stopRecognition({ forceUiReset: true });
      return;
    }

    if (showNativeConfirmationPrompt) {
      return;
    }

    if (isFreeConversationMode && hasEnglishAttempt && isLoadingFreeConversation) {
      return;
    }

    void startRecognition();
  }

  function confirmNativeSpeech() {
    const confirmedSpeech = nativeSpeech.trim();
    if (!confirmedSpeech) return;

    setNativeSpeech(confirmedSpeech);
    setMessage(confirmedSpeech);
    setIsNativeSpeechConfirmed(true);
    setPrimingPracticeStage("english");
    setPracticeStage("english");
    setStandardEnglish("");
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setHighlightedExpressions([]);
    setVocabularyNotice("");
    resetGuidedFollowupState();
    resetAuthoritativeEnglish();
    void startRecognition("english");
  }

  function confirmFreeStudyNativeSpeech() {
    const confirmedSpeech = nativeSpeech.trim();
    if (!confirmedSpeech) return;

    saveFreeStudyRouteState("");
    handledStepRouteRef.current = `/free-study/step-4:${confirmedSpeech}`;
    router.push("/free-study/step-4");
    startFreeStudyStepFourEnglishRound(confirmedSpeech);
  }

  function confirmAiGuidedNativeSpeech() {
    const confirmedSpeech = nativeSpeech.trim();
    if (!confirmedSpeech) return;

    aiGuidedFollowPracticePendingRef.current = false;
    recordAiGuidedBackendProgress({ step: "native" });
    saveFreeStudyRouteState("");
    handledStepRouteRef.current = `/ai-guided-expression/step-4:${confirmedSpeech}`;
    router.push("/ai-guided-expression/step-4");
    startAiGuidedStepFourEnglishRound(confirmedSpeech);
  }

  function retryEnglishSpeech() {
    if (!nativeSpeech.trim()) return;

    setPracticeStage("english");
    setPrimingPracticeStage("english");
    setHasEnglishAttempt(false);
    setStandardEnglish("");
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setHighlightedExpressions([]);
    setVocabularyNotice("");
    resetAuthoritativeEnglish();
    resetGuidedFollowupState();

    if (typeof window === "undefined") return;

    window.setTimeout(() => {
      void startRecognition("english");
    }, 0);
  }

  function requestAnotherGuidedFollowup() {
    guidedFollowupRequestKeyRef.current = "";
    setGuidedFollowupSuggestion("");
    setGuidedFollowupRefreshKey((current) => current + 1);
  }

  function updateNativeSpeechDraft(value: string) {
    setNativeSpeech(value);
    setMessage(value);
    setIsNativeSpeechConfirmed(false);
    setStandardEnglish("");
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setHighlightedExpressions([]);
    setVocabularyNotice("");
    resetGuidedFollowupState();
    resetAuthoritativeEnglish();
  }

  function retryNativeSpeech() {
    prepareNextNativeRound();
    setPrimingPracticeStage("native");
    if (typeof window === "undefined") return;

    window.setTimeout(() => {
      void startRecognition("native");
    }, 0);
  }

  useEffect(() => {
    if (pathname === "/ai-guided-expression/step-1") {
      if (handledStepRouteRef.current === pathname) return;

      handledStepRouteRef.current = pathname;
      openTrainingGroundMode();
      return;
    }

    if (pathname === "/ai-guided-expression/step-2") {
      if (handledStepRouteRef.current === pathname) return;

      handledStepRouteRef.current = pathname;
      startAiGuidedStepTwoNativeRound();
      return;
    }

    if (pathname === "/ai-guided-expression/step-4") {
      const savedRouteState = readFreeStudyRouteState();
      const confirmedSpeech = (
        savedRouteState?.nativeSpeech ||
        nativeSpeech
      ).trim();

      if (!confirmedSpeech) return;

      const routeKey = `${pathname}:${confirmedSpeech}`;
      if (handledStepRouteRef.current === routeKey) return;

      handledStepRouteRef.current = routeKey;
      startAiGuidedStepFourEnglishRound(confirmedSpeech);
      return;
    }

    if (pathname === "/free-study/step-1") {
      if (handledStepRouteRef.current === pathname) return;

      handledStepRouteRef.current = pathname;
      returnToFreeLearningHome();
      return;
    }

    if (pathname === "/free-study/step-2") {
      if (handledStepRouteRef.current === pathname) return;

      handledStepRouteRef.current = pathname;
      startFreeStudyStepTwoChineseRound({ navigate: false });
      return;
    }

    if (pathname !== "/free-study/step-4") return;

    const savedRouteState = readFreeStudyRouteState();
    const confirmedSpeech = (
      savedRouteState?.nativeSpeech ||
      nativeSpeech
    ).trim();

    if (!confirmedSpeech) return;

    const routeKey = `${pathname}:${confirmedSpeech}`;
    if (handledStepRouteRef.current === routeKey) return;

    handledStepRouteRef.current = routeKey;
    startFreeStudyStepFourEnglishRound(confirmedSpeech);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function handleComposerPracticeAction() {
    if (isListening) {
      stopRecognition({ forceUiReset: true });
      return;
    }

    void startRecognition();
  }

  async function startRecognition(forcedPracticeStage?: PracticeStage) {
    if (isListening || recognitionRef.current) return;

    const RecognitionConstructor = getRecognitionConstructor();

    if (!RecognitionConstructor) {
      setPrimingPracticeStage(null);
      setMessage("Speech recognition is not available in this browser");
      return;
    }

    clearAllSpeechTimers();
    speechBufferRef.current = "";
    shouldCommitSpeechRef.current = true;
    const isStartingFreeConversationAnswerRound =
      !forcedPracticeStage && isFreeConversationMode && hasEnglishAttempt;
    const isStartingGuidedSuggestedEnglishRound =
      !forcedPracticeStage && isAiGuidedMode && Boolean(standardEnglish);
    const guidedSuggestedChinese = isStartingGuidedSuggestedEnglishRound
      ? guidedFollowupSuggestion.trim() || "我还想多说一点我的感受。"
      : "";
    const isStartingNextNativeRound =
      !forcedPracticeStage &&
      Boolean(standardEnglish) &&
      !isStartingGuidedSuggestedEnglishRound &&
      !isStartingFreeConversationAnswerRound;
    const nextPracticeStage: PracticeStage =
      forcedPracticeStage ||
      (isStartingFreeConversationAnswerRound
        ? "english"
        : isStartingGuidedSuggestedEnglishRound
        ? "english"
        : isStartingNextNativeRound
          ? "native"
          : practiceStage);
    const shouldCreateNewPracticeRound =
      isStartingGuidedSuggestedEnglishRound ||
      isStartingFreeConversationAnswerRound ||
      isStartingNextNativeRound;
    const guardedPracticeRoundId = shouldCreateNewPracticeRound
      ? createFreePracticeRoundId()
      : freePracticeRoundIdRef.current;
    const shouldGuardFreePractice =
      nextPracticeStage === "native" ||
      isStartingGuidedSuggestedEnglishRound ||
      isStartingFreeConversationAnswerRound ||
      (nextPracticeStage === "english" &&
        !hasEnglishAttempt &&
        Boolean(nativeSpeech.trim()));

    setPrimingPracticeStage(nextPracticeStage);

    if (
      shouldGuardFreePractice &&
      !(await ensureFreePracticeAvailable(guardedPracticeRoundId))
    ) {
      shouldCommitSpeechRef.current = false;
      setPrimingPracticeStage(null);
      return;
    }

    if (isStartingGuidedSuggestedEnglishRound) {
      prepareGuidedSuggestedEnglishRound(
        guidedSuggestedChinese,
        guardedPracticeRoundId
      );
    } else if (isStartingFreeConversationAnswerRound) {
      prepareFreeConversationAnswerRound(guardedPracticeRoundId);
    } else if (isStartingNextNativeRound) {
      prepareNextNativeRound(guardedPracticeRoundId);
    }

    const recognition = new RecognitionConstructor();
    activeRecognitionStageRef.current = nextPracticeStage;
    recognition.lang = nextPracticeStage === "english" ? "en-US" : currentMode.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    const activeSpeechSilenceDelayMs = getSpeechSilenceDelay(nextPracticeStage);
    setInputText("");
    setComposingPinyin("");
    setLiveTranscript("");
    setIsRecognizingNativeSpeech(false);
    setIsListening(true);
    setPrimingPracticeStage(null);
    if (nextPracticeStage === "native") {
      setMessage("正在听你说话…");
    }

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join("")
        .trim();

      setLiveTranscript(transcript);
      speechBufferRef.current = transcript;
      clearTimer(speechNoInputTimerRef);
      clearSpeechSilenceTimer();

      if (transcript) {
        speechSilenceTimerRef.current = window.setTimeout(() => {
          stopRecognition();
        }, activeSpeechSilenceDelayMs);
      }
    };

    recognition.onerror = () => {
      cancelRecognition(
        activeRecognitionStageRef.current === "native"
          ? { message: "没有听到声音，请再试一次" }
          : undefined
      );
    };

    recognition.onend = () => {
      finishRecognition();
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      speechNoInputTimerRef.current = window.setTimeout(() => {
        if (speechBufferRef.current.trim()) return;

        cancelRecognition(
          nextPracticeStage === "native"
            ? { message: "没有听到声音，请再试一次" }
            : undefined
        );
      }, speechNoInputTimeoutMs);
      speechMaxTimerRef.current = window.setTimeout(() => {
        stopRecognition();
      }, speechMaxDurationMs);
    } catch {
      shouldCommitSpeechRef.current = false;
      clearAllSpeechTimers();
      setIsListening(false);
      setPrimingPracticeStage(null);
      setMessage("Speech recognition could not start");
    }
  }

  function stopRecognition(options: { forceUiReset?: boolean } = {}) {
    clearSpeechSilenceTimer();
    clearTimer(speechNoInputTimerRef);
    clearTimer(speechStopFallbackTimerRef);

    if (activeRecognitionStageRef.current === "native") {
      setIsRecognizingNativeSpeech(true);
    }

    if (options.forceUiReset) {
      setIsListening(false);
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      finishRecognition();
      return;
    }

    try {
      recognition.stop();
    } catch {
      finishRecognition();
      return;
    }

    speechStopFallbackTimerRef.current = window.setTimeout(() => {
      finishRecognition();
    }, speechStopFallbackMs);
  }

  useEffect(() => {
    const currentChinese = nativeSpeech.trim();

    if (!hasNativeSpeech || !isNativeSpeechConfirmed || !currentChinese) {
      if (!currentChinese || !isNativeSpeechConfirmed) {
        authoritativeEnglishRequestKeyRef.current = "";
        setAuthoritativeEnglish("");
      }
      return;
    }

    if (authoritativeEnglishRequestKeyRef.current === currentChinese) {
      return;
    }

    let cancelled = false;
    authoritativeEnglishRequestKeyRef.current = currentChinese;
    setAuthoritativeEnglish("");

    async function loadAuthoritativeEnglish() {
      try {
        const response = await fetch("/api/accurate-sentence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chinese: currentChinese }),
        });
        const data = (await response.json()) as { english?: unknown };
        const english =
          typeof data.english === "string" ? data.english.trim() : "";

        if (!cancelled && response.ok && english) {
          setAuthoritativeEnglish(english);
        }
      } catch {
        if (!cancelled) {
          setAuthoritativeEnglish("");
        }
      }
    }

    void loadAuthoritativeEnglish();

    return () => {
      cancelled = true;
    };
  }, [hasNativeSpeech, isNativeSpeechConfirmed, nativeSpeech]);

  useEffect(() => {
    if (isFreeConversationMode || !hasEnglishAttempt || !nativeSpeech) return;

    let cancelled = false;
    const fallbackVariants = authoritativeEnglish
      ? createFallbackExpressionVariants(authoritativeEnglish)
      : [];
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setIsLoadingExpressionVariants(true);

    async function loadExpressionVariants() {
      try {
        const response = await fetch("/api/expression-variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chinese: nativeSpeech,
            userEnglish: message,
            standardEnglish: authoritativeEnglish,
          }),
        });
        const data = (await response.json()) as {
          variants?: Partial<Record<ExpressionVariantKey, string>>;
        };

        if (cancelled) return;

        if (!response.ok || !data.variants) {
          setExpressionVariants(fallbackVariants);
          setStandardEnglish(authoritativeEnglish);
          return;
        }

        const nextVariants = expressionVariantLabels.map(({ key, label }) => ({
          key,
          label,
          text:
            typeof data.variants?.[key] === "string" &&
            data.variants[key]?.trim()
              ? data.variants[key]!.trim()
              : "",
        }));

        setExpressionVariants(nextVariants);
        setStandardEnglish(nextVariants[0]?.text || authoritativeEnglish);
      } catch {
        if (!cancelled) {
          setExpressionVariants(fallbackVariants);
          setStandardEnglish(authoritativeEnglish);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingExpressionVariants(false);
        }
      }
    }

    void loadExpressionVariants();

    return () => {
      cancelled = true;
    };
  }, [
    authoritativeEnglish,
    hasEnglishAttempt,
    isFreeConversationMode,
    message,
    nativeSpeech,
  ]);

  useEffect(() => {
    const currentChinese = nativeSpeech.trim();
    const recommendedEnglish = standardEnglish.trim();
    const requestKey = JSON.stringify({
      currentChinese,
      refreshKey: guidedFollowupRefreshKey,
      recommendedEnglish,
    });

    if (
      !isAiGuidedMode ||
      !hasEnglishAttempt ||
      isLoadingExpressionVariants ||
      !currentChinese ||
      !recommendedEnglish ||
      guidedFollowupRequestKeyRef.current === requestKey
    ) {
      return;
    }

    let cancelled = false;
    guidedFollowupRequestKeyRef.current = requestKey;
    setGuidedFollowupSuggestion("");
    setIsLoadingGuidedFollowup(true);

    async function loadGuidedFollowup() {
      try {
        const response = await fetch("/api/expression-followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentChinese,
            recommendedEnglish,
            turns: guidedConversationTurnsRef.current.map(
              ({ chinese, recommendedEnglish: turnRecommendedEnglish }) => ({
                chinese,
                recommendedEnglish: turnRecommendedEnglish,
              })
            ),
            userEnglish: "",
          }),
        });
        const data = (await response.json()) as { suggestion?: unknown };
        const suggestion =
          typeof data.suggestion === "string" ? data.suggestion.trim() : "";

        if (!cancelled) {
          setGuidedFollowupSuggestion(
            suggestion || "躺在后院晒太阳真舒服！"
          );
        }
      } catch {
        if (!cancelled) {
          setGuidedFollowupSuggestion("躺在后院晒太阳真舒服！");
        }
      } finally {
        if (!cancelled) {
          guidedConversationTurnsRef.current = [
            ...guidedConversationTurnsRef.current,
            {
              chinese: currentChinese,
              recommendedEnglish,
              userEnglish: "",
            },
          ].slice(-6);
          setIsLoadingGuidedFollowup(false);
        }
      }
    }

    void loadGuidedFollowup();

    return () => {
      cancelled = true;
    };
  }, [
    hasEnglishAttempt,
    guidedFollowupRefreshKey,
    isAiGuidedMode,
    isLoadingExpressionVariants,
    nativeSpeech,
    standardEnglish,
  ]);

  useEffect(() => {
    const sentence = (
      isFreeConversationMode
        ? selectedFreeConversationExpression.text
        : selectedExpression.text
    )?.trim();
    const isExpressionHighlightLoading = isFreeConversationMode
      ? isLoadingFreeConversation
      : isLoadingExpressionVariants;

    if (
      !hasEnglishAttempt ||
      !sentence ||
      isExpressionHighlightLoading
    ) {
      setHighlightedExpressions([]);
      return;
    }

    let cancelled = false;
    setHighlightedExpressions(createFallbackHighlightedExpressions(sentence));

    async function loadHighlightedExpressions() {
      try {
        const response = await fetch("/api/expression-highlights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentence }),
        });
        const data = (await response.json()) as {
          expressions?: HighlightedExpression[];
        };

        if (!cancelled && Array.isArray(data.expressions)) {
          setHighlightedExpressions(
            data.expressions.length
              ? data.expressions
              : createFallbackHighlightedExpressions(sentence)
          );
        }
      } catch {
        if (!cancelled) {
          setHighlightedExpressions(createFallbackHighlightedExpressions(sentence));
        }
      }
    }

    void loadHighlightedExpressions();

    return () => {
      cancelled = true;
    };
  }, [
    hasEnglishAttempt,
    isFreeConversationMode,
    isLoadingFreeConversation,
    isLoadingExpressionVariants,
    selectedFreeConversationExpression.text,
    selectedExpression.text,
  ]);

  function speakEnglishText(text: string, rate: number) {
    if (!text || typeof window === "undefined") return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = normalizeSpeechRate(rate);
    utterance.pitch = 1;
    utterance.volume = 1;

    const selectedVoice = availableVoices.find(
      (voice) =>
        voice.voiceURI === selectedVoiceURI && isStableSpeechVoice(voice)
    );
    utterance.voice =
      selectedVoice || pickPreferredEnglishVoice(availableVoices) || null;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function readStandardEnglish(rate: number) {
    const text = isFreeConversationMode
      ? selectedFreeConversationExpression.text
      : selectedExpression.text || standardEnglish;

    speakEnglishText(text, rate);
  }

  function readExpressionVariant(
    variant: ExpressionVariant,
    variantIndex: number,
    rate = 1
  ) {
    setSelectedExpressionIndex(variantIndex);
    speakEnglishText(variant.text || standardEnglish, rate);
  }

  function readReferenceResultVariant(variantIndex: number, rate = 1) {
    const variantText = expressionVariantsForDisplay[variantIndex]?.text?.trim();
    const referenceText = referenceResultVariantTexts[variantIndex]?.trim();
    const text = variantText || referenceText || standardEnglish;

    setSelectedExpressionIndex(variantIndex);
    speakEnglishText(text, rate);
  }

  function getSelectedReferenceResultText() {
    const safeIndex = Math.min(
      selectedExpressionIndex,
      Math.max(referenceResultVariantTexts.length - 1, 0)
    );
    const variantText = expressionVariantsForDisplay[safeIndex]?.text?.trim();
    const referenceText = referenceResultVariantTexts[safeIndex]?.trim();

    return variantText || referenceText || standardEnglish.trim();
  }

  function readSelectedReferenceResult(rate = 1) {
    speakEnglishText(getSelectedReferenceResultText(), rate);
  }

  function saveSelectedReferenceResultExpression() {
    const phrase = getSelectedReferenceResultText().trim();
    if (!phrase) return;

    window.speechSynthesis?.cancel();
    const result = addVocabularyWord(phrase, nativeSpeech);

    if (!result.ok) {
      setVocabularyNotice(
        result.reason === "DUPLICATE" ? "这个表达已经收藏过了" : result.message
      );
      return;
    }

    updateVocabularyWord(result.word.word, {
      meaning: "收藏表达",
      partOfSpeech: "phrase",
      example: nativeSpeech,
      sourceSentence: nativeSpeech,
    });
    setVocabularyNotice("已收藏当前表达");
  }

  function getHighlightsForReferenceText(text: string) {
    const sentence = text.trim();
    if (!sentence) return [] as HighlightedExpression[];

    const selectedText = (
      isFreeConversationMode
        ? selectedFreeConversationExpression.text
        : selectedExpression.text
    )?.trim();

    if (selectedText === sentence && highlightedExpressions.length > 0) {
      return highlightedExpressions;
    }

    return createFallbackHighlightedExpressions(sentence);
  }

  function renderReferenceResultText(text: string) {
    const segments = splitSentenceByHighlightedExpressions(
      text,
      getHighlightsForReferenceText(text)
    );

    return segments.map((segment, index) =>
      segment.type === "expression" ? (
        <button
          key={`${segment.value}-${index}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleExpressionClick(segment.expression, text);
          }}
          className="pointer-events-auto inline cursor-pointer rounded-[0.35em] border-0 bg-[#fff4a3]/90 px-[0.08em] text-[#141438] shadow-[inset_0_-0.32em_0_rgba(255,209,64,0.68)] [font:inherit] [line-height:inherit]"
        >
          {segment.value}
        </button>
      ) : (
        <span key={`${segment.value}-${index}`}>
          {tokenizeEnglishSentence(segment.value).map((token, tokenIndex) =>
            token.type === "word" ? (
              <button
                key={`${token.value}-${tokenIndex}`}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleWordClick(token.value, text);
                }}
                className="pointer-events-auto inline cursor-pointer rounded-[0.22em] border-0 bg-transparent p-0 text-inherit transition active:bg-[#fff4a3]/85 [font:inherit] [line-height:inherit]"
              >
                {token.value}
              </button>
            ) : (
              <span key={`${token.value}-${tokenIndex}`}>{token.value}</span>
            )
          )}
        </span>
      )
    );
  }

  function previewVoice(voice: SpeechSynthesisVoice) {
    if (typeof window === "undefined") return;

    const utterance = new SpeechSynthesisUtterance(
      "This is your SpeakFlow voice."
    );
    utterance.lang = voice.lang || "en-US";
    utterance.voice = voice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function handleExpressionClick(
    expression: HighlightedExpression,
    sourceSentence: string
  ) {
    const phrase = expression.phrase.trim();
    if (!phrase) return;

    window.speechSynthesis?.cancel();
    setVocabularyNotice("");
    setPendingExpression({
      phrase,
      meaning: expression.meaning || "✨ 值得学习的表达",
      sourceSentence,
      kind: "phrase",
    });
  }

  function handleWordClick(word: string, sourceSentence: string) {
    const phrase = word.trim();
    if (!phrase) return;

    window.speechSynthesis?.cancel();
    setVocabularyNotice("");
    setPendingExpression({
      phrase,
      meaning: "📘 收藏这个单词",
      sourceSentence,
      kind: "word",
    });
  }

  function closeExpressionModal() {
    setPendingExpression(null);
    setIsSavingExpression(false);
  }

  async function handleConfirmAddExpression() {
    if (!pendingExpression || isSavingExpression) return;

    setIsSavingExpression(true);

    const sourceSentence = pendingExpression.sourceSentence;
    const isWord = pendingExpression.kind === "word";

    let wordDefinition: Awaited<
      ReturnType<typeof generateVocabularyDefinition>
    > | null = null;

    if (isWord) {
      try {
        wordDefinition = await generateVocabularyDefinition(
          pendingExpression.phrase
        );
        if (!hasUsableMeaning(wordDefinition.meaning)) {
          throw new Error("Missing native meaning");
        }
      } catch {
        setIsSavingExpression(false);
        setVocabularyNotice("中文释义生成失败，请稍后再试");
        return;
      }
    }

    const result = addVocabularyWord(pendingExpression.phrase, sourceSentence);

    if (!result.ok) {
      if (isWord && wordDefinition) {
        updateVocabularyWord(pendingExpression.phrase, {
          meaning: wordDefinition.meaning,
          partOfSpeech: wordDefinition.partOfSpeech || "word",
          example: sourceSentence || wordDefinition.example,
          exampleZh: wordDefinition.exampleZh,
          sourceSentence,
        });
      }

      closeExpressionModal();
      setVocabularyNotice(
        result.reason === "DUPLICATE"
          ? isWord
            ? "这个单词已经收藏过了，中文释义已更新"
            : "这个表达已经收藏过了"
          : result.message
      );
      return;
    }

    const savedWord = result.word.word;
    updateVocabularyWord(savedWord, {
      meaning: isWord
        ? wordDefinition?.meaning || result.word.meaning
        : pendingExpression.meaning,
      partOfSpeech: isWord
        ? wordDefinition?.partOfSpeech || "word"
        : "phrase",
      example: isWord
        ? sourceSentence || wordDefinition?.example || ""
        : sourceSentence,
      exampleZh: isWord
        ? wordDefinition?.exampleZh || ""
        : result.word.exampleZh,
      sourceSentence,
    });
    closeExpressionModal();
    setVocabularyNotice(isWord ? "已存入表达库" : "已存入新表达");
  }

  function openClassicLesson(id: string, title: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("currentLessonTitle", title);
      window.location.href = `/study/${id}`;
    }
  }

  const selectedClassicCourseCategory = classicCourseCategories.find(
    (category) => category.id === selectedClassicCourseCategoryId
  );
  const selectedClassicCourseMeta = classicSceneMenuHotspots.find(
    (item) => item.id === selectedClassicCourseCategory?.id
  );
  const isClassicCourseSearchOpen =
    selectedClassicCourseCategoryId === "__classic-search";
  const classicSearchEntries = useMemo(() => {
    return classicCourseCategories.flatMap((category) =>
      category.sections.flatMap((section) =>
        section.lessons
          .filter((lesson) => Boolean(lesson.id))
          .map((lesson) => ({
            id: lesson.id || "",
            title: lesson.title,
            categoryId: category.id,
            categoryLabel:
              classicSceneMenuHotspots.find((item) => item.id === category.id)
                ?.label || category.label,
            sectionId: section.id,
            sectionLabel: section.label,
          }))
      )
    );
  }, []);
  const classicSearchResults = useMemo(() => {
    const query = classicCourseSearchQuery.trim().toLowerCase();

    if (!query) {
      return classicSearchEntries.slice(0, 16);
    }

    return classicSearchEntries
      .filter((entry) =>
        `${entry.title} ${entry.categoryLabel} ${entry.sectionLabel}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 30);
  }, [classicCourseSearchQuery, classicSearchEntries]);

  function openClassicCourseCategory(categoryId: string) {
    setSelectedClassicCourseCategoryId(categoryId);
    setSelectedClassicCourseSectionId("");
    setClassicCourseSearchQuery("");
  }

  function handleClassicMenuHotspot(
    hotspot: (typeof classicSceneMenuHotspots)[number]
  ) {
    if (hotspot.kind === "search") {
      setSelectedClassicCourseCategoryId("__classic-search");
      setSelectedClassicCourseSectionId("");
      setClassicCourseSearchQuery("");
      return;
    }

    if (hotspot.kind === "guided") {
      openTrainingGroundMode();
      setShowClassicCoursePicker(false);
      resetClassicCoursePicker();
      return;
    }

    if (hotspot.kind === "expression") {
      window.location.href = "/vocabulary";
      return;
    }

    openClassicCourseCategory(hotspot.id);
  }

  function renderClassicSearchView() {
    return (
      <div className="grid gap-4 py-2">
        <button
          type="button"
          onClick={resetClassicCoursePicker}
          className="w-full text-left text-[1rem] font-extrabold text-[#5b63ff]"
        >
          ← 返回上一级
        </button>
        <div className="grid gap-2">
          <h2 className="text-[1.85rem] font-extrabold leading-tight text-[#201833]">
            搜索经典场景
          </h2>
          <input
            value={classicCourseSearchQuery}
            onChange={(event) => setClassicCourseSearchQuery(event.target.value)}
            placeholder="搜索课程或场景"
            className="h-12 w-full rounded-[18px] border border-[#c9beff] bg-white/70 px-4 text-[1rem] font-bold text-[#201833] outline-none transition focus:border-[#7c55ff] focus:ring-4 focus:ring-[#7c55ff]/14"
          />
        </div>
        <div className="grid gap-2">
          {classicSearchResults.length ? (
            classicSearchResults.map((entry) => (
              <button
                key={`${entry.sectionId}-${entry.id}`}
                type="button"
                onClick={() => openClassicLesson(entry.id, entry.title)}
                className="rounded-[18px] bg-white/58 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_22px_rgba(89,75,150,0.08)] transition hover:bg-white/80 active:scale-[0.99]"
              >
                <span className="block text-[1.04rem] font-extrabold leading-6 text-[#201833]">
                  {entry.title}
                </span>
                <span className="mt-1 block text-[0.76rem] font-bold leading-5 text-[#7f7896]">
                  {entry.categoryLabel} / {entry.sectionLabel}
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-[18px] bg-white/42 px-4 py-5 text-[1rem] font-bold text-[#7f7896]">
              没有找到相关课程
            </p>
          )}
        </div>
      </div>
    );
  }

  function renderClassicSectionLessons(
    category: ClassicCourseCategory,
    section: ClassicCourseSection
  ) {
    const categoryTitle =
      classicSceneMenuHotspots.find((item) => item.id === category.id)?.label ||
      category.label;
    const categoryDescription =
      classicCategoryDescriptions[category.id] ||
      "\u6309\u771f\u5b9e\u751f\u6d3b\u573a\u666f\u7ec3\u9ad8\u9891\u53e3\u8bed";
    const lessonCountText = section.lessons.length
      ? String(section.lessons.length) + " \u4e2a\u8bfe\u7a0b"
      : "\u8bfe\u7a0b\u6574\u7406\u4e2d";

    return (
      <div className="mx-auto grid w-full max-w-[430px] gap-6 py-2">
        <button
          type="button"
          onClick={() => setSelectedClassicCourseSectionId("")}
          className="w-full text-left text-[0.98rem] font-extrabold text-[#5b63ff] transition hover:text-[#201833]"
        >
          {"\u2190 \u8fd4\u56de\u7ecf\u5178\u53e3\u8bed\u7ec3\u4e60"}
        </button>

        <div className="grid gap-2">
          <h2 className="text-[1.82rem] font-black leading-tight text-[#201833]">
            {categoryTitle}
          </h2>
          <p className="text-[0.92rem] font-bold leading-6 text-[#6f6685]">
            {categoryDescription}
          </p>
        </div>

        <div className="grid gap-1">
          <h3 className="text-[1.34rem] font-black leading-7 text-[#201833]">
            {section.label}
          </h3>
          <p className="text-[0.95rem] font-extrabold leading-5 text-[#7f7896]">
            {lessonCountText}
          </p>
        </div>

        <div className="grid gap-1.5">
          {section.lessons.length ? (
            section.lessons.map((lesson) =>
              lesson.id ? (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => openClassicLesson(lesson.id!, lesson.title)}
                  className="block min-h-12 w-full rounded-[12px] px-0 py-2.5 text-left text-[1.08rem] font-black leading-7 text-[#201833] transition hover:text-[#5b63ff] active:scale-[0.99]"
                >
                  {lesson.title}
                </button>
              ) : (
                <div
                  key={lesson.title}
                  className="block min-h-12 w-full px-0 py-2.5 text-left text-[1.08rem] font-black leading-7 text-[#7f7896]"
                >
                  {lesson.title}
                </div>
              )
            )
          ) : (
            <p className="py-4 text-[1rem] font-bold leading-6 text-[#7f7896]">
              {"\u8fd9\u4e2a\u5c0f\u7c7b\u7684\u8bfe\u7a0b\u8fd8\u5728\u6574\u7406\u4e2d"}
            </p>
          )}
        </div>
      </div>
    );
  }

  function handleFinanceGovernmentHotspot(
    hotspot: (typeof financeGovernmentMenuHotspots)[number]
  ) {
    if (hotspot.kind === "back") {
      resetClassicCoursePicker();
      return;
    }

    if (hotspot.kind === "home") {
      setShowClassicCoursePicker(false);
      setShowQuickPanel(false);
      resetClassicCoursePicker();
      return;
    }

    if (hotspot.kind === "all") {
      setSelectedClassicCourseSectionId("__finance-all");
      return;
    }

    if (hotspot.id === "bank-finance") {
      router.push("/classic-scenes/bank-finance");
      return;
    }

    setSelectedClassicCourseSectionId(hotspot.id);
  }

  function renderFinanceGovernmentCategory(category: ClassicCourseCategory) {
    if (selectedClassicCourseSectionId === "__finance-all") {
      return renderClassicCategoryOverview(category);
    }

    const selectedSection = category.sections.find(
      (section) => section.id === selectedClassicCourseSectionId
    );

    if (selectedSection) {
      return renderClassicSectionLessons(category, selectedSection);
    }

    const sectionEntries = financeGovernmentMenuHotspots
      .filter((hotspot) => hotspot.kind === "section")
      .map((hotspot) => ({
        hotspot,
        section: category.sections.find((section) => section.id === hotspot.id),
      }))
      .filter(
        (
          entry
        ): entry is {
          hotspot: (typeof financeGovernmentMenuHotspots)[number];
          section: ClassicCourseSection;
        } => Boolean(entry.section)
      );
    const allCoursesHotspot = financeGovernmentMenuHotspots.find(
      (hotspot) => hotspot.kind === "all"
    );
    const financeTitle =
      classicSceneMenuHotspots.find((item) => item.id === category.id)?.label ||
      category.label;
    const financeDescription = classicCategoryDescriptions[category.id];

    return (
      <div className="mx-auto grid w-full max-w-[430px] gap-6 pb-7 pt-2">
        <section className="grid gap-7 px-1 pb-3 pt-3">
          <button
            type="button"
            onClick={resetClassicCoursePicker}
            className="w-fit text-left text-[0.98rem] font-extrabold text-[#4f5cff] transition hover:text-[#201833]"
          >
            {"\u2190 \u8fd4\u56de\u4e0a\u4e00\u7ea7"}
          </button>
          <div className="grid gap-3">
            <h2 className="text-[2.12rem] font-black leading-tight text-[#10142f]">
              {financeTitle}
            </h2>
            <p className="text-[0.96rem] font-bold leading-6 text-[#5f6680]">
              {financeDescription}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 min-[390px]:gap-4">
          {sectionEntries.map(({ hotspot, section }) => {
            const visual =
              financeGovernmentSectionVisuals[section.id] ||
              defaultClassicMenuCardVisual;
            const displayCount =
              financeGovernmentSectionDisplayCounts[section.id] ||
              section.lessons.length;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleFinanceGovernmentHotspot(hotspot)}
                className="group relative min-h-[11rem] overflow-hidden rounded-[22px] border border-[#edf0fa] px-4 pb-4 pt-5 text-left shadow-[0_10px_24px_rgba(84,72,146,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(84,72,146,0.13)] active:scale-[0.99]"
                style={{ background: visual.background }}
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-full shadow-[0_12px_24px_rgba(84,72,146,0.08)]"
                    style={{
                      background: visual.iconBackground || "#f0edff",
                    }}
                  >
                    <ClassicMenuIcon accent={visual.accent} id={section.id} />
                  </span>
                  <ClassicMenuArrow accent={visual.accent} />
                </span>
                <span className="mt-5 block text-[0.98rem] font-black leading-6 text-[#10142f] min-[390px]:text-[1.05rem]">
                  {hotspot.label}
                </span>
                <span className="mt-2 block text-[0.74rem] font-bold leading-5 text-[#5f6680] min-[390px]:text-[0.8rem]">
                  {financeGovernmentSectionDescriptions[section.id]}
                </span>
                <span
                  className="mt-4 block text-[0.82rem] font-black leading-none"
                  style={{ color: visual.accent }}
                >
                  {`${displayCount} \u4e2a\u8bfe\u7a0b`}
                </span>
              </button>
            );
          })}
          {allCoursesHotspot ? (
            <button
              type="button"
              onClick={() => handleFinanceGovernmentHotspot(allCoursesHotspot)}
              className="group relative min-h-[11rem] overflow-hidden rounded-[22px] border border-[#edf0fa] px-4 pb-4 pt-5 text-left shadow-[0_10px_24px_rgba(84,72,146,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(84,72,146,0.13)] active:scale-[0.99]"
              style={{
                background:
                  "linear-gradient(135deg,#ffffff 0%,#ffffff 62%,#faf8ff 100%)",
              }}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#f0eaff] text-[#735cff] shadow-[0_12px_24px_rgba(84,72,146,0.08)]">
                  <ClassicMenuIcon
                    accent="#735cff"
                    id="all-finance-government"
                  />
                </span>
                <ClassicMenuArrow accent="#735cff" />
              </span>
              <span className="mt-5 block text-[0.98rem] font-black leading-6 text-[#10142f] min-[390px]:text-[1.05rem]">
                {"\u67e5\u770b\u5168\u90e8"}
              </span>
              <span className="mt-2 block text-[0.74rem] font-bold leading-5 text-[#5f6680] min-[390px]:text-[0.8rem]">
                {"\u4ece\u91d1\u878d\u3001\u8eab\u4efd\u3001\u653f\u5e9c\u3001\u8f66\u8f86\u7b49\u591a\u9886\u57df\u6269\u5c55\u66f4\u591a\u573a\u666f"}
              </span>
              <span className="mt-4 block text-[0.82rem] font-black leading-none text-[#735cff]">
                {`${financeGovernmentTotalDisplayCount} \u4e2a\u8bfe\u7a0b`}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  function renderClassicCategoryOverview(category: ClassicCourseCategory) {
    const title = selectedClassicCourseMeta?.label || category.label;
    const description =
      classicCategoryDescriptions[category.id] ||
      "\u6309\u771f\u5b9e\u751f\u6d3b\u573a\u666f\u7ec3\u9ad8\u9891\u53e3\u8bed";

    return (
      <div className="grid gap-4 py-2">
        <button
          type="button"
          onClick={resetClassicCoursePicker}
          className="w-full text-left text-[1rem] font-extrabold text-[#5b63ff]"
        >
          {"\u2190 \u8fd4\u56de\u7ecf\u5178\u53e3\u8bed\u7ec3\u4e60"}
        </button>
        <div className="rounded-[24px] bg-white px-5 py-4 shadow-[0_14px_34px_rgba(89,75,150,0.1)]">
          <h2 className="text-[1.65rem] font-extrabold leading-tight text-[#201833]">
            {title}
          </h2>
          <p className="mt-2 text-[0.9rem] font-bold leading-6 text-[#6f6685]">
            {description}
          </p>
        </div>
        <div className="grid gap-2.5">
          {category.sections.map((section) => {
            const isOpen = selectedClassicCourseSectionId === section.id;

            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-[20px] border border-[#eee8f8] bg-white shadow-[0_10px_22px_rgba(89,75,150,0.08)]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedClassicCourseSectionId(isOpen ? "" : section.id)
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#f8f6ff]"
                >
                  <span className="min-w-0">
                    <span className="block text-[1.08rem] font-extrabold leading-6 text-[#201833]">
                      {section.label}
                    </span>
                    <span className="mt-0.5 block text-[0.76rem] font-bold text-[#7f7896]">
                      {section.lessons.length
                        ? `${section.lessons.length} \u4e2a\u8bfe\u7a0b`
                        : "\u8bfe\u7a0b\u6574\u7406\u4e2d"}
                    </span>
                  </span>
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f0ff] text-[1.2rem] font-extrabold text-[#5b63ff] transition ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  >
                    {"\u2192"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="grid gap-1 border-t border-[#eee8f8] px-4 py-3">
                    {section.lessons.length ? (
                      section.lessons.map((lesson) =>
                        lesson.id ? (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() =>
                              openClassicLesson(lesson.id!, lesson.title)
                            }
                            className="rounded-[14px] px-3 py-2 text-left text-[0.98rem] font-bold leading-6 text-[#201833] transition hover:bg-[#f8f6ff]"
                          >
                            {lesson.title}
                          </button>
                        ) : (
                          <div
                            key={lesson.title}
                            className="rounded-[14px] px-3 py-2 text-left text-[0.98rem] font-bold leading-6 text-[#7f7896]"
                          >
                            {lesson.title}
                          </div>
                        )
                      )
                    ) : (
                      <p className="rounded-[14px] bg-[#f8f6ff] px-3 py-3 text-[0.95rem] font-bold leading-6 text-[#7f7896]">
                        {"\u8fd9\u4e2a\u5c0f\u7c7b\u7684\u8bfe\u7a0b\u8fd8\u5728\u6574\u7406\u4e2d"}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderClassicCategoryDetail(category: ClassicCourseCategory) {
    if (category.id === "finance-government") {
      return renderFinanceGovernmentCategory(category);
    }

    return renderClassicCategoryOverview(category);
  }

  function renderClassicCoursePicker() {
    if (isClassicCourseSearchOpen) {
      return renderClassicSearchView();
    }

    if (selectedClassicCourseCategory) {
      return renderClassicCategoryDetail(selectedClassicCourseCategory);
    }

    const categoryHotspots = classicSceneMenuHotspots.filter(
      (hotspot) => hotspot.kind === "category"
    );
    const featureHotspots = classicSceneMenuHotspots.filter(
      (hotspot) => hotspot.kind === "guided" || hotspot.kind === "expression"
    );

    return (
      <div className="mx-auto grid w-full max-w-[430px] gap-4 pb-7 pt-1">
        <section className="relative min-h-[13.4rem] overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_82%_34%,rgba(123,97,255,0.18),transparent_31%),linear-gradient(135deg,#ffffff_0%,#ffffff_54%,#f1edff_100%)] px-5 py-6 shadow-[0_18px_42px_rgba(84,72,146,0.08)] min-[390px]:px-6">
          <ClassicMenuHeroVisual />
          <button
            type="button"
            onClick={() => {
              setShowClassicCoursePicker(false);
              resetClassicCoursePicker();
            }}
            className="relative z-10 w-fit text-left text-[0.95rem] font-extrabold text-[#5b63ff] transition hover:text-[#201833]"
          >
            {"\u2190 \u8fd4\u56de\u4e0a\u4e00\u7ea7"}
          </button>
          <div className="relative z-10 mt-8 max-w-[15.5rem] min-[390px]:max-w-[16.6rem]">
            <h2 className="text-[2.15rem] font-black leading-tight text-[#10142f]">
              {"\u7ecf\u5178\u53e3\u8bed\u7ec3\u4e60"}
            </h2>
            <p className="mt-3 text-[0.92rem] font-bold leading-6 text-[#5f6680]">
              {"\u8986\u76d6\u65e5\u5e38\u751f\u6d3b\u573a\u666f\uff0c\u6309\u5206\u7c7b\u7ec3\u9ad8\u9891\u8868\u8fbe"}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 min-[390px]:gap-4">
          {categoryHotspots.map((hotspot) => {
            const category = classicCourseCategories.find(
              (item) => item.id === hotspot.id
            );

            if (!category) return null;

            const lessonCount = getClassicCourseLessonCount(category);
            const visual =
              classicMenuCardVisuals[hotspot.id] || defaultClassicMenuCardVisual;

            return (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => handleClassicMenuHotspot(hotspot)}
                className="group relative min-h-[9.6rem] overflow-hidden rounded-[20px] border border-[#edf0fa] px-4 py-4 text-left shadow-[0_10px_24px_rgba(84,72,146,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(84,72,146,0.13)] active:scale-[0.99]"
                style={{ background: visual.background }}
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px]"
                    style={{
                      background: visual.iconBackground || "#f0edff",
                    }}
                  >
                    <ClassicMenuIcon accent={visual.accent} id={hotspot.id} />
                  </span>
                  <ClassicMenuArrow accent={visual.accent} />
                </span>
                <span className="mt-5 block text-[0.96rem] font-black leading-6 text-[#10142f] min-[390px]:text-[1.02rem]">
                  {hotspot.label}
                </span>
                <span className="mt-1.5 block text-[0.72rem] font-bold leading-5 text-[#5f6680] min-[390px]:text-[0.76rem]">
                  {classicCategoryDescriptions[hotspot.id]}
                </span>
                <span
                  className="mt-3 block text-[0.75rem] font-black leading-none"
                  style={{ color: visual.accent }}
                >
                  {lessonCount
                    ? `${lessonCount} \u4e2a\u8bfe\u7a0b`
                    : "\u8bfe\u7a0b\u6574\u7406\u4e2d"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 min-[390px]:gap-4">
          {featureHotspots.map((hotspot) => {
            const visual =
              classicMenuCardVisuals[hotspot.id] || defaultClassicMenuCardVisual;
            const description =
              hotspot.kind === "guided"
                ? "\u6839\u636e\u4f60\u7684\u60f3\u6cd5\uff0cAI \u5e2e\u4f60\u7ec4\u7ec7\u66f4\u5730\u9053\u7684\u8868\u8fbe"
                : "\u5b66\u4e60\u6700\u5e38\u7528\u8868\u8fbe\uff0c\u8ba9\u4f60\u7684\u82f1\u8bed\u66f4\u81ea\u7136";

            return (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => handleClassicMenuHotspot(hotspot)}
                className="group relative min-h-[7.6rem] overflow-hidden rounded-[20px] border border-[#edf0fa] px-4 py-4 pr-12 text-left shadow-[0_10px_24px_rgba(84,72,146,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(84,72,146,0.13)] active:scale-[0.99]"
                style={{ background: visual.background }}
              >
                <span
                  className="absolute right-3 top-3 rounded-full px-2 py-1 text-[0.62rem] font-black leading-none"
                  style={{
                    background: visual.iconBackground || "#f0edff",
                    color: visual.accent,
                  }}
                >
                  NEW
                </span>
                <span className="flex items-start gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"
                    style={{
                      background: visual.iconBackground || "#f0edff",
                    }}
                  >
                    <ClassicMenuIcon accent={visual.accent} id={hotspot.id} />
                  </span>
                </span>
                <span className="mt-3 block text-[0.98rem] font-black leading-5 text-[#10142f]">
                  {hotspot.label}
                </span>
                <span className="mt-1.5 block text-[0.72rem] font-bold leading-5 text-[#5f6680]">
                  {description}
                </span>
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <ClassicMenuArrow accent={visual.accent} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  function handleKeyPress(key: string) {
    if (key === "shift") {
      setIsShifted((current) => !current);
      return;
    }

    if (key === "backspace") {
      deleteLastCharacter();
      return;
    }

    if (keyboardMode === "zh" && /^[a-z]$/.test(key)) {
      setComposingPinyin((current) => `${current}${key}`);
      return;
    }

    appendText(isShifted && /^[a-z]$/.test(key) ? key.toUpperCase() : key);
    if (isShifted) setIsShifted(false);
  }

  function handleSpace() {
    if (keyboardMode === "zh" && composingPinyin) {
      commitChineseCandidate();
      return;
    }

    appendText(" ");
  }

  function getCanvasContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#91dcff";

    return context;
  }

  function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const context = getCanvasContext();
    if (!context) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    const point = getCanvasPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setHasInk(true);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;

    const context = getCanvasContext();
    if (!context) return;

    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be released.
    }
    isDrawingRef.current = false;
  }

  function clearHandwriting() {
    const canvas = canvasRef.current;
    const context = getCanvasContext();
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function commitHandwriting(value = "手写") {
    if (!hasInk && value === "手写") {
      setMessage("Write in the handwriting area first");
      return;
    }

    appendText(value);
    clearHandwriting();
    setMessage("Handwriting was added to the practice line");
  }

  const accountHomeGroups: AccountHomeGroup[] = [
    {
      rows: [
        {
          action: "subscription",
          badge: accountSubscriptionDisplayLabel,
          icon: "star",
          label: "SpeakFlow Pro",
        },
        {
          action: "manageSubscription",
          icon: "card",
          label: accountCopy.manageSubscription,
        },
        {
          action: "referrals",
          icon: "gift",
          label: accountHome.inviteFriends,
        },
        {
          action: "accountManagement",
          icon: "lock",
          label: accountHome.accountManagement,
        },
        ...(isAccountAdmin
          ? [
              {
                action: "adminDashboard" as const,
                icon: "dashboard" as const,
                label: accountHome.adminDashboard,
              },
            ]
          : []),
      ],
    },
    {
      rows: [
        { action: "voice", icon: "headphones", label: voiceMenuItemLabel },
        { action: "fontSize", icon: "font", label: accountHome.fontSize },
        {
          action: "interfaceLanguage",
          icon: "globe",
          label: accountHome.interfaceLanguage,
        },
        { action: "notifications", icon: "bell", label: accountHome.notifications },
      ],
      title: accountHome.learningExperience,
    },
    {
      rows: [
        { action: "helpCenter", icon: "help", label: accountHome.helpCenter },
        {
          action: "reportIssue",
          icon: "chat",
          label: accountHome.contactFeedback,
        },
        { action: "terms", icon: "file", label: accountHome.terms },
        { action: "privacy", icon: "lock", label: accountHome.privacyPolicy },
        {
          action: "aboutSpeakFlow",
          icon: "info",
          label: accountCopy.aboutSpeakFlowTitle,
        },
      ],
      title: accountHome.help,
    },
  ];

  return (
    <main
      className="responsive-page-shell sf-speak-page min-h-[100dvh] overflow-x-hidden text-white"
      data-speakflow-font-size={fontSizePreference}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] items-center justify-center p-2 sm:p-4">
        <section
          className={`sf-speak-phone relative flex h-[calc(100dvh-16px)] min-h-[calc(100dvh-16px)] w-full max-w-[430px] flex-col overflow-hidden rounded-[34px] sm:min-h-[720px] ${
            showClassicCoursePicker ? "sf-speak-phone-classic-menu-open" : ""
          } ${
            showReferenceLanding ? "sf-speak-phone-reference-landing" : ""
          } ${
            showReferenceListening ? "sf-speak-phone-reference-listening" : ""
          } ${
            showReferenceConfirmation ? "sf-speak-phone-reference-confirmation" : ""
          } ${
            showReferenceEnglishPrompt ? "sf-speak-phone-reference-english-prompt" : ""
          } ${
            showReferenceEnglishListening ? "sf-speak-phone-reference-english-listening" : ""
          } ${
            showReferenceResult ? "sf-speak-phone-reference-result" : ""
          } ${
            showGuidedReferenceLanding ? "sf-speak-phone-guided-reference-landing" : ""
          } ${
            showGuidedReferenceListening
              ? "sf-speak-phone-guided-reference-listening"
              : ""
          } ${
            showGuidedReferenceConfirmation
              ? "sf-speak-phone-guided-reference-confirmation"
              : ""
          } ${
            showGuidedReferenceEnglishListening
              ? "sf-speak-phone-guided-reference-english-listening"
              : ""
          } ${
            showGuidedReferenceResult
              ? "sf-speak-phone-guided-reference-result"
              : ""
          }`}
        >
          <div
            className={`pointer-events-none absolute left-1/2 top-[19%] z-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full border border-[#91dcff]/10 ${
              showClassicCoursePicker ? "hidden" : ""
            }`}
          />
          <div
            className={`pointer-events-none absolute left-1/2 top-[25%] z-0 h-[300px] w-[300px] -translate-x-1/2 rounded-full border border-[#b799ff]/10 ${
              showClassicCoursePicker ? "hidden" : ""
            }`}
          />

          {showGuidedReferenceLanding ? (
            <div className="sf-guided-practice-reference-landing absolute inset-0 z-[90] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/guided-practice-landing-reference.png"
                alt=""
                className="h-full w-full select-none object-fill"
                draggable={false}
              />
              <button
                type="button"
                aria-label="回到首页"
                onClick={openLoggedInHomePage}
                className="absolute left-[6.5%] top-[3.1%] z-[94] grid h-[6.2%] w-[10.5%] place-items-center rounded-full border-0 bg-white text-[#aeb8d4] shadow-[0_14px_28px_rgba(64,112,190,0.12),inset_0_1px_0_rgba(255,255,255,0.94)]"
              >
                <HomeMenuIcon
                  className="sf-guided-reference-home-icon"
                  label={null}
                  showHint={false}
                />
              </button>
              <button
                type="button"
                aria-label={accountCopy.openAccountMenu}
                onClick={openReferenceAccountMenu}
                className="absolute right-[7.1%] top-[3.1%] h-[5.9%] w-[11.5%] rounded-full border-0 bg-transparent"
              />
              {shouldShowGuestAiProgress ? (
                <GuestAiPracticeProgress
                  className="is-floating"
                  used={freePracticeUsageCount}
                />
              ) : null}
              <button
                type="button"
                aria-label="Back"
                onClick={returnToFreeLearningHome}
                className="absolute left-[6.5%] top-[9.6%] h-[4.5%] w-[17.5%] rounded-[26px] border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label="Start guided practice"
                onClick={handlePrimaryPracticeAction}
                className="absolute right-[10%] top-[51.4%] h-[5%] w-[22%] rounded-[26px] border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label="Start recording"
                onClick={handlePrimaryPracticeAction}
                className="absolute bottom-[4.7%] left-1/2 h-[13.5%] w-[30.5%] -translate-x-1/2 rounded-full border-0 bg-transparent"
              />
            </div>
          ) : null}

          {showGuidedReferenceListening ? (
            <div className="sf-ai-guided-step-two absolute inset-0 z-[90] overflow-hidden">
              <div className="sf-ai-guided-step-two-frame">
                <header className="sf-ai-guided-step-two-header">
                  <button
                    type="button"
                    aria-label="回到学习首页"
                    onClick={openLoggedInHomePage}
                    className="sf-ai-guided-step-two-menu"
                  >
                    <HomeMenuIcon label={null} showHint={false} />
                  </button>

                  <div
                    className="sf-ai-guided-step-two-brand"
                    aria-label="SpeakFlow AI Voice Practice"
                  >
                    <span aria-hidden="true" className="sf-ai-guided-step-two-logo">
                      <SpeakFlowBrandMark />
                    </span>
                    <span className="sf-ai-guided-step-two-brand-copy">
                      <span className="sf-ai-guided-step-two-brand-title">
                        SpeakFlow
                      </span>
                      <span className="sf-ai-guided-step-two-brand-subtitle">
                        AI VOICE PRACTICE
                      </span>
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label={accountCopy.openAccountMenu}
                    onClick={openAccountPage}
                    className="sf-ai-guided-step-two-avatar-button"
                  >
                    {accountImage && !accountImageFailed ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={accountImage}
                        alt={accountEmail || accountName || "user"}
                        className="sf-ai-guided-step-two-avatar-image"
                        onError={() => setAccountImageFailed(true)}
                      />
                    ) : (
                      <span className="sf-ai-guided-step-two-avatar-fallback">
                        {accountAvatarLabel}
                      </span>
                    )}
                  </button>
                </header>

                {shouldShowGuestAiProgress ? (
                  <GuestAiPracticeProgress used={freePracticeUsageCount} />
                ) : null}

                <div className="sf-ai-guided-step-two-toolbar">
                  <button
                    type="button"
                    aria-label="返回AI引导表达第一页"
                    onClick={openAiGuidedExpressionStepOne}
                    className="sf-ai-guided-step-two-back"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M15 5 8 12l7 7M9 12h11" />
                    </svg>
                    <span>返回</span>
                  </button>

                  <div className="sf-ai-guided-step-two-mode">
                    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                      <path d="m25 5 4.6 11.4L41 21l-11.4 4.6L25 37l-4.6-11.4L9 21l11.4-4.6L25 5Z" />
                      <path d="m10 31 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
                    </svg>
                    <span>AI引导表达</span>
                  </div>
                </div>

                <section className="sf-ai-guided-step-two-hero">
                  <span aria-hidden="true" className="sf-ai-guided-step-two-ring" />
                  <span aria-hidden="true" className="sf-ai-guided-step-two-ring sf-ai-guided-step-two-ring-two" />
                  <span aria-hidden="true" className="sf-ai-guided-step-two-dot sf-ai-guided-step-two-dot-one" />
                  <span aria-hidden="true" className="sf-ai-guided-step-two-dot sf-ai-guided-step-two-dot-two" />
                  <span aria-hidden="true" className="sf-ai-guided-step-two-dot sf-ai-guided-step-two-dot-three" />
                  <span aria-hidden="true" className="sf-ai-guided-step-two-signal">
                    {[12, 22, 34, 44, 30, 20].map((height, index) => (
                      <span key={`guided-listening-signal-${index}`} style={{ height }} />
                    ))}
                  </span>
                  <h1>
                    正在听你<span>说话</span>...
                  </h1>
                  <p>
                    大胆表达你的想法，
                    <br />
                    <span>AI</span> 会一步步帮你优化
                  </p>
                </section>

                <div aria-hidden="true" className="sf-ai-guided-step-two-wave-field">
                  <span />
                  <span />
                  <span />
                </div>

                <section className="sf-ai-guided-step-two-tip">
                  <span aria-hidden="true" className="sf-ai-guided-step-two-tip-icon">
                    <svg viewBox="0 0 48 48" focusable="false">
                      <path d="M24 5a14 14 0 0 0-8 25.5c1.7 1.2 2.8 3 2.8 5.1h10.4c0-2.1 1.1-3.9 2.8-5.1A14 14 0 0 0 24 5Z" />
                      <path d="M19 40h10M20.5 44h7M14 12l-3-3M34 12l3-3M8 24H4M44 24h-4M24 4V0" />
                    </svg>
                  </span>
                  <span className="sf-ai-guided-step-two-tip-copy">
                    <strong>小提示</strong>
                    <span>尽量完整表达，你说得越多，</span>
                    <span>AI 给出的建议会越精准！</span>
                  </span>
                  <span aria-hidden="true" className="sf-ai-guided-step-two-tip-wave">
                    {[12, 20, 36, 54, 34, 18].map((height, index) => (
                      <span key={`guided-tip-wave-${index}`} style={{ height }} />
                    ))}
                  </span>
                </section>

                <section className="sf-ai-guided-step-two-record" aria-label="正在录音">
                  <span aria-hidden="true" className="sf-ai-guided-step-two-record-wave sf-ai-guided-step-two-record-wave-left" />
                  <button
                    type="button"
                    aria-label="结束录音"
                    onClick={handlePrimaryPracticeAction}
                    className="sf-ai-guided-step-two-mic"
                  >
                    <span className="sf-ai-guided-step-two-mic-ring" />
                    <span className="sf-ai-guided-step-two-mic-core">
                      <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                        <path d="M24 29a8 8 0 0 0 8-8v-8a8 8 0 0 0-16 0v8a8 8 0 0 0 8 8Z" />
                        <path d="M11 22a13 13 0 0 0 26 0M24 35v8M18 43h12" />
                      </svg>
                    </span>
                  </button>
                  <span aria-hidden="true" className="sf-ai-guided-step-two-record-wave sf-ai-guided-step-two-record-wave-right" />
                  <p>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                      <path d="M6 11h12v9H6z" />
                    </svg>
                    <span>点击麦克风结束录音</span>
                  </p>
                </section>
              </div>
              <button
                type="button"
                aria-label="Stop recording"
                onClick={handlePrimaryPracticeAction}
                className="sr-only"
              />
            </div>
          ) : null}

          {showGuidedReferenceConfirmation ? (
            <FreeStudyPageThree
              chineseText={nativeSpeech}
              headerAddon={
                shouldShowGuestAiProgress ? (
                  <GuestAiPracticeProgress used={freePracticeUsageCount} />
                ) : undefined
              }
              headingText="太棒了！ 你想表达的是："
              menuLabel="回到学习首页"
              variant="guided"
              onMenuClick={openLoggedInHomePage}
              accountLabel={accountCopy.openAccountMenu}
              onAccountClick={openAccountPage}
              avatarSrc={accountImage && !accountImageFailed ? accountImage : ""}
              avatarAlt={accountEmail || accountName || "user"}
              onAvatarError={() => setAccountImageFailed(true)}
              onEditChinese={updateNativeSpeechDraft}
              onRetryChinese={retryNativeSpeech}
              onStartEnglishPractice={confirmAiGuidedNativeSpeech}
            />
          ) : null}

          {showGuidedReferenceEnglishListening ? (
            <AiGuidedExpressionStepFour
              isRecordingEnglish={isListening}
              nativeSpeech={nativeSpeech}
              headerAddon={
                shouldShowGuestAiProgress ? (
                  <GuestAiPracticeProgress used={freePracticeUsageCount} />
                ) : undefined
              }
              menuLabel="回到学习首页"
              onMenuClick={openLoggedInHomePage}
              accountLabel={accountCopy.openAccountMenu}
              onAccountClick={openAccountPage}
              avatarSrc={accountImage && !accountImageFailed ? accountImage : ""}
              avatarAlt={accountEmail || accountName || "user"}
              onAvatarError={() => setAccountImageFailed(true)}
              onMicrophoneClick={handlePrimaryPracticeAction}
            />
          ) : null}

          {showGuidedReferenceResult ? (
            <AiGuidedExpressionStepFive
              userEnglishText={message}
              nextChineseText={guidedResultSuggestion}
              isLoadingNextChinese={isLoadingGuidedFollowup}
              expressions={referenceResultVariantTexts}
              selectedExpressionIndex={selectedExpressionIndex}
              headerAddon={
                shouldShowGuestAiProgress ? (
                  <GuestAiPracticeProgress used={freePracticeUsageCount} />
                ) : undefined
              }
              menuLabel="回到学习首页"
              onMenuClick={openLoggedInHomePage}
              accountLabel={accountCopy.openAccountMenu}
              onAccountClick={openAccountPage}
              avatarSrc={accountImage && !accountImageFailed ? accountImage : ""}
              avatarAlt={accountEmail || accountName || "user"}
              onAvatarError={() => setAccountImageFailed(true)}
              onRetryEnglish={openAiGuidedStepFourForRetry}
              onUseNextChinese={startAiGuidedSuggestedRound}
              onChangeNextChinese={requestAnotherGuidedFollowup}
              onPlayExpression={readReferenceResultVariant}
              onSelectExpression={setSelectedExpressionIndex}
              onFollowPractice={openAiGuidedStepFourForRetry}
              onSlowPlayback={() =>
                readReferenceResultVariant(selectedExpressionIndex, SLOW_READ_RATE)
              }
              renderExpressionText={(text) => renderReferenceResultText(text)}
              renderUserExpressionText={(text) => renderReferenceResultText(text)}
            />
          ) : null}

          {false && showGuidedReferenceResult ? (
            <div className="sf-guided-practice-reference-result absolute inset-0 z-[90] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/guided-practice-result-reference.png"
                alt=""
                className="h-full w-full select-none object-fill"
                draggable={false}
              />
              <div className="pointer-events-none hidden absolute left-[8%] top-[15.8%] z-[95] w-[72%] bg-[#f7fbff]/95 py-1 text-left shadow-[0_0_24px_24px_rgba(247,251,255,0.9)]">
                <p
                  lang="en"
                  className="whitespace-normal break-words text-[clamp(0.92rem,3vw,1.22rem)] font-medium leading-[1.34] text-[#07113f]"
                >
                  {message}
                </p>
              </div>
              <div className="pointer-events-none hidden absolute left-[8.6%] top-[29.1%] z-[95] h-[8.3%] w-[59%] items-center overflow-hidden bg-[#f7fbff] text-left shadow-[0_0_24px_24px_rgba(247,251,255,0.92)]">
                <p
                  lang="en"
                  className="line-clamp-3 overflow-hidden break-words text-[clamp(1.2rem,4.6vw,2rem)] font-black leading-[1.16] text-[#07113f]"
                >
                  {renderReferenceResultText(referenceResultVariantTexts[0])}
                </p>
              </div>
              {referenceResultVariantTexts.map((text, index) => {
                const topPositions = ["47.2%", "57.8%", "67.4%", "77%"];

                return (
                  <div
                    key={`guided-reference-result-text-${index}-${text}`}
                    className="pointer-events-none hidden absolute left-[16%] z-[95] h-[5.6%] w-[57%] items-center overflow-hidden bg-[#f7fbff] text-left shadow-[0_0_20px_20px_rgba(247,251,255,0.94)]"
                    style={{ top: topPositions[index] }}
                  >
                    <p
                      lang="en"
                      className="line-clamp-2 overflow-hidden break-words text-[clamp(0.96rem,3.45vw,1.42rem)] font-black leading-[1.16] text-[#07113f]"
                    >
                      {renderReferenceResultText(text)}
                    </p>
                  </div>
                );
              })}
              <div className="hidden absolute inset-x-[4.8%] bottom-[18.8%] top-[23.2%] z-[97] overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex flex-col gap-3 pb-4">
                  <div className="rounded-[24px] border border-[#9dbdff] bg-[#f7fbff]/98 px-5 py-4 text-left shadow-[0_12px_28px_rgba(43,118,231,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]">
                    <p className="text-[clamp(0.78rem,2.5vw,0.95rem)] font-black leading-tight text-[#2b7cff]">
                      下一步你可以这样表达
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <p
                        lang="en"
                        className="min-w-0 flex-1 whitespace-normal break-words text-[clamp(1.08rem,3.8vw,1.55rem)] font-black leading-[1.18] text-[#07113f]"
                      >
                        {renderReferenceResultText(referenceResultVariantTexts[0])}
                      </p>
                      <button
                        type="button"
                        aria-label="播放下一步表达"
                        onClick={() => readReferenceResultVariant(0, 1)}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#0b62df] shadow-[0_10px_24px_rgba(64,112,190,0.14),inset_0_1px_0_rgba(255,255,255,0.96)]"
                      >
                        <PlayIcon className="h-4 w-4 translate-x-[1px]" />
                      </button>
                    </div>
                  </div>
                  {referenceResultVariantTexts.map((text, index) => {
                    const labelColorClasses = [
                      "text-[#2b7cff]",
                      "text-[#21a65e]",
                      "text-[#2b7cff]",
                      "text-[#7d61e8]",
                    ];
                    const label = expressionVariantLabels[index]?.label || "";

                    return (
                      <div
                        key={`guided-reference-result-row-${index}-${text}`}
                        className="rounded-[20px] bg-[#f7fbff]/98 px-5 py-3 text-left shadow-[0_10px_24px_rgba(64,112,190,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[clamp(0.68rem,2.25vw,0.82rem)] font-black leading-tight ${labelColorClasses[index]}`}
                            >
                              {label}
                            </p>
                            <p
                              lang="en"
                              className="mt-1 whitespace-normal break-words text-[clamp(0.96rem,3.2vw,1.28rem)] font-black leading-[1.18] text-[#07113f]"
                            >
                              {renderReferenceResultText(text)}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label={`播放${label || "表达"}`}
                            onClick={() => readReferenceResultVariant(index, 1)}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#0b62df] shadow-[0_10px_24px_rgba(64,112,190,0.12),inset_0_1px_0_rgba(255,255,255,0.96)]"
                          >
                            <PlayIcon className="h-3.5 w-3.5 translate-x-[1px]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {vocabularyNotice ? (
                <p className="pointer-events-none absolute inset-x-[8%] bottom-[19.2%] z-[96] text-center text-[clamp(0.78rem,2.5vw,0.96rem)] font-black text-[#1269e6]">
                  {vocabularyNotice}
                </p>
              ) : null}
              <button
                type="button"
                aria-label="Back"
                onClick={openTrainingGroundMode}
                className="absolute left-[4.4%] top-[3.2%] z-[92] h-[5.8%] w-[18%] rounded-[28px] border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label={accountCopy.openAccountMenu}
                onClick={openReferenceAccountMenu}
                className="absolute right-[5.8%] top-[3.2%] z-[92] h-[6%] w-[12.5%] rounded-full border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label="Try English again"
                onClick={retryEnglishSpeech}
                className="absolute right-[10.5%] top-[16%] z-[92] h-[4.8%] w-[21%] rounded-[22px] border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label="Play main expression"
                onClick={() => readReferenceResultVariant(0, 1)}
                className="absolute right-[17.5%] top-[35.3%] z-[92] h-[5.5%] w-[8.8%] rounded-full border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label="Read main expression"
                onClick={() => readReferenceResultVariant(0, 1)}
                className="absolute right-[7.1%] top-[35.3%] z-[92] h-[5.5%] w-[8.8%] rounded-full border-0 bg-transparent"
              />
              {referenceResultVariantTexts.map((_, index) => {
                const hitZones = [
                  { top: "45.7%", height: "8.5%" },
                  { top: "56.3%", height: "8.5%" },
                  { top: "65.9%", height: "8.5%" },
                  { top: "75.5%", height: "8.5%" },
                ];
                const hitZone = hitZones[index];

                if (!hitZone) return null;

                return (
                  <button
                    key={`guided-reference-result-play-${index}`}
                    type="button"
                    aria-label={`Play ${
                      expressionVariantLabels[index]?.label || "expression"
                    }`}
                    onClick={() => readReferenceResultVariant(index, 1)}
                    className="absolute left-[4.5%] z-[91] w-[91%] rounded-[24px] border-0 bg-transparent"
                    style={{ top: hitZone.top, height: hitZone.height }}
                  />
                );
              })}
              <button
                type="button"
                aria-label="Start recording"
                onClick={handlePrimaryPracticeAction}
                className="absolute bottom-[4.9%] left-1/2 z-[92] h-[12.5%] w-[26%] -translate-x-1/2 rounded-full border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label="Follow practice"
                onClick={handlePrimaryPracticeAction}
                className="absolute bottom-[6.7%] left-[10.3%] z-[92] h-[7.8%] w-[16.5%] rounded-[20px] border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label="Slow playback"
                onClick={() => readReferenceResultVariant(0, SLOW_READ_RATE)}
                className="absolute bottom-[6.7%] right-[10.3%] z-[92] h-[7.8%] w-[16.5%] rounded-[20px] border-0 bg-transparent"
              />
              <div className="absolute inset-0 z-[99] pointer-events-none">
                <div className="absolute inset-x-0 top-0 z-[102] h-[14.6%] bg-[linear-gradient(180deg,rgba(248,252,255,0.98)_0%,rgba(244,250,255,0.96)_100%)] shadow-[0_12px_28px_rgba(64,112,190,0.08)]">
                  <div className="absolute left-[5.3%] top-[12%] grid h-[42%] aspect-square place-items-center rounded-[24px] bg-white shadow-[0_14px_28px_rgba(64,112,190,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]">
                    <span className="relative block h-4 w-5 before:absolute before:left-0 before:top-0 before:h-[2px] before:w-5 before:rounded-full before:bg-[#07113f] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-5 after:rounded-full after:bg-[#07113f]">
                      <span className="absolute left-0 top-1/2 h-[2px] w-5 -translate-y-1/2 rounded-full bg-[#07113f]" />
                    </span>
                  </div>

                  <div className="absolute left-1/2 top-[13%] flex -translate-x-1/2 items-center gap-3">
                    <div className="grid h-[3.15rem] w-[3.15rem] place-items-center rounded-[16px] bg-white shadow-[0_14px_28px_rgba(64,112,190,0.1)]">
                      <SpeakFlowBrandMark />
                    </div>
                    <div className="text-left">
                      <p className="font-[var(--font-sora)] text-[clamp(1.55rem,6vw,2.45rem)] font-black leading-none tracking-[-0.01em] text-[#07113f]">
                        SpeakFlow
                      </p>
                      <p className="mt-1 text-[clamp(0.55rem,2.2vw,0.78rem)] font-black uppercase tracking-[0.22em] text-[#7b61ff]">
                        AI VOICE PRACTICE
                      </p>
                    </div>
                  </div>

                  <div className="absolute right-[5.2%] top-[13%] h-[42%] aspect-square rounded-full border-[3px] border-white bg-[#dff7e8] shadow-[0_14px_28px_rgba(64,112,190,0.12)]">
                    {accountImage && !accountImageFailed ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={accountImage}
                        alt={accountEmail || "user"}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#dff7e8,#aee8a4)] text-[0.9rem] font-black text-[#2b7b42]">
                        {accountAvatarLabel}
                      </span>
                    )}
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2px] border-white bg-[#20c85a]" />
                  </div>

                  <div className="absolute inset-x-[3.8%] bottom-[6%] h-[31%] rounded-[24px] border border-[#d8ddff] bg-white/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <div className="absolute left-[1.2%] top-1/2 flex h-[78%] -translate-y-1/2 items-center gap-2 rounded-[18px] bg-white/84 px-4 text-[#07113f] shadow-[0_10px_22px_rgba(64,112,190,0.08)]">
                      <span className="text-[1.35rem] leading-none">‹</span>
                      <span className="text-[clamp(0.9rem,3.1vw,1.12rem)] font-black">
                        返回
                      </span>
                    </div>
                    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 text-[#7b61ff]">
                      <span className="text-[1.25rem]">✦</span>
                      <span className="whitespace-nowrap text-[clamp(1.05rem,4vw,1.5rem)] font-black">
                        AI引导表达
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="打开菜单"
                  onClick={togglePracticeMenu}
                  className="pointer-events-auto absolute left-[5.3%] top-[1.75%] z-[103] h-[5.5%] w-[12%] rounded-full border-0 bg-transparent"
                />
                <button
                  type="button"
                  aria-label={accountCopy.openAccountMenu}
                  onClick={openReferenceAccountMenu}
                  className="pointer-events-auto absolute right-[5.2%] top-[1.75%] z-[103] h-[5.5%] w-[12%] rounded-full border-0 bg-transparent"
                />
                <button
                  type="button"
                  aria-label="返回 AI 引导表达首页"
                  onClick={openTrainingGroundMode}
                  className="pointer-events-auto absolute left-[4%] top-[10.1%] z-[103] h-[3.7%] w-[17.5%] rounded-full border-0 bg-transparent"
                />

                <div className="absolute left-[8.1%] top-[18.6%] w-[61%] bg-[#f7fbff]/95 py-1 text-left shadow-[0_0_20px_20px_rgba(247,251,255,0.9)]">
                  <p
                    lang="en"
                    className="whitespace-normal break-words text-[clamp(0.96rem,3vw,1.22rem)] font-medium leading-[1.32] text-[#07113f]"
                  >
                    {message}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="重新说"
                  onClick={retryEnglishSpeech}
                  className="pointer-events-auto absolute right-[8.8%] top-[18.6%] h-[4.1%] w-[17.8%] rounded-full border-0 bg-transparent"
                />

                <div className="pointer-events-auto absolute inset-x-[4.2%] top-[23.6%] z-[101] min-h-[28.8%] rounded-[24px] border border-[#cfe0ff] bg-[#f7fbff]/98 px-[5.5%] py-[4.4%] text-left shadow-[0_18px_34px_rgba(64,112,190,0.12),inset_0_1px_0_rgba(255,255,255,0.96)]">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-[clamp(0.98rem,3.15vw,1.25rem)] font-black leading-none text-[#2d72ff]">
                      下一句，可以这样说
                    </p>
                    <div
                      aria-hidden="true"
                      className="relative grid h-14 w-16 shrink-0 place-items-center rounded-[24px] bg-white/85 shadow-[0_10px_24px_rgba(64,112,190,0.1)]"
                    >
                      <span className="grid h-9 w-12 place-items-center rounded-[18px] bg-[#07113f] text-[0.95rem] font-black leading-none text-[#34d7ff]">
                        ••
                      </span>
                      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#7b61ff]" />
                      <span className="absolute bottom-3 left-2 h-1.5 w-1.5 rounded-full bg-[#b9d4ff]" />
                    </div>
                  </div>
                  <p
                    lang="zh-CN"
                    className="mt-4 whitespace-normal break-words text-[clamp(1.55rem,5.8vw,2.55rem)] font-black leading-[1.22] text-[#07113f]"
                  >
                    {isLoadingGuidedFollowup
                      ? "正在为你准备下一句..."
                      : guidedResultSuggestion}
                  </p>
                  <p className="mt-4 text-[clamp(0.82rem,2.7vw,1.02rem)] font-semibold leading-[1.45] text-[#4d5d8a]">
                    AI 根据上下文和你的情绪，为你推荐的下一句中文
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["根据上文", "情绪自然", "可继续表达"].map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-[#ede9ff] px-3 py-1 text-[clamp(0.72rem,2.3vw,0.86rem)] font-black text-[#6b5fd6]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-[1.6fr_1fr] gap-3">
                    <button
                      type="button"
                      aria-label="用这句练习"
                      onClick={handlePrimaryPracticeAction}
                      className="rounded-[18px] bg-[linear-gradient(135deg,#7b61ff,#1f74ff)] px-4 py-3 text-[clamp(0.9rem,3vw,1.12rem)] font-black text-white shadow-[0_14px_28px_rgba(64,92,220,0.24)]"
                    >
                      用这句练习
                    </button>
                    <button
                      type="button"
                      aria-label="换一句"
                      onClick={requestAnotherGuidedFollowup}
                      className="rounded-[18px] bg-white px-4 py-3 text-[clamp(0.86rem,2.85vw,1.05rem)] font-black text-[#4d5d8a] shadow-[0_12px_24px_rgba(64,112,190,0.1),inset_0_1px_0_rgba(255,255,255,0.96)]"
                    >
                      换一句
                    </button>
                  </div>
                </div>

                <div className="absolute left-[8.7%] top-[31%] w-[70%] bg-[#f7fbff]/95 py-1 text-left shadow-[0_0_24px_24px_rgba(247,251,255,0.9)]">
                  <p
                    lang="zh-CN"
                    className="whitespace-normal break-words text-[clamp(1.3rem,5vw,2.2rem)] font-black leading-[1.28] text-[#07113f]"
                  >
                    {isLoadingGuidedFollowup
                      ? "正在为你准备下一句..."
                      : guidedResultSuggestion}
                  </p>
                </div>
                <div className="absolute left-[8.8%] top-[42.3%] w-[72%] bg-[#f7fbff]/95 py-1 text-left shadow-[0_0_18px_18px_rgba(247,251,255,0.88)]">
                  <p className="text-[clamp(0.78rem,2.55vw,0.98rem)] font-semibold leading-[1.45] text-[#4d5d8a]">
                    AI 根据上下文和你的情绪，为你推荐的下一句中文
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="用这句练习"
                  onClick={handlePrimaryPracticeAction}
                  className="pointer-events-auto absolute left-[8.9%] top-[45.4%] h-[4.7%] w-[49.3%] rounded-[18px] border-0 bg-transparent"
                />
                <button
                  type="button"
                  aria-label="换一句"
                  onClick={requestAnotherGuidedFollowup}
                  className="pointer-events-auto absolute right-[8.9%] top-[45.4%] h-[4.7%] w-[31.8%] rounded-[18px] border-0 bg-transparent"
                />

                <div className="pointer-events-auto absolute inset-x-[4.2%] bottom-[14.1%] top-[54.8%] overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex flex-col gap-[0.75rem] pb-3">
                    {referenceResultVariantTexts.map((text, index) => {
                      const labels = [
                        "最自然地道",
                        "更地道",
                        "更简单",
                        "更口语",
                      ];
                      const iconGlyphs = ["★", "●", "◒", "•••"];
                      const iconClasses = [
                        "bg-[#765cff] text-white",
                        "bg-[#dff7e8] text-[#20b760]",
                        "bg-[#e1f0ff] text-[#2d72ff]",
                        "bg-[#ece6ff] text-[#8261f0]",
                      ];
                      const labelClasses = [
                        "text-[#2d72ff]",
                        "text-[#1bb75a]",
                        "text-[#2d72ff]",
                        "text-[#8261f0]",
                      ];

                      return (
                        <div
                          key={`guided-result-reference-row-${index}-${text}`}
                          className="relative rounded-[20px] bg-[#f7fbff]/96 py-3 pl-[11.2%] pr-[3.2%] text-left shadow-[0_10px_24px_rgba(64,112,190,0.08),inset_0_1px_0_rgba(255,255,255,0.94)]"
                        >
                          <div
                            aria-hidden="true"
                            className={`absolute left-[3.2%] top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-[0.78rem] font-black shadow-[0_10px_24px_rgba(64,112,190,0.1)] ${iconClasses[index]}`}
                          >
                            {iconGlyphs[index]}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-[clamp(0.68rem,2.2vw,0.82rem)] font-black leading-none ${labelClasses[index]}`}
                              >
                                {labels[index]}
                              </p>
                              <p
                                lang="en"
                                className="mt-2 whitespace-normal break-words text-[clamp(0.9rem,2.85vw,1.08rem)] font-semibold leading-[1.28] text-[#07113f]"
                              >
                                {renderReferenceResultText(text)}
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-label={`播放${labels[index]}`}
                              onClick={() => readReferenceResultVariant(index, 1)}
                              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#0b62df] shadow-[0_10px_24px_rgba(64,112,190,0.12),inset_0_1px_0_rgba(255,255,255,0.96)]"
                            >
                              <PlayIcon className="h-3.5 w-3.5 translate-x-[1px]" />
                            </button>
                            <button
                              type="button"
                              aria-label={`朗读${labels[index]}`}
                              onClick={() => readReferenceResultVariant(index, 1)}
                              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#0b62df] shadow-[0_10px_24px_rgba(64,112,190,0.12),inset_0_1px_0_rgba(255,255,255,0.96)]"
                            >
                              <SoundWaveIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="跟读练习"
                  onClick={handlePrimaryPracticeAction}
                  className="pointer-events-auto absolute bottom-[2.8%] left-[8.8%] h-[6.2%] w-[18.4%] rounded-[18px] border-0 bg-transparent"
                />
                <button
                  type="button"
                  aria-label="开始录音"
                  onClick={handlePrimaryPracticeAction}
                  className="pointer-events-auto absolute bottom-[1.8%] left-1/2 h-[9.2%] w-[20%] -translate-x-1/2 rounded-full border-0 bg-transparent"
                />
                <button
                  type="button"
                  aria-label="0.5x 倍速"
                  onClick={() => readReferenceResultVariant(0, SLOW_READ_RATE)}
                  className="pointer-events-auto absolute bottom-[2.8%] right-[8.7%] h-[6.2%] w-[20%] rounded-[18px] border-0 bg-transparent"
                />
                <div className="pointer-events-auto absolute inset-0 z-[130] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/guided-practice-result-reference.png"
                    alt=""
                    className="h-full w-full select-none object-fill"
                    draggable={false}
                  />

                  <div className="pointer-events-none absolute left-[8.4%] top-[20.8%] w-[60%] bg-[#f8fbff]/95 py-1 text-left shadow-[0_0_18px_18px_rgba(248,251,255,0.9)]">
                    <p
                      lang="en"
                      className="whitespace-normal break-words text-[clamp(0.98rem,3.35vw,1.28rem)] font-semibold leading-[1.32] text-[#07113f]"
                    >
                      {message}
                    </p>
                  </div>

                  <div className="pointer-events-none absolute left-[8.8%] top-[32.8%] w-[61%] bg-[#f8fbff]/94 py-1 text-left shadow-[0_0_22px_22px_rgba(248,251,255,0.88)]">
                    <p
                      lang="zh-CN"
                      className="whitespace-normal break-words text-[clamp(1.45rem,5.6vw,2.45rem)] font-black leading-[1.22] text-[#07113f]"
                    >
                      {isLoadingGuidedFollowup
                        ? "正在为你准备下一句..."
                        : guidedResultSuggestion}
                    </p>
                  </div>

                  <div className="pointer-events-none absolute left-[14.2%] top-[64.15%] w-[56%] bg-[#f8fbff]/94 text-left shadow-[0_0_14px_14px_rgba(248,251,255,0.9)]">
                    <p
                      lang="en"
                      className="line-clamp-2 whitespace-normal break-words text-[clamp(0.78rem,2.8vw,1rem)] font-semibold leading-[1.24] text-[#07113f]"
                    >
                      {renderReferenceResultText(referenceResultVariantTexts[0])}
                    </p>
                  </div>
                  <div className="pointer-events-none absolute left-[14.2%] top-[70.9%] w-[56%] bg-[#f8fbff]/94 text-left shadow-[0_0_14px_14px_rgba(248,251,255,0.9)]">
                    <p
                      lang="en"
                      className="line-clamp-2 whitespace-normal break-words text-[clamp(0.78rem,2.8vw,1rem)] font-semibold leading-[1.24] text-[#07113f]"
                    >
                      {renderReferenceResultText(referenceResultVariantTexts[1])}
                    </p>
                  </div>
                  <div className="pointer-events-none absolute left-[14.2%] top-[77.5%] w-[56%] bg-[#f8fbff]/94 text-left shadow-[0_0_14px_14px_rgba(248,251,255,0.9)]">
                    <p
                      lang="en"
                      className="line-clamp-2 whitespace-normal break-words text-[clamp(0.78rem,2.8vw,1rem)] font-semibold leading-[1.24] text-[#07113f]"
                    >
                      {renderReferenceResultText(referenceResultVariantTexts[2])}
                    </p>
                  </div>
                  <div className="pointer-events-none absolute left-[14.2%] top-[84.2%] w-[56%] bg-[#f8fbff]/94 text-left shadow-[0_0_14px_14px_rgba(248,251,255,0.9)]">
                    <p
                      lang="en"
                      className="line-clamp-2 whitespace-normal break-words text-[clamp(0.78rem,2.8vw,1rem)] font-semibold leading-[1.24] text-[#07113f]"
                    >
                      {renderReferenceResultText(referenceResultVariantTexts[3])}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="打开菜单"
                    onClick={togglePracticeMenu}
                    className="absolute left-[5.4%] top-[1.6%] h-[5.3%] w-[11.5%] rounded-full border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label={accountCopy.openAccountMenu}
                    onClick={openReferenceAccountMenu}
                    className="absolute right-[5.2%] top-[1.6%] h-[5.3%] w-[11.5%] rounded-full border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="返回 AI 引导表达首页"
                    onClick={openTrainingGroundMode}
                    className="absolute left-[4.4%] top-[8.8%] h-[4%] w-[17%] rounded-full border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="重新说"
                    onClick={retryEnglishSpeech}
                    className="absolute right-[8.8%] top-[20.8%] h-[4%] w-[17.8%] rounded-full border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="用这句练习"
                    onClick={handlePrimaryPracticeAction}
                    className="absolute left-[8.7%] top-[49.2%] h-[5.1%] w-[49.8%] rounded-[18px] border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="换一句"
                    onClick={requestAnotherGuidedFollowup}
                    className="absolute right-[8.6%] top-[49.2%] h-[5.1%] w-[32%] rounded-[18px] border-0 bg-transparent"
                  />

                  {[0, 1, 2, 3].map((index) => {
                    const rowTops = ["61.5%", "68.25%", "74.9%", "81.6%"];

                    return (
                      <div key={`guided-result-final-actions-${index}`}>
                        <button
                          type="button"
                          aria-label={`播放表达 ${index + 1}`}
                          onClick={() => readReferenceResultVariant(index, 1)}
                          className="absolute right-[14.8%] h-[4.2%] w-[8.4%] rounded-full border-0 bg-transparent"
                          style={{ top: rowTops[index] }}
                        />
                        <button
                          type="button"
                          aria-label={`朗读表达 ${index + 1}`}
                          onClick={() => readReferenceResultVariant(index, 1)}
                          className="absolute right-[5.8%] h-[4.2%] w-[8.4%] rounded-full border-0 bg-transparent"
                          style={{ top: rowTops[index] }}
                        />
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    aria-label="跟读练习"
                    onClick={handlePrimaryPracticeAction}
                    className="absolute bottom-[2.8%] left-[8.8%] h-[6.2%] w-[18.5%] rounded-[18px] border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="开始录音"
                    onClick={handlePrimaryPracticeAction}
                    className="absolute bottom-[1.7%] left-1/2 h-[9.5%] w-[20.5%] -translate-x-1/2 rounded-full border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="0.5x 倍速"
                    onClick={() => readReferenceResultVariant(0, SLOW_READ_RATE)}
                    className="absolute bottom-[2.8%] right-[8.7%] h-[6.2%] w-[20%] rounded-[18px] border-0 bg-transparent"
                  />
                </div>
              </div>

              <div className="absolute inset-0 z-[300] overflow-hidden bg-[image:var(--app-bg-gradient)] text-[var(--text-primary)]">
                <div className="pointer-events-none absolute inset-0">
                  <span className="absolute left-[-18%] top-[24%] h-[32rem] w-[32rem] rounded-full border border-[#cfe0ff]/42" />
                  <span className="absolute left-[14%] top-[28%] h-[22rem] w-[22rem] rounded-full border border-[#dbe8ff]/48" />
                  <span className="absolute right-[-26%] top-[28%] h-[22rem] w-[22rem] rounded-full bg-[#eaf4ff]/42 blur-3xl" />
                  <span className="absolute bottom-[-12%] left-[-12%] h-[22rem] w-[22rem] rounded-full bg-[#f2f7ff]/74 blur-3xl" />
                </div>

                <header className="absolute inset-x-0 top-0 z-30 h-[9.8rem]">
                  <div className="absolute inset-x-[3.8%] top-[0.9rem] h-[4.2rem]">
                    <button
                      type="button"
                      aria-label="打开菜单"
                      onClick={togglePracticeMenu}
                      className="absolute left-0 top-1/2 grid h-[3.35rem] w-[3.35rem] -translate-y-1/2 place-items-center rounded-[21px] bg-white/86 text-[#07113f] shadow-[0_16px_30px_rgba(64,112,190,0.1),inset_0_1px_0_rgba(255,255,255,0.95)]"
                    >
                      <span className="relative block h-[1.05rem] w-[1.45rem] before:absolute before:left-0 before:top-0 before:h-[2px] before:w-full before:rounded-full before:bg-current after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-full after:bg-current">
                        <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-current" />
                      </span>
                    </button>

                    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3">
                      <div className="grid h-[3rem] w-[3rem] place-items-center rounded-[15px] bg-white shadow-[0_14px_28px_rgba(64,112,190,0.12)]">
                        <SpeakFlowBrandMark />
                      </div>
                      <div className="text-left">
                        <p className="font-[var(--font-sora)] text-[clamp(1.45rem,5.2vw,2.05rem)] font-black leading-[1.04] tracking-[-0.01em] text-[#07113f]">
                          SpeakFlow
                        </p>
                        <p className="mt-0.5 text-[clamp(0.5rem,1.8vw,0.7rem)] font-black uppercase tracking-[0.22em] text-[#7b61ff]">
                          AI VOICE PRACTICE
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label={accountCopy.openAccountMenu}
                      onClick={openReferenceAccountMenu}
                      className="absolute right-0 top-1/2 h-[3.35rem] w-[3.35rem] -translate-y-1/2 rounded-full border-[3px] border-white bg-[#dff7e8] shadow-[0_16px_30px_rgba(64,112,190,0.12)]"
                    >
                      {accountImage && !accountImageFailed ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={accountImage}
                          alt={accountEmail || "user"}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#e9ffe9,#b8ecaa)] text-[0.9rem] font-black text-[#2b7b42]">
                          {accountAvatarLabel}
                        </span>
                      )}
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2px] border-white bg-[#20c85a]" />
                    </button>
                  </div>

                  <div className="absolute inset-x-[3.8%] bottom-[0.5rem] h-[2.95rem] rounded-[24px] border border-[#d8ddff] bg-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_24px_rgba(64,112,190,0.06)] backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={openTrainingGroundMode}
                      className="absolute left-[1.2%] top-1/2 flex h-[76%] -translate-y-1/2 items-center gap-2 rounded-[18px] bg-white/86 px-4 text-[#07113f] shadow-[0_10px_22px_rgba(64,112,190,0.08)]"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                      <span className="text-[clamp(0.82rem,2.8vw,1rem)] font-black">
                        返回
                      </span>
                    </button>
                    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 text-[#7b61ff]">
                      <span aria-hidden="true" className="text-[1.35rem] leading-none">
                        ✦
                      </span>
                      <span className="whitespace-nowrap text-[clamp(1rem,3.6vw,1.32rem)] font-black">
                        AI引导表达
                      </span>
                    </div>
                  </div>
                </header>

                <main className="absolute inset-x-[3.8%] bottom-[7.55rem] top-[10rem] z-20 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <section className="rounded-[24px] bg-white/78 px-[5%] py-[3.8%] text-left shadow-[0_16px_36px_rgba(64,112,190,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-[clamp(0.82rem,2.7vw,1rem)] font-black text-[#273b78]">
                        <span>你的表达</span>
                        <span className="flex h-5 items-center gap-0.5 text-[#2f7cff]">
                          {[0.45, 0.72, 1, 0.72, 0.45].map((scale, index) => (
                            <span
                              key={`guided-user-wave-${index}`}
                              className="block w-1 rounded-full bg-current"
                              style={{ height: `${0.9 + scale * 0.7}rem` }}
                            />
                          ))}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={retryEnglishSpeech}
                        className="flex shrink-0 items-center gap-1.5 rounded-[14px] border border-[#dfe8ff] bg-white/72 px-3 py-2 text-[clamp(0.72rem,2.35vw,0.86rem)] font-black text-[#66719d] shadow-[0_8px_18px_rgba(64,112,190,0.07)]"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.4"
                        >
                          <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                          <path d="M20 4v6h-6" />
                        </svg>
                        重新说
                      </button>
                    </div>
                    <p
                      lang="en"
                      className="mt-3 whitespace-normal break-words text-[clamp(0.98rem,3.35vw,1.22rem)] font-medium leading-[1.42] text-[#07113f]"
                    >
                      {message}
                    </p>
                  </section>

                  <section className="relative mt-4 rounded-[24px] border border-[#bdd5ff] bg-white/62 px-[5%] py-[4.6%] text-left shadow-[0_16px_36px_rgba(64,112,190,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl">
                    <div
                      aria-hidden="true"
                      className="absolute right-[7%] top-[8%] grid h-[clamp(3.2rem,13vw,4.3rem)] w-[clamp(3.7rem,15vw,5rem)] place-items-center rounded-[24px] bg-white shadow-[0_12px_24px_rgba(64,112,190,0.1)]"
                    >
                      <span className="relative grid h-[2.15rem] w-[3.2rem] place-items-center rounded-[17px] bg-[#07113f] text-[#35d7ff]">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        </span>
                        <span className="absolute bottom-1.5 h-1 w-3 rounded-full bg-current opacity-80" />
                      </span>
                      <span className="absolute -right-2 top-0 text-[#8b6dff]">✦</span>
                      <span className="absolute -left-2 bottom-1 text-[#c9d7ff]">✦</span>
                    </div>
                    <p className="flex items-center gap-2 pr-[24%] text-[clamp(0.88rem,2.85vw,1.08rem)] font-black text-[#2f7cff]">
                      <span aria-hidden="true" className="text-[1.3rem] leading-none">
                        ✦
                      </span>
                      下一句，可以这样说
                    </p>
                    <p
                      lang="zh-CN"
                      className="mt-4 max-w-[75%] whitespace-normal break-words text-[clamp(1.42rem,4.65vw,2.05rem)] font-black leading-[1.24] text-[#07113f]"
                    >
                      {isLoadingGuidedFollowup
                        ? "正在为你准备下一句..."
                        : guidedResultSuggestion}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {["根据上文", "情绪自然", "可继续表达"].map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-[#ede9ff] px-3 py-1.5 text-[clamp(0.74rem,2.35vw,0.9rem)] font-black text-[#6b5fd6]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 grid grid-cols-[1.45fr_0.95fr] gap-3">
                      <button
                        type="button"
                        onClick={handlePrimaryPracticeAction}
                        className="flex min-h-[3.1rem] items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#7b61ff,#1f74ff)] px-4 text-[clamp(0.9rem,2.9vw,1.06rem)] font-black text-white shadow-[0_16px_30px_rgba(64,92,220,0.24)] transition active:scale-[0.98] [color:white]"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                        >
                          <path d="M12 4.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3Z" />
                          <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" />
                        </svg>
                        用这句练习
                      </button>
                      <button
                        type="button"
                        onClick={requestAnotherGuidedFollowup}
                        className="flex min-h-[3.1rem] items-center justify-center gap-2 rounded-[18px] bg-white/84 px-4 text-[clamp(0.86rem,2.8vw,1rem)] font-black text-[#4d5d8a] shadow-[0_12px_24px_rgba(64,112,190,0.1),inset_0_1px_0_rgba(255,255,255,0.96)] transition active:scale-[0.98]"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.4"
                        >
                          <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                          <path d="M20 4v6h-6" />
                        </svg>
                        换一句
                      </button>
                    </div>
                  </section>

                  <h3 className="mt-4 flex items-center gap-2 px-2 text-[clamp(0.84rem,2.75vw,1rem)] font-black text-[#273b78]">
                    <span className="flex h-5 items-end gap-1 text-[#6f72b4]">
                      <span className="h-2 w-[3px] rounded-full bg-current" />
                      <span className="h-4 w-[3px] rounded-full bg-current" />
                      <span className="h-3 w-[3px] rounded-full bg-current" />
                    </span>
                    表达训练记录
                  </h3>

                  <div className="mt-3 flex flex-col gap-2.5 pb-4">
                    {referenceResultVariantTexts.map((text, index) => {
                      const labels = [
                        "最自然地道",
                        "更地道",
                        "更简单",
                        "更口语",
                      ];
                      const labelClasses = [
                        "text-[#735cff]",
                        "text-[#31a86b]",
                        "text-[#3478d8]",
                        "text-[#8065e8]",
                      ];
                      const iconClasses = [
                        "bg-[#f0edff] text-[#765cff]",
                        "bg-[#dff7e8] text-[#20b760]",
                        "bg-[#e2efff] text-[#3478d8]",
                        "bg-[#ece6ff] text-[#8065e8]",
                      ];
                      const accentClasses = [
                        "border-[#8b7cff]",
                        "border-transparent",
                        "border-transparent",
                        "border-transparent",
                      ];

                      return (
                        <article
                          key={`guided-real-result-row-${index}-${text}`}
                          className={`relative rounded-[18px] border bg-[#fbfaff] px-4 py-3 text-left shadow-[0_10px_24px_rgba(84,72,146,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] ${accentClasses[index]}`}
                        >
                          <div className="grid grid-cols-[2.85rem_1fr_auto] items-center gap-3">
                          <div
                            aria-hidden="true"
                            className={`grid h-10 w-10 shrink-0 place-items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_18px_rgba(84,72,146,0.08)] ${index === 0 ? "rounded-none bg-transparent text-white shadow-none" : `rounded-full ${iconClasses[index]}`}`}
                          >
                            {index === 0 ? (
                              <span className="relative block h-10 w-8 rounded-t-[5px] bg-[linear-gradient(180deg,#8e72ff_0%,#654cff_100%)] shadow-[0_8px_16px_rgba(118,92,255,0.26)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]">
                                <span className="absolute left-1/2 top-2 h-3.5 w-3.5 -translate-x-1/2 bg-white text-[0px] [clip-path:polygon(50%_0,61%_35%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_35%)]">
                                  ★
                                </span>
                              </span>
                            ) : index === 1 ? (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                                fill="currentColor"
                              >
                                <path d="M5.5 13.6c5.8.2 9.8-3.1 12.1-8.6 2.1 6.2-.3 12.7-6.8 14.1-2.1.5-4 .1-5.8-.9 2.1-.5 4.3-1.6 6.2-3.6-2.1 1.1-4.1 1.4-5.7 1Z" />
                              </svg>
                            ) : index === 2 ? (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                                fill="currentColor"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="0.8"
                              >
                                <path d="M12.2 3.8c4.2 3.1 5.7 6.9 4.5 11.4-2.7-.4-4.6-1.7-5.8-3.9-1 2-2.5 3.3-4.8 4.1-.9-4.1 1.1-8 6.1-11.6Z" />
                                <path d="M11.1 12.8v7.4" />
                                <path d="M11.1 16.2c1.3-.9 2.4-2 3.2-3.4" />
                                <path d="M11 17c-1.2-.8-2.1-1.7-2.8-2.8" />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.2"
                              >
                                <path d="M5.2 6.5h11.7a2.6 2.6 0 0 1 2.6 2.6v5.7a2.6 2.6 0 0 1-2.6 2.6H11l-4.1 3v-3H5.2a2.6 2.6 0 0 1-2.6-2.6V9.1a2.6 2.6 0 0 1 2.6-2.6Z" />
                                <path d="M8 12h.1M11 12h.1M14 12h.1" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-[clamp(0.68rem,2.25vw,0.8rem)] font-black leading-tight ${labelClasses[index]}`}
                            >
                              {labels[index]}
                            </p>
                            <p
                              lang="en"
                              className="mt-1 whitespace-normal break-words text-[clamp(0.86rem,2.8vw,1.06rem)] font-medium leading-[1.34] text-[#141438]"
                            >
                              {renderReferenceResultText(text)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              aria-label={`播放${labels[index]}`}
                              onClick={() => readReferenceResultVariant(index, 1)}
                              className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[#40358f] shadow-[0_8px_18px_rgba(84,72,146,0.1)] transition active:scale-[0.96]"
                            >
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="currentColor"
                              >
                                <path d="M8.2 5.6v12.8L18 12 8.2 5.6Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              aria-label={`朗读${labels[index]}`}
                              onClick={() => readReferenceResultVariant(index, 1)}
                              className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[#40358f] shadow-[0_8px_18px_rgba(84,72,146,0.1)] transition active:scale-[0.96]"
                            >
                              <span className="flex h-5 items-center gap-0.5">
                                {[0.45, 0.85, 1, 0.85, 0.45].map((scale, barIndex) => (
                                  <span
                                    key={`guided-real-row-wave-${index}-${barIndex}`}
                                    className="block w-1 rounded-full bg-current"
                                    style={{ height: `${0.65 + scale * 0.55}rem` }}
                                  />
                                ))}
                              </span>
                            </button>
                          </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <p className="pb-5 text-center text-[clamp(0.76rem,2.45vw,0.92rem)] font-bold text-[#8795bd]">
                    向下查看更多表达⌄
                  </p>

                  {vocabularyNotice ? (
                    <p className="pb-5 text-center text-[clamp(0.82rem,2.65vw,1rem)] font-black text-[#1269e6]">
                      {vocabularyNotice}
                    </p>
                  ) : null}
                </main>

                <div className="absolute inset-x-[3.8%] bottom-[0.75rem] z-30 h-[6.55rem] rounded-[28px] border border-[#d9e6ff] bg-[#eef7ff]/74 shadow-[0_16px_34px_rgba(64,112,190,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={handlePrimaryPracticeAction}
                    className="absolute left-[7%] top-[42%] flex h-[52%] -translate-y-1/2 items-center justify-center gap-1.5 rounded-[16px] bg-white/86 px-4 text-[clamp(0.78rem,2.55vw,0.94rem)] font-black text-[#0b3c9f] shadow-[0_10px_22px_rgba(64,112,190,0.08)]"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.4"
                    >
                      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                      <path d="M20 4v6h-6" />
                    </svg>
                    跟读练习
                  </button>
                  <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[82%] w-[38%] -translate-x-1/2 -translate-y-1/2">
                    <span className="absolute left-0 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full border-l-4 border-[#bcd4ff]/48" />
                    <span className="absolute right-0 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full border-r-4 border-[#bcd4ff]/48" />
                  </div>
                  <button
                    type="button"
                    onClick={handlePrimaryPracticeAction}
                    aria-label={isListening ? "停止录音" : "开始录音"}
                    className="absolute left-1/2 top-[42%] grid h-[4.45rem] w-[4.45rem] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[linear-gradient(135deg,#8f64ff,#0d74ff)] text-white shadow-[0_18px_36px_rgba(64,92,220,0.24),0_0_0_9px_rgba(255,255,255,0.65),0_0_0_20px_rgba(72,132,255,0.08)] transition active:scale-[0.97]"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-[48%] w-[48%]"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.4"
                    >
                      <path d="M12 4.5a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0v-5a3 3 0 0 0-3-3Z" />
                      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => readReferenceResultVariant(0, SLOW_READ_RATE)}
                    className="absolute right-[7%] top-[42%] flex h-[52%] -translate-y-1/2 items-center justify-center gap-1.5 rounded-[16px] bg-white/86 px-4 text-[clamp(0.78rem,2.55vw,0.94rem)] font-black text-[#0b3c9f] shadow-[0_10px_22px_rgba(64,112,190,0.08)]"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="currentColor"
                    >
                      <path d="M8.2 5.6v12.8L18 12 8.2 5.6Z" />
                    </svg>
                    <span>0.5x</span>
                    <span>倍速</span>
                  </button>
                  <p className="absolute inset-x-0 bottom-[7%] text-center text-[clamp(0.64rem,2vw,0.76rem)] font-bold text-[#7f8fb8]">
                    点击麦克风开始录音
                  </p>
                </div>

                <div className="pointer-events-none absolute inset-0 z-[400] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/guided-practice-result-standard.png"
                    alt=""
                    className="h-full w-full select-none object-fill"
                    draggable={false}
                  />

                  <div className="pointer-events-auto absolute left-[8%] top-[20.5%] z-[410] w-[54%] bg-[#f8fbff]/96 py-1.5 text-left shadow-[0_0_20px_20px_rgba(248,251,255,0.94)]">
                    <p
                      lang="en"
                      className="whitespace-normal break-words text-[clamp(0.95rem,3.25vw,1.18rem)] font-medium leading-[1.36] text-[#07113f]"
                    >
                      {message}
                    </p>
                  </div>

                  <div className="pointer-events-none absolute left-[8.6%] top-[32.1%] z-[410] flex h-[13.5%] w-[61%] items-center bg-[#f8fbff] py-1 text-left shadow-[0_0_22px_22px_rgba(248,251,255,0.96)]">
                    <p
                      lang="zh-CN"
                      className="whitespace-normal break-words text-[clamp(1.02rem,3.65vw,1.5rem)] font-black leading-[1.34] text-[#07113f]"
                    >
                      {isLoadingGuidedFollowup
                        ? "正在为你准备下一句..."
                        : guidedResultSuggestion}
                    </p>
                  </div>

                  <div className="pointer-events-auto absolute left-[13.6%] top-[63.6%] z-[410] w-[56%] bg-[#f8fbff]/95 py-0.5 text-left shadow-[0_0_14px_14px_rgba(248,251,255,0.92)]">
                    <p
                      lang="en"
                      className="whitespace-normal break-words text-[clamp(0.78rem,2.75vw,1rem)] font-semibold leading-[1.25] text-[#07113f]"
                    >
                      {renderReferenceResultText(referenceResultVariantTexts[0])}
                    </p>
                  </div>
                  <div className="pointer-events-auto absolute left-[13.6%] top-[70.6%] z-[410] w-[56%] bg-[#f8fbff]/95 py-0.5 text-left shadow-[0_0_14px_14px_rgba(248,251,255,0.92)]">
                    <p
                      lang="en"
                      className="whitespace-normal break-words text-[clamp(0.78rem,2.75vw,1rem)] font-semibold leading-[1.25] text-[#07113f]"
                    >
                      {renderReferenceResultText(referenceResultVariantTexts[1])}
                    </p>
                  </div>
                  <div className="pointer-events-auto absolute left-[13.6%] top-[77.4%] z-[410] w-[56%] bg-[#f8fbff]/95 py-0.5 text-left shadow-[0_0_14px_14px_rgba(248,251,255,0.92)]">
                    <p
                      lang="en"
                      className="whitespace-normal break-words text-[clamp(0.78rem,2.75vw,1rem)] font-semibold leading-[1.25] text-[#07113f]"
                    >
                      {renderReferenceResultText(referenceResultVariantTexts[2])}
                    </p>
                  </div>
                  <div className="pointer-events-auto absolute left-[13.6%] top-[84.2%] z-[410] w-[56%] bg-[#f8fbff]/95 py-0.5 text-left shadow-[0_0_14px_14px_rgba(248,251,255,0.92)]">
                    <p
                      lang="en"
                      className="whitespace-normal break-words text-[clamp(0.78rem,2.75vw,1rem)] font-semibold leading-[1.25] text-[#07113f]"
                    >
                      {renderReferenceResultText(referenceResultVariantTexts[3])}
                    </p>
                  </div>

                  {vocabularyNotice ? (
                    <p className="pointer-events-none absolute inset-x-[10%] bottom-[10.5%] z-[411] text-center text-[clamp(0.72rem,2.35vw,0.9rem)] font-black text-[#1269e6]">
                      {vocabularyNotice}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    aria-label="打开菜单"
                    onClick={togglePracticeMenu}
                    className="pointer-events-auto absolute left-[4.8%] top-[2.4%] z-[420] h-[5.4%] w-[12%] rounded-full border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label={accountCopy.openAccountMenu}
                    onClick={openReferenceAccountMenu}
                    className="pointer-events-auto absolute right-[5%] top-[2.3%] z-[420] h-[5.4%] w-[12%] rounded-full border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="返回 AI 引导表达首页"
                    onClick={openTrainingGroundMode}
                    className="pointer-events-auto absolute left-[4%] top-[8.9%] z-[420] h-[3.9%] w-[17.5%] rounded-full border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="重新说"
                    onClick={retryEnglishSpeech}
                    className="pointer-events-auto absolute right-[8.4%] top-[20.3%] z-[420] h-[4.1%] w-[18.5%] rounded-full border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="用这句练习"
                    onClick={handlePrimaryPracticeAction}
                    className="pointer-events-auto absolute left-[8.5%] top-[48.5%] z-[420] h-[5.3%] w-[50%] rounded-[18px] border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="换一句"
                    onClick={requestAnotherGuidedFollowup}
                    className="pointer-events-auto absolute right-[8.4%] top-[48.5%] z-[420] h-[5.3%] w-[32%] rounded-[18px] border-0 bg-transparent"
                  />

                  {[0, 1, 2, 3].map((index) => {
                    const rowZones = [
                      { height: "5.1%", top: "62.75%" },
                      { height: "5.1%", top: "69.75%" },
                      { height: "5.1%", top: "76.55%" },
                      { height: "6.2%", top: "82.2%" },
                    ];
                    const rowZone = rowZones[index];

                    return (
                      <div key={`guided-standard-actions-${index}`}>
                        <button
                          type="button"
                          aria-label={`播放表达 ${index + 1}`}
                          onClick={() => readReferenceResultVariant(index, 1)}
                          className="pointer-events-auto absolute right-[12.8%] z-[420] w-[11.5%] rounded-full border-0 bg-transparent"
                          style={{ height: rowZone.height, top: rowZone.top }}
                        />
                        <button
                          type="button"
                          aria-label={`朗读表达 ${index + 1}`}
                          onClick={() => readReferenceResultVariant(index, 1)}
                          className="pointer-events-auto absolute right-[3.2%] z-[420] w-[11.5%] rounded-full border-0 bg-transparent"
                          style={{ height: rowZone.height, top: rowZone.top }}
                        />
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    aria-label="跟读练习"
                    onClick={handlePrimaryPracticeAction}
                    className="pointer-events-auto absolute bottom-[2.5%] left-[8.2%] z-[420] h-[6.5%] w-[18.8%] rounded-[18px] border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label={isListening ? "停止录音" : "开始录音"}
                    onClick={handlePrimaryPracticeAction}
                    className="pointer-events-auto absolute bottom-[1.5%] left-1/2 z-[420] h-[10%] w-[20.5%] -translate-x-1/2 rounded-full border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    aria-label="0.5x 倍速"
                    onClick={() => readReferenceResultVariant(0, SLOW_READ_RATE)}
                    className="pointer-events-auto absolute bottom-[2.5%] right-[8.2%] z-[420] h-[6.5%] w-[20.8%] rounded-[18px] border-0 bg-transparent"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {showReferenceLanding ? (
            <FreeStudyPageOne
              menuIcon="home"
              menuLabel="回到首页"
              onMenuClick={openLoggedInHomePage}
              accountLabel={accountCopy.openAccountMenu}
              onAccountClick={openAccountPage}
              avatarSrc={accountImage && !accountImageFailed ? accountImage : ""}
              avatarAlt={accountEmail || accountName || "user"}
              onAvatarError={() => setAccountImageFailed(true)}
              onMicrophoneClick={handlePrimaryPracticeAction}
            />
          ) : null}

          {showReferenceListening ? (
            <FreeStudyPageTwo
              menuLabel="回到学习首页"
              onMenuClick={openLoggedInHomePage}
              accountLabel={accountCopy.openAccountMenu}
              onAccountClick={openAccountPage}
              avatarSrc={accountImage && !accountImageFailed ? accountImage : ""}
              avatarAlt={accountEmail || accountName || "user"}
              onAvatarError={() => setAccountImageFailed(true)}
              isRecordingChinese={isListening}
              isTranscribingChinese={isRecognizingNativeSpeech}
              onMicrophoneClick={handlePrimaryPracticeAction}
            />
          ) : null}

          {showReferenceConfirmation ? (
            <FreeStudyPageThree
              chineseText={nativeSpeech}
              menuLabel="回到学习首页"
              onMenuClick={openLoggedInHomePage}
              accountLabel={accountCopy.openAccountMenu}
              onAccountClick={openAccountPage}
              avatarSrc={accountImage && !accountImageFailed ? accountImage : ""}
              avatarAlt={accountEmail || accountName || "user"}
              onAvatarError={() => setAccountImageFailed(true)}
              onEditChinese={updateNativeSpeechDraft}
              onRetryChinese={openFreeStudyStepTwoForNextChinese}
              onStartEnglishPractice={confirmFreeStudyNativeSpeech}
            />
          ) : null}

          {showReferenceEnglishPrompt || showReferenceEnglishListening ? (
            <FreeStudyPageFour
              isRecordingEnglish={isListening || showReferenceEnglishPrompt}
              nativeSpeech={nativeSpeech}
              menuLabel="回到学习首页"
              onMenuClick={openLoggedInHomePage}
              accountLabel={accountCopy.openAccountMenu}
              onAccountClick={openAccountPage}
              avatarSrc={accountImage && !accountImageFailed ? accountImage : ""}
              avatarAlt={accountEmail || accountName || "user"}
              onAvatarError={() => setAccountImageFailed(true)}
            />
          ) : null}

          {showReferenceResult ? (
            <div className="sf-free-practice-reference-result absolute inset-0 z-[90] overflow-hidden">
              <FreeStudyPageFiveTop
                userEnglishText={message}
                expressions={referenceResultVariantTexts}
                selectedExpressionIndex={selectedExpressionIndex}
                avatarSrc={accountImage && !accountImageFailed ? accountImage : ""}
                avatarAlt={accountEmail || accountName || "user"}
                accountLabel={accountCopy.openAccountMenu}
                onAvatarError={() => setAccountImageFailed(true)}
                onAiGuidedPractice={openAiGuidedExpressionStepOne}
                onRetryEnglish={openFreeStudyStepFourForRetry}
                onMenuClick={openLoggedInHomePage}
                onAccountClick={openAccountPage}
                onPlayExpression={readReferenceResultVariant}
                onSelectExpression={setSelectedExpressionIndex}
                renderExpressionText={(text) => renderReferenceResultText(text)}
                renderUserExpressionText={(text) => renderReferenceResultText(text)}
              />
              <div
                className="pointer-events-none absolute z-[121] flex items-center gap-1.5 font-black leading-none text-[#755cff] drop-shadow-[0_4px_10px_rgba(117,92,255,0.16)]"
                style={{
                  left: "6.8%",
                  top: "36.4%",
                  fontSize: "clamp(1.02rem, 3.8vw, 1.26rem)",
                }}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-[1.15em] w-[1.15em] shrink-0"
                  fill="currentColor"
                >
                  <path d="M11.9 2.4c.5 4.8 2.9 7.5 7.7 8.1-4.8.7-7.2 3.3-7.7 8.1-.6-4.8-3-7.4-7.8-8.1 4.8-.6 7.2-3.3 7.8-8.1Z" />
                  <path d="M19.4 15.2c.2 1.7 1.1 2.7 2.8 2.9-1.7.2-2.6 1.2-2.8 2.9-.2-1.7-1.1-2.7-2.8-2.9 1.7-.2 2.6-1.2 2.8-2.9Z" />
                </svg>
                <span>推荐表达</span>
              </div>
              <div
                className="absolute z-[120] isolate overflow-y-auto rounded-[24px] bg-[#fbfaff] px-[1.2%] pb-4 pt-1 shadow-[0_0_42px_42px_rgba(251,250,255,1)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                  bottom: "17.6%",
                  left: "5.6%",
                  right: "5.6%",
                  top: "39.2%",
                }}
              >
                <div
                  aria-hidden="true"
                  className="hidden"
                />
                <div className="relative z-10 flex flex-col gap-3 pb-3">
                  {referenceResultVariantTexts.map((text, index) => {
                    const labelColorClasses = [
                      "text-[#735cff]",
                      "text-[#31a86b]",
                      "text-[#3478d8]",
                      "text-[#8065e8]",
                    ];
                    const iconWrapClasses = [
                      "bg-[#f0edff] text-[#765cff]",
                      "bg-[#dff7e8] text-[#20a85a]",
                      "bg-[#e2efff] text-[#3478d8]",
                      "bg-[#ece6ff] text-[#8065e8]",
                    ];
                    const accentClasses = [
                      "border-[#8b7cff]",
                      "border-transparent",
                      "border-transparent",
                      "border-transparent",
                    ];
                    const label = expressionVariantLabels[index]?.label || "";

                    return (
                      <div
                        key={`${index}-${text}`}
                        className={`relative rounded-[18px] border bg-[#fbfaff] px-4 py-3 text-left shadow-[0_10px_24px_rgba(84,72,146,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] ${accentClasses[index]}`}
                      >
                        <div className="grid grid-cols-[2.85rem_1fr_auto] items-center gap-3">
                          <div
                            className={`grid h-10 w-10 shrink-0 place-items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_18px_rgba(84,72,146,0.08)] ${index === 0 ? "rounded-none bg-transparent text-white shadow-none" : `rounded-full ${iconWrapClasses[index]}`}`}
                            aria-hidden="true"
                          >
                            {index === 0 ? (
                                <span className="relative block h-10 w-8 rounded-t-[5px] bg-[linear-gradient(180deg,#8e72ff_0%,#654cff_100%)] shadow-[0_8px_16px_rgba(118,92,255,0.26)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]">
                                <span className="absolute left-1/2 top-2 h-3.5 w-3.5 -translate-x-1/2 bg-white text-[0px] [clip-path:polygon(50%_0,61%_35%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_35%)]">
                                  ★
                                </span>
                              </span>
                            ) : index === 1 ? (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                                fill="currentColor"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="0.8"
                              >
                                <path d="M12.4 4.2c3.8 3.1 5.2 6.7 4.2 10.7-2.8-.4-4.7-1.6-5.8-3.5-1.2 2.2-3.1 3.6-5.7 4.2-.8-4 1.1-7.8 5.7-11.4.1 3.3.1 6.6 0 9.9 1.3-2.8 1.8-6.1 1.6-9.9Z" />
                                <path d="M11.2 14.5c-.7 1.8-1.9 3.2-3.8 4.2 2.7.6 5.5-.4 7-2.5" />
                              </svg>
                            ) : index === 2 ? (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-6 w-6"
                                fill="currentColor"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="0.8"
                              >
                                <path d="M12.2 3.8c4.2 3.1 5.7 6.9 4.5 11.4-2.7-.4-4.6-1.7-5.8-3.9-1 2-2.5 3.3-4.8 4.1-.9-4.1 1.1-8 6.1-11.6Z" />
                                <path d="M11.1 12.8v7.4" />
                                <path d="M11.1 16.2c1.3-.9 2.4-2 3.2-3.4" />
                                <path d="M11 17c-1.2-.8-2.1-1.7-2.8-2.8" />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.2"
                              >
                                <path d="M5.2 6.5h11.7a2.6 2.6 0 0 1 2.6 2.6v5.7a2.6 2.6 0 0 1-2.6 2.6H11l-4.1 3v-3H5.2a2.6 2.6 0 0 1-2.6-2.6V9.1a2.6 2.6 0 0 1 2.6-2.6Z" />
                                <path d="M8 12h.1M11 12h.1M14 12h.1" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {index === 0 ? null : (
                              <p
                                className={`text-[clamp(0.68rem,2.25vw,0.8rem)] font-black leading-tight ${labelColorClasses[index]}`}
                              >
                                {label}
                              </p>
                            )}
                            <p
                              lang="en"
                              className={`${index === 0 ? "" : "mt-1"} whitespace-normal break-words text-[clamp(0.86rem,2.8vw,1.06rem)] font-medium leading-[1.34] text-[#141438]`}
                            >
                              {renderReferenceResultText(text)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                readReferenceResultVariant(index, 1)
                              }
                              aria-label={`Play ${label || "expression"}`}
                              className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[#40358f] shadow-[0_8px_18px_rgba(84,72,146,0.1)]"
                            >
                              <PlayIcon className="h-3.5 w-3.5 translate-x-[1px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                readReferenceResultVariant(index, 1)
                              }
                              aria-label={`Read ${label || "expression"}`}
                              className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[#40358f] shadow-[0_8px_18px_rgba(84,72,146,0.1)]"
                            >
                              <SoundWaveIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {vocabularyNotice ? (
                <p className="pointer-events-none absolute inset-x-[8%] bottom-[19.5%] z-[96] text-center text-[clamp(0.72rem,2.4vw,0.92rem)] font-extrabold text-[#7c55ff]">
                  {vocabularyNotice}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => readStandardEnglish(1)}
                aria-label="播放推荐表达"
                className="pointer-events-none hidden absolute right-[18.8%] top-[46%] h-[6%] w-[8.5%] rounded-full border-0 bg-transparent"
              />
              <button
                type="button"
                onClick={() => readStandardEnglish(1)}
                aria-label="朗读推荐表达"
                className="pointer-events-none hidden absolute right-[8.2%] top-[46%] h-[6%] w-[8.5%] rounded-full border-0 bg-transparent"
              />
              {referenceResultVariantTexts.map((_, index) => {
                const hitZones = [
                  { height: "12.3%", top: "40.7%" },
                  { height: "7.7%", top: "54.2%" },
                  { height: "7.7%", top: "62.8%" },
                  { height: "7.7%", top: "71.4%" },
                ];
                const hitZone = hitZones[index];

                if (!hitZone) return null;

                return (
                  <button
                    key={`reference-result-play-${index}`}
                    type="button"
                    onClick={() => readReferenceResultVariant(index, 1)}
                    aria-label={`Play ${expressionVariantLabels[index]?.label || "expression"}`}
                    className="pointer-events-none hidden absolute left-[6.8%] z-[91] w-[86.4%] rounded-[24px] border-0 bg-transparent"
                    style={{ height: hitZone.height, top: hitZone.top }}
                  />
                );
              })}
            </div>
          ) : null}

          {showReferenceResult ? (
            <FreeStudyPageFiveBottomBar
              onFollowPractice={() => readSelectedReferenceResult(1)}
              onNextChinese={openFreeStudyStepTwoForNextChinese}
              onSlowPlayback={() => readSelectedReferenceResult(SLOW_READ_RATE)}
            />
          ) : null}

          {!showReferenceLanding && !showReferenceConfirmation && !showAccountMenu ? (
            <FreeStudyHeader
              menuIcon="home"
              menuLabel="回到学习首页"
              onMenuClick={openLoggedInHomePage}
              accountLabel={accountCopy.openAccountMenu}
              onAccountClick={openReferenceAccountMenu}
              avatarSrc={accountImage && !accountImageFailed ? accountImage : ""}
              avatarAlt={accountEmail || accountName || "user"}
              onAvatarError={() => setAccountImageFailed(true)}
            />
          ) : null}
          {trainingGroundTitle && !showQuickPanel ? (
            <div className="relative z-10 mt-1 text-center font-[var(--font-sora)] text-[0.92rem] font-extrabold text-[#5b63ff]">
              {trainingGroundTitle}
            </div>
          ) : null}

          {showAccountMenu ? (
            <div className="sf-account-panel absolute inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#f0eaff_0%,#f7f3ff_100%)] px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-2xl">
              {accountPanelView === "menu" ? (
                <div className="flex shrink-0 justify-end">
                  <button
                    type="button"
                    aria-label={accountCopy.closeAccountMenu}
                    onClick={closeAccountPanel}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/65 text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_24px_rgba(84,72,146,0.1)]"
                  >
                    <CloseGlyph />
                  </button>
                </div>
              ) : accountPanelView === "subscription" ||
              accountPanelView === "checkout" ||
              accountPanelView === "manageSubscription" ||
              accountPanelView === "referrals" ||
              accountPanelView === "helpCenter" ||
              accountPanelView === "reportIssue" ||
              accountPanelView === "aboutSpeakFlow" ||
              accountPanelView === "accountManagement" ||
              accountPanelView === "interfaceLanguage" ||
              accountPanelView === "notifications" ||
              accountPanelView === "fontSize" ? (
                <div className="grid shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center gap-3">
                  <button
                    type="button"
                    aria-label={
                      accountPanelView === "checkout" ||
                      accountPanelView === "subscription"
                        ? accountCopy.returnLearningHome
                        : accountCopy.returnAccountMenu
                    }
                    onClick={() => {
                      if (
                        accountPanelView === "checkout" ||
                        accountPanelView === "subscription"
                      ) {
                        returnFromSubscriptionPanel();
                        return;
                      }

                      returnFromAccountPanel();
                    }}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.55rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                  >
                    ‹
                  </button>
                  <h2 className="truncate text-center text-[1.25rem] font-extrabold text-[#201833]">
                    {accountPanelView === "checkout"
                      ? accountCopy.confirmSubscription
                      : accountPanelView === "subscription"
                        ? "SpeakFlow Pro"
                        : accountPanelTitle}
                  </h2>
                  <span />
                </div>
              ) : accountPanelView === "account" ? (
                <div className="flex shrink-0 items-center justify-between">
                  <button
                    type="button"
                    aria-label={accountCopy.returnAccountMenu}
                    onClick={returnFromAccountPanel}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.55rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label={accountCopy.closeAccountMenu}
                    onClick={closeAccountPanel}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/65 text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_24px_rgba(84,72,146,0.1)]"
                  >
                    <CloseGlyph />
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      aria-label={accountCopy.returnAccountMenu}
                      onClick={returnFromAccountPanel}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.35rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                    >
                      ←
                    </button>
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-white/80 bg-[#f7f4ff] text-[0.95rem] font-extrabold text-white shadow-[0_14px_28px_rgba(84,72,146,0.18)]">
                      {accountImage && !accountImageFailed ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={accountImage}
                          alt={accountEmail || "user"}
                          className="h-full w-full object-cover"
                          onError={() => setAccountImageFailed(true)}
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#ffd84d_0%,#f0b912_52%,#e9a70f_100%)] text-[#fff8dd]">
                          {accountAvatarLabel}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[1.25rem] font-extrabold leading-7">
                        {accountPanelTitle}
                      </h2>
                      <p className="mt-0.5 truncate text-[0.86rem] font-semibold text-[#7f7896]">
                        {accountEmail || accountName || accountCopy.fallbackUser}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={accountCopy.closeAccountMenu}
                    onClick={closeAccountPanel}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/65 text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_24px_rgba(84,72,146,0.1)]"
                  >
                    <CloseGlyph />
                  </button>
                </div>
              )}

              <div
                className={`sf-account-panel-scroll min-h-0 flex-1 overflow-y-auto ${
                  accountPanelView === "menu"
                    ? "mt-4 pr-0"
                    : accountPanelView === "account"
                      ? "mt-10 pr-0"
                      : "mt-7 pr-1"
                }`}
              >
                {accountPanelView === "menu" ? (
                  <div className="pb-5 pt-1">
                    <div className="mb-5 flex min-h-[6.1rem] w-full items-center gap-4 rounded-[28px] bg-white/82 px-5 py-5 text-left shadow-[0_22px_60px_rgba(84,72,146,0.12)] ring-1 ring-white/88">
                      <span className="grid h-[4.65rem] w-[4.65rem] shrink-0 place-items-center overflow-hidden rounded-full bg-[#f7f4ff] text-[1rem] font-extrabold text-white shadow-[0_14px_28px_rgba(84,72,146,0.16)]">
                        {accountImage && !accountImageFailed ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={accountImage}
                            alt={accountEmail || "user"}
                            className="h-full w-full object-cover"
                            onError={() => setAccountImageFailed(true)}
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#8b67ff_0%,#5f91ff_100%)] text-white">
                            {accountAvatarLabel}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[1.55rem] font-black leading-8 text-[#201833]">
                          {accountHome.account}
                        </span>
                        <span className="mt-1 block truncate text-[1rem] font-bold leading-6 text-[#8f88a2]">
                          {accountEmail || accountCopy.fallbackEmail}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-[2.2rem] font-light leading-none text-[#7f7896]">
                        ›
                      </span>
                    </div>

                    {accountHomeGroups.map((group) => (
                      <section key={group.title || "membership"} className="mt-6">
                        {group.title ? (
                          <h3 className="mb-3 px-2 text-[1.08rem] font-black leading-6 text-[#7c7399]">
                            {group.title}
                          </h3>
                        ) : null}
                        <div className="overflow-hidden rounded-[24px] bg-white/86 shadow-[0_18px_50px_rgba(84,72,146,0.1)] ring-1 ring-white/88">
                          {group.rows.map((row, rowIndex) => (
                            <button
                              key={`${group.title || "account"}-${row.label}`}
                              type="button"
                              onClick={() => {
                                if (row.onClick) {
                                  row.onClick();
                                  return;
                                }

                                handleAccountMenuAction(row.action);
                              }}
                              className={`flex min-h-[4.55rem] w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-[#f8f5ff]/80 ${
                                rowIndex ? "border-t border-[#ece8f6]" : ""
                              }`}
                            >
                              <span className="grid h-10 w-10 shrink-0 place-items-center">
                                <AccountLineIcon danger={row.danger} name={row.icon} />
                              </span>
                              <span
                                className={`min-w-0 flex-1 truncate text-[1.18rem] font-extrabold leading-7 ${
                                  row.danger ? "text-[#ff3b5f]" : "text-[#201833]"
                                }`}
                              >
                                {row.label}
                              </span>
                              {row.badge ? (
  <span className="flex shrink-0 flex-col items-end gap-1">
    <span
      className={`rounded-full px-3.5 py-1.5 text-[0.95rem] font-extrabold leading-none ${
        row.label === "SpeakFlow Pro"
          ? accountSubscriptionBadgeClass
          : "bg-[#f0ebff] text-[#8264ff]"
      }`}
    >
      {row.badge}
    </span>

    {row.label === "SpeakFlow Pro" && accountCurrentPeriodEndLabel ? (
      <span
        className={`max-w-[8.5rem] text-right text-[0.72rem] font-bold leading-4 ${
          hasCanceledAtPeriodEnd ? "text-[#b45d05]" : "text-[#7f7896]"
        }`}
      >
        {accountCurrentPeriodEndLabel}
      </span>
    ) : null}
  </span>
) : null}
                              <span className="shrink-0 text-[2rem] font-light leading-none text-[#7f7896]">
                                ›
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}

                    <button
                      type="button"
                      onClick={() => void signOut({ callbackUrl: "/" })}
                      className="mt-6 flex min-h-[4.35rem] w-full items-center gap-4 rounded-[24px] bg-white/86 px-5 py-3.5 text-left shadow-[0_18px_50px_rgba(84,72,146,0.1)] ring-1 ring-white/88 transition hover:bg-[#fff8fb]"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center">
                        <AccountLineIcon danger name="logout" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[1.18rem] font-extrabold leading-7 text-[#ff3b5f]">
                        {accountHome.signOut}
                      </span>
                    </button>
                  </div>
                ) : accountPanelView === "referrals" ? (
                  <section className="pb-8">
                    <div className="rounded-[28px] border border-white/80 bg-white/76 px-5 py-6 shadow-[0_22px_58px_rgba(84,72,146,0.13)] ring-1 ring-[#efeaff]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                          <AccountLineIcon name="gift" />
                        </span>
                        <div>
                          <h3 className="text-[1.36rem] font-black leading-7 text-[#201833]">
                            {referrals.title}
                          </h3>
                          <p className="mt-2 text-[0.96rem] font-bold leading-7 text-[#4b4267]">
                            {referrals.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[26px] bg-white/72 px-5 py-5 shadow-[0_16px_38px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                      {isLoadingReferralState ? (
                        <p className="text-[0.96rem] font-extrabold leading-7 text-[#7460e8]">
                          {referrals.loading}
                        </p>
                      ) : referralState?.available ? (
                        <>
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[0.88rem] font-black text-[#7f7896]">
                                {referrals.inviteLink}
                              </span>
                              {referralCodeDisplayLabel ? (
                                <span className="rounded-full bg-[#efeaff] px-3 py-1 text-[0.78rem] font-black text-[#7460e8]">
                                  {referrals.code}: {referralCodeDisplayLabel}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                              <p className="min-h-12 break-all rounded-[18px] bg-[#fbf9ff] px-4 py-3 text-[0.9rem] font-extrabold leading-6 text-[#201833] ring-1 ring-[#e8e2ff]">
                                {referralState.inviteLink}
                              </p>
                              <button
                                type="button"
                                onClick={() => void copyReferralInviteLink()}
                                disabled={!referralState.inviteLink}
                                className="min-h-12 rounded-[18px] bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_100%)] px-5 text-[0.98rem] font-black text-white shadow-[0_16px_34px_rgba(126,92,255,0.22)] transition disabled:opacity-60"
                              >
                                {referralNotice === referrals.copied
                                  ? referrals.copied
                                  : referrals.copy}
                              </button>
                            </div>
                            {referralNotice && referralNotice !== referrals.copied ? (
                              <p className="mt-3 break-all rounded-[16px] bg-[#efeaff] px-4 py-3 text-[0.82rem] font-bold leading-6 text-[#7460e8]">
                                {referralNotice}
                              </p>
                            ) : null}
                          </div>

                          <div className="mt-5 grid gap-3">
                            <div className="rounded-[20px] bg-[#fbf9ff]/78 px-4 py-4 ring-1 ring-white/80">
                              <h4 className="text-[0.96rem] font-black text-[#201833]">
                                {referrals.friendRewardTitle}
                              </h4>
                              <p className="mt-1 text-[0.9rem] font-bold leading-6 text-[#5f5680]">
                                {referrals.friendReward}
                              </p>
                            </div>
                            <div className="rounded-[20px] bg-[#fbf9ff]/78 px-4 py-4 ring-1 ring-white/80">
                              <h4 className="text-[0.96rem] font-black text-[#201833]">
                                {referrals.yourRewardTitle}
                              </h4>
                              <p className="mt-1 text-[0.9rem] font-bold leading-6 text-[#5f5680]">
                                {referrals.yourReward}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-[0.94rem] font-bold leading-7 text-[#7f7896]">
                          {referrals.unavailable}
                        </p>
                      )}
                    </div>

                    {referralState?.available ? (
                      <div className="mt-4 rounded-[26px] bg-white/70 px-5 py-5 shadow-[0_16px_38px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                        <h3 className="text-[1.08rem] font-black text-[#201833]">
                          {referrals.statsTitle}
                        </h3>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-[18px] bg-[#fbf9ff] px-3 py-4 text-center ring-1 ring-[#e8e2ff]">
                            <p className="text-[1.35rem] font-black text-[#201833]">
                              {referralState.invitedCount || 0}
                            </p>
                            <p className="mt-1 text-[0.72rem] font-extrabold leading-5 text-[#7f7896]">
                              {referrals.invited}
                            </p>
                          </div>
                          <div className="rounded-[18px] bg-[#fbf9ff] px-3 py-4 text-center ring-1 ring-[#e8e2ff]">
                            <p className="text-[1.35rem] font-black text-[#201833]">
                              {referralState.paidRewardCount || 0}
                            </p>
                            <p className="mt-1 text-[0.72rem] font-extrabold leading-5 text-[#7f7896]">
                              {referrals.paidRewards}
                            </p>
                          </div>
                          <div className="rounded-[18px] bg-[#fbf9ff] px-3 py-4 text-center ring-1 ring-[#e8e2ff]">
                            <p className="text-[0.86rem] font-black leading-5 text-[#201833]">
                              {referralBonusUntilLabel || referrals.noBonus}
                            </p>
                            <p className="mt-1 text-[0.72rem] font-extrabold leading-5 text-[#7f7896]">
                              {referrals.bonusUntil}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : accountPanelView === "helpCenter" ? (
                  <section className="pb-8">
                    <div className="rounded-[28px] border border-white/80 bg-white/76 px-5 py-6 shadow-[0_22px_58px_rgba(84,72,146,0.13)] ring-1 ring-[#efeaff]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.35rem] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                          ❓
                        </span>
                        <div>
                          <h3 className="text-[1.36rem] font-black leading-7 text-[#201833]">
                            {accountCopy.helpCenterTitle}
                          </h3>
                          <p className="mt-2 text-[0.96rem] font-bold leading-7 text-[#4b4267]">
                            {helpCenter.intro}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] bg-white/68 px-5 py-5 shadow-[0_16px_38px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                      <h3 className="text-[1.08rem] font-black text-[#201833]">
                        {helpCenter.quickStartTitle}
                      </h3>
                      <div className="mt-4 grid gap-3">
                        {helpCenter.quickStart.map((step, index) => (
                          <div
                            key={step}
                            className="grid grid-cols-[2rem_1fr] gap-3 text-left"
                          >
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#efeaff] text-[0.86rem] font-black text-[#7460e8]">
                              {index + 1}
                            </span>
                            <p className="pt-0.5 text-[0.94rem] font-bold leading-6 text-[#4b4267]">
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4">
                      {helpCenter.sections.map((section) => (
                        <section
                          key={section.title}
                          className="rounded-[24px] bg-white/64 px-5 py-5 shadow-[0_16px_38px_rgba(84,72,146,0.1)] ring-1 ring-white/85"
                        >
                          <h3 className="text-[1.12rem] font-black leading-7 text-[#201833]">
                            {section.title}
                          </h3>
                          <p className="mt-1 text-[0.88rem] font-bold leading-6 text-[#7f7896]">
                            {section.description}
                          </p>

                          <div className="mt-4 grid gap-3">
                            {section.articles.map((article) => (
                              <article
                                key={article.title}
                                className="rounded-[20px] bg-[#fbf9ff]/76 px-4 py-4 ring-1 ring-white/80"
                              >
                                <h4 className="text-[1rem] font-black leading-6 text-[#201833]">
                                  {article.title}
                                </h4>
                                <div className="mt-2 grid gap-2">
                                  {article.body.map((paragraph) => (
                                    <p
                                      key={paragraph}
                                      className="text-[0.9rem] font-semibold leading-6 text-[#4b4267]"
                                    >
                                      {paragraph}
                                    </p>
                                  ))}
                                </div>
                                {article.bullets?.length ? (
                                  <ul className="mt-3 grid gap-2">
                                    {article.bullets.map((bullet) => (
                                      <li
                                        key={bullet}
                                        className="flex gap-2 text-[0.88rem] font-bold leading-6 text-[#5f5680]"
                                      >
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7460e8]" />
                                        <span>{bullet}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </section>
                ) : accountPanelView === "reportIssue" ? (
                  <section className="pb-8">
                    <div className="rounded-[28px] border border-white/80 bg-white/76 px-5 py-6 shadow-[0_22px_58px_rgba(84,72,146,0.13)] ring-1 ring-[#efeaff]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.35rem] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                          ⚑
                        </span>
                        <div>
                          <h3 className="text-[1.36rem] font-black leading-7 text-[#201833]">
                            {accountCopy.reportIssueTitle}
                          </h3>
                          <p className="mt-2 text-[0.96rem] font-bold leading-7 text-[#4b4267]">
                            {supportFeedback.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <form
                      className="mt-4 grid gap-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submitSupportFeedback();
                      }}
                    >
                      <label className="grid gap-2 rounded-[22px] bg-white/68 px-4 py-4 shadow-[0_14px_34px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                        <span className="text-[0.92rem] font-black text-[#201833]">
                          {supportFeedback.type}
                        </span>
                        <select
                          value={supportIssueType}
                          onChange={(event) =>
                            setSupportIssueType(event.target.value)
                          }
                          className="min-h-12 rounded-[18px] border border-[#e8e2ff] bg-[#fbf9ff] px-4 text-[0.96rem] font-extrabold text-[#201833] outline-none focus:border-[#8b67ff]"
                        >
                          {supportFeedback.categories.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-2 rounded-[22px] bg-white/68 px-4 py-4 shadow-[0_14px_34px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                        <span className="text-[0.92rem] font-black text-[#201833]">
                          {supportFeedback.contactEmail}
                        </span>
                        <input
                          type="email"
                          value={supportContactEmail}
                          onChange={(event) =>
                            setSupportContactEmail(event.target.value)
                          }
                          placeholder={supportFeedback.contactPlaceholder}
                          className="min-h-12 rounded-[18px] border border-[#e8e2ff] bg-[#fbf9ff] px-4 text-[0.96rem] font-extrabold text-[#201833] outline-none placeholder:text-[#aaa0c4] focus:border-[#8b67ff]"
                        />
                        {accountEmail ? (
                          <span className="text-[0.78rem] font-bold leading-5 text-[#7f7896]">
                            {language === "en"
                              ? `Signed in as ${accountEmail}`
                              : `当前登录：${accountEmail}`}
                          </span>
                        ) : null}
                      </label>

                      <label className="grid gap-2 rounded-[22px] bg-white/68 px-4 py-4 shadow-[0_14px_34px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                        <span className="text-[0.92rem] font-black text-[#201833]">
                          {supportFeedback.page}
                        </span>
                        <input
                          type="text"
                          value={supportRelatedPage}
                          onChange={(event) =>
                            setSupportRelatedPage(event.target.value)
                          }
                          placeholder={supportFeedback.pagePlaceholder}
                          className="min-h-12 rounded-[18px] border border-[#e8e2ff] bg-[#fbf9ff] px-4 text-[0.96rem] font-extrabold text-[#201833] outline-none placeholder:text-[#aaa0c4] focus:border-[#8b67ff]"
                        />
                      </label>

                      <label className="grid gap-2 rounded-[22px] bg-white/68 px-4 py-4 shadow-[0_14px_34px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                        <span className="text-[0.92rem] font-black text-[#201833]">
                          {supportFeedback.message}
                        </span>
                        <textarea
                          value={supportMessage}
                          onChange={(event) => setSupportMessage(event.target.value)}
                          placeholder={supportFeedback.messagePlaceholder}
                          rows={7}
                          className="min-h-[10rem] resize-none rounded-[18px] border border-[#e8e2ff] bg-[#fbf9ff] px-4 py-3 text-[0.96rem] font-bold leading-6 text-[#201833] outline-none placeholder:text-[#aaa0c4] focus:border-[#8b67ff]"
                        />
                        <span className="text-[0.78rem] font-bold leading-5 text-[#7f7896]">
                          {supportFeedback.detailHelp}
                        </span>
                      </label>

                      {supportNotice ? (
                        <p
                          className={`rounded-[18px] bg-white/66 px-4 py-3 text-center text-[0.88rem] font-bold leading-6 ring-1 ring-white/80 ${
                            supportNotice === supportFeedback.success
                              ? "text-[#14845f]"
                              : "text-[#d33b46]"
                          }`}
                        >
                          {supportNotice}
                        </p>
                      ) : null}

                      <button
                        type="submit"
                        disabled={isSubmittingSupportFeedback}
                        aria-busy={isSubmittingSupportFeedback}
                        className="flex min-h-[3.9rem] w-full items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#6f55ff_0%,#a549ff_58%,#c85cff_100%)] px-5 text-[1.05rem] font-extrabold text-white shadow-[0_20px_44px_rgba(126,92,255,0.28)] transition disabled:opacity-70"
                      >
                        {isSubmittingSupportFeedback
                          ? supportFeedback.submitting
                          : supportFeedback.submit}
                      </button>
                    </form>
                  </section>
                ) : accountPanelView === "aboutSpeakFlow" ? (
                  <section className="pb-8">
                    <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/76 px-5 py-6 shadow-[0_22px_58px_rgba(84,72,146,0.13)] ring-1 ring-[#efeaff]">
                      <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#8b67ff]/10 blur-3xl" />
                      <div className="relative flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.35rem] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                          ℹ️
                        </span>
                        <div>
                          <h3 className="text-[1.36rem] font-black leading-7 text-[#201833]">
                            SpeakFlow
                          </h3>
                          <p className="mt-1 text-[0.9rem] font-black text-[#7460e8]">
                            {aboutSpeakFlow.tagline}
                          </p>
                          <p className="mt-3 text-[0.96rem] font-bold leading-7 text-[#4b4267]">
                            {aboutSpeakFlow.intro}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] bg-white/68 px-5 py-5 shadow-[0_16px_38px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                      <h3 className="text-[1.08rem] font-black text-[#201833]">
                        {aboutSpeakFlow.principlesTitle}
                      </h3>
                      <div className="mt-4 grid gap-3">
                        {aboutSpeakFlow.principles.map((principle) => (
                          <div
                            key={principle}
                            className="flex gap-3 text-[0.94rem] font-bold leading-6 text-[#4b4267]"
                          >
                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#7460e8]" />
                            <span>{principle}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4">
                      {aboutSpeakFlow.sections.map((section) => (
                        <section
                          key={section.title}
                          className="rounded-[24px] bg-white/64 px-5 py-5 shadow-[0_16px_38px_rgba(84,72,146,0.1)] ring-1 ring-white/85"
                        >
                          <h3 className="text-[1.08rem] font-black leading-7 text-[#201833]">
                            {section.title}
                          </h3>
                          <div className="mt-3 grid gap-2">
                            {section.body.map((paragraph) => (
                              <p
                                key={paragraph}
                                className="text-[0.92rem] font-semibold leading-6 text-[#4b4267]"
                              >
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </section>
                ) : accountPanelView === "accountManagement" ? (
                  <section className="pb-8">
                    <div className="rounded-[28px] border border-white/80 bg-white/76 px-5 py-6 shadow-[0_22px_58px_rgba(84,72,146,0.13)] ring-1 ring-[#efeaff]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                          <AccountLineIcon name="lock" />
                        </span>
                        <div>
                          <h3 className="text-[1.36rem] font-black leading-7 text-[#201833]">
                            {accountManagement.title}
                          </h3>
                          <p className="mt-2 text-[0.96rem] font-bold leading-7 text-[#4b4267]">
                            {accountManagement.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-[24px] bg-white/76 shadow-[0_16px_38px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                      <div className="px-5 py-5">
                        <p className="text-[0.86rem] font-extrabold text-[#7f7896]">
                          {accountManagement.contactEmailTitle}
                        </p>
                        <p className="mt-2 break-all text-[1.04rem] font-black leading-6 text-[#201833]">
                          {accountEmail || accountCopy.fallbackEmail}
                        </p>
                        <p className="mt-2 text-[0.86rem] font-bold leading-6 text-[#7f7896]">
                          {accountManagement.contactEmailDescription}
                        </p>
                      </div>
                      <div className="border-t border-[#ece8f6] px-5 py-5">
                        <p className="text-[1rem] font-black text-[#201833]">
                          {accountManagement.loginSecurityTitle}
                        </p>
                        <p className="mt-2 text-[0.88rem] font-bold leading-6 text-[#7f7896]">
                          {accountManagement.loginSecurityDescription}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] bg-white/76 px-5 py-5 shadow-[0_16px_38px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                      <p className="text-[1rem] font-black text-[#ff3b5f]">
                        {accountManagement.deleteTitle}
                      </p>
                      <p className="mt-2 text-[0.88rem] font-bold leading-6 text-[#7f7896]">
                        {accountManagement.deleteDescription}
                      </p>
                      <button
                        type="button"
                        onClick={requestAccountDeletion}
                        className="mt-4 min-h-12 w-full rounded-[18px] bg-[#fff0f3] px-4 text-[0.98rem] font-black text-[#ff3b5f] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition hover:bg-[#ffe7ed]"
                      >
                        {accountManagement.deleteButton}
                      </button>
                    </div>

                    <p className="mt-4 rounded-[18px] bg-white/66 px-4 py-3 text-center text-[0.84rem] font-bold leading-6 text-[#7f7896] ring-1 ring-white/80">
                      {accountManagement.supportNote}
                    </p>
                  </section>
                ) : accountPanelView === "interfaceLanguage" ? (
                  <section className="pb-8">
                    <div className="rounded-[28px] border border-white/80 bg-white/76 px-5 py-6 shadow-[0_22px_58px_rgba(84,72,146,0.13)] ring-1 ring-[#efeaff]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                          <AccountLineIcon name="globe" />
                        </span>
                        <div>
                          <h3 className="text-[1.36rem] font-black leading-7 text-[#201833]">
                            {accountHome.interfaceLanguage}
                          </h3>
                          <p className="mt-2 text-[0.96rem] font-bold leading-7 text-[#4b4267]">
                            {displaySettings.interfaceLanguageDescription}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[22px] bg-white/70 px-4 py-4 shadow-[0_14px_34px_rgba(84,72,146,0.09)] ring-1 ring-white/85">
                      <span className="block text-[0.8rem] font-extrabold uppercase leading-5 text-[#7f7896]">
                        {displaySettings.interfaceLanguageCurrent}
                      </span>
                      <span className="mt-1 block text-[1.08rem] font-black leading-6 text-[#201833]">
                        {currentInterfaceLanguage.localName}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {interfaceLanguageOptions.map((option) => {
                        const isAvailable = Boolean(option.uiLanguage);
                        const isSelected = option.uiLanguage === language;

                        return (
                          <button
                            key={option.code}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => {
                              if (option.uiLanguage) {
                                setLanguage(option.uiLanguage);
                              }
                            }}
                            className={`flex min-h-[4.9rem] w-full items-center gap-3 rounded-[22px] px-4 py-4 text-left transition ${
                              isSelected
                                ? "border-2 border-[#8b67ff] bg-white/88 shadow-[0_18px_44px_rgba(126,92,255,0.14)]"
                                : isAvailable
                                  ? "border border-[#e8e2ff] bg-white/66 shadow-[0_12px_30px_rgba(84,72,146,0.08)] hover:bg-white/84"
                                  : "border border-[#ece8f6] bg-white/46 opacity-72"
                            }`}
                          >
                            <span
                              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.82rem] font-extrabold ${
                                isSelected
                                  ? "bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_100%)] text-white"
                                  : isAvailable
                                    ? "border-2 border-[#c7bddf] text-transparent"
                                    : "bg-[#f2eef9] text-[#aaa0bd]"
                              }`}
                            >
                              {isSelected ? "\u2713" : isAvailable ? "\u2713" : ""}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[1rem] font-extrabold text-[#201833]">
                                {option.localName}
                              </span>
                              <span className="mt-1 block truncate text-[0.82rem] font-bold leading-5 text-[#7f7896]">
                                {option.englishName} / {option.region}
                              </span>
                            </span>
                            <span
                              className={`max-w-[7.8rem] shrink-0 rounded-full px-2.5 py-1 text-center text-[0.68rem] font-extrabold leading-4 ${
                                isAvailable
                                  ? "bg-[#e8fff5] text-[#14845f]"
                                  : "bg-[#f0ebff] text-[#8264ff]"
                              }`}
                            >
                              {isAvailable
                                ? displaySettings.interfaceLanguageAvailable
                                : displaySettings.interfaceLanguageComingSoon}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-4 rounded-[18px] bg-white/66 px-4 py-3 text-center text-[0.86rem] font-bold leading-6 text-[#7f7896] ring-1 ring-white/80">
                      {displaySettings.interfaceLanguageMore}
                    </p>
                  </section>
                ) : accountPanelView === "notifications" ? (
                  <section className="pb-8">
                    <div className="rounded-[28px] border border-white/80 bg-white/76 px-5 py-6 shadow-[0_22px_58px_rgba(84,72,146,0.13)] ring-1 ring-[#efeaff]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                          <AccountLineIcon name="bell" />
                        </span>
                        <div>
                          <h3 className="text-[1.36rem] font-black leading-7 text-[#201833]">
                            {accountHome.notifications}
                          </h3>
                          <p className="mt-2 text-[0.96rem] font-bold leading-7 text-[#4b4267]">
                            {notificationSettings.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between px-1">
                      <h3 className="text-[0.94rem] font-extrabold text-[#7c7399]">
                        {notificationSettings.inboxTitle}
                      </h3>
                      <span className="rounded-full bg-white/70 px-3 py-1 text-[0.74rem] font-extrabold text-[#8264ff] ring-1 ring-white/85">
                        {notificationInboxItems.length}
                      </span>
                    </div>

                    {notificationInboxItems.length ? (
                      <div className="mt-3 overflow-hidden rounded-[26px] bg-white/78 shadow-[0_18px_48px_rgba(84,72,146,0.11)] ring-1 ring-white/88">
                        {notificationInboxItems.map((item, index) => {
                          const toneClass =
                            item.tone === "orange"
                              ? "bg-[#fff7ea] text-[#b45d05] ring-[#ffdca8]"
                              : item.tone === "green"
                                ? "bg-[#ecfff7] text-[#14845f] ring-[#c8f3df]"
                                : item.tone === "blue"
                                  ? "bg-[#eef6ff] text-[#3b6ed6] ring-[#d6e7ff]"
                                  : "bg-[#f0ebff] text-[#7460e8] ring-[#e2d8ff]";

                          return (
                            <article
                              key={item.id}
                              className={`px-5 py-5 ${
                                index ? "border-t border-[#ece8f6]" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-[16px] text-[0.82rem] font-black ring-1 ${toneClass}`}
                                >
                                  {item.unread ? "\u2022" : "\u2713"}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-[0.8rem] font-extrabold text-[#7f7896]">
                                      {item.sender}
                                    </span>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold leading-none ${toneClass}`}
                                    >
                                      {item.tag}
                                    </span>
                                    {item.unread ? (
                                      <span className="rounded-full bg-[#fff2db] px-2.5 py-1 text-[0.68rem] font-extrabold leading-none text-[#b45d05]">
                                        {notificationSettings.unread}
                                      </span>
                                    ) : null}
                                  </div>
                                  <h4 className="mt-2 text-[1.06rem] font-black leading-6 text-[#201833]">
                                    {item.title}
                                  </h4>
                                  <p className="mt-2 text-[0.9rem] font-bold leading-6 text-[#5f5680]">
                                    {item.body}
                                  </p>
                                  <p className="mt-3 text-[0.76rem] font-extrabold text-[#9a91ad]">
                                    {item.time}
                                  </p>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-[26px] bg-white/72 px-5 py-8 text-center shadow-[0_16px_38px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                        <p className="text-[1.06rem] font-black text-[#201833]">
                          {notificationSettings.emptyTitle}
                        </p>
                        <p className="mt-2 text-[0.9rem] font-bold leading-6 text-[#7f7896]">
                          {notificationSettings.emptyBody}
                        </p>
                      </div>
                    )}
                  </section>
                ) : accountPanelView === "fontSize" ? (
                  <section className="pb-8">
                    <div className="rounded-[28px] border border-white/80 bg-white/76 px-5 py-6 shadow-[0_22px_58px_rgba(84,72,146,0.13)] ring-1 ring-[#efeaff]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.35rem] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                          🔤
                        </span>
                        <div>
                          <h3 className="text-[1.36rem] font-black leading-7 text-[#201833]">
                            {accountCopy.fontSizeTitle}
                          </h3>
                          <p className="mt-2 text-[0.96rem] font-bold leading-7 text-[#4b4267]">
                            {displaySettings.fontSizeDescription}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {displaySettings.fontSizeOptions.map((option) => {
                        const isSelected = fontSizePreference === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFontSizePreference(option.value)}
                            className={`flex min-h-[4.65rem] w-full items-center gap-3 rounded-[22px] px-4 py-4 text-left transition ${
                              isSelected
                                ? "border-2 border-[#8b67ff] bg-white/86 shadow-[0_18px_44px_rgba(126,92,255,0.14)]"
                                : "border border-[#e8e2ff] bg-white/66 shadow-[0_12px_30px_rgba(84,72,146,0.08)]"
                            }`}
                          >
                            <span
                              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.9rem] font-extrabold ${
                                isSelected
                                  ? "bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_100%)] text-white"
                                  : "border-2 border-[#c7bddf] text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[1rem] font-extrabold text-[#201833]">
                                {option.label}
                              </span>
                              <span className="mt-1 block text-[0.84rem] font-bold leading-5 text-[#7f7896]">
                                {option.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-[22px] bg-white/66 px-5 py-5 text-center shadow-[0_14px_34px_rgba(84,72,146,0.1)] ring-1 ring-white/85">
                      <p className="text-[0.86rem] font-bold text-[#7f7896]">
                        {displaySettings.saved}
                      </p>
                      <p className="mt-2 text-[1.05rem] font-black leading-7 text-[#201833]">
                        SpeakFlow voice practice
                      </p>
                      <p className="mt-1 text-[0.92rem] font-bold leading-6 text-[#4b4267]">
                        {language === "en"
                          ? "Say one real thought, then practice it in English."
                          : "说出一个真实想法，然后练成英文。"}
                      </p>
                    </div>
                  </section>
                ) : accountPanelView === "voice" ? (
                  <section className="pb-8">
                    <div className="rounded-[24px] bg-white/72 px-5 py-5 shadow-[0_18px_44px_rgba(84,72,146,0.12)] ring-1 ring-white/85">
                      <h3 className="text-[1.12rem] font-extrabold text-[#201833]">
                        {language === "en" ? "Choose a voice" : "选择朗读声音"}
                      </h3>
                      <p className="mt-2 text-[0.9rem] font-bold leading-6 text-[#7f7896]">
                        {language === "en"
                          ? "This voice will be used for English playback in practice."
                          : "这个声音会用于练习中的英文朗读。"}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {availableVoices.length ? (
                        availableVoices.map((voice) => (
                          <button
                            key={voice.voiceURI}
                            type="button"
                            onClick={() => {
                              setSelectedVoiceURI(voice.voiceURI);
                              previewVoice(voice);
                            }}
                            className={`flex min-h-[4.4rem] w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left transition ${
                              selectedVoiceURI === voice.voiceURI
                                ? "border-2 border-[#8b67ff] bg-white/86 shadow-[0_18px_44px_rgba(126,92,255,0.14)]"
                                : "border border-[#e8e2ff] bg-white/66 shadow-[0_12px_30px_rgba(84,72,146,0.08)]"
                            }`}
                          >
                            <span
                              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.9rem] font-extrabold ${
                                selectedVoiceURI === voice.voiceURI
                                  ? "bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_100%)] text-white"
                                  : "border-2 border-[#c7bddf] text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[1rem] font-extrabold text-[#201833]">
                                {voice.name}
                              </span>
                              <span className="mt-1 block text-[0.82rem] font-bold text-[#7f7896]">
                                {voice.lang}
                              </span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="rounded-[20px] bg-white/72 px-4 py-5 text-center text-[1rem] font-bold text-[#7f7896] ring-1 ring-white/85">
                          {language === "en" ? "Loading voices..." : "正在加载声音…"}
                        </p>
                      )}
                    </div>
                  </section>
                ) : accountPanelView === "account" ? (
                  <section className="pb-10">
                    <div className="flex items-center gap-4 px-2 pt-5">
                      <button
                        type="button"
                        aria-label={accountCopy.editAvatar}
                        onClick={openAvatarEditor}
                        className="relative grid h-24 w-24 shrink-0 place-items-center overflow-visible rounded-full bg-[#f0ebff] text-[1.15rem] font-extrabold text-white shadow-[0_18px_36px_rgba(84,72,146,0.22)]"
                      >
                        <span className="grid h-full w-full overflow-hidden rounded-full border border-white/90">
                          {accountImage && !accountImageFailed ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={accountImage}
                              alt={accountEmail || "user"}
                              className="h-full w-full object-cover"
                              onError={() => setAccountImageFailed(true)}
                            />
                          ) : (
                            <span className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#ffd84d_0%,#f0b912_52%,#e9a70f_100%)] text-[#fff8dd]">
                              {accountAvatarLabel}
                            </span>
                          )}
                        </span>
                        <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-4 border-[#fbf9ff] bg-[#7460e8] text-[0.96rem] font-extrabold text-white shadow-[0_10px_22px_rgba(84,72,146,0.28)]">
                          ✎
                        </span>
                      </button>
                      <div className="min-w-0">
                        <h2 className="truncate text-[1.85rem] font-extrabold leading-tight text-[#201833]">
                          {accountDisplayName}
                        </h2>
                        <p className="mt-2 truncate text-[1rem] font-semibold text-[#7f7896]">
                          {accountEmail || accountCopy.fallbackEmail}
                        </p>
                      </div>
                    </div>

                    <h3 className="mt-10 px-3 text-[1rem] font-extrabold text-[#7f7896]">
                      {accountCopy.member}
                    </h3>
                    <div className="mt-4 overflow-hidden rounded-[24px] bg-white/78 shadow-[0_18px_44px_rgba(84,72,146,0.12)] ring-1 ring-white/85">
                      <button
                        type="button"
                        onClick={() => setAccountPanelView("subscription")}
                        className="flex min-h-[4.25rem] w-full items-center gap-4 border-b border-[#e8e2ff] px-5 py-4 text-left"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#efeaff] text-[1.2rem] text-[#7460e8]">
                          ◆
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[1.08rem] font-extrabold">
                            SpeakFlow Pro
                          </span>
                          {accountCurrentPeriodEndLabel ? (
                            <span className="mt-1 block truncate text-[0.82rem] font-bold text-[#7f7896]">
                              {accountCurrentPeriodEndLabel}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[0.9rem] font-extrabold ${accountSubscriptionBadgeClass}`}
                        >
                          {accountSubscriptionDisplayLabel}
                        </span>
                        <span className="text-[1.75rem] font-semibold text-[#7f7896]">
                          ›
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBillingPortalNotice("");
                          setRestorePurchaseNotice("");
                          setAccountPanelView("manageSubscription");
                        }}
                        className="flex min-h-[4.25rem] w-full items-center gap-4 px-5 py-4 text-left"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#efeaff] text-[1.2rem] text-[#7460e8]">
                          ▭
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[1.08rem] font-extrabold">
                          {accountCopy.manageSubscription}
                        </span>
                        <span className="text-[1.75rem] font-semibold text-[#7f7896]">
                          ›
                        </span>
                      </button>
                    </div>

                    <h3 className="mt-8 px-3 text-[1rem] font-extrabold text-[#7f7896]">
                      {accountCopy.accountSecurity}
                    </h3>
                    <div className="mt-4 overflow-hidden rounded-[24px] bg-white/78 shadow-[0_18px_44px_rgba(84,72,146,0.12)] ring-1 ring-white/85">
                      <button
                        type="button"
                        className="flex min-h-[4.25rem] w-full items-center gap-4 px-5 py-4 text-left"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#efeaff] text-[1.2rem] text-[#7460e8]">
                          ▣
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[1.08rem] font-extrabold">
                          {accountCopy.loginSecurity}
                        </span>
                        <span className="text-[1.75rem] font-semibold text-[#7f7896]">
                          ›
                        </span>
                      </button>
                    </div>

                    <h3 className="mt-8 px-3 text-[1rem] font-extrabold text-[#7f7896]">
                      {accountCopy.data}
                    </h3>
                    <div className="mt-4 overflow-hidden rounded-[24px] bg-white/78 shadow-[0_18px_44px_rgba(84,72,146,0.12)] ring-1 ring-white/85">
                      <button
                        type="button"
                        className="flex min-h-[4.25rem] w-full items-center gap-4 px-5 py-4 text-left"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#efeaff] text-[1.2rem] text-[#7460e8]">
                          ◔
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[1.08rem] font-extrabold">
                          {accountCopy.learningData}
                        </span>
                        <span className="text-[1.75rem] font-semibold text-[#7f7896]">
                          ›
                        </span>
                      </button>
                    </div>

                    <h3 className="mt-8 px-3 text-[1rem] font-extrabold text-[#7f7896]">
                      {accountCopy.other}
                    </h3>
                    <div className="mt-4 overflow-hidden rounded-[24px] bg-white/78 shadow-[0_18px_44px_rgba(84,72,146,0.12)] ring-1 ring-white/85">
                      <button
                        type="button"
                        className="flex min-h-[4.25rem] w-full items-center gap-4 px-5 py-4 text-left font-extrabold text-[#d33b46]"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#ffecef] text-[1.2rem]">
                          ▥
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[1.08rem]">
                          {accountCopy.deleteAccount}
                        </span>
                        <span className="text-[1.75rem] font-semibold">
                          ›
                        </span>
                      </button>
                    </div>
                  </section>
                ) : accountPanelView === "manageSubscription" ? (
                  <section className="pb-8">
                    <div className="rounded-[28px] border border-white/80 bg-white/78 px-5 py-6 shadow-[0_22px_58px_rgba(84,72,146,0.13)] ring-1 ring-[#efeaff]">
                      <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                          <AccountLineIcon name="card" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-[1.3rem] font-black leading-7 text-[#201833]">
                            {accountCopy.manageSubscription}
                          </h3>
                          <p className="mt-1 text-[0.86rem] font-extrabold text-[#7f7896]">
                            Stripe
                          </p>
                        </div>
                      </div>

                      <p className="mt-5 text-[0.98rem] font-bold leading-7 text-[#4b4267]">
                        {accountCopy.billingPortalDescription}
                      </p>

                      <div className="mt-5 overflow-hidden rounded-[22px] bg-[#fbf9ff]/78 ring-1 ring-white/85">
                        <div className="flex items-center justify-between gap-4 px-4 py-4">
                          <span className="text-[0.9rem] font-extrabold text-[#7f7896]">
                            {subscriptionManagementCopy.currentPlan}
                          </span>
                          <span className="min-w-0 text-right">
                            <span className="block truncate text-[1rem] font-black text-[#201833]">
                              {accountPlanName}
                            </span>
                            <span
                              className={`mt-1 inline-flex rounded-full px-3 py-1 text-[0.82rem] font-extrabold ${accountSubscriptionBadgeClass}`}
                            >
                              {accountSubscriptionDisplayLabel}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-[#ece8f6] px-4 py-4">
                          <span className="text-[0.9rem] font-extrabold text-[#7f7896]">
                            {subscriptionManagementCopy.expiration}
                          </span>
                          <span className="min-w-0 truncate text-right text-[0.98rem] font-black text-[#201833]">
                            {accountCurrentPeriodEndValue}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-[24px] bg-white/84 shadow-[0_18px_50px_rgba(84,72,146,0.1)] ring-1 ring-white/88">
                      <button
                        type="button"
                        onClick={() => void openBillingPortal()}
                        disabled={isOpeningBillingPortal || !isAccountPro}
                        aria-busy={isOpeningBillingPortal}
                        className="flex min-h-[4.7rem] w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#fff8fb] disabled:opacity-55"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-[#fff0f3] text-[1.55rem] font-black leading-none text-[#ff3b5f]">
                          ×
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[1.05rem] font-black leading-6 text-[#201833]">
                            {subscriptionManagementCopy.cancelSubscription}
                          </span>
                          <span className="mt-1 block text-[0.82rem] font-bold leading-5 text-[#7f7896]">
                            {subscriptionManagementCopy.cancelDescription}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 leading-none text-[#7f7896] ${
                            isOpeningBillingPortal
                              ? "max-w-[5.7rem] truncate text-[0.78rem] font-extrabold"
                              : "text-[1.8rem] font-light"
                          }`}
                        >
                          {isOpeningBillingPortal
                            ? subscriptionManagementCopy.opening
                            : "›"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void restoreAccountPurchases()}
                        disabled={isRestoringPurchases}
                        aria-busy={isRestoringPurchases}
                        className="flex min-h-[4.7rem] w-full items-center gap-4 border-t border-[#ece8f6] px-5 py-4 text-left transition hover:bg-[#f8f5ff]/80 disabled:opacity-70"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-[#efeaff] text-[#7460e8]">
                          <AccountLineIcon name="refresh" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[1.05rem] font-black leading-6 text-[#201833]">
                            {accountCopy.restorePurchasePrimary}
                          </span>
                          <span className="mt-1 block text-[0.82rem] font-bold leading-5 text-[#7f7896]">
                            {subscriptionManagementCopy.restoreDescription}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 leading-none text-[#7f7896] ${
                            isRestoringPurchases
                              ? "max-w-[5.7rem] truncate text-[0.78rem] font-extrabold"
                              : "text-[1.8rem] font-light"
                          }`}
                        >
                          {isRestoringPurchases
                            ? subscriptionManagementCopy.restoring
                            : "›"}
                        </span>
                      </button>
                    </div>

                    {billingPortalNotice ? (
                      <p className="mt-3 rounded-[18px] bg-white/66 px-4 py-3 text-center text-[0.88rem] font-bold leading-6 text-[#d33b46] ring-1 ring-white/80">
                        {billingPortalNotice}
                      </p>
                    ) : null}
                    {restorePurchaseNotice ? (
                      <p
                        className={`mt-3 rounded-[18px] bg-white/66 px-4 py-3 text-center text-[0.88rem] font-bold leading-6 ring-1 ring-white/80 ${
                          isAccountPro ? "text-[#14845f]" : "text-[#d33b46]"
                        }`}
                      >
                        {restorePurchaseNotice}
                      </p>
                    ) : null}
                    <p className="mt-4 text-center text-[0.86rem] font-bold leading-6 text-[#7f7896]">
                      {accountCopy.billingPortalStatusNote}
                    </p>
                  </section>
                ) : accountPanelView !== "checkout" ? (
                  <section className="pb-8">
                    <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/76 px-5 pb-6 pt-4 text-center shadow-[0_24px_70px_rgba(84,72,146,0.14)] ring-1 ring-[#efeaff]">
                      <span className="absolute left-8 top-12 text-[#8b67ff]/35">
                        ✦
                      </span>
                      <span className="absolute right-8 top-14 text-[#c45cff]/30">
                        ✦
                      </span>
                      <span className="absolute right-16 top-7 text-[#91dcff]/40">
                        ✦
                      </span>
                      <CrownIcon className="mx-auto h-9 w-9 text-[#8b5cf6] drop-shadow-[0_8px_14px_rgba(126,92,255,0.24)]" />
                      <h2 className="mt-3 text-[2.08rem] font-black leading-none text-[#201833]">
                        SpeakFlow Pro
                      </h2>
                      <p className="mx-auto mt-3 max-w-[390px] text-[1.02rem] font-extrabold leading-[1.12] text-[#201833]">
                        {accountCopy.proTagline}
                      </p>
                      <p className="mx-auto mt-2 max-w-none whitespace-nowrap text-[0.78rem] font-bold leading-[1.12] text-[#7f7896]">
                        {accountCopy.proDescription}
                      </p>
                      <div className="mx-auto mt-4 inline-flex items-center rounded-full bg-[#f0ecff] px-4 py-1.5 text-[0.82rem] font-extrabold text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                        {isAccountPro
                          ? accountSubscriptionDisplayLabel
                          : accountCopy.proLearners}
                      </div>
                      {accountCurrentPeriodEndLabel ? (
                        <p className="mx-auto mt-2 max-w-[280px] text-[0.86rem] font-bold leading-5 text-[#7f7896]">
                          {accountCurrentPeriodEndLabel}
                        </p>
                      ) : null}
                    </div>

                    <h3 className="mt-8 flex items-center gap-2 px-1 text-[1.08rem] font-extrabold text-[#201833]">
                      <span className="text-[#7460e8]">✦</span>
                      {accountCopy.proBenefits}
                    </h3>
                    <div className="mt-4 grid gap-3">
                      {proFeatureItems.map((feature) => (
                        <div
                          key={feature.title}
                          className="flex items-center gap-4 rounded-[24px] border border-white/78 bg-white/72 px-4 py-4 shadow-[0_14px_34px_rgba(84,72,146,0.1)]"
                        >
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[#efeaff] text-[1.75rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                            <ProFeatureIcon name={feature.icon} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[1.08rem] font-extrabold leading-6 text-[#201833]">
                              {feature.title}
                            </span>
                            <span className="mt-1 block text-[0.92rem] font-semibold leading-6 text-[#7f7896]">
                              {feature.description}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>

                    <h3 className="mt-8 flex items-center gap-2 px-1 text-[1.08rem] font-extrabold text-[#201833]">
                      <span className="text-[#7460e8]">◆</span>
                      {accountCopy.choosePlan}
                    </h3>
                    <div
                      className="mt-4 grid gap-3"
                      role="radiogroup"
                      aria-label={accountCopy.choosePlan}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedProPlan === "monthly"}
                        onClick={() => {
                          setCheckoutError("");
                          setSelectedProPlan("monthly");
                        }}
                        className={`flex min-h-[4.9rem] items-center gap-4 rounded-[24px] px-4 py-4 text-left transition ${
                          selectedProPlan === "monthly"
                            ? "border-2 border-[#9a67ff] bg-white/82 shadow-[0_18px_44px_rgba(126,92,255,0.14)]"
                            : "border border-[#e8e2ff] bg-white/68 shadow-[0_14px_34px_rgba(84,72,146,0.08)]"
                        }`}
                      >
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.95rem] font-extrabold transition ${
                            selectedProPlan === "monthly"
                              ? "bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_100%)] !text-white"
                              : "border-2 border-[#b8aed8] text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[1rem] font-extrabold text-[#201833]">
                            {accountCopy.proPlans.monthly.label}
                          </span>
                          <span className="mt-1 block text-[1.45rem] font-extrabold leading-8 text-[#201833]">
                            {accountCopy.proPlans.monthly.price}
                            <span className="text-[0.95rem] font-bold text-[#7f7896]">
                              {accountCopy.proPlans.monthly.period}
                            </span>
                          </span>
                        </span>
                        <span className="hidden rounded-full bg-[#f2efff] px-3 py-1 text-[0.78rem] font-extrabold text-[#7f7896] min-[390px]:inline">
                          {accountCopy.billingNoteMonthly}
                        </span>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={selectedProPlan === "yearly"}
                        onClick={() => {
                          setCheckoutError("");
                          setSelectedProPlan("yearly");
                        }}
                        className={`flex min-h-[5.25rem] items-center gap-4 rounded-[24px] px-4 py-4 text-left transition ${
                          selectedProPlan === "yearly"
                            ? "border-2 border-[#9a67ff] bg-white/82 shadow-[0_18px_44px_rgba(126,92,255,0.14)]"
                            : "border border-[#e8e2ff] bg-white/68 shadow-[0_14px_34px_rgba(84,72,146,0.08)]"
                        }`}
                      >
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.95rem] font-extrabold transition ${
                            selectedProPlan === "yearly"
                              ? "bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_100%)] !text-white"
                              : "border-2 border-[#b8aed8] text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-[1rem] font-extrabold text-[#201833]">
                            {accountCopy.proPlans.yearly.label}
                            <span className="rounded-[10px] bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_100%)] px-2.5 py-1 text-[0.78rem] !text-white">
                              {accountCopy.proPlans.yearly.recommended}
                            </span>
                          </span>
                          <span className="mt-1 block text-[1.45rem] font-extrabold leading-8 text-[#201833]">
                            {accountCopy.proPlans.yearly.price}
                            <span className="text-[0.95rem] font-bold text-[#7f7896]">
                              {accountCopy.proPlans.yearly.period}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-[#ffeaf7] px-3 py-1 text-[0.82rem] font-extrabold text-[#cf3e91]">
                          33% OFF
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => startStripeCheckout(selectedProPlan)}
                      disabled={isStartingCheckout}
                      aria-busy={isStartingCheckout}
                      aria-label={`${accountCopy.proCta}: ${selectedProPlanDetails.label}`}
                      className="mt-7 flex min-h-[4.1rem] w-full items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#6f55ff_0%,#a549ff_58%,#c85cff_100%)] px-5 text-[1.12rem] font-extrabold !text-white shadow-[0_22px_50px_rgba(126,92,255,0.32)] transition disabled:opacity-70 [&_*]:!text-white"
                    >
                      <CrownIcon
                        className={`mr-2 h-7 w-7 !text-white ${
                          isStartingCheckout ? "animate-pulse" : ""
                        }`}
                      />
                      {accountCopy.proCta}
                    </button>
                    {checkoutError ? (
                      <p className="mt-3 text-center text-[0.86rem] font-bold text-[#d33b46]">
                        {checkoutError}
                      </p>
                    ) : null}
                    <p className="mt-4 text-center text-[0.86rem] font-bold text-[#7f7896]">
                      {accountCopy.cancelSafety}
                    </p>
                  </section>
                ) : (
                  <section className="pb-8">
                    <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/78 px-5 pb-6 pt-6 shadow-[0_24px_70px_rgba(84,72,146,0.14)] ring-1 ring-[#efeaff]">
                      <span className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#b46cff]/12 blur-3xl" />
                      <span className="absolute -left-10 top-20 h-32 w-32 rounded-full bg-[#6edcff]/12 blur-3xl" />
                      <div className="relative">
                        <div className="flex items-center gap-3">
                          <span className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#efeaff] text-[#7a5cff] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                            <CrownIcon className="h-7 w-7" />
                          </span>
                          <div>
                            <p className="text-[0.82rem] font-extrabold uppercase tracking-[0.16em] text-[#7f7896]">
                              {accountCopy.confirmSubscription}
                            </p>
                            <h3 className="mt-1 text-[1.28rem] font-black leading-tight text-[#201833]">
                              SpeakFlow Pro {selectedProPlanDetails.label}
                            </h3>
                          </div>
                        </div>

                        <div className="mt-6 rounded-[26px] bg-[#fbf9ff]/84 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] ring-1 ring-white/85">
                          <div className="flex items-end justify-between gap-4">
                            <div>
                              <p className="text-[2.15rem] font-black leading-none text-[#201833]">
                                {selectedProPlanDetails.price}
                                <span className="ml-1 text-[1rem] font-extrabold text-[#7f7896]">
                                  {selectedProPlanDetails.period}
                                </span>
                              </p>
                              {"checkoutSummary" in selectedProPlanDetails &&
                              selectedProPlanDetails.checkoutSummary ? (
                                <p className="mt-2 text-[0.96rem] font-bold text-[#7f7896]">
                                  {selectedProPlanDetails.checkoutSummary}
                                </p>
                              ) : null}
                            </div>
                            {"discount" in selectedProPlanDetails &&
                            selectedProPlanDetails.discount ? (
                              <span className="shrink-0 rounded-full bg-[#ffeaf7] px-3 py-1.5 text-[0.82rem] font-black text-[#cf3e91]">
                                {selectedProPlanDetails.discount}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-6">
                          <h3 className="text-[1.05rem] font-black text-[#201833]">
                            {accountCopy.included}
                          </h3>
                          <div className="mt-3 grid gap-2.5">
                            {proFeatureItems.map((feature) => (
                              <div
                                key={feature.title}
                                className="flex items-center gap-3 rounded-[18px] bg-white/66 px-4 py-3 text-[0.96rem] font-extrabold text-[#201833] ring-1 ring-white/80"
                              >
                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#efeaff] text-[0.82rem] text-[#7a5cff]">
                                  ✓
                                </span>
                                <span>{feature.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 rounded-[24px] bg-white/68 px-4 py-4 ring-1 ring-white/85">
                          <p className="text-[1.02rem] font-black text-[#201833]">
                            {accountCopy.paymentMethodTitle}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {accountCopy.paymentMethods.map(
                              (method) => (
                                <span
                                  key={method}
                                  className="rounded-full bg-[#f0ecff] px-3 py-1.5 text-[0.86rem] font-extrabold text-[#6f55df]"
                                >
                                  {method}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="mt-6 flex min-h-[4.15rem] w-full items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#6f55ff_0%,#a549ff_58%,#c85cff_100%)] px-5 text-[1.14rem] font-black !text-white shadow-[0_22px_50px_rgba(126,92,255,0.34)] [&_*]:!text-white"
                        >
                          {accountCopy.confirmAndPay}
                        </button>
                        <p className="mt-4 text-center text-[0.84rem] font-bold text-[#7f7896]">
                          {accountCopy.checkoutSafety}
                        </p>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <input
                id="account-avatar-file"
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarFileChange}
              />

              {showAvatarEditor ? (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#201833]/28 px-6 backdrop-blur-sm">
                  <div className="w-full max-w-[320px] rounded-[28px] border border-white/80 bg-[#fbf9ff] px-6 py-6 text-center shadow-[0_24px_60px_rgba(84,72,146,0.28)]">
                    <div className="flex items-center justify-between text-left">
                      <h3 className="text-[1.15rem] font-extrabold text-[#201833]">
                        {accountCopy.editAvatarTitle}
                      </h3>
                      <button
                        type="button"
                        aria-label={accountCopy.closeAvatarEditor}
                        onClick={() => {
                          setShowAvatarEditor(false);
                          setAvatarEditorNotice("");
                        }}
                        className="grid h-9 w-9 place-items-center rounded-[14px] bg-[#efeaff] text-[1.2rem] font-extrabold text-[#201833]"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mx-auto mt-6 grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-white bg-[#f0ebff] text-[1.25rem] font-extrabold text-white shadow-[0_16px_34px_rgba(84,72,146,0.2)]">
                      {avatarEditorImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarEditorImage}
                          alt={accountEmail || "user"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center rounded-full bg-[linear-gradient(135deg,#ffd84d_0%,#f0b912_52%,#e9a70f_100%)] text-[#fff8dd]">
                          {accountAvatarLabel}
                        </span>
                      )}
                    </div>

                    {avatarEditorNotice ? (
                      <p className="mt-4 text-[0.86rem] font-bold text-[#d33b46]">
                        {avatarEditorNotice}
                      </p>
                    ) : null}

                    <label
                      htmlFor="account-avatar-file"
                      className="mt-6 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-[18px] bg-[#efeaff] px-4 text-[1rem] font-extrabold text-[#5b63ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]"
                    >
                      {accountCopy.changeAvatar}
                    </label>
                    <button
                      type="button"
                      onClick={saveAvatarChange}
                      className="mt-3 min-h-12 w-full rounded-[18px] bg-[#efeaff] px-4 text-[1rem] font-extrabold text-[#5b63ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]"
                    >
                      {accountCopy.save}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <section
            className={`sf-free-practice-main relative z-10 flex min-h-0 flex-1 flex-col ${
              showLandingPrompt
                ? "sf-free-practice-main-landing px-0 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-0"
                : `px-6 pt-6 ${
                    hasEnglishAttempt ? "sf-free-practice-result-main" : ""
                  } ${
                    showFreePracticeNativeListeningPrompt
                      ? "sf-free-practice-listening-main"
                      : ""
                  } ${
                    showPracticeKeyboardPanel
                      ? "sf-free-practice-keyboard-main"
                      : ""
                  } ${
                    showVoiceOnlyPrompt
                      ? "pb-[calc(5.8rem+env(safe-area-inset-bottom))]"
                      : hasEnglishAttempt
                        ? "pb-[calc(6.8rem+env(safe-area-inset-bottom))]"
                        : showPracticeKeyboardPanel
                          ? "pb-[352px]"
                          : "pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                  }`
            }`}
          >
            {!showLandingPrompt ? (
              <div className="mx-auto h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(145,220,255,0.46),transparent)]" />
            ) : null}

            {showAiGuidedNudge ? (
              <div className="absolute inset-x-0 top-6 z-20 flex justify-center px-6">
                <button
                  type="button"
                  onClick={openTrainingGroundMode}
                  className="flex items-center gap-3 text-left text-[#7c55ff] transition active:scale-[0.99]"
                  aria-label="不知道说什么，AI帮我练"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center">
                    <svg
                      viewBox="0 0 40 40"
                      aria-hidden="true"
                      className="h-10 w-10"
                      fill="none"
                    >
                      <path
                        d="M15.5 31.5h9"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="2.4"
                      />
                      <path
                        d="M16.8 35h6.4"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="2.4"
                      />
                      <path
                        d="M26.5 18.3c0-4-2.8-7.1-6.5-7.1s-6.5 3.1-6.5 7.1c0 2.6 1.2 4.7 3.2 6.2.9.7 1.3 1.6 1.3 2.7v.8h4v-.8c0-1.1.5-2 1.4-2.7 1.9-1.5 3.1-3.6 3.1-6.2Z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.4"
                      />
                      <path
                        d="M20 4.5v3M8.4 9.3l2.2 2.2M3.8 20h3.1M31.6 9.3l-2.2 2.2M33.1 20h3.1"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="2.4"
                      />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-[1.28rem] font-extrabold leading-7 text-[#201833]">
                      不知道说什么？
                    </span>
                    <span className="mt-0.5 block text-[1.08rem] font-extrabold leading-6 text-[#7c55ff]">
                      AI帮我练
                    </span>
                  </span>
                </button>
              </div>
            ) : null}

            <div
              className={`sf-free-practice-content flex min-h-0 flex-1 flex-col items-center overflow-y-auto text-left ${
                showNativeConfirmationPrompt ? "sf-native-confirmation-content" : ""
              } ${
                showLandingPrompt
                  ? "sf-free-practice-landing-content justify-start pt-0"
                  : showFreePracticeNativeListeningPrompt
                  ? "sf-free-practice-listening-content justify-start pt-0"
                  : showVoiceOnlyPrompt
                  ? "justify-start pt-28"
                  : hasEnglishAttempt
                    ? `sf-free-practice-result-content ${
                        showAiGuidedNudge
                          ? "sf-free-practice-result-content-with-nudge"
                          : ""
                      } justify-start ${
                        isFreeConversationMode
                          ? "pt-8"
                          : showAiGuidedNudge
                            ? "pt-[7.5rem]"
                            : "pt-8"
                      }`
                    : "justify-start pt-14"
              }`}
            >
              {shouldShowFreePracticeUsageMeter ? (
                <FreeUsageMeter
                  className="mb-6"
                  actionLabel={isAiGuidedMode ? "AI引导试用" : "试用"}
                  isPro={isAccountPro}
                  limit={FREE_PRACTICE_DAILY_LIMIT}
                  unitLabel="句"
                  used={freePracticeUsageCount}
                />
              ) : null}

              {showListeningPrompt ? (
                practiceStage === "english" && nativeSpeech ? (
                  <div className="w-full max-w-[360px]">
                    <h2 className="text-[1.95rem] font-extrabold leading-[2.65rem] text-[#201833]">
                      {nativeSpeech}
                    </h2>
                    <p className="mt-5 text-[1.35rem] font-extrabold text-[#201833]">
                      正在听你说英文...
                    </p>
                    <p className="mt-3 text-[1.1rem] font-extrabold text-[#4b4267]">
                      看着这句中文，用英语说出来
                    </p>
                  </div>
                ) : isFreeConversationMode && freeConversationQuestionPrompt ? (
                  <div className="w-full max-w-[360px]">
                    <p className="text-[1.1rem] font-extrabold leading-6 text-[#5b63ff]">
                      AI回复：
                    </p>
                    <h2 className="mt-4 text-[1.6rem] font-extrabold leading-9 text-[#201833]">
                      {freeConversationQuestionPrompt.english}
                    </h2>
                    {isFreeConversationHintVisible &&
                    freeConversationQuestionPrompt.hintChinese ? (
                      <p className="mt-3 text-[1.05rem] font-bold leading-7 text-[#4b4267]">
                        提示：{freeConversationQuestionPrompt.hintChinese}
                      </p>
                    ) : null}
                    <p className="mt-5 text-[1.05rem] font-extrabold leading-6 text-[#201833]">
                      用英文回答 AI。
                    </p>
                  </div>
                ) : (
                  <div className="sf-free-practice-listening-screen relative w-full text-center">
                    <span className="sf-free-practice-listening-orbit sf-free-practice-listening-orbit-lg" />
                    <span className="sf-free-practice-listening-orbit sf-free-practice-listening-orbit-sm" />
                    <span className="sf-free-practice-listening-dot sf-free-practice-listening-dot-left" />
                    <span className="sf-free-practice-listening-dot sf-free-practice-listening-dot-right" />

                    <div className="sf-free-practice-listening-mark mx-auto grid place-items-center text-[#9b7cff]">
                      <FreePracticeLandingIcon icon="mic" />
                    </div>
                    <h2 className="sf-free-practice-listening-title mx-auto mt-8 max-w-[22rem] text-center font-black text-[#141438]">
                      正在听你说话...
                    </h2>
                    <p className="sf-free-practice-listening-copy mx-auto mt-5 max-w-[18rem] text-center font-bold text-[#7f7896]">
                      自然地说中文，SpeakFlow 会帮你转换成英语练习。
                    </p>

                    <div className="sf-free-practice-listening-wave-band" aria-hidden="true">
                      <span className="sf-free-practice-listening-wave-layer sf-free-practice-listening-wave-layer-back" />
                      <span className="sf-free-practice-listening-wave-layer sf-free-practice-listening-wave-layer-front" />
                      <span className="sf-free-practice-listening-spark sf-free-practice-listening-spark-one" />
                      <span className="sf-free-practice-listening-spark sf-free-practice-listening-spark-two" />
                      <span className="sf-free-practice-listening-spark sf-free-practice-listening-spark-three" />
                    </div>

                    <div className="sf-free-practice-listening-tip mx-auto flex items-center gap-4 text-left">
                      <span className="grid shrink-0 place-items-center rounded-full bg-[#f0edff] text-[#8b6dff]">
                        <FreePracticeLandingIcon icon="sparkle" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-black text-[#17163c]">
                          小提示
                        </span>
                        <span className="mt-1 block font-bold leading-6 text-[#7f7896]">
                          说得越自然，AI 给出的表达就越贴近真实语境哦！
                        </span>
                      </span>
                    </div>
                  </div>
                )
              ) : showNativeConfirmationPrompt ? (
                <div className="sf-native-confirmation-card w-full max-w-[300px]">
                  <p className="sf-native-confirmation-label text-[0.92rem] font-extrabold leading-5 text-[#6b4dff]">
                    你想表达的是：
                  </p>
                  <label className="sf-native-confirmation-input mt-4 block rounded-[16px] border-[10px] border-white/62 bg-white/74 px-3 py-2 shadow-[0_16px_34px_rgba(84,72,146,0.12),inset_0_1px_0_rgba(255,255,255,0.84)]">
                    <textarea
                      value={nativeSpeech}
                      onChange={(event) =>
                        updateNativeSpeechDraft(event.target.value)
                      }
                      rows={3}
                      lang="zh-CN"
                      className="sf-native-confirmation-textarea block min-h-[6.2rem] w-full resize-none bg-transparent text-[1.08rem] font-extrabold leading-7 text-[#201833] outline-none"
                    />
                  </label>
                  <p className="sf-native-confirmation-help mt-4 text-[0.78rem] font-bold leading-5 text-[#7f7896]">
                    如果识别错了，可以直接修改，或者重新说一遍。
                  </p>
                  <div className="sf-native-confirmation-actions mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={retryNativeSpeech}
                      className="min-h-10 rounded-[14px] bg-white/72 px-4 text-[0.9rem] font-black text-[#4b4267] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_20px_rgba(84,72,146,0.08)] transition active:scale-[0.98]"
                    >
                      重说
                    </button>
                    <button
                      type="button"
                      onClick={confirmNativeSpeech}
                      disabled={!nativeSpeech.trim()}
                      className="min-h-10 rounded-[14px] bg-[#7c55ff] px-4 text-[0.9rem] font-black text-white shadow-[0_14px_28px_rgba(124,85,255,0.24)] transition active:scale-[0.98] disabled:opacity-45"
                    >
                      确认
                    </button>
                  </div>
                </div>
              ) : showFreeConversationAnswerPrompt &&
                freeConversationQuestionPrompt ? (
                <div className="w-full max-w-[360px]">
                  <p className="text-[1.1rem] font-extrabold leading-6 text-[#5b63ff]">
                    AI回复：
                  </p>
                  <h2 className="mt-4 text-[1.6rem] font-extrabold leading-9 text-[#201833]">
                    {freeConversationQuestionPrompt.english}
                  </h2>
                  {isFreeConversationHintVisible &&
                  freeConversationQuestionPrompt.hintChinese ? (
                    <p className="mt-3 text-[1.05rem] font-bold leading-7 text-[#4b4267]">
                      提示：{freeConversationQuestionPrompt.hintChinese}
                    </p>
                  ) : null}
                  <p className="mt-5 text-[1.05rem] font-extrabold leading-6 text-[#201833]">
                    点击麦克风，用英文回答 AI。
                  </p>
                </div>
              ) : showLandingPrompt ? (
                <div className="sf-free-practice-landing relative w-full px-6 pb-0 pt-6 text-center">
                  <span className="pointer-events-none absolute left-1/2 top-6 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full border border-[#d8d2ff]/48" />
                  <span className="pointer-events-none absolute left-1/2 top-[5.25rem] h-[16rem] w-[16rem] -translate-x-1/2 rounded-full border border-[#e2dcff]/46" />
                  <span className="pointer-events-none absolute left-[17%] top-[7.5rem] h-2 w-2 rounded-full bg-[#b8a7ff]/62" />
                  <span className="pointer-events-none absolute right-[16%] top-[10.8rem] h-3 w-3 rounded-full bg-[#a996ff]/58" />

                  <div className="relative mx-auto max-w-[22rem]">
                    <div className="mx-auto grid h-7 w-7 place-items-center text-[#9b7cff]">
                      <FreePracticeLandingIcon icon="mic" />
                    </div>
                    <h2 className="mt-3 text-[2.15rem] font-black leading-[1.08] tracking-[-0.01em] text-[#141438] min-[390px]:text-[2.35rem]">
                      <span className="block">先说中文，</span>
                      <span className="block bg-[linear-gradient(135deg,#141438_0%,#7c55ff_44%,#9d6bff_100%)] bg-clip-text text-transparent">
                        再大胆说英语
                      </span>
                    </h2>
                    <p className="mt-4 text-[0.92rem] font-extrabold leading-6 text-[#7f7896] min-[390px]:text-[0.98rem]">
                      AI 会一步步帮你说得更自然、更地道。
                    </p>
                  </div>

                  <div className="relative mx-auto mt-6 max-w-[21rem] rounded-[28px] border border-[#ded7ff] bg-white/62 px-4 py-4 text-left shadow-[0_24px_58px_rgba(84,72,146,0.13),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                    <h3 className="text-[0.98rem] font-black text-[#17163c]">
                      练习只需
                      <span className="mx-1 text-[#7c55ff]">4</span>
                      步
                    </h3>
                    <div className="mt-2.5 grid gap-0">
                      {freePracticeLandingSteps.map((step, index) => (
                        <div
                          key={step.step}
                          className={`grid grid-cols-[1.8rem_3rem_1fr] items-center gap-2.5 py-1 ${
                            index === 0 ? "" : "border-t border-[#e7e2ff]"
                          }`}
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(135deg,#8b7cff_0%,#6f55ff_100%)] text-[0.82rem] font-black text-white shadow-[0_10px_20px_rgba(124,85,255,0.22)]">
                            {step.step}
                          </span>
                          <span className="grid h-[3rem] w-[3rem] place-items-center rounded-[15px] bg-[#f0edff] text-[#8b6dff] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                            <FreePracticeLandingIcon icon={step.icon} />
                          </span>
                          <span className="min-w-0 border-l border-dashed border-[#ddd6ff] pl-3">
                            <span className="block text-[0.88rem] font-black leading-5 text-[#17163c] min-[390px]:text-[0.94rem]">
                              {step.title}
                            </span>
                            <span className="mt-0.5 block text-[0.72rem] font-bold leading-4 text-[#7f7896] min-[390px]:text-[0.78rem]">
                              {step.description}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative mx-auto mt-5 grid max-w-[20.75rem] grid-cols-3 gap-2.5">
                    {freePracticeLandingChips.map((chip) => (
                      <span
                        key={chip.label}
                        className="flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-white/80 bg-white/62 px-2 text-[0.74rem] font-black text-[#7c55ff] shadow-[0_14px_30px_rgba(84,72,146,0.1)] min-[390px]:text-[0.82rem]"
                      >
                        <span className="grid h-4 w-4 place-items-center">
                          <FreePracticeLandingIcon icon={chip.icon} />
                        </span>
                        <span>{chip.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : showNativeCompletePrompt ? (
                <>
                  <div className="w-full max-w-[360px]">
                    <h2 className="text-[1.95rem] font-extrabold leading-[2.65rem] text-[#201833]">
                      {nativeSpeech}
                    </h2>
                    <p className="mt-5 text-[1.15rem] font-extrabold text-[#4b4267]">
                      看着这句中文，用英语说出来
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {hasEnglishAttempt ? (
                    isFreeConversationMode ? (
                      <>
                        <div className="sf-free-practice-user-expression w-full max-w-[360px] text-left">
                          <p className="text-[1rem] font-extrabold leading-5 text-[#7f7896]">
                            你的表达：
                          </p>
                          <p className="sf-free-practice-user-card mt-3 rounded-[18px] bg-white/10 px-4 py-3 text-[1.05rem] font-bold leading-6 text-[#8f879c]">
                            {message}
                          </p>
                        </div>

                        <div className="mt-5 w-full max-w-[360px] text-left">
                          <div className="flex items-center gap-2 text-left">
                            <span className="text-[1.05rem] font-extrabold leading-6 text-[#4f6fe8]">
                              {selectedFreeConversationExpression.label}
                            </span>
                            <button
                              type="button"
                              aria-label="切换表达"
                              onClick={() =>
                                setSelectedExpressionIndex((index) =>
                                  (index + 1) %
                                  freeConversationExpressionVariants.length
                                )
                              }
                              disabled={isLoadingFreeConversation}
                              className="grid h-8 w-8 place-items-center rounded-full bg-white/35 text-lg font-extrabold text-[#5b8cff] transition disabled:opacity-50"
                            >
                              →
                            </button>
                          </div>
                          <p className="mt-3 bg-white/18 px-4 py-3 text-center text-[1.35rem] font-extrabold leading-8 text-[#201833]">
                            {isLoadingFreeConversation
                              ? "正在生成英文表达..."
                              : selectedFreeConversationExpressionSegments.map(
                                  (segment, index) =>
                                    segment.type === "expression" ? (
                                      <button
                                        key={`${segment.value}-${index}`}
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleExpressionClick(
                                            segment.expression,
                                            selectedFreeConversationExpression.text
                                          );
                                        }}
                                        className="inline rounded-xl bg-[#fff7b8]/70 px-1.5 py-0.5 text-[#201833] shadow-[inset_0_-0.28em_0_rgba(255,215,106,0.55)] transition hover:bg-[#fff0a0]"
                                      >
                                        {segment.value}
                                      </button>
                                    ) : (
                                      <span key={`${segment.value}-${index}`}>
                                        {tokenizeEnglishSentence(segment.value).map(
                                          (token, tokenIndex) =>
                                            token.type === "word" &&
                                            token.normalized ? (
                                              <button
                                                key={`${token.value}-${tokenIndex}`}
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  handleWordClick(
                                                    token.value,
                                                    selectedFreeConversationExpression.text
                                                  );
                                                }}
                                                className="inline rounded-md px-0.5 text-[#201833] transition hover:bg-white/45 active:bg-[#fff7b8]/70"
                                              >
                                                {token.value}
                                              </button>
                                            ) : (
                                              <span
                                                key={`${token.value}-${tokenIndex}`}
                                              >
                                                {token.value}
                                              </span>
                                            )
                                        )}
                                      </span>
                                    )
                                )}
                          </p>
                          {vocabularyNotice ? (
                            <p className="sf-free-practice-notice mt-2 text-center text-sm font-semibold text-[#7f7896]">
                              {vocabularyNotice}
                            </p>
                          ) : null}
                        </div>

                        {isLoadingFreeConversation || freeConversationResponse ? (
                          <div className="mt-5 w-full max-w-[360px] text-left">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[0.98rem] font-extrabold leading-5 text-[#5b63ff]">
                                AI回复：
                              </p>
                              {!isLoadingFreeConversation &&
                              freeConversationResponse?.hintChinese ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setIsFreeConversationHintVisible(true)
                                  }
                                  className="rounded-full bg-white/35 px-3 py-1 text-[0.86rem] font-extrabold text-[#5b63ff] transition hover:bg-white/55"
                                >
                                  提示
                                </button>
                              ) : null}
                            </div>
                            <p className="mt-2 text-[1.08rem] font-extrabold leading-7 text-[#201833]">
                              {isLoadingFreeConversation
                                ? "AI正在准备下一句回复..."
                                : freeConversationResponse?.questionEnglish}
                            </p>
                            {!isLoadingFreeConversation &&
                            isFreeConversationHintVisible &&
                            freeConversationResponse?.hintChinese ? (
                              <p className="mt-2 rounded-[14px] bg-white/18 px-3 py-2 text-[0.95rem] font-bold leading-6 text-[#4b4267]">
                                提示：{freeConversationResponse.hintChinese}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    ) : (
                    <>
                      <div className="sf-free-practice-user-expression w-full max-w-[360px] text-left">
                        <p className="text-[1.16rem] font-extrabold text-[#7f7896]">
                          你的表达:
                        </p>
                        <p className="sf-free-practice-user-card mt-5 text-[1.3rem] font-bold leading-9 text-[#8f879c]">
                          {message}
                        </p>
                      </div>

                      {isAiGuidedMode &&
                      (isLoadingGuidedFollowup || guidedFollowupSuggestion) ? (
                        <div className="sf-guided-followup-card relative mt-6 w-full max-w-[360px] rounded-[24px] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.78)_0%,rgba(247,240,255,0.66)_56%,rgba(230,211,255,0.58)_100%)] px-5 py-5 text-left shadow-[0_14px_34px_rgba(116,83,180,0.18),inset_0_1px_0_rgba(255,255,255,0.86)]">
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-9 rounded-b-[24px] bg-[linear-gradient(90deg,rgba(169,121,255,0.16),rgba(255,255,255,0.06),rgba(169,121,255,0.18))]" />
                          <div className="relative z-10 flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-2 text-[1.18rem] font-black leading-7 text-[#6b4dff]">
                                <span className="text-[1.32rem]">🌟</span>
                                <span>下一句你可以这样说</span>
                              </p>
                              <p className="mt-5 text-[1.55rem] font-black leading-[2.15rem] text-[#201833]">
                                {isLoadingGuidedFollowup
                                  ? "AI正在帮你想下一句..."
                                  : guidedFollowupSuggestion}
                              </p>
                            </div>
                            <span className="pointer-events-none relative mt-[-0.15rem] h-12 w-14 shrink-0">
                              <span className="absolute right-0 top-1 grid h-10 w-12 place-items-center rounded-[20px] bg-[linear-gradient(135deg,#ffffff_0%,#efe8ff_100%)] shadow-[0_8px_22px_rgba(116,83,180,0.18)]">
                                <span className="relative grid h-7 w-10 place-items-center rounded-[15px] bg-[#29255f] text-[#76fff4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]">
                                  <span className="absolute left-2 top-2.5 h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="absolute right-2 top-2.5 h-1.5 w-1.5 rounded-full bg-current" />
                                  <span className="mt-2.5 h-1.5 w-4 rounded-b-full border-b-2 border-current" />
                                </span>
                              </span>
                              <span className="absolute right-3 top-0 h-2.5 w-2.5 rounded-full bg-[#efe8ff] shadow-[0_-7px_0_-2px_#c7b6ff]" />
                              <span className="absolute right-0 top-0 text-[0.72rem] text-[#9a76ff]">
                                ✦
                              </span>
                              <span className="absolute left-0 bottom-2 text-[0.74rem] text-[#ffd27a]">
                                ✦
                              </span>
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <div className="sf-free-practice-standard-block mt-4 w-full max-w-[360px]">
                          {isLoadingExpressionVariants ? (
                            <p className="text-[1.25rem] font-extrabold leading-8 text-[#4f6fe8]">
                              正在生成表达...
                            </p>
                          ) : (
                            <div className="grid gap-8">
                              {expressionVariantsForDisplay.map((variant, variantIndex) => {
                                const segments =
                                  splitSentenceByHighlightedExpressions(
                                    variant.text || "",
                                    highlightedExpressions
                                  );
                                const isSelected =
                                  selectedExpressionIndex === variantIndex;

                                return (
                                  <div
                                    key={variant.key}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`选择朗读${variant.label}`}
                                    onClick={() =>
                                      setSelectedExpressionIndex(variantIndex)
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        setSelectedExpressionIndex(variantIndex);
                                      }
                                    }}
                                    className={`cursor-pointer border-l-[4px] py-1 pl-4 text-left transition ${
                                      isSelected
                                        ? "border-[#7c55ff]"
                                        : "border-transparent"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <p
                                        className={`text-[1.26rem] font-extrabold leading-7 transition ${
                                          isSelected
                                            ? "text-[#6b4dff]"
                                            : "text-[#4f6fe8]"
                                        }`}
                                      >
                                        {variant.label}
                                      </p>
                                      <button
                                        type="button"
                                        aria-label={`朗读${variant.label}`}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          readExpressionVariant(
                                            variant,
                                            variantIndex
                                          );
                                        }}
                                        className={`grid h-9 w-11 shrink-0 place-items-center rounded-[14px] text-[1rem] font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_8px_18px_rgba(84,72,146,0.1)] transition active:scale-95 ${
                                          isSelected
                                            ? "bg-[#efeaff] text-[#6b4dff]"
                                            : "bg-white/42 text-[#201833]"
                                        }`}
                                      >
                                        <PlayIcon className="h-4 w-4 translate-x-[1px]" />
                                      </button>
                                    </div>
                                    <p className="sf-free-practice-expression-text mt-3 text-[1.78rem] font-extrabold leading-[2.55rem] text-[#201833]">
                                      {segments.map((segment, index) =>
                                        segment.type === "expression" ? (
                                          <button
                                            key={`${segment.value}-${index}`}
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleExpressionClick(
                                                segment.expression,
                                                variant.text
                                              );
                                            }}
                                            className="inline rounded-xl bg-[#fff7b8]/70 px-1.5 py-0.5 text-[#201833] shadow-[inset_0_-0.28em_0_rgba(255,215,106,0.55)] transition hover:bg-[#fff0a0]"
                                          >
                                            {segment.value}
                                          </button>
                                        ) : (
                                          <span key={`${segment.value}-${index}`}>
                                            {tokenizeEnglishSentence(
                                              segment.value
                                            ).map((token, tokenIndex) =>
                                              token.type === "word" &&
                                              token.normalized ? (
                                                <button
                                                  key={`${token.value}-${tokenIndex}`}
                                                  type="button"
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleWordClick(
                                                      token.value,
                                                      variant.text
                                                    );
                                                  }}
                                                  className="inline rounded-md px-0.5 text-[#201833] transition hover:bg-white/45 active:bg-[#fff7b8]/70"
                                                >
                                                  {token.value}
                                                </button>
                                              ) : (
                                                <span
                                                  key={`${token.value}-${tokenIndex}`}
                                                >
                                                  {token.value}
                                                </span>
                                              )
                                            )}
                                          </span>
                                        )
                                      )}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {vocabularyNotice ? (
                            <p className="sf-free-practice-notice mt-6 text-left text-[0.98rem] font-semibold text-[#7f7896]">
                              {vocabularyNotice}
                            </p>
                          ) : null}
                      </div>
                    </>
                    )
                  ) : (
                    <>
                      <p className="w-full max-w-[360px] text-[1.9rem] font-extrabold leading-[2.55rem] text-[#201833]">
                        {message}
                      </p>
                      <div className="mt-4 w-full max-w-[340px] text-[1.08rem] font-extrabold leading-7 text-[#4b4267]">
                        {hasNativeSpeech
                          ? "试着用英语说出来"
                          : "自然地说中文，SpeakFlow 会帮你转换成英语练习。"}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </section>

          {showVoiceOnlyPrompt ? (
            showLandingPrompt ? (
              <div className="sf-free-practice-landing-actions absolute inset-x-0 bottom-0 z-20 flex min-h-[9.6rem] flex-col items-center justify-end overflow-hidden px-6 pb-[max(0.95rem,env(safe-area-inset-bottom))]">
                <span className="sf-free-practice-landing-wave sf-free-practice-landing-wave-back" />
                <span className="sf-free-practice-landing-wave sf-free-practice-landing-wave-front" />
                <button
                  type="button"
                  onClick={handlePrimaryPracticeAction}
                  className="relative z-10 grid h-[6.9rem] w-[6.9rem] place-items-center rounded-full bg-white text-[#7c55ff] shadow-[0_24px_62px_rgba(124,85,255,0.24),0_0_0_14px_rgba(255,255,255,0.28),inset_0_1px_0_rgba(255,255,255,0.92)] transition active:scale-[0.98]"
                  aria-label="点击麦克风开始练习"
                >
                  <Image
                    src="/icons/glow-mic.svg"
                    alt=""
                    width={112}
                    height={112}
                    className="h-[4.35rem] w-[4.35rem]"
                  />
                </button>
                <p className="relative z-10 mt-3 flex items-center justify-center gap-2 text-[0.9rem] font-extrabold text-[#7f7896]">
                  <span className="grid h-5 w-5 place-items-center rounded-[6px] border-2 border-current text-[0.7rem] leading-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                  点击麦克风开始练习
                </p>
              </div>
            ) : showFreePracticeNativeListeningPrompt ? (
              <div className="sf-free-practice-listening-actions absolute inset-x-0 bottom-0 z-20 flex min-h-[12rem] flex-col items-center justify-end overflow-hidden px-6 pb-[max(1.45rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={handlePrimaryPracticeAction}
                  className="relative z-10 grid h-[7.35rem] w-[7.35rem] place-items-center rounded-full bg-white text-[#7c55ff] shadow-[0_26px_64px_rgba(124,85,255,0.22),0_0_0_18px_rgba(255,255,255,0.32),0_0_0_34px_rgba(161,139,255,0.08),inset_0_1px_0_rgba(255,255,255,0.94)] transition active:scale-[0.98]"
                  aria-label="点击麦克风结束录音"
                >
                  <Image
                    src="/icons/glow-mic.svg"
                    alt=""
                    width={112}
                    height={112}
                    className="h-[4.7rem] w-[4.7rem]"
                  />
                </button>
                <p className="relative z-10 mt-5 flex items-center justify-center gap-2 text-[0.98rem] font-extrabold text-[#8a91a8]">
                  <span className="grid h-5 w-5 place-items-center rounded-[6px] border-2 border-current text-[0.7rem] leading-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                  点击麦克风结束录音
                </p>
              </div>
            ) : (
              <div className="sf-free-practice-voice-actions absolute inset-x-0 bottom-0 z-20 flex min-h-[5.25rem] items-center justify-center border-t border-[#cfc4ff]/72 bg-[linear-gradient(180deg,rgba(228,220,255,0.78),rgba(215,207,252,0.94))] px-6 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-10px_24px_rgba(100,82,180,0.08),inset_0_1px_0_rgba(255,255,255,0.52)] backdrop-blur-xl">
                <button
                  type="button"
                  onClick={handlePrimaryPracticeAction}
                  className={`grid place-items-center text-[#7f7896] transition ${
                    isListening ? "scale-105" : ""
                  }`}
                  aria-label={isListening ? "停止语音输入" : "点击开始说话"}
                >
                  <Image
                    src="/icons/glow-mic.svg"
                    alt=""
                    width={96}
                    height={96}
                    className="h-[4.3rem] w-[4.3rem]"
                  />
                </button>
              </div>
            )
          ) : null}

          {hasEnglishAttempt && !showReferenceResult ? (
            <div className="sf-free-practice-result-actions absolute inset-x-0 bottom-0 z-20 grid min-h-[5.45rem] grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[#cfc4ff]/72 bg-[linear-gradient(180deg,rgba(228,220,255,0.78),rgba(215,207,252,0.94))] px-5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-10px_24px_rgba(100,82,180,0.08),inset_0_1px_0_rgba(255,255,255,0.52)] backdrop-blur-xl min-[390px]:gap-4 min-[390px]:px-8">
              <button
                type="button"
                aria-label="播放朗读"
                onClick={() => readStandardEnglish(1)}
                disabled={isFreeConversationMode && isLoadingFreeConversation}
                className="ml-auto flex h-10 min-w-[3.15rem] items-center justify-center rounded-[15px] bg-white/46 px-3 text-[1.05rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_9px_18px_rgba(84,72,146,0.1)] transition disabled:opacity-50 min-[390px]:h-11 min-[390px]:min-w-[3.35rem] min-[390px]:px-4 min-[390px]:text-[1.15rem]"
              >
                <PlayIcon className="h-4 w-4 translate-x-[1px]" />
              </button>

              <button
                type="button"
                onClick={handlePrimaryPracticeAction}
                disabled={isFreeConversationMode && isLoadingFreeConversation}
                className="grid place-items-center text-[#7f7896] transition disabled:opacity-50"
                aria-label={
                  isFreeConversationMode ? "用英文回答AI" : "点击开始说话"
                }
              >
                <Image
                  src="/icons/glow-mic.svg"
                  alt=""
                  width={96}
                  height={96}
                  className="h-[4.3rem] w-[4.3rem] min-[390px]:h-[4.45rem] min-[390px]:w-[4.45rem]"
                />
              </button>

              <button
                type="button"
                aria-label="慢速朗读"
                onClick={() => readStandardEnglish(SLOW_READ_RATE)}
                disabled={isFreeConversationMode && isLoadingFreeConversation}
                className="mr-auto flex h-10 min-w-[4.65rem] items-center justify-center gap-1.5 rounded-[15px] bg-white/46 px-3 text-[0.88rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_9px_18px_rgba(84,72,146,0.1)] transition disabled:opacity-50 min-[390px]:h-11 min-[390px]:min-w-[5.35rem] min-[390px]:gap-2 min-[390px]:px-4 min-[390px]:text-[0.95rem]"
              >
                <PlayIcon className="h-4 w-4 translate-x-[1px]" />
                <span>0.5x</span>
              </button>
            </div>
          ) : null}

          {showQuickPanel ? (
            <div
              className={`sf-quick-panel absolute inset-x-0 bottom-0 top-[86px] z-40 overflow-y-auto pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 text-[#201833] ${
                showClassicCoursePicker
                  ? "bg-white px-5 min-[390px]:px-6"
                  : "bg-[linear-gradient(180deg,#d8cffc_0%,#ddd5ff_52%,#e7e0ff_100%)] px-11"
              }`}
            >
              {showClassicCoursePicker ? (
                selectedClassicCourseCategoryId !== "__legacy-classic-menu" ? (
                  renderClassicCoursePicker()
                ) : (
                <div className="grid gap-2 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowClassicCoursePicker(false);
                      resetClassicCoursePicker();
                    }}
                    className="w-full px-1 pb-3 pt-1 text-left text-[2rem] font-extrabold leading-tight text-[#201833] transition hover:text-[#5b63ff]"
                  >
                    经典口语练习
                  </button>

                  <div className="grid gap-1">
                    {classicCourseCategories.map((category) => {
                      const isCategoryOpen =
                        selectedClassicCourseCategoryId === category.id;

                      return (
                        <div key={category.id} className="grid gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (isCategoryOpen) {
                                setSelectedClassicCourseCategoryId("");
                                setSelectedClassicCourseSectionId("");
                                return;
                              }

                              setSelectedClassicCourseCategoryId(category.id);
                              setSelectedClassicCourseSectionId("");
                            }}
                            className="w-full px-1 py-2.5 text-left text-[1.42rem] font-extrabold leading-8 text-[#201833] transition hover:text-[#5b63ff]"
                          >
                            <MenuGlyph
                              level={3}
                              className={`transition-transform ${
                                isCategoryOpen ? "rotate-90" : ""
                              }`}
                            />
                            {category.label}
                          </button>

                          {isCategoryOpen ? (
                            <div className="ml-8 grid gap-1">
                              {category.sections.map((section) => {
                                const isSectionOpen =
                                  selectedClassicCourseSectionId === section.id;

                                return (
                                  <div key={section.id} className="grid gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isSectionOpen) {
                                          setSelectedClassicCourseSectionId("");
                                          return;
                                        }

                                        setSelectedClassicCourseSectionId(
                                          section.id
                                        );
                                      }}
                                      className="w-full px-1 py-2 text-left text-[1.2rem] font-extrabold leading-7 text-[#201833] transition hover:text-[#5b63ff]"
                                    >
                                      <MenuGlyph
                                        level={3}
                                        className={`transition-transform ${
                                          isSectionOpen ? "rotate-90" : ""
                                        }`}
                                      />
                                      {section.label}
                                    </button>

                                    {isSectionOpen ? (
                                      <div className="ml-8 grid gap-0.5">
                                        {section.lessons.length ? (
                                          section.lessons.map((lesson) =>
                                            lesson.id ? (
                                              <button
                                                key={lesson.id}
                                                type="button"
                                                onClick={() =>
                                                  openClassicLesson(
                                                    lesson.id!,
                                                    lesson.title
                                                  )
                                                }
                                                className="w-full px-1 py-1.5 text-left text-[1.02rem] font-semibold leading-6 text-[#201833] transition hover:text-[#5b63ff]"
                                              >
                                                {lesson.title}
                                              </button>
                                            ) : (
                                              <div
                                                key={lesson.title}
                                                className="w-full px-1 py-1.5 text-left text-[1.02rem] font-semibold leading-6 text-[#4b4267]"
                                              >
                                                {lesson.title}
                                              </div>
                                            )
                                          )
                                        ) : (
                                          <p className="px-1 py-1.5 text-[1rem] font-semibold text-[#4b4267]">
                                            暂无课程
                                          </p>
                                        )}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
                )
              ) : (
                <div className="grid gap-3 py-2">
                  {quickPracticeStarters.map((item) => (
                    <div key={item.id} className="grid gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);

                          if (item.id === "guided") {
                            openTrainingGroundMode();
                            setShowExpressionMenu(false);
                            setShowClassicCoursePicker(false);
                            resetClassicCoursePicker();
                            return;
                          }

                          if (item.id === "expression") {
                            setShowClassicCoursePicker(false);
                            resetClassicCoursePicker();
                            setShowExpressionMenu((current) => !current);
                            return;
                          }

                          if (item.id === "classic") {
                            setShowExpressionMenu(false);
                            resetClassicCoursePicker();
                            setShowClassicCoursePicker(true);
                            return;
                          }

                          setShowQuickPanel(false);
                        }}
                        className="grid w-full grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-3 px-1 py-2.5 text-left text-[1.24rem] font-extrabold leading-7 text-[#201833] transition hover:text-[#5b63ff]"
                      >
                        <MenuGlyph level={2} />
                        <span className="min-w-0">
                          <span className="block">{item.title}</span>
                          <span className="mt-1 block text-[0.82rem] font-bold leading-5 text-[#7f7896]">
                            {item.description}
                          </span>
                        </span>
                      </button>

                      {item.id === "expression" && showExpressionMenu ? (
                        <div className="ml-8 grid gap-1 py-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = "/vocabulary";
                            }}
                            className="flex w-full items-center justify-between gap-3 px-1 py-2.5 text-left text-[1.05rem] font-extrabold leading-6 text-[#201833] transition hover:text-[#5b63ff]"
                          >
                            <span className="min-w-0 truncate">
                              <MenuGlyph level={3} />
                              学习新表达
                            </span>
                            <span className="shrink-0 text-[1rem] font-bold opacity-60">
                              ›
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = "/vocabulary?library=1";
                            }}
                            className="flex w-full items-center justify-between gap-3 px-1 py-2.5 text-left text-[1.05rem] font-extrabold leading-6 text-[#201833] transition hover:text-[#5b63ff]"
                          >
                            <span className="min-w-0 truncate">
                              <MenuGlyph level={3} />
                              我的表达库
                            </span>
                            <span className="shrink-0 text-[1rem] font-bold opacity-60">
                              ›
                            </span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {showPracticeKeyboardPanel ? (
          <div className="sf-keyboard-panel absolute inset-x-0 bottom-0 z-20 rounded-t-[32px] px-3 pb-3 pt-3 text-[#fffaff]">
            <div className="sf-composer mb-3 p-2">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  aria-label="打开菜单"
                  onClick={togglePracticeMenu}
                  className="grid h-12 w-14 shrink-0 place-items-center rounded-[22px] border border-white/10 bg-white/[0.08] text-3xl font-light text-[#efe9ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  +
                </button>

                <label className="min-w-0 flex-1 rounded-[22px] border border-white/10 bg-[#efe9ff]/[0.10] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                  <textarea
                    ref={textareaRef}
                    value={renderedInputValue}
                    onChange={(event) => {
                      setInputText(event.target.value);
                      setComposingPinyin("");
                    }}
                    onFocus={() => {
                      if (
                        typeof navigator !== "undefined" &&
                        navigator.maxTouchPoints > 0
                      ) {
                        setShowPreviewKeyboard(false);
                      }
                    }}
                    rows={1}
                    lang={keyboardMode === "en" ? "en-US" : "zh-CN"}
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    spellCheck
                    placeholder="说出你想表达的话…"
                    className="block max-h-24 min-h-[32px] w-full resize-none overflow-hidden bg-transparent text-[1rem] font-medium leading-8 text-[#fffaff] outline-none placeholder:text-[#a9a0c7]"
                  />
                </label>

                <button
                  type="button"
                  aria-label={isListening ? "停止语音输入" : "开始语音输入"}
                  onClick={handleComposerPracticeAction}
                  onContextMenu={(event) => event.preventDefault()}
                  className={`sf-voice-button speakflow-breathe grid h-12 w-14 shrink-0 touch-none place-items-center rounded-[22px] transition ${
                    isListening ? "scale-105 ring-4 ring-[#91dcff]/18" : ""
                  }`}
                >
                  <VoiceGlyph active={isListening} />
                </button>
              </div>
            </div>

            {showPreviewKeyboard ? (
              <>
                {keyboardMode === "zh" ? (
                  <div className="mb-2 flex h-9 items-center gap-4 overflow-hidden px-2 text-[1.25rem] font-semibold text-[#fffaff]">
                    {chineseCandidates.map((candidate) => (
                      <button
                        key={candidate}
                        type="button"
                        onClick={() => {
                          if (candidate === "？" || candidate === "！") {
                            appendText(candidate);
                            return;
                          }
                          commitChineseCandidate(candidate);
                        }}
                        className="shrink-0"
                      >
                        {candidate}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={togglePracticeMenu}
                      className="ml-auto shrink-0 text-xl text-[#91dcff]"
                    >
                      ⌄
                    </button>
                  </div>
                ) : (
                  <div className="mb-2 flex items-center justify-between px-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#91dcff]">
                      {currentMode.label}
                    </span>
                    <button
                      type="button"
                      aria-label="Hide preview keyboard"
                      onClick={() => setShowPreviewKeyboard(false)}
                      className="text-xl leading-none text-[#c9c0df]"
                    >
                      ⌄
                    </button>
                  </div>
                )}

                {keyboardMode === "handwriting" ? (
                  <div className="px-1">
                    <canvas
                      ref={canvasRef}
                      width={700}
                      height={178}
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                      className="sf-handwriting-canvas h-[112px] w-full touch-none rounded-[24px]"
                    />
                    <div className="mt-2 flex items-center gap-2 overflow-hidden">
                      {handwritingCandidates.map((candidate) => (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() => commitHandwriting(candidate)}
                          className="sf-key h-8 min-w-9 px-2 text-lg font-semibold"
                        >
                          {candidate}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={clearHandwriting}
                        className="sf-key ml-auto h-8 px-3 text-sm font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeRows.map((row, rowIndex) => (
                      <div
                        key={`row-${rowIndex}`}
                        className={`flex justify-center gap-1.5 ${
                          rowIndex === 1 ? "px-5" : ""
                        }`}
                      >
                        {row.map((key) => {
                          const label =
                            key === "shift"
                              ? "⇧"
                              : key === "backspace"
                                ? "⌫"
                                : isShifted && /^[a-z]$/.test(key)
                                  ? key.toUpperCase()
                                  : key;

                          return (
                            <button
                              type="button"
                              key={key}
                              onClick={() => handleKeyPress(key)}
                              className={`sf-key h-10 text-[18px] font-semibold ${
                                key === "shift" || key === "backspace"
                                  ? "w-11"
                                  : "w-9"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ))}

                    {showEmojiPanel ? (
                      <div className="grid grid-cols-6 gap-1.5 rounded-[18px] border border-white/10 bg-white/[0.05] p-1.5 backdrop-blur-xl">
                        {emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => appendText(emoji)}
                            className="sf-key h-8 text-base"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          switchKeyboardMode(
                            keyboardMode === "symbols" ? "zh" : "symbols"
                          )
                        }
                        className="sf-key h-11 w-14 text-sm font-semibold"
                      >
                        {keyboardMode === "symbols" ? "ABC" : "123"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPanel((current) => !current)}
                        className="sf-key h-11 w-11 text-base"
                      >
                        ☺
                      </button>
                      <button
                        type="button"
                        onClick={handleSpace}
                        className="sf-key h-11 flex-1 text-[13px] font-medium text-[#b7aecf]"
                      >
                        {keyboardMode === "zh" ? "拼" : "space"}
                      </button>
                      <button
                        type="button"
                        onClick={() => appendText("\n")}
                        className="sf-key h-11 w-16 text-2xl font-semibold"
                      >
                        ↵
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            <div className="flex items-center justify-between px-7 pt-2 text-[#efe9ff]">
              <button
                type="button"
                aria-label="Switch input mode"
                onClick={() => {
                  setShowPreviewKeyboard(true);
                  switchKeyboardMode();
                }}
                className="sf-footer-button text-[1.35rem]"
              >
                ◎
              </button>
              <span className="rounded-full border border-[#91dcff]/20 bg-[#91dcff]/10 px-3 py-1 text-xs font-semibold text-[#91dcff]">
                {currentMode.short}
              </span>
              <button
                type="button"
                aria-label="Switch to handwriting"
                onClick={() => {
                  setShowPreviewKeyboard(true);
                  switchKeyboardMode("handwriting");
                }}
                className="sf-footer-button text-[1rem] font-semibold"
              >
                手写
              </button>
            </div>
          </div>
          ) : null}
        </section>

        {showFreePracticeLimitModal ? (
          <FreePracticeLimitModal
            isSignedIn={Boolean(accountEmail)}
            onDismiss={() => setShowFreePracticeLimitModal(false)}
            onLogin={openLoginFromFreePracticeLimit}
            onRegister={openRegisterFromFreePracticeLimit}
            onUnlockPro={openProFromFreePracticeLimit}
          />
        ) : null}

        {pendingExpression ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--overlay-bg)] p-4 backdrop-blur-[10px]">
            <div className="w-full max-w-[390px] rounded-[30px] border border-[var(--border-color)] bg-[var(--card-bg-solid)] p-6 text-[var(--text-primary)] shadow-[0_28px_80px_var(--shadow-color)]">
              <h2 className="text-[1.6rem] font-extrabold">
                {pendingExpression.meaning}
              </h2>
              <p className="mt-5 rounded-[20px] border border-[#c9bfff] bg-white px-5 py-4 text-[1.65rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {pendingExpression.phrase}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleConfirmAddExpression}
                  disabled={isSavingExpression}
                  className="rounded-[18px] bg-[#5f73ff] px-4 py-4 text-[1.08rem] font-extrabold text-white shadow-[0_12px_28px_rgba(95,115,255,0.28)] hover:bg-[#5267f1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingExpression.kind === "word"
                    ? "➕ 收藏单词"
                    : "➕ 收藏表达"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeExpressionModal();
                    setVocabularyNotice("");
                  }}
                  className="rounded-[18px] border border-[#d8d0f4] bg-white px-4 py-4 text-[1.08rem] font-extrabold text-[#6f668a] hover:bg-[#efeaff]"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
