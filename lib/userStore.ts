import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  logAuthDebug,
  logAuthError,
  logAuthWarning,
  sanitizeAuthLogValue,
} from "@/lib/authLogging";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getDefaultRoleForEmail,
  getEffectiveUserRole,
  normalizeUserRole,
  type UserRole,
} from "@/lib/userRoles";

export type SubscriptionStatus = "free" | "pro" | "cancels_at_period_end";

export type StoredUser = {
  displayName?: string;
  email: string;
  passwordHash: string;
  provider?: string;
  providerAccountId?: string;
  userId?: string;
  createdAt: string;
  role?: UserRole;
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
  display_name?: string | null;
  email: string;
  provider?: string | null;
  provider_account_id?: string | null;
  role?: UserRole | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: SubscriptionStatus | null;
  user_id?: string | null;
};

type OAuthIdentityRow = {
  display_name?: string | null;
  email: string;
  provider: string;
  provider_account_id: string;
  user_id: string;
};

type LocalOAuthIdentity = {
  createdAt: string;
  displayName: string;
  email: string;
  provider: string;
  providerAccountId: string;
  updatedAt: string;
  userId: string;
};

export type OAuthUserProfileInput = {
  displayName?: string | null;
  email?: string | null;
  provider: string;
  providerAccountId: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const OAUTH_IDENTITIES_FILE = path.join(DATA_DIR, "oauth-identities.json");

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
    displayName: profile.display_name || undefined,
    email: normalizeEmail(profile.email),
    passwordHash: "",
    provider: profile.provider || undefined,
    providerAccountId: profile.provider_account_id || undefined,
    role: getEffectiveUserRole(profile.email, profile.role),
    stripeCustomerId: profile.stripe_customer_id || undefined,
    stripeSubscriptionId: profile.stripe_subscription_id || undefined,
    subscriptionStatus: normalizeSubscriptionStatus(profile.subscription_status),
    userId: profile.user_id || undefined,
  };
}

function normalizeProvider(provider: string) {
  return provider.trim().toLowerCase();
}

function normalizeProviderAccountId(providerAccountId: string) {
  return providerAccountId.trim();
}

function buildOAuthUserId(provider: string, providerAccountId: string) {
  return `${normalizeProvider(provider)}:${normalizeProviderAccountId(providerAccountId)}`;
}

function providerProfileEmail(provider: string, providerAccountId: string) {
  const safeProvider = normalizeProvider(provider).replace(/[^a-z0-9]+/g, "-");
  const safeAccountId = normalizeProviderAccountId(providerAccountId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return `${safeProvider || "oauth"}-${safeAccountId || "user"}@oauth.speakflow.local`;
}

function normalizeOAuthDisplayName(
  displayName: string | null | undefined,
  email: string,
  provider: string
) {
  const normalizedDisplayName = displayName?.trim();
  if (normalizedDisplayName) return normalizedDisplayName;

  if (!email.endsWith("@oauth.speakflow.local")) {
    return email.split("@")[0] || email;
  }

  return provider === "apple" ? "Apple 用户" : "OAuth 用户";
}

function identityRowToStoredUser(row: OAuthIdentityRow): StoredUser {
  return {
    createdAt: "",
    displayName: row.display_name || undefined,
    email: normalizeEmail(row.email),
    passwordHash: "",
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    subscriptionStatus: "free",
    userId: row.user_id,
  };
}

function isMissingOAuthSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    code?: string;
    message?: string;
  };
  const message = candidate.message || "";

  return (
    candidate.code === "42703" ||
    candidate.code === "42P01" ||
    candidate.code === "PGRST204" ||
    candidate.code === "PGRST205" ||
    message.includes("user_auth_identities") ||
    message.includes("provider_account_id") ||
    message.includes("display_name")
  );
}

function isOAuthIdentityConflictError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    code?: string;
    message?: string;
  };
  const message = (candidate.message || "").toLowerCase();

  return (
    candidate.code === "23505" ||
    message.includes("duplicate key") ||
    message.includes("identity_already_exists") ||
    message.includes("user_already_exists")
  );
}

function buildOAuthStoredUser({
  displayName,
  email,
  provider,
  providerAccountId,
  userId,
}: {
  displayName: string;
  email: string;
  provider: string;
  providerAccountId: string;
  userId: string;
}): StoredUser {
  return {
    createdAt: "",
    displayName,
    email,
    passwordHash: "",
    provider,
    providerAccountId,
    role: getDefaultRoleForEmail(email),
    subscriptionStatus: "free",
    userId,
  };
}

async function findProfileByColumn(column: string, value: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "email, display_name, provider, provider_account_id, role, user_id, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end"
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

async function findProfileRoleByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .select("email, role")
      .eq("email", normalizedEmail)
      .maybeSingle<{ email: string; role?: UserRole | null }>();

    if (error) {
      return null;
    }

    return data
      ? getEffectiveUserRole(data.email, data.role)
      : getDefaultRoleForEmail(normalizedEmail);
  } catch {
    return null;
  }
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

