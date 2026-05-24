import type { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { findUserByEmail, validateUserPassword } from "@/lib/userStore";

const appleClientId = process.env.APPLE_CLIENT_ID;
const appleClientSecret = process.env.APPLE_CLIENT_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret =
  process.env.NEXTAUTH_SECRET || "dev-only-nextauth-secret-change-me";
const persistentSessionMaxAgeSeconds = 60 * 60 * 24 * 365 * 5;
const persistentSessionUpdateAgeSeconds = 60 * 60 * 24;

export const isAppleAuthConfigured =
  Boolean(appleClientId) && Boolean(appleClientSecret);

export const isGoogleAuthConfigured =
  Boolean(googleClientId) && Boolean(googleClientSecret);

export const authOptions: NextAuthOptions = {
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
    CredentialsProvider({
      id: "email-login",
      name: "Email Login",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        if (!email || !email.includes("@") || !password) {
          return null;
        }

        const user = await validateUserPassword(email, password);
        if (!user) {
          return null;
        }

        return {
          id: user.email,
          email: user.email,
          name: user.email.split("@")[0] || user.email,
        };
      },
    }),
  ],
  secret: nextAuthSecret,
  session: {
    strategy: "jwt",
    maxAge: persistentSessionMaxAgeSeconds,
    updateAge: persistentSessionUpdateAgeSeconds,
  },
  jwt: {
    maxAge: persistentSessionMaxAgeSeconds,
  },
  callbacks: {
    async jwt({ token }) {
      const email =
        typeof token.email === "string" ? token.email.trim().toLowerCase() : "";
      const user = email ? await findUserByEmail(email) : null;
      const subscriptionStatus = user?.subscriptionStatus;

      token.currentPeriodEnd = user?.currentPeriodEnd || null;
      token.subscriptionStatus =
        subscriptionStatus === "pro" ||
        subscriptionStatus === "cancels_at_period_end"
          ? subscriptionStatus
          : "free";

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.currentPeriodEnd =
          typeof token.currentPeriodEnd === "string"
            ? token.currentPeriodEnd
            : null;
        session.user.subscriptionStatus =
          token.subscriptionStatus === "pro" ||
          token.subscriptionStatus === "cancels_at_period_end"
            ? token.subscriptionStatus
            : "free";
      }

      return session;
    },
  },
};
