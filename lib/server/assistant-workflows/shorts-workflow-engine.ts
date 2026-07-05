import "server-only";

import { randomUUID } from "crypto";
import {
  buildShortsAssistantPlan,
  type ShortsAssistantAction,
  type ShortsAssistantPlan,
} from "@/lib/server/assistant-actions/shorts";
import {
  readMediaPipelineState,
  requestDraftVisualGeneration,
} from "@/lib/server/media-pipeline";
import {
  recordSubtitleCostFromMedia,
  recordVisualCost,
  recordVoiceCostFromMedia,
} from "@/lib/server/cost-tracking";
import { generateDraftSubtitles } from "@/lib/server/subtitle-pipeline";
import { generateDraftVoice } from "@/lib/server/voice-pipeline";
import { prepareDraftVideo } from "@/lib/server/video-preparation";
import type { CostEstimate } from "@/lib/server/cost-rates";

export type AssistantWorkflowIntent =
  | "finish_started_drafts"
  | "prepare_week"
  | "schedule_ready_videos"
  | "finish_blocked_if_possible"
  | "general_plan";

export type AssistantWorkflowActionType =
  | "validate_draft_text"
  | "generate_visuals"
  | "validate_visuals"
  | "generate_voice"
  | "validate_voice"
  | "generate_subtitles"
  | "validate_subtitles"
  | "prepare_video"
  | "start_video_render"
  | "validate_video"
  | "propose_schedule"
  | "save_schedule";

export type AssistantWorkflowActionStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "skipped";

export type AssistantWorkflowAction = {
  id: string;
  type: AssistantWorkflowActionType;
  label: string;
  draft_id: string | null;
  draft_title: string | null;
  status: AssistantWorkflowActionStatus;
  estimated_time_seconds: number;
  estimated_cost: CostEstimate | null;
  requires_confirmation: boolean;
  is_sensitive: boolean;
  placeholder: boolean;
  route: string | null;
  result?: string;
  error?: string;
};

export type AssistantWorkflow = {
  id: string;
  user_intent: string;
  normalized_intent: AssistantWorkflowIntent;
  summary: string;
  status: "planned" | "running" | "success" | "failed" | "cancelled";
  created_at: string;
  actions: AssistantWorkflowAction[];
  guardrails: string[];
  analysis: {
    objective: string;
    sources: string[];
    risks: string[];
    notes: string[];
  };
};

export type AssistantWorkflowExecutionResult = {
  ok: boolean;
  workflow: AssistantWorkflow;
  failed_action: AssistantWorkflowAction | null;
  logs: Array<{
    action_id: string;
    action_type: AssistantWorkflowActionType;
    draft_id: string | null;
    result: AssistantWorkflowActionStatus;
    error: string | null;
  }>;
};

const safeExecutableActions = new Set<AssistantWorkflowActionType>([
  "generate_visuals",
  "generate_voice",
  "generate_subtitles",
  "prepare_video",
  "propose_schedule",
]);

const workflowGuardrails = [
  "Aucune publication reelle n'est incluse dans ce workflow.",
  "Aucune programmation definitive sans confirmation explicite.",
  "Les validations humaines restent sensibles et non executees automatiquement.",
  "Le runner V1 s'arrete a la premiere erreur et retourne l'action fautive.",
];

// Normalizes the user sentence into a small deterministic intent set. This is
// the future seam for an LLM planner, but V1 stays predictable.
function detectWorkflowIntent(command: string): AssistantWorkflowIntent {
  const normalized = command
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (normalized.includes("bloqu")) {
    return "finish_blocked_if_possible";
  }
  if (normalized.includes("7 jours") || normalized.includes("semaine")) {
    return "prepare_week";
  }
  if (normalized.includes("programme") || normalized.includes("planning")) {
    return "schedule_ready_videos";
  }
  if (normalized.includes("termine") || normalized.includes("finis") || normalized.includes("commence")) {
    return "finish_started_drafts";
  }

  return "general_plan";
}

// Maps the older Shorts orchestrator action vocabulary to the workflow engine
// vocabulary requested by the assistant UI.
function mapShortsActionType(action: ShortsAssistantAction): AssistantWorkflowActionType | null {
  const mapping: Partial<Record<ShortsAssistantAction["kind"], AssistantWorkflowActionType>> = {
    generate_subtitles: "generate_subtitles",
    generate_visuals: "generate_visuals",
    generate_voice: "generate_voice",
    prepare_video: "prepare_video",
    propose_schedule: "propose_schedule",
    save_schedule: "save_schedule",
    start_video_render: "start_video_render",
    validate_subtitles: "validate_subtitles",
    validate_text: "validate_draft_text",
    validate_video: "validate_video",
    validate_visuals: "validate_visuals",
    validate_voice: "validate_voice",
  };

  return mapping[action.kind] ?? null;
}

