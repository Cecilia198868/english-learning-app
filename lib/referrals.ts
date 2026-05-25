import { createHmac, randomBytes } from "node:crypto";
import { createNotificationIfMissing } from "@/lib/notifications";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const INVITEE_SIGNUP_BONUS_DAYS = 7;
export const INVITER_PAID_REWARD_DAYS = 30;

export type ReferralAccountState = {
  available: boolean;
  bonusProUntil: string | null;
  inviteLink: string;
  invitedCount: number;
  paidRewardCount: number;
  referralCode: string;
  referredByEmail: string | null;
  signupBonusUntil: string | null;
};

type SupabaseErrorLike = {
  code?: string;
  details?: string;
  message?: string;
};

type ReferralProfileRow = {
  bonus_pro_until?: string | null;
  current_period_end?: string | null;
  email: string;
  referral_code?: string | null;
  referred_by_email?: string | null;
};

type ReferralRow = {
  created_at?: string | null;
  id: string;
  invitee_bonus_until?: string | null;
  invitee_email: string;
  inviter_email: string;
  inviter_rewarded_at?: string | null;
};

type ReferralLedgerKind =
  | "invitee_registered"
  | "invitee_signup_bonus"
  | "inviter_paid_reward";

type ReferralLedgerRecord = {
  awardedAt?: string;
  bonusProUntil?: string | null;
  inviteeEmail?: string;
  inviterEmail?: string;
  kind: ReferralLedgerKind;
  referralCode?: string;
  stripeSubscriptionId?: string;
};

type ReferralLedgerRow = {
  created_at: string;
  id: string;
  message: string;
  title: string;
  type: string;
  user_email: string;
};

const REFERRAL_LEDGER_TITLE = "__speakflow_internal:referral";
const SIGNED_REFERRAL_CODE_VERSION = "SFV1";
const INVITEE_SIGNUP_REWARD_NOTIFICATION = {
  message:
    "你通过好友邀请注册，已获得 7 天 SpeakFlow Pro 体验。",
  title: "欢迎奖励已到账",
} as const;
const INVITER_PAID_REWARD_NOTIFICATION = {
  message:
    "你的好友已成功订阅 SpeakFlow Pro。你已获得 30 天 Pro 奖励。",
  title: "邀请奖励已到账",
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeReferralCode(referralCode?: string | null) {
  return (referralCode || "")
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .slice(0, 160);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString();
}

function futureIso(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  return date.getTime() > Date.now() ? value : null;
}

function laterIso(left?: string | null, right?: string | null) {
  const leftTime = left ? new Date(left).getTime() : Number.NaN;
  const rightTime = right ? new Date(right).getTime() : Number.NaN;

  if (!Number.isFinite(leftTime)) return right || null;
  if (!Number.isFinite(rightTime)) return left || null;

  return leftTime >= rightTime ? left || null : right || null;
}

function getReferralSigningSecret() {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "speakflow-referral-code-v1"
  );
}

function createReferralSignature(email: string) {
  return createHmac("sha256", getReferralSigningSecret())
    .update(email)
    .digest("base64url")
    .slice(0, 18);
}

function createSignedReferralCode(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const encodedEmail = Buffer.from(normalizedEmail, "utf8").toString(
    "base64url"
  );

  return `${SIGNED_REFERRAL_CODE_VERSION}.${encodedEmail}.${createReferralSignature(
    normalizedEmail
  )}`;
}

function getEmailFromSignedReferralCode(referralCode: string) {
  const [version, encodedEmail, signature] = normalizeReferralCode(
    referralCode
  ).split(".");

  if (version !== SIGNED_REFERRAL_CODE_VERSION || !encodedEmail || !signature) {
    return "";
  }

  try {
    const email = normalizeEmail(
      Buffer.from(encodedEmail, "base64url").toString("utf8")
    );

    return email && createReferralSignature(email) === signature ? email : "";
  } catch {
    return "";
  }
}

