import { NextResponse } from "next/server";
import {
  generateContentDraft,
  sanitizeContentWorkshopInput,
  saveContentDraft,
} from "@/lib/server/content-workshop";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

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
    const input = sanitizeContentWorkshopInput(payload);
    const draft = await generateContentDraft(input);
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
            : "Generation du brouillon indisponible.",
      },
      { status: 400 },
    );
  }
}
