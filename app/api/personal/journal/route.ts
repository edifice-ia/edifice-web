import { NextResponse } from "next/server";
import { parseJournalCreatePayload } from "@/lib/personal/journal";
import {
  createPersonalJournalEntry,
  listPersonalJournalEntries,
} from "@/lib/server/personal/journal-store";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  try {
    const entries = await listPersonalJournalEntries(user.id);

    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture du journal indisponible.";
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
