import { randomBytes } from "node:crypto";
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeReferralCode(referralCode?: string | null) {
  return (referralCode || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 48)
    .toUpperCase();
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

    return data?.bonus_pro_until || null;
  } catch (error) {
    if (isMissingReferralSchemaError(error)) {
      return null;
    }

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
    throw inviterError;
  }

  const inviterEmail = normalizeEmail(inviter?.email || "");

  if (!inviterEmail || inviterEmail === normalizedInviteeEmail) {
    return { bonusGranted: false, bonusProUntil: null };
  }

  const inviteeProfile = await ensureReferralProfile(normalizedInviteeEmail);

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
    throw profileError;
  }

  const { error: insertError } = await supabase.from("referrals").insert({
    invitee_bonus_until: bonusProUntil,
    invitee_email: normalizedInviteeEmail,
    inviter_email: inviterEmail,
    referral_code: normalizedReferralCode,
  });

  if (insertError && insertError.code !== "23505") {
    throw insertError;
  }

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
      return createUnavailableReferralState();
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
    if (isMissingReferralSchemaError(referralError)) return false;
    throw referralError;
  }

  if (!referral || referral.inviter_rewarded_at) {
    return false;
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
    throw updateProfileError;
  }

  return true;
}
