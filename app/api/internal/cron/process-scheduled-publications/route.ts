import { NextResponse } from "next/server";
import { processScheduledInstagramPublications } from "@/lib/server/shorts-publication";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const headerSecret = request.headers.get("x-cron-secret") ?? "";

  return authorization === `Bearer ${secret}` || headerSecret === secret;
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
