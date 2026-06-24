import { randomUUID } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import { headers } from "next/headers";
import type { OAuthConfig } from "next-auth/providers/oauth";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import { resolveAppleClientSecret } from "@/lib/appleClientSecret";
import {
  authDebugEnabled,
  logAuthDebug,
  logAuthError,
  logAuthWarning,
  nextAuthLogger,
  sanitizeAuthLogValue,
} from "@/lib/authLogging";
import { ensureCanonicalNextAuthUrl } from "@/lib/authOrigin";
import {
  createSingleDeviceSessionIds,
  registerCurrentUserSession,
  validateCurrentUserSession,
} from "@/lib/singleDeviceSession";
import {
  consumePasswordlessCode,
  normalizePasswordlessTarget,
} from "@/lib/passwordlessCodes";
import {
  ensureOAuthUserProfile,
  ensurePasswordlessUserProfile,
  getUserRoleByEmail,
} from "@/lib/userStore";

const authOriginResolution = ensureCanonicalNextAuthUrl();
if (authOriginResolution.replaced) {
  logAuthWarning("origin.canonicalized", authOriginResolution);
}

type WechatProfile = {
  errcode?: number;
  headimgurl?: string;
  nickname?: string;
  openid?: string;
  unionid?: string;
};

const appleClientId = process.env.APPLE_CLIENT_ID;
const appleClientSecret = resolveAppleClientSecret(appleClientId);
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const wechatClientId = process.env.WECHAT_CLIENT_ID || process.env.WECHAT_APP_ID;
const wechatClientSecret =
  process.env.WECHAT_CLIENT_SECRET || process.env.WECHAT_APP_SECRET;
const xClientId = process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID;
const xClientSecret =
  process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET;
const nextAuthSecret =
  process.env.NEXTAUTH_SECRET || "dev-only-nextauth-secret-change-me";
const persistentSessionMaxAgeSeconds = 60 * 60 * 24 * 365 * 5;
const persistentSessionUpdateAgeSeconds = 60 * 60 * 24;
const oauthTransientCookieMaxAgeSeconds = 60 * 15;

export const isAppleAuthConfigured =
  Boolean(appleClientId) && Boolean(appleClientSecret);

export const isGoogleAuthConfigured =
  Boolean(googleClientId) && Boolean(googleClientSecret);

export const isWechatAuthConfigured =
  Boolean(wechatClientId) && Boolean(wechatClientSecret);

export const isXAuthConfigured = Boolean(xClientId) && Boolean(xClientSecret);

function shouldUseSecureAuthCookies() {
  if (process.env.VERCEL === "1") return true;

  const configuredUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (configuredUrl) {
    try {
      return new URL(configuredUrl).protocol === "https:";
    } catch {
      // Fall back to the Vercel runtime signal below.
    }
  }

  return false;
}

const useSecureAuthCookies = shouldUseSecureAuthCookies();
const authCookiePrefix = useSecureAuthCookies ? "__Secure-" : "";
const oauthCookieSameSite = useSecureAuthCookies ? "none" : "lax";

const oauthCallbackCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: oauthCookieSameSite,
  secure: useSecureAuthCookies,
} as const;

const oauthVerifierCookieOptions = {
  ...oauthCallbackCookieOptions,
  maxAge: oauthTransientCookieMaxAgeSeconds,
} as const;

function safeIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function providerProfileEmail(provider: string, providerAccountId: string) {
  const safeProvider = safeIdentifier(provider) || "oauth";
  const safeAccountId = safeIdentifier(providerAccountId) || "user";
  return `${safeProvider}-${safeAccountId}@oauth.speakflow.local`;
}

function phoneLoginEmail(phoneTarget: string) {
  const safePhone = phoneTarget.replace(/[^\d]/g, "");
  return `phone-${safePhone}@phone.speakflow.local`;
}

function resolveUserEmail(
  email: string | null | undefined,
  provider: string | undefined,
  providerAccountId: string | undefined
) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail && normalizedEmail.includes("@")) {
    return normalizedEmail;
  }

  if (provider && providerAccountId) {
    return providerProfileEmail(provider, providerAccountId);
  }

  return "";
}

