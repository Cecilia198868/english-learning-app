import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredUser = {
  email: string;
  passwordHash: string;
  createdAt: string;
  subscriptionStatus?: "free" | "pro" | "cancels_at_period_end";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
};

export type UserSubscriptionUpdate = Pick<
  StoredUser,
  | "currentPeriodEnd"
  | "stripeCustomerId"
  | "stripeSubscriptionId"
  | "subscriptionStatus"
>;

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const inputHash = scryptSync(password, salt, 64);
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (inputHash.length !== storedHashBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputHash, storedHashBuffer);
}

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(USERS_FILE, "utf8");
  } catch {
    await writeFile(USERS_FILE, "[]", "utf8");
  }
}

export async function loadUsers() {
  await ensureStore();
  const raw = await readFile(USERS_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function findUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const users = await loadUsers();
  return users.find((user) => user.email === normalizedEmail) || null;
}

export async function findUserByStripeCustomerId(stripeCustomerId: string) {
  const normalizedStripeCustomerId = stripeCustomerId.trim();
  if (!normalizedStripeCustomerId) return null;

  const users = await loadUsers();
  return (
    users.find((user) => user.stripeCustomerId === normalizedStripeCustomerId) ||
    null
  );
}

export async function createUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const users = await loadUsers();

  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("USER_EXISTS");
  }

  const nextUser: StoredUser = {
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(nextUser);
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");

  return nextUser;
}

export async function validateUserPassword(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  return verifyPassword(password, user.passwordHash) ? user : null;
}

export async function updateUserSubscriptionByEmail(
  email: string,
  data: UserSubscriptionUpdate
) {
  const normalizedEmail = normalizeEmail(email);
  const users = await loadUsers();
  const userIndex = users.findIndex((user) => user.email === normalizedEmail);
  const existingUser =
    userIndex === -1
      ? {
          createdAt: new Date().toISOString(),
          email: normalizedEmail,
          passwordHash: "",
        }
      : users[userIndex];

  const updatedUser: StoredUser = {
    ...existingUser,
    currentPeriodEnd: data.currentPeriodEnd,
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    subscriptionStatus: data.subscriptionStatus,
  };

  if (userIndex === -1) {
    users.push(updatedUser);
  } else {
    users[userIndex] = updatedUser;
  }

  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");

  return updatedUser;
}
