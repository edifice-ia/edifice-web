import { NextResponse } from "next/server";
import { isUuid } from "@/lib/personal/goals";
import { restorePersonalGoal } from "@/lib/server/personal/goals-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Route dediee a la restauration, separee de DELETE /[id] qui archive. Les deux
// gestes ne partagent ni fichier, ni fonction de store, ni charge utile — regle
// posee par 11-modularite-configuration.md, et appliquee a l'identique sur les
// quatre autres modules du pole.
//
// Restaurer remet deleted_at a null. C'est un UPDATE, donc la policy update deja
// scopee au proprietaire suffit : aucune policy nouvelle n'a ete necessaire,
// archiver etant deja un UPDATE de la meme colonne.
//
// Les valeurs, l'unite, l'echeance et le statut sont conserves tels qu'ils
// etaient a l'archivage — un objectif archive declare atteint revient atteint.
export async function POST(
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
    const restored = await restorePersonalGoal({ userId: user.id, goalId: id });

    // false si l'objectif n'existe pas, ne lui appartient pas, ou n'est pas
    // archive. Les trois repondent 404, comme partout ailleurs dans le pole.
    if (!restored) {
      return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Restauration de l'objectif indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