export async function ensureOAuthUserProfile({
  displayName,
  email,
  provider,
  providerAccountId,
}: OAuthUserProfileInput) {
  const normalizedProvider = normalizeProvider(provider);
  const normalizedProviderAccountId =
    normalizeProviderAccountId(providerAccountId);

  if (!normalizedProvider || !normalizedProviderAccountId) {
    throw new Error("INVALID_OAUTH_IDENTITY");
  }

  const existingIdentity = await findSupabaseOAuthIdentity(
    normalizedProvider,
    normalizedProviderAccountId
  ).catch(() => null);
  const providerEmail = normalizeEmail(email || "");

  if (
    normalizedProvider === "apple" &&
    !existingIdentity &&
    (!providerEmail || !providerEmail.includes("@"))
  ) {
    throw new Error("APPLE_REGISTRATION_NOT_COMPLETED");
  }

  const normalizedEmail = normalizeEmail(
    existingIdentity?.email ||
      providerEmail ||
      providerProfileEmail(normalizedProvider, normalizedProviderAccountId)
  );

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("INVALID_EMAIL");
  }

  const resolvedDisplayName = normalizeOAuthDisplayName(
    displayName || existingIdentity?.displayName,
    normalizedEmail,
    normalizedProvider
  );
  const userId =
    existingIdentity?.userId ||
    buildOAuthUserId(normalizedProvider, normalizedProviderAccountId);

  try {
    const profile = await upsertSupabaseOAuthProfile({
      displayName: resolvedDisplayName,
      email: normalizedEmail,
      provider: normalizedProvider,
      providerAccountId: normalizedProviderAccountId,
      userId,
    });

    logAuthDebug("userStore.oauthProfile.supabaseUpsertSucceeded", {
      email: profile.email,
      provider: normalizedProvider,
      providerAccountId: normalizedProviderAccountId,
      userId: profile.userId,
    });

    return profile;
  } catch (error) {
    if (isMissingOAuthSchemaError(error)) {
      logAuthWarning("userStore.oauthProfile.oauthSchemaMissing", {
        email: normalizedEmail,
        error,
        provider: normalizedProvider,
        providerAccountId: normalizedProviderAccountId,
        userId,
      });

      const profile = await upsertSupabaseOAuthProfileByEmailOnly({
        displayName: resolvedDisplayName,
        email: normalizedEmail,
        provider: normalizedProvider,
        providerAccountId: normalizedProviderAccountId,
        userId,
      });

      logAuthDebug("userStore.oauthProfile.emailOnlyFallbackSucceeded", {
        email: profile.email,
        provider: normalizedProvider,
        providerAccountId: normalizedProviderAccountId,
        userId: profile.userId,
      });

      return profile;
    }

    if (isOAuthIdentityConflictError(error)) {
      logAuthError("userStore.oauthProfile.identityConflict", error, {
        email: normalizedEmail,
        provider: normalizedProvider,
        providerAccountId: normalizedProviderAccountId,
        userId,
      });
      throw new Error("OAUTH_IDENTITY_CONFLICT");
    }

    logAuthError("userStore.oauthProfile.supabaseUpsertFailed", error, {
      email: normalizedEmail,
      provider: normalizedProvider,
      providerAccountId: normalizedProviderAccountId,
      userId,
    });

    return ensureLocalOAuthUserProfile({
      displayName: resolvedDisplayName,
      email: normalizedEmail,
      provider: normalizedProvider,
      providerAccountId: normalizedProviderAccountId,
    })
      .then((profile) => {
        logAuthWarning("userStore.oauthProfile.localFallbackSucceeded", {
          email: profile.email,
          provider: normalizedProvider,
          providerAccountId: normalizedProviderAccountId,
          userId: profile.userId,
        });

        return profile;
      })
      .catch((fallbackError) => {
        logAuthError(
          "userStore.oauthProfile.localFallbackFailed",
          fallbackError,
          {
            email: normalizedEmail,
            provider: normalizedProvider,
            providerAccountId: normalizedProviderAccountId,
            userId,
          }
        );

        return buildOAuthStoredUser({
          displayName: resolvedDisplayName,
          email: normalizedEmail,
          provider: normalizedProvider,
          providerAccountId: normalizedProviderAccountId,
          userId,
        });
      });
  }
}

async function ensureOAuthIdentityStore() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(OAUTH_IDENTITIES_FILE, "utf8");
  } catch {
    await writeFile(OAUTH_IDENTITIES_FILE, "[]", "utf8");
  }
}

