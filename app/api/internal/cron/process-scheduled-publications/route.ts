import { NextResponse } from "next/server";
import { processScheduledInstagramPublications } from "@/lib/server/shorts-publication";
import { isCronRequestAuthorized } from "@/src/lib/auth/cron-auth";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  // NOTE: This route is intended for Vercel Cron or an internal caller only.
  // Never call it from the browser; CRON_SECRET must stay server-side.
  // Comparaison a temps constant (DEC-007) : voir src/lib/auth/cron-auth.ts.
  return isCronRequestAuthorized(request);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  try {
    const result = await processScheduledInstagramPublications({ limit: 5 });
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Traitement cron indisponible.";
    console.error("[Scheduled Publications Cron] failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
