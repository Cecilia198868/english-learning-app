export type UserRole = "user" | "admin";

export const DEFAULT_ADMIN_EMAIL = "xuhuiyangny@gmail.com";

export function normalizeUserRole(role: unknown): UserRole {
  return role === "admin" ? "admin" : "user";
}

export function normalizeUserEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getDefaultRoleForEmail(email: string): UserRole {
  return normalizeUserEmail(email) === DEFAULT_ADMIN_EMAIL ? "admin" : "user";
}

export function getEffectiveUserRole(email: string, role: unknown): UserRole {
  const normalizedEmail = normalizeUserEmail(email);
  if (getDefaultRoleForEmail(normalizedEmail) === "admin") return "admin";

  return normalizeUserRole(role);
}
