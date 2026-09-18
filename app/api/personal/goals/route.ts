import { NextResponse } from "next/server";
import { parseGoalCreatePayload } from "@/lib/personal/goals";
import {
  countArchivedPersonalGoals,
  createPersonalGoal,
  listArchivedPersonalGoals,
  listPersonalGoals,
} from "@/lib/server/personal/goals-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Garde DEC-007 pose des le premier commit du module, et non en correctif :
// getCurrentUser() ET canAccessPrivateCockpit, via le helper partage. C'est la
// lecon de la route d'effacement et du chantier 5.
//
// La progression n'est PAS renvoyee : elle se calcule a partir des trois valeurs
// de l'objectif, par goalProgress dans lib/personal/goals.ts. La renvoyer ici en
// ferait une seconde source, qui pourrait diverger de la formule.

// ?archived=true bascule sur les objectifs archives. Meme contrat que les quatre
// autres modules du pole : pas de valeur "all", les deux etats ne se melangent
// jamais dans une meme liste.
export async function GET(request: Request) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const archived = new URL(request.url).searchParams.get("archived") === "true";

  try {
    if (archived) {
      const goals = await listArchivedPersonalGoals(user.id);

      return NextResponse.json({ ok: true, goals });
    }

    const [goals, archivedCount] = await Promise.all([
      listPersonalGoals(user.id),
      countArchivedPersonalGoals(user.id),
    ]);

    return NextResponse.json({ ok: true, goals, archivedCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture des objectifs indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const parsed = parseGoalCreatePayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const goal = await createPersonalGoal({
      userId: user.id,
      title: parsed.title,
      startValue: parsed.startValue,
      targetValue: parsed.targetValue,
      currentValue: parsed.currentValue,
      unitLabel: parsed.unitLabel,
      dueOn: parsed.dueOn,
    });

    return NextResponse.json({ ok: true, goal }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Creation de l'objectif indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
