const sensitiveKeyFragments = [
  "access_token",
  "authorization",
  "client_secret",
  "code_verifier",
  "cookie",
  "id_token",
  "password",
  "private_key",
  "refresh_token",
  "secret",
  "token",
];

export const authDebugEnabled =
  process.env.AUTH_DEBUG === "1" ||
  process.env.NEXTAUTH_DEBUG === "1" ||
  process.env.APPLE_AUTH_DEBUG === "1";

function shouldRedact(key: string, value: unknown) {
  const normalizedKey = key.toLowerCase();

  if (
    sensitiveKeyFragments.some((fragment) => normalizedKey.includes(fragment))
  ) {
    return true;
  }

  return (
    normalizedKey === "code" &&
    typeof value === "string" &&
    value.length > 12
  );
}

export function sanitizeAuthLogValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown {
  if (value instanceof Error) {
    return {
      cause:
        "cause" in value
          ? sanitizeAuthLogValue(value.cause, depth + 1, seen)
          : undefined,
      message: value.message,
      name: value.name,
      stack: value.stack,
    };
  }

  if (!value || typeof value !== "object") return value;
  if (depth > 5) return "[truncated]";

  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuthLogValue(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      shouldRedact(key, item)
        ? "[redacted]"
        : sanitizeAuthLogValue(item, depth + 1, seen),
    ])
  );
}

export function logAuthDebug(scope: string, metadata?: unknown) {
  if (!authDebugEnabled) return;
  console.log(`[auth][${scope}]`, sanitizeAuthLogValue(metadata));
}

export function logAuthWarning(scope: string, metadata?: unknown) {
  console.warn(`[auth][${scope}]`, sanitizeAuthLogValue(metadata));
}

export function logAuthError(
  scope: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  console.error(
    `[auth][${scope}]`,
    sanitizeAuthLogValue({
      ...metadata,
      error,
    })
  );
}

export const nextAuthLogger = {
  debug(code: string, metadata: unknown) {
    logAuthDebug(`next-auth.${code}`, metadata);
  },
  error(code: string, metadata: unknown) {
    console.error(
      `[next-auth][error][${code}]`,
      sanitizeAuthLogValue(metadata)
    );
  },
  warn(code: string) {
    console.warn(`[next-auth][warn][${code}]`);
  },
};
