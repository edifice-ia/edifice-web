import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getPinterestPublisherDiagnostic,
  normalizePinterestEnvironment,
} from "@/lib/server/pinterest-publisher";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ ok: false, error: "Acces refuse." }, { status: 403 });
  }

  const environment = normalizePinterestEnvironment(
    request.nextUrl.searchParams.get("environment") ?? undefined,
  );
  const diagnostic = getPinterestPublisherDiagnostic({ environment });

  console.info("[Pinterest Publisher] access level diagnostic", diagnostic);

  return NextResponse.json({
    ok: true,
    diagnostic,
  });
}
