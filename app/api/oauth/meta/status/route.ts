import { NextResponse } from "next/server";
import { getOAuthTokenStatus } from "@/lib/server/oauth/token-store";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  return Response.json(await getOAuthTokenStatus("meta"));
}
