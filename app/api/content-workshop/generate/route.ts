import { NextResponse } from "next/server";
import {
  generateContentDraftVariants,
  sanitizeContentWorkshopInput,
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
    const variants = await generateContentDraftVariants(input);

    return NextResponse.json({ variants }, { status: 200 });
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
