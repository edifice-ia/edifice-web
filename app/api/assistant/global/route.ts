import { NextResponse } from "next/server";
import { buildProjectContext } from "@/lib/server/assistant/build-project-context";
import {
  globalAssistant,
  type GlobalAssistantMode,
} from "@/lib/server/assistant/global-assistant";
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

// Single assistant entry point. It no longer returns a separate advisory format:
// every response is backed by a canonical workflow and waits for confirmation.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
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
    const response = await globalAssistant({
      context,
      message,
      mode,
      userId: user.id,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Global Assistant] workflow response failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Assistant global indisponible." },
      { status: 500 },
    );
  }
}
