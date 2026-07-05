import "server-only";

import { randomUUID } from "crypto";
import {
  buildShortsAssistantPlan,
  type ShortsAssistantAction,
  type ShortsAssistantPlan,
} from "@/lib/server/assistant-actions/shorts";
import { buildProjectContext } from "@/lib/server/assistant/build-project-context";
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
import type { ProjectContext } from "@/types/cockpit";

export type AssistantWorkflowIntent =
  | "finish_started_drafts"
  | "prepare_videos"
  | "prepare_media"
  | "generate_voices"
  | "generate_subtitles"
  | "prepare_week"
  | "schedule_ready_videos"
  | "publish"
  | "resume_draft"
  | "analyze_cockpit"
  | "analyze_project"
  | "organize_work"
  | "prepare_next_steps"
  | "general_orchestration";

export type AssistantWorkflowActionType =
  | "detect_available_resources"
  | "verify_dependencies"
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
  | "save_schedule"
  | "prepare_publication"
  | "publish"
  | "analyze_cockpit"
  | "analyze_project"
  | "organize_work"
  | "prepare_next_steps"
  | "final_report";

export type AssistantWorkflowActionStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "skipped";

export type AssistantWorkflowStage =
  | "analysis"
  | "resource_detection"
  | "workflow_construction"
  | "cost_estimation"
  | "time_estimation"
  | "dependency_check"
  | "plan_presentation"
  | "awaiting_confirmation"
  | "execution"
  | "progress_tracking"
  | "final_report";

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
  status: "planned" | "awaiting_confirmation" | "running" | "success" | "failed" | "cancelled";
  created_at: string;
  current_stage: AssistantWorkflowStage;
  stages: Array<{
    key: AssistantWorkflowStage;
    label: string;
    status: "done" | "pending" | "running";
  }>;
  actions: AssistantWorkflowAction[];
  estimates: {
    estimated_time_seconds: number;
    estimated_cost_eur: number | null;
  };
  dependencies: string[];
  resources: string[];
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

const workflowStageLabels: Record<AssistantWorkflowStage, string> = {
  analysis: "Analyse",
  resource_detection: "Detection des ressources disponibles",
  workflow_construction: "Construction du workflow",
  cost_estimation: "Estimation du cout",
  time_estimation: "Estimation du temps",
  dependency_check: "Verification des dependances",
  plan_presentation: "Presentation du plan",
  awaiting_confirmation: "Attente de confirmation",
  execution: "Execution",
  progress_tracking: "Suivi en temps reel",
  final_report: "Rapport final",
};

const safeExecutableActions = new Set<AssistantWorkflowActionType>([
  "detect_available_resources",
  "verify_dependencies",
  "generate_visuals",
  "generate_voice",
  "generate_subtitles",
  "prepare_video",
  "propose_schedule",
  "analyze_cockpit",
  "analyze_project",
  "organize_work",
  "prepare_next_steps",
  "final_report",
]);

const sensitiveActions = new Set<AssistantWorkflowActionType>([
  "validate_draft_text",
  "validate_visuals",
  "validate_voice",
  "validate_subtitles",
  "validate_video",
  "save_schedule",
  "prepare_publication",
  "publish",
]);

const workflowGuardrails = [
  "Aucune publication reelle sans confirmation explicite dediee.",
  "Aucune programmation definitive sans confirmation explicite dediee.",
  "Les validations humaines restent sensibles.",
  "Le runner s'arrete a la premiere erreur technique.",
  "Les secrets et tokens OAuth restent cote serveur.",
];

// Normalizes natural language once for every assistant command. All modules use
// this decision point instead of keeping separate prompt-era intent detectors.
export function detectAssistantWorkflowIntent(command: string): AssistantWorkflowIntent {
  const normalized = command
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (normalized.includes("publ")) return "publish";
  if (normalized.includes("programme") || normalized.includes("planning")) return "schedule_ready_videos";
  if (normalized.includes("7 jours") || normalized.includes("semaine")) return "prepare_week";
  if (normalized.includes("sous-titre") || normalized.includes("sous titre")) return "generate_subtitles";
  if (normalized.includes("voix")) return "generate_voices";
  if (normalized.includes("media") || normalized.includes("visuel")) return "prepare_media";
  if (normalized.includes("video")) return "prepare_videos";
  if (normalized.includes("reprend") || normalized.includes("reprendre")) return "resume_draft";
  if (normalized.includes("brouillon") && (normalized.includes("termine") || normalized.includes("finis") || normalized.includes("bloqu"))) {
    return "finish_started_drafts";
  }
  if (normalized.includes("cockpit")) return "analyze_cockpit";
  if (normalized.includes("projet")) return "analyze_project";
  if (normalized.includes("organise") || normalized.includes("organiser") || normalized.includes("travail")) return "organize_work";
  if (normalized.includes("prochaine") || normalized.includes("etape") || normalized.includes("priorite")) return "prepare_next_steps";

  return "general_orchestration";
}

