"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ExpressionLearningLimitModal from "@/components/ExpressionLearningLimitModal";
import InteractiveExpressionText from "@/components/InteractiveExpressionText";
import SpeakFlowBrandMark from "@/components/SpeakFlowBrandMark";
import {
  FREE_EXPRESSION_LEARNING_LIMIT,
  canLearnExpression,
  getExpressionLearningId,
  getExpressionLearningUsageCount,
  recordLearnedExpression,
} from "@/lib/freeExpressionLearningLimit";
import { createLoginUrl, subscriptionCallbackUrl } from "@/lib/loginRedirect";
import {
  applyExpressionStudyAction,
  deleteVocabularyWordFromCloud,
  generateVocabularyDefinition,
  hasUsableMeaning,
  loadVocabularyWords,
  saveVocabularyWords,
  syncVocabularyWordsWithCloud,
  updateVocabularyWord,
  type VocabularyWord,
} from "@/lib/vocabulary";
import styles from "./VocabularyPage.module.css";

type SubscriptionStatus = "free" | "pro" | "cancels_at_period_end";

type AccountSubscriptionResponse = {
  cancelAtPeriodEnd?: boolean | null;
  subscriptionStatus?: SubscriptionStatus;
};

type LibrarySortMode = "alphabetical" | "newest" | "oldest";
type LibrarySortDirection = "asc" | "desc";
type LibraryStatusFilter = "all" | "learning" | "mastered" | "review" | "shadow";

const SLOW_READ_RATE = 0.5;

const EXPRESSION_MEANING_FALLBACKS: Record<string, string> = {
  "set up": "设立；开设；安排",
  "open a bank account": "开设银行账户",
  "bring along": "随身带上",
  "lush and verdant": "生机盎然",
};

function normalizeSubscriptionStatus(
  subscriptionStatus?: SubscriptionStatus | null,
  cancelAtPeriodEnd?: boolean | null
): SubscriptionStatus {
  if (cancelAtPeriodEnd === true) return "cancels_at_period_end";

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

function getExpressionExample(word: VocabularyWord) {
  return word.sourceSentence || word.example || "";
}

function getExpressionNativeMeaning(word: VocabularyWord) {
  const savedMeaning = word.meaning.trim();

  if (hasUsableMeaning(savedMeaning)) {
    return savedMeaning;
  }

  return EXPRESSION_MEANING_FALLBACKS[word.word.toLowerCase()] || "释义待补充";
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatStatPercent(count: number, total: number) {
  if (!total) return "0%";

  return `${Math.round((count / total) * 1000) / 10}%`;
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return getDateKey(date);
}

function formatMonthDay(dateKey: string) {
  const [, month = "00", day = "00"] = dateKey.split("-");
  return `${month}/${day}`;
}

function getIsoTime(value?: string | null) {
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getExpressionLastActivityTime(word: VocabularyWord) {
  return (
    getIsoTime(word.lastStudiedAt) ||
    getIsoTime(word.firstStudiedAt) ||
    getVocabularyCreatedTime(word)
  );
}

function hasExpressionStudyActivity(word: VocabularyWord) {
  return Boolean(
    word.firstStudiedAt ||
      word.lastStudiedAt ||
      word.status !== "new" ||
      word.playCount > 0 ||
      word.shadowCount > 0 ||
      word.masteredCount > 0 ||
      word.correctCount > 0 ||
      word.studiedDates.length > 0
  );
}

function getExpressionKindLabel(word: VocabularyWord | null) {
  if (!word) return "新表达";

  const label = word.partOfSpeech.trim();
  if (!label) return "新表达";

  if (label === "word") return "单词";
  if (label === "phrase") return "短语";
  if (label === "sentence") return "句子";

  return label;
}

function getExpressionStatusLabel(word: VocabularyWord, todayKey: string) {
  if (word.status === "mastered") return "已掌握";
  if (word.nextReviewAt !== null && word.nextReviewAt <= todayKey) return "待复习";
  if (hasExpressionStudyActivity(word)) return "学习中";

  return "新表达";
}

function getExpressionStatusTone(word: VocabularyWord, todayKey: string) {
  if (word.status === "mastered") return "mastered";
  if (word.nextReviewAt !== null && word.nextReviewAt <= todayKey) return "review";
  if (hasExpressionStudyActivity(word)) return "learning";

  return "new";
}

function matchesLibraryStatusFilter(
  word: VocabularyWord,
  filter: LibraryStatusFilter,
  todayKey: string
) {
  if (filter === "all") return true;
  if (filter === "learning") {
    return word.status === "learning" || word.status === "familiar";
  }
  if (filter === "mastered") return word.status === "mastered";
  if (filter === "review") {
    return word.nextReviewAt !== null && word.nextReviewAt <= todayKey;
  }

  return word.shadowCount > 0;
}

function getLibrarySortShortLabel(
  sortMode: LibrarySortMode,
  sortDirection: LibrarySortDirection
) {
  if (sortMode === "newest") return "收藏时间";
  if (sortMode === "oldest") return "最早收藏";

  return sortDirection === "asc" ? "A-Z" : "Z-A";
}

function formatRelativeTimeFromNow(time: number) {
  if (!time) return "刚刚";

  const diff = Math.max(0, Date.now() - time);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;

  return `${Math.floor(diff / day)} 天前`;
}

function getCombinedStudiedDates(words: VocabularyWord[]) {
  return Array.from(
    new Set(words.flatMap((word) => word.studiedDates))
  ).sort();
}

function getCombinedStudyStreakDays(words: VocabularyWord[], todayKey: string) {
  const studiedDateSet = new Set(getCombinedStudiedDates(words));
  let cursor = todayKey;

  if (!studiedDateSet.has(cursor)) {
    const yesterdayKey = addDaysToDateKey(todayKey, -1);
    if (!studiedDateSet.has(yesterdayKey)) return 0;
    cursor = yesterdayKey;
  }

  let streakDays = 0;
  while (studiedDateSet.has(cursor)) {
    streakDays += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  return streakDays;
}

function createLearningHistory(words: VocabularyWord[], todayKey: string) {
  const days = Array.from({ length: 7 }, (_, index) =>
    addDaysToDateKey(todayKey, index - 6)
  );
  const maxValue = Math.max(
    1,
    ...days.map((dateKey) =>
      words.filter((word) => word.studiedDates.includes(dateKey)).length
    )
  );

  return days.map((dateKey, index) => {
    const value = words.filter((word) => word.studiedDates.includes(dateKey)).length;
    const x = days.length === 1 ? 0 : (index / (days.length - 1)) * 100;
    const y = 92 - (value / maxValue) * 74;

    return {
      dateKey,
      label: formatMonthDay(dateKey),
      value,
      x,
      y,
    };
  });
}

function getVocabularyUpdatePayload(
  word: VocabularyWord
): Partial<Omit<VocabularyWord, "word" | "createdAt">> {
  return {
    correctCount: word.correctCount,
    example: word.example,
    exampleZh: word.exampleZh,
    firstStudiedAt: word.firstStudiedAt,
    id: word.id,
    lastStudiedAt: word.lastStudiedAt,
    manuallyMastered: word.manuallyMastered,
    masteredCount: word.masteredCount,
    meaning: word.meaning,
    meaningZh: word.meaningZh,
    nextReviewAt: word.nextReviewAt,
    partOfSpeech: word.partOfSpeech,
    playCount: word.playCount,
    shadowCount: word.shadowCount,
    sourceSentence: word.sourceSentence,
    status: word.status,
    streakDays: word.streakDays,
    studiedDates: word.studiedDates,
    text: word.text,
    wrongCount: word.wrongCount,
  };
}

function cancelSpeech() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
}

function navigateTo(target: string, options: { replace?: boolean } = {}) {
  if (typeof window === "undefined") return;

  cancelSpeech();
  if (options.replace) {
    window.location.replace(target);
    return;
  }

  window.location.assign(target);
}

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M5.5 12.2h5.3l7.1-5.5v18.6l-7.1-5.5H5.5v-7.6Z" />
      <path d="M21.8 11.1a6.7 6.7 0 0 1 0 9.8" />
      <path d="M25.1 7.8a11.6 11.6 0 0 1 0 16.4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="m16 4.8 3.4 6.9 7.7 1.1-5.5 5.4 1.3 7.6-6.9-3.6-6.9 3.6 1.3-7.6-5.5-5.4 7.7-1.1L16 4.8Z" />
    </svg>
  );
}

function MeaningIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28">
      <path d="M6.4 5.8h15.2a2.8 2.8 0 0 1 2.8 2.8v7.8a2.8 2.8 0 0 1-2.8 2.8h-7.2l-5.2 4.4v-4.4H6.4a2.8 2.8 0 0 1-2.8-2.8V8.6a2.8 2.8 0 0 1 2.8-2.8Z" />
      <path d="M9.2 11h9.6M9.2 14.5h5.7" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M8.8 18.4c0-5 2.2-8.6 6.4-10.9l1.6 3c-2.1 1.2-3.3 2.8-3.6 4.8h3.6v8.2h-8v-5.1Zm11.8 0c0-5 2.2-8.6 6.4-10.9l1.6 3c-2.1 1.2-3.3 2.8-3.6 4.8h3.6v8.2h-8v-5.1Z" />
    </svg>
  );
}

function TranslationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28">
      <path d="M5.5 5.5h17a2 2 0 0 1 2 2v12.2a2 2 0 0 1-2 2H13l-5.2 3.8v-3.8H5.5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z" />
      <circle cx="9.5" cy="13.5" r="1.2" />
      <circle cx="14" cy="13.5" r="1.2" />
      <circle cx="18.5" cy="13.5" r="1.2" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M18.5 8.5 11 16l7.5 7.5M12 16h11" />
    </svg>
  );
}

function LibraryBackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M19.8 7.5 11.3 16l8.5 8.5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M13.5 8.5 21 16l-7.5 7.5M20 16H9" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 56 56">
      <path d="m25.6 2.7 5.2 14 14 5.2-14 5.2-5.2 14-5.2-14-14-5.2 14-5.2 5.2-14Z" />
      <path d="m44.5 8.5 2 5.3 5.3 2-5.3 2-2 5.3-2-5.3-5.3-2 5.3-2 2-5.3Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28">
      <path d="M9 22h10M10.5 25h7M14 2.8a8 8 0 0 0-4.7 14.5c.9.7 1.4 1.6 1.6 2.7h6.2c.2-1.1.8-2 1.6-2.7A8 8 0 0 0 14 2.8Z" />
      <path d="M14 7.5v4.8l-2.7 2.3M4.5 6.7 2.8 5M23.5 6.7 25.2 5M4 15.2H1.8M26.2 15.2H24" />
    </svg>
  );
}

function LibraryBookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 42 42">
      <path d="M7 12c0-2.2 1.8-4 4-4h8c3.5 0 6.2 1.2 8 3.6 1.8-2.4 4.5-3.6 8-3.6h1c2.2 0 4 1.8 4 4v21c0 2.1-2.1 3.6-4.1 2.8-8.2-3.2-15-2.4-20.9 2.2-5.9-4.6-12.7-5.4-20.9-2.2C2.1 36.6 0 35.1 0 33V12Z" transform="translate(1 0)" />
      <path d="M21 12v22" />
    </svg>
  );
}

function LibraryBoxIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 210 150">
      <defs>
        <linearGradient id="libraryHeroFolder" x1="41" x2="174" y1="45" y2="142">
          <stop stopColor="#b8a7ff" />
          <stop offset="1" stopColor="#7356ef" />
        </linearGradient>
        <linearGradient id="libraryHeroPaper" x1="80" x2="159" y1="14" y2="103">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#eeeaff" />
        </linearGradient>
      </defs>
      <path d="M78 22h68c8 0 15 7 15 15v64H63V37c0-8 7-15 15-15Z" fill="#8c72f3" opacity=".72" />
      <rect width="87" height="75" x="91" y="10" fill="#a78dfd" rx="13" transform="rotate(6 91 10)" />
      <rect width="72" height="55" x="102" y="25" fill="url(#libraryHeroPaper)" rx="9" transform="rotate(6 102 25)" />
      <path d="M119 45h34M117 58h41M115 71h28" stroke="#d2cef2" strokeLinecap="round" strokeWidth="5" />
      <path d="M34 66c0-10 8-18 18-18h43l14 16h60c10 0 18 8 18 18v34c0 10-8 18-18 18H52c-10 0-18-8-18-18V66Z" fill="url(#libraryHeroFolder)" />
      <path d="m105 78 5.7 11.6 12.8 1.9-9.3 9 2.2 12.7-11.4-6-11.4 6 2.2-12.7-9.3-9 12.8-1.9L105 78Z" fill="#fff" opacity=".92" />
      <path d="m26 40 2.5 6.5 6.5 2.5-6.5 2.5L26 59l-2.5-6.5L17 50l6.5-2.5L26 40Zm166-6 2.2 5.7 5.7 2.2-5.7 2.2-2.2 5.7-2.2-5.7-5.7-2.2 5.7-2.2L192 34ZM18 91l1.6 4.4 4.4 1.6-4.4 1.6L18 104l-1.6-4.4L12 98l4.4-1.6L18 91Z" fill="#b6a5ff" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <circle cx="14" cy="14" r="8" />
      <path d="m20.2 20.2 6.1 6.1" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M7 9h18M10 16h12M14 23h4" />
      <circle cx="13" cy="9" r="1.8" />
      <circle cx="19" cy="16" r="1.8" />
      <circle cx="16" cy="23" r="1.8" />
    </svg>
  );
}

function BookmarkStatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 38 38">
      <path d="M10 6.5h18c1.8 0 3.2 1.4 3.2 3.2v22.8L19 26.5 6.8 32.5V9.7C6.8 7.9 8.2 6.5 10 6.5Z" />
      <path d="m19 11.2 2.1 4.2 4.6.7-3.4 3.2.8 4.6-4.1-2.2-4.1 2.2.8-4.6-3.4-3.2 4.6-.7 2.1-4.2Z" />
    </svg>
  );
}

function BookStatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 38 38">
      <path d="M6 10.5c0-2.1 1.7-3.8 3.8-3.8h7.6c3.5 0 6.1 1.2 7.6 3.6 1.5-2.4 4.1-3.6 7.6-3.6h1.6c2.1 0 3.8 1.7 3.8 3.8v19.9c0 2.1-2.2 3.5-4.1 2.7-7.3-2.9-13.6-2.2-18.9 2-5.3-4.2-11.6-4.9-18.9-2C4.2 33.9 2 32.5 2 30.4V10.5Z" transform="translate(-1)" />
      <path d="M19 10v22" />
      <path d="M10 14h5M10 19h5M23 14h5M23 19h5" />
    </svg>
  );
}

function RecentStatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 38 38">
      <circle cx="19" cy="19" r="12" />
      <path d="M19 11v8l-5 4" />
    </svg>
  );
}

function ChartStatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 38 38">
      <path d="M8 30h24" />
      <path d="M11 26V15M19 26V8M27 26V19" />
    </svg>
  );
}

function CalendarStatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 38 38">
      <rect width="24" height="23" x="7" y="9" rx="4" />
      <path d="M12 6v6M26 6v6M7 16h24M13 22h3M18 22h3M23 22h3M13 27h3M18 27h3" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40">
      <rect width="12" height="22" x="14" y="5" rx="6" />
      <path d="M9 18a11 11 0 0 0 22 0M20 29v7M14 36h12" />
    </svg>
  );
}

function FollowPlayIcon() {
  return (
    <svg aria-hidden="true" className="sf-vocabulary-play-icon" viewBox="0 0 32 32">
      <path d="M11.2 7.8v16.4c0 1.35 1.5 2.15 2.62 1.38l12.14-8.2c0.98-.66.98-2.1 0-2.76L13.82 6.42c-1.12-.77-2.62.03-2.62 1.38Z" />
    </svg>
  );
}

function FireStatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 38 38">
      <path d="M20.3 4.8c.9 5.6-2.8 7.8-5.5 10.8-2.1 2.4-3.2 5-2.6 8.2 1 5.1 5.2 8.6 10.1 8.6 5.8 0 10.4-4.5 10.4-10.5 0-4.8-2.8-8.3-6.4-11.7-.4 3-1.9 4.7-4.4 5.6.8-4.5-.3-8.2-1.6-11Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path d="M8 8 24 24M24 8 8 24" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <circle cx="9" cy="16" r="2.3" />
      <circle cx="16" cy="16" r="2.3" />
      <circle cx="23" cy="16" r="2.3" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m7 9 5 5 5-5" />
    </svg>
  );
}

function ViewModeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 34 34">
      <rect width="7" height="7" x="6" y="7" rx="1.8" />
      <rect width="7" height="7" x="6" y="20" rx="1.8" />
      <rect width="7" height="7" x="19" y="7" rx="1.8" />
      <path d="M19 21h9M19 26h9" />
    </svg>
  );
}