async function getLoginRequestMetadata() {
  try {
    const headerStore = await headers();
    const forwardedFor = headerStore.get("x-forwarded-for") || "";
    const ip =
      forwardedFor
        .split(",")
        .map((value) => value.trim())
        .find(Boolean) ||
      headerStore.get("x-real-ip") ||
      undefined;

    return {
      ip,
      userAgent: headerStore.get("user-agent") || undefined,
    };
  } catch {
    return {};
  }
}

async function resolveOAuthUser({
  account,
  user,
}: {
  account: {
    provider?: string;
    providerAccountId?: string;
    type?: string;
  } | null;
  user?: {
    email?: string | null;
    name?: string | null;
  };
}) {
  if (
    account?.type !== "oauth" ||
    !account.provider ||
    !account.providerAccountId
  ) {
    return null;
  }

  return ensureOAuthUserProfile({
    displayName: user?.name,
    email: user?.email,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
  });
}

function getOAuthFailureRedirect(error: unknown, provider: string | undefined) {
  if (!provider) return null;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalizedMessage = message.toLowerCase();
  const queryProvider = provider === "twitter" ? "x" : provider;

  if (
    provider === "apple" &&
    (message.includes("APPLE_REGISTRATION_NOT_COMPLETED") ||
      normalizedMessage.includes("registration not completed"))
  ) {
    return "/login?apple=registration-not-completed";
  }

  if (
    normalizedMessage.includes("identity_already_exists") ||
    normalizedMessage.includes("oauth_identity_conflict")
  ) {
    return `/login?${queryProvider}=identity-already-exists`;
  }

  if (
    normalizedMessage.includes("user_already_exists") ||
    normalizedMessage.includes("user already exists")
  ) {
    return `/login?${queryProvider}=user-already-exists`;
  }

  if (normalizedMessage.includes("provider")) {
    return `/login?${queryProvider}=provider-error`;
  }

  return null;
}

function WechatProvider(options: {
  clientId: string;
  clientSecret: string;
}): OAuthConfig<WechatProfile> {
  return {
    id: "wechat",
    name: "WeChat",
    type: "oauth",
    authorization: {
      url: "https://open.weixin.qq.com/connect/qrconnect",
      params: {
        appid: options.clientId,
        response_type: "code",
        scope: "snsapi_login",
      },
    },
    token: {
      url: "https://api.weixin.qq.com/sns/oauth2/access_token",
      async request({ params, provider }) {
        const tokenUrl = new URL(
          "https://api.weixin.qq.com/sns/oauth2/access_token"
        );
        tokenUrl.searchParams.set("appid", provider.clientId || "");
        tokenUrl.searchParams.set("secret", provider.clientSecret || "");
        tokenUrl.searchParams.set("code", String(params.code || ""));
        tokenUrl.searchParams.set("grant_type", "authorization_code");

        const response = await fetch(tokenUrl, { cache: "no-store" });
        const tokens = await response.json();

        return { tokens };
      },
    },
    userinfo: {
      url: "https://api.weixin.qq.com/sns/userinfo",
      async request({ tokens }) {
        const tokenSet = tokens as typeof tokens & { openid?: string };
        const userInfoUrl = new URL("https://api.weixin.qq.com/sns/userinfo");
        userInfoUrl.searchParams.set("access_token", String(tokens.access_token || ""));
        userInfoUrl.searchParams.set("openid", String(tokenSet.openid || ""));
        userInfoUrl.searchParams.set("lang", "zh_CN");

        const response = await fetch(userInfoUrl, { cache: "no-store" });
        return response.json();
      },
    },
    profile(profile) {
      const id = profile.unionid || profile.openid || "wechat-user";
      return {
        id,
        name: profile.nickname || "微信用户",
        email: providerProfileEmail("wechat", id),
        image: profile.headimgurl || null,
      };
    },
    checks: ["state"],
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    style: {
      bg: "#07c160",
      logo: "/wechat.svg",
      text: "#fff",
    },
  };
}