function isShortsIntent(intent: AssistantWorkflowIntent) {
  return [
    "finish_started_drafts",
    "prepare_videos",
    "prepare_media",
    "generate_voices",
    "generate_subtitles",
    "prepare_week",
    "schedule_ready_videos",
    "publish",
    "resume_draft",
  ].includes(intent);
}

function makeStages(current: AssistantWorkflowStage): AssistantWorkflow["stages"] {
  const keys = Object.keys(workflowStageLabels) as AssistantWorkflowStage[];
  const currentIndex = keys.indexOf(current);

  return keys.map((key, index) => ({
    key,
    label: workflowStageLabels[key],
    status: index < currentIndex ? "done" : key === current ? "running" : "pending",
  }));
}

function sumKnownCosts(actions: AssistantWorkflowAction[]) {
  let hasKnownCost = false;
  let total = 0;

  actions.forEach((action) => {
    const cost = action.estimated_cost?.estimatedCostEur;
    if (typeof cost === "number" && Number.isFinite(cost)) {
      hasKnownCost = true;
      total += cost;
    }
  });

  return hasKnownCost ? Math.round(total * 1_000_000) / 1_000_000 : null;
}

function actionId(workflowId: string, index: number, type: AssistantWorkflowActionType, draftId?: string | null) {
  return `${workflowId}:${String(index + 1).padStart(2, "0")}:${type}:${draftId ?? "global"}`;
}

function baseAction({
  draftId = null,
  draftTitle = null,
  estimatedCost = null,
  estimatedSeconds,
  id,
  label,
  route = null,
  type,
}: {
  draftId?: string | null;
  draftTitle?: string | null;
  estimatedCost?: CostEstimate | null;
  estimatedSeconds: number;
  id: string;
  label: string;
  route?: string | null;
  type: AssistantWorkflowActionType;
}): AssistantWorkflowAction {
  const isSensitive = sensitiveActions.has(type);
  return {
    id,
    type,
    label,
    draft_id: draftId,
    draft_title: draftTitle,
    status: "pending",
    estimated_time_seconds: estimatedSeconds,
    estimated_cost: estimatedCost,
    requires_confirmation: isSensitive,
    is_sensitive: isSensitive,
    placeholder: !safeExecutableActions.has(type),
    route,
  };
}

