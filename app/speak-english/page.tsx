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
const speechSilenceDelayMs = 1000;
const speechNoInputTimeoutMs = 12000;
const speechStopFallbackMs = 900;
const speechMaxDurationMs = 45000;

function getAccountAvatarStorageKey(identifier: string) {
  return `${accountAvatarStoragePrefix}:${identifier || "local-user"}`;
}

function createFreePracticeRoundId() {
  return `free:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

const accountMenuItemMarks = [
  ["⭐", "💳", "↻"],
  ["🎧", "🧠", "🔥", "📊", "⬆️"],
  ["🎨", "🔔", "🔒", "☁️"],
  ["❓", "⚑", "ℹ️"],
] as const;

const accountMenuChildMarks = ["中", "▶", "↪", "1x", "A", "?"] as const;

function getAccountMenuItemMark(sectionIndex: number, itemIndex: number) {
  return accountMenuItemMarks[sectionIndex]?.[itemIndex] || "•";
}

function getAccountMenuChildMark(childIndex: number) {
  return accountMenuChildMarks[childIndex] || "•";
}

function AccountMenuMark({
  danger = false,
  value,
}: {
  danger?: boolean;
  value: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-8 w-8 shrink-0 place-items-center text-[1.28rem] font-black leading-none ${
        danger
          ? "text-[#d33b46]"
          : "text-[#201833]"
      }`}
    >
      {value}
    </span>
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
          { action: "subscription", icon: "💳", label: "Manage Subscription" },
          { icon: "↻", label: "Restore Purchases" },
        ],
      },
      {
        title: "Learning",
        items: [
          { action: "voice", icon: "🎧", label: "Voice" },
          {
            children: [
              "Show Chinese by default",
              "Auto-play English",
              "Auto-advance to next sentence",
              "Speech speed",
              "Font size",
              "Long press to reveal answer",
            ],
            icon: "🧠",
            label: "Learning Settings",
          },
          { icon: "🔥", label: "Learning Goals" },
          { icon: "📊", label: "Learning Records" },
          { action: "subscription", icon: "⬆️", label: "Upgrade to Pro" },
        ],
      },
      {
        title: "Settings",
        items: [
          { icon: "🎨", label: "Appearance" },
          { icon: "🔔", label: "Notifications" },
          { icon: "🔒", label: "Privacy & Security" },
          { icon: "☁️", label: "Data Sync" },
        ],
      },
      {
        title: "Help",
        items: [
          { icon: "❓", label: "Help Center" },
          { icon: "⚑", label: "Report an Issue" },
          { icon: "ℹ️", label: "About SpeakFlow" },
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
          {
            action: "subscription",
            icon: "⭐",
            label: "SpeakFlow Pro",
            trailing: "未订阅",
          },
          { action: "subscription", icon: "💳", label: "管理订阅" },
          { icon: "↻", label: "恢复购买" },
        ],
      },
      {
        title: "学习",
        items: [
          { action: "voice", icon: "🎧", label: "声音" },
          {
            children: [
              "默认显示中文",
              "自动播放英文",
              "自动进入下一句",
              "语速",
              "字体大小",
              "长按显示答案",
            ],
            icon: "🧠",
            label: "学习设置",
          },
          { icon: "🔥", label: "学习目标" },
          { icon: "📊", label: "学习记录" },
          { action: "subscription", icon: "⬆️", label: "升级到 Pro" },
        ],
      },
      {
        title: "设置",
        items: [
          { icon: "🎨", label: "外观" },
          { icon: "🔔", label: "通知" },
          { icon: "🔒", label: "隐私与安全" },
          { icon: "☁️", label: "数据同步" },
        ],
      },
      {
        title: "帮助",
        items: [
          { icon: "❓", label: "帮助中心" },
          { icon: "⚑", label: "报告问题" },
          { icon: "ℹ️", label: "关于 SpeakFlow" },
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

function getDefaultCollapsedAccountMenuItems() {
  const collapsedItems = new Set<string>();

  Object.values(accountPanelCopy).forEach(({ accountMenuSections }) => {
    accountMenuSections.forEach((section) => {
      section.items.forEach((item) => {
        if ("children" in item && item.children?.length) {
          collapsedItems.add(`${section.title}-${item.label}`);
        }
      });
    });
  });

  return collapsedItems;
}

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
  const [collapsedAccountMenuItems, setCollapsedAccountMenuItems] = useState<
    Set<string>
  >(() => getDefaultCollapsedAccountMenuItems());
  const [selectedProPlan, setSelectedProPlan] = useState<ProPlan>("yearly");
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountImage, setAccountImage] = useState("");
  const [accountImageFailed, setAccountImageFailed] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarEditorNotice, setAvatarEditorNotice] = useState("");
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
  const accountMenuSections = accountCopy.accountMenuSections;
  const proFeatureItems = accountCopy.proFeatures;
  const voiceMenuItemLabel = language === "en" ? "Voice" : "声音";
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
      : accountPanelView === "voice"
        ? voiceMenuItemLabel
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
    const shouldOpenAccount = searchParams.get("account") === "1";
    if (searchParams.get("menu") !== "1" && !shouldOpenPro && !shouldOpenAccount)
      return;

    setShowQuickPanel(!shouldOpenAccount);
    if (shouldOpenPro) {
      setShowAccountMenu(true);
      setAccountPanelView("subscription");
    } else if (shouldOpenAccount) {
      setShowAccountMenu(true);
      setAccountPanelView("menu");
      setCollapsedAccountMenuItems(getDefaultCollapsedAccountMenuItems());
    }
    window.history.replaceState(null, "", "/speak-english");
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

  function toggleAccountMenuItem(menuItemKey: string) {
    setCollapsedAccountMenuItems((current) => {
      const next = new Set(current);

      if (next.has(menuItemKey)) {
        next.delete(menuItemKey);
      } else {
        next.add(menuItemKey);
      }

      return next;
    });
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
  }

  function finishRecognition(finalTranscript = speechBufferRef.current.trim()) {
    const completedStage = activeRecognitionStageRef.current;

    if (shouldCommitSpeechRef.current && finalTranscript) {
      setMessage(finalTranscript);
      if (completedStage === "native") {
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

    startRecognition();
  }

  function handleComposerPracticeAction() {
    if (isListening) {
      stopRecognition({ forceUiReset: true });
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
    clearAllSpeechTimers();
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
    activeRecognitionStageRef.current = nextPracticeStage;
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
      clearTimer(speechNoInputTimerRef);
      clearSpeechSilenceTimer();

      if (transcript) {
        speechSilenceTimerRef.current = window.setTimeout(() => {
          stopRecognition();
        }, speechSilenceDelayMs);
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
                      setCollapsedAccountMenuItems(
                        getDefaultCollapsedAccountMenuItems()
                      );
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
            <div className="sf-account-panel absolute inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#f0eaff_0%,#f7f3ff_100%)] px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-2xl">
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
                className={`sf-account-panel-scroll min-h-0 flex-1 overflow-y-auto ${
                  accountPanelView === "account" ? "mt-10 pr-0" : "mt-7 pr-1"
                }`}
              >
                {accountPanelView === "menu" ? (
                  <>
                    {accountMenuSections.map((section, sectionIndex) => (
                      <section key={section.title} className="py-4">
                        <h3 className="px-1 pb-3 text-[1.08rem] font-extrabold leading-[1.5] text-[#7f7896]">
                          {section.title}
                        </h3>
                        <div className="grid gap-1">
                          {section.items.map((item, itemIndex) => {
                            const menuItemKey = `${section.title}-${item.label}`;
                            const childItems =
                              "children" in item ? item.children : undefined;
                            const hasChildren = Boolean(childItems?.length);
                            const isCollapsed =
                              hasChildren &&
                              collapsedAccountMenuItems.has(menuItemKey);
                            const itemMark =
                              "icon" in item && item.icon
                                ? item.icon
                                : getAccountMenuItemMark(sectionIndex, itemIndex);
                            const trailingText =
                              "trailing" in item &&
                              typeof item.trailing === "string"
                                ? item.trailing
                                : "";

                            return (
                              <div key={menuItemKey} className="">
                                <button
                                  type="button"
                                  aria-expanded={hasChildren ? !isCollapsed : undefined}
                                  onClick={() => {
                                    if (hasChildren) {
                                      toggleAccountMenuItem(menuItemKey);
                                      return;
                                    }

                                    handleAccountMenuAction(
                                      "action" in item ? item.action : undefined
                                    );
                                  }}
                                  className="flex min-h-[3.85rem] w-full items-center gap-3 px-1 py-3.5 text-left text-[1.18rem] font-extrabold leading-[1.5] text-[#201833] transition hover:text-[#5b63ff]"
                                >
                                  <AccountMenuMark value={itemMark} />
                                  <span className="min-w-0 flex-1 truncate">
                                    {item.label}
                                  </span>
                                  {trailingText ? (
                                    <span className="shrink-0 px-2 text-[0.96rem] font-extrabold leading-[1.5] text-[#7460e8]">
                                      {trailingText}
                                    </span>
                                  ) : null}
                                  {hasChildren ? (
                                    <span
                                      className={`shrink-0 text-[1.3rem] font-extrabold leading-none text-[#7f7896] transition-transform ${
                                        isCollapsed ? "-rotate-90" : ""
                                      }`}
                                    >
                                      ⌄
                                    </span>
                                  ) : "action" in item && item.action ? (
                                    <span className="shrink-0 text-[1.45rem] font-semibold leading-none text-[#7f7896]">
                                      ›
                                    </span>
                                  ) : null}
                                </button>

                                {hasChildren && !isCollapsed ? (
                                  <div className="pb-2 pl-11 pr-1">
                                    <div className="grid gap-1">
                                      {childItems?.map((child, childIndex) => (
                                        <div
                                          key={child}
                                          className="flex min-h-11 items-center gap-3 text-[1.05rem] font-bold leading-[1.5] text-[#7f7896]"
                                        >
                                          <AccountMenuMark
                                            value={getAccountMenuChildMark(childIndex)}
                                          />
                                          <span>{child}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}

                    <button
                      type="button"
                      onClick={() => void signOut({ callbackUrl: "/" })}
                      className="mb-2 mt-3 flex min-h-[3.85rem] w-full items-center gap-3 px-1 py-3 text-left text-[1.16rem] font-extrabold leading-[1.5] text-[#d33b46] transition hover:text-[#ad2430]"
                    >
                      <AccountMenuMark danger value="🚪" />
                      <span>{accountCopy.signOut}</span>
                    </button>
                  </>
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
                          {accountCopy.subscriptionTitle}
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
                  ? "pb-[calc(5.95rem+env(safe-area-inset-bottom))]"
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

          {hasEnglishAttempt ? (
            <div className="sf-free-practice-result-actions absolute inset-x-0 bottom-0 z-20 grid min-h-[5.45rem] grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[#cfc4ff]/72 bg-[linear-gradient(180deg,rgba(228,220,255,0.78),rgba(215,207,252,0.94))] px-5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-10px_24px_rgba(100,82,180,0.08),inset_0_1px_0_rgba(255,255,255,0.52)] backdrop-blur-xl min-[390px]:gap-4 min-[390px]:px-8">
              <button
                type="button"
                aria-label="播放朗读"
                onClick={() => readStandardEnglish(1)}
                className="ml-auto flex h-10 min-w-[3.15rem] items-center justify-center rounded-[15px] bg-white/46 px-3 text-[1.05rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_9px_18px_rgba(84,72,146,0.1)] min-[390px]:h-11 min-[390px]:min-w-[3.35rem] min-[390px]:px-4 min-[390px]:text-[1.15rem]"
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
                  className="h-[4.3rem] w-[4.3rem] min-[390px]:h-[4.45rem] min-[390px]:w-[4.45rem]"
                />
              </button>

              <button
                type="button"
                aria-label="慢速朗读"
                onClick={() => readStandardEnglish(0.5)}
                className="mr-auto flex h-10 min-w-[4.65rem] items-center justify-center gap-1.5 rounded-[15px] bg-white/46 px-3 text-[0.88rem] font-extrabold text-[#201833] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_9px_18px_rgba(84,72,146,0.1)] min-[390px]:h-11 min-[390px]:min-w-[5.35rem] min-[390px]:gap-2 min-[390px]:px-4 min-[390px]:text-[0.95rem]"
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
                  {quickPracticeStarters.map((phrase) => (
                    <div key={phrase} className="grid gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);

                          if (phrase === "新表达") {
                            setShowClassicCoursePicker(false);
                            resetClassicCoursePicker();
                            setShowExpressionMenu((current) => !current);
                            return;
                          }

                          if (phrase === "经典场景口语练习") {
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
                        {phrase}
                      </button>

                      {phrase === "新表达" && showExpressionMenu ? (
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
