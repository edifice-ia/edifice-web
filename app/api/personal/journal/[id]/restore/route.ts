import { NextResponse } from "next/server";
import { restorePersonalJournalEntry } from "@/lib/server/personal/journal-store";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

// Route dediee a la restauration, separee de DELETE /[id] qui archive. Meme
// raisonnement que pour les notes : les deux gestes ne partagent ni fichier, ni
// fonction de store, ni charge utile (11-modularite-configuration.md).
//
// Aucune suppression physique n'existe dans ce module. La restauration est un
// UPDATE de deleted_at et emprunte la policy update deja en place, scopee au
// proprietaire.
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
    const restored = await restorePersonalJournalEntry({
      userId: user.id,
      entryId: id,
    });

    if (!restored) {
      return NextResponse.json({ error: "Entree introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Restauration de l'entree indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
