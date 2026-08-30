import { NextResponse } from "next/server";
import { parseTaskUpdatePayload } from "@/lib/personal/tasks";
import {
  softDeletePersonalTask,
  updatePersonalTask,
} from "@/lib/server/personal/tasks-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Mise a jour partielle : titre, echeance, statut, contexte. Cocher une tache
// passe par ici avec { status: "done" } — il n'existe pas de route dediee au
// changement de statut, un statut etant un champ comme un autre.
//
// Distinguer "champ absent" de "champ a null" est ce qui permet de retirer une
// echeance sans l'effacer a chaque cochage. La distinction est faite dans
// parseTaskUpdatePayload, pas ici.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const { id } = await context.params;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const parsed = parseTaskUpdatePayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const task = await updatePersonalTask({
      userId: user.id,
      taskId: id,
      updates: parsed.updates,
    });

    // null si la tache n'existe pas, ne lui appartient pas, ou est archivee.
    // Les trois repondent 404, comme partout ailleurs dans le pole : les
    // distinguer transformerait la route en oracle d'existence.
    if (!task) {
      return NextResponse.json({ error: "Tache introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, task });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mise a jour de la tache indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ARCHIVE, ne supprime pas. Ecrit deleted_at ; la ligne reste en base et reste
// restaurable par POST /[id]/restore.
//
// Le verbe DELETE et le nom softDeletePersonalTask sont conserves pour rester
// alignes sur Notes, Journal et Habitudes — seuls les libelles affiches disent
// "Archiver", depuis le renommage du 2026-08-09.
//
// Aucune suppression physique n'existe dans ce module : personal_tasks
// n'accorde pas DELETE a authenticated depuis 20260824110000 et ne porte aucune
// policy DELETE. Les deux couches sont reellement en place, ce qui n'etait pas
// le cas des trois autres modules avant ce correctif.
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
    const archived = await softDeletePersonalTask({ userId: user.id, taskId: id });

    if (!archived) {
      return NextResponse.json({ error: "Tache introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Archivage de la tache indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