// Keeps sensitive workflow actions visible while preventing accidental runner
// execution. Placeholders document real gaps without pretending they work.
function isPlaceholderAction(type: AssistantWorkflowActionType, action: ShortsAssistantAction) {
  return !safeExecutableActions.has(type) || action.sensitive;
}

// Builds the user-facing summary from action counts rather than long analysis.
function summarizeWorkflow(plan: ShortsAssistantPlan, actions: AssistantWorkflowAction[]) {
  const executableCount = actions.filter((action) => safeExecutableActions.has(action.type) && !action.is_sensitive).length;
  const sensitiveCount = actions.filter((action) => action.is_sensitive).length;

  return [
    plan.dashboard.currentState,
    `${actions.length} action(s) proposee(s), ${executableCount} executable(s) en V1, ${sensitiveCount} sensible(s).`,
  ].join(" ");
}

// Public planner entry point. It reuses Shorts state analysis, then emits a
// workflow with stable action IDs and execution metadata.
export async function planAssistantWorkflow({
  command,
  userId,
}: {
  command: string;
  userId: string;
}): Promise<AssistantWorkflow> {
  const workflowId = randomUUID();
  const normalizedCommand = command.trim().slice(0, 1000);
  const shortsPlan = await buildShortsAssistantPlan({ command: normalizedCommand, userId });
  const actions = shortsPlan.actions.flatMap((action, index) => {
    const type = mapShortsActionType(action);

    if (!type) {
      return [];
    }

    return [{
      id: `${workflowId}:${String(index + 1).padStart(2, "0")}:${type}:${action.draftId ?? "global"}`,
      type,
      label: action.label,
      draft_id: action.draftId ?? null,
      draft_title: action.draftTitle ?? null,
      status: "pending",
      estimated_time_seconds: action.estimatedSeconds,
      estimated_cost: action.costEstimate,
      requires_confirmation: action.requiresExplicitConfirmation || action.sensitive,
      is_sensitive: action.sensitive || type === "save_schedule",
      placeholder: isPlaceholderAction(type, action),
      route: action.route ?? null,
    } satisfies AssistantWorkflowAction];
  });
  const workflow: AssistantWorkflow = {
    id: workflowId,
    user_intent: normalizedCommand,
    normalized_intent: detectWorkflowIntent(normalizedCommand),
    summary: "",
    status: "planned",
    created_at: new Date().toISOString(),
    actions,
    guardrails: workflowGuardrails,
    analysis: {
      objective: shortsPlan.objective,
      sources: shortsPlan.detailedAnalysis.sourcesUsed,
      risks: shortsPlan.detailedAnalysis.risks,
      notes: [
        ...shortsPlan.warnings,
        ...shortsPlan.estimates.notes,
      ],
    },
  };

  workflow.summary = summarizeWorkflow(shortsPlan, workflow.actions);
  console.info("[Assistant Workflow] planned", {
    user_intent: workflow.user_intent,
    workflow_id: workflow.id,
    action_count: workflow.actions.length,
  });

  return workflow;
}

function markAction(
  action: AssistantWorkflowAction,
  status: AssistantWorkflowActionStatus,
  patch: Pick<AssistantWorkflowAction, "error" | "result"> = {},
): AssistantWorkflowAction {
  return {
    ...action,
    ...patch,
    status,
  };
}

function assertDraftAction(action: AssistantWorkflowAction) {
  if (!action.draft_id) {
    throw new Error("Action liee a un brouillon requise.");
  }

  return action.draft_id;
}

