import { NextResponse } from "next/server";
import { parseNoteContent } from "@/lib/personal/notes";
import {
  softDeletePersonalNote,
  updatePersonalNoteContent,
} from "@/lib/server/personal/notes-store";
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

  const parsed = parseNoteContent(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const note = await updatePersonalNoteContent({
      userId: user.id,
      noteId: id,
      content: parsed.content,
    });

    // note vaut null si l'identifiant n'existe pas, appartient a quelqu'un
    // d'autre, ou pointe une note deja supprimee. Les trois repondent 404 :
    // distinguer "interdit" de "introuvable" confirmerait l'existence d'une
    // note d'autrui.
    if (!note) {
      return NextResponse.json({ error: "Note introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, note });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mise a jour de la note indisponible.";
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
    const deleted = await softDeletePersonalNote({ userId: user.id, noteId: id });

    if (!deleted) {
      return NextResponse.json({ error: "Note introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suppression de la note indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
