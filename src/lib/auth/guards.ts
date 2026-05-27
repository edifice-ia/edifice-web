import { redirect } from "next/navigation";
import { canAccessPrivateCockpit, isReviewerUser } from "./roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export async function requirePrivateCockpitAccess() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (isReviewerUser(user) || !canAccessPrivateCockpit(user)) {
    redirect("/demo?limited=1");
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
