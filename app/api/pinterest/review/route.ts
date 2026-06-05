import { NextResponse } from "next/server";
import {
  sanitizePinterestReviewInput,
  updatePinterestPinReview,
} from "@/lib/server/pinterest-reviews";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  try {
    const input = sanitizePinterestReviewInput(
      payload,
      user.email ?? user.id ?? "atelier_pinterest",
    );
    const review = await updatePinterestPinReview(input);
    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Validation Pinterest indisponible.",
      },
      { status: 400 },
    );
  }
}
