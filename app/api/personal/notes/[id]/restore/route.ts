import { NextResponse } from "next/server";
import { restorePersonalNote } from "@/lib/server/personal/notes-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Route dediee a la restauration, volontairement separee de DELETE /[id] qui
// archive. Les deux gestes ne partagent ni fichier, ni fonction de store, ni
// charge utile : 11-modularite-configuration.md pose qu'archiver et supprimer
// definitivement ne doivent jamais partager un bouton ni une confirmation.
//
// Ce module ne comporte AUCUNE suppression physique. La table n'accorde pas le
// privilege DELETE a authenticated et ne porte aucune policy DELETE ; le geste
// RGPD passera par la cle service-role, dans un chantier a part.
//
// Cote base, la restauration est un UPDATE de deleted_at : elle emprunte donc
// la policy update deja en place, scopee au proprietaire par
// using (user_id = auth.uid()) with check (user_id = auth.uid()). Aucune policy
// nouvelle n'a ete necessaire.
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
    const restored = await restorePersonalNote({ userId: user.id, noteId: id });

    // false si la note n'existe pas, ne lui appartient pas, ou n'est pas
    // archivee. Les trois repondent 404, comme partout ailleurs dans le module.
    if (!restored) {
      return NextResponse.json({ error: "Note introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Restauration de la note indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
