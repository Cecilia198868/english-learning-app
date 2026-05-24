"use client";

import type { ChangeEvent, MutableRefObject, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import FreePracticeLimitModal from "@/components/FreePracticeLimitModal";
import { useLanguage } from "@/components/LanguageProvider";
import {
  addVocabularyWord,
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
  isFreePracticeLimitReached,
  recordFreePracticeCompletion,
} from "@/lib/freePracticeLimit";

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
    currentPeriodEnd?: string | null;
    email?: string | null;
    image?: string | null;
    name?: string | null;
    subscriptionStatus?: SubscriptionStatus;
  } | null;
};

type AccountSubscriptionResponse = {
  currentPeriodEnd?: string | null;
  email?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
};

function normalizeSubscriptionStatus(
  subscriptionStatus?: SubscriptionStatus | null
): SubscriptionStatus {
  return subscriptionStatus === "pro" ||
    subscriptionStatus === "cancels_at_period_end"
    ? subscriptionStatus
    : "free";
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
  | "helpCenter"
  | "reportIssue"
  | "aboutSpeakFlow"
  | "appearance"
  | "fontSize";
type ProPlan = "monthly" | "yearly";
type AppearancePreference = "light" | "dark" | "system";
type EffectiveAppearance = "light" | "dark";
type FontSizePreference = "small" | "standard" | "large";

type AccountMenuAction =
  | "subscription"
  | "voice"
  | "manageSubscription"
  | "helpCenter"
  | "reportIssue"
  | "aboutSpeakFlow"
  | "appearance"
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

type AccountMenuIconName =
  | "star"
  | "card"
  | "refresh"
  | "headphones"
  | "font"
  | "globe"
  | "moon"
  | "bell"
  | "cloud"
  | "help"
  | "chat"
  | "file"
  | "lock"
  | "info"
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
const appearancePreferenceStorageKey = "speakflow-appearance-preference";
const fontSizePreferenceStorageKey = "speakflow-font-size-preference";
const selectedVoiceStorageKey = "speakflow-selected-voice-uri";
const speechSilenceDelayMs = 1000;
const englishSpeechSilenceDelayMs = 2000;
const speechNoInputTimeoutMs = 12000;
const speechStopFallbackMs = 900;
const speechMaxDurationMs = 45000;

function getAccountAvatarStorageKey(identifier: string) {
  return `${accountAvatarStoragePrefix}:${identifier || "local-user"}`;
}

function createFreePracticeRoundId() {
  return `free:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function getSpeechSilenceDelay(stage: PracticeStage) {
  if (stage === "native") return speechSilenceDelayMs;

  return englishSpeechSilenceDelayMs;
}

function isAppearancePreference(value: string): value is AppearancePreference {
  return value === "light" || value === "dark" || value === "system";
}

function isFontSizePreference(value: string): value is FontSizePreference {
  return value === "small" || value === "standard" || value === "large";
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
      {name === "cloud" ? (
        <path d="M10.4 23.5h12.2a5 5 0 0 0 .4-10 7.2 7.2 0 0 0-13.8-1.8A5.9 5.9 0 0 0 10.4 23.5Z" />
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
        ],
      },
      {
        title: "Settings",
        items: [
          { action: "voice", icon: "🎧", label: "Voice" },
          { action: "fontSize", icon: "🔤", label: "Font Size" },
          { icon: "🌐", label: "Interface Language" },
          { action: "appearance", icon: "🎨", label: "Appearance" },
          { icon: "🔔", label: "Notifications" },
          { icon: "☁️", label: "Data Management" },
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
    appearanceTitle: "Appearance",
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
        icon: "🔊",
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
        ],
      },
      {
        title: "设置",
        items: [
          { action: "voice", icon: "🎧", label: "声音" },
          { action: "fontSize", icon: "🔤", label: "字体大小" },
          { icon: "🌐", label: "界面语言" },
          { action: "appearance", icon: "🎨", label: "外观" },
          { icon: "🔔", label: "通知" },
          { icon: "☁️", label: "数据管理" },
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
    appearanceTitle: "外观",
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
        icon: "🔊",
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
        title: "Account and Subscription",
        description:
          "Use the same login email for practice, payment, and restoration.",
        articles: [
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
        title: "账户和订阅",
        description: "登录、付款、恢复购买最好始终使用同一个邮箱。",
        articles: [
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
      { label: "Microphone or playback", value: "voice" },
      { label: "AI expression quality", value: "ai_expression" },
      { label: "Practice flow", value: "practice_flow" },
      { label: "Account or login", value: "account" },
      { label: "Suggestion", value: "suggestion" },
      { label: "Other", value: "other" },
    ],
    contactEmail: "Reply email",
    contactPlaceholder: "you@example.com",
    description:
      "Use this to contact SpeakFlow about bugs, payment issues, Pro status, voice problems, AI output, or product suggestions.",
    detailHelp:
      "Helpful details: what you were doing, the exact screen, browser, Pro or Free status, and one example sentence if speech or AI output was involved.",
    error: "Unable to send feedback. Please try again.",
    message: "What happened?",
    messagePlaceholder:
      "Describe the issue or suggestion. If possible, include the sentence you were practicing and what you expected.",
    page: "Related screen",
    pagePlaceholder: "For example: Free speaking practice, Pro page, Checkout",
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
      { label: "麦克风或朗读", value: "voice" },
      { label: "AI 表达质量", value: "ai_expression" },
      { label: "练习流程", value: "practice_flow" },
      { label: "账户或登录", value: "account" },
      { label: "功能建议", value: "suggestion" },
      { label: "其他", value: "other" },
    ],
    contactEmail: "回复邮箱",
    contactPlaceholder: "you@example.com",
    description:
      "这里就是用户联系 SpeakFlow 的入口。付款异常、Pro 状态、麦克风、朗读、AI 表达、功能建议，都可以从这里发给你。",
    detailHelp:
      "最好写清楚：当时在做什么、在哪个界面、使用什么浏览器、账号是 Pro 还是免费；如果和语音或 AI 表达有关，附上一条例句最有用。",
    error: "反馈发送失败，请稍后再试。",
    message: "具体问题",
    messagePlaceholder:
      "请描述遇到的问题或建议。可以写下正在练习的句子，以及你原本期待的结果。",
    page: "相关界面",
    pagePlaceholder: "例如：自由表达、Pro 页面、付款页面",
    required: "请把问题描述得更具体一点。",
    submit: "发送反馈",
    submitting: "正在发送...",
    success: "反馈已发送。SpeakFlow 已保存你的消息，会尽快查看。",
    type: "问题类型",
  },
} as const;

const displaySettingsContent = {
  en: {
    appearanceDescription:
      "Choose how SpeakFlow looks on this device. System follows your browser or operating system appearance.",
    appearanceOptions: [
      {
        description: "A soft lavender interface for daytime practice.",
        label: "Light",
        value: "light",
      },
      {
        description: "A darker interface for low-light practice.",
        label: "Dark",
        value: "dark",
      },
      {
        description: "Automatically match your device setting.",
        label: "Follow system",
        value: "system",
      },
    ] as const,
    effectiveDark: "Currently using dark appearance.",
    effectiveLight: "Currently using light appearance.",
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
    saved: "Saved on this device.",
  },
  "zh-CN": {
    appearanceDescription:
      "选择 SpeakFlow 在这台设备上的显示方式。跟随系统会自动使用浏览器或系统的明暗设置。",
    appearanceOptions: [
      {
        description: "柔和的浅色界面，适合白天练习。",
        label: "浅色",
        value: "light",
      },
      {
        description: "更暗的界面，适合光线较暗时练习。",
        label: "深色",
        value: "dark",
      },
      {
        description: "自动跟随设备或浏览器设置。",
        label: "跟随系统",
        value: "system",
      },
    ] as const,
    effectiveDark: "当前实际使用深色外观。",
    effectiveLight: "当前实际使用浅色外观。",
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
    saved: "已保存到这台设备。",
  },
} satisfies Record<
  "en" | "zh-CN",
  {
    appearanceDescription: string;
    appearanceOptions: readonly {
      description: string;
      label: string;
      value: AppearancePreference;
    }[];
    effectiveDark: string;
    effectiveLight: string;
    fontSizeDescription: string;
    fontSizeOptions: readonly {
      description: string;
      label: string;
      value: FontSizePreference;
    }[];
    saved: string;
  }
>;

const accountHomeContent = {
  en: {
    account: "Account",
    contactFeedback: "Contact & Feedback",
    dataAndSecurity: "Data & Security",
    dataManagement: "Data Management",
    fontSize: "Font Size",
    help: "Help",
    helpCenter: "Help Center",
    interfaceLanguage: "Interface Language",
    learningExperience: "Learning Experience",
    notifications: "Notifications",
    privacyPolicy: "Privacy Policy",
    signOut: "Sign Out",
    terms: "Terms of Service",
  },
  "zh-CN": {
    account: "账户",
    contactFeedback: "联系与反馈",
    dataAndSecurity: "数据与安全",
    dataManagement: "数据管理",
    fontSize: "字体大小",
    help: "帮助",
    helpCenter: "帮助中心",
    interfaceLanguage: "界面语言",
    learningExperience: "学习体验",
    notifications: "通知",
    privacyPolicy: "隐私政策",
    signOut: "退出登录",
    terms: "用户协议",
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
          "SpeakFlow is not meant to replace a human teacher, and it is not a general chatbot. It is a focused speaking trainer.",
          "Compared with open-ended chat, SpeakFlow gives learners a more structured path: Chinese meaning, English attempt, recommended expression, playback, follow-up, and vocabulary capture.",
        ],
        title: "How it is different",
      },
      {
        body: [
          "SpeakFlow Pro removes free practice limits and supports regular AI speaking practice, AI conversation, and course generation.",
          "Payments and subscription management are handled through Stripe. SpeakFlow stores only the subscription information needed to recognize your Pro account.",
        ],
        title: "Pro and privacy",
      },
      {
        body: [
          "If you have a question, payment issue, microphone problem, or product suggestion, use Contact & Feedback in the Help section.",
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
          "SpeakFlow 不是为了取代真人老师，也不是普通泛聊天机器人。它更像一个专注的口语训练场。",
          "和开放式聊天相比，SpeakFlow 给学习者更清晰的路径：中文意思、英文尝试、推荐表达、朗读、追问、表达收藏。",
        ],
        title: "它和普通聊天有什么不同",
      },
      {
        body: [
          "SpeakFlow Pro 会解除免费练习限制，支持更长期的 AI 口语练习、AI 对话和课程生成。",
          "付款和订阅管理由 Stripe 处理。SpeakFlow 只保存识别 Pro 账户所需的订阅信息。",
        ],
        title: "Pro 和隐私",
      },
      {
        body: [
          "如果你有问题、付款异常、麦克风问题或功能建议，可以在帮助里的“联系与反馈”提交。",
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
const handwritingCandidates = ["我", "你", "好", "吗", "谢", "爱", "说"];
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
  { title: "了解美国医疗保险基本类型" },
  { title: "新移民如何申请 Obamacare（ACA）医疗保险" },
  { title: "选择合适的健康保险计划" },
  { title: "保险覆盖范围咨询" },
  { title: "寻找初级保健医生" },
  { title: "处理保险拒赔或预授权问题" },
  { title: "租房者保险咨询" },
  { title: "购买房屋保险" },
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

function SoundWaveMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 92 44"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="soundWaveBorder" x1="10" y1="36" x2="82" y2="8">
          <stop stopColor="#d85ee9" />
          <stop offset="1" stopColor="#28d5e8" />
        </linearGradient>
        <linearGradient id="soundWaveBars" x1="22" y1="22" x2="70" y2="22">
          <stop stopColor="#d85ee9" />
          <stop offset="0.48" stopColor="#e9e6ff" />
          <stop offset="1" stopColor="#28d5e8" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="3"
        width="88"
        height="38"
        rx="19"
        fill="rgba(255,255,255,0.34)"
        stroke="url(#soundWaveBorder)"
        strokeWidth="3"
      />
      <path
        d="M23 22h0.1M33 17v10M43 13v18M53 8v28M63 14v16M73 18v8"
        stroke="url(#soundWaveBars)"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <circle cx="82" cy="22" r="4" fill="#28d5e8" />
    </svg>
  );
}

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const mountedTimer = window.setTimeout(() => setIsMounted(true), 0);

    return () => window.clearTimeout(mountedTimer);
  }, []);

  if (!isMounted) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#c6b7ff_0%,#eeeaff_44%,#f8f7ff_100%)]" />
    );
  }

  return <SpeakEnglishClient />;
}

function SpeakEnglishClient() {
  const { language } = useLanguage();
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
  const activeRecognitionStageRef = useRef<PracticeStage>("native");
  const freePracticeRoundIdRef = useRef(createFreePracticeRoundId());
  const guidedConversationTurnsRef = useRef<GuidedConversationTurn[]>([]);
  const guidedFollowupRequestKeyRef = useRef("");
  const freeConversationRequestKeyRef = useRef("");
  const freeConversationFetchRequestKeyRef = useRef("");
  const freeConversationPrefetchRef =
    useRef<FreeConversationPrefetch | null>(null);
  const hasEnglishAttemptRef = useRef(false);
  const messageRef = useRef("");

  const [message, setMessage] = useState("用中文说出你想表达的内容");
  const [inputText, setInputText] = useState("");
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>("zh");
  const [trainingGroundMode, setTrainingGroundMode] =
    useState<TrainingGroundMode>("default");
  const [composingPinyin, setComposingPinyin] = useState("");
  const [isShifted, setIsShifted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [practiceStage, setPracticeStage] = useState<PracticeStage>("native");
  const [nativeSpeech, setNativeSpeech] = useState("");
  const [hasEnglishAttempt, setHasEnglishAttempt] = useState(false);
  const [standardEnglish, setStandardEnglish] = useState("");
  const [hasNativeSpeech, setHasNativeSpeech] = useState(false);
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
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [accountPanelView, setAccountPanelView] =
    useState<AccountPanelView>("menu");
  const [appearancePreference, setAppearancePreference] =
    useState<AppearancePreference>("system");
  const [effectiveAppearance, setEffectiveAppearance] =
    useState<EffectiveAppearance>("light");
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
  const [accountImageFailed, setAccountImageFailed] = useState(false);
  const [accountSubscriptionStatus, setAccountSubscriptionStatus] =
    useState<SubscriptionStatus>("free");
  const [accountCurrentPeriodEnd, setAccountCurrentPeriodEnd] = useState("");
  const [isLoadingAccountSubscription, setIsLoadingAccountSubscription] =
    useState(false);
  const [accountSubscriptionRefreshKey, setAccountSubscriptionRefreshKey] =
    useState(0);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarEditorNotice, setAvatarEditorNotice] = useState("");
  const [guidedFollowupSuggestion, setGuidedFollowupSuggestion] = useState("");
  const [isLoadingGuidedFollowup, setIsLoadingGuidedFollowup] = useState(false);
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
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>(
    []
  );
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showPreviewKeyboard, setShowPreviewKeyboard] = useState(true);
  const [showFreePracticeLimitModal, setShowFreePracticeLimitModal] =
    useState(false);

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
  const accountHome = accountHomeContent[language];
  const proFeatureItems = accountCopy.proFeatures;
  const voiceMenuItemLabel = language === "en" ? "Voice" : "声音";
  const isAiGuidedMode = trainingGroundMode === "guided";
  const isFreeConversationMode = false;
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
    hasNativeSpeech ||
    hasEnglishAttempt ||
    Boolean(standardEnglish) ||
    isListening ||
    (isFreeConversationMode && Boolean(freeConversationQuestionPrompt)) ||
    Boolean(inputText.trim()) ||
    Boolean(liveTranscript.trim());
  const showLandingPrompt = !hasPracticeActivity;
  const showNativeCompletePrompt =
    hasNativeSpeech && !hasEnglishAttempt && !standardEnglish;
  const showListeningPrompt = isListening;
  const showFreeConversationAnswerPrompt =
    isFreeConversationMode &&
    Boolean(freeConversationQuestionPrompt) &&
    !hasEnglishAttempt &&
    !nativeSpeech;
  const showVoiceOnlyPrompt =
    showLandingPrompt ||
    showNativeCompletePrompt ||
    showListeningPrompt ||
    showFreeConversationAnswerPrompt;
  const showAiGuidedNudge = hasEnglishAttempt && !isAiGuidedMode;
  const selectedExpression =
    expressionVariants[selectedExpressionIndex] ||
    createFallbackExpressionVariants(standardEnglish)[0];
  const selectedExpressionSegments = useMemo(
    () =>
      splitSentenceByHighlightedExpressions(
        selectedExpression.text || "",
        highlightedExpressions
      ),
    [highlightedExpressions, selectedExpression.text]
  );
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
  const lastExpressionIndex = expressionVariantLabels.length - 1;
  const hasPreviousExpression = selectedExpressionIndex > 0;
  const hasNextExpression = selectedExpressionIndex < lastExpressionIndex;
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
      : accountPanelView === "helpCenter"
        ? accountCopy.helpCenterTitle
      : accountPanelView === "reportIssue"
        ? accountCopy.reportIssueTitle
      : accountPanelView === "aboutSpeakFlow"
        ? accountCopy.aboutSpeakFlowTitle
      : accountPanelView === "appearance"
        ? accountCopy.appearanceTitle
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
    ? "bg-[#e8fff5] text-[#14845f]"
    : "bg-[#efeaff] text-[#7460e8]";
  const accountCurrentPeriodEndDateLabel =
    isAccountPro && accountCurrentPeriodEnd
      ? (() => {
          const periodEndDate = new Date(accountCurrentPeriodEnd);
          if (Number.isNaN(periodEndDate.getTime())) return "";

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
        ? `Ends ${accountCurrentPeriodEndDateLabel}`
        : `\u5c06\u4e8e ${accountCurrentPeriodEndDateLabel} \u5230\u671f`
      : language === "en"
        ? `Renews ${accountCurrentPeriodEndDateLabel}`
        : `\u5230\u671f\u65f6\u95f4 ${accountCurrentPeriodEndDateLabel}`
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
  const accountCurrentPeriodEndValue =
    accountCurrentPeriodEndDateLabel || subscriptionManagementCopy.noExpiration;
  const avatarEditorImage =
    avatarPreview || (accountImageFailed ? "" : accountImage);

  useEffect(() => {
    hasEnglishAttemptRef.current = hasEnglishAttempt;
  }, [hasEnglishAttempt]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedAppearance = window.localStorage.getItem(
      appearancePreferenceStorageKey
    );
    const savedFontSize = window.localStorage.getItem(
      fontSizePreferenceStorageKey
    );

    if (savedAppearance && isAppearancePreference(savedAppearance)) {
      setAppearancePreference(savedAppearance);
    }

    if (savedFontSize && isFontSizePreference(savedFontSize)) {
      setFontSizePreference(savedFontSize);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyAppearance = () => {
      const nextEffectiveAppearance =
        appearancePreference === "system"
          ? mediaQuery.matches
            ? "dark"
            : "light"
          : appearancePreference;

      setEffectiveAppearance(nextEffectiveAppearance);
      root.dataset.speakflowAppearance = appearancePreference;
      root.dataset.speakflowTheme = nextEffectiveAppearance;
      window.localStorage.setItem(
        appearancePreferenceStorageKey,
        appearancePreference
      );
    };

    applyAppearance();

    if (appearancePreference !== "system") return;

    mediaQuery.addEventListener("change", applyAppearance);

    return () => {
      mediaQuery.removeEventListener("change", applyAppearance);
    };
  }, [appearancePreference]);

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
        const response = await fetch("/api/auth/session");
        const session = (await response.json()) as SessionResponse;
        if (cancelled) return;

        const nextName = session.user?.name || "";
        const nextEmail = session.user?.email || session.user?.name || "";
        const savedAvatar = window.localStorage.getItem(
          getAccountAvatarStorageKey(nextEmail || nextName)
        );

        setAccountName(nextName);
        setAccountEmail(nextEmail);
        setAccountImage(savedAvatar || session.user?.image || "");
        setAccountImageFailed(false);
        setAccountSubscriptionStatus(
          normalizeSubscriptionStatus(session.user?.subscriptionStatus)
        );
        setAccountCurrentPeriodEnd(session.user?.currentPeriodEnd || "");
      } catch {
        if (!cancelled) {
          setAccountName("");
          setAccountEmail("");
          setAccountImage("");
        }
      }
    }

    void loadAccountSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountSubscription() {
      setIsLoadingAccountSubscription(true);

      try {
        const response = await fetch("/api/me/subscription", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Load subscription failed");
        }

        const data = (await response.json()) as AccountSubscriptionResponse;

        if (cancelled) return;

        setAccountSubscriptionStatus(
          normalizeSubscriptionStatus(data.subscriptionStatus)
        );
        setAccountCurrentPeriodEnd(data.currentPeriodEnd || "");
        if (hasProAccess(normalizeSubscriptionStatus(data.subscriptionStatus))) {
          setShowFreePracticeLimitModal(false);
        }
      } catch {
        if (!cancelled) {
          setAccountSubscriptionStatus("free");
          setAccountCurrentPeriodEnd("");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAccountSubscription(false);
        }
      }
    }

    void loadAccountSubscription();

    return () => {
      cancelled = true;
    };
  }, [accountPanelView, accountSubscriptionRefreshKey, showAccountMenu]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const shouldOpenPro = searchParams.get("pro") === "1";
    const shouldOpenAccount = searchParams.get("account") === "1";
    const checkoutStatus = searchParams.get("checkout");
    if (searchParams.get("menu") !== "1" && !shouldOpenPro && !shouldOpenAccount)
      return;

    const refreshTimers: number[] = [];
    setShowQuickPanel(!shouldOpenAccount);
    if (shouldOpenPro) {
      setShowAccountMenu(true);
      setAccountPanelView("subscription");

      if (checkoutStatus === "success") {
        [1200, 3200, 7000].forEach((delay) => {
          refreshTimers.push(
            window.setTimeout(() => {
              setAccountSubscriptionRefreshKey(Date.now());
            }, delay)
          );
        });
      }
    } else if (shouldOpenAccount) {
      setShowAccountMenu(true);
      setAccountPanelView("menu");
    }
    window.history.replaceState(null, "", "/speak-english");

    return () => {
      refreshTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!showQuickPanel) {
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
  }

  function showFreePracticeLimit() {
    setShowFreePracticeLimitModal(true);
  }

  function openProFromFreePracticeLimit() {
    setShowFreePracticeLimitModal(false);
    setShowQuickPanel(true);
    setShowAccountMenu(true);
    setAccountPanelView("subscription");
    setShowAvatarEditor(false);
    setShowExpressionMenu(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
  }

  async function ensureFreePracticeAvailable() {
    if (hasProAccess(accountSubscriptionStatus)) return true;
    if (!isFreePracticeLimitReached("free")) return true;

    try {
      setIsLoadingAccountSubscription(true);
      const response = await fetch("/api/me/subscription", {
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as AccountSubscriptionResponse;
        const nextSubscriptionStatus = normalizeSubscriptionStatus(
          data.subscriptionStatus
        );

        setAccountSubscriptionStatus(nextSubscriptionStatus);
        setAccountCurrentPeriodEnd(data.currentPeriodEnd || "");

        if (hasProAccess(nextSubscriptionStatus)) {
          setShowFreePracticeLimitModal(false);
          return true;
        }
      }
    } catch {
      // Keep the existing free-user behavior if the subscription check fails.
    } finally {
      setIsLoadingAccountSubscription(false);
    }

    showFreePracticeLimit();
    return false;
  }

  function markFreePracticeRoundCompleted() {
    if (hasProAccess(accountSubscriptionStatus)) return;

    recordFreePracticeCompletion("free", freePracticeRoundIdRef.current);
  }

  function handleAccountMenuAction(action?: AccountMenuAction) {
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

    if (action === "appearance") {
      setShowAvatarEditor(false);
      setAccountPanelView("appearance");
      return;
    }

    if (action === "fontSize") {
      setShowAvatarEditor(false);
      setAccountPanelView("fontSize");
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

  async function openBillingPortal() {
    if (isOpeningBillingPortal) return;

    setIsOpeningBillingPortal(true);
    setBillingPortalNotice("");
    let didRedirect = false;

    try {
      const response = await fetch("/api/stripe/portal", {
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
      const response = await fetch("/api/stripe/restore", {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as
        | AccountSubscriptionResponse
        | { error?: unknown };

      if (!response.ok) {
        const errorMessage =
          "error" in data && typeof data.error === "string" && data.error.trim()
            ? data.error
            : accountCopy.restorePurchaseFailed;
        throw new Error(errorMessage);
      }

      const subscriptionData = data as AccountSubscriptionResponse;
      const nextSubscriptionStatus = normalizeSubscriptionStatus(
        subscriptionData.subscriptionStatus
      );

      setAccountSubscriptionStatus(nextSubscriptionStatus);
      setAccountCurrentPeriodEnd(subscriptionData.currentPeriodEnd || "");
      setAccountSubscriptionRefreshKey(Date.now());

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

    console.log("checkout plan:", selectedPlan);
    setIsStartingCheckout(true);
    setCheckoutError("");

    try {
      const response = await fetch("/api/stripe/checkout", {
        body: JSON.stringify({ plan: selectedPlan }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        url?: unknown;
      };
      console.log("checkout response:", data);
      const url = typeof data.url === "string" ? data.url : "";

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

  function prepareNextNativeRound() {
    freePracticeRoundIdRef.current = createFreePracticeRoundId();
    setPracticeStage("native");
    setNativeSpeech("");
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

  function prepareGuidedSuggestedEnglishRound(suggestion: string) {
    freePracticeRoundIdRef.current = createFreePracticeRoundId();
    setPracticeStage("english");
    setNativeSpeech(suggestion);
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

  function prepareFreeConversationAnswerRound() {
    const activeQuestion = freeConversationResponse
      ? {
          english: freeConversationResponse.questionEnglish,
          hintChinese:
            freeConversationResponse.hintChinese ||
            freeConversationResponse.questionChinese,
        }
      : freeConversationQuestionPrompt;

    freePracticeRoundIdRef.current = createFreePracticeRoundId();
    setPracticeStage("english");
    setNativeSpeech("");
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

  function openTrainingGroundMode() {
    setTrainingGroundMode("guided");
    guidedConversationTurnsRef.current = [];
    resetGuidedFollowupState();
    prepareNextNativeRound();
    setInputText("");
    setComposingPinyin("");
    setLiveTranscript("");
    setKeyboardMode("zh");
    setMessage("用中文说出你想表达的内容");
    setShowQuickPanel(false);
    setShowExpressionMenu(false);
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
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
        setStandardEnglish("");
        setExpressionVariants([]);
        setSelectedExpressionIndex(0);
        setHasEnglishAttempt(false);
        setHasNativeSpeech(true);
        setPracticeStage("english");
      } else {
        setHasEnglishAttempt(true);
        markFreePracticeRoundCompleted();
      }
    }

    clearAllSpeechTimers();
    speechBufferRef.current = "";
    shouldCommitSpeechRef.current = false;
    recognitionRef.current = null;
    setLiveTranscript("");
    setIsListening(false);
  }

  function cancelRecognition(options: { message?: string } = {}) {
    shouldCommitSpeechRef.current = false;
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    clearAllSpeechTimers();
    speechBufferRef.current = "";
    setLiveTranscript("");
    setIsListening(false);
    if (options.message) {
      setMessage(options.message);
    }
  }

  function handlePrimaryPracticeAction() {
    if (isListening) {
      stopRecognition({ forceUiReset: true });
      return;
    }

    if (isFreeConversationMode && hasEnglishAttempt && isLoadingFreeConversation) {
      return;
    }

    void startRecognition();
  }

  function handleComposerPracticeAction() {
    if (isListening) {
      stopRecognition({ forceUiReset: true });
      return;
    }

    void startRecognition();
  }

  async function startRecognition() {
    if (isListening) return;

    const RecognitionConstructor = getRecognitionConstructor();

    if (!RecognitionConstructor) {
      setMessage("Speech recognition is not available in this browser");
      return;
    }

    recognitionRef.current?.abort?.();
    clearAllSpeechTimers();
    speechBufferRef.current = "";
    shouldCommitSpeechRef.current = true;
    const isStartingFreeConversationAnswerRound =
      isFreeConversationMode && hasEnglishAttempt;
    const isStartingGuidedSuggestedEnglishRound =
      isAiGuidedMode && Boolean(standardEnglish);
    const guidedSuggestedChinese = isStartingGuidedSuggestedEnglishRound
      ? guidedFollowupSuggestion.trim() || "我还想多说一点我的感受。"
      : "";
    const isStartingNextNativeRound =
      Boolean(standardEnglish) &&
      !isStartingGuidedSuggestedEnglishRound &&
      !isStartingFreeConversationAnswerRound;
    const nextPracticeStage: PracticeStage =
      isStartingFreeConversationAnswerRound
        ? "english"
        : isStartingGuidedSuggestedEnglishRound
        ? "english"
        : isStartingNextNativeRound
          ? "native"
          : practiceStage;

    if (
      (nextPracticeStage === "native" ||
        isStartingGuidedSuggestedEnglishRound ||
        isStartingFreeConversationAnswerRound) &&
      !(await ensureFreePracticeAvailable())
    ) {
      shouldCommitSpeechRef.current = false;
      return;
    }

    if (isStartingGuidedSuggestedEnglishRound) {
      prepareGuidedSuggestedEnglishRound(guidedSuggestedChinese);
    } else if (isStartingFreeConversationAnswerRound) {
      prepareFreeConversationAnswerRound();
    } else if (isStartingNextNativeRound) {
      prepareNextNativeRound();
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
    setIsListening(true);
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
      setMessage("Speech recognition could not start");
    }
  }

  function stopRecognition(options: { forceUiReset?: boolean } = {}) {
    clearSpeechSilenceTimer();
    clearTimer(speechNoInputTimerRef);
    clearTimer(speechStopFallbackTimerRef);

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
    if (isFreeConversationMode || !hasEnglishAttempt || !nativeSpeech) return;

    let cancelled = false;
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
            standardEnglish: "",
          }),
        });
        const data = (await response.json()) as {
          variants?: Partial<Record<ExpressionVariantKey, string>>;
        };

        if (!response.ok || !data.variants || cancelled) return;

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
        setStandardEnglish(nextVariants[0]?.text || "");
      } catch {
        if (!cancelled) {
          setExpressionVariants([]);
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
  }, [hasEnglishAttempt, isFreeConversationMode, message, nativeSpeech]);

  useEffect(() => {
    const currentChinese = nativeSpeech.trim();
    const userEnglish = message.trim();
    const recommendedEnglish = standardEnglish.trim();
    const requestKey = JSON.stringify({
      currentChinese,
      recommendedEnglish,
      userEnglish,
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
            turns: guidedConversationTurnsRef.current,
            userEnglish,
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
              userEnglish,
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
    isAiGuidedMode,
    isLoadingExpressionVariants,
    message,
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

  function readStandardEnglish(rate: number) {
    const text = isFreeConversationMode
      ? selectedFreeConversationExpression.text
      : selectedExpression.text || standardEnglish;
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

  function handleConfirmAddExpression() {
    if (!pendingExpression || isSavingExpression) return;

    setIsSavingExpression(true);

    const sourceSentence = pendingExpression.sourceSentence;
    const isWord = pendingExpression.kind === "word";
    const result = addVocabularyWord(pendingExpression.phrase, sourceSentence);

    if (!result.ok) {
      closeExpressionModal();
      setVocabularyNotice(
        result.reason === "DUPLICATE"
          ? isWord
            ? "这个单词已经收藏过了"
            : "这个表达已经收藏过了"
          : result.message
      );
      return;
    }

    const savedWord = result.word.word;
    updateVocabularyWord(savedWord, {
      ...(isWord ? {} : { meaning: pendingExpression.meaning }),
      partOfSpeech: isWord ? "word" : "phrase",
      example: sourceSentence,
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
      ],
    },
    {
      rows: [
        { action: "voice", icon: "headphones", label: voiceMenuItemLabel },
        { action: "fontSize", icon: "font", label: accountHome.fontSize },
        { icon: "globe", label: accountHome.interfaceLanguage },
        { action: "appearance", icon: "moon", label: accountCopy.appearanceTitle },
        { icon: "bell", label: accountHome.notifications },
      ],
      title: accountHome.learningExperience,
    },
    {
      rows: [{ icon: "cloud", label: accountHome.dataManagement }],
      title: accountHome.dataAndSecurity,
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
      data-speakflow-theme={effectiveAppearance}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] items-center justify-center p-2 sm:p-4">
        <section className="sf-speak-phone relative flex h-[calc(100dvh-16px)] min-h-[calc(100dvh-16px)] w-full max-w-[430px] flex-col overflow-hidden rounded-[34px] sm:min-h-[720px]">
          <div className="pointer-events-none absolute left-1/2 top-[19%] z-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full border border-[#91dcff]/10" />
          <div className="pointer-events-none absolute left-1/2 top-[25%] z-0 h-[300px] w-[300px] -translate-x-1/2 rounded-full border border-[#b799ff]/10" />

          <header className="relative z-10 shrink-0 px-5 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="打开菜单"
                  onClick={() => {
                    if (isListening) {
                      cancelRecognition();
                    }
                    setShowQuickPanel((current) => !current);
                    setShowAccountMenu(false);
                    setAccountPanelView("menu");
                    setShowAvatarEditor(false);
                  }}
                  className="sf-header-button"
                >
                  <span className="relative block h-4 w-5 before:absolute before:left-0 before:top-0 before:h-px before:w-4 before:bg-[#efe9ff] after:absolute after:bottom-0 after:left-0 after:h-px after:w-5 after:bg-[#efe9ff]">
                    <span className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-[#efe9ff]" />
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="grid h-5 w-[42px] place-items-center">
                  <SoundWaveMark className="h-5 w-[42px] drop-shadow-[0_8px_16px_rgba(91,140,255,0.18)]" />
                </span>
                <div>
                  <h1 className="text-[1.05rem] font-semibold leading-none text-white">
                    SpeakFlow
                  </h1>
                  <p className="mt-0.5 text-[0.42rem] font-semibold uppercase tracking-[0.16em] text-[#91dcff]/80">
                    voice practice
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label={accountCopy.openAccountMenu}
                onClick={() => {
                  if (isListening) {
                    cancelRecognition();
                  }
                  setShowQuickPanel(false);
                  setShowClassicCoursePicker(false);
                  resetClassicCoursePicker();
                  setShowAccountMenu((current) => {
                    const next = !current;
                    if (next) {
                      setAccountPanelView("menu");
                    } else {
                      setShowAvatarEditor(false);
                    }
                    return next;
                  });
                }}
                className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-white/70 bg-[#f7f4ff] text-[0.82rem] font-extrabold text-white shadow-[0_12px_26px_rgba(84,72,146,0.18)]"
              >
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
              </button>
            </div>
            {trainingGroundTitle && !showQuickPanel ? (
              <div className="mt-3 text-center font-[var(--font-sora)] text-[0.92rem] font-extrabold text-[#5b63ff]">
                {trainingGroundTitle}
              </div>
            ) : null}
          </header>

          {showAccountMenu ? (
            <div className="sf-account-panel absolute inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#f0eaff_0%,#f7f3ff_100%)] px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-2xl">
              {accountPanelView === "menu" ? null : accountPanelView === "subscription" ||
              accountPanelView === "checkout" ||
              accountPanelView === "manageSubscription" ||
              accountPanelView === "helpCenter" ||
              accountPanelView === "reportIssue" ||
              accountPanelView === "aboutSpeakFlow" ||
              accountPanelView === "appearance" ||
              accountPanelView === "fontSize" ? (
                <div className="grid shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center gap-3">
                  <button
                    type="button"
                    aria-label={
                      accountPanelView === "checkout"
                        ? accountCopy.returnProPage
                        : accountCopy.returnAccountMenu
                    }
                    onClick={() =>
                      setAccountPanelView(
                        accountPanelView === "checkout" ? "subscription" : "menu"
                      )
                    }
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
                    onClick={() => {
                      setShowAvatarEditor(false);
                      setAccountPanelView("menu");
                    }}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.55rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label={accountCopy.closeAccountMenu}
                    onClick={() => {
                      setShowAccountMenu(false);
                      setAccountPanelView("menu");
                      setShowAvatarEditor(false);
                    }}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.35rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      aria-label={accountCopy.returnAccountMenu}
                      onClick={() => {
                        setShowAvatarEditor(false);
                        setAccountPanelView("menu");
                      }}
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
                    onClick={() => {
                      setShowAccountMenu(false);
                      setAccountPanelView("menu");
                      setShowAvatarEditor(false);
                    }}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.45rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                  >
                    ×
                  </button>
                </div>
              )}

              <div
                className={`sf-account-panel-scroll min-h-0 flex-1 overflow-y-auto ${
                  accountPanelView === "menu"
                    ? "mt-0 pr-0"
                    : accountPanelView === "account"
                      ? "mt-10 pr-0"
                      : "mt-7 pr-1"
                }`}
              >
                {accountPanelView === "menu" ? (
                  <div className="pb-5 pt-1">
                    <button
                      type="button"
                      onClick={() => setAccountPanelView("account")}
                      className="mb-5 flex min-h-[6.1rem] w-full items-center gap-4 rounded-[28px] bg-white/82 px-5 py-5 text-left shadow-[0_22px_60px_rgba(84,72,146,0.12)] ring-1 ring-white/88"
                    >
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
                      <span className="shrink-0 text-[2.2rem] font-light leading-none text-[#7f7896]">
                        ›
                      </span>
                    </button>

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
                                <span className="shrink-0 rounded-full bg-[#f0ebff] px-3.5 py-1.5 text-[0.95rem] font-extrabold leading-none text-[#8264ff]">
                                  {row.badge}
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
                ) : accountPanelView === "appearance" ? (
                  <section className="pb-8">
                    <div className="rounded-[28px] border border-white/80 bg-white/76 px-5 py-6 shadow-[0_22px_58px_rgba(84,72,146,0.13)] ring-1 ring-[#efeaff]">
                      <div className="flex items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#efeaff] text-[1.35rem] text-[#7460e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                          🎨
                        </span>
                        <div>
                          <h3 className="text-[1.36rem] font-black leading-7 text-[#201833]">
                            {accountCopy.appearanceTitle}
                          </h3>
                          <p className="mt-2 text-[0.96rem] font-bold leading-7 text-[#4b4267]">
                            {displaySettings.appearanceDescription}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {displaySettings.appearanceOptions.map((option) => {
                        const isSelected = appearancePreference === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setAppearancePreference(option.value)}
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

                    <p className="mt-4 rounded-[18px] bg-white/66 px-4 py-3 text-center text-[0.86rem] font-bold leading-6 text-[#7f7896] ring-1 ring-white/80">
                      {effectiveAppearance === "dark"
                        ? displaySettings.effectiveDark
                        : displaySettings.effectiveLight}{" "}
                      {displaySettings.saved}
                    </p>
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
                            {feature.icon}
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
                              ? "bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_100%)] text-white"
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
                              ? "bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_100%)] text-white"
                              : "border-2 border-[#b8aed8] text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 text-[1rem] font-extrabold text-[#201833]">
                            {accountCopy.proPlans.yearly.label}
                            <span className="rounded-[10px] bg-[linear-gradient(135deg,#7a5cff_0%,#c85cff_100%)] px-2.5 py-1 text-[0.78rem] text-white">
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
                      className="mt-7 flex min-h-[4.1rem] w-full items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#6f55ff_0%,#a549ff_58%,#c85cff_100%)] px-5 text-[1.12rem] font-extrabold text-white shadow-[0_22px_50px_rgba(126,92,255,0.32)] transition disabled:opacity-70"
                    >
                      <CrownIcon
                        className={`mr-2 h-7 w-7 ${
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
                          className="mt-6 flex min-h-[4.15rem] w-full items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#6f55ff_0%,#a549ff_58%,#c85cff_100%)] px-5 text-[1.14rem] font-black text-white shadow-[0_22px_50px_rgba(126,92,255,0.34)]"
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
            className={`sf-free-practice-main relative z-10 flex min-h-0 flex-1 flex-col px-6 pt-6 ${
              hasEnglishAttempt ? "sf-free-practice-result-main" : ""
            } ${
              !showVoiceOnlyPrompt && !hasEnglishAttempt
                ? "sf-free-practice-keyboard-main"
                : ""
            } ${
              showVoiceOnlyPrompt
                ? "pb-[calc(5.8rem+env(safe-area-inset-bottom))]"
                : hasEnglishAttempt
                  ? showAiGuidedNudge
                    ? "pb-[calc(12rem+env(safe-area-inset-bottom))]"
                    : "pb-[calc(5.95rem+env(safe-area-inset-bottom))]"
                  : "pb-[352px]"
            }`}
          >
            <div className="mx-auto h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(145,220,255,0.46),transparent)]" />

            <div
              className={`sf-free-practice-content flex min-h-0 flex-1 flex-col items-center overflow-y-auto text-center ${
                showVoiceOnlyPrompt
                  ? "justify-start pt-28"
                  : hasEnglishAttempt
                    ? `sf-free-practice-result-content justify-start ${
                        isFreeConversationMode ? "pt-8" : "pt-14"
                      }`
                    : "justify-start pt-14"
              }`}
            >
              {showListeningPrompt ? (
                practiceStage === "english" && nativeSpeech ? (
                  <div className="max-w-[360px] bg-white/10 px-5 py-5">
                    <h2 className="text-[1.75rem] font-extrabold leading-10 text-[#201833]">
                      {nativeSpeech}
                    </h2>
                    <p className="mt-5 text-[1.25rem] font-extrabold text-[#201833]">
                      正在听你说英文...
                    </p>
                    <p className="mt-3 text-[1rem] font-extrabold text-[#4b4267]">
                      看着这句中文，用英语说出来
                    </p>
                  </div>
                ) : isFreeConversationMode && freeConversationQuestionPrompt ? (
                  <div className="max-w-[360px] bg-white/10 px-5 py-5 text-left">
                    <p className="text-[1rem] font-extrabold leading-6 text-[#5b63ff]">
                      AI回复：
                    </p>
                    <h2 className="mt-4 text-[1.45rem] font-extrabold leading-8 text-[#201833]">
                      {freeConversationQuestionPrompt.english}
                    </h2>
                    {isFreeConversationHintVisible &&
                    freeConversationQuestionPrompt.hintChinese ? (
                      <p className="mt-3 rounded-[14px] bg-white/18 px-3 py-2 text-[1rem] font-bold leading-7 text-[#4b4267]">
                        提示：{freeConversationQuestionPrompt.hintChinese}
                      </p>
                    ) : null}
                    <p className="mt-5 text-[0.95rem] font-extrabold leading-6 text-[#201833]">
                      用英文回答 AI。
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="max-w-[360px] text-[1.65rem] font-extrabold leading-10 text-[#201833]">
                      正在听你说话...
                    </h2>
                    <p className="mt-6 max-w-[340px] text-[1rem] font-semibold leading-7 text-[#201833]">
                      自然地说中文，SpeakFlow 会帮你转换成英语练习。
                    </p>
                  </>
                )
              ) : showFreeConversationAnswerPrompt &&
                freeConversationQuestionPrompt ? (
                <div className="max-w-[360px] bg-white/10 px-5 py-5 text-left">
                  <p className="text-[1rem] font-extrabold leading-6 text-[#5b63ff]">
                    AI回复：
                  </p>
                  <h2 className="mt-4 text-[1.45rem] font-extrabold leading-8 text-[#201833]">
                    {freeConversationQuestionPrompt.english}
                  </h2>
                  {isFreeConversationHintVisible &&
                  freeConversationQuestionPrompt.hintChinese ? (
                    <p className="mt-3 rounded-[14px] bg-white/18 px-3 py-2 text-[1rem] font-bold leading-7 text-[#4b4267]">
                      提示：{freeConversationQuestionPrompt.hintChinese}
                    </p>
                  ) : null}
                  <p className="mt-5 text-[0.95rem] font-extrabold leading-6 text-[#201833]">
                    点击麦克风，用英文回答 AI。
                  </p>
                </div>
              ) : showLandingPrompt ? (
                <>
                  <h2 className="max-w-[360px] text-[1.65rem] font-extrabold leading-10 text-[#201833]">
                    用中文说出你想表达的内容
                  </h2>
                </>
              ) : showNativeCompletePrompt ? (
                <>
                  <div className="max-w-[360px] bg-white/10 px-5 py-5">
                    <h2 className="text-[1.75rem] font-extrabold leading-10 text-[#201833]">
                      {nativeSpeech}
                    </h2>
                    <p className="mt-5 text-[1rem] font-extrabold text-[#4b4267]">
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
                        <p className="text-[1.05rem] font-extrabold text-[#7f7896]">
                          你的表达:
                        </p>
                        <p className="sf-free-practice-user-card mt-5 rounded-[18px] bg-white/10 px-5 py-4 text-[1.15rem] font-bold leading-8 text-[#8f879c]">
                          {message}
                        </p>
                      </div>

                      <div className="sf-free-practice-standard-block mt-9 w-full max-w-[360px]">
                          <div className="flex items-center gap-2 text-left">
                            <button
                              type="button"
                              aria-label="上一种表达"
                              onClick={() =>
                                setSelectedExpressionIndex((index) =>
                                  Math.max(index - 1, 0)
                                )
                              }
                              disabled={!hasPreviousExpression}
                              className="grid h-8 w-8 place-items-center rounded-full bg-white/35 text-lg font-extrabold text-[#5b8cff] disabled:invisible"
                            >
                              ←
                            </button>
                            <span className="text-[1.2rem] font-extrabold text-[#4f6fe8]">
                              {selectedExpression.label}
                            </span>
                            <button
                              type="button"
                              aria-label="下一种表达"
                              onClick={() =>
                                setSelectedExpressionIndex((index) =>
                                  Math.min(
                                    index + 1,
                                    expressionVariantLabels.length - 1
                                  )
                                )
                              }
                              disabled={!hasNextExpression}
                              className="grid h-8 w-8 place-items-center rounded-full bg-white/35 text-lg font-extrabold text-[#5b8cff] disabled:invisible"
                            >
                              →
                            </button>
                          </div>

                          <p className="sf-free-practice-expression-text mt-4 bg-white/18 px-4 py-4 text-[1.55rem] font-extrabold leading-9 text-[#201833]">
                            {isLoadingExpressionVariants
                              ? "正在生成表达..."
                              : selectedExpressionSegments.map((segment, index) =>
                                  segment.type === "expression" ? (
                                    <button
                                      key={`${segment.value}-${index}`}
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleExpressionClick(
                                          segment.expression,
                                          selectedExpression.text
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
                                                  selectedExpression.text
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
                            <p className="sf-free-practice-notice mt-3 text-center text-sm font-semibold text-[#7f7896]">
                              {vocabularyNotice}
                            </p>
                          ) : null}
                      </div>

                      {isAiGuidedMode &&
                      (isLoadingGuidedFollowup || guidedFollowupSuggestion) ? (
                        <div className="mt-9 w-full max-w-[360px] text-left">
                          <p className="text-[1rem] font-extrabold leading-6 text-[#5b63ff]">
                            你可以继续说：
                          </p>
                          <p className="mt-2 text-[1.05rem] font-extrabold leading-7 text-[#201833]">
                            {isLoadingGuidedFollowup
                              ? "AI正在帮你想下一句..."
                              : guidedFollowupSuggestion}
                          </p>
                        </div>
                      ) : null}
                    </>
                    )
                  ) : (
                    <>
                      <p className="max-w-[320px] text-[1.6rem] font-semibold leading-9 tracking-[-0.03em] text-[#fffaff]">
                        {message}
                      </p>
                      <div className="mt-4 max-w-[340px] text-[0.95rem] font-medium leading-6 text-[#c9c0df]">
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
          ) : null}

          {showAiGuidedNudge ? (
            <button
              type="button"
              onClick={openTrainingGroundMode}
              className="absolute inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 mx-auto flex w-[252px] items-center gap-3 bg-white/72 px-4 py-3 text-left shadow-[0_16px_32px_rgba(84,72,146,0.14),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl transition hover:bg-white/86 active:scale-[0.98]"
              aria-label="不知道说什么，AI带我练"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center text-[#7c55ff]">
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
                <span className="block text-[1.22rem] font-extrabold leading-6 text-[#201833]">
                  不知道说什么？
                </span>
                <span className="mt-0.5 block text-[1rem] font-extrabold leading-5 text-[#7c55ff]">
                  AI带我练
                </span>
              </span>
            </button>
          ) : null}

          {hasEnglishAttempt ? (
            <div className="sf-free-practice-result-actions absolute inset-x-0 bottom-0 z-20 grid min-h-[5.45rem] grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[#cfc4ff]/72 bg-[linear-gradient(180deg,rgba(228,220,255,0.78),rgba(215,207,252,0.94))] px-5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-10px_24px_rgba(100,82,180,0.08),inset_0_1px_0_rgba(255,255,255,0.52)] backdrop-blur-xl min-[390px]:gap-4 min-[390px]:px-8">
              <button
                type="button"
                aria-label="播放朗读"
                onClick={() => readStandardEnglish(1)}
                disabled={isFreeConversationMode && isLoadingFreeConversation}
                className="ml-auto flex h-10 min-w-[3.15rem] items-center justify-center rounded-[15px] bg-white/46 px-3 text-[1.05rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_9px_18px_rgba(84,72,146,0.1)] transition disabled:opacity-50 min-[390px]:h-11 min-[390px]:min-w-[3.35rem] min-[390px]:px-4 min-[390px]:text-[1.15rem]"
              >
                ▶
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
                onClick={() => readStandardEnglish(0.5)}
                disabled={isFreeConversationMode && isLoadingFreeConversation}
                className="mr-auto flex h-10 min-w-[4.65rem] items-center justify-center gap-1.5 rounded-[15px] bg-white/46 px-3 text-[0.88rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_9px_18px_rgba(84,72,146,0.1)] transition disabled:opacity-50 min-[390px]:h-11 min-[390px]:min-w-[5.35rem] min-[390px]:gap-2 min-[390px]:px-4 min-[390px]:text-[0.95rem]"
              >
                <span className="text-[1.1rem]">▶</span>
                <span>0.5x</span>
              </button>
            </div>
          ) : null}

          {showQuickPanel ? (
            <div className="absolute inset-x-0 bottom-0 top-[86px] z-40 overflow-y-auto bg-[linear-gradient(180deg,#d8cffc_0%,#ddd5ff_52%,#e7e0ff_100%)] px-11 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 text-[#201833]">
              {showClassicCoursePicker ? (
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
                        className="w-full px-1 py-2.5 text-left text-[1.24rem] font-extrabold leading-7 text-[#201833] transition hover:text-[#5b63ff]"
                      >
                        <MenuGlyph level={2} />
                        <span className="inline-flex flex-col align-top">
                          <span>{item.title}</span>
                          <span className="ml-7 mt-1 text-[0.82rem] font-bold leading-5 text-[#7f7896]">
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

          {hasPracticeActivity &&
          !hasEnglishAttempt &&
          !showNativeCompletePrompt &&
          !showListeningPrompt &&
          !showFreeConversationAnswerPrompt ? (
          <div className="sf-keyboard-panel absolute inset-x-0 bottom-0 z-20 rounded-t-[32px] px-3 pb-3 pt-3 text-[#fffaff]">
            <div className="sf-composer mb-3 p-2">
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  aria-label="打开菜单"
                  onClick={() => setShowQuickPanel((current) => !current)}
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
                      onClick={() => setShowQuickPanel((current) => !current)}
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
            onDismiss={() => setShowFreePracticeLimitModal(false)}
            onUnlockPro={openProFromFreePracticeLimit}
          />
        ) : null}

        {pendingExpression ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171129]/72 p-4 backdrop-blur-[10px]">
            <div className="w-full max-w-[390px] rounded-[30px] border border-white/80 bg-[#f8f5ff] p-6 text-[#201833] shadow-[0_28px_80px_rgba(28,18,62,0.42)]">
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
