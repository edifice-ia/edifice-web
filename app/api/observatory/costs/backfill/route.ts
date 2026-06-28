import { NextResponse } from "next/server";
import { previewCostBackfill, runCostBackfill } from "@/lib/server/cost-tracking";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

async function authorizeBackfillAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

function parseDays(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 90 ? parsed : 30;
}

export async function POST(request: Request) {
  const user = await authorizeBackfillAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const days = parseDays(payload.days);
    const action = payload.action === "run" ? "run" : "preview";
    const backfill = action === "run"
      ? await runCostBackfill({ days, userId: user.id })
      : await previewCostBackfill({ days, userId: user.id });

    return NextResponse.json({ action, backfill });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backfill couts indisponible." },
      { status: 400 },
    );
  }
}
