import { NextResponse } from "next/server";
import { isUuid, parseGoalUpdatePayload } from "@/lib/personal/goals";
import {
  softDeletePersonalGoal,
  updatePersonalGoal,
} from "@/lib/server/personal/goals-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Le format de l'identifiant est valide avant d'atteindre Postgres, comme sur
// les routes des categories de Journal : un identifiant malformé repond 404, et
// non 500 via un 22P02. Les routes plus anciennes du pole ne font pas encore ce
// controle.

// Mise a jour partielle : intitule, valeurs, unite, echeance, statut. Mettre a
// jour la seule valeur actuelle passe par ici avec { currentValue: N } — il
// n'existe pas de route dediee, une valeur etant un champ comme un autre.
//
// Le statut ne change JAMAIS tout seul : atteindre la cible ne fait pas passer un
// objectif a 'achieved'. "Cible atteinte" se deduit des valeurs, "atteint" se
// declare, et l'ecran montre les deux sans les confondre.
export async function PATCH(
  request: Request,
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

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const parsed = parseGoalUpdatePayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await updatePersonalGoal({
      userId: user.id,
      goalId: id,
      updates: parsed.updates,
    });

    // "cible egale au depart" sur les valeurs resultantes : le parser ne peut le
    // voir que si les deux valeurs sont envoyees ensemble, la base tranche le
    // reste. Refus lisible en 400, jamais une 500 sur un 23514.
    if (result.status === "invalid") {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Inexistant, d'un autre compte, ou archive : les trois repondent 404, comme
    // partout ailleurs dans le pole. Les distinguer transformerait la route en
    // oracle d'existence.
    if (result.status === "not_found") {
      return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, goal: result.goal });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mise a jour de l'objectif indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ARCHIVE, ne supprime pas. Ecrit deleted_at ; la ligne reste en base et reste
// restaurable par POST /[id]/restore.
//
// Aucune suppression physique n'existe dans ce module : personal_goals
// n'accorde pas DELETE a authenticated et ne porte aucune policy DELETE. Les
// deux couches sont en place des la creation de la table.
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
    const archived = await softDeletePersonalGoal({ userId: user.id, goalId: id });

    if (!archived) {
      return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Archivage de l'objectif indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
