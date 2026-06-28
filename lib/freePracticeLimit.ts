export const FREE_PRACTICE_GLOBAL_LIMIT = 5;
export const FREE_PRACTICE_DAILY_LIMIT = FREE_PRACTICE_GLOBAL_LIMIT;

export type FreePracticeScope =
  | "free"
  | "guided"
  | "classic"
  | "course"
  | "sentence-pattern"
  | "expression"
  | "native-flow"
  | "new-expression"
  | `course:${string}`;

const FREE_PRACTICE_USAGE_KEY_PREFIX = "speakflow-free-practice-usage";
const FREE_PRACTICE_GLOBAL_USAGE_KEY = `${FREE_PRACTICE_USAGE_KEY_PREFIX}:global`;

export type FreePracticeUsage = {
  completedIds: string[];
  count: number;
  date: string;
};

export type RecordFreePracticeResult = {
  count: number;
  didRecord: boolean;
  limitReached: boolean;
};

export type ServerFreePracticeUsage = FreePracticeUsage & {
  limit: number;
  limitReached: boolean;
};

type FreePracticeUsageApiResponse = {
  didRecord?: boolean;
  usage?: Partial<ServerFreePracticeUsage>;
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

function normalizeUsage(rawUsage: Partial<FreePracticeUsage> | undefined) {
  if (!rawUsage) return createEmptyUsage();

  const completedIds = Array.isArray(rawUsage.completedIds)
    ? Array.from(
        new Set(
          rawUsage.completedIds
            .filter((id): id is string => typeof id === "string")
            .map((id) => id.trim())
            .filter(Boolean)
        )
      ).slice(0, 500)
    : [];
  const rawCount =
    typeof rawUsage.count === "number" && Number.isFinite(rawUsage.count)
      ? Math.floor(rawUsage.count)
      : completedIds.length;
  const count = Math.min(
    Math.max(rawCount, Math.min(completedIds.length, FREE_PRACTICE_GLOBAL_LIMIT)),
    FREE_PRACTICE_GLOBAL_LIMIT
  );
  const date =
    typeof rawUsage.date === "string" && rawUsage.date.trim()
      ? rawUsage.date.trim()
      : getTodayKey();

  return {
    completedIds,
    count,
    date,
  };
}

function mergeUsageRecords(usages: FreePracticeUsage[]) {
  if (usages.length === 0) return createEmptyUsage();

  const completedIds = new Set<string>();
  let count = 0;
  let date = usages[0]?.date || getTodayKey();

  for (const usage of usages) {
    for (const completedId of usage.completedIds) {
      completedIds.add(completedId);
    }
    count = Math.max(count, usage.count);
    if (!date && usage.date) date = usage.date;
  }

  return {
    completedIds: Array.from(completedIds),
    count: Math.min(
      Math.max(count, Math.min(completedIds.size, FREE_PRACTICE_GLOBAL_LIMIT)),
      FREE_PRACTICE_GLOBAL_LIMIT
    ),
    date: date || getTodayKey(),
  };
}

function readUsageFromStorageKey(key: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    return normalizeUsage(JSON.parse(raw) as Partial<FreePracticeUsage>);
  } catch {
    return null;
  }
}

function getLegacyUsageStorageKeys() {
  if (typeof window === "undefined") return [];

  const legacyKeys = new Set<string>();
  const legacyKeyPrefix = `${FREE_PRACTICE_USAGE_KEY_PREFIX}:`;

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (
        key &&
        key.startsWith(legacyKeyPrefix) &&
        key !== FREE_PRACTICE_GLOBAL_USAGE_KEY
      ) {
        legacyKeys.add(key);
      }
    }
  } catch {
    // Some storage implementations can throw while enumerating keys.
  }

  return Array.from(legacyKeys);
}