async function loadLocalOAuthIdentities() {
  await ensureOAuthIdentityStore();
  const raw = await readFile(OAUTH_IDENTITIES_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as LocalOAuthIdentity[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLocalOAuthIdentities(identities: LocalOAuthIdentity[]) {
  await ensureOAuthIdentityStore();
  await writeFile(
    OAUTH_IDENTITIES_FILE,
    JSON.stringify(identities, null, 2),
    "utf8"
  );
}

async function findSupabaseOAuthIdentity(
  provider: string,
  providerAccountId: string
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_auth_identities")
    .select("user_id, email, display_name, provider, provider_account_id")
    .eq("provider", provider)
    .eq("provider_account_id", providerAccountId)
    .maybeSingle<OAuthIdentityRow>();

  if (error) {
    throw error;
  }

  return data ? identityRowToStoredUser(data) : null;
}

async function upsertSupabaseOAuthProfile({
  displayName,
  email,
  provider,
  providerAccountId,
  userId,
}: {
  displayName: string;
  email: string;
  provider: string;
  providerAccountId: string;
  userId: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        display_name: displayName,
        email,
        provider,
        provider_account_id: providerAccountId,
        user_id: userId,
      },
      { onConflict: "email" }
    );

  console.log(
    "[auth][supabase.profiles.upsert]",
    sanitizeAuthLogValue({
      data: {
        email,
        provider,
        providerAccountId,
        userId,
      },
      error: profileError,
    })
  );

  if (profileError) {
    throw profileError;
  }

  const { error: identityError } = await supabase
    .from("user_auth_identities")
    .upsert(
      {
        display_name: displayName,
        email,
        provider,
        provider_account_id: providerAccountId,
        user_id: userId,
      },
      { onConflict: "provider,provider_account_id" }
    );

  console.log(
    "[auth][supabase.user_auth_identities.upsert]",
    sanitizeAuthLogValue({
      data: {
        email,
        provider,
        providerAccountId,
        userId,
      },
      error: identityError,
    })
  );

  if (identityError) {
    throw identityError;
  }

  const profile = await findProfileByEmail(email).catch(() => null);

  return {
    ...buildOAuthStoredUser({
      displayName,
      email,
      provider,
      providerAccountId,
      userId,
    }),
    cancelAtPeriodEnd: profile?.cancelAtPeriodEnd,
    currentPeriodEnd: profile?.currentPeriodEnd,
    role: profile?.role || (await getUserRoleByEmail(email)),
    stripeCustomerId: profile?.stripeCustomerId,
    stripeSubscriptionId: profile?.stripeSubscriptionId,
    subscriptionStatus: profile?.subscriptionStatus || "free",
  };
}

async function upsertSupabaseOAuthProfileByEmailOnly({
  displayName,
  email,
  provider,
  providerAccountId,
  userId,
}: {
  displayName: string;
  email: string;
  provider: string;
  providerAccountId: string;
  userId: string;
}) {
  const existingProfile = await findProfileByEmail(email).catch(() => null);
  const profile =
    existingProfile ||
    (await upsertProfileSubscriptionByEmail(email, {
      subscriptionStatus: "free",
    }).catch(() => null));

  return {
    ...buildOAuthStoredUser({
      displayName,
      email,
      provider,
      providerAccountId,
      userId,
    }),
    cancelAtPeriodEnd: profile?.cancelAtPeriodEnd,
    currentPeriodEnd: profile?.currentPeriodEnd,
    role: profile?.role || (await getUserRoleByEmail(email)),
    stripeCustomerId: profile?.stripeCustomerId,
    stripeSubscriptionId: profile?.stripeSubscriptionId,
    subscriptionStatus: profile?.subscriptionStatus || "free",
  };
}

async function ensureLocalOAuthUserProfile({
  displayName,
  email,
  provider,
  providerAccountId,
}: {
  displayName: string;
  email: string;
  provider: string;
  providerAccountId: string;
}) {
  const identities = await loadLocalOAuthIdentities();
  const existingIdentity =
    identities.find(
      (identity) =>
        identity.provider === provider &&
        identity.providerAccountId === providerAccountId
    ) || null;
  const now = new Date().toISOString();
  const identity: LocalOAuthIdentity = existingIdentity
    ? {
        ...existingIdentity,
        displayName: displayName || existingIdentity.displayName,
        email: existingIdentity.email || email,
        updatedAt: now,
      }
    : {
        createdAt: now,
        displayName,
        email,
        provider,
        providerAccountId,
        updatedAt: now,
        userId: buildOAuthUserId(provider, providerAccountId),
      };

  if (existingIdentity) {
    const index = identities.indexOf(existingIdentity);
    identities[index] = identity;
  } else {
    identities.push(identity);
  }

  await saveLocalOAuthIdentities(identities);
  const user = await ensureLocalPasswordlessUser(identity.email);

  return {
    ...user,
    displayName: identity.displayName,
    email: identity.email,
    provider,
    providerAccountId,
    userId: identity.userId,
  };
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
    role: getDefaultRoleForEmail(normalizedEmail),
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
    role: getDefaultRoleForEmail(normalizedEmail),
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

export async function getUserRoleByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return "user";

  const profileRole = await findProfileRoleByEmail(normalizedEmail);
  if (profileRole) return profileRole;

  const users = await loadUsers().catch(() => []);
  const localUser =
    users.find((user) => user.email === normalizedEmail) || null;

  return localUser
    ? getEffectiveUserRole(normalizedEmail, normalizeUserRole(localUser.role))
    : getDefaultRoleForEmail(normalizedEmail);
}

export async function updateUserSubscriptionByEmail(
  email: string,
  data: UserSubscriptionUpdate
) {
  return upsertProfileSubscriptionByEmail(email, data);
}