function mapShortsActionType(action: ShortsAssistantAction): AssistantWorkflowActionType | null {
  const mapping: Partial<Record<ShortsAssistantAction["kind"], AssistantWorkflowActionType>> = {
    generate_subtitles: "generate_subtitles",
    generate_visuals: "generate_visuals",
    generate_voice: "generate_voice",
    prepare_publication: "prepare_publication",
    prepare_video: "prepare_video",
    propose_schedule: "propose_schedule",
    publish: "publish",
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

function createFrameworkActions({
  context,
  workflowId,
}: {
  context: ProjectContext;
  workflowId: string;
}) {
  return [
    baseAction({
      id: actionId(workflowId, 0, "detect_available_resources"),
      type: "detect_available_resources",
      label: `${context.cockpitState.contentDrafts.total} brouillon(s), ${context.observatoryItems.length} module(s), ${context.projectMemoryEntries.length} memoire(s) disponibles.`,
      estimatedSeconds: 5,
    }),
    baseAction({
      id: actionId(workflowId, 1, "verify_dependencies"),
      type: "verify_dependencies",
      label: "Verifier les dependances cockpit, OAuth, scheduling et garde-fous.",
      estimatedSeconds: 5,
    }),
  ];
}

function createProjectActions({
  context,
  intent,
  workflowId,
}: {
  context: ProjectContext;
  intent: AssistantWorkflowIntent;
  workflowId: string;
}) {
  const actionType =
    intent === "analyze_cockpit"
      ? "analyze_cockpit"
      : intent === "analyze_project"
        ? "analyze_project"
        : intent === "organize_work"
          ? "organize_work"
          : "prepare_next_steps";

  return [
    baseAction({
      id: actionId(workflowId, 2, actionType),
      type: actionType,
      label:
        actionType === "organize_work"
          ? `Organiser le travail autour de: ${context.nextPriorityAction}`
          : actionType === "prepare_next_steps"
            ? `Preparer les prochaines etapes: ${context.nextActions.slice(0, 3).join(" ; ") || context.nextPriorityAction}`
            : `Analyser l'etat courant: ${context.siteSummary}`,
      estimatedSeconds: 10,
    }),
    baseAction({
      id: actionId(workflowId, 3, "final_report"),
      type: "final_report",
      label: "Produire un rapport final court avec decision, dependances et prochaine action.",
      estimatedSeconds: 5,
    }),
  ];
}

function createShortsActions({
  shortsPlan,
  workflowId,
}: {
  shortsPlan: ShortsAssistantPlan;
  workflowId: string;
}) {
  return shortsPlan.actions.flatMap((action, index) => {
    const type = mapShortsActionType(action);
    if (!type || type === "publish") {
      return [];
    }

    return [
      baseAction({
        id: actionId(workflowId, index + 2, type, action.draftId),
        type,
        label: action.label,
        draftId: action.draftId ?? null,
        draftTitle: action.draftTitle ?? null,
        estimatedSeconds: action.estimatedSeconds,
        estimatedCost: action.costEstimate,
        route: action.route ?? null,
      }),
    ];
  });
}

function resourcesFromContext(context: ProjectContext) {
  return [
    "cockpit_state",
    "observatory",
    "project_memory",
    "content_drafts",
    "oauth_statuses",
    `${context.cockpitState.contentDrafts.total} brouillon(s) lus`,
    `${context.observatoryItems.length} module(s) Observatoire`,
  ];
}

function dependenciesFromContext(context: ProjectContext) {
  return [
    ...context.cockpitState.dependencies.map((dependency) => `${dependency.name}: ${dependency.status}`),
    ...context.cockpitState.oauthStatuses.map((status) => `${status.provider}: ${status.tokenPresent ? "token present" : "token absent"}`),
  ].slice(0, 8);
}

function summarizeWorkflow({
  actions,
  context,
  intent,
  shortsPlan,
}: {
  actions: AssistantWorkflowAction[];
  context: ProjectContext;
  intent: AssistantWorkflowIntent;
  shortsPlan: ShortsAssistantPlan | null;
}) {
  const executableCount = actions.filter((action) => safeExecutableActions.has(action.type) && !action.is_sensitive).length;
  const sensitiveCount = actions.filter((action) => action.is_sensitive).length;
  const state = shortsPlan?.dashboard.currentState ?? context.siteSummary;

  return `${intent}: ${state} ${actions.length} action(s), ${executableCount} executable(s) en V1, ${sensitiveCount} sensible(s).`;
}

// Creates the single canonical assistant workflow. Every command follows the
// same architecture: analysis, resources, workflow, estimates, dependencies,
// plan, confirmation, execution, progress, final report.
export async function planAssistantWorkflow({
  command,
  context,
  userId,
}: {
  command: string;
  context?: ProjectContext;
  userId: string;
}): Promise<AssistantWorkflow> {
  const workflowId = randomUUID();
  const userIntent = command.trim().slice(0, 1000);
  const normalizedIntent = detectAssistantWorkflowIntent(userIntent);
  const projectContext = context ?? await buildProjectContext();
  const shortsPlan = isShortsIntent(normalizedIntent)
    ? await buildShortsAssistantPlan({ command: userIntent, userId })
    : null;
  const frameworkActions = createFrameworkActions({ context: projectContext, workflowId });
  const domainActions = shortsPlan
    ? createShortsActions({ shortsPlan, workflowId })
    : createProjectActions({ context: projectContext, intent: normalizedIntent, workflowId });
  const actions = [...frameworkActions, ...domainActions];
  const workflow: AssistantWorkflow = {
    id: workflowId,
    user_intent: userIntent,
    normalized_intent: normalizedIntent,
    summary: "",
    status: "awaiting_confirmation",
    created_at: new Date().toISOString(),
    current_stage: "awaiting_confirmation",
    stages: makeStages("awaiting_confirmation"),
    actions,
    estimates: {
      estimated_time_seconds: actions.reduce((sum, action) => sum + action.estimated_time_seconds, 0),
      estimated_cost_eur: sumKnownCosts(actions),
    },
    dependencies: dependenciesFromContext(projectContext),
    resources: resourcesFromContext(projectContext),
    guardrails: workflowGuardrails,
    analysis: {
      objective: shortsPlan?.objective ?? projectContext.nextPriorityAction,
      sources: shortsPlan?.detailedAnalysis.sourcesUsed ?? ["cockpit_state", "observatory", "project_memory"],
      risks: shortsPlan?.detailedAnalysis.risks ?? projectContext.detectedRisks,
      notes: shortsPlan ? shortsPlan.warnings : [
        "Commande traitee par le workflow cockpit general.",
        "Aucune mutation sensible n'est executee sans confirmation.",
      ],
    },
  };

  workflow.summary = summarizeWorkflow({
    actions,
    context: projectContext,
    intent: normalizedIntent,
    shortsPlan,
  });

  console.info("[Assistant Workflow] planned", {
    user_intent: workflow.user_intent,
    workflow_id: workflow.id,
    action_count: workflow.actions.length,
    intent: workflow.normalized_intent,
  });

  return workflow;
}

function markAction(
  action: AssistantWorkflowAction,
  status: AssistantWorkflowActionStatus,
  patch: Pick<AssistantWorkflowAction, "error" | "result"> = {},
): AssistantWorkflowAction {
  return { ...action, ...patch, status };
}

function assertDraftAction(action: AssistantWorkflowAction) {
  if (!action.draft_id) {
    throw new Error("Action liee a un brouillon requise.");
  }

  return action.draft_id;
}

// Executes one safe action. Sensitive steps are skipped by the caller so this
// function stays a small whitelist, not a generic mutation dispatcher.
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
  if (action.type === "propose_schedule") return "Planning propose sans sauvegarde definitive.";
  if (action.type === "detect_available_resources") return "Ressources detectees.";
  if (action.type === "verify_dependencies") return "Dependances verifiees.";
  if (action.type === "analyze_cockpit") return "Cockpit analyse.";
  if (action.type === "analyze_project") return "Projet analyse.";
  if (action.type === "organize_work") return "Organisation de travail preparee.";
  if (action.type === "prepare_next_steps") return "Prochaines etapes preparees.";
  if (action.type === "final_report") return "Rapport final prepare.";

  throw new Error(`Action non branchee en V1: ${action.type}.`);
}

// Runs a confirmed workflow in order. This is the only execution path used by
// the assistant UI and APIs.
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

    if (action.is_sensitive || action.placeholder || !safeExecutableActions.has(action.type)) {
      const skipped = markAction(action, "skipped", {
        result: action.is_sensitive
          ? "Action sensible ignoree en V1: confirmation explicite requise."
          : "Placeholder V1: API fiable non branchee.",
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
      nextActions.push(markAction(action, "running"));
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
    current_stage: "final_report",
    stages: makeStages("final_report").map((stage) => ({
      ...stage,
      status: stage.key === "final_report" ? "done" : stage.status,
    })),
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

// Builds the canonical API answer used by the assistant UI. It intentionally
// mirrors the workflow architecture instead of returning free-form advice.
export function buildAssistantWorkflowResponse(workflow: AssistantWorkflow) {
  return {
    ok: true,
    answer: workflow.summary,
    detailedAnalysis: [
      "Architecture appliquee:",
      workflow.stages.map((stage) => `- ${stage.label}: ${stage.status}`).join("\n"),
      "",
      "Ressources:",
      workflow.resources.map((resource) => `- ${resource}`).join("\n"),
      "",
      "Dependances:",
      workflow.dependencies.map((dependency) => `- ${dependency}`).join("\n"),
      "",
      "Garde-fous:",
      workflow.guardrails.map((guardrail) => `- ${guardrail}`).join("\n"),
    ].join("\n"),
    workflow,
    context: {
      workflowId: workflow.id,
      intent: workflow.normalized_intent,
      status: workflow.status,
      currentStage: workflow.current_stage,
    },
  };
}
