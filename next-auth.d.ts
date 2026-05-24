import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      currentPeriodEnd?: string | null;
      subscriptionStatus?: "free" | "pro";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    currentPeriodEnd?: string | null;
    subscriptionStatus?: "free" | "pro";
  }
}
