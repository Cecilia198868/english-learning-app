import { createHash, randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PasswordlessChannel = "email" | "phone";

type PasswordlessCodeRecord = {
  channel: PasswordlessChannel;
  codeHash: string;
  createdAt: string;
  expiresAt: string;
  target: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const CODES_FILE = path.join(DATA_DIR, "passwordless-codes.json");
const CODE_TTL_MS = 10 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(countryCode: string, phone: string) {
  const cleanCountryCode = countryCode.trim().replace(/[^\d+]/g, "");
  const cleanPhone = phone.trim().replace(/[^\d]/g, "");
  const prefix = cleanCountryCode.startsWith("+")
    ? cleanCountryCode
    : `+${cleanCountryCode || "1"}`;

  return `${prefix}${cleanPhone}`;
}

export function normalizePasswordlessTarget(
  channel: PasswordlessChannel,
  value: string,
  countryCode = ""
) {
  return channel === "email"
    ? normalizeEmail(value)
    : normalizePhone(countryCode, value);
}

function hashCode(channel: PasswordlessChannel, target: string, code: string) {
  const secret = process.env.NEXTAUTH_SECRET || "dev-only-nextauth-secret-change-me";
  return createHash("sha256")
    .update(`${secret}:${channel}:${target}:${code}`)
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

export function validatePasswordlessTarget(
  channel: PasswordlessChannel,
  target: string
) {
  if (channel === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
  }

  return /^\+\d{7,16}$/.test(target);
}

export async function createPasswordlessCode(
  channel: PasswordlessChannel,
  target: string
) {
  if (!validatePasswordlessTarget(channel, target)) {
    throw new Error("INVALID_TARGET");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = Date.now();
  const records = (await loadRecords()).filter(
    (record) =>
      !(record.channel === channel && record.target === target) &&
      new Date(record.expiresAt).getTime() > now
  );

  records.push({
    channel,
    codeHash: hashCode(channel, target, code),
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

export async function consumePasswordlessCode(
  channel: PasswordlessChannel,
  target: string,
  code: string
) {
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) return false;

  const now = Date.now();
  const records = await loadRecords();
  const matchingRecord = records.find(
    (record) =>
      record.channel === channel &&
      record.target === target &&
      new Date(record.expiresAt).getTime() > now &&
      record.codeHash === hashCode(channel, target, normalizedCode)
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
        !(
          record.channel === matchingRecord.channel &&
          record.target === matchingRecord.target
        ) && new Date(record.expiresAt).getTime() > now
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
