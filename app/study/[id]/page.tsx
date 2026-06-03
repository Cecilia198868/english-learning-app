"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import AccountAvatarButton from "@/components/AccountAvatarButton";
import ClassicRoleAvatarIcon from "@/components/ClassicRoleAvatarIcon";
import FreePracticeLimitModal from "@/components/FreePracticeLimitModal";
import FreeUsageMeter from "@/components/FreeUsageMeter";
import HomeMenuIcon from "@/components/HomeMenuIcon";
import PlayIcon from "@/components/PlayIcon";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";
import { parseTrainingContent, type SentencePair } from "@/lib/training";
import {
  featuredLessonRecords,
  getFeaturedLessonById,
} from "@/data/featuredCourses";
import {
  getClassicLessonRoleConfig,
  type ClassicSceneRoleIcon,
} from "@/data/classicSceneRoles";
import { financeGovernmentSections } from "@/data/financeGovernmentSections";
import { getPrebuiltClassicExpressionSet } from "@/data/prebuiltClassicExpressions";
import { shoppingSceneSectionMenus } from "@/data/shoppingSceneSectionMenus";
import {
  addVocabularyWord,
  flushVocabularyCloudSync,
  generateVocabularyDefinition,
  hasUsableMeaning,
  tokenizeEnglishSentence,
  updateVocabularyWord,
} from "@/lib/vocabulary";
import {
  createFallbackHighlightedExpressions,
  splitSentenceByHighlightedExpressions,
  type HighlightedExpression,
} from "@/lib/expressionHighlights";
import {
  FREE_PRACTICE_DAILY_LIMIT,
  getFreePracticeUsage,
  hasFreePracticeCompletion,
  isFreePracticeLimitReached,
  recordFreePracticeCompletion,
} from "@/lib/freePracticeLimit";
import { createLoginUrl, subscriptionCallbackUrl } from "@/lib/loginRedirect";
import styles from "./ClassicStudyPage.module.css";

type Lesson = {
  id: string;
  roleIcon?: ClassicSceneRoleIcon;
  roleLabel?: string;
  title: string;
  txt_content: string;
  created_at?: string;
  sourceAudioId?: string;
};

type LocalLessonData = {
  lessons: Lesson[];
};

type SubscriptionStatus = "free" | "pro" | "cancels_at_period_end";
type AccountAccessKind = "checking" | "guest" | "signed-in";

type AccountSubscriptionResponse = {
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | null;
  subscriptionStatus?: SubscriptionStatus;
};

function normalizeSubscriptionStatus(
  subscriptionStatus?: SubscriptionStatus | null,
  cancelAtPeriodEnd?: boolean | null
): SubscriptionStatus {
  if (cancelAtPeriodEnd === true) {
    return "cancels_at_period_end";
  }

  return subscriptionStatus === "pro" ||
    subscriptionStatus === "cancels_at_period_end"
    ? subscriptionStatus
    : "free";
}

function hasProAccess(subscriptionStatus: SubscriptionStatus) {
  return subscriptionStatus !== "free";
}

function createAccountSubscriptionUrl() {
  return `/api/me/subscription?t=${Date.now()}`;
}

const LESSONS_STORAGE_KEY = "english-app-lessons";
const DB_NAME = "english-learning-app-db";
const DB_VERSION = 1;
const AUDIO_STORE_NAME = "audios";
const LAST_STUDY_PROGRESS_KEY = "lastStudyProgress";
const GUEST_CLASSIC_PREVIEW_LESSON_ID = "bank_open_new_account_zh";
const GUEST_CLASSIC_SENTENCE_LIMIT = 5;
function isClassicSceneLessonId(lessonId: string) {
  return (
    lessonId.startsWith("bank_") ||
    lessonId.startsWith("government_") ||
    lessonId.startsWith("driver_") ||
    lessonId.startsWith("shopping_")
  );
}

function limitPairsForAccountAccess(
  lessonId: string,
  pairs: SentencePair[],
  accountAccessKind: AccountAccessKind
) {
  if (accountAccessKind !== "guest" || !isClassicSceneLessonId(lessonId)) {
    return pairs;
  }

  if (lessonId !== GUEST_CLASSIC_PREVIEW_LESSON_ID) {
    return [];
  }

  return pairs.slice(0, GUEST_CLASSIC_SENTENCE_LIMIT);
}

function getClassicFinanceSectionForLesson(lessonId: string) {
  return Object.values(financeGovernmentSections).find((section) =>
    section.lessons.some((item) => item.id === lessonId)
  );
}

function getClassicShoppingSectionForLesson(lessonId: string) {
  return Object.values(shoppingSceneSectionMenus).find((section) =>
    section.lessons.some((item) => item.id === lessonId)
  );
}

function getClassicSectionLessonSequence(lessonId: string) {
  const financeSection = getClassicFinanceSectionForLesson(lessonId);
  const shoppingSection = getClassicShoppingSectionForLesson(lessonId);
  const section = financeSection || shoppingSection;

  if (!section) return null;

  return section.lessons.reduce<Array<{ id: string; title: string }>>(
    (sequence, item) => {
      if (typeof item.id !== "string" || item.id.length === 0) {
        return sequence;
      }

      sequence.push({
        id: item.id,
        title: item.title,
      });

      return sequence;
    },
    []
  );
}

function getClassicStudyNavigation(lessonId: string) {
  const financeSection = getClassicFinanceSectionForLesson(lessonId);
  const shoppingSection = getClassicShoppingSectionForLesson(lessonId);

  if (financeSection) {
    return {
      categoryHref: `/classic-scenes/finance-government/${financeSection.id}`,
      categoryLabel: financeSection.title,
      courseMenuHref: "/classic-scenes",
    };
  }

  if (shoppingSection) {
    return {
      categoryHref: `/classic-scenes/shopping-consumption/${shoppingSection.id}`,
      categoryLabel: shoppingSection.title,
      courseMenuHref: "/classic-scenes",
    };
  }

  return {
    categoryHref: "/classic-scenes",
    categoryLabel: "经典场景口语练习",
    courseMenuHref: "/classic-scenes",
  };
}
const expressionVariantLabels: Array<{
  key: ExpressionVariantKey;
  label: string;
}> = [
  { key: "standard", label: "推荐表达" },
  { key: "idiomatic", label: "更地道" },
  { key: "simple", label: "更简单" },
  { key: "natural", label: "更自然" },
];

type AudioDBRecord = {
  id: string;
  file?: Blob;
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

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getDefaultLessonsData(): LocalLessonData {
  return { lessons: [] };
}

function getDisplayCourseFileName(title: string) {
  return title.replace(/^我的课程：/, "").trim() || "未命名课程";
}

function getStoredCourseTitle(title: string) {
  const trimmed = title.trim() || "未命名课程";
  return trimmed.startsWith("我的课程：") ? trimmed : `我的课程：${trimmed}`;
}

function readLessonsStorage() {
  if (typeof window === "undefined") {
    return { lessons: [], payload: {} as Record<string, unknown> };
  }

  try {
    const raw = localStorage.getItem(LESSONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const payload =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    const lessons = Array.isArray(payload.lessons)
      ? (payload.lessons as Lesson[])
      : [];

    return { lessons, payload };
  } catch {
    return { lessons: [], payload: {} as Record<string, unknown> };
  }
}

function writeLessonsStorage(
  payload: Record<string, unknown>,
  lessons: Lesson[]
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LESSONS_STORAGE_KEY, JSON.stringify({ ...payload, lessons }));
}

function loadLessonsData(): LocalLessonData {
  if (typeof window === "undefined") return getDefaultLessonsData();

  try {
    const { lessons } = readLessonsStorage();
    return { lessons };
  } catch (error) {
    console.error("Failed to load lesson:", error);
    return getDefaultLessonsData();
  }
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("浏览器不支持音频播放"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("打开音频数据库失败"));
  });
}

async function getAudioBlobById(id: string): Promise<Blob | null> {
  console.log("[study] getAudioBlobById:start", {
    audioId: id,
    objectStore: AUDIO_STORE_NAME,
  });
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(AUDIO_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as AudioDBRecord | undefined;
      console.log("[study] getAudioBlobById:success", {
        audioId: id,
        hasBlob: Boolean(result?.file),
      });
      resolve(result?.file || null);
    };

    request.onerror = () => reject(new Error("读取原音频失败"));
  });
}

async function deleteAudioById(id: string) {
  try {
    const db = await openAudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE_NAME, "readwrite");
      const store = tx.objectStore(AUDIO_STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error("删除原音频失败"));
    });
  } catch (error) {
    console.warn("Failed to delete audio:", error);
  }
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

function createFallbackExpressionVariants(standardEnglish: string) {
  return expressionVariantLabels.map(({ key, label }) => ({
    key,
    label,
    text: standardEnglish || "This sentence is still being prepared.",
  }));
}

function BrandBubbleIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 52 52">
      <path d="M10 25.4C10 14.7 18.4 7 29 7c10.3 0 18 7.2 18 17.2 0 10.4-8.1 17.4-18.5 17.4-2.1 0-4.1-.3-5.9-.9L11.8 45l3-9.6A16 16 0 0 1 10 25.4Z" />
      <path d="M22 20v9M29 16v17M36 21v8M17 24v3M41 24v3" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
      <path d="M19 8 11 16l8 8M12 16h16" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32">
      <path d="m13 8 8 8-8 8M4 16h16" />
    </svg>
  );
}

function TopicIcon({ lessonId, title }: { lessonId: string; title: string }) {
  const source = `${lessonId} ${title}`.toLowerCase();
  const icon =
    source.includes("atm") || title.includes("ATM")
      ? "atm"
      : source.includes("phone") || title.includes("电话")
        ? "phone"
        : source.includes("loan") || title.includes("贷款")
          ? "home"
          : source.includes("insurance") || title.includes("保险")
            ? "shield"
            : source.includes("bank") || title.includes("银行")
              ? "bank"
              : "dialog";

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      {icon === "atm" ? (
        <>
          <rect x="9" y="9" width="30" height="30" rx="7" />
          <text x="24" y="22" textAnchor="middle">
            ATM
          </text>
          <text x="24" y="32" textAnchor="middle">
            ATM
          </text>
        </>
      ) : icon === "phone" ? (
        <path d="M17 10 11 16c1.7 9.8 10.2 18.2 20 20l6-6-7-5-3.6 3.5c-3.2-1.4-5.6-3.8-7-7l3.6-3.5-5-8Z" />
      ) : icon === "home" ? (
        <>
          <path d="M8 23 24 10l16 13" />
          <path d="M13 22v17h22V22" />
          <path d="M21 39V28h6v11" />
        </>
      ) : icon === "shield" ? (
        <>
          <path d="M24 8 37 13v9c0 8-5.4 14-13 18-7.6-4-13-10-13-18v-9l13-5Z" />
          <path d="M18 24 22 28l8-9" />
        </>
      ) : icon === "bank" ? (
        <>
          <path d="M6 18h36L24 8 6 18Z" />
          <path d="M10 39h28M8 43h32M13 18v17M21 18v17M29 18v17M37 18v17" />
        </>
      ) : (
        <>
          <path d="M10 15c3.3-4 7.7-6 13.1-6C32 9 39 15 39 23.4S32.2 38 23 38c-2 0-3.8-.3-5.5-.8L9 41l2.5-8A15.4 15.4 0 0 1 10 15Z" />
          <path d="M18 23h.1M24 23h.1M30 23h.1" />
        </>
      )}
    </svg>
  );
}

function BookMethodIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <path d="M8 10h13c3 0 5 2 5 5v25c0-3-2-5-5-5H8V10Z" />
      <path d="M40 10H27c-3 0-5 2-5 5v25c0-3 2-5 5-5h13V10Z" />
    </svg>
  );
}

function MicMethodIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <rect x="18" y="7" width="12" height="22" rx="6" />
      <path d="M12 23c0 7 5 12 12 12s12-5 12-12M24 35v7M17 42h14" />
    </svg>
  );
}

function StarMethodIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <path d="m24 8 4.8 10 11 1.6-8 7.7 1.9 10.8L24 33l-9.7 5.1 1.9-10.8-8-7.7 11-1.6L24 8Z" />
    </svg>
  );
}

function BigMicIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 96 96">
      <rect x="36" y="16" width="24" height="44" rx="12" />
      <path d="M24 47c0 14 10 24 24 24s24-10 24-24M48 71v13M35 84h26" />
    </svg>
  );
}

function UserResultIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="33" fill="#f3eadc" />
      <path d="M20 61c3-11 9-17 16-17s13 6 16 17" fill="#5d7f54" />
      <path d="M24 25c2-10 9-16 18-14 9 2 13 10 10 20-2-7-7-10-14-9-7 1-11 2-14 3Z" fill="#6f5335" />
      <circle cx="35" cy="31" r="16" fill="#ffe6cf" />
      <path d="M25 31c2-5 7-8 15-8 5 0 9 2 12 6-2-11-10-17-20-14-8 2-12 8-12 17 2 0 3 0 5-1Z" fill="#7a5a38" />
      <circle cx="30" cy="33" r="1.8" fill="#3d3025" />
      <circle cx="41" cy="33" r="1.8" fill="#3d3025" />
      <path d="M31 41c3 2 6 2 9 0" fill="none" stroke="#3d3025" strokeLinecap="round" strokeWidth="2" />
      <path d="M28 48h16l-8 8-8-8Z" fill="#fffaf2" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <path d="M8 19h8l12-9v28l-12-9H8V19Z" />
      <path d="M34 18c2.3 2.3 3.5 4.9 3.5 8s-1.2 5.7-3.5 8" />
      <path d="M39 13c3.7 3.7 5.5 8 5.5 13S42.7 35.3 39 39" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <path d="M10 27v-4c0-8 6-14 14-14s14 6 14 14v4" />
      <rect x="7" y="25" width="9" height="13" rx="4" />
      <rect x="32" y="25" width="9" height="13" rx="4" />
    </svg>
  );
}

function ResultVariantIcon({ variantKey }: { variantKey: ExpressionVariantKey }) {
  if (variantKey === "idiomatic") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 40 40">
        <path d="M11 6v12c0 3 2 5 5 5v11h3V23c3 0 5-2 5-5V6h-3v11h-2V6h-3v11h-2V6h-3Z" />
        <path d="M29 6c-2 4-3 8-3 13v15h3V23h3V6h-3Z" />
      </svg>
    );
  }

  if (variantKey === "simple") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 40 40">
        <path d="M9 24h2l3-8h12l3 8h2a3 3 0 0 1 3 3v5h-4v-3H10v3H6v-5a3 3 0 0 1 3-3Z" />
        <path d="M15 18h10l2 6H13l2-6Z" />
        <circle cx="13" cy="29" r="2" />
        <circle cx="27" cy="29" r="2" />
      </svg>
    );
  }

  if (variantKey === "natural") {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 40 40">
        <path d="M20 5 32 10v9c0 8-4.7 13.6-12 17-7.3-3.4-12-9-12-17v-9L20 5Z" />
        <path d="M18 14h4v6h6v4h-6v6h-4v-6h-6v-4h6v-6Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 40 40">
      <path d="m20 6 4.1 8.3 9.2 1.4-6.7 6.5 1.6 9.2L20 27l-8.2 4.4 1.6-9.2-6.7-6.5 9.2-1.4L20 6Z" />
    </svg>
  );
}

function ResultBookIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 52 52">
      <path d="M8 12h16c3 0 5 2 5 5v27c0-3-2-5-5-5H8V12Z" />
      <path d="M44 12H28c-3 0-5 2-5 5v27c0-3 2-5 5-5h16V12Z" />
      <path d="M14 19h8M14 25h8M30 19h8M30 25h8" />
    </svg>
  );
}

function getResultVariantNote(variantKey: ExpressionVariantKey) {
  if (variantKey === "standard") return "最自然、最常用的表达";
  if (variantKey === "idiomatic") return "更符合母语者习惯";
  if (variantKey === "simple") return "用词更简单，容易说";
  return "日常交流中更自然的说法";
}