function ExpressionThumb({ word }: { word: VocabularyWord }) {
  const normalized = word.word.toLowerCase();
  const tone =
    normalized.includes("flower") || normalized.includes("bloom")
      ? "pink"
      : normalized.includes("vine") || normalized.includes("plant")
        ? "green"
        : normalized.includes("milk") || normalized.includes("kefir")
          ? "purple"
          : normalized.includes("layer") || normalized.includes("shirt")
            ? "orange"
            : "blue";

  return (
    <span className={`sf-library-word-thumb is-${tone}`}>
      <svg aria-hidden="true" viewBox="0 0 58 58">
        {tone === "purple" ? (
          <>
            <path d="M23 19h14l2 27H21l2-27Z" />
            <path d="M24 19c0-5 2-8 6-8s6 3 6 8" />
            <path d="M12 35c6-5 13-5 21 0 5 3 9 3 13 1v10H12V35Z" />
          </>
        ) : tone === "green" ? (
          <>
            <path d="M29 45V15" />
            <path d="M28 26c-8-2-13 1-16 8 8 2 13-1 16-8Z" />
            <path d="M31 20c6-7 12-8 18-3-4 8-10 9-18 3Z" />
            <path d="M31 35c6-5 12-5 17 1-5 6-11 6-17-1Z" />
          </>
        ) : tone === "orange" ? (
          <>
            <path d="M18 16h22l8 8-4 5-4-4v19H18V25l-4 4-4-5 8-8Z" />
            <path d="M23 16c1 4 11 4 12 0" />
            <path d="M25 30h8M25 36h8" />
          </>
        ) : tone === "pink" ? (
          <>
            <circle cx="29" cy="18" r="8" />
            <circle cx="18" cy="29" r="8" />
            <circle cx="40" cy="29" r="8" />
            <circle cx="29" cy="32" r="8" />
            <circle cx="29" cy="27" r="5" />
            <path d="M29 36v13M29 43c5-4 10-4 14 0" />
          </>
        ) : (
          <>
            <path d="M17 17c0-5 4-9 9-9h5c5 0 9 4 9 9v2c5 2 8 7 8 13 0 8-7 15-15 15H20c-8 0-15-7-15-15 0-6 3-11 8-13v-2Z" />
            <path d="M20 28c2 3 5 3 7 0M32 28c2 3 5 3 7 0M23 38h12" />
          </>
        )}
      </svg>
    </span>
  );
}

function WordIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 250 210">
      <defs>
        <linearGradient id="vocabBookBlue" x1="52" x2="195" y1="80" y2="180">
          <stop stopColor="#b8afff" />
          <stop offset="1" stopColor="#5b61dd" />
        </linearGradient>
        <linearGradient id="vocabAaBubble" x1="166" x2="230" y1="21" y2="90">
          <stop stopColor="#c5b7ff" />
          <stop offset="1" stopColor="#7060e6" />
        </linearGradient>
      </defs>
      <circle cx="151" cy="111" r="91" fill="#ebe8ff" />
      <path
        d="M46 94c0-10 8-18 18-18h49c16 0 29 7 38 18 9-11 22-18 38-18h18c10 0 18 8 18 18v65c0 12-12 21-24 16-31-13-58-9-80 11-22-20-49-24-80-11-12 5-24-4-24-16V94Z"
        fill="url(#vocabBookBlue)"
        opacity=".92"
      />
      <path
        d="M62 79c0-10 8-18 18-18h40c12 0 23 5 31 14v91c-20-14-43-17-70-7-10 4-20-4-20-15V79Z"
        fill="#fff"
      />
      <path
        d="M151 75c8-9 19-14 31-14h40c10 0 18 8 18 18v65c0 11-11 19-21 15-26-10-50-7-68 7V75Z"
        fill="#fbfbff"
      />
      <path
        d="M82 91c21-7 38-7 51 0M82 109c20-7 37-7 50 0M82 127c18-6 34-6 47 0M171 91c18-7 34-7 48 0M171 110c17-7 33-7 46 0"
        fill="none"
        stroke="#dddaf1"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path d="M202 133v47l-15-11-15 11v-47h30Z" fill="#9b8cff" />
      <path
        d="M184 8h49c8 0 14 6 14 14v42c0 8-6 14-14 14h-13l-4 15-13-15h-19c-8 0-14-6-14-14V22c0-8 6-14 14-14Z"
        fill="url(#vocabAaBubble)"
      />
      <path
        d="M190 61 209 24l19 37M198 48h22"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <text x="225" y="62" fill="#fff" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="700">
        a
      </text>
      <path
        d="m55 36 4 10.5L69.5 50 59 54l-4 10.5L51 54l-10.5-4L51 46.5 55 36Zm-21 125 2.5 6.5 6.5 2.5-6.5 2.5L34 179l-2.5-6.5L25 170l6.5-2.5L34 161Zm120-124 2 5.2 5.2 2-5.2 2-2 5.2-2-5.2-5.2-2 5.2-2 2-5.2Z"
        fill="#9b8cff"
      />
    </svg>
  );
}

function ExampleIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 250 210">
      <defs>
        <linearGradient id="vocabChatBubble" x1="163" x2="231" y1="15" y2="82">
          <stop stopColor="#b9a7ff" />
          <stop offset="1" stopColor="#6f5ce7" />
        </linearGradient>
        <linearGradient id="vocabNotebook" x1="80" x2="183" y1="93" y2="185">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#eeeaff" />
        </linearGradient>
      </defs>
      <circle cx="147" cy="123" r="81" fill="#ece9ff" />
      <path
        d="M178 20h34c24 0 44 18 44 41s-20 41-44 41h-5l-2 19-23-24c-19-7-32-20-32-36 0-23 20-41 44-41Z"
        fill="url(#vocabChatBubble)"
      />
      <circle cx="187" cy="59" r="5" fill="#fff" opacity=".92" />
      <circle cx="207" cy="59" r="5" fill="#fff" opacity=".92" />
      <circle cx="227" cy="59" r="5" fill="#fff" opacity=".92" />
      <path
        d="M65 85c2-12 13-20 25-18l87 16c12 2 20 13 18 25l-13 72c-2 12-13 20-25 18l-87-16c-12-2-20-13-18-25l13-72Z"
        fill="#8176df"
      />
      <path
        d="M57 78c2-12 13-20 25-18l87 16c12 2 20 13 18 25l-13 72c-2 12-13 20-25 18l-87-16c-12-2-20-13-18-25l13-72Z"
        fill="url(#vocabNotebook)"
      />
      <path
        d="M83 102c23 4 47 9 70 13M78 126c19 4 39 7 58 11M74 150c30 5 60 11 91 16"
        fill="none"
        stroke="#d9d6ee"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <path
        d="M90 62c1-9 10-15 19-13 9 1 15 10 13 19M119 67c1-9 10-15 19-13 9 1 15 10 13 19M148 72c1-9 10-15 19-13 9 1 15 10 13 19"
        fill="none"
        stroke="#59518f"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        d="m190 159 38 20 17-58c2-8-2-16-10-18s-16 2-19 10l-26 46Z"
        fill="#7165d9"
      />
      <path d="m213 117 26 8" stroke="#c9c2ff" strokeLinecap="round" strokeWidth="8" />
      <path
        d="m48 169 2.8 7.4 7.4 2.8-7.4 2.8-2.8 7.4-2.8-7.4-7.4-2.8 7.4-2.8 2.8-7.4Zm214-30 2 5.4 5.4 2-5.4 2-2 5.4-2-5.4-5.4-2 5.4-2 2-5.4Z"
        fill="#a494ff"
      />
    </svg>
  );
}

function HighlightedExample({ sentence }: { sentence: string }) {
  return <InteractiveExpressionText sourceSentence={sentence} text={sentence} />;
}

