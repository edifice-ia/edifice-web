import { NextResponse } from "next/server";
import { restorePersonalTask } from "@/lib/server/personal/tasks-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Route dediee a la restauration, separee de DELETE /[id] qui archive. Les deux
// gestes ne partagent ni fichier, ni fonction de store, ni charge utile — regle
// posee par 11-modularite-configuration.md, et appliquee a l'identique sur les
// trois autres modules du pole.
//
// Restaurer remet deleted_at a null. C'est un UPDATE, donc la policy update
// deja scopee au proprietaire suffit : aucune policy nouvelle n'a ete
// necessaire, archiver etant deja un UPDATE de la meme colonne.
//
// Le statut, l'echeance et le contexte sont conserves tels qu'ils etaient a
// l'archivage — une tache archivee cochee revient cochee.
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const { id } = await context.params;

  try {
    const restored = await restorePersonalTask({ userId: user.id, taskId: id });

    // false si la tache n'existe pas, ne lui appartient pas, ou n'est pas
    // archivee. Les trois repondent 404, comme partout ailleurs dans le pole.
    if (!restored) {
      return NextResponse.json({ error: "Tache introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Restauration de la tache indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
