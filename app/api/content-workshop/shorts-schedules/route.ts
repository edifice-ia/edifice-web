import { NextResponse } from "next/server";
import {
  cancelShortVideoSchedule,
  readShortsSchedulingState,
  saveShortVideoSchedules,
  updateShortVideoSchedule,
  type ShortVideoScheduleInput,
  type ShortVideoScheduleUpdateInput,
} from "@/lib/server/shorts-scheduling";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

function scheduleErrorPayload(error: unknown) {
  return {
    error: error instanceof Error ? error.message : "Programmation Shorts indisponible.",
  };
}

async function authorizeSchedulingAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

export async function GET() {
  const user = await authorizeSchedulingAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    return NextResponse.json(await readShortsSchedulingState({ userId: user.id }));
  } catch (error) {
    console.error("[Shorts Scheduling API] GET failed", scheduleErrorPayload(error));
    return NextResponse.json(scheduleErrorPayload(error), { status: 400 });
  }
}

export async function POST(request: Request) {
  const user = await authorizeSchedulingAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const action = typeof payload.action === "string" ? payload.action : "save";

  try {
    if (action === "update_schedule") {
      const data = payload.data && typeof payload.data === "object"
        ? payload.data as ShortVideoScheduleUpdateInput
        : null;

      if (!data?.scheduleId) {
        return NextResponse.json({ error: "Programmation manquante." }, { status: 400 });
      }

      return NextResponse.json(await updateShortVideoSchedule({
        input: data,
        userId: user.id,
      }));
    }

    if (action === "cancel_schedule") {
      const scheduleId = typeof payload.scheduleId === "string" ? payload.scheduleId : "";
      if (!scheduleId) {
        return NextResponse.json({ error: "Programmation manquante." }, { status: 400 });
      }

      return NextResponse.json(await cancelShortVideoSchedule({
        scheduleId,
        userId: user.id,
      }));
    }

    const entries = Array.isArray(payload.entries)
      ? payload.entries as ShortVideoScheduleInput[]
      : [];

    if (entries.length === 0) {
      return NextResponse.json({ error: "Aucune programmation a enregistrer." }, { status: 400 });
    }

    await saveShortVideoSchedules({
      entries,
      userId: user.id,
    });

    return NextResponse.json(await readShortsSchedulingState({ userId: user.id }));
  } catch (error) {
    console.error("[Shorts Scheduling API] POST failed", scheduleErrorPayload(error));
    return NextResponse.json(scheduleErrorPayload(error), { status: 400 });
  }
}
