import { NextResponse } from "next/server";
import { parseTaskPayload } from "@/lib/personal/tasks";
import {
  countArchivedPersonalTasks,
  countPendingPersonalTasks,
  createPersonalTask,
  listArchivedPersonalTasks,
  listPersonalTasks,
} from "@/lib/server/personal/tasks-store";
import { authorizeCockpitApiAccess } from "@/src/lib/auth/api-guards";

export const runtime = "nodejs";

// Garde DEC-007 pose des le premier commit, et non en correctif : getCurrentUser()
// ET canAccessPrivateCockpit, via le helper partage. C'est la lecon de d6d0108,
// ou /api/personal/settings/erase avait vecu sans filtre de role parce que le
// controle avait ete reecrit inline.

// ?archived=true bascule sur les taches archivees. Meme contrat que les trois
// autres modules du pole : pas de valeur "all", les deux etats ne se melangent
// jamais dans une meme liste.
//
// La liste active renvoie deux compteurs : archivedCount pour le bouton
// d'archives, et pendingCount — la "charge de taches en attente" de
// 23-modules.md, calculee a la lecture et jamais persistee.
export async function GET(request: Request) {
  const { user, response } = await authorizeCockpitApiAccess();

  if (!user) {
    return response;
  }

  const archived = new URL(request.url).searchParams.get("archived") === "true";

  try {
    if (archived) {
      const tasks = await listArchivedPersonalTasks(user.id);

      return NextResponse.json({ ok: true, tasks });
    }

    const [tasks, archivedCount, pendingCount] = await Promise.all([
      listPersonalTasks(user.id),
      countArchivedPersonalTasks(user.id),
      countPendingPersonalTasks(user.id),
    ]);

    return NextResponse.json({ ok: true, tasks, archivedCount, pendingCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture des taches indisponible.";
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

  const parsed = parseTaskPayload(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const task = await createPersonalTask({
      userId: user.id,
      title: parsed.title,
      dueOn: parsed.dueOn,
      contextLabel: parsed.contextLabel,
    });

    return NextResponse.json({ ok: true, task }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Creation de la tache indisponible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
