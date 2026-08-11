import { NextResponse } from "next/server";
import { parseHabitPayload } from "@/lib/personal/habits";
import {
  createPersonalHabit,
  listPersonalHabits,
} from "@/lib/server/personal/habits-store";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  try {
    const habits = await listPersonalHabits(user.id);

    return NextResponse.json({ ok: true, habits });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture des habitudes indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
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