export const authOptions: NextAuthOptions = {
  pages: {
    error: "/login",
    signIn: "/login",
  },
  providers: [
    ...(isAppleAuthConfigured
      ? [
          AppleProvider({
            clientId: appleClientId!,
            clientSecret: appleClientSecret!,
          }),
        ]
      : []),
    ...(isGoogleAuthConfigured
      ? [
          GoogleProvider({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),
    ...(isWechatAuthConfigured
      ? [
          WechatProvider({
            clientId: wechatClientId!,
            clientSecret: wechatClientSecret!,
          }),
        ]
      : []),
    ...(isXAuthConfigured
      ? [
          TwitterProvider({
            clientId: xClientId!,
            clientSecret: xClientSecret!,
            version: "2.0",
          }),
        ]
      : []),
    CredentialsProvider({
      id: "email-code",
      name: "Email Code",
      credentials: {
        code: { label: "Code", type: "text" },
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = normalizePasswordlessTarget(
          "email",
          credentials?.email || ""
        );
        const code = credentials?.code || "";
        const isValidCode = await consumePasswordlessCode("email", email, code);

        if (!isValidCode) return null;

        await ensurePasswordlessUserProfile(email);

        return {
          id: email,
          email,
          name: email.split("@")[0] || email,
        };
      },
    }),
    CredentialsProvider({
      id: "phone-code",
      name: "Phone Code",
      credentials: {
        code: { label: "Code", type: "text" },
        countryCode: { label: "Country Code", type: "text" },
        phone: { label: "Phone", type: "tel" },
      },
      async authorize(credentials) {
        const phoneTarget = normalizePasswordlessTarget(
          "phone",
          credentials?.phone || "",
          credentials?.countryCode || ""
        );
        const code = credentials?.code || "";
        const isValidCode = await consumePasswordlessCode(
          "phone",
          phoneTarget,
          code
        );

        if (!isValidCode) return null;

        const email = phoneLoginEmail(phoneTarget);
        await ensurePasswordlessUserProfile(email);

        return {
          id: email,
          email,
          name: phoneTarget,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      try {
        logAuthDebug("signIn.start", {
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
          type: account?.type,
          userEmail: user.email,
          userId: user.id,
        });

        const oauthUser = await resolveOAuthUser({ account, user });

        if (oauthUser) {
          user.email = oauthUser.email;
          user.name = oauthUser.displayName || oauthUser.email;
          user.id = oauthUser.userId || oauthUser.email;
          logAuthDebug("signIn.oauthProfileResolved", {
            email: oauthUser.email,
            provider: oauthUser.provider,
            userId: oauthUser.userId,
          });
          return true;
        }

        const email = resolveUserEmail(
          user.email,
          account?.provider,
          account?.providerAccountId
        );

        if (!email) {
          logAuthError("signIn.missingEmail", new Error("AUTH_EMAIL_MISSING"), {
            provider: account?.provider,
            providerAccountId: account?.providerAccountId,
            type: account?.type,
            userId: user.id,
          });
          return false;
        }

        user.email = email;
        await ensurePasswordlessUserProfile(email);
        logAuthDebug("signIn.passwordlessProfileResolved", { email });
        return true;
      } catch (error) {
        logAuthError("signIn.failed", error, {
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
          type: account?.type,
          userEmail: user.email,
          userId: user.id,
        });

        const redirectUrl = getOAuthFailureRedirect(error, account?.provider);
        if (redirectUrl) {
          console.error(
            "[auth][signIn.userFacingRedirect]",
            sanitizeAuthLogValue({
              error,
              provider: account?.provider,
              redirectUrl,
            })
          );
          return redirectUrl;
        }

        throw error;
      }
    },
    async jwt({ account, token, user }) {
      const isFreshLogin = Boolean(account || user);
      let oauthUser: Awaited<ReturnType<typeof resolveOAuthUser>> = null;

      try {
        logAuthDebug("jwt.start", {
          isFreshLogin,
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
          tokenEmail: token.email,
          userEmail: user?.email,
        });

        oauthUser = await resolveOAuthUser({
          account,
          user:
            user || token.email
              ? {
                  email:
                    typeof user?.email === "string"
                      ? user.email
                      : typeof token.email === "string"
                        ? token.email
                        : null,
                  name:
                    typeof user?.name === "string"
                      ? user.name
                      : typeof token.name === "string"
                        ? token.name
                        : null,
                }
              : undefined,
        });
      } catch (error) {
        logAuthError("jwt.resolveOAuthUser.failed", error, {
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
          tokenEmail: token.email,
          userEmail: user?.email,
        });
        throw error;
      }

      if (oauthUser) {
        token.email = oauthUser.email;
        token.name = oauthUser.displayName || oauthUser.email;
        token.provider = oauthUser.provider;
        token.userId = oauthUser.userId;
      }

      const email = resolveUserEmail(
        typeof user?.email === "string" ? user.email : token.email,
        account?.provider,
        account?.providerAccountId
      );

      if (email) token.email = email;
      if (user?.name) token.name = user.name;
      if (user?.image) token.picture = user.image;
      if (email) token.role = await getUserRoleByEmail(email);

      if (email && isFreshLogin) {
        const sessionIds = createSingleDeviceSessionIds();
        token.sessionId = sessionIds.sessionId;
        token.deviceId = sessionIds.deviceId;
        token.loginNonce = randomUUID();

        const metadata = await getLoginRequestMetadata();
        await registerCurrentUserSession({
          deviceId: sessionIds.deviceId,
          email,
          ip: metadata.ip,
          sessionId: sessionIds.sessionId,
          userAgent: metadata.userAgent,
          userId:
            typeof token.userId === "string" && token.userId
              ? token.userId
              : email,
        })
          .then(() => {
            logAuthDebug("jwt.singleDeviceSessionRegistered", {
              deviceId: sessionIds.deviceId,
              email,
              provider: token.provider,
              sessionId: sessionIds.sessionId,
              userId:
                typeof token.userId === "string" && token.userId
                  ? token.userId
                  : email,
            });
          })
          .catch((error) => {
            logAuthError("jwt.registerCurrentUserSession.failed", error, {
              deviceId: sessionIds.deviceId,
              email,
              provider: token.provider,
              sessionId: sessionIds.sessionId,
              userId:
                typeof token.userId === "string" && token.userId
                  ? token.userId
                  : email,
            });
          });
      }

      return token;
    },
    async session({ session, token }) {
      const email = typeof token.email === "string" ? token.email : "";
      const sessionId =
        typeof token.sessionId === "string" ? token.sessionId : "";

      if (email) {
        const validation = await validateCurrentUserSession(email, sessionId);

        if (validation.enforced && !validation.isCurrent) {
          session.isInvalidated = true;
          session.invalidatedReason = validation.reason;
          delete session.user;
          return session;
        }
      }

      if (session.user) {
        session.user.email = email;
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.email;
        session.user.image =
          typeof token.picture === "string" ? token.picture : "";
        session.user.role = token.role === "admin" ? "admin" : "user";
        session.user.displayName =
          typeof token.name === "string" ? token.name : session.user.name || "";
        session.user.provider =
          typeof token.provider === "string" ? token.provider : undefined;
        session.user.userId =
          typeof token.userId === "string"
            ? token.userId
            : session.user.email || "";
        session.user.sessionId = sessionId;
        session.user.deviceId =
          typeof token.deviceId === "string" ? token.deviceId : "";
      }

      return session;
    },
  },
  cookies: {
    callbackUrl: {
      name: `${authCookiePrefix}next-auth.callback-url`,
      options: oauthCallbackCookieOptions,
    },
    nonce: {
      name: `${authCookiePrefix}next-auth.nonce`,
      options: oauthVerifierCookieOptions,
    },
    pkceCodeVerifier: {
      name: `${authCookiePrefix}next-auth.pkce.code_verifier`,
      options: oauthVerifierCookieOptions,
    },
    state: {
      name: `${authCookiePrefix}next-auth.state`,
      options: oauthVerifierCookieOptions,
    },
  },
  debug: authDebugEnabled,
  logger: nextAuthLogger,
  secret: nextAuthSecret,
  session: {
    strategy: "jwt",
    maxAge: persistentSessionMaxAgeSeconds,
    updateAge: persistentSessionUpdateAgeSeconds,
  },
  useSecureCookies: useSecureAuthCookies,
  jwt: {
    maxAge: persistentSessionMaxAgeSeconds,
  },
};