function loadFreePracticeUsage() {
  if (typeof window === "undefined") return createEmptyUsage();

  const usageRecords = [
    readUsageFromStorageKey(FREE_PRACTICE_GLOBAL_USAGE_KEY),
    ...getLegacyUsageStorageKeys().map(readUsageFromStorageKey),
  ].filter((usage): usage is FreePracticeUsage => Boolean(usage));

  const usage = mergeUsageRecords(usageRecords);
  saveFreePracticeUsage(usage);

  return usage;
}

function saveFreePracticeUsage(usage: FreePracticeUsage) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      FREE_PRACTICE_GLOBAL_USAGE_KEY,
      JSON.stringify(normalizeUsage(usage))
    );
  } catch {
    // Ignore storage failures so practice flow never crashes the page.
  }
}

function normalizeServerUsage(
  payload: FreePracticeUsageApiResponse
): ServerFreePracticeUsage {
  const usage = normalizeUsage(payload.usage);

  return {
    ...usage,
    limit: FREE_PRACTICE_GLOBAL_LIMIT,
    limitReached: usage.count >= FREE_PRACTICE_GLOBAL_LIMIT,
  };
}

export function getFreePracticeUsage(scope: FreePracticeScope): FreePracticeUsage {
  void scope;
  return loadFreePracticeUsage();
}

export function syncFreePracticeUsage(
  _scope: FreePracticeScope,
  usage: Partial<FreePracticeUsage>
) {
  const nextUsage = mergeUsageRecords([
    loadFreePracticeUsage(),
    normalizeUsage(usage),
  ]);
  saveFreePracticeUsage(nextUsage);
  return nextUsage;
}

export function hasFreePracticeCompletion(
  scope: FreePracticeScope,
  completionId: string
) {
  return getFreePracticeUsage(scope).completedIds.includes(completionId);
}

export function isFreePracticeLimitReached(scope: FreePracticeScope) {
  return getFreePracticeUsage(scope).count >= FREE_PRACTICE_GLOBAL_LIMIT;
}

export function recordFreePracticeCompletion(
  scope: FreePracticeScope,
  completionId: string
): RecordFreePracticeResult {
  const usage = getFreePracticeUsage(scope);
  const normalizedCompletionId = completionId.trim();
  const completedIds = new Set(usage.completedIds);

  if (!normalizedCompletionId || completedIds.has(normalizedCompletionId)) {
    return {
      count: usage.count,
      didRecord: false,
      limitReached: usage.count >= FREE_PRACTICE_GLOBAL_LIMIT,
    };
  }

  if (usage.count >= FREE_PRACTICE_GLOBAL_LIMIT) {
    return {
      count: usage.count,
      didRecord: false,
      limitReached: true,
    };
  }

  completedIds.add(normalizedCompletionId);

  const nextUsage = {
    completedIds: Array.from(completedIds),
    count: Math.min(usage.count + 1, FREE_PRACTICE_GLOBAL_LIMIT),
    date: usage.date,
  };

  saveFreePracticeUsage(nextUsage);

  return {
    count: nextUsage.count,
    didRecord: true,
    limitReached: nextUsage.count >= FREE_PRACTICE_GLOBAL_LIMIT,
  };
}

export async function fetchFreePracticeUsage(scope: FreePracticeScope) {
  const response = await fetch(
    `/api/free-practice/usage?scope=${encodeURIComponent(scope)}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Unable to load free practice usage");
  }

  const payload = (await response.json()) as FreePracticeUsageApiResponse;
  const usage = normalizeServerUsage(payload);
  syncFreePracticeUsage(scope, usage);
  return usage;
}

export async function recordFreePracticeCompletionOnServer(
  scope: FreePracticeScope,
  completionId: string
): Promise<RecordFreePracticeResult & { usage: ServerFreePracticeUsage }> {
  const response = await fetch("/api/free-practice/usage", {
    body: JSON.stringify({ completionId, scope }),
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to record free practice usage");
  }

  const payload = (await response.json()) as FreePracticeUsageApiResponse;
  const usage = normalizeServerUsage(payload);
  syncFreePracticeUsage(scope, usage);

  return {
    count: usage.count,
    didRecord: payload.didRecord === true,
    limitReached: usage.limitReached,
    usage,
  };
}
