import { NextResponse } from "next/server";
import {
  isUuid,
  JOURNAL_CATEGORY_DELETE_RACE,
  JOURNAL_CATEGORY_IN_USE,
  JOURNAL_CATEGORY_NAME_TAKEN,
  parseJournalCategoryUpdatePayload,
} from "@/lib/personal/journal-categories";
import {
  deleteJournalCategory,
  JournalCategoryNameConflictError,
  updateJournalCategory,
} from "@/lib/server/personal/journal-categories-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Renommage et modification de description. 404 uniforme : categorie
// inexistante, d'un autre compte, ou identifiant malforme — les distinguer
// ferait de la route un oracle d'existence.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const { id } = await context.params;

  if (!isUuid(id)) {
    return NextResponse.json({ error: "Categorie introuvable." }, { status: 404 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const parsed = parseJournalCategoryUpdatePayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const category = await updateJournalCategory({
      userId: user.id,
      categoryId: id,
      patch: parsed.patch,
    });

    if (!category) {
      return NextResponse.json({ error: "Categorie introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, category });
  } catch (error) {
    if (error instanceof JournalCategoryNameConflictError) {
      return NextResponse.json(
        { error: error.message, code: JOURNAL_CATEGORY_NAME_TAKEN },
        { status: 409 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Modification de la categorie indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// SUPPRESSION PHYSIQUE ET IRREVERSIBLE d'une categorie. Il n'y a pas de
// corbeille : une categorie supprimee se recree a la main.
//
// 409 CATEGORY_IN_USE si une entree, active ou archivee, n'a que cette
// categorie. Rien n'est ecrit dans ce cas ; la reponse porte les entrees a
// reassigner, avec leur date, leur humeur et un apercu calcule cote serveur.
//
// Les entrees qui ont d'autres categories perdent seulement celle-ci, sans
// blocage : c'est unlinkedEntryCount.
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const { id } = await context.params;

  if (!isUuid(id)) {
    return NextResponse.json({ error: "Categorie introuvable." }, { status: 404 });
  }

  try {
    const result = await deleteJournalCategory({ userId: user.id, categoryId: id });

    switch (result.status) {
      case "not_found":
        return NextResponse.json({ error: "Categorie introuvable." }, { status: 404 });
      case "blocked":
        return NextResponse.json(
          {
            error:
              "Suppression impossible : des entrees n'ont que cette categorie. Reassignez-les d'abord.",
            code: JOURNAL_CATEGORY_IN_USE,
            entries: result.entries,
          },
          { status: 409 },
        );
      case "race":
        return NextResponse.json(
          {
            error:
              "La categorie vient d'etre rattachee a une entree pendant la suppression. Reessayez.",
            code: JOURNAL_CATEGORY_DELETE_RACE,
          },
          { status: 409 },
        );
      case "deleted":
        console.info("[Personal Journal Category] categorie supprimee", {
          userId: user.id,
          categoryId: id,
          unlinkedEntryCount: result.unlinkedEntryCount,
        });

        return NextResponse.json({
          ok: true,
          unlinkedEntryCount: result.unlinkedEntryCount,
        });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suppression de la categorie indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
