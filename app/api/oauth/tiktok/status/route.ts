import { NextResponse } from "next/server";
import { getOAuthTokenStatus } from "@/lib/server/oauth/token-store";
import { getCurrentUser } from "@/src/lib/supabase/server";

// Deliberately guarded on session only, NOT on canAccessPrivateCockpit: this
// path is part of reviewerAllowedPaths (src/lib/supabase/proxy.ts) and the
// TikTok reviewer account must keep reading it during app review, while
// canAccessPrivateCockpit returns false for the reviewer role. The middleware
// already redirects anonymous callers on this path; this check is the
// defence-in-depth copy, so the route stops being readable without a session
// even if the reviewer allowlist changes.
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  return Response.json(await getOAuthTokenStatus("tiktok"));
}
