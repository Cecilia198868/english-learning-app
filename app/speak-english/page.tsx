"use client";

import type { ChangeEvent, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import FreePracticeLimitModal from "@/components/FreePracticeLimitModal";
import { useLanguage } from "@/components/LanguageProvider";
import {
  addVocabularyWord,
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

type ClassicCourseSection = {
  id: string;
  label: string;
  lessons: Array<{ id: string; title: string }>;
};

type ClassicCourseCategory = {
  id: string;
  label: string;
  sections: ClassicCourseSection[];
};

type ClassicCoursePickerView = "categories" | "sections" | "lessons";

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

type SessionResponse = {
  user?: {
    email?: string | null;
    image?: string | null;
    name?: string | null;
  } | null;
};

type AccountPanelView = "menu" | "account" | "subscription" | "checkout" | "voice";
type ProPlan = "monthly" | "yearly";

type AccountMenuAction = "subscription" | "voice";

const accountAvatarStoragePrefix = "speakflow-account-avatar";
const selectedVoiceStorageKey = "speakflow-selected-voice-uri";

function getAccountAvatarStorageKey(identifier: string) {
  return `${accountAvatarStoragePrefix}:${identifier || "local-user"}`;
}

function createFreePracticeRoundId() {
  return `free:${Date.now()}:${Math.random().toString(36).slice(2)}`;
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
          { action: "subscription", label: "SpeakFlow Pro", trailing: "Not subscribed" },
          { action: "subscription", label: "Manage Subscription" },
          { label: "Restore Purchases" },
        ],
      },
      {
        title: "Settings",
        items: [
          { action: "voice", label: "Voice" },
          {
            children: [
              "Show Chinese by default",
              "Auto-play English",
              "Auto-advance to next sentence",
              "Speech speed",
              "Font size",
              "Long press to reveal answer",
            ],
            label: "Learning Settings",
          },
          { label: "Notifications" },
        ],
      },
      {
        title: "Help",
        items: [
          { label: "Help Center" },
          { label: "Report an Issue" },
          { label: "Privacy Policy" },
          { label: "About" },
        ],
      },
    ],
    accountSecurity: "Account & Security",
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
    included: "Plan includes",
    invalidImage: "Please choose an image file",
    imageReadFailed: "Could not read the avatar. Please choose again.",
    learningData: "Learning Data",
    loginSecurity: "Login & Security",
    member: "Membership",
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
    restorePurchases: "Restore Purchases",
    returnAccountMenu: "Back to account menu",
    returnProPage: "Back to Pro page",
    save: "Save",
    saveAvatarFailed: "Save failed. Please choose a smaller image.",
    settings: "Settings",
    signOut: "Sign Out",
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
          { action: "subscription", label: "SpeakFlow Pro", trailing: "未订阅" },
          { action: "subscription", label: "管理订阅" },
          { label: "恢复购买" },
        ],
      },
      {
        title: "设置",
        items: [
          { action: "voice", label: "声音" },
          {
            children: [
              "默认显示中文",
              "自动播放英文",
              "自动进入下一句",
              "语速",
              "字体大小",
              "长按显示答案",
            ],
            label: "学习设置",
          },
          { label: "通知" },
        ],
      },
      {
        title: "帮助",
        items: [
          { label: "帮助中心" },
          { label: "报告应用问题" },
          { label: "隐私政策" },
          { label: "关于" },
        ],
      },
    ],
    accountSecurity: "账户与安全",
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
    included: "套餐包含",
    invalidImage: "请选择图片文件",
    imageReadFailed: "头像读取失败，请重新选择",
    learningData: "学习数据",
    loginSecurity: "登录与安全",
    member: "会员",
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
    restorePurchases: "恢复购买",
    returnAccountMenu: "返回账户菜单",
    returnProPage: "返回 Pro 页面",
    save: "Save",
    saveAvatarFailed: "保存失败，请换一张更小的图片",
    settings: "设置",
    signOut: "退出登录",
    subscriptionTitle: "订阅",
    chooseAvatarFirst: "请先选择头像",
    changeAvatar: "更换头像",
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
const quickPracticeStarters = [
  "新表达",
  "经典场景口语练习",
] as const;
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
        id: "government-license-id-permit",
        label: "政府服务：驾照、身份证、许可",
        lessons: featuredLessonRecords
          .filter(
            (lesson) =>
              lesson.id.startsWith("government_") ||
              lesson.id.startsWith("driver_")
          )
          .map(({ id, title }) => ({ id, title })),
      },
      { id: "insurance-consulting", label: "保险咨询", lessons: [] },
      { id: "tax-government-forms", label: "税务与政府表格", lessons: [] },
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
  { key: "standard", label: "标准表达" },
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
  return Math.min(Math.max(rate, 0.75), 1.15);
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
        className={`mr-2 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#ede8ff] ${className}`}
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
    3: "h-5 w-5 rounded-[9px] bg-[#ece7ff] text-[1.05rem] font-bold text-[#4b4267]",
    5: "h-3 w-3 rounded-full bg-[#f2efff] text-[0.62rem] text-[#8b7ab8]",
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
  const freePracticeRoundIdRef = useRef(createFreePracticeRoundId());

  const [message, setMessage] = useState("用中文说出你想表达的内容");
  const [inputText, setInputText] = useState("");
  const [keyboardMode, setKeyboardMode] = useState<KeyboardMode>("zh");
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
  const [selectedProPlan, setSelectedProPlan] = useState<ProPlan>("yearly");
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountImage, setAccountImage] = useState("");
  const [accountImageFailed, setAccountImageFailed] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarEditorNotice, setAvatarEditorNotice] = useState("");
  const [showClassicCoursePicker, setShowClassicCoursePicker] = useState(false);
  const [classicCoursePickerView, setClassicCoursePickerView] =
    useState<ClassicCoursePickerView>("categories");
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
  const accountMenuSections = accountCopy.accountMenuSections;
  const proFeatureItems = accountCopy.proFeatures;
  const selectedClassicCourseCategory = useMemo(
    () =>
      classicCourseCategories.find(
        (category) => category.id === selectedClassicCourseCategoryId
      ) ?? null,
    [selectedClassicCourseCategoryId]
  );
  const selectedClassicCourseSection = useMemo(
    () =>
      selectedClassicCourseCategory?.sections.find(
        (section) => section.id === selectedClassicCourseSectionId
      ) ?? null,
    [selectedClassicCourseCategory, selectedClassicCourseSectionId]
  );

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
    Boolean(inputText.trim()) ||
    Boolean(liveTranscript.trim());
  const showLandingPrompt = !hasPracticeActivity;
  const showNativeCompletePrompt =
    hasNativeSpeech && !hasEnglishAttempt && !standardEnglish;
  const showListeningPrompt = isListening;
  const showVoiceOnlyPrompt =
    showLandingPrompt || showNativeCompletePrompt || showListeningPrompt;
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
  const hasPreviousExpression = selectedExpressionIndex > 0;
  const hasNextExpression =
    selectedExpressionIndex < expressionVariantLabels.length - 1;
  const accountAvatarLabel = (
    accountName || accountEmail || "CL"
  )
    .slice(0, 2)
    .toUpperCase();
  const accountPanelTitle =
    accountPanelView === "subscription"
      ? accountCopy.subscriptionTitle
      : accountPanelView === "voice"
        ? accountCopy.accountMenuSections[1].items[0].label
      : accountCopy.accountTitle;
  const accountDisplayName =
    accountName ||
    (accountEmail ? accountEmail.split("@")[0] : accountCopy.fallbackUser);
  const selectedProPlanDetails = accountCopy.proPlans[selectedProPlan];
  const avatarEditorImage =
    avatarPreview || (accountImageFailed ? "" : accountImage);

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
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const shouldOpenPro = searchParams.get("pro") === "1";
    if (searchParams.get("menu") !== "1" && !shouldOpenPro) return;

    setShowQuickPanel(true);
    if (shouldOpenPro) {
      setShowAccountMenu(true);
      setAccountPanelView("subscription");
    }
    window.history.replaceState(null, "", "/speak-english");
  }, []);

  useEffect(() => {
    if (!showQuickPanel) {
      setShowClassicCoursePicker(false);
      resetClassicCoursePicker();
      return;
    }
  }, [showQuickPanel]);

  useEffect(() => {
    return () => {
      shouldCommitSpeechRef.current = false;
      if (speechSilenceTimerRef.current) {
        clearTimeout(speechSilenceTimerRef.current);
        speechSilenceTimerRef.current = null;
      }
      recognitionRef.current?.abort?.();
    };
  }, []);

  function focusInput() {
    textareaRef.current?.focus();
  }

  function resetClassicCoursePicker() {
    setClassicCoursePickerView("categories");
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
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
  }

  function ensureFreePracticeAvailable() {
    if (!isFreePracticeLimitReached("free")) return true;

    showFreePracticeLimit();
    return false;
  }

  function markFreePracticeRoundCompleted() {
    recordFreePracticeCompletion("free", freePracticeRoundIdRef.current);
  }

  function handleAccountMenuAction(action?: AccountMenuAction) {
    if (action === "subscription") {
      setAccountPanelView("subscription");
      return;
    }

    if (action === "voice") {
      setShowAvatarEditor(false);
      setAccountPanelView("voice");
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
    setShowClassicCoursePicker(false);
    resetClassicCoursePicker();
    focusInput();
  }

  function getRecognitionConstructor() {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function clearSpeechSilenceTimer() {
    if (!speechSilenceTimerRef.current) return;

    clearTimeout(speechSilenceTimerRef.current);
    speechSilenceTimerRef.current = null;
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
  }

  function handlePrimaryPracticeAction() {
    if (isListening) {
      stopRecognition();
      return;
    }

    startRecognition();
  }

  function handleComposerPracticeAction() {
    if (isListening) {
      stopRecognition();
      return;
    }

    startRecognition();
  }

  function startRecognition() {
    if (isListening) return;

    const RecognitionConstructor = getRecognitionConstructor();

    if (!RecognitionConstructor) {
      setMessage("Speech recognition is not available in this browser");
      return;
    }

    recognitionRef.current?.abort?.();
    clearSpeechSilenceTimer();
    speechBufferRef.current = "";
    shouldCommitSpeechRef.current = true;
    const isStartingNextNativeRound = Boolean(standardEnglish);
    const nextPracticeStage: PracticeStage = isStartingNextNativeRound
      ? "native"
      : practiceStage;

    if (nextPracticeStage === "native" && !ensureFreePracticeAvailable()) {
      shouldCommitSpeechRef.current = false;
      return;
    }

    if (isStartingNextNativeRound) {
      prepareNextNativeRound();
    }

    const recognition = new RecognitionConstructor();
    recognition.lang = nextPracticeStage === "english" ? "en-US" : currentMode.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
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
      clearSpeechSilenceTimer();

      if (transcript) {
        speechSilenceTimerRef.current = window.setTimeout(() => {
          stopRecognition();
        }, 1000);
      }
    };

    recognition.onerror = () => {
      shouldCommitSpeechRef.current = false;
      clearSpeechSilenceTimer();
      setIsListening(false);
      setLiveTranscript("");
      setMessage("I did not catch that. Try again");
    };

    recognition.onend = () => {
      const finalTranscript = speechBufferRef.current.trim();

      if (shouldCommitSpeechRef.current && finalTranscript) {
        setMessage(finalTranscript);
        if (nextPracticeStage === "native") {
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

      clearSpeechSilenceTimer();
      speechBufferRef.current = "";
      shouldCommitSpeechRef.current = false;
      setLiveTranscript("");
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      shouldCommitSpeechRef.current = false;
      clearSpeechSilenceTimer();
      setIsListening(false);
      setMessage("Speech recognition could not start");
    }
  }

  function stopRecognition() {
    clearSpeechSilenceTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  useEffect(() => {
    if (!hasEnglishAttempt || !nativeSpeech) return;

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
  }, [hasEnglishAttempt, message, nativeSpeech]);

  useEffect(() => {
    const sentence = selectedExpression.text?.trim();
    if (!hasEnglishAttempt || !sentence || isLoadingExpressionVariants) {
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
  }, [hasEnglishAttempt, isLoadingExpressionVariants, selectedExpression.text]);

  function readStandardEnglish(rate: number) {
    const text = selectedExpression.text || standardEnglish;
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
    const result = addVocabularyWord(pendingExpression.phrase, sourceSentence);

    if (!result.ok) {
      closeExpressionModal();
      setVocabularyNotice(
        result.reason === "DUPLICATE" ? "这个表达已经收藏过了" : result.message
      );
      return;
    }

    const savedWord = result.word.word;
    updateVocabularyWord(savedWord, {
      meaning: pendingExpression.meaning,
      partOfSpeech: "phrase",
      example: sourceSentence,
      sourceSentence,
    });
    closeExpressionModal();
    setVocabularyNotice("已存入新表达");
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

  return (
    <main className="responsive-page-shell sf-speak-page min-h-[100dvh] overflow-x-hidden text-white">
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
          </header>

          {showAccountMenu ? (
            <div className="absolute inset-0 z-50 flex flex-col bg-[#fbf9ff]/96 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-2xl">
              {accountPanelView === "subscription" ||
              accountPanelView === "checkout" ? (
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
                      : "SpeakFlow Pro"}
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
                    {accountPanelView !== "menu" ? (
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
                    ) : null}
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
                className={`min-h-0 flex-1 overflow-y-auto ${
                  accountPanelView === "account" ? "mt-10 pr-0" : "mt-7 pr-1"
                }`}
              >
                {accountPanelView === "menu" ? (
                  accountMenuSections.map((section) => (
                    <section
                      key={section.title}
                      className="border-b border-[#ded7ff] py-5 last:border-b-0"
                    >
                      <h3 className="px-1 pb-3 text-[0.95rem] font-extrabold text-[#7f7896]">
                        {section.title}
                      </h3>
                      <div className="overflow-hidden rounded-[22px] bg-white/62 shadow-[0_14px_36px_rgba(84,72,146,0.09)] ring-1 ring-white/75">
                        {section.items.map((item, itemIndex) => (
                          <div
                            key={`${section.title}-${item.label}`}
                            className={
                              itemIndex === section.items.length - 1
                                ? ""
                                : "border-b border-[#e8e2ff]"
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleAccountMenuAction(
                                  "action" in item ? item.action : undefined
                                )
                              }
                              className="flex min-h-[3.45rem] w-full items-center gap-3 px-4 py-3 text-left text-[1.04rem] font-extrabold text-[#201833] transition hover:bg-[#efeaff]/70"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {item.label}
                              </span>
                              {"trailing" in item && item.trailing ? (
                                <span className="shrink-0 rounded-full bg-[#efeaff] px-3 py-1 text-[0.86rem] font-extrabold text-[#7460e8]">
                                  {item.trailing}
                                </span>
                              ) : null}
                              {"action" in item && item.action ? (
                                <span className="shrink-0 text-[1.35rem] font-semibold text-[#7f7896]">
                                  ›
                                </span>
                              ) : null}
                            </button>

                            {"children" in item && item.children ? (
                              <div className="px-4 pb-4">
                                <div className="rounded-[18px] bg-[#f7f4ff]/78 px-4 py-2.5">
                                  {item.children.map((child) => (
                                    <div
                                      key={child}
                                      className="flex min-h-9 items-center justify-between border-b border-[#e8e2ff] text-[0.92rem] font-bold text-[#7f7896] last:border-b-0"
                                    >
                                      <span>{child}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
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
                        <span className="min-w-0 flex-1 truncate text-[1.08rem] font-extrabold">
                          SpeakFlow Pro
                        </span>
                        <span className="rounded-full bg-[#efeaff] px-3 py-1 text-[0.9rem] font-extrabold text-[#7460e8]">
                          {accountCopy.notSubscribed}
                        </span>
                        <span className="text-[1.75rem] font-semibold text-[#7f7896]">
                          ›
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountPanelView("subscription")}
                        className="flex min-h-[4.25rem] w-full items-center gap-4 border-b border-[#e8e2ff] px-5 py-4 text-left"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#efeaff] text-[1.2rem] text-[#7460e8]">
                          ▭
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[1.08rem] font-extrabold">
                          {accountCopy.accountMenuSections[0].items[1].label}
                        </span>
                        <span className="text-[1.75rem] font-semibold text-[#7f7896]">
                          ›
                        </span>
                      </button>
                      <button
                        type="button"
                        className="flex min-h-[4.25rem] w-full items-center gap-4 px-5 py-4 text-left"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[#efeaff] text-[1.2rem] text-[#7460e8]">
                          ↻
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[1.08rem] font-extrabold">
                          {accountCopy.restorePurchases}
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
                        {accountCopy.proLearners}
                      </div>
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
                        onClick={() => setSelectedProPlan("monthly")}
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
                        onClick={() => setSelectedProPlan("yearly")}
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
                      onClick={() => setAccountPanelView("checkout")}
                      aria-label={`${accountCopy.proCta}: ${selectedProPlanDetails.label}`}
                      className="mt-7 flex min-h-[4.1rem] w-full items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#6f55ff_0%,#a549ff_58%,#c85cff_100%)] px-5 text-[1.12rem] font-extrabold text-white shadow-[0_22px_50px_rgba(126,92,255,0.32)]"
                    >
                      <CrownIcon className="mr-2 h-7 w-7" />
                      {accountCopy.proCta}
                    </button>
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

              {accountPanelView === "menu" ? (
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="mt-5 flex min-h-[3.45rem] shrink-0 items-center rounded-[22px] bg-white/62 px-4 py-3 text-left text-[1.06rem] font-extrabold text-[#d33b46] shadow-[0_14px_36px_rgba(84,72,146,0.09)] ring-1 ring-white/75 transition hover:bg-[#ffecef]"
                >
                  <span>{accountCopy.signOut}</span>
                </button>
              ) : null}

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
                ? "pb-[calc(10rem+env(safe-area-inset-bottom))]"
                : hasEnglishAttempt
                  ? "pb-[calc(10rem+env(safe-area-inset-bottom))]"
                  : "pb-[352px]"
            }`}
          >
            <div className="mx-auto h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(145,220,255,0.46),transparent)]" />

            <div
              className={`sf-free-practice-content flex min-h-0 flex-1 flex-col items-center overflow-y-auto text-center ${
                showVoiceOnlyPrompt
                  ? "justify-start pt-28"
                  : hasEnglishAttempt
                    ? "sf-free-practice-result-content justify-start pt-14"
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
                      正在听你说话...
                    </p>
                    <p className="mt-3 text-[1rem] font-extrabold text-[#4b4267]">
                      试着用英语说出来
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
                      试着用英语说出来
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {hasEnglishAttempt ? (
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
                                    {segment.value}
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
                    </>
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
            <div className="absolute inset-x-0 bottom-0 z-20 flex min-h-[9.25rem] items-center justify-center border-t border-[#cfc4ff]/72 bg-[linear-gradient(180deg,rgba(228,220,255,0.84),rgba(215,207,252,0.96))] px-6 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_42px_rgba(100,82,180,0.10),inset_0_1px_0_rgba(255,255,255,0.58)] backdrop-blur-xl">
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
                  className="h-24 w-24"
                />
              </button>
            </div>
          ) : null}

          {hasEnglishAttempt ? (
            <div className="absolute inset-x-0 bottom-0 z-20 grid min-h-[9.25rem] grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[#cfc4ff]/72 bg-[linear-gradient(180deg,rgba(228,220,255,0.84),rgba(215,207,252,0.96))] px-5 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_42px_rgba(100,82,180,0.10),inset_0_1px_0_rgba(255,255,255,0.58)] backdrop-blur-xl min-[390px]:gap-4 min-[390px]:px-8">
              <button
                type="button"
                aria-label="播放朗读"
                onClick={() => readStandardEnglish(1)}
                className="ml-auto flex h-11 min-w-[3.25rem] items-center justify-center rounded-[16px] bg-white/46 px-3 text-[1.15rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_12px_28px_rgba(84,72,146,0.12)] min-[390px]:h-12 min-[390px]:min-w-14 min-[390px]:px-4 min-[390px]:text-[1.25rem]"
              >
                ▶
              </button>

              <button
                type="button"
                onClick={handlePrimaryPracticeAction}
                className="grid place-items-center text-[#7f7896] transition"
                aria-label="点击开始说话"
              >
                <Image
                  src="/icons/glow-mic.svg"
                  alt=""
                  width={96}
                  height={96}
                  className="h-20 w-20 min-[390px]:h-24 min-[390px]:w-24"
                />
              </button>

              <button
                type="button"
                aria-label="慢速朗读"
                onClick={() => readStandardEnglish(0.75)}
                className="mr-auto flex h-11 min-w-[4.75rem] items-center justify-center gap-1.5 rounded-[16px] bg-white/46 px-3 text-[0.92rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_12px_28px_rgba(84,72,146,0.12)] min-[390px]:h-12 min-[390px]:min-w-[5.75rem] min-[390px]:gap-2 min-[390px]:px-4 min-[390px]:text-[1rem]"
              >
                <span className="text-[1.1rem]">▶</span>
                <span>0.75x</span>
              </button>
            </div>
          ) : null}

          {showQuickPanel ? (
            <div className="sf-floating-panel sf-menu-panel absolute left-4 right-4 top-[92px] z-30 p-4">
              <div className="grid gap-2">
                {quickPracticeStarters.map((phrase) => (
                  <div key={phrase} className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAccountMenu(false);

                        if (phrase === "经典场景口语练习") {
                          setShowClassicCoursePicker((current) => !current);
                          resetClassicCoursePicker();
                          return;
                        }

                        if (phrase === "新表达") {
                          window.location.href = "/vocabulary";
                          return;
                        }

                        setShowQuickPanel(false);
                      }}
                      className="rounded-[18px] border border-[#c9bfff] bg-[#f7f4ff] px-4 py-3 text-left text-base font-semibold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                    >
                      <MenuGlyph level={2} />
                      {phrase}
                    </button>

                    {phrase === "经典场景口语练习" &&
                    showClassicCoursePicker ? (
                      <div className="grid max-h-[22rem] gap-3 overflow-y-auto rounded-[18px] border border-[#c9bfff] bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                        <div className="flex items-center gap-2">
                          {classicCoursePickerView !== "categories" ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (classicCoursePickerView === "lessons") {
                                  setClassicCoursePickerView("sections");
                                  setSelectedClassicCourseSectionId("");
                                  return;
                                }

                                resetClassicCoursePicker();
                              }}
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f7f4ff] text-lg font-bold text-[#201833] hover:bg-[#e9e4ff]"
                              aria-label="返回上一层"
                            >
                              ←
                            </button>
                          ) : null}
                          <div className="min-w-0">
                            {selectedClassicCourseCategory ? (
                              <p className="truncate text-[0.72rem] font-semibold text-[#75689c]">
                                {selectedClassicCourseCategory.label}
                                {selectedClassicCourseSection
                                  ? ` / ${selectedClassicCourseSection.label}`
                                  : ""}
                              </p>
                            ) : null}
                            <h3 className="truncate text-base font-bold text-[#201833]">
                              {classicCoursePickerView === "categories"
                                ? "经典场景口语练习"
                                : classicCoursePickerView === "sections"
                                  ? selectedClassicCourseCategory?.label
                                  : selectedClassicCourseSection?.label}
                            </h3>
                          </div>
                        </div>

                        {classicCoursePickerView === "categories" ? (
                          <div className="grid gap-2">
                            {classicCourseCategories.map((category) => (
                              <button
                                key={category.id}
                                type="button"
                                onClick={() => {
                                  setSelectedClassicCourseCategoryId(category.id);
                                  setSelectedClassicCourseSectionId("");
                                  setClassicCoursePickerView("sections");
                                }}
                                className="flex w-full items-center justify-between gap-3 rounded-[16px] bg-[#f7f4ff] px-4 py-3 text-left text-sm font-bold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] hover:bg-[#e9e4ff]"
                              >
                                <span className="min-w-0 truncate">
                                  <MenuGlyph level={3} />
                                  {category.label}
                                </span>
                                <span className="shrink-0 text-[0.72rem] font-semibold opacity-70">
                                  {category.sections.length} 类 ›
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {classicCoursePickerView === "sections" &&
                        selectedClassicCourseCategory ? (
                          <div className="grid gap-2">
                            {selectedClassicCourseCategory.sections.map(
                              (section) => (
                                <button
                                  key={section.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClassicCourseSectionId(section.id);
                                    setClassicCoursePickerView("lessons");
                                  }}
                                  className="flex w-full items-center justify-between gap-3 rounded-[16px] bg-[#f7f4ff] px-4 py-3 text-left text-sm font-bold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] hover:bg-[#e9e4ff]"
                                >
                                  <span className="min-w-0 truncate">
                                    <MenuGlyph level={4} />
                                    {section.label}
                                  </span>
                                  <span className="shrink-0 text-[0.72rem] font-semibold opacity-70">
                                    {section.lessons.length} 门 ›
                                  </span>
                                </button>
                              )
                            )}
                          </div>
                        ) : null}

                        {classicCoursePickerView === "lessons" &&
                        selectedClassicCourseSection ? (
                          <div className="grid gap-2">
                            {selectedClassicCourseSection.lessons.length ? (
                              selectedClassicCourseSection.lessons.map(
                                (lesson) => (
                                  <button
                                    key={lesson.id}
                                    type="button"
                                    onClick={() =>
                                      openClassicLesson(lesson.id, lesson.title)
                                    }
                                    className="flex w-full items-center justify-between gap-3 rounded-[16px] bg-[#f7f4ff] px-4 py-3 text-left text-sm font-bold leading-5 text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] hover:bg-[#e9e4ff]"
                                  >
                                    <span className="min-w-0">
                                      <MenuGlyph level={5} />
                                      {lesson.title}
                                    </span>
                                    <span className="shrink-0 text-[1rem] font-bold opacity-60">
                                      ›
                                    </span>
                                  </button>
                                )
                              )
                            ) : (
                              <p className="rounded-[16px] bg-[#f7f4ff] px-4 py-3 text-sm font-semibold text-[#4b4267]">
                                暂无课程
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {hasPracticeActivity && !hasEnglishAttempt && !showNativeCompletePrompt && !showListeningPrompt ? (
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
                  ➕ 收藏表达
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
