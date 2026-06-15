import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type LearningHomeContinueStudy = {
  categoryLabel: string;
  completed: number;
  href: string;
  statusLabel: string;
  title: string;
  total: number;
  updatedAt: string;
};

export type LearningHomeProgressSnapshot = {
  continueStudy: LearningHomeContinueStudy | null;
};

type StoredLearningHomeProgress = LearningHomeProgressSnapshot & {
  updatedAt: string;
  userKey: string;
};

type ProgressFileStore = Record<string, StoredLearningHomeProgress>;

type ProgressRow = {
  progress: unknown;
  user_key: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const PROGRESS_FILE = path.join(DATA_DIR, "learning-home-progress.json");

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 160)
    : fallback;
}

function cleanHref(value: unknown) {
  const href = cleanText(value, "/start");
  return href.startsWith("/") && !href.startsWith("//") ? href : "/start";
}

function cleanDate(value: unknown) {
  if (typeof value !== "string") return "";

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? value : "";
}

function cleanCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

export function normalizeLearningHomeContinueStudy(
  rawContinueStudy: unknown
): LearningHomeContinueStudy | null {
  if (!rawContinueStudy || typeof rawContinueStudy !== "object") return null;

  const record = rawContinueStudy as Partial<LearningHomeContinueStudy>;
  const title = cleanText(record.title);
  if (!title) return null;

  const total = cleanCount(record.total);
  const completed = total > 0 ? Math.min(cleanCount(record.completed), total) : 0;
  const updatedAt = cleanDate(record.updatedAt) || new Date().toISOString();

  return {
    categoryLabel: cleanText(record.categoryLabel, "学习记录"),
    completed,
    href: cleanHref(record.href),
    statusLabel: cleanText(record.statusLabel, completed > 0 ? "进行中" : "暂无记录"),
    title,
    total,
    updatedAt,
  };
}

function createEmptyProgress(userKey: string): StoredLearningHomeProgress {
  return {
    continueStudy: null,
    updatedAt: new Date().toISOString(),
    userKey,
  };
}

function normalizeProgress(
  userKey: string,
  rawProgress: unknown
): StoredLearningHomeProgress {
  if (!rawProgress || typeof rawProgress !== "object") {
    return createEmptyProgress(userKey);
  }

  const record = rawProgress as Partial<StoredLearningHomeProgress>;
  const continueStudy = normalizeLearningHomeContinueStudy(record.continueStudy);

  return {
    continueStudy,
    updatedAt:
      cleanDate(record.updatedAt) ||
      continueStudy?.updatedAt ||
      new Date().toISOString(),
    userKey,
  };
}

async function ensureFileStoreDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readFileStore() {
  let raw = "{}";

  try {
    raw = await readFile(PROGRESS_FILE, "utf8");
  } catch {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as ProgressFileStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeFileStore(store: ProgressFileStore) {
  await ensureFileStoreDir();
  await writeFile(PROGRESS_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function loadCloudProgress(userKey: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_learning_home_progress")
    .select("user_key, progress")
    .eq("user_key", userKey)
    .maybeSingle<ProgressRow>();

  if (error) throw error;

  return data ? normalizeProgress(userKey, data.progress) : null;
}

async function saveCloudProgress(progress: StoredLearningHomeProgress) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("user_learning_home_progress").upsert(
    {
      progress,
      updated_at: progress.updatedAt,
      user_key: progress.userKey,
    },
    { onConflict: "user_key" }
  );

  if (error) throw error;
}

async function loadStoredProgress(userKey: string) {
  try {
    const cloudProgress = await loadCloudProgress(userKey);
    if (cloudProgress) return cloudProgress;
  } catch {
    // Keep the homepage usable when the optional cloud table is not present.
  }

  const store = await readFileStore();
  return normalizeProgress(userKey, store[userKey]);
}

async function saveStoredProgress(progress: StoredLearningHomeProgress) {
  try {
    await saveCloudProgress(progress);
  } catch {
    // Local backend fallback mirrors the existing progress-storage pattern.
  }

  const store = await readFileStore();
  store[progress.userKey] = progress;
  await writeFileStore(store);
}

function snapshotFromStoredProgress(
  progress: StoredLearningHomeProgress
): LearningHomeProgressSnapshot {
  return {
    continueStudy: progress.continueStudy,
  };
}

export async function getLearningHomeProgress(userKey: string) {
  const progress = await loadStoredProgress(userKey);
  return snapshotFromStoredProgress(progress);
}

export async function recordLearningHomeContinueStudy(
  userKey: string,
  rawContinueStudy: unknown
) {
  const continueStudy = normalizeLearningHomeContinueStudy(rawContinueStudy);
  const progress = await loadStoredProgress(userKey);
  const updatedAt = continueStudy?.updatedAt || new Date().toISOString();

  progress.continueStudy = continueStudy;
  progress.updatedAt = updatedAt;

  await saveStoredProgress(progress);
  return snapshotFromStoredProgress(progress);
}
