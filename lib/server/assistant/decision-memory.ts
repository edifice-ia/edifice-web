import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AssistantDecisionMemoryInput = {
  chosenAction?: string | null;
  confirmed: boolean;
  metadata?: Record<string, unknown>;
  recommendedDecision: string;
  source: string;
  status?: "proposed" | "confirmed" | "executed" | "cancelled";
  userId: string;
  workflowId?: string | null;
};

let decisionMemoryClient: SupabaseClient | null = null;

function getDecisionMemoryClient() {
  if (decisionMemoryClient) {
    return decisionMemoryClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Assistant decision memory requires Supabase service configuration.");
  }

  decisionMemoryClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return decisionMemoryClient;
}

// Prepares a decision memory row without writing it. The UI can display this
// preview before asking for explicit confirmation.
export function prepareAssistantDecisionMemoryRecord(input: AssistantDecisionMemoryInput) {
  return {
    chosen_action: input.chosenAction ?? null,
    metadata: input.metadata ?? {},
    recommended_decision: input.recommendedDecision,
    source: input.source,
    status: input.status ?? "proposed",
    user_id: input.userId,
    workflow_id: input.workflowId ?? null,
  };
}

// Writes a decision only after explicit user confirmation. Callers must never
// pass confirmed=true implicitly from workflow planning or dry-run execution.
export async function saveAssistantDecisionMemory(input: AssistantDecisionMemoryInput) {
  if (!input.confirmed) {
    throw new Error("Confirmation explicite requise avant d'enregistrer une decision assistant.");
  }

  const record = prepareAssistantDecisionMemoryRecord(input);
  const { data, error } = await getDecisionMemoryClient()
    .from("assistant_decision_memory")
    .insert(record)
    .select("id,created_at,status")
    .single();

  if (error) {
    throw new Error(`Decision assistant non enregistree: ${error.message}`);
  }

  return data;
}
