import { NextResponse } from "next/server";
import {
  createProjectMemoryEntry,
  inferProjectMemoryUpdate,
  readProjectMemoryEntries,
  sanitizeProjectMemoryInput,
  updateProjectMemory,
} from "@/lib/server/project-memory";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

async function authorizeProjectMemoryAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

export async function GET() {
  if (!(await authorizeProjectMemoryAccess())) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    const entries = await readProjectMemoryEntries();
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json(
      { error: "Lecture memoire projet indisponible." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await authorizeProjectMemoryAccess();

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

  try {
    const record = payload && typeof payload === "object"
      ? payload as Record<string, unknown>
      : {};

    if (record.action === "propose_update" || record.action === "propose") {
      const message = typeof record.message === "string" ? record.message : "";
      const entries = await readProjectMemoryEntries();
      const proposal = inferProjectMemoryUpdate(message, entries);

      return NextResponse.json({
        proposal,
        requiresConfirmation: Boolean(proposal),
      });
    }

    if (record.action === "confirm_update" || record.action === "confirm") {
      const proposal = record.proposal;

      if (!proposal || typeof proposal !== "object") {
        return NextResponse.json(
          { error: "Proposition memoire manquante." },
          { status: 400 },
        );
      }

      const entry = await updateProjectMemory({
        proposal: proposal as Parameters<typeof updateProjectMemory>[0]["proposal"],
        userId: user.id,
      });

      return NextResponse.json({ entry });
    }

    const input = sanitizeProjectMemoryInput(payload);
    const entry = await createProjectMemoryEntry(input);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Creation memoire projet indisponible.",
      },
      { status: 400 },
    );
  }
}
