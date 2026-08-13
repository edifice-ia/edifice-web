import { NextResponse } from "next/server";
import { restorePersonalHabit } from "@/lib/server/personal/habits-store";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

// Route dediee a la restauration, separee de DELETE /[id] qui archive. Meme
// raisonnement que pour Notes et Journal : les deux gestes ne partagent ni
// fichier, ni fonction de store, ni charge utile (11-modularite-configuration.md).
//
// Aucune suppression physique d'habitude n'existe : personal_habits n'accorde
// pas DELETE a authenticated et ne porte aucune policy DELETE. La restauration
// est un UPDATE de deleted_at et emprunte la policy update deja scopee au
// proprietaire — aucune policy nouvelle n'a ete necessaire.
//
// Les realisations n'ont jamais ete affectees par l'archivage : restaurer une
// habitude retrouve son historique intact, et ses statistiques sont recalculees
// a la lecture suivante.
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const restored = await restorePersonalHabit({ userId: user.id, habitId: id });

    // false si l'habitude n'existe pas, ne lui appartient pas, ou n'est pas
    // archivee. Les trois repondent 404, comme partout ailleurs dans le module.
    if (!restored) {
      return NextResponse.json({ error: "Habitude introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Restauration de l'habitude indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