function parseReferralLedgerRecord(row: ReferralLedgerRow) {
  if (row.title !== REFERRAL_LEDGER_TITLE) return null;

  try {
    const parsed = JSON.parse(row.message) as ReferralLedgerRecord;

    if (
      parsed.kind === "invitee_registered" ||
      parsed.kind === "invitee_signup_bonus" ||
      parsed.kind === "inviter_paid_reward"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function uniqueCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

async function listReferralLedgerRecords(userEmail: string) {
  const normalizedEmail = normalizeEmail(userEmail);
  if (!normalizedEmail) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_email, title, message, type, created_at")
    .eq("user_email", normalizedEmail)
    .eq("type", "system")
    .eq("title", REFERRAL_LEDGER_TITLE)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data || []) as ReferralLedgerRow[])
    .map((row) => parseReferralLedgerRecord(row))
    .filter((record): record is ReferralLedgerRecord => Boolean(record));
}

async function createReferralLedgerRecord(
  userEmail: string,
  record: ReferralLedgerRecord
) {
  const normalizedEmail = normalizeEmail(userEmail);
  if (!normalizedEmail) return;

  const existingRecords = await listReferralLedgerRecords(normalizedEmail);
  const isDuplicate = existingRecords.some((existingRecord) => {
    if (existingRecord.kind !== record.kind) return false;

    if (record.kind === "invitee_signup_bonus") return true;

    return (
      normalizeEmail(existingRecord.inviteeEmail || "") ===
      normalizeEmail(record.inviteeEmail || "")
    );
  });

  if (isDuplicate) return;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("notifications").insert({
    is_read: true,
    message: JSON.stringify(record),
    title: REFERRAL_LEDGER_TITLE,
    type: "system",
    user_email: normalizedEmail,
  });

  if (error) {
    throw error;
  }
}

async function getLedgerBonusProUntilForEmail(email: string) {
  const records = await listReferralLedgerRecords(email);

  return records.reduce<string | null>((latestBonusUntil, record) => {
    if (!record.bonusProUntil) return latestBonusUntil;

    return laterIso(latestBonusUntil, record.bonusProUntil);
  }, null);
}

async function createReferralRewardNotification(
  userEmail: string,
  notification: { message: string; title: string }
) {
  try {
    await createNotificationIfMissing(
      userEmail,
      notification.title,
      notification.message,
      "referral"
    );
  } catch (error) {
    console.error("Create referral reward notification failed", error);
  }
}

function isSupabaseErrorLike(error: unknown): error is SupabaseErrorLike {
  return Boolean(error && typeof error === "object");
}

export function isMissingReferralSchemaError(error: unknown) {
  if (!isSupabaseErrorLike(error)) return false;

  const code = error.code || "";
  const text = `${error.message || ""} ${error.details || ""}`.toLowerCase();

  return (
    code === "42703" ||
    code === "42P01" ||
    code === "PGRST205" ||
    text.includes("referral_code") ||
    text.includes("bonus_pro_until") ||
    text.includes("referred_by_email") ||
    text.includes("referrals")
  );
}

function createUnavailableReferralState(): ReferralAccountState {
  return {
    available: false,
    bonusProUntil: null,
    inviteLink: "",
    invitedCount: 0,
    paidRewardCount: 0,
    referralCode: "",
    referredByEmail: null,
    signupBonusUntil: null,
  };
}

function createInviteLink(referralCode: string, origin?: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || origin?.trim() || "";
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  return cleanBaseUrl
    ? `${cleanBaseUrl}/register?ref=${encodeURIComponent(referralCode)}`
    : `/register?ref=${encodeURIComponent(referralCode)}`;
}

async function registerReferralInLedger(
  inviteeEmail: string,
  referralCode: string
) {
  const normalizedInviteeEmail = normalizeEmail(inviteeEmail);
  const inviterEmail = getEmailFromSignedReferralCode(referralCode);

  if (!inviterEmail || inviterEmail === normalizedInviteeEmail) {
    return { bonusGranted: false, bonusProUntil: null };
  }

  const existingInviteeRecords = await listReferralLedgerRecords(
    normalizedInviteeEmail
  );
  const existingInviteeBonus = existingInviteeRecords.find(
    (record) => record.kind === "invitee_signup_bonus"
  );

  if (existingInviteeBonus) {
    return {
      bonusGranted: false,
      bonusProUntil: existingInviteeBonus.bonusProUntil || null,
    };
  }

  const bonusProUntil = addDays(new Date(), INVITEE_SIGNUP_BONUS_DAYS);

  await Promise.all([
    createReferralLedgerRecord(normalizedInviteeEmail, {
      bonusProUntil,
      inviterEmail,
      kind: "invitee_signup_bonus",
      referralCode,
    }),
    createReferralLedgerRecord(inviterEmail, {
      inviteeEmail: normalizedInviteeEmail,
      inviterEmail,
      kind: "invitee_registered",
      referralCode,
    }),
  ]);
  await createReferralRewardNotification(
    normalizedInviteeEmail,
    INVITEE_SIGNUP_REWARD_NOTIFICATION
  );

  return { bonusGranted: true, bonusProUntil };
}

async function getReferralAccountStateFromLedger(
  email: string,
  origin?: string
) {
  const normalizedEmail = normalizeEmail(email);
  const records = await listReferralLedgerRecords(normalizedEmail);
  const bonusProUntil = futureIso(await getLedgerBonusProUntilForEmail(email));
  const inviteeSignupBonus = records.find(
    (record) => record.kind === "invitee_signup_bonus"
  );
  const referralCode = createSignedReferralCode(normalizedEmail);

  return {
    available: true,
    bonusProUntil,
    inviteLink: createInviteLink(referralCode, origin),
    invitedCount: uniqueCount(
      records
        .filter((record) => record.kind === "invitee_registered")
        .map((record) => normalizeEmail(record.inviteeEmail || ""))
    ),
    paidRewardCount: uniqueCount(
      records
        .filter((record) => record.kind === "inviter_paid_reward")
        .map((record) => normalizeEmail(record.inviteeEmail || ""))
    ),
    referralCode,
    referredByEmail: inviteeSignupBonus?.inviterEmail || null,
    signupBonusUntil: futureIso(inviteeSignupBonus?.bonusProUntil),
  } satisfies ReferralAccountState;
}

async function rewardInviterInLedger(
  inviteeEmail: string,
  stripeSubscriptionId: string
) {
  const normalizedInviteeEmail = normalizeEmail(inviteeEmail);
  const inviteeRecords = await listReferralLedgerRecords(normalizedInviteeEmail);
  const inviteeSignupBonus = inviteeRecords.find(
    (record) => record.kind === "invitee_signup_bonus"
  );
  const inviterEmail = normalizeEmail(inviteeSignupBonus?.inviterEmail || "");

  if (!inviterEmail || inviterEmail === normalizedInviteeEmail) {
    return false;
  }

  const inviterRecords = await listReferralLedgerRecords(inviterEmail);
  const wasRewarded = inviterRecords.some(
    (record) =>
      record.kind === "inviter_paid_reward" &&
      normalizeEmail(record.inviteeEmail || "") === normalizedInviteeEmail
  );

  if (wasRewarded) {
    return false;
  }

  const currentBonusUntil = await getLedgerBonusProUntilForEmail(inviterEmail);
  const rewardBaseDate =
    futureIso(currentBonusUntil) !== null
      ? new Date(currentBonusUntil as string)
      : new Date();
  const bonusProUntil = addDays(rewardBaseDate, INVITER_PAID_REWARD_DAYS);

  await createReferralLedgerRecord(inviterEmail, {
    awardedAt: new Date().toISOString(),
    bonusProUntil,
    inviteeEmail: normalizedInviteeEmail,
    inviterEmail,
    kind: "inviter_paid_reward",
    stripeSubscriptionId,
  });
  await createReferralRewardNotification(
    inviterEmail,
    INVITER_PAID_REWARD_NOTIFICATION
  );

  return true;
}

async function createUniqueReferralCode() {
  const supabase = getSupabaseAdmin();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const referralCode = `SF${randomBytes(4).toString("hex").toUpperCase()}`;
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("referral_code", referralCode)
      .maybeSingle<{ email: string }>();

    if (error) {
      throw error;
    }

    if (!data) {
      return referralCode;
    }
  }

  return `SF${randomBytes(8).toString("hex").toUpperCase()}`;
}

