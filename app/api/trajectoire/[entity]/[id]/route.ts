import { NextResponse } from "next/server";
import {
  archiveTrajectoireProject,
  deleteTrajectoireEntity,
  readTrajectoire,
  recalculateTrajectoireProgress,
  sanitizeActionInput,
  sanitizeObjectiveInput,
  sanitizeProjectInput,
  updateTrajectoireAction,
  updateTrajectoireObjective,
  updateTrajectoireProject,
} from "@/lib/server/trajectoire";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

type RouteEntity = "project" | "objective" | "action";

function parseEntity(value: string): RouteEntity | null {
  if (value === "project" || value === "objective" || value === "action") {
    return value;
  }

  return null;
}

async function authorizeTrajectoireAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ entity: string; id: string }> },
) {
  const user = await authorizeTrajectoireAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const { entity: entityParam, id } = await context.params;
  const entity = parseEntity(entityParam);

  if (!entity) {
    return NextResponse.json(
      { error: "Type Trajectoire inconnu." },
      { status: 400 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requete invalide: JSON attendu." },
      { status: 400 },
    );
  }

  const record = payload && typeof payload === "object"
    ? payload as Record<string, unknown>
    : {};

  try {
    if (entity === "project" && record.action === "archive") {
      await archiveTrajectoireProject({ id, userId: user.id });
    } else if (entity === "project") {
      await updateTrajectoireProject({
        id,
        input: sanitizeProjectInput(record.data ?? payload),
        userId: user.id,
      });
    } else if (entity === "objective") {
      await updateTrajectoireObjective({
        id,
        input: sanitizeObjectiveInput(record.data ?? payload),
        userId: user.id,
      });
    } else {
      await updateTrajectoireAction({
        id,
        input: sanitizeActionInput(record.data ?? payload),
        userId: user.id,
      });
    }

    await recalculateTrajectoireProgress(user.id);

    return NextResponse.json(await readTrajectoire(user.id));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mise a jour Trajectoire indisponible.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ entity: string; id: string }> },
) {
  const user = await authorizeTrajectoireAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const { entity: entityParam, id } = await context.params;
  const entity = parseEntity(entityParam);

  if (!entity) {
    return NextResponse.json(
      { error: "Type Trajectoire inconnu." },
      { status: 400 },
    );
  }

  try {
    await deleteTrajectoireEntity({ entity, id, userId: user.id });

    return NextResponse.json(await readTrajectoire(user.id));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Suppression Trajectoire indisponible.",
      },
      { status: 400 },
    );
  }
}
