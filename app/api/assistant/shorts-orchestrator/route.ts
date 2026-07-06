import { NextResponse } from "next/server";
import {
  buildShortsAssistantPlan,
  executeShortsProductionPipeline,
  type ShortsProductionMode,
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

// Keeps API mode parsing conservative: unknown values fall back to Assisted,
// which is the default semi-automatic mode.
function sanitizeMode(value: unknown): ShortsProductionMode {
  return value === "automatic" || value === "manual" ? value : "assisted";
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
      const mode = sanitizeMode(payload.mode ?? plan?.mode);

      if (!plan) {
        return NextResponse.json({ error: "Plan analyse requis avant execution." }, { status: 400 });
      }

      return NextResponse.json(await executeShortsProductionPipeline({
        command: plan.command,
        mode,
        userId: user.id,
      }));
    }

    const command = sanitizeCommand(payload.command);
    if (!command) {
      return NextResponse.json({ error: "Commande naturelle obligatoire." }, { status: 400 });
    }

    const plan = await buildShortsAssistantPlan({
      command,
      mode: sanitizeMode(payload.mode),
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
