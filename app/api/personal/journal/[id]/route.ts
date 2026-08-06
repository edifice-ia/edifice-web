import { NextResponse } from "next/server";
import { parseJournalUpdatePayload } from "@/lib/personal/journal";
import {
  softDeletePersonalJournalEntry,
  updatePersonalJournalEntry,
} from "@/lib/server/personal/journal-store";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  const { id } = await context.params;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const parsed = parseJournalUpdatePayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const entry = await updatePersonalJournalEntry({
      userId: user.id,
      entryId: id,
      patch: parsed.patch,
    });

    // entry vaut null si l'identifiant n'existe pas, appartient a quelqu'un
    // d'autre, ou pointe une entree deja supprimee. Les trois repondent 404 :
    // distinguer "interdit" de "introuvable" confirmerait l'existence d'une
    // entree d'autrui.
    if (!entry) {
      return NextResponse.json({ error: "Entree introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mise a jour de l'entree indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Suppression logique : ecrit deleted_at, ne supprime jamais la ligne.
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const deleted = await softDeletePersonalJournalEntry({
      userId: user.id,
      entryId: id,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Entree introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suppression de l'entree indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
