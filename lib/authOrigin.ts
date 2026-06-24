export const productionAuthOrigin = "https://web-english-app.vercel.app";

type AuthOriginCandidate = {
  source: string;
  value: string | undefined;
};

export type AuthOriginResolution = {
  origin: string;
  replaced?: {
    origin: string;
    reason: string;
    source: string;
  };
  source: string;
};

const legacyAuthHosts = new Set(["english-learning-app-new.vercel.app"]);

function toOrigin(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function getUnsafeOriginReason(origin: string) {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("127.") ||
      hostname.endsWith(".local")
    ) {
      return "local_origin";
    }

    if (legacyAuthHosts.has(hostname)) {
      return "legacy_origin";
    }

    if (origin !== productionAuthOrigin) {
      return "non_canonical_origin";
    }

    return null;
  } catch {
    return "invalid_origin";
  }
}

function resolveCandidate(candidates: AuthOriginCandidate[]) {
  for (const candidate of candidates) {
    const origin = toOrigin(candidate.value);
    if (origin) {
      return { origin, source: candidate.source };
    }
  }

  return null;
}

export function resolveAuthOrigin(fallbackOrigin?: string): AuthOriginResolution {
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;
  const selected = resolveCandidate([
    { source: "NEXTAUTH_URL", value: process.env.NEXTAUTH_URL },
    { source: "NEXT_PUBLIC_APP_URL", value: process.env.NEXT_PUBLIC_APP_URL },
    { source: "VERCEL_URL", value: vercelUrl },
    { source: "request", value: fallbackOrigin },
  ]);

  if (!selected) {
    return { origin: productionAuthOrigin, source: "default" };
  }

  const reason = getUnsafeOriginReason(selected.origin);
  if (!reason) {
    return selected;
  }

  return {
    origin: productionAuthOrigin,
    replaced: {
      origin: selected.origin,
      reason,
      source: selected.source,
    },
    source: "canonical",
  };
}

export function ensureCanonicalNextAuthUrl() {
  const resolution = resolveAuthOrigin();
  process.env.NEXTAUTH_URL = resolution.origin;
  return resolution;
}
