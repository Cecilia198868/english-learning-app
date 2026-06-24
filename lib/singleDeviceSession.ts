import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const SESSION_REPLACED_MESSAGE =
  "你的账号已在另一台设备登录，本设备已退出。";

const VALIDATION_CACHE_TTL_MS = 15_000;

type RegisterCurrentUserSessionInput = {
  deviceId: string;
  email: string;
  ip?: string;
  sessionId: string;
  userAgent?: string;
  userId?: string;
};

type SessionValidationResult = {
  enforced: boolean;
  isCurrent: boolean;
  reason?: "missing-session-id" | "replaced" | "session-store-unavailable";
};

type UserSessionRow = {
  current_session_id?: string | null;
};

const validationCache = new Map<
  string,
  { expiresAt: number; result: SessionValidationResult }
>();

export function createSingleDeviceSessionIds() {
  return {
    deviceId: randomUUID(),
    sessionId: randomUUID(),
  };
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || "";
}

function normalizeMetadataValue(value: string | undefined, maxLength: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cacheKey(email: string, sessionId: string) {
  return `${email}:${sessionId}`;
}

function getCachedValidation(email: string, sessionId: string) {
  const cached = validationCache.get(cacheKey(email, sessionId));
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    validationCache.delete(cacheKey(email, sessionId));
    return null;
  }

  return cached.result;
}

function setCachedValidation(
  email: string,
  sessionId: string,
  result: SessionValidationResult
) {
  validationCache.set(cacheKey(email, sessionId), {
    expiresAt: Date.now() + VALIDATION_CACHE_TTL_MS,
    result,
  });
}

function clearValidationCacheForEmail(email: string) {
  for (const key of validationCache.keys()) {
    if (key.startsWith(`${email}:`)) {
      validationCache.delete(key);
    }
  }
}

export async function registerCurrentUserSession({
  deviceId,
  email,
  ip,
  sessionId,
  userAgent,
  userId,
}: RegisterCurrentUserSessionInput) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !sessionId || !deviceId) return false;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("user_sessions").upsert(
    {
      current_device_id: deviceId,
      current_session_id: sessionId,
      email: normalizedEmail,
      last_login_at: new Date().toISOString(),
      last_login_ip: normalizeMetadataValue(ip, 120),
      last_login_user_agent: normalizeMetadataValue(userAgent, 500),
      user_id: normalizeMetadataValue(userId, 200),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );

  if (error) {
    throw error;
  }

  clearValidationCacheForEmail(normalizedEmail);
  setCachedValidation(normalizedEmail, sessionId, {
    enforced: true,
    isCurrent: true,
  });
  return true;
}

export async function validateCurrentUserSession(
  email: string | null | undefined,
  sessionId: string | null | undefined
): Promise<SessionValidationResult> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !sessionId) {
    return {
      enforced: true,
      isCurrent: false,
      reason: "missing-session-id",
    };
  }

  const cached = getCachedValidation(normalizedEmail, sessionId);
  if (cached) return cached;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("user_sessions")
      .select("current_session_id")
      .eq("email", normalizedEmail)
      .maybeSingle<UserSessionRow>();

    if (error) {
      throw error;
    }

    const result: SessionValidationResult = {
      enforced: true,
      isCurrent: data?.current_session_id === sessionId,
      reason: data?.current_session_id === sessionId ? undefined : "replaced",
    };

    setCachedValidation(normalizedEmail, sessionId, result);
    return result;
  } catch {
    return {
      enforced: false,
      isCurrent: true,
      reason: "session-store-unavailable",
    };
  }
}