function getVocabularyCreatedTime(word: VocabularyWord) {
  const time = new Date(word.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isRecentlyAdded(word: VocabularyWord) {
  const createdTime = getVocabularyCreatedTime(word);
  if (!createdTime) return false;

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - createdTime <= sevenDays;
}

function getLibrarySearchText(word: VocabularyWord) {
  return [
    word.word,
    word.meaning,
    word.partOfSpeech,
    word.example,
    word.exampleZh,
    word.sourceSentence,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getLibraryTag(word: VocabularyWord) {
  const text = `${word.word} ${word.meaning} ${word.partOfSpeech}`.toLowerCase();

  if (text.includes("kefir") || text.includes("milk") || text.includes("食品") || text.includes("饮品")) {
    return { label: "食品饮品", tone: "purple" };
  }
  if (text.includes("plant") || text.includes("vine") || text.includes("植物")) {
    return { label: "植物", tone: "green" };
  }
  if (text.includes("形容") || text.includes("adjective")) {
    return { label: "形容词", tone: "blue" };
  }
  if (text.includes("日常") || text.includes("layer") || text.includes("生活")) {
    return { label: "日常生活", tone: "orange" };
  }
  if (text.includes("nature") || text.includes("bloom") || text.includes("自然")) {
    return { label: "自然", tone: "pink" };
  }

  return { label: word.partOfSpeech || "表达", tone: "purple" };
}

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExpressionLibrary, setShowExpressionLibrary] = useState(false);
  const [showExpressionLimitModal, setShowExpressionLimitModal] =
    useState(false);
  const [accountSubscriptionStatus, setAccountSubscriptionStatus] =
    useState<SubscriptionStatus>("free");
  const [hasLoadedAccountSubscription, setHasLoadedAccountSubscription] =
    useState(false);
  const [hasLoadedVocabulary, setHasLoadedVocabulary] = useState(false);
  const [hasSyncedVocabulary, setHasSyncedVocabulary] = useState(false);
  const [loadingExampleTranslationFor, setLoadingExampleTranslationFor] =
    useState("");
  const [expressionLearningUsageCount, setExpressionLearningUsageCount] =
    useState(0);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [librarySortMode, setLibrarySortMode] =
    useState<LibrarySortMode>("newest");
  const [librarySortDirection, setLibrarySortDirection] =
    useState<LibrarySortDirection>("asc");
  const [libraryStatusFilter, setLibraryStatusFilter] =
    useState<LibraryStatusFilter>("all");
  const [showLibraryFilterMenu, setShowLibraryFilterMenu] = useState(false);
  const [showLibrarySortMenu, setShowLibrarySortMenu] = useState(false);
  const [openLibraryActionFor, setOpenLibraryActionFor] = useState("");
  const [pendingDeleteExpression, setPendingDeleteExpression] =
    useState<VocabularyWord | null>(null);
  const [showLearningResultsModal, setShowLearningResultsModal] =
    useState(false);

  const refreshExpressionLearningUsageCount = useCallback(() => {
    setExpressionLearningUsageCount(getExpressionLearningUsageCount());
  }, []);

  useEffect(() => {
    refreshExpressionLearningUsageCount();
  }, [refreshExpressionLearningUsageCount]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      setWords([...loadVocabularyWords()].reverse());
      setHasLoadedVocabulary(true);
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedVocabulary || !hasLoadedAccountSubscription) return;

    let cancelled = false;

    async function syncVocabulary() {
      setHasSyncedVocabulary(false);
      const syncedWords = await syncVocabularyWordsWithCloud();
      if (!cancelled) {
        setWords([...syncedWords].reverse());
        setHasSyncedVocabulary(true);
      }
    }

    void syncVocabulary();

    return () => {
      cancelled = true;
    };
  }, [hasLoadedAccountSubscription, hasLoadedVocabulary]);

  useEffect(() => {
    setCurrentIndex((index) =>
      words.length ? Math.min(index, words.length - 1) : 0
    );
  }, [words.length]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("library") !== "1") return;

    window.history.replaceState(null, "", "/vocabulary");
    const openLibraryTimer = window.setTimeout(() => {
      setShowExpressionLibrary(true);
    }, 0);

    return () => {
      window.clearTimeout(openLibraryTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountSubscription() {
      try {
        const response = await fetch(createAccountSubscriptionUrl(), {
          cache: "no-store",
        });

        if (response.ok) {
          const data = (await response.json()) as AccountSubscriptionResponse;
          const nextSubscriptionStatus = normalizeSubscriptionStatus(
            data.subscriptionStatus,
            data.cancelAtPeriodEnd
          );

          if (cancelled) return;

          setAccountSubscriptionStatus(nextSubscriptionStatus);
          if (hasProAccess(nextSubscriptionStatus)) {
            setShowExpressionLimitModal(false);
          }
        }
      } catch {
        // Keep the free-user behavior if the subscription check is unavailable.
      } finally {
        if (!cancelled) {
          setHasLoadedAccountSubscription(true);
        }
      }
    }

    void loadAccountSubscription();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayedExpression = words[currentIndex] || null;
  const displayedExpressionKey = displayedExpression?.word || "";
  const hasFinishedLoadingVocabulary =
    hasLoadedVocabulary && hasSyncedVocabulary;
  const displayedExpressionText = displayedExpression?.word || "";
  const displayedExampleText = displayedExpression
    ? getExpressionExample(displayedExpression)
    : "";
  const displayedExampleZhText = displayedExpression?.exampleZh.trim() || "";
  const displayedMeaningText = displayedExpression
    ? getExpressionNativeMeaning(displayedExpression)
    : "";
  const displayedExpressionKindLabel = getExpressionKindLabel(displayedExpression);
  const speechText = useMemo(() => {
    if (!displayedExpression) return "";

    return [displayedExpressionText, displayedExampleText]
      .map((item) => item.trim())
      .filter(Boolean)
      .join(". ");
  }, [displayedExampleText, displayedExpression, displayedExpressionText]);
  const isExampleTranslationLoading =
    Boolean(displayedExpression) &&
    loadingExampleTranslationFor === displayedExpression.word &&
    !displayedExampleZhText;
  const todayKey = useMemo(() => getDateKey(), []);
  const totalExpressionCount = words.length;
  const learningStats = useMemo(() => {
    const masteredCount = words.filter(
      (word) => word.status === "mastered"
    ).length;
    const learningCount = words.filter(
      (word) => word.status === "learning" || word.status === "familiar"
    ).length;
    const reviewCount = words.filter(
      (word) => word.nextReviewAt !== null && word.nextReviewAt <= todayKey
    ).length;
    const progress = totalExpressionCount
      ? Math.round((masteredCount / totalExpressionCount) * 100)
      : 0;

    return {
      learningCount,
      masteredCount,
      progress,
      reviewCount,
    };
  }, [todayKey, totalExpressionCount, words]);
  const masteredExpressionCount = learningStats.masteredCount;
  const learningExpressionCount = learningStats.learningCount;
  const reviewExpressionCount = learningStats.reviewCount;
  const studiedExpressionCount = words.filter(hasExpressionStudyActivity).length;
  const studiedExpressionPercent = totalExpressionCount
    ? Math.round((studiedExpressionCount / totalExpressionCount) * 100)
    : 0;
  const progressStyle = {
    "--sf-vocabulary-progress": `${Math.max(studiedExpressionPercent, displayedExpression ? 3 : 0)}%`,
  } as CSSProperties;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < words.length - 1;
  const isAccountPro = hasProAccess(accountSubscriptionStatus);
  const remainingDailyFreeCount = Math.max(
    0,
    FREE_EXPRESSION_LEARNING_LIMIT - expressionLearningUsageCount
  );
  const recentlyAddedCount = words.filter(isRecentlyAdded).length;
  const shadowExpressionCount = words.filter((word) => word.shadowCount > 0).length;
  const combinedStudiedDates = useMemo(() => getCombinedStudiedDates(words), [words]);
  const combinedStudyStreakDays = useMemo(
    () => getCombinedStudyStreakDays(words, todayKey),
    [todayKey, words]
  );
  const totalShadowCount = words.reduce(
    (total, word) => total + Math.max(0, word.shadowCount),
    0
  );
  const recentSevenDayKeys = useMemo(
    () =>
      new Set(
        Array.from({ length: 7 }, (_, index) =>
          addDaysToDateKey(todayKey, index - 6)
        )
      ),
    [todayKey]
  );
  const weeklyShadowCount = words
    .filter((word) => word.studiedDates.some((dateKey) => recentSevenDayKeys.has(dateKey)))
    .reduce((total, word) => total + Math.max(0, word.shadowCount), 0);
  const learningHistory = useMemo(
    () => createLearningHistory(words, todayKey),
    [todayKey, words]
  );
  const learningHistoryPoints = learningHistory
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
  const learningHistoryAreaPoints = `0,96 ${learningHistoryPoints} 100,96`;
  const highlightedHistoryPoint =
    learningHistory.reduce(
      (bestPoint, point) => (point.value >= bestPoint.value ? point : bestPoint),
      learningHistory[0]
    ) || {
      dateKey: todayKey,
      label: formatMonthDay(todayKey),
      value: 0,
      x: 0,
      y: 92,
    };
  const highlightedHistoryStyle = {
    "--sf-history-highlight-x": `${highlightedHistoryPoint.x}%`,
    "--sf-history-highlight-y": `${highlightedHistoryPoint.y}%`,
  } as CSSProperties;
  const recentLearningItems = words
    .filter(hasExpressionStudyActivity)
    .sort(
      (a, b) =>
        getExpressionLastActivityTime(b) - getExpressionLastActivityTime(a)
    )
    .slice(0, 3);
  const normalizedLibrarySearchQuery = librarySearchQuery.trim().toLowerCase();
  const sortedLibraryWords = useMemo(() => {
    const nextWords = [...words];

    nextWords.sort((a, b) => {
      if (librarySortMode === "newest") {
        return getVocabularyCreatedTime(b) - getVocabularyCreatedTime(a);
      }

      if (librarySortMode === "oldest") {
        return getVocabularyCreatedTime(a) - getVocabularyCreatedTime(b);
      }

      const direction = librarySortDirection === "asc" ? 1 : -1;
      return a.word.localeCompare(b.word, "en", { sensitivity: "base" }) * direction;
    });

    return nextWords;
  }, [librarySortDirection, librarySortMode, words]);
  const filteredLibraryWords = useMemo(() => {
    const statusMatchedWords = sortedLibraryWords.filter((word) =>
      matchesLibraryStatusFilter(word, libraryStatusFilter, todayKey)
    );

    if (!normalizedLibrarySearchQuery) return statusMatchedWords;

    return statusMatchedWords.filter((word) =>
      getLibrarySearchText(word).includes(normalizedLibrarySearchQuery)
    );
  }, [libraryStatusFilter, normalizedLibrarySearchQuery, sortedLibraryWords, todayKey]);
  const librarySearchSuggestions = normalizedLibrarySearchQuery
    ? filteredLibraryWords.slice(0, 5)
    : [];

  useEffect(() => {
    if (!displayedExpression) return;
    if (!hasLoadedAccountSubscription || isAccountPro) return;

    const expressionId = getExpressionLearningId(displayedExpression);
    if (!canLearnExpression(expressionId)) {
      refreshExpressionLearningUsageCount();
      const showTimer = window.setTimeout(() => {
        setShowExpressionLimitModal(true);
      }, 0);

      return () => {
        window.clearTimeout(showTimer);
      };
    }

    recordLearnedExpression(expressionId);
    refreshExpressionLearningUsageCount();
  }, [
    displayedExpression,
    hasLoadedAccountSubscription,
    isAccountPro,
    refreshExpressionLearningUsageCount,
  ]);

  useEffect(() => {
    if (!displayedExpression) return;
    if (hasUsableMeaning(displayedExpression.meaning)) return;

    let cancelled = false;
    const expressionWord = displayedExpression.word;

    async function loadNativeMeaning() {
      try {
        const definition = await generateVocabularyDefinition(expressionWord);
        const generatedMeaning = definition.meaning.trim();

        if (
          cancelled ||
          !generatedMeaning ||
          !hasUsableMeaning(generatedMeaning)
        ) {
          return;
        }

        const updates = {
          meaning: generatedMeaning,
          partOfSpeech:
            definition.partOfSpeech ||
            displayedExpression?.partOfSpeech ||
            "word",
          example: displayedExpression?.example || definition.example,
          exampleZh: displayedExpression?.exampleZh || definition.exampleZh,
        };

        updateVocabularyWord(expressionWord, updates);
        setWords((currentWords) =>
          currentWords.map((word) =>
            word.word === expressionWord ? { ...word, ...updates } : word
          )
        );
      } catch {
        // Keep the card usable if the definition service is unavailable.
      }
    }

    void loadNativeMeaning();

    return () => {
      cancelled = true;
    };
  }, [displayedExpression]);

  useEffect(() => {
    if (
      !displayedExpression ||
      !displayedExampleText ||
      displayedExpression.exampleZh.trim()
    ) {
      setLoadingExampleTranslationFor("");
      return;
    }

    let cancelled = false;
    const expressionWord = displayedExpression.word;
    const exampleSentence = displayedExampleText;
    setLoadingExampleTranslationFor(expressionWord);

    async function loadExampleTranslation() {
      try {
        const response = await fetch("/api/vocabulary/example-translation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentence: exampleSentence }),
        });
        const data = (await response.json()) as { translation?: unknown };
        const translation =
          typeof data.translation === "string" ? data.translation.trim() : "";

        if (!response.ok || !translation || cancelled) return;

        updateVocabularyWord(expressionWord, { exampleZh: translation });
        setWords((currentWords) =>
          currentWords.map((word) =>
            word.word === expressionWord
              ? { ...word, exampleZh: translation }
              : word
          )
        );
      } catch {
        // Keep the learning card usable even if translation is unavailable.
      } finally {
        if (!cancelled) {
          setLoadingExampleTranslationFor("");
        }
      }
    }

    void loadExampleTranslation();

    return () => {
      cancelled = true;
    };
  }, [displayedExampleText, displayedExpression]);

  function openHomeFromVocabulary() {
    setShowExpressionLibrary(false);
    setShowExpressionLimitModal(false);
    setShowLearningResultsModal(false);
    navigateTo("/new-expressions");
  }

  function openProFromExpressionLimit() {
    setShowExpressionLimitModal(false);
    navigateTo(createLoginUrl(subscriptionCallbackUrl));
  }

  function openLoginFromExpressionLimit() {
    setShowExpressionLimitModal(false);
    navigateTo(createLoginUrl(subscriptionCallbackUrl));
  }

  function openRegisterFromExpressionLimit() {
    setShowExpressionLimitModal(false);
    navigateTo("/register");
  }

  function openExpressionAt(index: number, options: { closeLibrary?: boolean } = {}) {
    const expression = words[index];
    if (!expression) return;

    const expressionId = getExpressionLearningId(expression);
    if (
      hasLoadedAccountSubscription &&
      !isAccountPro &&
      !canLearnExpression(expressionId)
    ) {
      refreshExpressionLearningUsageCount();
      setShowExpressionLimitModal(true);
      return;
    }

    setCurrentIndex(index);
    if (options.closeLibrary) {
      setShowExpressionLibrary(false);
    }
    setShowLearningResultsModal(false);
  }

  const persistExpressionProgress = useCallback((expression: VocabularyWord) => {
    const savedExpression =
      updateVocabularyWord(
        expression.word,
        getVocabularyUpdatePayload(expression)
      ) || expression;

    setWords((currentWords) =>
      currentWords.map((word) =>
        word.word === savedExpression.word ? savedExpression : word
      )
    );
  }, []);

  const recordCurrentExpressionAction = useCallback(
    (action: "view" | "play" | "shadow" | "mastered") => {
      if (!displayedExpression) return;

      persistExpressionProgress(
        applyExpressionStudyAction(displayedExpression, action)
      );
    },
    [displayedExpression, persistExpressionProgress]
  );

  useEffect(() => {
    if (!displayedExpressionKey) return;

    const storedExpression = loadVocabularyWords().find(
      (word) => word.word === displayedExpressionKey
    );
    if (!storedExpression) return;

    const updatedExpression = applyExpressionStudyAction(
      storedExpression,
      "view"
    );
    const savedExpression =
      updateVocabularyWord(
        updatedExpression.word,
        getVocabularyUpdatePayload(updatedExpression)
      ) || updatedExpression;

    setWords((currentWords) =>
      currentWords.map((word) =>
        word.word === savedExpression.word ? savedExpression : word
      )
    );
  }, [displayedExpressionKey]);

  function speakText(text: string, rate = 1) {
    const normalizedText = text.trim();
    if (!normalizedText || typeof window === "undefined") return;

    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = "en-US";
    utterance.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function playCurrentExpressionText(text: string, rate = 1) {
    speakText(text, rate);
    recordCurrentExpressionAction("play");
  }

  function shadowCurrentExpression(rate: number) {
    speakText(speechText || displayedExpressionText, rate);
    recordCurrentExpressionAction("shadow");
  }

  function removeExpressionFromLibrary(
    expression: VocabularyWord,
    options: { keepLibraryOpen?: boolean } = {}
  ) {
    const deletedVisibleIndex = words.findIndex(
      (word) => word.word === expression.word
    );

    const nextStoredWords = loadVocabularyWords().filter(
      (word) => word.word !== expression.word
    );
    const nextVisibleWords = [...nextStoredWords].reverse();

    saveVocabularyWords(nextStoredWords);
    void deleteVocabularyWordFromCloud(expression.word);
    setWords(nextVisibleWords);
    setCurrentIndex((index) => {
      const maxIndex = Math.max(nextVisibleWords.length - 1, 0);

      if (deletedVisibleIndex >= 0 && deletedVisibleIndex < index) {
        return Math.min(index - 1, maxIndex);
      }

      return Math.min(index, maxIndex);
    });

    if (!options.keepLibraryOpen) {
      setShowExpressionLibrary(false);
    }
  }

  function openLibraryExpression(expression: VocabularyWord) {
    const index = words.findIndex((word) => word.word === expression.word);
    if (index < 0) return;

    openExpressionAt(index, { closeLibrary: true });
  }

  function applyLibrarySort(
    mode: LibrarySortMode,
    direction: LibrarySortDirection = librarySortDirection
  ) {
    setLibrarySortMode(mode);
    if (mode === "alphabetical") {
      setLibrarySortDirection(direction);
    }
    setShowLibraryFilterMenu(false);
    setShowLibrarySortMenu(false);
  }

  function confirmDeleteExpression() {
    if (!pendingDeleteExpression) return;

    removeExpressionFromLibrary(pendingDeleteExpression, {
      keepLibraryOpen: true,
    });
    setPendingDeleteExpression(null);
    setOpenLibraryActionFor("");
  }

  if (showExpressionLibrary) {
    const libraryFilterTabs = [
      { count: totalExpressionCount, filter: "all" as const, label: "全部" },
      { count: learningExpressionCount, filter: "learning" as const, label: "学习中" },
      { count: masteredExpressionCount, filter: "mastered" as const, label: "已掌握" },
      { count: reviewExpressionCount, filter: "review" as const, label: "待复习" },
    ];
    const libraryBottomTabs = [
      { count: totalExpressionCount, filter: "all" as const, icon: <ViewModeIcon />, label: "全部表达" },
      { count: learningExpressionCount, filter: "learning" as const, icon: <BookStatIcon />, label: "学习中" },
      { count: shadowExpressionCount, filter: "shadow" as const, icon: <MicIcon />, label: "跟读" },
      { count: reviewExpressionCount, filter: "review" as const, icon: <FireStatIcon />, label: "待复习" },
      { count: masteredExpressionCount, filter: "mastered" as const, icon: <BookmarkStatIcon />, label: "已掌握" },
    ];

    return (
      <main className={`${styles.mount} sf-expression-library-page`}>
        <section className="sf-expression-library-phone" aria-label="表达库页面">
          <header className="sf-expression-library-topbar">
            <button
              type="button"
              aria-label="返回新表达菜单"
              className="sf-expression-library-back"
              onClick={openHomeFromVocabulary}
            >
              <LibraryBackIcon />
            </button>

            <div className="sf-expression-library-brand" aria-label="SpeakFlow AI Voice Practice">
              <SpeakFlowBrandMark className="sf-expression-library-brand-mark" />
              <span>
                <strong>SpeakFlow</strong>
                <small>AI VOICE PRACTICE</small>
              </span>
            </div>

            <span aria-hidden="true" />
          </header>

          <section className="sf-expression-library-hero">
            <div className="sf-expression-library-title-icon">
              <LibraryBookIcon />
            </div>
            <div className="sf-expression-library-title-copy">
              <h1>我的表达库</h1>
              <p>已收藏 {totalExpressionCount} 个表达</p>
            </div>
            <div className="sf-expression-library-hero-art">
              <LibraryBoxIllustration />
            </div>
          </section>

          <section className="sf-expression-library-stats" aria-label="表达库统计">
            <div className="sf-expression-library-stat is-purple">
              <span>
                <BookStatIcon />
              </span>
              <p>学习中</p>
              <b>
                <strong>{learningExpressionCount}</strong>
                <em>个</em>
              </b>
            </div>
            <div className="sf-expression-library-stat is-green">
              <span>
                <BookmarkStatIcon />
              </span>
              <p>已掌握</p>
              <b>
                <strong>{masteredExpressionCount}</strong>
                <em>个</em>
              </b>
            </div>
            <div className="sf-expression-library-stat is-orange">
              <span>
                <FireStatIcon />
              </span>
              <p>待复习</p>
              <b>
                <strong>{reviewExpressionCount}</strong>
                <em>个</em>
              </b>
            </div>
            <div className="sf-expression-library-stat is-blue">
              <span>
                <RecentStatIcon />
              </span>
              <p>最近新增</p>
              <b>
                <strong>{recentlyAddedCount}</strong>
                <em>个</em>
              </b>
            </div>
          </section>

          <section className="sf-expression-library-search-row">
            <label className="sf-expression-library-search">
              <SearchIcon />
              <input
                value={librarySearchQuery}
                onChange={(event) => setLibrarySearchQuery(event.target.value)}
                placeholder="搜索表达（中英文均可）"
                type="search"
              />
            </label>
            <button
              type="button"
              aria-label="打开筛选排序菜单"
              className="sf-expression-library-filter"
              onClick={() => {
                setShowLibraryFilterMenu((current) => !current);
                setShowLibrarySortMenu(false);
              }}
            >
              <FilterIcon />
            </button>

            {librarySearchSuggestions.length ? (
              <div className="sf-expression-library-suggestions" role="listbox">
                {librarySearchSuggestions.map((word) => (
                  <button
                    key={`suggestion-${word.word}-${word.createdAt}`}
                    type="button"
                    onClick={() => {
                      setLibrarySearchQuery(word.word);
                      setOpenLibraryActionFor("");
                    }}
                  >
                    <strong>{word.word}</strong>
                    <span>{getExpressionNativeMeaning(word)}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {showLibraryFilterMenu ? (
              <div className="sf-expression-library-filter-menu">
                {libraryFilterTabs.map((tab) => (
                  <button
                    key={`filter-menu-${tab.filter}`}
                    type="button"
                    onClick={() => {
                      setLibraryStatusFilter(tab.filter);
                      setShowLibraryFilterMenu(false);
                    }}
                  >
                    {tab.label} {tab.count}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setLibraryStatusFilter("shadow");
                    setShowLibraryFilterMenu(false);
                  }}
                >
                  已跟读 {shadowExpressionCount}
                </button>
                <button type="button" onClick={() => applyLibrarySort("alphabetical", "asc")}>
                  按字母排序
                </button>
                <button type="button" onClick={() => applyLibrarySort("alphabetical", "desc")}>
                  按字母倒序
                </button>
                <button type="button" onClick={() => applyLibrarySort("newest")}>
                  最近收藏
                </button>
                <button type="button" onClick={() => applyLibrarySort("oldest")}>
                  最早收藏
                </button>
              </div>
            ) : null}
          </section>

          <section className="sf-expression-library-filter-tabs" aria-label="表达状态筛选">
            {libraryFilterTabs.map((tab) => (
              <button
                key={tab.filter}
                type="button"
                className={libraryStatusFilter === tab.filter ? "is-active" : ""}
                onClick={() => setLibraryStatusFilter(tab.filter)}
              >
                {tab.label} <strong>{tab.count}</strong>
              </button>
            ))}

            <div className="sf-expression-library-sort-select">
              <button
                type="button"
                onClick={() => {
                  setShowLibrarySortMenu((current) => !current);
                  setShowLibraryFilterMenu(false);
                }}
              >
                {getLibrarySortShortLabel(librarySortMode, librarySortDirection)}
                <ChevronDownIcon />
              </button>
              {showLibrarySortMenu ? (
                <div>
                  <button type="button" onClick={() => applyLibrarySort("newest")}>
                    收藏时间
                  </button>
                  <button type="button" onClick={() => applyLibrarySort("oldest")}>
                    最早收藏
                  </button>
                  <button type="button" onClick={() => applyLibrarySort("alphabetical", "asc")}>
                    A-Z
                  </button>
                  <button type="button" onClick={() => applyLibrarySort("alphabetical", "desc")}>
                    Z-A
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="sf-expression-library-list" aria-label="已收藏表达">
            {filteredLibraryWords.length ? (
              filteredLibraryWords.map((word) => {
                const tag = getLibraryTag(word);
                const isMenuOpen = openLibraryActionFor === word.word;
                const statusTone = getExpressionStatusTone(word, todayKey);

                return (
                  <article
                    className="sf-expression-library-item"
                    key={`${word.word}-${word.createdAt}`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="sf-expression-library-item-main"
                      onClick={() => openLibraryExpression(word)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openLibraryExpression(word);
                        }
                      }}
                    >
                      <ExpressionThumb word={word} />
                      <span className="sf-expression-library-item-copy">
                        <span className="sf-expression-library-word-line">
                          <strong>{word.word}</strong>
                          <button
                            type="button"
                            aria-label={`播放表达 ${word.word}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              speakText(word.word);
                            }}
                          >
                            <SpeakerIcon />
                          </button>
                        </span>
                        <span className="sf-expression-library-meaning">
                          {getExpressionNativeMeaning(word)}
                        </span>
                        <span className={`sf-expression-library-tag is-${tag.tone}`}>
                          {tag.label}
                        </span>
                      </span>
                    </div>

                    <span className={`sf-expression-library-item-status is-${statusTone}`}>
                      {getExpressionStatusLabel(word, todayKey)}
                    </span>

                    <div className="sf-expression-library-item-actions">
                      <button
                        type="button"
                        aria-label={`打开 ${word.word} 的更多操作`}
                        onClick={() =>
                          setOpenLibraryActionFor((current) =>
                            current === word.word ? "" : word.word
                          )
                        }
                      >
                        <MoreIcon />
                      </button>
                      {isMenuOpen ? (
                        <div className="sf-expression-library-item-menu">
                          <button
                            type="button"
                            onClick={() => openLibraryExpression(word)}
                          >
                            学习这个表达
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteExpression(word)}
                          >
                            删除表达
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="sf-expression-library-empty">
                <h2>
                  {hasFinishedLoadingVocabulary
                    ? "没有找到匹配表达"
                    : "正在加载表达库"}
                </h2>
                <p>
                  {hasFinishedLoadingVocabulary
                    ? "换一个关键词试试，中文或英文都可以搜索。"
                    : "正在读取本地和云端收藏数据。"}
                </p>
              </div>
            )}
          </section>

          <footer className="sf-expression-library-bottom-bar">
            {libraryBottomTabs.map((tab) => (
              <button
                key={`bottom-${tab.filter}`}
                type="button"
                aria-label={`${tab.label}，共 ${tab.count} 个`}
                className={
                  libraryStatusFilter === tab.filter
                    ? "sf-expression-library-bottom-tab is-active"
                    : "sf-expression-library-bottom-tab"
                }
                onClick={() => {
                  setLibraryStatusFilter(tab.filter);
                  setOpenLibraryActionFor("");
                }}
              >
                <span>{tab.icon}</span>
                <strong>{tab.label}</strong>
              </button>
            ))}
          </footer>

          {pendingDeleteExpression ? (
            <div className="sf-expression-library-delete-backdrop" role="presentation">
              <section
                className="sf-expression-library-delete-dialog"
                aria-label="确认删除表达"
              >
                <h2>删除表达？</h2>
                <p>
                  确定要删除 “{pendingDeleteExpression.word}” 吗？删除后会从表达库和云端同步记录中移除。
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteExpression(null)}
                  >
                    取消
                  </button>
                  <button type="button" onClick={confirmDeleteExpression}>
                    删除
                  </button>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className={`${styles.mount} sf-vocabulary-learning-page`}>
      <section className="sf-vocabulary-learning-phone" aria-label="新表达学习界面">
        <header className="sf-vocabulary-learning-header">
          <button
            type="button"
            aria-label="返回新表达菜单"
            className="sf-vocabulary-menu-button is-back"
            onClick={openHomeFromVocabulary}
          >
            <ArrowLeftIcon />
          </button>

          <div className="sf-vocabulary-brand" aria-label="SpeakFlow AI Voice Practice">
            <SpeakFlowBrandMark className="sf-vocabulary-brand-mark" />
            <span>
              <strong>SpeakFlow</strong>
              <small>AI VOICE PRACTICE</small>
            </span>
          </div>

          <button
            type="button"
            className="sf-vocabulary-results-button sf-vocabulary-header-results-button"
            onClick={() => setShowLearningResultsModal(true)}
          >
            <ChartStatIcon />
            <span>学习成果</span>
            <ArrowRightIcon />
          </button>
        </header>

        <div className="sf-vocabulary-learning-scroll">
          <section className="sf-vocabulary-learning-title">
            <span className="sf-vocabulary-title-icon">
              <SparkleIcon />
            </span>
            <div>
              <h1>学习新表达</h1>
              <p>
                已掌握 <strong>{masteredExpressionCount}</strong> 个表达
              </p>
            </div>
          </section>

          {displayedExpression ? (
            <>
              <section className="sf-vocabulary-study-card sf-vocabulary-word-card">
                <div className="sf-vocabulary-card-copy">
                  <span className="sf-vocabulary-saved-pill">
                    <StarIcon />
                    新表达
                  </span>
                  <div className="sf-vocabulary-word-line">
                    <h2>{displayedExpressionText}</h2>
                  </div>
                  <div className="sf-vocabulary-expression-meta">
                    <span>{displayedExpressionKindLabel}</span>
                    <button
                      type="button"
                      aria-label={`播放表达 ${displayedExpressionText}`}
                      className="sf-vocabulary-audio-button"
                      onClick={() => playCurrentExpressionText(displayedExpressionText)}
                    >
                      <SpeakerIcon />
                    </button>
                  </div>
                  <div className="sf-vocabulary-label">
                    <MeaningIcon />
                    <span>中文含义</span>
                  </div>
                  <p className="sf-vocabulary-meaning">{displayedMeaningText}</p>
                </div>
                <div className="sf-vocabulary-card-art">
                  <WordIllustration />
                </div>
              </section>

              <section className="sf-vocabulary-study-card sf-vocabulary-example-card">
                <div className="sf-vocabulary-card-copy">
                  <span className="sf-vocabulary-example-pill">
                    <QuoteIcon />
                    例句
                  </span>
                  <div className="sf-vocabulary-example-line">
                    <h2>
                      {displayedExampleText ? (
                        <HighlightedExample sentence={displayedExampleText} />
                      ) : (
                        "这个表达还没有例句。"
                      )}
                    </h2>
                    <button
                      type="button"
                      aria-label="播放例句"
                      className="sf-vocabulary-audio-button"
                      onClick={() =>
                        playCurrentExpressionText(
                          displayedExampleText || displayedExpressionText
                        )
                      }
                      disabled={!displayedExampleText && !displayedExpressionText}
                    >
                      <SpeakerIcon />
                    </button>
                  </div>
                  <i className="sf-vocabulary-card-rule" />
                  <div className="sf-vocabulary-label">
                    <TranslationIcon />
                    <span>中文翻译</span>
                  </div>
                  <p className="sf-vocabulary-translation">
                    {displayedExampleZhText ||
                      (isExampleTranslationLoading
                        ? "中文例句生成中..."
                        : "翻译待补充")}
                  </p>
                </div>
                <div className="sf-vocabulary-card-art">
                  <ExampleIllustration />
                </div>
              </section>
            </>
          ) : (
            <section className="sf-vocabulary-empty-card">
              <h2>
                {hasFinishedLoadingVocabulary
                  ? "还没有收藏的新表达"
                  : "正在加载新表达"}
              </h2>
              <p>
                {hasFinishedLoadingVocabulary
                  ? "在练习页点击英文词汇后，会自动保存到这里。"
                  : "正在读取你的表达库和云端同步数据。"}
              </p>
            </section>
          )}

          <section
            className="sf-vocabulary-progress-panel"
            style={progressStyle}
            aria-label="学习进度"
          >
            <div className="sf-vocabulary-progress-copy">
              <h2>我的学习进度</h2>
              <div className="sf-vocabulary-progress-summary">
                <span>
                  总表达数 <strong>{totalExpressionCount}</strong> 个
                </span>
                <span>
                  已学习 <strong>{studiedExpressionCount}</strong> / {totalExpressionCount} 个 ({studiedExpressionPercent}%)
                </span>
              </div>
              <div className="sf-vocabulary-progress-bar" aria-hidden="true">
                <i />
              </div>
            </div>

            <div className="sf-vocabulary-stat-grid">
              <article className="sf-vocabulary-stat-card is-mastered">
                <span>
                  <BookmarkStatIcon />
                </span>
                <p>已掌握</p>
                <strong>{masteredExpressionCount}</strong>
                <em>{formatStatPercent(masteredExpressionCount, totalExpressionCount)}</em>
              </article>
              <article className="sf-vocabulary-stat-card is-learning">
                <span>
                  <BookStatIcon />
                </span>
                <p>学习中</p>
                <strong>{learningExpressionCount}</strong>
                <em>{formatStatPercent(learningExpressionCount, totalExpressionCount)}</em>
              </article>
              <article className="sf-vocabulary-stat-card is-review">
                <span>
                  <RecentStatIcon />
                </span>
                <p>待复习</p>
                <strong>{reviewExpressionCount}</strong>
                <em>{formatStatPercent(reviewExpressionCount, totalExpressionCount)}</em>
              </article>
            </div>

            <p className="sf-vocabulary-progress-note">
              <LightbulbIcon />
              小贴士：点击麦克风开始跟读，熟练后可以效果更佳哦！
            </p>
          </section>
        </div>

        <footer className="sf-vocabulary-fixed-footer">
          <nav className="sf-vocabulary-learning-actions" aria-label="学习控制">
            <button
              type="button"
              aria-label="上一句"
              className="sf-vocabulary-nav-action"
              disabled={!hasPrevious}
              onClick={() => openExpressionAt(Math.max(currentIndex - 1, 0))}
            >
              <ArrowLeftIcon />
              <span>上一句</span>
            </button>

            <button
              type="button"
              aria-label="播放跟读"
              className="sf-vocabulary-follow-action"
              disabled={!speechText}
              onClick={() => shadowCurrentExpression(1)}
            >
              <FollowPlayIcon />
              <span>跟读</span>
            </button>

            <button
              type="button"
              aria-label="0.5x 慢速播放"
              className="sf-vocabulary-slow-action"
              disabled={!speechText}
              onClick={() =>
                playCurrentExpressionText(
                  speechText || displayedExpressionText,
                  SLOW_READ_RATE
                )
              }
            >
              <strong>0.5x</strong>
              <span>慢速</span>
            </button>

            <button
              type="button"
              aria-label="下一句"
              className="sf-vocabulary-nav-action"
              disabled={!hasNext}
              onClick={() =>
                openExpressionAt(Math.min(currentIndex + 1, words.length - 1))
              }
            >
              <span>下一句</span>
              <ArrowRightIcon />
            </button>
          </nav>

          <p className="sf-vocabulary-tip">
            <LightbulbIcon />
            点击麦克风开始跟读
            {!isAccountPro && remainingDailyFreeCount === 0 ? " 今日免费学习次数已用完。" : ""}
          </p>
        </footer>

        {showExpressionLibrary ? (
          <section className="sf-vocabulary-library-panel" aria-label="表达库">
            <div className="sf-vocabulary-library-header">
              <div>
                <h2>表达库</h2>
                <p>共 {totalExpressionCount} 个新表达</p>
              </div>
              <button
                type="button"
                aria-label="关闭表达库"
                onClick={() => setShowExpressionLibrary(false)}
              >
                ×
              </button>
            </div>
            <div className="sf-vocabulary-library-list">
              {words.length ? (
                words.map((word, index) => (
                  <div
                    key={`${word.word}-${word.createdAt}`}
                    className={
                      index === currentIndex
                        ? "sf-vocabulary-library-item is-active"
                        : "sf-vocabulary-library-item"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => openExpressionAt(index, { closeLibrary: true })}
                    >
                      <strong>{word.word}</strong>
                      <span>{getExpressionNativeMeaning(word)}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`从表达库删除 ${word.word}`}
                      onClick={() =>
                        removeExpressionFromLibrary(word, {
                          keepLibraryOpen: true,
                        })
                      }
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))
              ) : (
                <p className="sf-vocabulary-library-empty">
                  {hasFinishedLoadingVocabulary
                    ? "还没有收藏的新表达。"
                    : "正在读取你的表达库和云端同步数据。"}
                </p>
              )}
            </div>
          </section>
        ) : null}
      </section>

      {showExpressionLimitModal ? (
        <ExpressionLearningLimitModal
          onDismiss={() => setShowExpressionLimitModal(false)}
          onLogin={openLoginFromExpressionLimit}
          onRegister={openRegisterFromExpressionLimit}
          onUnlockPro={openProFromExpressionLimit}
        />
      ) : null}

      {showLearningResultsModal ? (
        <div className="sf-vocabulary-results-backdrop" role="presentation">
          <section
            className="sf-vocabulary-results-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sf-vocabulary-results-title"
          >
            <header className="sf-vocabulary-results-header">
              <div>
                <span className="sf-vocabulary-results-title-icon">
                  <ChartStatIcon />
                </span>
                <h2 id="sf-vocabulary-results-title">学习成果</h2>
                <p>
                  <SparkleIcon />
                  坚持学习，让地道表达成为你的习惯！
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭学习成果"
                className="sf-vocabulary-results-close"
                onClick={() => setShowLearningResultsModal(false)}
              >
                <CloseIcon />
              </button>
            </header>

            <section className="sf-vocabulary-results-stat-grid" aria-label="学习成果统计">
              <article className="sf-vocabulary-results-stat is-purple">
                <span>
                  <BookmarkStatIcon />
                </span>
                <strong>{totalExpressionCount}</strong>
                <p>累计收藏</p>
                <em>个表达</em>
              </article>
              <article className="sf-vocabulary-results-stat is-green">
                <span>
                  <BookStatIcon />
                </span>
                <strong>{recentlyAddedCount}</strong>
                <p>本周新增</p>
                <em>个表达</em>
              </article>
              <article className="sf-vocabulary-results-stat is-orange">
                <span>
                  <MicIcon />
                </span>
                <strong>{weeklyShadowCount}</strong>
                <p>本周跟读</p>
                <em>次</em>
              </article>
              <article className="sf-vocabulary-results-stat is-blue">
                <span>
                  <CalendarStatIcon />
                </span>
                <strong>{combinedStudyStreakDays}</strong>
                <p>连续学习</p>
                <em>天</em>
              </article>
              <article className="sf-vocabulary-results-stat is-purple">
                <span>
                  <StarIcon />
                </span>
                <strong>{combinedStudiedDates.length}</strong>
                <p>累计学习</p>
                <em>天</em>
              </article>
              <article className="sf-vocabulary-results-stat is-pink">
                <span>
                  <FireStatIcon />
                </span>
                <strong>{totalShadowCount}</strong>
                <p>累计跟读</p>
                <em>次</em>
              </article>
            </section>

            <section className="sf-vocabulary-results-chart-card" aria-label="近七天学习历程">
              <div className="sf-vocabulary-results-section-title">
                <h3>学习历程</h3>
                <button type="button">
                  近7天
                  <ChevronDownIcon />
                </button>
              </div>
              <div
                className="sf-vocabulary-results-chart"
                style={highlightedHistoryStyle}
              >
                <div className="sf-vocabulary-results-chart-y" aria-hidden="true">
                  <span>60</span>
                  <span>50</span>
                  <span>40</span>
                  <span>30</span>
                  <span>20</span>
                  <span>10</span>
                  <span>0</span>
                </div>
                <div className="sf-vocabulary-results-chart-plot">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon points={learningHistoryAreaPoints} />
                    <polyline points={learningHistoryPoints} />
                    {learningHistory.map((point) => (
                      <circle
                        key={point.dateKey}
                        cx={point.x}
                        cy={point.y}
                        r={point.dateKey === highlightedHistoryPoint.dateKey ? 2.1 : 1.5}
                      />
                    ))}
                  </svg>
                  <div className="sf-vocabulary-results-chart-tooltip">
                    <span>{highlightedHistoryPoint.label}</span>
                    <strong>学习表达：{highlightedHistoryPoint.value} 个</strong>
                  </div>
                </div>
                <div className="sf-vocabulary-results-chart-x">
                  {learningHistory.map((point) => (
                    <span key={point.dateKey}>{point.label}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="sf-vocabulary-results-recent-card" aria-label="最近学习">
              <div className="sf-vocabulary-results-section-title">
                <h3>最近学习</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowLearningResultsModal(false);
                    setShowExpressionLibrary(true);
                  }}
                >
                  查看全部
                  <ArrowRightIcon />
                </button>
              </div>
              <div className="sf-vocabulary-results-recent-list">
                {recentLearningItems.length ? (
                  recentLearningItems.map((word) => {
                    const statusTone = getExpressionStatusTone(word, todayKey);
                    const activityTime = getExpressionLastActivityTime(word);

                    return (
                      <button
                        type="button"
                        key={`recent-${word.word}-${word.createdAt}`}
                        onClick={() => openLibraryExpression(word)}
                      >
                        <span className="sf-vocabulary-results-recent-icon">
                          <BookStatIcon />
                        </span>
                        <strong>{word.word}</strong>
                        <span className={`sf-vocabulary-results-recent-status is-${statusTone}`}>
                          {getExpressionStatusLabel(word, todayKey)}
                        </span>
                        <time>{formatRelativeTimeFromNow(activityTime)}</time>
                        <ArrowRightIcon />
                      </button>
                    );
                  })
                ) : (
                  <p className="sf-vocabulary-results-empty">
                    还没有学习记录。开始跟读后，这里会显示最近学习的表达。
                  </p>
                )}
              </div>
            </section>

            <p className="sf-vocabulary-results-tip">
              <LightbulbIcon />
              小贴士：每天坚持一点点，你的表达能力会越来越棒！
            </p>
          </section>
        </div>
      ) : null}
    </main>
  );
}
