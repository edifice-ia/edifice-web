import { NextResponse } from "next/server";
import { buildProjectContext } from "@/lib/server/assistant/build-project-context";
import { inferProjectMemoryUpdate } from "@/lib/server/project-memory";
import {
  globalAssistant,
  type GlobalAssistantMode,
} from "@/lib/server/assistant/global-assistant";
import {
  enrichTrajectoireAssistantProposal,
  inferTrajectoireUpdateFromMessage,
  readTrajectoire,
} from "@/lib/server/trajectoire";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

function isGlobalAssistantMode(value: unknown): value is GlobalAssistantMode {
  return value === "project" || value === "interior" || value === "balance";
}

function sanitizeMessage(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const message = value.trim();
  return message.length > 0 ? message.slice(0, 2000) : null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  console.info("[Global Assistant] request received");

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requete invalide: JSON attendu." },
      { status: 400 },
    );
  }

  const body = payload as { message?: unknown; mode?: unknown };
  const message = sanitizeMessage(body.message);
  const mode = isGlobalAssistantMode(body.mode) ? body.mode : "project";

  if (!message) {
    return NextResponse.json(
      { error: "Message utilisateur obligatoire." },
      { status: 400 },
    );
  }

  try {
    const context = await buildProjectContext();
    console.info("[Global Assistant] project context loaded");
    const memoryProposal = inferProjectMemoryUpdate(
      message,
      context.projectMemoryEntries,
    );
    const trajectoire = await readTrajectoire(user.id);
    const response = await globalAssistant({
      message,
      mode,
      context,
      trajectoire,
    });
    const trajectoryProposal = response.trajectoryProposal
      ? await enrichTrajectoireAssistantProposal({
          proposal: response.trajectoryProposal,
          userId: user.id,
        })
      : null;
    const trajectoryUpdateProposal = await inferTrajectoireUpdateFromMessage({
      message,
      userId: user.id,
    });
    const enrichedResponse = {
      ...response,
      trajectoryProposal,
      trajectoryUpdateProposal,
    };

    if (memoryProposal) {
      return NextResponse.json({
        ...enrichedResponse,
        memoryProposal,
        requiresConfirmation: true,
      });
    }

    return NextResponse.json(enrichedResponse);
  } catch {
    return NextResponse.json(
      { error: "Assistant global indisponible." },
      { status: 500 },
    );
  }
}
