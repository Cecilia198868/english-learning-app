import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/userRoles";

declare module "next-auth" {
  interface Session {
    isInvalidated?: boolean;
    invalidatedReason?:
      | "missing-session-id"
      | "replaced"
      | "session-store-unavailable";
    user?: DefaultSession["user"] & {
      deviceId?: string;
      displayName?: string;
      provider?: string;
      role?: UserRole;
      sessionId?: string;
      userId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    deviceId?: string;
    loginNonce?: string;
    provider?: string;
    role?: UserRole;
    sessionId?: string;
    userId?: string;
  }
}
