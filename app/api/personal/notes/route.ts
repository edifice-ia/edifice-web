import { NextResponse } from "next/server";
import { parseNoteContent } from "@/lib/personal/notes";
import { createPersonalNote, listPersonalNotes } from "@/lib/server/personal/notes-store";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  try {
    const notes = await listPersonalNotes(user.id);

    return NextResponse.json({ ok: true, notes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture des notes indisponible.";
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
