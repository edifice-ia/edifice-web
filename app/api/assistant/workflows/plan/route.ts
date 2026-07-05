import { NextResponse } from "next/server";
import { planAssistantWorkflow } from "@/lib/server/assistant-workflows/shorts-workflow-engine";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

function sanitizeCommand(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const command = value.trim();
  return command.length > 0 ? command.slice(0, 1000) : null;
}

// Plan endpoint for the assistant workflow engine. It is deliberately read-only:
// the response is an executable workflow object, but no action is run here.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const command = sanitizeCommand(payload.command);
  if (!command) {
    return NextResponse.json({ error: "Commande naturelle obligatoire." }, { status: 400 });
  }

  try {
    const workflow = await planAssistantWorkflow({
      command,
      userId: user.id,
    });

    return NextResponse.json({ ok: true, workflow });
  } catch (error) {
    console.error("[Assistant Workflow API] plan failed", {
      user_intent: command,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Workflow indisponible." },
      { status: 400 },
    );
  }
}
