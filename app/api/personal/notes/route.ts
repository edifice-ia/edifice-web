import { NextResponse } from "next/server";
import { parseNoteContent } from "@/lib/personal/notes";
import {
  countArchivedPersonalNotes,
  createPersonalNote,
  listArchivedPersonalNotes,
  listPersonalNotes,
} from "@/lib/server/personal/notes-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// ?archived=true bascule sur les notes archivees. Les deux etats ne se
// melangent jamais dans une meme liste : il n'existe pas de valeur "all", pour
// qu'aucun affichage ne puisse laisser croire qu'une note archivee est active.
export async function GET(request: Request) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const archived = new URL(request.url).searchParams.get("archived") === "true";

  try {
    if (archived) {
      const notes = await listArchivedPersonalNotes(user.id);

      return NextResponse.json({ ok: true, notes });
    }

    // Le compteur d'archives accompagne la liste active : l'UI affiche
    // "Voir les archives (N)" sans second aller-retour.
    const [notes, archivedCount] = await Promise.all([
      listPersonalNotes(user.id),
      countArchivedPersonalNotes(user.id),
    ]);

    return NextResponse.json({ ok: true, notes, archivedCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture des notes indisponible.";
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

  const parsed = parseNoteContent(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const note = await createPersonalNote({ userId: user.id, content: parsed.content });

    return NextResponse.json({ ok: true, note }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Creation de la note indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
