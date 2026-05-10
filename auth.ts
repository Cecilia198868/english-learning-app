import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { validateUserPassword } from "@/lib/userStore";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret =
  process.env.NEXTAUTH_SECRET || "dev-only-nextauth-secret-change-me";

export const isGoogleAuthConfigured =
  Boolean(googleClientId) && Boolean(googleClientSecret);

export const authOptions: NextAuthOptions = {
  providers: [
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
  },
};
