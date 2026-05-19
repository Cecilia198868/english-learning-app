"use client";

import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  "经典场景口语练习",
  "已经学到的新表达",
  "创建我的课程",
  "声音选择",
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const speechBufferRef = useRef("");
  const shouldCommitSpeechRef = useRef(false);
  const speechSilenceTimerRef = useRef<number | null>(null);

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
  const [showClassicCoursePicker, setShowClassicCoursePicker] = useState(false);
  const [classicCoursePickerView, setClassicCoursePickerView] =
    useState<ClassicCoursePickerView>("categories");
  const [selectedClassicCourseCategoryId, setSelectedClassicCourseCategoryId] =
    useState("");
  const [selectedClassicCourseSectionId, setSelectedClassicCourseSectionId] =
    useState("");
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>(
    []
  );
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showPreviewKeyboard, setShowPreviewKeyboard] = useState(true);

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
      const englishVoices = voices.filter((voice) =>
        voice.lang.toLowerCase().startsWith("en")
      );
      const sortedVoices = (englishVoices.length ? englishVoices : voices).sort(
        (a, b) => a.name.localeCompare(b.name)
      );

      setAvailableVoices(sortedVoices);
      setSelectedVoiceURI((current) => current || sortedVoices[0]?.voiceURI || "");
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("menu") !== "1") return;

    setShowQuickPanel(true);
    window.history.replaceState(null, "", "/speak-english");
  }, []);

  useEffect(() => {
    if (!showQuickPanel) {
      setShowClassicCoursePicker(false);
      resetClassicCoursePicker();
      setShowVoicePicker(false);
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
    setShowVoicePicker(false);
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

    if (isStartingNextNativeRound) {
      setPracticeStage("native");
      setNativeSpeech("");
      setHasNativeSpeech(false);
      setHasEnglishAttempt(false);
      setStandardEnglish("");
      setExpressionVariants([]);
      setSelectedExpressionIndex(0);
      setIsLoadingExpressionVariants(false);
    }

    const recognition = new RecognitionConstructor();
    recognition.lang = nextPracticeStage === "english" ? "en-US" : currentMode.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    setInputText("");
    setComposingPinyin("");
    setLiveTranscript("");
    setIsListening(true);
    setMessage("正在听你说话…");

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
    utterance.rate = rate;
    utterance.voice =
      availableVoices.find((voice) => voice.voiceURI === selectedVoiceURI) ||
      null;
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
              <button
                type="button"
                aria-label="打开菜单"
                onClick={() => setShowQuickPanel((current) => !current)}
                className="sf-header-button"
              >
                <span className="relative block h-4 w-5 before:absolute before:left-0 before:top-0 before:h-px before:w-4 before:bg-[#efe9ff] after:absolute after:bottom-0 after:left-0 after:h-px after:w-5 after:bg-[#efe9ff]">
                  <span className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-[#efe9ff]" />
                </span>
              </button>

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
                aria-label="Toggle preview keyboard"
                onClick={() => setShowPreviewKeyboard((current) => !current)}
                className="sf-header-button text-[1.25rem] font-semibold text-[#efe9ff]"
              >
                {showPreviewKeyboard ? "⌄" : "⌃"}
              </button>
            </div>
          </header>

          <section
            className={`sf-free-practice-main relative z-10 flex min-h-0 flex-1 flex-col px-6 pt-6 ${
              hasEnglishAttempt ? "sf-free-practice-result-main" : ""
            } ${
              !showVoiceOnlyPrompt && !hasEnglishAttempt
                ? "sf-free-practice-keyboard-main"
                : ""
            } ${
              showVoiceOnlyPrompt || hasEnglishAttempt ? "pb-10" : "pb-[352px]"
            }`}
          >
            <div className="mx-auto h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(145,220,255,0.46),transparent)]" />

            <div
              className={`flex min-h-0 flex-1 flex-col items-center overflow-y-auto text-center ${
                showVoiceOnlyPrompt ? "justify-start pt-28" : "justify-start pt-14"
              }`}
            >
              {showListeningPrompt ? (
                <>
                  <h2 className="max-w-[360px] text-[1.65rem] font-extrabold leading-10 text-[#201833]">
                    正在听你说话...
                  </h2>
                  <p className="mt-6 max-w-[340px] text-[1rem] font-semibold leading-7 text-[#201833]">
                    {practiceStage === "native"
                      ? "自然地说中文，SpeakFlow 会帮你转换成英语练习。"
                      : "试着用英语说出来"}
                  </p>
                </>
              ) : showLandingPrompt ? (
                <>
                  <h2 className="max-w-[360px] text-[1.65rem] font-extrabold leading-10 text-[#201833]">
                    用中文说出你想表达的内容
                  </h2>
                  <button
                    type="button"
                    onClick={startRecognition}
                    className="mt-52 grid place-items-center"
                    aria-label="点击开始说话"
                  >
                    <Image
                      src="/icons/glow-mic.svg"
                      alt=""
                      width={96}
                      height={96}
                      className="h-24 w-24"
                    />
                    <span className="mt-7 text-[1.08rem] font-semibold text-[#7f7896]">
                      点击开始说话
                    </span>
                  </button>
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
                  <button
                    type="button"
                    onClick={startRecognition}
                    className="mt-64 grid place-items-center"
                    aria-label="点击开始说话"
                  >
                    <Image
                      src="/icons/glow-mic.svg"
                      alt=""
                      width={96}
                      height={96}
                      className="h-24 w-24"
                    />
                    <span className="mt-7 text-[1.08rem] font-semibold text-[#7f7896]">
                      点击开始说话
                    </span>
                  </button>
                </>
              ) : (
                <>
                  {hasEnglishAttempt ? (
                    <>
                      <div className="w-full max-w-[360px] text-left">
                        <p className="text-[1.05rem] font-extrabold text-[#7f7896]">
                          你的表达:
                        </p>
                        <p className="mt-5 rounded-[18px] bg-white/10 px-5 py-4 text-[1.15rem] font-bold leading-8 text-[#8f879c]">
                          {message}
                        </p>
                      </div>

                      <div className="mt-9 w-full max-w-[360px]">
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

                        <p className="mt-4 bg-white/18 px-4 py-4 text-[1.55rem] font-extrabold leading-9 text-[#201833]">
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
                          <p className="mt-3 text-center text-sm font-semibold text-[#7f7896]">
                            {vocabularyNotice}
                          </p>
                        ) : null}

                        <div className="mt-5 flex justify-center gap-5 text-[#201833]">
                          <button
                            type="button"
                            aria-label="播放朗读"
                            onClick={() => readStandardEnglish(1)}
                            className="flex h-12 items-center gap-2 rounded-[16px] bg-white/40 px-5 text-[1.25rem] font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                          >
                            ▶
                          </button>
                          <button
                            type="button"
                            aria-label="慢速朗读"
                            onClick={() => readStandardEnglish(0.5)}
                            className="flex h-12 items-center gap-2 rounded-[16px] bg-white/40 px-5 text-[1.05rem] font-extrabold shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                          >
                            ▶ <span>0.5x</span>
                          </button>
                        </div>
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

          {showQuickPanel ? (
            <div className="sf-floating-panel sf-menu-panel absolute left-4 right-4 top-[92px] z-30 p-4">
              <div className="grid gap-2">
                {quickPracticeStarters.map((phrase) => (
                  <div key={phrase} className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (phrase === "经典场景口语练习") {
                          setShowClassicCoursePicker((current) => !current);
                          resetClassicCoursePicker();
                          setShowVoicePicker(false);
                          return;
                        }

                        if (phrase === "已经学到的新表达") {
                          window.location.href = "/vocabulary?hint=manage";
                          return;
                        }

                        if (phrase === "声音选择") {
                          setShowVoicePicker((current) => !current);
                          setShowClassicCoursePicker(false);
                          resetClassicCoursePicker();
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
                {showVoicePicker ? (
                  <div className="max-h-52 overflow-y-auto rounded-[18px] border border-[#c9bfff] bg-white p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    {availableVoices.length ? (
                      availableVoices.map((voice) => (
                        <button
                          key={voice.voiceURI}
                          type="button"
                          onClick={() => setSelectedVoiceURI(voice.voiceURI)}
                          className={`flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-semibold ${
                            selectedVoiceURI === voice.voiceURI
                              ? "bg-[#e9e4ff] text-[#201833]"
                              : "text-[#4b4267]"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{voice.name}</span>
                            <span className="block text-[0.72rem] font-medium opacity-70">
                              {voice.lang}
                            </span>
                          </span>
                          <span className="shrink-0">
                            {selectedVoiceURI === voice.voiceURI ? "✓" : ""}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm font-semibold text-[#4b4267]">
                        正在加载声音…
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {hasEnglishAttempt ? (
          <button
            type="button"
            onClick={isListening ? stopRecognition : startRecognition}
            className="relative z-20 mb-[max(0.75rem,env(safe-area-inset-bottom))] grid place-items-center self-center"
            aria-label="点击开始说话"
          >
            <Image
              src="/icons/glow-mic.svg"
              alt=""
              width={96}
              height={96}
              className="h-24 w-24"
            />
            <span className="mt-7 text-[1.08rem] font-semibold text-[#7f7896]">
              点击开始说话
            </span>
          </button>
          ) : hasPracticeActivity && !showNativeCompletePrompt && !showListeningPrompt ? (
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
                  onClick={isListening ? stopRecognition : startRecognition}
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
