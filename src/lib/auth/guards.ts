import { redirect } from "next/navigation";
import {
  REVIEWER_SANDBOX_PATH,
  canAccessPrivateCockpit,
  isReviewerUser,
} from "./roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export async function requirePrivateCockpitAccess() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (isReviewerUser(user) || !canAccessPrivateCockpit(user)) {
    redirect(REVIEWER_SANDBOX_PATH);
  }

  return user;
}

export async function requireReviewerSandboxAccess() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isReviewerUser(user)) {
    redirect("/interface");
  }

  return user;
}

export async function requireDemoAccess() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
