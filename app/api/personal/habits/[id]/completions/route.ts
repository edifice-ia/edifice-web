import { NextResponse } from "next/server";
import { parseCompletionDay } from "@/lib/personal/habits";
import {
  markHabitCompletion,
  unmarkHabitCompletion,
} from "@/lib/server/personal/habits-store";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

// Marque un jour comme realise. Le jour par defaut est aujourd'hui en
// Europe/Paris ; un jour explicite se passe dans le corps ({ date: "AAAA-MM-JJ" })
// pour rattraper un oubli de la veille.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  const { id } = await context.params;

  // Corps facultatif : marquer aujourd'hui ne demande aucune charge utile.
  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const record = payload && typeof payload === "object" ? (payload as { date?: unknown }) : null;
  const parsed = parseCompletionDay(record?.date);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const marked = await markHabitCompletion({
      userId: user.id,
      habitId: id,
      day: parsed.day,
    });

    if (!marked) {
      return NextResponse.json({ error: "Habitude introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, date: parsed.day });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Marquage de la realisation indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Retire la realisation d'un jour. Suppression physique assumee : voir la
// migration 20260806100000. Le jour se passe en parametre de requete
// (?date=AAAA-MM-JJ), un DELETE avec corps etant mal supporte par les
// intermediaires HTTP.
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  const { id } = await context.params;
  const dateParam = new URL(request.url).searchParams.get("date");
  const parsed = parseCompletionDay(dateParam);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const unmarked = await unmarkHabitCompletion({
      userId: user.id,
      habitId: id,
      day: parsed.day,
    });

    if (!unmarked) {
      return NextResponse.json({ error: "Habitude introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, date: parsed.day });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Retrait de la realisation indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
