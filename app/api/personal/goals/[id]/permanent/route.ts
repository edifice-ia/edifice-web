import { NextResponse } from "next/server";
import { isUuid } from "@/lib/personal/goals";
import { permanentlyDeletePersonalItem } from "@/lib/server/personal/data-erasure-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// SUPPRESSION PHYSIQUE ET IRREVERSIBLE d'un objectif archive.
//
// Route dediee, distincte de DELETE /[id] qui ARCHIVE (ecrit deleted_at) et de
// POST /[id]/restore qui restaure. Les trois gestes ne partagent ni fichier, ni
// fonction de store, ni charge utile — regle posee par
// 11-modularite-configuration.md, et qui coute ici une perte de donnees si on
// l'enfreint.
//
// Le segment /permanent porte l'irreversibilite dans le chemin lui-meme : sans
// lui, DELETE /[id] et DELETE /[id] differeraient par leur seule implementation.
//
// Cinq gardes :
//   1. session obligatoire (401 sans session) ;
//   2. role autorise sur le cockpit prive (403 pour un reviewer), via le helper
//      partage — pose des la conception, pas en correctif ;
//   3. format UUID valide AVANT toute requete : cette route passe par la cle
//      service-role, et un identifiant malforme atteindrait Postgres en 22P02,
//      remonte en 500. Les quatre routes /permanent plus anciennes ont recu le
//      meme controle le 2026-09-20, par isPersonalItemId (data-erasure.ts) ;
//   4. filtre triple cote store : id + user_id + deleted_at non nul. Un objectif
//      ACTIF ne peut pas etre supprime par cette route, meme en postant son id ;
//   5. execution par la cle service-role, seule capable de supprimer :
//      personal_goals n'accorde pas DELETE a authenticated et ne porte aucune
//      policy DELETE.
//
// Ce geste ne vide pas le module : les autres objectifs archives ne sont pas
// touches. Voir /api/personal/settings/erase pour le geste a l'echelle du
// module.
//
// Aucun store propre a Objectifs n'intervient : permanentlyDeletePersonalItem
// est generique sur ErasableModuleId, et Objectifs y est declare. C'est le meme
// invariant que partout dans le pole — un seul fichier du depot supprime
// physiquement des donnees Personnel.
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
    return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });
  }

  try {
    const result = await permanentlyDeletePersonalItem({
      userId: user.id,
      moduleId: "goals",
      itemId: id,
    });

    // null si l'objectif n'existe pas, ne lui appartient pas, ou n'est pas
    // archive. Les trois repondent 404 sans se distinguer : les separer
    // transformerait la route en oracle d'existence.
    if (!result) {
      return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });
    }

    console.info("[Personal Item Erasure] element supprime", {
      userId: user.id,
      module: result.module,
      itemId: result.itemId,
      relatedDeletedCount: result.relatedDeletedCount,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suppression definitive indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