async function ensureReferralProfile(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("email, referral_code, bonus_pro_until, referred_by_email")
    .eq("email", normalizedEmail)
    .maybeSingle<ReferralProfileRow>();

  if (error) {
    throw error;
  }

  if (data?.referral_code) {
    return {
      bonusProUntil: data.bonus_pro_until || null,
      referralCode: data.referral_code,
      referredByEmail: data.referred_by_email || null,
    };
  }

  const referralCode = await createUniqueReferralCode();
  const { data: profile, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        email: normalizedEmail,
        referral_code: referralCode,
      },
      { onConflict: "email" }
    )
    .select("email, referral_code, bonus_pro_until, referred_by_email")
    .single<ReferralProfileRow>();

  if (upsertError) {
    throw upsertError;
  }

  return {
    bonusProUntil: profile.bonus_pro_until || null,
    referralCode: profile.referral_code || referralCode,
    referredByEmail: profile.referred_by_email || null,
  };
}

export async function getBonusProUntilForEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  let profileBonusUntil: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .select("bonus_pro_until")
      .eq("email", normalizedEmail)
      .maybeSingle<{ bonus_pro_until?: string | null }>();

    if (error) {
      throw error;
    }

    profileBonusUntil = data?.bonus_pro_until || null;
  } catch (error) {
    if (!isMissingReferralSchemaError(error)) {
      throw error;
    }
  }

  try {
    const ledgerBonusUntil = await getLedgerBonusProUntilForEmail(
      normalizedEmail
    );

    return laterIso(profileBonusUntil, ledgerBonusUntil);
  } catch (error) {
    if (profileBonusUntil) return profileBonusUntil;
    throw error;
  }
}

