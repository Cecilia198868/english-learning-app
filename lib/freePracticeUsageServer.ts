import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  FREE_PRACTICE_DAILY_LIMIT,
  type FreePracticeScope,
  type FreePracticeUsage,
} from "@/lib/freePracticeLimit";

type StoredFreePracticeUsage = FreePracticeUsage & {
  updatedAt: string;
};

type UsageFileStore = Record<
  string,
  Record<string, StoredFreePracticeUsage>
>;

type UsageRow = {
  usage: unknown;
  user_key: string;
};

export type ServerFreePracticeUsage = FreePracticeUsage & {
  limit: number;
  limitReached: boolean;
};

export type ServerRecordFreePracticeResult = ServerFreePracticeUsage & {
  didRecord: boolean;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const USAGE_FILE = path.join(DATA_DIR, "free-practice-usage.json");
const GLOBAL_USAGE_KEY = "global";
const COURSE_SCOPE_PATTERN = /^course:[A-Za-z0-9._-]{1,120}$/;
const staticScopes = new Set<FreePracticeScope>([
  "free",
  "guided",
  "classic",
  "course",
  "sentence-pattern",
  "expression",
  "native-flow",
  "new-expression",
]);

export function normalizeFreePracticeScope(
  value: unknown
): FreePracticeScope | null {
  if (typeof value !== "string") return null;
  const scope = value.trim();

  if (staticScopes.has(scope as FreePracticeScope)) {
    return scope as FreePracticeScope;
  }

  return COURSE_SCOPE_PATTERN.test(scope)
    ? (scope as FreePracticeScope)
    : null;
}

export function createFreePracticeGuestKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    forwardedFor.split(",")[0]?.trim() ||
    "unknown-ip";
  const userAgent = request.headers.get("user-agent") || "unknown-ua";
  const acceptLanguage =
    request.headers.get("accept-language") || "unknown-language";
  const digest = createHash("sha256")
    .update(`${ip}|${userAgent}|${acceptLanguage}`)
    .digest("hex")
    .slice(0, 32);

  return `guest:${digest}`;
}

function getTodayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Los_Angeles",
    year: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
}

function createEmptyUsage(): StoredFreePracticeUsage {
  return {
    completedIds: [],
    count: 0,
    date: getTodayKey(),
    updatedAt: new Date().toISOString(),
  };
}

function cleanUsage(rawUsage: unknown): StoredFreePracticeUsage {
  if (!rawUsage || typeof rawUsage !== "object") return createEmptyUsage();

  const record = rawUsage as Partial<StoredFreePracticeUsage>;
  const usageDate =
    typeof record.date === "string" && record.date.trim()
      ? record.date.trim()
      : getTodayKey();

  const completedIds = Array.isArray(record.completedIds)
    ? Array.from(
        new Set(
          record.completedIds
            .filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
            .map((id) => id.trim())
        )
      ).slice(0, 500)
    : [];
  const count =
    typeof record.count === "number" && Number.isFinite(record.count)
      ? Math.min(
          Math.max(Math.floor(record.count), completedIds.length),
          FREE_PRACTICE_DAILY_LIMIT
        )
      : Math.min(completedIds.length, FREE_PRACTICE_DAILY_LIMIT);
  const updatedAt =
    typeof record.updatedAt === "string" && Number.isFinite(Date.parse(record.updatedAt))
      ? record.updatedAt
      : new Date().toISOString();

  return {
    completedIds,
    count,
    date: usageDate,
    updatedAt,
  };
}

function cleanUsageByScope(
  rawUsageByScope: unknown
): Record<string, StoredFreePracticeUsage> {
  const usageByScope: Record<string, StoredFreePracticeUsage> = {};
  if (!rawUsageByScope || typeof rawUsageByScope !== "object") {
    return usageByScope;
  }

  for (const [scopeKey, rawUsage] of Object.entries(
    rawUsageByScope as Record<string, unknown>
  )) {
    const scope = normalizeFreePracticeScope(scopeKey);
    if (scope || scopeKey === GLOBAL_USAGE_KEY) {
      usageByScope[scope || GLOBAL_USAGE_KEY] = cleanUsage(rawUsage);
    }
  }

  return usageByScope;
}

