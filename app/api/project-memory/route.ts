import { NextResponse } from "next/server";
import {
  createProjectMemoryEntry,
  readProjectMemoryEntries,
  sanitizeProjectMemoryInput,
} from "@/lib/server/project-memory";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

async function authorizeProjectMemoryAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return false;
  }

  return true;
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
  if (!(await authorizeProjectMemoryAccess())) {
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
