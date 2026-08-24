import { NextResponse } from "next/server";
import { parseHabitPayload } from "@/lib/personal/habits";
import {
  countArchivedPersonalHabits,
  createPersonalHabit,
  listArchivedPersonalHabits,
  listPersonalHabits,
} from "@/lib/server/personal/habits-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// ?archived=true bascule sur les habitudes archivees. Meme contrat que Notes et
// Journal : pas de valeur "all", les deux etats ne se melangent jamais.
//
// Les habitudes archivees sont renvoyees SANS serie ni taux de constance —
// listArchivedPersonalHabits n'appelle pas buildHabitStats.
export async function GET(request: Request) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const archived = new URL(request.url).searchParams.get("archived") === "true";

  try {
    if (archived) {
      const habits = await listArchivedPersonalHabits(user.id);

      return NextResponse.json({ ok: true, habits });
    }

    const [habits, archivedCount] = await Promise.all([
      listPersonalHabits(user.id),
      countArchivedPersonalHabits(user.id),
    ]);

    return NextResponse.json({ ok: true, habits, archivedCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture des habitudes indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const parsed = parseHabitPayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const habit = await createPersonalHabit({
      userId: user.id,
      name: parsed.name,
      frequencyType: parsed.frequencyType,
      frequencyTarget: parsed.frequencyTarget,
    });

    return NextResponse.json({ ok: true, habit }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Creation de l'habitude indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
