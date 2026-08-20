import { NextResponse } from "next/server";
import { permanentlyDeletePersonalItem } from "@/lib/server/personal/data-erasure-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// SUPPRESSION PHYSIQUE ET IRREVERSIBLE d'un element archive.
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
// Quatre gardes :
//   1. session obligatoire (401 sans session) ;
//   2. role autorise sur le cockpit prive (403 pour un reviewer), via le helper
//      partage — pose des la conception, pas en correctif ;
//   3. filtre triple cote store : id + user_id + deleted_at non nul. Un element
//      ACTIF ne peut pas etre supprime par cette route, meme en postant son id ;
//   4. execution par la cle service-role, seule capable de supprimer,
//
// Habitudes est le seul des trois a porter une table dependante : les
// realisations sont supprimees explicitement AVANT l'habitude, et leur volume
// est renvoye dans relatedDeletedCount. L'eligibilite est verifiee avant toute
// suppression, pour qu'un 404 ne detruise jamais de realisations au passage.
//
// Ce geste ne vide pas le module : les autres elements archives ne sont pas
// touches. Voir /api/personal/settings/erase pour le geste a l'echelle du
// module.
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const { id } = await context.params;

  try {
    const result = await permanentlyDeletePersonalItem({
      userId: user.id,
      moduleId: "habits",
      itemId: id,
    });

    // null si l'element n'existe pas, ne lui appartient pas, ou n'est pas
    // archive. Les trois repondent 404 sans se distinguer : les separer
    // transformerait la route en oracle d'existence.
    if (!result) {
      return NextResponse.json({ error: "Habitude introuvable." }, { status: 404 });
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
