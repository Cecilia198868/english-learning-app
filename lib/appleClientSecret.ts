import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const APPLE_AUDIENCE = "https://appleid.apple.com";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

type GenerateAppleClientSecretOptions = {
  clientId: string;
  expiresInSeconds?: number;
  keyId: string;
  now?: Date;
  privateKey: string;
  teamId: string;
};

function present(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n").trim();
}

function base64url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function resolveMaxAgeSeconds() {
  const configured = Number(process.env.APPLE_CLIENT_SECRET_MAX_AGE_SECONDS);

  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_MAX_AGE_SECONDS;
  }

  return Math.min(Math.floor(configured), DEFAULT_MAX_AGE_SECONDS);
}

function readPrivateKeyFromEnv() {
  const inlinePrivateKey = present(process.env.APPLE_PRIVATE_KEY);
  if (inlinePrivateKey) return normalizePrivateKey(inlinePrivateKey);

  const base64PrivateKey = present(process.env.APPLE_PRIVATE_KEY_BASE64);
  if (base64PrivateKey) {
    return normalizePrivateKey(Buffer.from(base64PrivateKey, "base64").toString("utf8"));
  }

  const privateKeyPath = present(process.env.APPLE_PRIVATE_KEY_PATH);
  if (!privateKeyPath) return undefined;

  const resolvedPath = path.isAbsolute(privateKeyPath)
    ? privateKeyPath
    : path.join(/*turbopackIgnore: true*/ process.cwd(), privateKeyPath);

  return normalizePrivateKey(readFileSync(resolvedPath, "utf8"));
}

export function generateAppleClientSecret({
  clientId,
  expiresInSeconds = DEFAULT_MAX_AGE_SECONDS,
  keyId,
  now = new Date(),
  privateKey,
  teamId,
}: GenerateAppleClientSecretOptions) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + Math.min(expiresInSeconds, DEFAULT_MAX_AGE_SECONDS);
  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };
  const payload = {
    aud: APPLE_AUDIENCE,
    exp: expiresAt,
    iat: issuedAt,
    iss: teamId,
    sub: clientId,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload)
  )}`;
  const signingKey = createPrivateKey(normalizePrivateKey(privateKey));
  const signature = sign("sha256", Buffer.from(signingInput), {
    dsaEncoding: "ieee-p1363",
    key: signingKey,
  });

  return `${signingInput}.${base64url(signature)}`;
}

export function resolveAppleClientSecret(clientId: string | undefined) {
  const existingClientSecret = present(process.env.APPLE_CLIENT_SECRET);
  if (existingClientSecret) return existingClientSecret;

  const resolvedClientId = present(clientId);
  const teamId = present(process.env.APPLE_TEAM_ID);
  const keyId = present(process.env.APPLE_KEY_ID);

  if (!resolvedClientId || !teamId || !keyId) {
    return undefined;
  }

  try {
    const privateKey = readPrivateKeyFromEnv();
    if (!privateKey) return undefined;

    return generateAppleClientSecret({
      clientId: resolvedClientId,
      expiresInSeconds: resolveMaxAgeSeconds(),
      keyId,
      privateKey,
      teamId,
    });
  } catch (error) {
    if (process.env.APPLE_AUTH_DEBUG === "1") {
      console.warn(
        "Apple Sign In is disabled because APPLE_CLIENT_SECRET could not be generated.",
        error instanceof Error ? error.message : error
      );
    }
    return undefined;
  }
}
