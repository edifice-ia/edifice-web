import { NextResponse } from "next/server";
import { parseHabitPayload } from "@/lib/personal/habits";
import {
  archivePersonalHabit,
  updatePersonalHabit,
} from "@/lib/server/personal/habits-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

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

  // Nom et frequence sont fournis ensemble : la coherence entre frequencyType
  // et frequencyTarget se valide sur la paire, pas champ par champ. Un PATCH
  // partiel obligerait a relire l'existant pour valider le couple.
  const parsed = parseHabitPayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const habit = await updatePersonalHabit({
      userId: user.id,
      habitId: id,
      name: parsed.name,
      frequencyType: parsed.frequencyType,
      frequencyTarget: parsed.frequencyTarget,
    });

    // habit vaut null si l'identifiant n'existe pas, appartient a quelqu'un
    // d'autre, ou pointe une habitude archivee. Les trois repondent 404.
    if (!habit) {
      return NextResponse.json({ error: "Habitude introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, habit });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mise a jour de l'habitude indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Archivage : ecrit deleted_at, ne supprime jamais la ligne. L'historique de
// realisations est preserve.
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
    const archived = await archivePersonalHabit({ userId: user.id, habitId: id });

    if (!archived) {
      return NextResponse.json({ error: "Habitude introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Archivage de l'habitude indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