export async function registerReferralForNewUser(
  inviteeEmail: string,
  referralCode: string | null | undefined
) {
  const normalizedInviteeEmail = normalizeEmail(inviteeEmail);
  const normalizedReferralCode = normalizeReferralCode(referralCode);

  if (!normalizedInviteeEmail || !normalizedReferralCode) {
    return { bonusGranted: false, bonusProUntil: null };
  }

  const supabase = getSupabaseAdmin();
  const { data: inviter, error: inviterError } = await supabase
    .from("profiles")
    .select("email")
    .eq("referral_code", normalizedReferralCode)
    .maybeSingle<{ email: string }>();

  if (inviterError) {
    if (isMissingReferralSchemaError(inviterError)) {
      return registerReferralInLedger(
        normalizedInviteeEmail,
        normalizedReferralCode
      );
    }

    throw inviterError;
  }

  const inviterEmail =
    normalizeEmail(inviter?.email || "") ||
    getEmailFromSignedReferralCode(normalizedReferralCode);

  if (!inviterEmail || inviterEmail === normalizedInviteeEmail) {
    return { bonusGranted: false, bonusProUntil: null };
  }

  if (!inviter?.email) {
    return registerReferralInLedger(
      normalizedInviteeEmail,
      normalizedReferralCode
    );
  }

  let inviteeProfile: Awaited<ReturnType<typeof ensureReferralProfile>>;

  try {
    inviteeProfile = await ensureReferralProfile(normalizedInviteeEmail);
  } catch (error) {
    if (isMissingReferralSchemaError(error)) {
      return registerReferralInLedger(
        normalizedInviteeEmail,
        normalizedReferralCode
      );
    }

    throw error;
  }

  if (inviteeProfile.referredByEmail) {
    return {
      bonusGranted: false,
      bonusProUntil: inviteeProfile.bonusProUntil,
    };
  }

  const bonusProUntil = laterIso(
    inviteeProfile.bonusProUntil,
    addDays(new Date(), INVITEE_SIGNUP_BONUS_DAYS)
  );

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        bonus_pro_until: bonusProUntil,
        email: normalizedInviteeEmail,
        referral_code: inviteeProfile.referralCode,
        referred_by_email: inviterEmail,
      },
      { onConflict: "email" }
    );

  if (profileError) {
    if (isMissingReferralSchemaError(profileError)) {
      return registerReferralInLedger(
        normalizedInviteeEmail,
        normalizedReferralCode
      );
    }

    throw profileError;
  }

  const { error: insertError } = await supabase.from("referrals").insert({
    invitee_bonus_until: bonusProUntil,
    invitee_email: normalizedInviteeEmail,
    inviter_email: inviterEmail,
    referral_code: normalizedReferralCode,
  });

  if (insertError && insertError.code !== "23505") {
    if (isMissingReferralSchemaError(insertError)) {
      return registerReferralInLedger(
        normalizedInviteeEmail,
        normalizedReferralCode
      );
    }

    throw insertError;
  }

  await createReferralRewardNotification(
    normalizedInviteeEmail,
    INVITEE_SIGNUP_REWARD_NOTIFICATION
  );

  return { bonusGranted: true, bonusProUntil };
}