function mergeUsageByScope(
  usageByScope: Record<string, StoredFreePracticeUsage>
): StoredFreePracticeUsage {
  const usageEntries = Object.values(usageByScope).map(cleanUsage);
  if (usageEntries.length === 0) return createEmptyUsage();

  const completedIds = new Set<string>();
  let count = 0;
  let date = usageEntries[0]?.date || getTodayKey();
  let updatedAt = usageEntries[0]?.updatedAt || new Date().toISOString();

  for (const usage of usageEntries) {
    for (const completedId of usage.completedIds) {
      completedIds.add(completedId);
    }
    count = Math.max(count, usage.count);
    if (Date.parse(usage.updatedAt) > Date.parse(updatedAt)) {
      updatedAt = usage.updatedAt;
    }
    if (!date && usage.date) date = usage.date;
  }

  return {
    completedIds: Array.from(completedIds),
    count: Math.min(
      Math.max(count, Math.min(completedIds.size, FREE_PRACTICE_DAILY_LIMIT)),
      FREE_PRACTICE_DAILY_LIMIT
    ),
    date: date || getTodayKey(),
    updatedAt,
  };
}

function toServerUsage(usage: StoredFreePracticeUsage): ServerFreePracticeUsage {
  return {
    completedIds: usage.completedIds,
    count: usage.count,
    date: usage.date,
    limit: FREE_PRACTICE_DAILY_LIMIT,
    limitReached: usage.count >= FREE_PRACTICE_DAILY_LIMIT,
  };
}

async function ensureFileStoreDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readFileStore(): Promise<UsageFileStore> {
  let raw = "{}";

  try {
    raw = await readFile(USAGE_FILE, "utf8");
  } catch {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const store: UsageFileStore = {};
    for (const [userKey, rawUsageByScope] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      store[userKey] = cleanUsageByScope(rawUsageByScope);
    }

    return store;
  } catch {
    return {};
  }
}

async function writeFileStore(store: UsageFileStore) {
  await ensureFileStoreDir();
  await writeFile(USAGE_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function loadCloudUsage(
  userKey: string
): Promise<Record<string, StoredFreePracticeUsage> | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_free_practice_usage")
    .select("user_key, usage")
    .eq("user_key", userKey)
    .maybeSingle<UsageRow>();

  if (error) throw error;

  return data && data.usage && typeof data.usage === "object"
    ? cleanUsageByScope(data.usage)
    : null;
}

async function saveCloudUsage(
  userKey: string,
  usageByScope: Record<string, StoredFreePracticeUsage>
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("user_free_practice_usage").upsert(
    {
      updated_at: new Date().toISOString(),
      usage: usageByScope,
      user_key: userKey,
    },
    { onConflict: "user_key" }
  );

  if (error) throw error;
}

async function loadStoredUsageByScope(userKey: string) {
  try {
    const cloudUsage = await loadCloudUsage(userKey);
    if (cloudUsage) return cloudUsage;
  } catch {
    // Fall back to the local backend store when Supabase is not configured.
  }

  const store = await readFileStore();
  return store[userKey] || {};
}

async function saveStoredUsageByScope(
  userKey: string,
  usageByScope: Record<string, StoredFreePracticeUsage>
) {
  try {
    await saveCloudUsage(userKey, usageByScope);
  } catch {
    // Local backend fallback keeps the guard working without the optional table.
  }

  const store = await readFileStore();
  store[userKey] = usageByScope;
  await writeFileStore(store);
}

export async function getServerFreePracticeUsage(
  userKey: string,
  scope: FreePracticeScope
) {
  void scope;
  const usageByScope = await loadStoredUsageByScope(userKey);
  return toServerUsage(mergeUsageByScope(usageByScope));
}

export async function recordServerFreePracticeCompletion(
  userKey: string,
  scope: FreePracticeScope,
  completionId: string
): Promise<ServerRecordFreePracticeResult> {
  void scope;
  const usageByScope = await loadStoredUsageByScope(userKey);
  const usage = mergeUsageByScope(usageByScope);
  const completedIds = new Set(usage.completedIds);

  if (completedIds.has(completionId)) {
    return {
      ...toServerUsage(usage),
      didRecord: false,
    };
  }

  if (usage.count >= FREE_PRACTICE_DAILY_LIMIT) {
    return {
      ...toServerUsage(usage),
      didRecord: false,
    };
  }

  completedIds.add(completionId);
  const nextUsage: StoredFreePracticeUsage = {
    completedIds: Array.from(completedIds),
    count: Math.min(usage.count + 1, FREE_PRACTICE_DAILY_LIMIT),
    date: usage.date,
    updatedAt: new Date().toISOString(),
  };

  await saveStoredUsageByScope(userKey, { [GLOBAL_USAGE_KEY]: nextUsage });

  return {
    ...toServerUsage(nextUsage),
    didRecord: true,
  };
}
