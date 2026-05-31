import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "reviewer" | "user";

export const REVIEWER_EMAIL = "reviewer@edificeia.com";
export const REVIEWER_SANDBOX_PATH = "/tiktok-sandbox-test";

const ADMIN_EMAILS = new Set([
  "contact@edificeia.com",
  "contact.edificeia@gmail.com",
]);
const REVIEWER_EMAILS = new Set([REVIEWER_EMAIL]);

function readRoleMetadata(user: User | null | undefined) {
  const metadataRole =
    user?.app_metadata?.role ??
    user?.app_metadata?.user_role ??
    user?.user_metadata?.role ??
    user?.user_metadata?.user_role;

  return typeof metadataRole === "string" ? metadataRole : null;
}

export function getUserRole(user: User | null | undefined): UserRole {
  const metadataRole = readRoleMetadata(user);

  if (metadataRole === "admin" || metadataRole === "reviewer") {
    return metadataRole;
  }

  if (metadataRole === "demo_reviewer") {
    return "reviewer";
  }

  const email = user?.email?.toLowerCase();

  if (email && ADMIN_EMAILS.has(email)) {
    return "admin";
  }

  if (email && REVIEWER_EMAILS.has(email)) {
    return "reviewer";
  }

  return "user";
}

export function isAdminUser(user: User | null | undefined) {
  return getUserRole(user) === "admin";
}

export function isReviewerUser(user: User | null | undefined) {
  return getUserRole(user) === "reviewer";
}

export function canAccessPrivateCockpit(user: User | null | undefined) {
  return getUserRole(user) !== "reviewer";
}