export async function getReferralAccountState(email: string, origin?: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return createUnavailableReferralState();
  }

  try {
    const supabase = getSupabaseAdmin();
    const profile = await ensureReferralProfile(normalizedEmail);
    const { data, error } = await supabase
      .from("referrals")
      .select(
        "id, inviter_email, invitee_email, invitee_bonus_until, inviter_rewarded_at, created_at"
      )
      .eq("inviter_email", normalizedEmail)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const referrals = (data || []) as ReferralRow[];
    const signupReferral = referrals.find((referral) =>
      Boolean(referral.invitee_bonus_until)
    );

    return {
      available: true,
      bonusProUntil: futureIso(profile.bonusProUntil),
      inviteLink: createInviteLink(profile.referralCode, origin),
      invitedCount: referrals.length,
      paidRewardCount: referrals.filter((referral) =>
        Boolean(referral.inviter_rewarded_at)
      ).length,
      referralCode: profile.referralCode,
      referredByEmail: profile.referredByEmail,
      signupBonusUntil: futureIso(signupReferral?.invitee_bonus_until),
    } satisfies ReferralAccountState;
  } catch (error) {
    if (isMissingReferralSchemaError(error)) {
      return getReferralAccountStateFromLedger(normalizedEmail, origin);
    }

    throw error;
  }
}

export async function rewardInviterForPaidReferral(
  inviteeEmail: string,
  stripeSubscriptionId: string
) {
  const normalizedInviteeEmail = normalizeEmail(inviteeEmail);

  if (!normalizedInviteeEmail) return false;

  const supabase = getSupabaseAdmin();
  const { data: referral, error: referralError } = await supabase
    .from("referrals")
    .select("id, inviter_email, invitee_email, inviter_rewarded_at")
    .eq("invitee_email", normalizedInviteeEmail)
    .maybeSingle<ReferralRow>();

  if (referralError) {
    if (isMissingReferralSchemaError(referralError)) {
      return rewardInviterInLedger(normalizedInviteeEmail, stripeSubscriptionId);
    }
    throw referralError;
  }

  if (!referral || referral.inviter_rewarded_at) {
    return rewardInviterInLedger(normalizedInviteeEmail, stripeSubscriptionId);
  }

  const { data: claimedReferral, error: claimError } = await supabase
    .from("referrals")
    .update({
      inviter_bonus_days: INVITER_PAID_REWARD_DAYS,
      inviter_rewarded_at: new Date().toISOString(),
      paid_stripe_subscription_id: stripeSubscriptionId || null,
    })
    .eq("id", referral.id)
    .is("inviter_rewarded_at", null)
    .select("id, inviter_email, invitee_email")
    .maybeSingle<ReferralRow>();

  if (claimError) {
    throw claimError;
  }

  if (!claimedReferral) {
    return false;
  }

  const inviterEmail = normalizeEmail(referral.inviter_email);
  const { data: inviterProfile, error: profileError } = await supabase
    .from("profiles")
    .select("email, bonus_pro_until, current_period_end")
    .eq("email", inviterEmail)
    .maybeSingle<ReferralProfileRow>();

  if (profileError) {
    if (isMissingReferralSchemaError(profileError)) {
      return rewardInviterInLedger(normalizedInviteeEmail, stripeSubscriptionId);
    }

    throw profileError;
  }

  const baseBonusUntil = laterIso(
    futureIso(inviterProfile?.bonus_pro_until),
    futureIso(inviterProfile?.current_period_end)
  );
  const rewardBaseDate = baseBonusUntil ? new Date(baseBonusUntil) : new Date();
  const bonusProUntil = addDays(rewardBaseDate, INVITER_PAID_REWARD_DAYS);
  const { error: updateProfileError } = await supabase
    .from("profiles")
    .upsert(
      {
        bonus_pro_until: bonusProUntil,
        email: inviterEmail,
      },
      { onConflict: "email" }
    );

  if (updateProfileError) {
    if (isMissingReferralSchemaError(updateProfileError)) {
      return rewardInviterInLedger(normalizedInviteeEmail, stripeSubscriptionId);
    }

    throw updateProfileError;
  }

  await createReferralRewardNotification(
    inviterEmail,
    INVITER_PAID_REWARD_NOTIFICATION
  );

  return true;
}