function getResultVariantToneClass(variantKey: ExpressionVariantKey) {
  if (variantKey === "idiomatic") return styles.toneIdiomatic;
  if (variantKey === "simple") return styles.toneSimple;
  if (variantKey === "natural") return styles.toneNatural;
  return styles.toneRecommended;
}

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = typeof params.id === "string" ? params.id : "";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [hasLoadedLesson, setHasLoadedLesson] = useState(false);
  const [localLessonSequence, setLocalLessonSequence] = useState<Lesson[]>([]);
  const [pairs, setPairs] = useState<SentencePair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const [message, setMessage] = useState("");
  const [spokenEnglish, setSpokenEnglish] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
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
  const [highlightedExpressions, setHighlightedExpressions] = useState<
    HighlightedExpression[]
  >([]);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showCourseFileMenu, setShowCourseFileMenu] = useState(false);
  const [showRenameCourseDialog, setShowRenameCourseDialog] = useState(false);
  const [renameCourseTitle, setRenameCourseTitle] = useState("");
  const [showFreePracticeLimitModal, setShowFreePracticeLimitModal] =
    useState(false);
  const [showFollowReadModal, setShowFollowReadModal] = useState(false);
  const [accountSubscriptionStatus, setAccountSubscriptionStatus] =
    useState<SubscriptionStatus>("free");
  const [accountAccessKind, setAccountAccessKind] =
    useState<AccountAccessKind>("checking");
  const [freePracticeUsageCount, setFreePracticeUsageCount] = useState(0);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [sourceAudioUrl, setSourceAudioUrl] = useState<string | null>(null);
  const [isSourceAudioLoading, setIsSourceAudioLoading] = useState(false);
  const [isClipPlaying, setIsClipPlaying] = useState(false);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const [sourcePlaybackRate, setSourcePlaybackRate] = useState(1);

  const [prepSeconds, setPrepSeconds] = useState(2);
  const [gapSeconds, setGapSeconds] = useState(1);

  const progressKey = `lesson-progress-${lessonId}`;
  const voiceKey = "selected-voice-name";
  const prepKey = "study-prep-seconds";
  const gapKey = "study-gap-seconds";
  const isMyCourseLesson = lessonId.startsWith("my-course-");
  const freePracticeScope = isMyCourseLesson
    ? (`course:${lessonId}` as const)
    : "classic";
  const isAccountPro = hasProAccess(accountSubscriptionStatus);

  const autoPlayRef = useRef(false);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const sequenceTimerRef = useRef<number | null>(null);
  const sourceAudioRef = useRef<HTMLAudioElement | null>(null);
  const sourceAudioObjectUrlRef = useRef<string | null>(null);
  const clipEndTimeRef = useRef<number | null>(null);
  const isSequencePlayingRef = useRef(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechBufferRef = useRef("");
  const speechSilenceTimerRef = useRef<number | null>(null);

  const refreshFreePracticeUsageCount = useCallback(() => {
    setFreePracticeUsageCount(getFreePracticeUsage(freePracticeScope).count);
  }, [freePracticeScope]);

  useEffect(() => {
    refreshFreePracticeUsageCount();
  }, [refreshFreePracticeUsageCount]);

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

  function clearAutoTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearSequenceTimer() {
    if (sequenceTimerRef.current !== null) {
      window.clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  }

  function clearSpeechSilenceTimer() {
    if (speechSilenceTimerRef.current !== null) {
      window.clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
  }

  function resetPracticeAttempt() {
    setSpokenEnglish("");
    setLiveTranscript("");
    setShowEnglish(false);
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setIsLoadingExpressionVariants(false);
    setShowFollowReadModal(false);
    speechBufferRef.current = "";
    clearSpeechSilenceTimer();
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    setIsListening(false);
  }

  function stopClipPlayback(resetTime = false) {
    const audio = sourceAudioRef.current;
    if (!audio) return;

    audio.pause();
    if (resetTime) {
      audio.currentTime = 0;
    }
    clipEndTimeRef.current = null;
    setIsClipPlaying(false);
  }

  function stopSequencePlayback(resetClip = false) {
    autoPlayRef.current = false;
    setIsAutoPlaying(false);
    isSequencePlayingRef.current = false;
    setIsSequencePlaying(false);
    window.speechSynthesis.cancel();
    clearSequenceTimer();
    stopClipPlayback(resetClip);
  }

  const loadLesson = useCallback(() => {
    if (isClassicSceneLessonId(lessonId) && accountAccessKind === "checking") {
      setMessage("正在加载课程");
      setLesson(null);
      setPairs([]);
      setHasLoadedLesson(false);
      return;
    }

    setHasLoadedLesson(false);
    const data = loadLessonsData();
    setLocalLessonSequence(data.lessons || []);
    const found = data.lessons.find((item) => item.id === lessonId) || null;

    console.log("[study] loadLesson", {
      lessonId,
      found: Boolean(found),
      sourceAudioId: found?.sourceAudioId ?? null,
    });

    if (!found) {
      const featuredLesson = getFeaturedLessonById(lessonId);
      if (!featuredLesson) {
        setMessage("没有找到这节课");
        setLesson(null);
        setPairs([]);
        setHasLoadedLesson(true);
        return;
      }

      setLesson(featuredLesson);
      setLessonTitle(featuredLesson.title);

      const featuredPairs = limitPairsForAccountAccess(
        lessonId,
        parseTrainingContent(featuredLesson.txt_content || ""),
        accountAccessKind
      );
      setPairs(featuredPairs);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      setShowEnglish(false);
      setSpokenEnglish("");
      setLiveTranscript("");
      setExpressionVariants([]);
      setSelectedExpressionIndex(0);
      setMessage(
        accountAccessKind === "guest" &&
          isClassicSceneLessonId(lessonId) &&
          featuredPairs.length === 0
          ? "游客只能体验第一课的 5 句内容"
          : accountAccessKind === "guest" &&
              lessonId === GUEST_CLASSIC_PREVIEW_LESSON_ID
            ? "游客可体验前 5 句"
            : ""
      );
      setHasLoadedLesson(true);
      return;
    }

    setLesson(found);
    setLessonTitle(found.title || "未命名课程");

    const parsedPairs = limitPairsForAccountAccess(
      lessonId,
      parseTrainingContent(found.txt_content || ""),
      accountAccessKind
    );
    setPairs(parsedPairs);

    const savedIndex = localStorage.getItem(progressKey);
    if (savedIndex !== null) {
      const indexNumber = Number(savedIndex);
      if (!Number.isNaN(indexNumber) && indexNumber >= 0 && indexNumber < parsedPairs.length) {
        setCurrentIndex(indexNumber);
        currentIndexRef.current = indexNumber;
      } else {
        setCurrentIndex(0);
        currentIndexRef.current = 0;
      }
    } else {
      setCurrentIndex(0);
      currentIndexRef.current = 0;
    }

    setShowEnglish(false);
    setSpokenEnglish("");
    setLiveTranscript("");
    setExpressionVariants([]);
    setSelectedExpressionIndex(0);
    setHasLoadedLesson(true);
  }, [accountAccessKind, lessonId, progressKey]);

  function saveProgress(index: number) {
    localStorage.setItem(progressKey, String(index));
    localStorage.setItem(
      LAST_STUDY_PROGRESS_KEY,
      JSON.stringify({
        courseId: lessonId,
        sentenceIndex: index,
        updatedAt: new Date().toISOString(),
      })
    );
  }

  function handleExpressionClick(
    expression: HighlightedExpression,
    sourceSentence: string
  ) {
    const phrase = expression.phrase.trim();
    if (!phrase) return;

    stopSequencePlayback();
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

    stopSequencePlayback();
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
        setMessage("中文释义生成失败，请稍后再试");
        return;
      }
    }

    const result = addVocabularyWord(
      pendingExpression.phrase,
      sourceSentence
    );

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
      setMessage(
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
    setMessage(isWord ? "已存入表达库" : "已存入新表达");
  }

  function handlePrev() {
    stopSequencePlayback();
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
      resetPracticeAttempt();
      saveProgress(newIndex);
      setMessage("");
    }
  }

  async function handleNext() {
    stopSequencePlayback();
    if (currentIndex < pairs.length - 1) {
      const newIndex = currentIndex + 1;

      if (!(await ensureFreePracticeAvailable(newIndex))) return;

      setCurrentIndex(newIndex);
      currentIndexRef.current = newIndex;
      resetPracticeAttempt();
      saveProgress(newIndex);
      setMessage("");
    }
  }

  function getSelectedVoice() {
    return voices.find(
      (voice) => voice.name === selectedVoiceName && isStableSpeechVoice(voice)
    );
  }

  function speakEnglish(text: string, rate = 1, onEnd?: () => void) {
    if (!text) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = normalizeSpeechRate(rate);
    utterance.pitch = 1;
    utterance.volume = 1;

    const selectedVoice = getSelectedVoice() || pickPreferredEnglishVoice(voices);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  function readExpressionVariant(
    variant: ExpressionVariant,
    variantIndex: number,
    rate = 1
  ) {
    setSelectedExpressionIndex(variantIndex);
    speakEnglish(variant.text, rate);
  }

  function moveToSentence(index: number) {
    setCurrentIndex(index);
    currentIndexRef.current = index;
    resetPracticeAttempt();
    saveProgress(index);
    setMessage("");
  }

  function loadVoices() {
    const allVoices = window.speechSynthesis.getVoices();
    const englishVoices = allVoices.filter(isEnglishVoice);
    const preferredVoice = pickPreferredEnglishVoice(englishVoices);

    setVoices(englishVoices);

    const savedVoiceName = localStorage.getItem(voiceKey);
    if (
      savedVoiceName &&
      englishVoices.some(
        (voice) =>
          voice.name === savedVoiceName &&
          !distortedVoiceNamePattern.test(voice.name)
      )
    ) {
      setSelectedVoiceName(savedVoiceName);
    } else {
      setSelectedVoiceName(preferredVoice?.name || "");
    }
  }

  function stopAutoPlay() {
    clearAutoTimer();
    stopSequencePlayback();
    setMessage("自动播放已停止");
  }

  function queueNextAutoSentence(
    nextIndex: number,
    playNext: (index: number) => void | Promise<void>
  ) {
    if (nextIndex >= pairs.length) {
      stopSequencePlayback();
      setMessage("自动播放已完成");
      return;
    }

    moveToSentence(nextIndex);
    clearSequenceTimer();
    sequenceTimerRef.current = window.setTimeout(() => {
      void playNext(nextIndex);
    }, Math.max(gapSeconds * 1000, 200));
  }

  async function playSourceClipAtIndex(index: number) {
    const audio = sourceAudioRef.current;
    const pair = pairs[index];

    if (!audio || !pair) {
      stopSequencePlayback();
      return;
    }

    if (
      typeof pair.startTime !== "number" ||
      typeof pair.endTime !== "number" ||
      pair.endTime <= pair.startTime
    ) {
      stopSequencePlayback();
      setMessage("当前句子没有时间戳，无法播放原音频。");
      return;
    }

    stopClipPlayback();
    clipEndTimeRef.current = pair.endTime;
    audio.currentTime = pair.startTime;
    audio.playbackRate = sourcePlaybackRate;

    try {
      await audio.play();
      setIsClipPlaying(true);
      setMessage(isSequencePlayingRef.current ? "正在连续播放原音频" : "正在播放原音频");
    } catch (error) {
      clipEndTimeRef.current = null;
      setIsClipPlaying(false);
      stopSequencePlayback();
      setMessage(error instanceof Error ? error.message : "原音频播放失败");
    }
  }

  async function handlePlaySourceAudio() {
    console.log("[study] handlePlaySourceAudio", {
      lessonId,
      sourceAudioId: lesson?.sourceAudioId ?? null,
      sourceAudioReady: Boolean(sourceAudioUrl),
      startTime:
        typeof currentPair.startTime === "number" ? currentPair.startTime : null,
      endTime: typeof currentPair.endTime === "number" ? currentPair.endTime : null,
    });

    if (!lesson?.sourceAudioId) {
      setMessage("这节课程没有关联原音频，请重新从音频生成并保存课程。");
      return;
    }

    if (!sourceAudioUrl) {
      setMessage(
        isSourceAudioLoading
          ? "原音频加载中..."
          : "找不到原音频，请确认音频没有被删除。"
      );
      return;
    }

    if (!hasValidTimeRange) {
      setMessage("当前句子没有时间戳，无法播放原音频。");
      return;
    }

    const audio = sourceAudioRef.current;
    if (!audio) {
      setMessage("原音频播放器不可用");
      return;
    }

    stopSequencePlayback();
    await playSourceClipAtIndex(currentIndex);
  }

  function handleSourceClipComplete() {
    clipEndTimeRef.current = null;
    setIsClipPlaying(false);

    if (!autoPlayRef.current || !isSequencePlayingRef.current) return;

    const nextIndex = currentIndexRef.current + 1;
    queueNextAutoSentence(nextIndex, (index) => {
      void playSourceClipAtIndex(index);
    });
  }

  async function playAutoSentenceAtIndex(index: number) {
    const pair = pairs[index];
    if (!pair) {
      stopSequencePlayback();
      return;
    }

    const canPlayIndexedSourceAudio =
      Boolean(lesson?.sourceAudioId) &&
      Boolean(sourceAudioUrl) &&
      typeof pair.startTime === "number" &&
      typeof pair.endTime === "number" &&
      pair.endTime > pair.startTime;

    if (canPlayIndexedSourceAudio) {
      setMessage("自动播放中");
      await playSourceClipAtIndex(index);
      return;
    }

    setIsClipPlaying(false);
    setMessage("自动播放中");
    speakEnglish(pair.english || "", 1, () => {
      if (!autoPlayRef.current || !isSequencePlayingRef.current) return;
      const nextIndex = index + 1;
      queueNextAutoSentence(nextIndex, (targetIndex) => {
        void playAutoSentenceAtIndex(targetIndex);
      });
    });
  }

  async function startAutoPlay() {
    if (pairs.length === 0) {
      setMessage("这节课程没有内容");
      return;
    }

    autoPlayRef.current = true;
    setIsAutoPlaying(true);
    isSequencePlayingRef.current = true;
    setIsSequencePlaying(true);
    clearSequenceTimer();
    setShowEnglish(false);
    setMessage("自动播放开始");
    await playAutoSentenceAtIndex(currentIndexRef.current);
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const title = localStorage.getItem("currentLessonTitle");
      if (title) {
        setLessonTitle(title);
      }
    }
  }, []);

  useEffect(() => {
    if (lessonId) loadLesson();
  }, [lessonId, loadLesson]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountSubscription() {
      try {
        const response = await fetch(createAccountSubscriptionUrl(), {
          cache: "no-store",
        });

        if (response.status === 401) {
          if (!cancelled) {
            setAccountAccessKind("guest");
          }
          return;
        }

        if (!response.ok) {
          if (!cancelled) {
            setAccountAccessKind("signed-in");
          }
          return;
        }

        const data = (await response.json()) as AccountSubscriptionResponse;

        if (cancelled) return;

        setAccountAccessKind("signed-in");
        const nextSubscriptionStatus = normalizeSubscriptionStatus(
          data.subscriptionStatus,
          data.cancelAtPeriodEnd
        );

        setAccountSubscriptionStatus(nextSubscriptionStatus);
        if (hasProAccess(nextSubscriptionStatus)) {
          setShowFreePracticeLimitModal(false);
        }
      } catch {
        if (!cancelled) {
          setAccountAccessKind("signed-in");
        }
      }
    }

    void loadAccountSubscription();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSourceAudio() {
      stopClipPlayback(true);

      if (sourceAudioObjectUrlRef.current) {
        URL.revokeObjectURL(sourceAudioObjectUrlRef.current);
        sourceAudioObjectUrlRef.current = null;
      }

      if (!lesson?.sourceAudioId) {
        console.log("[study] loadSourceAudio:missing-sourceAudioId", {
          lessonId,
        });
        setSourceAudioUrl(null);
        setIsSourceAudioLoading(false);
        return;
      }

      try {
        setIsSourceAudioLoading(true);
        console.log("[study] loadSourceAudio:start", {
          lessonId,
          sourceAudioId: lesson.sourceAudioId,
        });
        const blob = await getAudioBlobById(lesson.sourceAudioId);
        if (cancelled) return;

        if (!blob) {
          console.log("[study] loadSourceAudio:blob-missing", {
            lessonId,
            sourceAudioId: lesson.sourceAudioId,
          });
          setSourceAudioUrl(null);
          setMessage("找不到原音频，请确认音频没有被删除。");
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        console.log("[study] loadSourceAudio:blob-ready", {
          lessonId,
          sourceAudioId: lesson.sourceAudioId,
          objectUrlCreated: true,
        });
        sourceAudioObjectUrlRef.current = objectUrl;
        setSourceAudioUrl(objectUrl);
      } catch (error) {
        if (cancelled) return;
        console.log("[study] loadSourceAudio:error", {
          lessonId,
          sourceAudioId: lesson.sourceAudioId,
          error: error instanceof Error ? error.message : String(error),
        });
        setSourceAudioUrl(null);
        setMessage(error instanceof Error ? error.message : "读取原音频失败");
      } finally {
        if (!cancelled) {
          setIsSourceAudioLoading(false);
        }
      }
    }

    void loadSourceAudio();

    return () => {
      cancelled = true;
    };
  }, [lesson?.sourceAudioId, lessonId]);

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      clearAutoTimer();
      isSequencePlayingRef.current = false;
      clearSequenceTimer();
      clearSpeechSilenceTimer();
      recognitionRef.current?.abort?.();
      stopClipPlayback();
      if (sourceAudioObjectUrlRef.current) {
        URL.revokeObjectURL(sourceAudioObjectUrlRef.current);
        sourceAudioObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedVoiceName) {
      localStorage.setItem(voiceKey, selectedVoiceName);
    }
  }, [selectedVoiceName]);

  useEffect(() => {
    const savedPrep = localStorage.getItem(prepKey);
    const savedGap = localStorage.getItem(gapKey);

    if (savedPrep) {
      const n = Number(savedPrep);
      if (!Number.isNaN(n) && n >= 0 && n <= 10) setPrepSeconds(n);
    }

    if (savedGap) {
      const n = Number(savedGap);
      if (!Number.isNaN(n) && n >= 0 && n <= 10) setGapSeconds(n);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(prepKey, String(prepSeconds));
  }, [prepSeconds]);

  useEffect(() => {
    localStorage.setItem(gapKey, String(gapSeconds));
  }, [gapSeconds]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    isSequencePlayingRef.current = isSequencePlaying;
  }, [isSequencePlaying]);

  useEffect(() => {
    const audio = sourceAudioRef.current;
    if (!audio) return;
    audio.playbackRate = sourcePlaybackRate;
  }, [sourcePlaybackRate, sourceAudioUrl]);

  const currentPair = useMemo(() => {
    return pairs[currentIndex] || { chinese: "", english: "" };
  }, [pairs, currentIndex]);
  const prebuiltClassicExpressionSet = useMemo(
    () => getPrebuiltClassicExpressionSet(lessonId, currentIndex),
    [currentIndex, lessonId]
  );
  const isSourcePlaybackActive = isClipPlaying || isAutoPlaying;
  const hasSourceAudioId = Boolean(lesson?.sourceAudioId);
  const hasValidTimeRange =
    typeof currentPair.startTime === "number" &&
    typeof currentPair.endTime === "number" &&
    currentPair.endTime > currentPair.startTime;
  const canPlaySourceAudio =
    hasSourceAudioId &&
    Boolean(sourceAudioUrl) &&
    hasValidTimeRange;

  useEffect(() => {
    console.log("[study] currentSentence", {
      lessonId,
      sourceAudioId: lesson?.sourceAudioId ?? null,
      startTime:
        typeof currentPair.startTime === "number" ? currentPair.startTime : null,
      endTime: typeof currentPair.endTime === "number" ? currentPair.endTime : null,
    });
  }, [
    currentPair.endTime,
    currentPair.startTime,
    lesson?.sourceAudioId,
    lessonId,
  ]);

  useEffect(() => {
    if (!spokenEnglish || isListening) return;

    let cancelled = false;
    const fallbackVariants = createFallbackExpressionVariants(
      currentPair.english || ""
    );
    const prebuiltVariants = prebuiltClassicExpressionSet?.variants || [];

    setExpressionVariants(
      prebuiltVariants.length ? prebuiltVariants : fallbackVariants
    );
    setSelectedExpressionIndex(0);
    setIsLoadingExpressionVariants(false);

    if (prebuiltVariants.length) {
      return () => {
        cancelled = true;
      };
    }

    async function loadExpressionVariants() {
      try {
        const response = await fetch("/api/expression-variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chinese: currentPair.chinese,
            userEnglish: "",
            standardEnglish: currentPair.english,
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
              : fallbackVariants.find((variant) => variant.key === key)?.text ||
                currentPair.english ||
                "",
        }));

        setExpressionVariants(nextVariants);
      } catch {
        if (!cancelled) {
          setExpressionVariants(fallbackVariants);
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
    currentPair.chinese,
    currentPair.english,
    isListening,
    prebuiltClassicExpressionSet,
    spokenEnglish,
  ]);

  function handleBackToPreviousPage() {
    stopAutoPlay();

    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      window.location.assign("/menu");
      return;
    }

    router.replace("/menu");
  }

  function handleClassicHomeClick() {
    stopAutoPlay();

    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      window.location.assign("/start");
      return;
    }

    router.replace("/start");
  }

  function openRenameCourseDialog() {
    setRenameCourseTitle(getDisplayCourseFileName(courseTitle));
    setShowCourseFileMenu(false);
    setShowRenameCourseDialog(true);
  }

  function closeRenameCourseDialog() {
    setShowRenameCourseDialog(false);
    setRenameCourseTitle("");
  }

  function renameCurrentCourse() {
    if (!isMyCourseLesson || !lesson) return;

    const nextTitle = getStoredCourseTitle(renameCourseTitle);
    const { lessons, payload } = readLessonsStorage();
    const nextLessons = lessons.map((item) =>
      item.id === lessonId ? { ...item, title: nextTitle } : item
    );

    writeLessonsStorage(payload, nextLessons);
    window.localStorage.setItem("currentLessonTitle", nextTitle);
    setLesson((current) =>
      current && current.id === lessonId ? { ...current, title: nextTitle } : current
    );
    setLocalLessonSequence(nextLessons);
    setLessonTitle(nextTitle);
    closeRenameCourseDialog();
  }

  function handleRenameCourseKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      renameCurrentCourse();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeRenameCourseDialog();
    }
  }

  function deleteCurrentCourseFile() {
    if (!isMyCourseLesson || !lesson) return;

    const fileName = getDisplayCourseFileName(courseTitle);
    const confirmed = window.confirm(`删除文件“${fileName}”？`);
    if (!confirmed) return;

    stopSequencePlayback(true);
    const { lessons, payload } = readLessonsStorage();
    const nextLessons = lessons.filter((item) => item.id !== lessonId);
    writeLessonsStorage(payload, nextLessons);

    localStorage.removeItem(progressKey);
    localStorage.removeItem(`speakflow-free-practice-usage:course:${lessonId}`);

    if (localStorage.getItem("currentLessonTitle") === lessonTitle) {
      localStorage.removeItem("currentLessonTitle");
    }

    try {
      const rawProgress = localStorage.getItem(LAST_STUDY_PROGRESS_KEY);
      const progress = rawProgress ? JSON.parse(rawProgress) : null;
      if (progress?.courseId === lessonId) {
        localStorage.removeItem(LAST_STUDY_PROGRESS_KEY);
      }
    } catch {
      localStorage.removeItem(LAST_STUDY_PROGRESS_KEY);
    }

    if (lesson.sourceAudioId) {
      void deleteAudioById(lesson.sourceAudioId);
    }

    setShowCourseFileMenu(false);
    router.replace("/menu");
  }

  function handleSaveCurrentPosition() {
    saveProgress(currentIndex);
    setMessage("当前位置已保存");
  }

  function showFreePracticeLimit() {
    stopSequencePlayback();
    refreshFreePracticeUsageCount();
    setShowFreePracticeLimitModal(true);
  }

  function openProFromFreePracticeLimit() {
    setShowFreePracticeLimitModal(false);
    stopSequencePlayback();
    router.push(createLoginUrl(subscriptionCallbackUrl));
  }

  function openLoginFromFreePracticeLimit() {
    setShowFreePracticeLimitModal(false);
    stopSequencePlayback();
    router.push(createLoginUrl(subscriptionCallbackUrl));
  }

  function openRegisterFromFreePracticeLimit() {
    setShowFreePracticeLimitModal(false);
    stopSequencePlayback();
    router.push("/register");
  }

  function getSentenceCompletionId(index = currentIndex) {
    return `study:${lessonId}:${index}`;
  }

  async function ensureFreePracticeAvailable(index = currentIndex) {
    const completionId = getSentenceCompletionId(index);

    if (hasFreePracticeCompletion(freePracticeScope, completionId)) return true;
    if (!isFreePracticeLimitReached(freePracticeScope)) return true;

    try {
      const response = await fetch(createAccountSubscriptionUrl(), {
        cache: "no-store",
      });

      if (response.status === 401) {
        setAccountAccessKind("guest");
      }

      if (response.ok) {
        const data = (await response.json()) as AccountSubscriptionResponse;
        const nextSubscriptionStatus = normalizeSubscriptionStatus(
          data.subscriptionStatus,
          data.cancelAtPeriodEnd
        );

        setAccountAccessKind("signed-in");
        setAccountSubscriptionStatus(nextSubscriptionStatus);

        if (hasProAccess(nextSubscriptionStatus)) {
          setShowFreePracticeLimitModal(false);
          return true;
        }
      }
    } catch {
      // Keep the existing free-user behavior if the subscription check fails.
    }

    showFreePracticeLimit();
    return false;
  }

  function markCurrentSentenceCompleted(index = currentIndex) {
    if (isAccountPro) return;

    const result = recordFreePracticeCompletion(
      freePracticeScope,
      getSentenceCompletionId(index)
    );
    setFreePracticeUsageCount(result.count);
  }

  function getRecognitionConstructor() {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function stopEnglishRecognition() {
    clearSpeechSilenceTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  function handleEnglishPracticeAction() {
    if (isListening) {
      stopEnglishRecognition();
      return;
    }

    void startEnglishRecognition();
  }

  async function startEnglishRecognition() {
    if (!(await ensureFreePracticeAvailable())) return;

    const RecognitionConstructor = getRecognitionConstructor();
    if (!RecognitionConstructor) {
      setMessage("当前浏览器不支持语音识别");
      return;
    }

    stopSequencePlayback();
    recognitionRef.current?.abort?.();
    clearSpeechSilenceTimer();
    speechBufferRef.current = "";
    setLiveTranscript("");
    setShowEnglish(false);
    setMessage("");
    const practiceIndex = currentIndex;

    const recognition = new RecognitionConstructor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcripts = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .filter(Boolean);
      const transcript = transcripts.join(" ").trim();

      setLiveTranscript(transcript);
      speechBufferRef.current = transcript;
      clearSpeechSilenceTimer();
      speechSilenceTimerRef.current = window.setTimeout(() => {
        stopEnglishRecognition();
      }, 1300);
    };

    recognition.onerror = () => {
      clearSpeechSilenceTimer();
      setIsListening(false);
      setLiveTranscript("");
      setMessage("没有听清，请再试一次");
    };

    recognition.onend = () => {
      clearSpeechSilenceTimer();
      const finalTranscript = speechBufferRef.current.trim();
      if (finalTranscript) {
        setSpokenEnglish(finalTranscript);
        markCurrentSentenceCompleted(practiceIndex);
      }
      setLiveTranscript("");
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }

  const spokenDisplay = (isListening && liveTranscript ? liveTranscript : spokenEnglish).trim();
  const courseTitle = lessonTitle || lesson?.title || "未命名课程";
  const lessonSequence = useMemo(() => {
    if (lessonId.startsWith("my-course-")) {
      return localLessonSequence.filter((record) => record.id === lessonId);
    }

    const classicSectionLessonSequence = getClassicSectionLessonSequence(lessonId);
    if (classicSectionLessonSequence) {
      return classicSectionLessonSequence;
    }

    if (localLessonSequence.some((record) => record.id === lessonId)) {
      return localLessonSequence;
    }

    if (lessonId.startsWith("government_")) {
      return featuredLessonRecords.filter((record) =>
        record.id.startsWith("government_")
      );
    }

    if (lessonId.startsWith("driver_")) {
      return featuredLessonRecords.filter((record) =>
        record.id.startsWith("driver_")
      );
    }

    if (lessonId.startsWith("bank_")) {
      return featuredLessonRecords.filter((record) =>
        record.id.startsWith("bank_")
      );
    }

    return featuredLessonRecords;
  }, [lessonId, localLessonSequence]);
  const lessonSequenceIndex = lessonSequence.findIndex(
    (record) => record.id === lessonId
  );
  const disableGuestClassicNeighborLessons =
    accountAccessKind === "guest" && isClassicSceneLessonId(lessonId);
  const previousLesson =
    !disableGuestClassicNeighborLessons && lessonSequenceIndex > 0
      ? lessonSequence[lessonSequenceIndex - 1]
      : null;
  const nextLesson =
    !disableGuestClassicNeighborLessons &&
    lessonSequenceIndex >= 0 &&
    lessonSequenceIndex < lessonSequence.length - 1
      ? lessonSequence[lessonSequenceIndex + 1]
      : null;
  const sentenceProgressText = hasLoadedLesson
    ? `第 ${pairs.length ? currentIndex + 1 : 0} / ${pairs.length} 句`
    : "";
  const sentenceProgressPercent =
    hasLoadedLesson && pairs.length
      ? Math.min(
          100,
          Math.max(1, Math.round(((currentIndex + 1) / pairs.length) * 100))
        )
      : 0;
  const sentenceProgressStyle = {
    "--classic-progress": `${sentenceProgressPercent}%`,
  } as CSSProperties;
  const classicStudyNavigation = useMemo(
    () => getClassicStudyNavigation(lessonId),
    [lessonId]
  );
  const classicSceneRoleConfig = useMemo(
    () =>
      getClassicLessonRoleConfig(lessonId, {
        roleIcon: lesson?.roleIcon,
        roleLabel: lesson?.roleLabel,
      }),
    [lesson?.roleIcon, lesson?.roleLabel, lessonId]
  );
  const showStudyPrompt = hasLoadedLesson && !spokenDisplay && !showEnglish;
  const showStudyListeningPrompt = hasLoadedLesson && isListening;
  const showStudyVoiceOnlyPrompt = showStudyPrompt || showStudyListeningPrompt;
  const showExpressionFeedback = Boolean(spokenDisplay) && !showStudyListeningPrompt;
  const expressionVariantsForDisplay = expressionVariants.length
    ? expressionVariants
    : createFallbackExpressionVariants(currentPair.english || "");
  const selectedExpression =
    expressionVariantsForDisplay[
      Math.min(selectedExpressionIndex, expressionVariantsForDisplay.length - 1)
    ] || expressionVariantsForDisplay[0];

  useEffect(() => {
    const sentence = selectedExpression.text?.trim();
    if (!sentence || isLoadingExpressionVariants) {
      setHighlightedExpressions([]);
      return;
    }

    const prebuiltHighlights =
      prebuiltClassicExpressionSet?.highlights?.[selectedExpression.key] || [];

    if (prebuiltClassicExpressionSet) {
      setHighlightedExpressions(
        prebuiltHighlights.length
          ? prebuiltHighlights
          : createFallbackHighlightedExpressions(sentence)
      );
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
    isLoadingExpressionVariants,
    prebuiltClassicExpressionSet,
    selectedExpression.key,
    selectedExpression.text,
  ]);

  function getHighlightsForClassicText(
    text: string,
    variantKey?: ExpressionVariantKey
  ) {
    const sentence = text.trim();
    if (!sentence) return [] as HighlightedExpression[];

    const selectedText = selectedExpression.text?.trim();
    if (selectedText === sentence && highlightedExpressions.length > 0) {
      return highlightedExpressions;
    }

    const prebuiltHighlights =
      variantKey && prebuiltClassicExpressionSet?.highlights?.[variantKey];

    if (prebuiltHighlights?.length) {
      return prebuiltHighlights;
    }

    return createFallbackHighlightedExpressions(sentence);
  }

  function renderClassicWordTokens(
    text: string,
    sourceSentence: string,
    keyPrefix: string,
    className = styles.highlightedWordToken
  ) {
    return tokenizeEnglishSentence(text).map((token, tokenIndex) =>
      token.type === "word" && token.normalized ? (
        <button
          key={`${keyPrefix}-${token.value}-${tokenIndex}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleWordClick(token.value, sourceSentence);
          }}
          className={className}
        >
          {token.value}
        </button>
      ) : (
        <span key={`${keyPrefix}-${token.value}-${tokenIndex}`}>
          {token.value}
        </span>
      )
    );
  }

  function renderClassicHighlightedText(
    text: string,
    variantKey?: ExpressionVariantKey
  ) {
    const segments = splitSentenceByHighlightedExpressions(
      text,
      getHighlightsForClassicText(text, variantKey)
    );

    return segments.map((segment, index) =>
      segment.type === "expression" ? (
        <span
          key={`${segment.value}-${index}`}
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            handleExpressionClick(segment.expression, text);
          }}
          onKeyDown={(event) => {
            if (
              event.target === event.currentTarget &&
              (event.key === "Enter" || event.key === " ")
            ) {
              event.preventDefault();
              event.stopPropagation();
              handleExpressionClick(segment.expression, text);
            }
          }}
          className={styles.highlightedExpressionToken}
          aria-label={`收藏表达 ${segment.value}`}
        >
          {renderClassicWordTokens(
            segment.value,
            text,
            `classic-expression-${index}`
          )}
        </span>
      ) : (
        <span key={`${segment.value}-${index}`}>
          {renderClassicWordTokens(
            segment.value,
            text,
            `classic-text-${index}`
          )}
        </span>
      )
    );
  }

  function openNeighborLesson(targetLesson: { id: string; title: string }) {
    stopAutoPlay();
    window.localStorage.setItem("currentLessonTitle", targetLesson.title);
    router.replace(`/study/${targetLesson.id}`);
  }

  if (showStudyVoiceOnlyPrompt) {
    const displayedChinese = currentPair.chinese || "没有内容";

    return (
      <main className={styles.classicShell}>
        <section
          className={`${styles.classicPhone} ${styles.studyPhone}`}
          aria-labelledby="classic-study-title"
        >
          <header className={`${styles.classicTopbar} ${styles.studyTopbar}`}>
            <button
              type="button"
              aria-label="回到学习首页"
              className={styles.homeShortcut}
              onClick={handleClassicHomeClick}
            >
              <span className={styles.homeIconBox}>
                <HomeMenuIcon label={null} showHint={false} />
                <span className={styles.homeShortcutText}>学习首页</span>
              </span>
            </button>

            <div className={styles.brand} aria-label="SpeakFlow Voice Practice">
              <span className={styles.brandIcon}>
                <BrandBubbleIcon />
              </span>
              <span className={styles.brandCopy}>
                <span className={styles.brandTitle}>SpeakFlow</span>
                <span className={styles.brandSubtitle}>VOICE PRACTICE</span>
              </span>
            </div>

            <button
              type="button"
              aria-label="切换课程"
              className={styles.switchCourseButton}
              onClick={() => router.push(classicStudyNavigation.courseMenuHref)}
            >
              <span>切换课程</span>
            </button>
          </header>

          <section className={`${styles.topicBar} ${styles.studyTopicBar}`} aria-label="当前话题">
            <span className={styles.topicIcon}>
              <TopicIcon lessonId={lessonId} title={courseTitle} />
            </span>

            <div className={styles.topicCopy}>
              <button
                type="button"
                className={styles.categoryPill}
                onClick={() => router.push(classicStudyNavigation.categoryHref)}
              >
                {classicStudyNavigation.categoryLabel}
              </button>
              <div className={styles.topicTitleRow}>
                <button
                  type="button"
                  className={styles.lessonArrowButton}
                  onClick={() => {
                    if (previousLesson) {
                      openNeighborLesson(previousLesson);
                    }
                  }}
                  disabled={!previousLesson}
                  aria-label={
                    previousLesson
                      ? `上一课：${previousLesson.title}`
                      : "已经是同级第一课"
                  }
                >
                  <ArrowLeftIcon />
                </button>
                <h1 id="classic-study-title" className={styles.topicTitle}>
                  {courseTitle}
                </h1>
                <button
                  type="button"
                  className={styles.lessonArrowButton}
                  onClick={() => {
                    if (nextLesson) {
                      openNeighborLesson(nextLesson);
                    }
                  }}
                  disabled={!nextLesson}
                  aria-label={
                    nextLesson
                      ? `下一课：${nextLesson.title}`
                      : "已经是同级最后一课"
                  }
                >
                  <ArrowRightIcon />
                </button>
              </div>
              <p className={styles.topicProgress}>{sentenceProgressText}</p>
              <div className={styles.progressRow} style={sentenceProgressStyle}>
                <span className={styles.progressTrack} aria-hidden="true">
                  <span />
                </span>
                <span className={styles.progressPercent}>
                  {sentenceProgressPercent}% 完成
                </span>
              </div>
            </div>
          </section>

          <section className={styles.dialogCard} aria-label="中文提示">
            <div className={styles.speakerLine}>
              <span className={styles.speakerAvatar}>
                <ClassicRoleAvatarIcon roleIcon={classicSceneRoleConfig.roleIcon} />
              </span>
              <span className={styles.roleBadge}>
                {classicSceneRoleConfig.roleLabel}
              </span>
            </div>

            <div className={styles.speechBubble}>
              <span aria-hidden="true" className={styles.quoteStart}>
                “
              </span>
              <p className={styles.chinesePrompt}>{displayedChinese}</p>
              <p className={styles.bubbleSubtitle}>
                {isListening
                  ? "正在录制您说的英文"
                  : "（ 看着中文，尝试说出英文 ）"}
              </p>
              <span aria-hidden="true" className={styles.quoteEnd}>
                ”
              </span>
            </div>

            <div className={styles.sceneIllustration} aria-hidden="true">
              <span className={styles.bankCounter} />
              <span className={styles.bankSign}>BANK</span>
              <span className={styles.bankPlant} />
              <span className={styles.bankChairOne} />
              <span className={styles.bankChairTwo} />
            </div>

            <button
              type="button"
              className={styles.promptHint}
              onClick={handleEnglishPracticeAction}
            >
              看着中文，尝试说出英文
            </button>
          </section>

          <section className={styles.methodCard} aria-label="练习方法">
            <div className={styles.methodTitle}>
              <span />
              <strong>练习方法</strong>
              <span />
            </div>
            <div className={styles.methodSteps}>
              <div className={styles.methodStep}>
                <span className={styles.methodIcon}>
                  <BookMethodIcon />
                </span>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepCopy}>
                  <strong>看中文</strong>
                  <small>理解场景意思</small>
                </span>
              </div>
              <span className={styles.methodArrow}>→</span>
              <div className={styles.methodStep}>
                <span className={styles.methodIcon}>
                  <MicMethodIcon />
                </span>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepCopy}>
                  <strong>说英文</strong>
                  <small>尝试表达出来</small>
                </span>
              </div>
              <span className={styles.methodArrow}>→</span>
              <div className={styles.methodStep}>
                <span className={styles.methodIcon}>
                  <StarMethodIcon />
                </span>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepCopy}>
                  <strong>学地道表达</strong>
                  <small>查看更自然的说法</small>
                </span>
              </div>
            </div>
          </section>

          <section className={styles.practiceControls} aria-label="句子练习控制">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={styles.sentenceButton}
              aria-label="上一句"
            >
              <ArrowLeftIcon />
              <span>上一句</span>
            </button>

            <button
              type="button"
              onClick={handleEnglishPracticeAction}
              className={`${styles.micButton} ${isListening ? styles.micButtonActive : ""}`}
              aria-label={isListening ? "停止录音" : "点击麦克风开始练习"}
            >
              <span className={styles.micPulseOne} />
              <span className={styles.micPulseTwo} />
              <BigMicIcon />
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= pairs.length - 1}
              className={styles.sentenceButton}
              aria-label="下一句"
            >
              <span>下一句</span>
              <ArrowRightIcon />
            </button>
          </section>

          <p className={styles.micHint}>
            {isListening
              ? "再次点击麦克风结束录音"
              : message || "点击麦克风开始练习"}
          </p>

          <aside className={styles.tipCard} aria-label="小贴士">
            <span className={styles.tipIcon}>i</span>
            <span className={styles.tipCopy}>
              <strong>小贴士</strong>
              <small>系统会在下一页显示你的录音和参考表达，帮助你说得更地道！</small>
            </span>
            <span className={styles.tipArt} aria-hidden="true">
              <span />
            </span>
          </aside>
        </section>

        {showFreePracticeLimitModal ? (
          <FreePracticeLimitModal
            isSignedIn={accountAccessKind === "signed-in"}
            onDismiss={() => setShowFreePracticeLimitModal(false)}
            onLogin={openLoginFromFreePracticeLimit}
            onRegister={openRegisterFromFreePracticeLimit}
            onUnlockPro={openProFromFreePracticeLimit}
          />
        ) : null}
      </main>
    );
  }

  if (showExpressionFeedback) {
    const resultVariants = expressionVariantsForDisplay.slice(0, 4);
    const selectedReadText =
      selectedExpression?.text || resultVariants[0]?.text || currentPair.english || "";

    return (
      <main className={styles.classicShell}>
        <section
          className={`${styles.classicPhone} ${styles.resultPhone} ${styles.studyPhone}`}
          aria-labelledby="classic-result-title"
        >
          <header className={`${styles.classicTopbar} ${styles.studyTopbar}`}>
            <button
              type="button"
              aria-label="回到学习首页"
              className={styles.homeShortcut}
              onClick={handleClassicHomeClick}
            >
              <span className={styles.homeIconBox}>
                <HomeMenuIcon label={null} showHint={false} />
                <span className={styles.homeShortcutText}>学习首页</span>
              </span>
            </button>

            <div className={styles.brand} aria-label="SpeakFlow Voice Practice">
              <span className={styles.brandIcon}>
                <BrandBubbleIcon />
              </span>
              <span className={styles.brandCopy}>
                <span className={styles.brandTitle}>SpeakFlow</span>
                <span className={styles.brandSubtitle}>VOICE PRACTICE</span>
              </span>
            </div>

            <button
              type="button"
              aria-label="切换课程"
              className={styles.switchCourseButton}
              onClick={() => router.push(classicStudyNavigation.courseMenuHref)}
            >
              <span>切换课程</span>
            </button>
          </header>

          <section className={`${styles.topicBar} ${styles.studyTopicBar}`} aria-label="当前话题">
            <span className={styles.topicIcon}>
              <TopicIcon lessonId={lessonId} title={courseTitle} />
            </span>

            <div className={styles.topicCopy}>
              <button
                type="button"
                className={styles.categoryPill}
                onClick={() => router.push(classicStudyNavigation.categoryHref)}
              >
                {classicStudyNavigation.categoryLabel}
              </button>
              <div className={styles.topicTitleRow}>
                <button
                  type="button"
                  className={styles.lessonArrowButton}
                  onClick={() => {
                    if (previousLesson) {
                      openNeighborLesson(previousLesson);
                    }
                  }}
                  disabled={!previousLesson}
                  aria-label={
                    previousLesson
                      ? `上一课：${previousLesson.title}`
                      : "已经是同级第一课"
                  }
                >
                  <ArrowLeftIcon />
                </button>
                <h1 id="classic-result-title" className={styles.topicTitle}>
                  {courseTitle}
                </h1>
                <button
                  type="button"
                  className={styles.lessonArrowButton}
                  onClick={() => {
                    if (nextLesson) {
                      openNeighborLesson(nextLesson);
                    }
                  }}
                  disabled={!nextLesson}
                  aria-label={
                    nextLesson
                      ? `下一课：${nextLesson.title}`
                      : "已经是同级最后一课"
                  }
                >
                  <ArrowRightIcon />
                </button>
              </div>
              <p className={styles.topicProgress}>{sentenceProgressText}</p>
              <div className={styles.progressRow} style={sentenceProgressStyle}>
                <span className={styles.progressTrack} aria-hidden="true">
                  <span />
                </span>
                <span className={styles.progressPercent}>
                  {sentenceProgressPercent}% 完成
                </span>
              </div>
            </div>
          </section>

          <p className={styles.resultHint}>
            <span aria-hidden="true" className={styles.resultHintIcon}>
              i
            </span>
            学习不同表达方式，找到最适合你的说法
          </p>

          <div className={styles.resultScrollArea}>
            <section className={styles.resultExpressionPanel} aria-label="表达对比">
              <section className={styles.userExpressionCard} aria-label="你的表达">
                <div className={styles.userExpressionLabel}>
                  <span className={styles.userExpressionIcon}>
                    <UserResultIcon />
                  </span>
                  <strong>你的表达</strong>
                </div>
                <div className={styles.userExpressionBubble}>
                  <p className={styles.userExpressionText}>
                    {renderClassicHighlightedText(spokenDisplay)}
                  </p>
                  <button
                    type="button"
                    className={styles.userExpressionSpeaker}
                    aria-label="朗读你的表达"
                    onClick={() => speakEnglish(spokenDisplay, 1)}
                  >
                    <SpeakerIcon />
                  </button>
                </div>
              </section>

              <section className={styles.expressionList} aria-label="推荐表达">
                {isLoadingExpressionVariants ? (
                  <p className={styles.loadingExpressions}>正在生成表达...</p>
                ) : (
                  resultVariants.map((variant, variantIndex) => {
                    const isSelected = selectedExpressionIndex === variantIndex;
                    const isFeatured = variant.key === "standard";
                    const toneClass = getResultVariantToneClass(variant.key);

                    return (
                      <article
                        key={`${variant.key}-${variantIndex}`}
                        className={`${styles.expressionCard} ${toneClass} ${
                          isFeatured ? styles.expressionCardFeatured : ""
                        } ${isSelected ? styles.expressionCardSelected : ""}`}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          className={styles.expressionSelectArea}
                          onClick={() => setSelectedExpressionIndex(variantIndex)}
                          onKeyDown={(event) => {
                            if (
                              event.target === event.currentTarget &&
                              (event.key === "Enter" || event.key === " ")
                            ) {
                              event.preventDefault();
                              setSelectedExpressionIndex(variantIndex);
                            }
                          }}
                          aria-label={`选择${variant.label}`}
                        >
                          <span className={styles.variantRibbon}>
                            <ResultVariantIcon variantKey={variant.key} />
                          </span>
                          <span className={styles.variantCopy}>
                            <span className={styles.variantTitle}>{variant.label}</span>
                            <span className={styles.variantText}>
                              {renderClassicHighlightedText(variant.text, variant.key)}
                            </span>
                            <span className={styles.variantNote}>
                              {getResultVariantNote(variant.key)}
                            </span>
                          </span>
                        </div>

                        <button
                          type="button"
                          className={styles.variantSpeaker}
                          aria-label={`朗读${variant.label}`}
                          onClick={() => readExpressionVariant(variant, variantIndex)}
                        >
                          <SpeakerIcon />
                        </button>

                        {isFeatured ? (
                          <span className={styles.cornerStar} aria-hidden="true">
                            <ResultVariantIcon variantKey="standard" />
                          </span>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </section>
            </section>
          </div>

          <section className={styles.followCard} aria-label="跟读练习">
            <div className={styles.followTop}>
              <button
                type="button"
                className={styles.followReadButton}
                onClick={() => speakEnglish(selectedReadText, 1)}
                aria-label="播放指定句子的朗读"
              >
                <span className={styles.followBookIcon}>
                  <ResultBookIcon />
                </span>
                <span>
                  <strong>跟读练习</strong>
                  <small>听标准发音，跟读练习更地道</small>
                </span>
              </button>

              <button
                type="button"
                className={styles.slowReadButton}
                onClick={() => speakEnglish(selectedReadText, 0.5)}
                aria-label="播放指定句子的慢速朗读"
              >
                <HeadphonesIcon />
                <span>慢速朗读</span>
              </button>
            </div>

            <div className={styles.followControls}>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={styles.sentenceButton}
                aria-label="上一句"
              >
                <ArrowLeftIcon />
                <span>上一句</span>
              </button>

              <div className={styles.followMicWrap}>
                <button
                  type="button"
                  onClick={() => setShowFollowReadModal(true)}
                  className={styles.followMicButton}
                  aria-label="打开跟读录音弹窗"
                >
                  <span className={styles.micPulseOne} />
                  <span className={styles.micPulseTwo} />
                  <BigMicIcon />
                </button>
                <span className={styles.followMicLabel}>跟读录音</span>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= pairs.length - 1}
                className={styles.sentenceButton}
                aria-label="下一句"
              >
                <span>下一句</span>
                <ArrowRightIcon />
              </button>
            </div>
          </section>
        </section>

        {showFollowReadModal ? (
          <div className={styles.followModalBackdrop} role="presentation">
            <section
              className={styles.followModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="follow-read-modal-title"
            >
              <h2 id="follow-read-modal-title">跟读录音</h2>
              <p>弹窗设计稍后接入。这里会放录音、评分和重录操作。</p>
              <button
                type="button"
                className={styles.followModalButton}
                onClick={() => setShowFollowReadModal(false)}
              >
                关闭
              </button>
            </section>
          </div>
        ) : null}

        {showFreePracticeLimitModal ? (
          <FreePracticeLimitModal
            isSignedIn={accountAccessKind === "signed-in"}
            onDismiss={() => setShowFreePracticeLimitModal(false)}
            onLogin={openLoginFromFreePracticeLimit}
            onRegister={openRegisterFromFreePracticeLimit}
            onUnlockPro={openProFromFreePracticeLimit}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main className="responsive-page-shell sf-speak-page min-h-[100dvh] overflow-x-hidden text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[560px] items-center justify-center p-0 sm:p-4">
        <section className="sf-speak-phone sf-study-phone relative flex h-[100dvh] min-h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-none sm:h-[calc(100dvh-16px)] sm:min-h-[720px] sm:rounded-[34px]">
          <div className="pointer-events-none absolute left-1/2 top-[21%] z-0 h-[460px] w-[460px] -translate-x-1/2 rounded-full border border-[#91dcff]/10" />
          <div className="pointer-events-none absolute left-1/2 top-[31%] z-0 h-[310px] w-[310px] -translate-x-1/2 rounded-full border border-[#b799ff]/10" />

          <header className="sf-app-topbar relative z-10 shrink-0 px-7 pt-8">
            <div className="sf-app-topbar-inner flex items-center justify-between">
              <button
                type="button"
                aria-label="返回课程列表"
                onClick={handleBackToPreviousPage}
                className="sf-header-button"
              >
                <span className="relative block h-4 w-5 before:absolute before:left-0 before:top-0 before:h-px before:w-4 before:bg-[#6f6685] after:absolute after:bottom-0 after:left-0 after:h-px after:w-5 after:bg-[#6f6685]">
                  <span className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-[#6f6685]" />
                </span>
              </button>

              <div className="sf-app-brand flex items-center gap-2">
                <SpeakFlowBrandMark />
                <div>
                  <h1 className="text-[1.05rem] font-semibold leading-none text-[#201833]">
                    SpeakFlow
                  </h1>
                  <p className="mt-0.5 text-[0.42rem] font-semibold uppercase tracking-[0.16em] text-[#7ee7ff]/80">
                    voice practice
                  </p>
                </div>
              </div>

              <AccountAvatarButton />
            </div>
          </header>

          <section
            className={`sf-study-main relative z-10 flex min-h-0 flex-1 flex-col px-6 pt-4 ${
              showStudyVoiceOnlyPrompt || showExpressionFeedback
                ? "sf-study-main-has-actions pb-[calc(7.25rem+env(safe-area-inset-bottom))]"
                : "pb-[max(1rem,env(safe-area-inset-bottom))]"
            }`}
          >
            <div className="mx-auto h-px w-32 bg-[linear-gradient(90deg,transparent,rgba(145,220,255,0.46),transparent)]" />
            <div className="sf-study-heading mt-4 shrink-0 text-center">
              <div className="flex items-center justify-center gap-2 text-[1.18rem] font-extrabold text-[#8b849d]">
                {previousLesson ? (
                  <button
                    type="button"
                    onClick={() => openNeighborLesson(previousLesson)}
                    className="grid h-8 w-8 place-items-center rounded-full text-[1.35rem] text-[#8b849d] transition hover:bg-white/35"
                    aria-label="上一课"
                  >
                    ←
                  </button>
                ) : null}
                <span className="max-w-[260px] truncate">{courseTitle}</span>
                {nextLesson ? (
                  <button
                    type="button"
                    onClick={() => openNeighborLesson(nextLesson)}
                    className="grid h-8 w-8 place-items-center rounded-full text-[1.35rem] text-[#8b849d] transition hover:bg-white/35"
                    aria-label="下一课"
                  >
                    →
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[1rem] font-extrabold text-[#9a93a9]">
                {sentenceProgressText}
              </p>
              <FreeUsageMeter
                className="mt-3"
                isPro={isAccountPro}
                limit={FREE_PRACTICE_DAILY_LIMIT}
                used={freePracticeUsageCount}
              />
            </div>

            <div
              className={`sf-study-content flex min-h-0 flex-1 flex-col items-center overflow-y-auto text-center ${
                showStudyVoiceOnlyPrompt
                  ? "sf-study-content-with-actions sf-study-content-voice justify-start pb-6 pt-10"
                  : showExpressionFeedback
                    ? "sf-study-content-with-actions sf-study-content-feedback sf-study-content-expression-list justify-start py-5"
                    : "justify-start py-5"
              }`}
            >
              {!hasLoadedLesson ? null : showStudyListeningPrompt || showStudyPrompt ? (
                <>
                  <div className="w-full max-w-[430px] bg-white/10 px-5 py-5 text-left">
                    <h2 className="text-[1.75rem] font-extrabold leading-[1.5] text-[#201833]">
                      {currentPair.chinese || "没有内容"}
                    </h2>
                    <p className="mt-5 text-[1rem] font-extrabold leading-[1.5] text-[#4b4267]">
                      试着用英语说出来
                    </p>
                  </div>
                  {showStudyListeningPrompt ? (
                    <div className="mt-7 w-full max-w-[340px] bg-white/10 px-5 py-5 text-center">
                      <h2 className="text-[1.45rem] font-extrabold leading-[1.5] text-[#201833]">
                        正在听你说话...
                      </h2>
                      <p className="mt-4 text-[0.92rem] font-semibold leading-[1.5] text-[#201833]">
                        试着用英语说出来
                      </p>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="w-full max-w-[430px] text-left">
                    <p className="text-[1.05rem] font-extrabold leading-[1.5] text-[#7f7896]">
                      你的表达:
                    </p>
                    <p className="mt-5 rounded-[18px] bg-white/10 px-5 py-4 text-[1.15rem] font-bold leading-[1.5] text-[#8f879c]">
                      {spokenDisplay}
                    </p>
                  </div>

                  <div className="mt-6 w-full max-w-[430px] text-left">
                    {isLoadingExpressionVariants ? (
                      <p className="text-[1.2rem] font-extrabold leading-8 text-[#4f6fe8]">
                        正在生成表达...
                      </p>
                    ) : (
                      <div className="grid gap-8">
                        {expressionVariantsForDisplay.map(
                          (variant, variantIndex) => {
                            const isSelected =
                              selectedExpressionIndex === variantIndex;
                            const segments =
                              splitSentenceByHighlightedExpressions(
                                variant.text || "",
                                isSelected
                                  ? highlightedExpressions
                                  : createFallbackHighlightedExpressions(
                                      variant.text || ""
                                    )
                              );

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
                                    className={`text-[1.2rem] font-extrabold leading-[1.5] transition ${
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
                                <p className="sf-study-expression-text mt-3 text-left text-[clamp(1.55rem,7vw,1.85rem)] font-extrabold leading-[1.5] text-[#201833]">
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
                          }
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {message ? (
                <p className="mt-4 max-w-[360px] rounded-full bg-white/50 px-4 py-2 text-[0.78rem] font-semibold text-[#6f6685]">
                  {message}
                </p>
              ) : null}
            </div>

          </section>

          {showStudyVoiceOnlyPrompt || showExpressionFeedback ? (
            <div
              className={`sf-study-actions absolute inset-x-0 bottom-0 z-20 grid min-h-[5.35rem] items-center gap-1 border-t border-[#cfc4ff]/72 bg-[linear-gradient(180deg,rgba(228,220,255,0.78),rgba(215,207,252,0.94))] px-3 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-10px_24px_rgba(100,82,180,0.08),inset_0_1px_0_rgba(255,255,255,0.52)] backdrop-blur-xl ${
                showExpressionFeedback
                  ? "sf-study-actions-feedback grid-cols-[1fr_1fr_auto_1fr_1fr]"
                  : "sf-study-actions-voice grid-cols-[1fr_auto_1fr] px-8"
              }`}
            >
              {showExpressionFeedback ? (
                <button
                  type="button"
                  aria-label="播放朗读"
                  onClick={() => speakEnglish(selectedExpression.text, 1)}
                  className="sf-study-action-text sf-study-read-button ml-auto flex h-10 min-w-[2.9rem] items-center justify-center rounded-[15px] px-1 text-[0.82rem] font-extrabold text-[#201833] transition hover:bg-white/30"
                >
                  朗读
                </button>
              ) : null}
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="sf-study-action-text ml-auto flex h-11 min-w-[3.6rem] items-center justify-center rounded-[15px] px-1 text-[0.82rem] font-extrabold text-[#201833] transition hover:bg-white/30 disabled:text-[#aaa3b5]"
                aria-label="上一句"
              >
                上一句
              </button>
              <button
                type="button"
                onClick={handleEnglishPracticeAction}
                className="sf-study-mic-button grid place-items-center transition"
                aria-label={isListening ? "停止语音输入" : "点击开始说话"}
              >
                <Image
                  src="/icons/glow-mic.svg"
                  alt=""
                  width={96}
                  height={96}
                  className="h-[4.5rem] w-[4.5rem]"
                />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= pairs.length - 1}
                className="sf-study-action-text mr-auto flex h-11 min-w-[3.6rem] items-center justify-center rounded-[15px] px-1 text-[0.82rem] font-extrabold text-[#201833] transition hover:bg-white/30 disabled:text-[#aaa3b5]"
                aria-label="下一句"
              >
                下一句
              </button>
              {showExpressionFeedback ? (
                <button
                  type="button"
                  aria-label="慢速朗读"
                  onClick={() => speakEnglish(selectedExpression.text, 0.5)}
                  className="sf-study-action-text sf-study-slow-button mr-auto flex h-10 min-w-[4rem] items-center justify-center rounded-[15px] px-1 text-[0.76rem] font-extrabold text-[#201833] transition hover:bg-white/30"
                >
                  慢速朗读
                </button>
              ) : null}
            </div>
          ) : null}

          {showCourseFileMenu && isMyCourseLesson ? (
            <div className="absolute right-6 top-[92px] z-40 w-[210px] rounded-[20px] border border-[#c9bfff] bg-white p-3 text-[#201833] shadow-[0_22px_58px_rgba(84,72,146,0.22)]">
              <button
                type="button"
                onClick={openRenameCourseDialog}
                className="flex h-12 w-full items-center gap-3 rounded-[14px] bg-[#f7f4ff] px-4 text-left text-sm font-black text-[#201833] hover:bg-[#e9e4ff]"
              >
                <span className="text-base">✎</span>
                更改文件名
              </button>
              <button
                type="button"
                onClick={deleteCurrentCourseFile}
                className="mt-2 flex h-12 w-full items-center gap-3 rounded-[14px] bg-[#fff2f5] px-4 text-left text-sm font-black text-[#d34a62] hover:bg-[#ffe8ee]"
              >
                <span aria-hidden="true" className="text-base">
                  🗑
                </span>
                删除文件
              </button>
            </div>
          ) : null}

          {showMoreActions ? (
            <div className="absolute left-6 right-6 top-[92px] z-30 rounded-[18px] border border-[#c9bfff] bg-white p-3 text-[#201833] shadow-[0_22px_58px_rgba(84,72,146,0.22)]">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => speakEnglish(currentPair.english, 1)}
                  className="rounded-[14px] bg-[#f7f4ff] px-3 py-2 text-sm font-bold"
                >
                  朗读英文
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handlePlaySourceAudio();
                  }}
                  disabled={isSourceAudioLoading || !canPlaySourceAudio}
                  className={`rounded-[14px] px-3 py-2 text-sm font-bold disabled:opacity-50 ${
                    isSourcePlaybackActive ? "bg-[#d9f8ff]" : "bg-[#f7f4ff]"
                  }`}
                >
                  播放原音频
                </button>
                <button
                  type="button"
                  onClick={handleSaveCurrentPosition}
                  className="rounded-[14px] bg-[#f7f4ff] px-3 py-2 text-sm font-bold"
                >
                  保存当前位置
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isAutoPlaying) {
                      stopAutoPlay();
                      return;
                    }

                    void startAutoPlay();
                  }}
                  className="rounded-[14px] bg-[#f7f4ff] px-3 py-2 text-sm font-bold"
                >
                  {isAutoPlaying ? "停止自动播放" : "自动播放"}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[0.5, 0.75, 1, 1.25].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setSourcePlaybackRate(rate)}
                    className={`rounded-[12px] px-2 py-1.5 text-xs font-bold ${
                      sourcePlaybackRate === rate
                        ? "bg-[#5b8cff] text-white"
                        : "bg-[#f7f4ff] text-[#201833]"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="mt-2 w-full rounded-[14px] border border-[#c9bfff] bg-[#f7f4ff] px-3 py-2 text-sm font-bold outline-none"
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {showStudyVoiceOnlyPrompt || showExpressionFeedback ? null : (
          <div className="relative z-20 shrink-0 rounded-t-[30px] border border-[#d8d0ff] bg-white/35 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-18px_40px_rgba(84,72,146,0.12)] backdrop-blur-xl">
            <div className="flex items-center gap-3 rounded-[24px] border border-[#d8d0ff] bg-white/35 p-2">
              <button
                type="button"
                onClick={() => {
                  setShowCourseFileMenu(false);
                  setShowMoreActions((prev) => !prev);
                }}
                aria-label="更多操作"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-[20px] bg-white/30 text-3xl font-light text-[#201833]"
              >
                +
              </button>
              <div className="flex h-12 min-w-0 flex-1 items-center bg-white/60 px-3 text-left text-[1rem] font-semibold text-[#8f88a5]">
                {isListening
                  ? liveTranscript || "正在听..."
                  : spokenEnglish || "说出你想表达的话..."}
              </div>
              <button
                type="button"
                aria-label={isListening ? "停止语音输入" : "开始语音输入"}
                onClick={handleEnglishPracticeAction}
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-[22px] transition ${
                  isListening
                    ? "scale-105 bg-[#28d5e8]"
                    : "bg-[linear-gradient(135deg,#7b61ff_0%,#5b8cff_58%,#7ee7ff_100%)]"
                }`}
              >
                <span className="flex items-end gap-0.5">
                  {[11, 20, 30, 22].map((height, index) => (
                    <span
                      key={`${height}-${index}`}
                      className="w-1.5 rounded-full bg-white"
                      style={{ height }}
                    />
                  ))}
                </span>
              </button>
            </div>
          </div>
          )}

          {sourceAudioUrl ? (
            <audio
              ref={sourceAudioRef}
              src={sourceAudioUrl}
              preload="auto"
              className="hidden"
              onPause={() => setIsClipPlaying(false)}
              onEnded={handleSourceClipComplete}
              onTimeUpdate={() => {
                const audio = sourceAudioRef.current;
                const clipEndTime = clipEndTimeRef.current;
                if (!audio || clipEndTime === null) return;

                if (audio.currentTime >= clipEndTime) {
                  audio.pause();
                  audio.currentTime = clipEndTime;
                  handleSourceClipComplete();
                }
              }}
            />
          ) : null}
        </section>

        {showFreePracticeLimitModal ? (
          <FreePracticeLimitModal
            isSignedIn={accountAccessKind === "signed-in"}
            onDismiss={() => setShowFreePracticeLimitModal(false)}
            onLogin={openLoginFromFreePracticeLimit}
            onRegister={openRegisterFromFreePracticeLimit}
            onUnlockPro={openProFromFreePracticeLimit}
          />
        ) : null}

        {showRenameCourseDialog ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--overlay-bg)] p-4 backdrop-blur-[10px]">
            <div className="w-full max-w-[390px] rounded-[30px] border border-[var(--border-color)] bg-[var(--card-bg-solid)] p-6 text-[var(--text-primary)] shadow-[0_28px_80px_var(--shadow-color)]">
              <h2 className="text-[1.45rem] font-extrabold">更改文件名</h2>
              <label className="mt-5 block">
                <span className="sr-only">课程文件名</span>
                <input
                  value={renameCourseTitle}
                  onChange={(event) => setRenameCourseTitle(event.target.value)}
                  onKeyDown={handleRenameCourseKeyDown}
                  autoFocus
                  className="h-14 w-full rounded-[18px] border border-[var(--border-color)] bg-[var(--input-bg)] px-4 text-[1rem] font-bold text-[var(--input-text)] outline-none shadow-[inset_0_1px_0_var(--theme-inset)]"
                />
              </label>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeRenameCourseDialog}
                  className="rounded-[18px] border border-[var(--border-color)] bg-[var(--button-bg)] px-4 py-4 text-[1.05rem] font-extrabold text-[var(--button-text)] hover:bg-[var(--chip-bg)]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={renameCurrentCourse}
                  className="rounded-[18px] bg-[var(--accent-primary)] px-4 py-4 text-[1.05rem] font-extrabold text-white shadow-[0_12px_28px_var(--shadow-color)]"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {pendingExpression ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--overlay-bg)] p-4 backdrop-blur-[10px]">
            <div className="w-full max-w-[390px] rounded-[30px] border border-[var(--border-color)] bg-[var(--card-bg-solid)] p-6 text-[var(--text-primary)] shadow-[0_28px_80px_var(--shadow-color)]">
              <h2 className="text-[1.6rem] font-extrabold">
                {pendingExpression.meaning}
              </h2>
              <p className="mt-5 rounded-[20px] border border-[var(--border-color)] bg-[var(--card-bg)] px-5 py-4 text-[1.65rem] font-extrabold text-[var(--text-primary)] shadow-[inset_0_1px_0_var(--theme-inset)]">
                {pendingExpression.phrase}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleConfirmAddExpression}
                  disabled={isSavingExpression}
                  className="rounded-[18px] bg-[var(--accent-primary)] px-4 py-4 text-[1.08rem] font-extrabold text-white shadow-[0_12px_28px_var(--shadow-color)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingExpression.kind === "word"
                    ? "➕ 收藏单词"
                    : "➕ 收藏表达"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeExpressionModal();
                  }}
                  className="rounded-[18px] border border-[var(--border-color)] bg-[var(--button-bg)] px-4 py-4 text-[1.08rem] font-extrabold text-[var(--button-text)] hover:bg-[var(--chip-bg)]"
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
