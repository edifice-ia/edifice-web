import { NextResponse } from "next/server";
import {
  createTrajectoireAction,
  createTrajectoireFromAssistantProposal,
  createTrajectoireObjective,
  createTrajectoireProject,
  readTrajectoire,
  sanitizeActionInput,
  sanitizeAssistantProposalInput,
  sanitizeObjectiveInput,
  sanitizeProjectInput,
} from "@/lib/server/trajectoire";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

async function authorizeTrajectoireAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

export async function GET() {
  const user = await authorizeTrajectoireAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    const trajectoire = await readTrajectoire(user.id);

    return NextResponse.json(trajectoire);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Lecture de Trajectoire indisponible.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await authorizeTrajectoireAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
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
  const type = record.type;
  const action = record.action;

  try {
    if (action === "confirm_assistant_proposal") {
      const result = await createTrajectoireFromAssistantProposal({
        proposal: sanitizeAssistantProposalInput(record.proposal),
        userId: user.id,
      });
      const trajectoire = await readTrajectoire(user.id);

      return NextResponse.json({ ...trajectoire, result }, { status: 201 });
    }

    if (type === "project") {
      await createTrajectoireProject({
        input: sanitizeProjectInput(record.data),
        userId: user.id,
      });
    } else if (type === "objective") {
      await createTrajectoireObjective({
        input: sanitizeObjectiveInput(record.data),
        userId: user.id,
      });
    } else if (type === "action") {
      await createTrajectoireAction({
        input: sanitizeActionInput(record.data),
        userId: user.id,
      });
    } else {
      return NextResponse.json(
        { error: "Type Trajectoire inconnu." },
        { status: 400 },
      );
    }

    return NextResponse.json(await readTrajectoire(user.id), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Creation Trajectoire indisponible.",
      },
      { status: 400 },
    );
  }
}
