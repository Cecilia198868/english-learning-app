import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const APPLE_AUDIENCE = "https://appleid.apple.com";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function present(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePrivateKey(privateKey) {
  return privateKey.replace(/\\n/g, "\n").trim();
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function readPrivateKey() {
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
    : path.join(process.cwd(), privateKeyPath);

  return normalizePrivateKey(readFileSync(resolvedPath, "utf8"));
}

function generateAppleClientSecret({ clientId, keyId, privateKey, teamId }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + DEFAULT_MAX_AGE_SECONDS;
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

const clientId = present(process.env.APPLE_CLIENT_ID);
const keyId = present(process.env.APPLE_KEY_ID);
const teamId = present(process.env.APPLE_TEAM_ID);
const privateKey = readPrivateKey();
const missing = [
  !clientId && "APPLE_CLIENT_ID",
  !keyId && "APPLE_KEY_ID",
  !teamId && "APPLE_TEAM_ID",
  !privateKey && "APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_BASE64 or APPLE_PRIVATE_KEY_PATH",
].filter(Boolean);

if (missing.length > 0) {
  console.error(`Missing required Apple config: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(
  generateAppleClientSecret({
    clientId,
    keyId,
    privateKey,
    teamId,
  })
);
