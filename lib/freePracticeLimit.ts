export const FREE_PRACTICE_DAILY_LIMIT = 5;

export type FreePracticeScope = "free" | "classic" | "course" | `course:${string}`;

const FREE_PRACTICE_USAGE_KEY_PREFIX = "speakflow-free-practice-usage";

type FreePracticeUsage = {
  completedIds: string[];
  count: number;
  date: string;
};

type RecordFreePracticeResult = {
  count: number;
  didRecord: boolean;
  limitReached: boolean;
};

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createEmptyUsage(): FreePracticeUsage {
  return {
    completedIds: [],
    count: 0,
    date: getTodayKey(),
  };
}

function getUsageStorageKey(scope: FreePracticeScope) {
  return `${FREE_PRACTICE_USAGE_KEY_PREFIX}:${scope}`;
}

export function getFreePracticeUsage(scope: FreePracticeScope): FreePracticeUsage {
  if (typeof window === "undefined") return createEmptyUsage();

  try {
    const raw = window.localStorage.getItem(getUsageStorageKey(scope));
    if (!raw) return createEmptyUsage();

    const parsed = JSON.parse(raw) as Partial<FreePracticeUsage>;
    if (parsed.date !== getTodayKey()) return createEmptyUsage();

    const completedIds = Array.isArray(parsed.completedIds)
      ? parsed.completedIds.filter((id): id is string => typeof id === "string")
      : [];
    const count =
      typeof parsed.count === "number" && Number.isFinite(parsed.count)
        ? Math.min(Math.max(parsed.count, completedIds.length), FREE_PRACTICE_DAILY_LIMIT)
        : Math.min(completedIds.length, FREE_PRACTICE_DAILY_LIMIT);

    return {
      completedIds,
      count,
      date: getTodayKey(),
    };
  } catch {
    return createEmptyUsage();
  }
}

function saveFreePracticeUsage(scope: FreePracticeScope, usage: FreePracticeUsage) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(getUsageStorageKey(scope), JSON.stringify(usage));
  } catch {
    // Ignore storage failures so practice flow never crashes the page.
  }
}

export function hasFreePracticeCompletion(
  scope: FreePracticeScope,
  completionId: string
) {
  return getFreePracticeUsage(scope).completedIds.includes(completionId);
}

export function isFreePracticeLimitReached(scope: FreePracticeScope) {
  return getFreePracticeUsage(scope).count >= FREE_PRACTICE_DAILY_LIMIT;
}

export function recordFreePracticeCompletion(
  scope: FreePracticeScope,
  completionId: string
): RecordFreePracticeResult {
  const usage = getFreePracticeUsage(scope);
  const completedIds = new Set(usage.completedIds);

  if (completedIds.has(completionId)) {
    return {
      count: usage.count,
      didRecord: false,
      limitReached: usage.count >= FREE_PRACTICE_DAILY_LIMIT,
    };
  }

  if (usage.count >= FREE_PRACTICE_DAILY_LIMIT) {
    return {
      count: usage.count,
      didRecord: false,
      limitReached: true,
    };
  }

  completedIds.add(completionId);

  const nextUsage = {
    completedIds: Array.from(completedIds),
    count: Math.min(usage.count + 1, FREE_PRACTICE_DAILY_LIMIT),
    date: usage.date,
  };

  saveFreePracticeUsage(scope, nextUsage);

  return {
    count: nextUsage.count,
    didRecord: true,
    limitReached: nextUsage.count >= FREE_PRACTICE_DAILY_LIMIT,
  };
}