// Executes one safe action. Sensitive actions and unimplemented actions are
// handled by the caller as skipped placeholders.
async function executeWorkflowAction({
  action,
  userId,
}: {
  action: AssistantWorkflowAction;
  userId: string;
}) {
  if (action.type === "generate_visuals") {
    const draftId = assertDraftAction(action);
    await requestDraftVisualGeneration({ draftId, userId });
    await recordVisualCost({ action: "assistant_workflow_generate_visuals", draftId, userId });
    return "Generation visuelle demandee.";
  }

  if (action.type === "generate_voice") {
    const draftId = assertDraftAction(action);
    await generateDraftVoice({ draftId, userId });
    const media = await readMediaPipelineState({ draftId, includeSuggestions: true, userId });
    await recordVoiceCostFromMedia({ action: "assistant_workflow_generate_voice", draftId, media, userId });
    return "Voix generee.";
  }

  if (action.type === "generate_subtitles") {
    const draftId = assertDraftAction(action);
    await generateDraftSubtitles({ draftId, userId });
    const media = await readMediaPipelineState({ draftId, includeSuggestions: true, userId });
    await recordSubtitleCostFromMedia({ action: "assistant_workflow_generate_subtitles", draftId, media, userId });
    return "Sous-titres generes.";
  }

  if (action.type === "prepare_video") {
    const draftId = assertDraftAction(action);
    await prepareDraftVideo({ draftId, userId });
    return "Manifest video prepare.";
  }

  if (action.type === "propose_schedule") {
    return "Planning deja propose par l'analyse; aucune programmation sauvegardee.";
  }

  throw new Error(`Action non branchee en V1: ${action.type}.`);
}

// Executes a validated workflow sequentially. It stops on the first failed safe
// action, while sensitive or placeholder actions are skipped with a clear note.
export async function executeAssistantWorkflow({
  workflow,
  userId,
}: {
  workflow: AssistantWorkflow;
  userId: string;
}): Promise<AssistantWorkflowExecutionResult> {
  const logs: AssistantWorkflowExecutionResult["logs"] = [];
  let failedAction: AssistantWorkflowAction | null = null;
  const nextActions: AssistantWorkflowAction[] = [];

  console.info("[Assistant Workflow] execution started", {
    user_intent: workflow.user_intent,
    workflow_id: workflow.id,
  });

  for (const action of workflow.actions) {
    console.info("[Assistant Workflow] action started", {
      user_intent: workflow.user_intent,
      workflow_id: workflow.id,
      action_id: action.id,
      action_type: action.type,
      draft_id: action.draft_id,
    });

    if (action.is_sensitive || action.type === "save_schedule") {
      const skipped = markAction(action, "skipped", {
        result: "Action sensible ignoree en V1: confirmation explicite requise.",
      });
      nextActions.push(skipped);
      logs.push({
        action_id: action.id,
        action_type: action.type,
        draft_id: action.draft_id,
        result: "skipped",
        error: null,
      });
      continue;
    }

    if (action.placeholder || !safeExecutableActions.has(action.type)) {
      const skipped = markAction(action, "skipped", {
        result: "Placeholder V1: API fiable non branchee.",
      });
      nextActions.push(skipped);
      logs.push({
        action_id: action.id,
        action_type: action.type,
        draft_id: action.draft_id,
        result: "skipped",
        error: null,
      });
      continue;
    }

    try {
      const running = markAction(action, "running");
      nextActions.push(running);
      const result = await executeWorkflowAction({ action, userId });
      nextActions[nextActions.length - 1] = markAction(action, "success", { result });
      logs.push({
        action_id: action.id,
        action_type: action.type,
        draft_id: action.draft_id,
        result: "success",
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failed = markAction(action, "failed", { error: message });
      nextActions[nextActions.length - 1] = failed;
      failedAction = failed;
      logs.push({
        action_id: action.id,
        action_type: action.type,
        draft_id: action.draft_id,
        result: "failed",
        error: message,
      });
      console.error("[Assistant Workflow] action failed", {
        user_intent: workflow.user_intent,
        workflow_id: workflow.id,
        action_id: action.id,
        action_type: action.type,
        draft_id: action.draft_id,
        result: "failed",
        error: message,
      });
      break;
    }
  }

  if (failedAction) {
    const processedIds = new Set(nextActions.map((action) => action.id));
    workflow.actions
      .filter((action) => !processedIds.has(action.id))
      .forEach((action) => {
        nextActions.push(markAction(action, "skipped", {
          result: "Non execute: le workflow s'est arrete sur une erreur precedente.",
        }));
      });
  }

  const nextWorkflow: AssistantWorkflow = {
    ...workflow,
    actions: nextActions,
    status: failedAction ? "failed" : "success",
  };

  console.info("[Assistant Workflow] execution finished", {
    user_intent: workflow.user_intent,
    workflow_id: workflow.id,
    result: nextWorkflow.status,
    error: failedAction?.error ?? null,
  });

  return {
    ok: !failedAction,
    workflow: nextWorkflow,
    failed_action: failedAction,
    logs,
  };
}
