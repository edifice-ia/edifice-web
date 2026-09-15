import { NextResponse } from "next/server";
import { isUuid, parseJournalEntryCategoriesPayload } from "@/lib/personal/journal-categories";
import { setJournalEntryCategories } from "@/lib/server/personal/journal-categories-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Remplace l'ensemble des categories d'UNE entree de journal.
//
// Route dediee, et non un champ categoryIds sur la creation d'entree : l'entree
// et ses liaisons ne peuvent pas s'ecrire atomiquement. Portees par la meme
// requete, un echec sur les liaisons laisserait l'entree creee, le client
// recevrait une erreur et la recreerait en double. Ici, un echec ne laisse
// qu'une entree sans categorie — etat valide — et seul ce PUT est a rejouer.
//
// Idempotent, PUT et non POST : rejouer la meme charge utile donne le meme
// etat.
//
// Accepte une entree ARCHIVEE : c'est le chemin de reassignation depuis
// l'ecran de blocage d'une suppression de categorie.
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const { id } = await context.params;

  if (!isUuid(id)) {
    return NextResponse.json({ error: "Entree introuvable." }, { status: 404 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const parsed = parseJournalEntryCategoriesPayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await setJournalEntryCategories({
      userId: user.id,
      entryId: id,
      categoryIds: parsed.categoryIds,
    });

    // Entree ou categorie inexistante, ou appartenant a un autre compte : un
    // seul 404, qui ne dit pas laquelle des deux manque.
    if (result.status === "not_found") {
      return NextResponse.json(
        { error: "Entree ou categorie introuvable." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, categoryIds: result.categoryIds });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mise a jour des categories indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
