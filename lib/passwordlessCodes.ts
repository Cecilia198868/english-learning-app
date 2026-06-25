import { createHash, randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type PasswordlessCodeRecord = {
  codeHash: string;
  createdAt: string;
  expiresAt: string;
  target: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const CODES_FILE = path.join(DATA_DIR, "passwordless-codes.json");
const CODE_TTL_MS = 10 * 60 * 1000;

export function normalizePasswordlessEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashCode(target: string, code: string) {
  const secret = process.env.NEXTAUTH_SECRET || "dev-only-nextauth-secret-change-me";
  return createHash("sha256")
    .update(`${secret}:email:${target}:${code}`)
    .digest("hex");
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(CODES_FILE, "utf8");
  } catch {
    await writeFile(CODES_FILE, "[]", "utf8");
  }
}

async function loadRecords() {
  await ensureStore();
  const raw = await readFile(CODES_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as PasswordlessCodeRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveRecords(records: PasswordlessCodeRecord[]) {
  await ensureStore();
  await writeFile(CODES_FILE, JSON.stringify(records, null, 2), "utf8");
}

export function validatePasswordlessEmail(target: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
}

export async function createPasswordlessCode(target: string) {
  if (!validatePasswordlessEmail(target)) {
    throw new Error("INVALID_EMAIL");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = Date.now();
  const records = (await loadRecords()).filter(
    (record) =>
      record.target !== target && new Date(record.expiresAt).getTime() > now
  );

  records.push({
    codeHash: hashCode(target, code),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
    target,
  });

  await saveRecords(records);

  return {
    code,
    expiresAt: new Date(now + CODE_TTL_MS).toISOString(),
  };
}

export async function consumePasswordlessCode(target: string, code: string) {
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) return false;

  const now = Date.now();
  const records = await loadRecords();
  const matchingRecord = records.find(
    (record) =>
      record.target === target &&
      new Date(record.expiresAt).getTime() > now &&
      record.codeHash === hashCode(target, normalizedCode)
  );

  if (!matchingRecord) {
    await saveRecords(
      records.filter((record) => new Date(record.expiresAt).getTime() > now)
    );
    return false;
  }

  await saveRecords(
    records.filter(
      (record) =>
        record.target !== matchingRecord.target &&
        new Date(record.expiresAt).getTime() > now
    )
  );

  return true;
}

export function shouldExposePasswordlessCode() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.PASSWORDLESS_DEBUG_CODES === "1"
  );
}
