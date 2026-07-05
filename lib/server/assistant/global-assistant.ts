import "server-only";

import {
  buildAssistantWorkflowResponse,
  planAssistantWorkflow,
} from "@/lib/server/assistant-workflows/engine";
import type { ProjectContext } from "@/types/cockpit";
import type { TrajectoireProject } from "@/lib/server/trajectoire";

export type GlobalAssistantMode = "project" | "interior" | "balance";

export type GlobalAssistantInput = {
  message: string;
  mode: GlobalAssistantMode;
  context: ProjectContext;
  trajectoire?: {
    projects: TrajectoireProject[];
  };
  userId: string;
};

// Canonical facade for /api/assistant/global. Every command is delegated to the
// Workflow Engine and follows the same analyze -> resources -> workflow ->
// estimates -> dependencies -> plan flow.
export async function globalAssistant(input: GlobalAssistantInput) {
  const workflow = await planAssistantWorkflow({
    command: input.message,
    context: input.context,
    userId: input.userId,
  });

  return buildAssistantWorkflowResponse(workflow);
}
