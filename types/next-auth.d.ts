import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/userRoles";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      displayName?: string;
      provider?: string;
      role?: UserRole;
      userId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
    role?: UserRole;
    userId?: string;
  }
}
