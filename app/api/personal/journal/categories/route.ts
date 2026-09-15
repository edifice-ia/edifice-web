import { NextResponse } from "next/server";
import {
  JOURNAL_CATEGORY_NAME_TAKEN,
  parseJournalCategoryCreatePayload,
} from "@/lib/personal/journal-categories";
import {
  createJournalCategory,
  JournalCategoryNameConflictError,
  listJournalCategories,
} from "@/lib/server/personal/journal-categories-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Segment statique a cote de journal/[id] : Next resout un segment statique
// avant un segment dynamique de meme niveau. Precedent dans le depot :
// app/api/oauth/, ou [provider] cotoie youtube, tiktok, meta, garmin et
// calendar. Un identifiant d'entree ne peut de toute facon pas valoir
// "categories" : c'est un UUID.

// Categories du compte, triees par nom, chacune avec son compte d'entrees
// ARCHIVEES COMPRISES et la part archivee de ce compte — voir
// PersonalJournalCategoryWithCounts.
export async function GET() {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  try {
    const categories = await listJournalCategories(user.id);

    return NextResponse.json({ ok: true, categories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture des categories indisponible.";
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

  const parsed = parseJournalCategoryCreatePayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const category = await createJournalCategory({
      userId: user.id,
      name: parsed.name,
      description: parsed.description,
    });

    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (error) {
    if (error instanceof JournalCategoryNameConflictError) {
      return NextResponse.json(
        { error: error.message, code: JOURNAL_CATEGORY_NAME_TAKEN },
        { status: 409 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Creation de la categorie indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
