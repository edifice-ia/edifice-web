import { NextResponse } from "next/server";
import { parseJournalCreatePayload } from "@/lib/personal/journal";
import {
  countArchivedPersonalJournalEntries,
  createPersonalJournalEntry,
  listArchivedPersonalJournalEntries,
  listPersonalJournalEntries,
} from "@/lib/server/personal/journal-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// ?archived=true bascule sur les entrees archivees. Meme contrat que les notes :
// pas de valeur "all", les deux etats ne se melangent jamais.
export async function GET(request: Request) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const archived = new URL(request.url).searchParams.get("archived") === "true";

  try {
    if (archived) {
      const entries = await listArchivedPersonalJournalEntries(user.id);

      return NextResponse.json({ ok: true, entries });
    }

    const [entries, archivedCount] = await Promise.all([
      listPersonalJournalEntries(user.id),
      countArchivedPersonalJournalEntries(user.id),
    ]);

    return NextResponse.json({ ok: true, entries, archivedCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture du journal indisponible.";
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

  const parsed = parseJournalCreatePayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const entry = await createPersonalJournalEntry({
      userId: user.id,
      content: parsed.content,
      mood: parsed.mood,
    });

    return NextResponse.json({ ok: true, entry }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Creation de l'entree indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
