import { NextResponse } from "next/server";
import {
  contentDraftFromVariant,
  readContentDrafts,
  sanitizeContentWorkshopInput,
  sanitizeSelectedContentVariant,
  saveContentDraft,
} from "@/lib/server/content-workshop";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const url = new URL(request.url);

  try {
    const drafts = await readContentDrafts({
      status: url.searchParams.get("status"),
      userId: user.id,
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Lecture des brouillons indisponible.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requete invalide: JSON attendu." },
      { status: 400 },
    );
  }

  try {
    const record = payload && typeof payload === "object"
      ? payload as Record<string, unknown>
      : {};
    const input = sanitizeContentWorkshopInput(record.input);
    const variant = sanitizeSelectedContentVariant(input, record.variant);
    const draft = contentDraftFromVariant(input, variant);
    const savedDraft = await saveContentDraft({
      input,
      draft,
      userId: user.id,
    });

    return NextResponse.json({ draft: savedDraft }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Sauvegarde du brouillon indisponible.",
      },
      { status: 400 },
    );
  }
}
