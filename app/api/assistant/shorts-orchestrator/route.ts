import { NextResponse } from "next/server";
import {
  buildShortsAssistantPlan,
  previewShortsAssistantExecution,
  type ShortsAssistantPlan,
} from "@/lib/server/assistant-actions/shorts";
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

async function authorizeShortsOrchestratorAccess() {
  const user = await getCurrentUser();

  if (!user || !canAccessPrivateCockpit(user)) {
    return null;
  }

  return user;
}

export async function POST(request: Request) {
  const user = await authorizeShortsOrchestratorAccess();

  if (!user) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide: JSON attendu." }, { status: 400 });
  }

  const action = typeof payload.action === "string" ? payload.action : "analyze";

  try {
    if (action === "execute") {
      const plan = payload.plan && typeof payload.plan === "object"
        ? payload.plan as ShortsAssistantPlan
        : null;

      if (!plan) {
        return NextResponse.json({ error: "Plan analyse requis avant execution." }, { status: 400 });
      }

      // V1 guardrail: this route exposes the future execution entry point, but
      // intentionally returns a dry response until per-action confirmations and
      // audit logs are implemented.
      return NextResponse.json(previewShortsAssistantExecution(plan));
    }

    const command = sanitizeCommand(payload.command);
    if (!command) {
      return NextResponse.json({ error: "Commande naturelle obligatoire." }, { status: 400 });
    }

    const plan = await buildShortsAssistantPlan({
      command,
      userId: user.id,
    });

    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    console.error("[Shorts Orchestrator API] request failed", {
      action,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pilotage IA Shorts indisponible." },
      { status: 400 },
    );
  }
}
