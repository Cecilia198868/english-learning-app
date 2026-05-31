import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type SubscriptionStatus = "free" | "pro" | "cancels_at_period_end";

export type StoredUser = {
  email: string;
  passwordHash: string;
  createdAt: string;
  subscriptionStatus?: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
};

export type UserSubscriptionUpdate = {
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
};

type ProfileRow = {
  cancel_at_period_end?: boolean | null;
  current_period_end?: string | null;
  email: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: SubscriptionStatus | null;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeSubscriptionStatus(
  subscriptionStatus: unknown
): SubscriptionStatus {
  return subscriptionStatus === "pro" ||
    subscriptionStatus === "cancels_at_period_end"
    ? subscriptionStatus
    : "free";
}

function profileToStoredUser(profile: ProfileRow): StoredUser {
  return {
    cancelAtPeriodEnd: Boolean(profile.cancel_at_period_end),
    createdAt: "",
    currentPeriodEnd: profile.current_period_end || undefined,
    email: normalizeEmail(profile.email),
    passwordHash: "",
    stripeCustomerId: profile.stripe_customer_id || undefined,
    stripeSubscriptionId: profile.stripe_subscription_id || undefined,
    subscriptionStatus: normalizeSubscriptionStatus(profile.subscription_status),
  };
}

async function findProfileByColumn(column: string, value: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "email, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end"
    )
    .eq(column, value)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return data ? profileToStoredUser(data) : null;
}

export async function findProfileByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return findProfileByColumn("email", normalizedEmail);
}

export async function findProfileByStripeCustomerId(stripeCustomerId: string) {
  const normalizedStripeCustomerId = stripeCustomerId.trim();
  if (!normalizedStripeCustomerId) return null;

  return findProfileByColumn("stripe_customer_id", normalizedStripeCustomerId);
}

export async function upsertProfileSubscriptionByEmail(
  email: string,
  data: UserSubscriptionUpdate
) {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseAdmin();
  const cancelAtPeriodEnd =
    data.cancelAtPeriodEnd ??
    data.subscriptionStatus === "cancels_at_period_end";

  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(
      {
        cancel_at_period_end: cancelAtPeriodEnd,
        current_period_end: data.currentPeriodEnd || null,
        email: normalizedEmail,
        stripe_customer_id: data.stripeCustomerId || null,
        stripe_subscription_id: data.stripeSubscriptionId || null,
        subscription_status: data.subscriptionStatus,
      },
      { onConflict: "email" }
    )
    .select(
      "email, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end"
    )
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return profileToStoredUser(profile);
}

export async function upsertProfileStripeCustomerByEmail(
  email: string,
  stripeCustomerId: string
) {
  const normalizedEmail = normalizeEmail(email);
  const existingProfile = await findProfileByEmail(normalizedEmail).catch(
    () => null
  );
  const supabase = getSupabaseAdmin();

  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(
      {
        cancel_at_period_end: existingProfile?.cancelAtPeriodEnd ?? false,
        current_period_end: existingProfile?.currentPeriodEnd || null,
        email: normalizedEmail,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: existingProfile?.stripeSubscriptionId || null,
        subscription_status: existingProfile?.subscriptionStatus || "free",
      },
      { onConflict: "email" }
    )
    .select(
      "email, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end"
    )
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return profileToStoredUser(profile);
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
  const storedUser = users.find((user) => user.email === normalizedEmail) || null;
  const profile = await findProfileByEmail(normalizedEmail).catch(() => null);

  if (!storedUser) {
    return profile;
  }

  return {
    ...storedUser,
    cancelAtPeriodEnd: profile?.cancelAtPeriodEnd,
    currentPeriodEnd: profile?.currentPeriodEnd,
    stripeCustomerId: profile?.stripeCustomerId,
    stripeSubscriptionId: profile?.stripeSubscriptionId,
    subscriptionStatus: profile?.subscriptionStatus,
  };
}

export async function findUserByStripeCustomerId(stripeCustomerId: string) {
  return findProfileByStripeCustomerId(stripeCustomerId);
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

async function ensureLocalPasswordlessUser(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const users = await loadUsers();
  const existingUser =
    users.find((user) => user.email === normalizedEmail) || null;

  if (existingUser) return existingUser;

  const nextUser: StoredUser = {
    email: normalizedEmail,
    passwordHash: "",
    createdAt: new Date().toISOString(),
    subscriptionStatus: "free",
  };

  users.push(nextUser);
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");

  return nextUser;
}

export async function ensurePasswordlessUserProfile(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("INVALID_EMAIL");
  }

  const existingProfile = await findProfileByEmail(normalizedEmail).catch(
    () => null
  );

  if (existingProfile) {
    return existingProfile;
  }

  try {
    return await upsertProfileSubscriptionByEmail(normalizedEmail, {
      subscriptionStatus: "free",
    });
  } catch {
    return ensureLocalPasswordlessUser(normalizedEmail);
  }
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
  return upsertProfileSubscriptionByEmail(email, data);
}
