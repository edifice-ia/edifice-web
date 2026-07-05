import { NextResponse } from "next/server";
import {
  executeAssistantWorkflow,
  type AssistantWorkflow,
} from "@/lib/server/assistant-workflows/shorts-workflow-engine";
import { canAccessPrivateCockpit } from "@/src/lib/auth/roles";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

function isWorkflow(value: unknown): value is AssistantWorkflow {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { id?: unknown }).id === "string" &&
      Array.isArray((value as { actions?: unknown }).actions),
  );
}

// Execute endpoint for validated workflows. V1 only runs safe, non-sensitive
// actions and skips sensitive placeholders with explicit log records.
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

  if (!isWorkflow(payload.workflow)) {
    return NextResponse.json({ error: "Workflow valide requis." }, { status: 400 });
  }

  try {
    const result = await executeAssistantWorkflow({
      workflow: payload.workflow,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Assistant Workflow API] execute failed", {
      workflow_id: payload.workflow.id,
      user_intent: payload.workflow.user_intent,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution workflow indisponible." },
      { status: 400 },
    );
  }
}
