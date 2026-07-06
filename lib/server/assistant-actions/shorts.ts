import "server-only";

import { readContentDrafts, type SavedContentDraft } from "@/lib/server/content-workshop";
import {
  estimateImageGenerationCost,
  estimateSubtitleCost,
  estimateVideoRenderCost,
  estimateVoiceCost,
  type CostEstimate,
} from "@/lib/server/cost-rates";
import {
  recordSubtitleCostFromMedia,
  recordVideoRenderCost,
  recordVisualCost,
  recordVoiceCostFromMedia,
} from "@/lib/server/cost-tracking";
import { readMediaPipelineState, type MediaPipelineState } from "@/lib/server/media-pipeline";
import { requestDraftVisualGeneration, validateDraftVisuals } from "@/lib/server/media-pipeline";
import { readShortsSchedulingState } from "@/lib/server/shorts-scheduling";
import { generateDraftSubtitles, validateDraftSubtitles } from "@/lib/server/subtitle-pipeline";
import {
  createOrReuseVideoRenderJob,
  dispatchVideoRenderJob,
  markVideoRenderJobFailed,
  readVideoRenderJobState,
  validateCompletedVideoRenderJob,
  type VideoRenderJobState,
} from "@/lib/server/video-renderer";
import { prepareDraftVideo } from "@/lib/server/video-preparation";
import { generateDraftVoice, validateDraftVoice } from "@/lib/server/voice-pipeline";
import {
  buildShortsScheduleCandidates,
  DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  getDateValueInTimezone,
  type ShortsSchedulePlatform,
} from "@/lib/shorts-scheduling";
import { getShortWorkflowState, type ShortWorkflowState } from "@/lib/short-workflow";

export type ShortsAssistantIntent =
  | "finish_started_drafts"
  | "prepare_week"
  | "schedule_ready_videos"
  | "blocked_report"
  | "general_plan";

export type ShortsProductionMode = "assisted" | "automatic" | "manual";

export type ShortsAssistantActionKind =
  | "validate_text"
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
  | "blocked_report";

export type ShortsAssistantAction = {
  kind: ShortsAssistantActionKind;
  label: string;
  draftId?: string;
  draftTitle?: string;
  blockedBy?: string[];
  route?: string;
  sensitive: boolean;
  allowedInV1: boolean;
  requiresExplicitConfirmation: boolean;
  placeholder: boolean;
  estimatedSeconds: number;
  costEstimate: CostEstimate | null;
};

export type ShortsProductionTimelineStep = {
  id: "visuals" | "voice" | "subtitles" | "video" | "planning" | "publication";
  label: string;
  state: "done" | "running" | "waiting_validation" | "pending" | "blocked";
  detail: string;
  durationLabel: string;
  costEstimate: CostEstimate | null;
  route: string;
  canOpen: boolean;
  canValidate: boolean;
};

export type ShortsAssistantWorkflowStep = {
  id: string;
  title: string;
  status: "pending" | "blocked" | "ready" | "done";
  actionKind: ShortsAssistantActionKind;
  actionCount: number;
  sensitive: boolean;
  requiresExplicitConfirmation: boolean;
  estimatedSeconds: number;
};

export type ShortsAssistantDashboard = {
  currentState: string;
  blockers: string[];
  proposedPlan: string[];
  availableActions: string[];
};

export type ShortsAssistantEstimates = {
  actionsCount: number;
  estimatedSeconds: number;
  estimatedMinutesLabel: string;
  openaiCostEur: number | null;
  elevenLabsCostEur: number | null;
  railwayCostEur: number | null;
  totalCostEur: number | null;
  notes: string[];
};

export type ShortsAssistantDetailedAnalysis = {
  sourcesUsed: string[];
  memoryUsed: string[];
  draftsDetected: Array<{ id: string; title: string; status: string; nextStep: string }>;
  reasoning: string[];
  dependencies: string[];
  risks: string[];
  justification: string[];
};

export type ShortsAssistantDraftSummary = {
  id: string;
  title: string;
  status: string;
  workflow: ShortWorkflowState;
  timeline: ShortsProductionTimelineStep[];
  blockedReasons: string[];
  nextAction: ShortsAssistantAction | null;
};

export type ShortsAssistantScheduleProposal = {
  draftId: string;
  draftTitle: string;
  platform: ShortsSchedulePlatform;
  scheduledAt: string;
  timezone: string;
  slotLabel: string;
};

export type ShortsAssistantPlan = {
  objective: string;
  intent: ShortsAssistantIntent;
  mode: ShortsProductionMode;
  command: string;
  generatedAt: string;
  guardrails: string[];
  dashboard: ShortsAssistantDashboard;
  estimates: ShortsAssistantEstimates;
  stats: {
    draftsFound: number;
    terminableDrafts: number;
    blockedDrafts: number;
    readyVideos: number;
    proposedScheduleSlots: number;
  };
  drafts: ShortsAssistantDraftSummary[];
  actions: ShortsAssistantAction[];
  workflowSteps: ShortsAssistantWorkflowStep[];
  scheduleProposals: ShortsAssistantScheduleProposal[];
  blockedDrafts: ShortsAssistantDraftSummary[];
  detailedAnalysis: ShortsAssistantDetailedAnalysis;
  warnings: string[];
  execution: {
    mode: "assisted" | "automatic" | "manual" | "plan_only";
    summary: string;
    blockedActions: string[];
  };
};

export type ShortsAssistantExecutionPreview = {
  ok: true;
  executed: boolean;
  message: string;
  blockedActions: string[];
  progress: {
    completedSteps: number;
    totalSteps: number;
    percent: number;
    steps: Array<{
      title: string;
      status: "pending" | "blocked" | "ready" | "done";
    }>;
  };
  nextImplementationStep: string;
};

type ShortsProductionRunLog = {
  action: ShortsAssistantActionKind;
  draftId?: string;
  draftTitle?: string;
  result: "success" | "failed" | "skipped" | "stopped";
  message: string;
};

type DraftBundle = {
  draft: SavedContentDraft;
  media: MediaPipelineState | null;
  video: VideoRenderJobState | null;
  workflow: ShortWorkflowState;
  readErrors: string[];
};

const publicationStatuses = new Set(["published", "rejected"]);

const guardrails = [
  "Aucune publication reelle sans validation explicite.",
  "Aucune programmation definitive sans validation explicite.",
  "Les generations IA peuvent etre lancees sans confirmation prealable en mode Assiste ou Automatique.",
  "Aucun secret, token OAuth ou configuration serveur n'est modifie.",
  "Les confirmations servent a valider un resultat produit, pas a autoriser une generation.",
];

// Architecture: this file is the Shorts orchestration brain. It reads the same
// server state as the cockpit, transforms statuses into safe workflow steps,
// estimates time/cost, and returns a plan. It must not mutate Supabase directly.

// Normalizes natural language commands so intent detection can stay simple and
// deterministic before any LLM-based planner is introduced.
function normalizeCommand(command: string) {
  return command
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

// Chooses the broad operational intent from a natural command. Keep this
// conservative: unknown commands become a general plan instead of execution.
function detectShortsIntent(command: string): ShortsAssistantIntent {
  const normalized = normalizeCommand(command);

  if (normalized.includes("bloqu")) {
    return "blocked_report";
  }

  if (
    normalized.includes("7 jours") ||
    normalized.includes("sept jours") ||
    normalized.includes("semaine")
  ) {
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

// Normalizes user-selected production mode. Assisted remains the safe default
// because it automates generation but stops at useful human review points.
function normalizeProductionMode(value: unknown): ShortsProductionMode {
  return value === "automatic" || value === "manual" ? value : "assisted";
}

// Converts the detected intent into the compact dashboard objective.
function objectiveForIntent(intent: ShortsAssistantIntent) {
  if (intent === "blocked_report") {
    return "faire un rapport des brouillons bloques";
  }
  if (intent === "prepare_week") {
    return "preparer 7 jours de publications Shorts";
  }
  if (intent === "schedule_ready_videos") {
    return "programmer les videos pretes pour la semaine";
  }
  if (intent === "finish_started_drafts") {
    return "terminer les brouillons commences";
  }
  return "analyser le pipeline Shorts et proposer la prochaine action";
}

// Reads the expected number of visual scenes from draft score metadata. This
// mirrors the current pipeline contract without reparsing prompts here.
function requiredVisualCount(draft: SavedContentDraft) {
  const value = draft.score.requiredVisualSceneCount;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

// Sums nullable cost estimates without hiding unknown values as zero.
function sumCosts(values: Array<number | null | undefined>) {
  let hasKnown = false;
  let total = 0;

  values.forEach((value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      hasKnown = true;
      total += value;
    }
  });

  return hasKnown ? Math.round(total * 1_000_000) / 1_000_000 : null;
}

// Estimates action cost from the current draft/media signals. These values are
// intentionally approximate and use the existing cost-rate helpers.
function estimateActionCost(kind: ShortsAssistantActionKind, bundle?: DraftBundle): CostEstimate | null {
  if (!bundle) {
    return null;
  }

  if (kind === "generate_visuals") {
    const missingVisuals = Math.max(
      1,
      (bundle.workflow.raw.requiredVisualCount || requiredVisualCount(bundle.draft) || 1) -
        bundle.workflow.raw.retainedVisualScenesCount,
    );
    return estimateImageGenerationCost(missingVisuals);
  }

  if (kind === "generate_voice") {
    return estimateVoiceCost(bundle.draft.script.length);
  }

  if (kind === "generate_subtitles") {
    return estimateSubtitleCost(bundle.media?.voice.durationEstimateSeconds ?? null);
  }

  if (kind === "start_video_render") {
    return estimateVideoRenderCost(
      bundle.media?.subtitles.durationSeconds ??
      bundle.media?.voice.durationEstimateSeconds ??
      null,
    );
  }

  return null;
}

// Estimates user-visible duration for planning. It is deliberately pessimistic
// enough to account for remote API latency while staying readable.
function estimateActionSeconds(kind: ShortsAssistantActionKind, bundle?: DraftBundle) {
  if (kind === "generate_visuals") {
    const visualCount = bundle
      ? Math.max(1, bundle.workflow.raw.requiredVisualCount - bundle.workflow.raw.retainedVisualScenesCount)
      : 1;
    return visualCount * 90;
  }
  if (kind === "generate_voice") {
    return 45;
  }
  if (kind === "generate_subtitles") {
    return 35;
  }
  if (kind === "prepare_video") {
    return 20;
  }
  if (kind === "start_video_render") {
    return 150;
  }
  if (kind === "propose_schedule" || kind === "save_schedule") {
    return 60;
  }
  if (kind === "publish") {
    return 0;
  }
  return 30;
}

function formatDurationLabel(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} min`;
}

// Decides whether an action should stop the pipeline for explicit review in the
// selected mode. Generation never needs confirmation before it starts.
function confirmationNeededForAction(kind: ShortsAssistantActionKind, mode: ShortsProductionMode) {
  if (mode === "manual") {
    return true;
  }

  if (kind === "save_schedule" || kind === "publish" || kind === "prepare_publication") {
    return true;
  }

  if (mode === "assisted") {
    return kind === "validate_visuals" ||
      kind === "validate_voice" ||
      kind === "validate_video";
  }

  return false;
}

// Whitelists actions the grouped runner may execute. Schedule saving,
// publication and destructive work are intentionally excluded in every mode.
function isExecutableInMode(kind: ShortsAssistantActionKind, mode: ShortsProductionMode) {
  if (mode === "manual") {
    return false;
  }

  const assistedActions = new Set<ShortsAssistantActionKind>([
    "generate_visuals",
    "generate_voice",
    "generate_subtitles",
    "validate_subtitles",
    "prepare_video",
    "start_video_render",
    "propose_schedule",
  ]);

  if (mode === "assisted") {
    return assistedActions.has(kind);
  }

  return !["validate_text", "save_schedule", "prepare_publication", "publish", "blocked_report"].includes(kind);
}

// Creates a safe action descriptor. In assisted/automatic modes, generation
// actions are executable; validations only require confirmation when they add
// real human value for the selected mode.
function actionBase({
  draft,
  kind,
  label,
  mode,
  route,
  sensitive = false,
  blockedBy,
  bundle,
}: {
  draft?: SavedContentDraft;
  kind: ShortsAssistantActionKind;
  label: string;
  mode: ShortsProductionMode;
  route?: string;
  sensitive?: boolean;
  blockedBy?: string[];
  bundle?: DraftBundle;
}): ShortsAssistantAction {
  const requiresExplicitConfirmation = confirmationNeededForAction(kind, mode);
  const allowedInV1 = isExecutableInMode(kind, mode);

  return {
    kind,
    label,
    draftId: draft?.id,
    draftTitle: draft?.title,
    blockedBy,
    route,
    sensitive,
    allowedInV1,
    requiresExplicitConfirmation,
    placeholder: !allowedInV1,
    estimatedSeconds: estimateActionSeconds(kind, bundle),
    costEstimate: estimateActionCost(kind, bundle),
  };
}

// Chooses the next useful action for one draft from canonical workflow state.
// It never proposes a step already validated by getShortWorkflowState.
function draftAction(bundle: DraftBundle, mode: ShortsProductionMode): ShortsAssistantAction | null {
  const { draft, media, video, workflow } = bundle;

  if (publicationStatuses.has(draft.status)) {
    return null;
  }

  if (workflow.text === "pending") {
    return actionBase({
      draft,
      kind: "validate_text",
      label: "Valider le texte avant toute generation.",
      mode,
      route: `/interface/post-creation/shorts/drafts`,
      sensitive: true,
      bundle,
    });
  }

  if (workflow.visuals === "pending" || workflow.visuals === "in_progress") {
    return actionBase({
      draft,
      kind: "generate_visuals",
      label: "Generer ou completer les visuels manquants.",
      mode,
      route: `/interface/post-creation/shorts/visuals`,
      bundle,
    });
  }

  if (workflow.visuals === "ready") {
    return actionBase({
      draft,
      kind: "validate_visuals",
      label: "Valider les visuels retenus.",
      mode,
      route: `/interface/post-creation/shorts/visuals`,
      sensitive: true,
      bundle,
    });
  }

  if (workflow.voice === "pending" || workflow.voice === "error") {
    return actionBase({
      draft,
      kind: "generate_voice",
      label: workflow.voice === "error" ? "Relancer la generation de voix." : "Generer la voix-off.",
      mode,
      route: `/interface/post-creation/shorts/voice`,
      bundle,
    });
  }

  if (workflow.voice === "ready") {
    return actionBase({
      draft,
      kind: "validate_voice",
      label: "Valider la voix-off avant les sous-titres.",
      mode,
      route: `/interface/post-creation/shorts/voice`,
      sensitive: true,
      bundle,
    });
  }

  if (workflow.subtitles === "pending" || workflow.subtitles === "error") {
    return actionBase({
      draft,
      kind: "generate_subtitles",
      label: workflow.subtitles === "error" ? "Relancer les sous-titres." : "Generer les sous-titres.",
      mode,
      route: `/interface/post-creation/shorts/voice`,
      bundle,
    });
  }

  if (workflow.subtitles === "ready") {
    return actionBase({
      draft,
      kind: "validate_subtitles",
      label: "Valider les sous-titres avant le montage.",
      mode,
      route: `/interface/post-creation/shorts/voice`,
      bundle,
    });
  }

  if (workflow.video === "pending") {
    return actionBase({
      draft,
      kind: "prepare_video",
      label: "Preparer le manifest video pour le renderer.",
      mode,
      route: `/interface/post-creation/shorts/video`,
      bundle,
    });
  }

  if (workflow.video === "ready" && (!video || video.status !== "completed")) {
    return actionBase({
      draft,
      kind: "start_video_render",
      label: "Lancer ou relancer le rendu video Railway.",
      mode,
      route: `/interface/post-creation/shorts/video`,
      bundle,
    });
  }

  if (video?.status === "completed" && !video.videoValidated) {
    return actionBase({
      draft,
      kind: "validate_video",
      label: "Valider manuellement la video finale.",
      mode,
      route: `/interface/post-creation/shorts/video`,
      sensitive: true,
      bundle,
    });
  }

  if (workflow.video === "validated" || video?.videoValidated) {
    return actionBase({
      draft,
      kind: "propose_schedule",
      label: "Proposer un creneau de programmation.",
      mode,
      route: `/interface/post-creation/shorts/programming`,
      bundle,
    });
  }

  if (!media) {
    return actionBase({
      draft,
      kind: "blocked_report",
      label: "Relire le media pipeline: etat indisponible.",
      mode,
      blockedBy: bundle.readErrors,
      route: `/interface/post-creation/shorts/drafts`,
      sensitive: false,
      bundle,
    });
  }

  return null;
}

// Explains why a draft cannot be run end-to-end without human intervention.
function blockedReasons(bundle: DraftBundle, action: ShortsAssistantAction | null) {
  const reasons = [...bundle.readErrors];
  const { workflow } = bundle;

  if (workflow.voice === "error") {
    reasons.push("Voix en erreur.");
  }
  if (workflow.subtitles === "error") {
    reasons.push("Sous-titres en erreur.");
  }
  if (action?.kind === "validate_text") {
    reasons.push("Validation texte humaine requise.");
  }
  if (action?.sensitive) {
    reasons.push("Action sensible: confirmation humaine obligatoire.");
  }

  return [...new Set(reasons)];
}

// Converts raw workflow status into the simplified timeline state used by the
// production dashboard.
function timelineState({
  status,
  validatesHumanChoice = false,
}: {
  status: ShortWorkflowState[keyof Pick<ShortWorkflowState, "visuals" | "voice" | "subtitles" | "video" | "readyToPublish">];
  validatesHumanChoice?: boolean;
}): ShortsProductionTimelineStep["state"] {
  if (status === "validated") {
    return "done";
  }
  if (status === "generating" || status === "in_progress") {
    return "running";
  }
  if (status === "ready") {
    return validatesHumanChoice ? "waiting_validation" : "done";
  }
  if (status === "error") {
    return "blocked";
  }
  return "pending";
}

// Builds the per-draft production timeline used by the UI. It keeps the
// operator focused on generated assets and useful validation points.
function buildDraftTimeline(bundle: DraftBundle): ShortsProductionTimelineStep[] {
  const { workflow } = bundle;
  const routeBase = "/interface/post-creation/shorts";
  const visualCost = estimateActionCost("generate_visuals", bundle);
  const voiceCost = estimateActionCost("generate_voice", bundle);
  const subtitleCost = estimateActionCost("generate_subtitles", bundle);
  const renderCost = estimateActionCost("start_video_render", bundle);
  const videoState = bundle.video?.status === "processing" || bundle.video?.status === "queued"
    ? "running"
    : timelineState({ status: workflow.video, validatesHumanChoice: true });

  return [
    {
      id: "visuals",
      label: "Generation des visuels",
      state: timelineState({ status: workflow.visuals, validatesHumanChoice: true }),
      detail: workflow.reasons.visuals,
      durationLabel: formatDurationLabel(estimateActionSeconds("generate_visuals", bundle)),
      costEstimate: visualCost,
      route: `${routeBase}/visuals`,
      canOpen: true,
      canValidate: workflow.visuals === "ready",
    },
    {
      id: "voice",
      label: "Generation des voix",
      state: timelineState({ status: workflow.voice, validatesHumanChoice: true }),
      detail: workflow.reasons.voice,
      durationLabel: formatDurationLabel(estimateActionSeconds("generate_voice", bundle)),
      costEstimate: voiceCost,
      route: `${routeBase}/voice`,
      canOpen: true,
      canValidate: workflow.voice === "ready",
    },
    {
      id: "subtitles",
      label: "Generation des sous-titres",
      state: timelineState({ status: workflow.subtitles }),
      detail: workflow.reasons.subtitles,
      durationLabel: formatDurationLabel(estimateActionSeconds("generate_subtitles", bundle)),
      costEstimate: subtitleCost,
      route: `${routeBase}/voice`,
      canOpen: true,
      canValidate: false,
    },
    {
      id: "video",
      label: "Generation video",
      state: videoState,
      detail: workflow.reasons.video,
      durationLabel: formatDurationLabel(estimateActionSeconds("start_video_render", bundle)),
      costEstimate: renderCost,
      route: `${routeBase}/video`,
      canOpen: true,
      canValidate: Boolean(bundle.video?.status === "completed" && !bundle.video.videoValidated),
    },
    {
      id: "planning",
      label: "Planning",
      state: workflow.video === "validated" || bundle.video?.videoValidated ? "waiting_validation" : "pending",
      detail: "Preparation automatique de creneaux; enregistrement seulement apres validation.",
      durationLabel: formatDurationLabel(estimateActionSeconds("propose_schedule", bundle)),
      costEstimate: null,
      route: `${routeBase}/programming`,
      canOpen: true,
      canValidate: workflow.video === "validated" || Boolean(bundle.video?.videoValidated),
    },
    {
      id: "publication",
      label: "Publication",
      state: workflow.readyToPublish === "validated" ? "waiting_validation" : "pending",
      detail: "Publication reelle toujours bloquee par autorisation humaine explicite.",
      durationLabel: "0 min",
      costEstimate: null,
      route: `${routeBase}/programming`,
      canOpen: true,
      canValidate: workflow.readyToPublish === "validated",
    },
  ];
}

// Reads all state needed for one draft. Promise.allSettled keeps the plan useful
// even when one diagnostic source fails.
async function readDraftBundle(draft: SavedContentDraft, userId: string): Promise<DraftBundle> {
  const readErrors: string[] = [];
  const [mediaResult, videoResult] = await Promise.allSettled([
    readMediaPipelineState({ draftId: draft.id, userId }),
    readVideoRenderJobState({ draftId: draft.id, userId }),
  ]);
  const media = mediaResult.status === "fulfilled" ? mediaResult.value : null;
  const video = videoResult.status === "fulfilled" ? videoResult.value : null;

  if (mediaResult.status === "rejected") {
    readErrors.push(mediaResult.reason instanceof Error ? mediaResult.reason.message : "Media pipeline indisponible.");
  }
  if (videoResult.status === "rejected") {
    readErrors.push(videoResult.reason instanceof Error ? videoResult.reason.message : "Etat rendu video indisponible.");
  }

  const workflow = getShortWorkflowState({
    draft: {
      status: draft.status,
      visualStatus: draft.visualStatus,
      visualsValidatedAt: draft.visualsValidatedAt,
    },
    media: media
      ? {
          mediaPipelineStatus: media.mediaPipelineStatus,
          selectedAssets: media.selectedAssets,
          subtitles: media.subtitles,
          videoPreparation: media.videoPreparation,
          visualScenes: media.visualScenes,
          voice: media.voice,
        }
      : null,
    requiredVisualCount: requiredVisualCount(draft),
    video: video
      ? {
          status: video.videoValidated ? "validated" : video.status === "completed" ? "ready" : video.status,
        }
      : null,
  });

  return {
    draft,
    media,
    video,
    workflow,
    readErrors,
  };
}

// Converts internal draft data to the payload consumed by the dashboard.
function summarizeDraft(bundle: DraftBundle, mode: ShortsProductionMode): ShortsAssistantDraftSummary {
  const action = draftAction(bundle, mode);
  return {
    id: bundle.draft.id,
    title: bundle.draft.title,
    status: bundle.draft.status,
    workflow: bundle.workflow,
    timeline: buildDraftTimeline(bundle),
    blockedReasons: blockedReasons(bundle, action),
    nextAction: action,
  };
}

// Builds schedule suggestions from the existing scheduling engine. It only
// proposes slots; saving them remains a sensitive follow-up action.
async function buildScheduleProposals({
  command,
  userId,
}: {
  command: string;
  userId: string;
}) {
  const scheduling = await readShortsSchedulingState({ userId });
  const normalized = normalizeCommand(command);
  const daysCount = normalized.includes("7 jours") || normalized.includes("semaine") ? 7 : 5;
  const scheduleCandidateResult = buildShortsScheduleCandidates({
    daysCount,
    frequency: 1,
    platforms: ["tiktok", "instagram", "youtube"],
    startDate: getDateValueInTimezone(new Date(), DEFAULT_SHORTS_SCHEDULE_TIMEZONE),
    timezone: DEFAULT_SHORTS_SCHEDULE_TIMEZONE,
  });
  const candidates = scheduleCandidateResult.candidates;
  const activeKeys = new Set(
    scheduling.schedules
      .filter((schedule) => !["cancelled", "failed", "published"].includes(schedule.status))
      .map((schedule) => `${schedule.draftId}:${schedule.platform}`),
  );
  const proposals: ShortsAssistantScheduleProposal[] = [];

  for (const video of scheduling.videos) {
    for (const candidate of candidates) {
      const key = `${video.draftId}:${candidate.platform}`;
      if (activeKeys.has(key)) {
        continue;
      }
      if (proposals.some((proposal) => proposal.scheduledAt === candidate.scheduledAt && proposal.platform === candidate.platform)) {
        continue;
      }

      proposals.push({
        draftId: video.draftId,
        draftTitle: video.title,
        platform: candidate.platform,
        scheduledAt: candidate.scheduledAt,
        timezone: scheduleCandidateResult.timezone,
        slotLabel: candidate.slotLabel,
      });
      activeKeys.add(key);
      break;
    }
  }

  return proposals.slice(0, daysCount);
}

// Groups actions into operational workflow steps so the UI can show progress
// and eventually run one step at a time after explicit confirmation.
function buildWorkflowSteps(actions: ShortsAssistantAction[]): ShortsAssistantWorkflowStep[] {
  const order: ShortsAssistantActionKind[] = [
    "validate_text",
    "generate_visuals",
    "validate_visuals",
    "generate_voice",
    "validate_voice",
    "generate_subtitles",
    "validate_subtitles",
    "prepare_video",
    "start_video_render",
    "validate_video",
    "propose_schedule",
    "save_schedule",
    "prepare_publication",
    "publish",
    "blocked_report",
  ];
  const titles: Record<ShortsAssistantActionKind, string> = {
    blocked_report: "Rapport des blocages",
    generate_subtitles: "Generer les sous-titres",
    generate_visuals: "Generer les visuels",
    generate_voice: "Generer les voix",
    prepare_publication: "Preparer les publications",
    prepare_video: "Preparer les videos",
    propose_schedule: "Proposer le planning",
    publish: "Publier",
    save_schedule: "Valider le planning",
    start_video_render: "Lancer les rendus video",
    validate_subtitles: "Valider les sous-titres",
    validate_text: "Valider les textes",
    validate_video: "Valider les videos",
    validate_visuals: "Valider les visuels",
    validate_voice: "Valider les voix",
  };

  return order.flatMap((kind) => {
    const matchingActions = actions.filter((action) => action.kind === kind);
    if (matchingActions.length === 0) {
      return [];
    }

    const sensitive = matchingActions.some((action) => action.sensitive);
    return [{
      id: kind,
      title: titles[kind],
      status: kind === "publish" ? "blocked" : "pending",
      actionKind: kind,
      actionCount: matchingActions.length,
      sensitive,
      requiresExplicitConfirmation: matchingActions.some((action) => action.requiresExplicitConfirmation),
      estimatedSeconds: matchingActions.reduce((sum, action) => sum + action.estimatedSeconds, 0),
    } satisfies ShortsAssistantWorkflowStep];
  });
}

// Computes compact cost/time estimates for the dashboard header.
function buildEstimates(actions: ShortsAssistantAction[]): ShortsAssistantEstimates {
  const costEstimates = actions
    .map((action) => action.costEstimate)
    .filter((estimate): estimate is CostEstimate => Boolean(estimate));
  const openaiCostEur = sumCosts(
    costEstimates
      .filter((estimate) => estimate.provider === "openai")
      .map((estimate) => estimate.estimatedCostEur),
  );
  const elevenLabsCostEur = sumCosts(
    costEstimates
      .filter((estimate) => estimate.provider === "elevenlabs")
      .map((estimate) => estimate.estimatedCostEur),
  );
  const railwayCostEur = sumCosts(
    costEstimates
      .filter((estimate) => estimate.provider === "railway")
      .map((estimate) => estimate.estimatedCostEur),
  );
  const estimatedSeconds = actions.reduce((sum, action) => sum + action.estimatedSeconds, 0);
  const estimatedMinutes = Math.max(1, Math.ceil(estimatedSeconds / 60));

  return {
    actionsCount: actions.length,
    estimatedSeconds,
    estimatedMinutesLabel: `${estimatedMinutes} min`,
    openaiCostEur,
    elevenLabsCostEur,
    railwayCostEur,
    totalCostEur: sumCosts([openaiCostEur, elevenLabsCostEur, railwayCostEur]),
    notes: [
      "Estimations approximatives basees sur les tarifs configurables existants.",
      "Les validations humaines ne generent pas de cout IA.",
    ],
  };
}

// Builds the short, non-chat dashboard summary requested by Pilotage IA.
function buildDashboard({
  actions,
  blockedDrafts,
  objective,
  scheduleProposals,
  summaries,
}: {
  actions: ShortsAssistantAction[];
  blockedDrafts: ShortsAssistantDraftSummary[];
  objective: string;
  scheduleProposals: ShortsAssistantScheduleProposal[];
  summaries: ShortsAssistantDraftSummary[];
}): ShortsAssistantDashboard {
  const blockers = [
    ...blockedDrafts.slice(0, 4).map((draft) => `${draft.title}: ${draft.blockedReasons.join(" ; ")}`),
    ...actions
      .filter((action) => action.kind === "publish")
      .flatMap((action) => action.blockedBy ?? []),
  ];

  return {
    currentState: `${objective}: ${summaries.length} brouillon(s), ${blockedDrafts.length} bloque(s), ${scheduleProposals.length} creneau(x) propose(s).`,
    blockers: blockers.length ? blockers : ["Aucun blocage critique detecte."],
    proposedPlan: actions
      .filter((action) => action.kind !== "publish")
      .slice(0, 6)
      .map((action) => action.label),
    availableActions: [...new Set(actions.map((action) => action.kind))],
  };
}

// Collects detailed explainability for the collapsed "Developper l'analyse"
// section without making the primary response verbose.
function buildDetailedAnalysis({
  actions,
  bundles,
  scheduleProposals,
}: {
  actions: ShortsAssistantAction[];
  bundles: DraftBundle[];
  scheduleProposals: ShortsAssistantScheduleProposal[];
}): ShortsAssistantDetailedAnalysis {
  return {
    sourcesUsed: [
      "content_drafts",
      "content_draft_media_plans",
      "content_draft_visual_scenes",
      "content_assets",
      "video_render_jobs",
      "short_video_schedules",
    ],
    memoryUsed: ["Aucune memoire projet ecrite par cette V1."],
    draftsDetected: bundles.map((bundle) => ({
      id: bundle.draft.id,
      title: bundle.draft.title,
      status: bundle.draft.status,
      nextStep: bundle.workflow.nextStep,
    })),
    reasoning: [
      "Chaque brouillon est converti en ShortWorkflowState.",
      "Les actions deja validees ne sont pas reproposees.",
      "Les validations, programmations et publications sont marquees sensibles.",
      "Les creneaux viennent du moteur de scheduling existant.",
    ],
    dependencies: [
      "Supabase service role cote serveur.",
      "ElevenLabs pour voix et alignement sous-titres.",
      "Railway pour rendu video.",
      "OAuth plateformes pour publication.",
      `${scheduleProposals.length} proposition(s) de planning calculee(s).`,
    ],
    risks: [
      ...actions.filter((action) => action.sensitive).map((action) => `${action.kind}: confirmation requise`),
      "Execution groupee non branchee en V1.",
    ],
    justification: actions.map((action) =>
      `${action.kind}: ${action.draftTitle ?? "global"} - ${action.label}`,
    ),
  };
}

// Public entry point used by the API route. It returns a full operational
// dashboard and never executes the plan.
export async function buildShortsAssistantPlan({
  command,
  mode = "assisted",
  userId,
}: {
  command: string;
  mode?: ShortsProductionMode;
  userId: string;
}): Promise<ShortsAssistantPlan> {
  const normalizedCommand = command.trim().slice(0, 1000);
  const productionMode = normalizeProductionMode(mode);
  const intent = detectShortsIntent(normalizedCommand);
  const drafts = await readContentDrafts({ status: "all", userId });
  const bundles = await Promise.all(drafts.map((draft) => readDraftBundle(draft, userId)));
  const summaries = bundles.map((bundle) => summarizeDraft(bundle, productionMode));
  const actions = summaries
    .map((summary) => summary.nextAction)
    .filter((action): action is ShortsAssistantAction => Boolean(action));
  const scheduleProposals =
    intent === "prepare_week" || intent === "schedule_ready_videos"
      ? await buildScheduleProposals({ command: normalizedCommand, userId })
      : [];

  if (scheduleProposals.length > 0) {
    actions.push({
      kind: "save_schedule",
      label: "Enregistrer les creneaux proposes apres validation explicite.",
      sensitive: true,
      allowedInV1: false,
      requiresExplicitConfirmation: true,
      placeholder: true,
      route: "/interface/post-creation/shorts/programming",
      estimatedSeconds: estimateActionSeconds("save_schedule"),
      costEstimate: null,
    });
  }

  // Publication is deliberately represented as blocked capability. Future
  // execution code must keep this as a separate confirmation step.
  actions.push({
    kind: "publish",
    label: "Publication reelle: interdite en automatique dans cette V1.",
    sensitive: true,
    allowedInV1: false,
    requiresExplicitConfirmation: true,
    placeholder: true,
    blockedBy: ["Validation explicite obligatoire", "Branchement non implemente en V1"],
    estimatedSeconds: 0,
    costEstimate: null,
  });

  const blockedDrafts = summaries.filter((summary) => summary.blockedReasons.length > 0);
  const terminableDrafts = summaries.filter(
    (summary) =>
      summary.nextAction &&
      !summary.blockedReasons.some((reason) => reason.includes("Validation texte")),
  );
  const readyVideos = summaries.filter(
    (summary) => summary.workflow.video === "validated" || summary.workflow.readyToPublish === "validated",
  );
  const workflowSteps = buildWorkflowSteps(actions);
  const estimates = buildEstimates(actions);
  const dashboard = buildDashboard({
    actions,
    blockedDrafts,
    objective: objectiveForIntent(intent),
    scheduleProposals,
    summaries,
  });
  const detailedAnalysis = buildDetailedAnalysis({
    actions,
    bundles,
    scheduleProposals,
  });

  return {
    objective: objectiveForIntent(intent),
    intent,
    mode: productionMode,
    command: normalizedCommand,
    generatedAt: new Date().toISOString(),
    guardrails,
    dashboard,
    estimates,
    stats: {
      draftsFound: summaries.length,
      terminableDrafts: terminableDrafts.length,
      blockedDrafts: blockedDrafts.length,
      readyVideos: readyVideos.length,
      proposedScheduleSlots: scheduleProposals.length,
    },
    drafts: summaries,
    actions,
    workflowSteps,
    scheduleProposals,
    blockedDrafts,
    detailedAnalysis,
    warnings: [
      productionMode === "manual"
        ? "Mode Manuel: aucune execution groupee n'est lancee depuis Pilotage IA."
        : "Les generations IA autorisees peuvent etre lancees sans confirmation prealable.",
      "La programmation definitive et la publication reelle restent bloquees par validation humaine.",
      "Le runner relit Supabase apres chaque passe pour reprendre le pipeline proprement.",
    ],
    execution: {
      mode: productionMode,
      summary: productionMode === "manual"
        ? "Chaque etape reste lancee individuellement dans ses modules dedies."
        : "Le pipeline peut executer automatiquement les generations autorisees puis s'arreter aux validations utiles.",
      blockedActions: actions
        .filter((action) => action.requiresExplicitConfirmation || action.placeholder)
        .map((action) => action.label),
    },
  };
}

// Executes a single whitelisted Shorts action. Callers must filter the action
// with isExecutableInMode before invoking this function.
async function executeShortsAction({
  action,
  userId,
}: {
  action: ShortsAssistantAction;
  userId: string;
}) {
  if (!action.draftId && action.kind !== "propose_schedule") {
    throw new Error("Action brouillon requise.");
  }

  const draftId = action.draftId as string;

  if (action.kind === "generate_visuals") {
    await requestDraftVisualGeneration({ draftId, userId });
    await recordVisualCost({ action: "shorts_production_generate_visuals", draftId, userId });
    return "Visuels generes ou demandes.";
  }

  if (action.kind === "validate_visuals") {
    await validateDraftVisuals({ draftId, userId });
    return "Visuels valides automatiquement.";
  }

  if (action.kind === "generate_voice") {
    await generateDraftVoice({ draftId, userId });
    const media = await readMediaPipelineState({ draftId, includeSuggestions: true, userId });
    await recordVoiceCostFromMedia({ action: "shorts_production_generate_voice", draftId, media, userId });
    return "Voix generee.";
  }

  if (action.kind === "validate_voice") {
    await validateDraftVoice({ draftId, userId });
    return "Voix validee automatiquement.";
  }

  if (action.kind === "generate_subtitles") {
    await generateDraftSubtitles({ draftId, userId });
    const media = await readMediaPipelineState({ draftId, includeSuggestions: true, userId });
    await recordSubtitleCostFromMedia({ action: "shorts_production_generate_subtitles", draftId, media, userId });
    return "Sous-titres generes.";
  }

  if (action.kind === "validate_subtitles") {
    await validateDraftSubtitles({ draftId, userId });
    return "Sous-titres valides automatiquement.";
  }

  if (action.kind === "prepare_video") {
    await prepareDraftVideo({ draftId, userId });
    return "Manifest video prepare.";
  }

  if (action.kind === "start_video_render") {
    const { job, reusedActiveJob } = await createOrReuseVideoRenderJob({
      draftId,
      mode: "start",
      userId,
    });

    if (job.status === "queued") {
      try {
        await dispatchVideoRenderJob(job.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Renderer Railway indisponible.";
        await markVideoRenderJobFailed(job.id, message);
        throw new Error(message);
      }
    }

    const videoRender = await readVideoRenderJobState({ draftId, userId });
    if (videoRender?.status === "completed") {
      await recordVideoRenderCost({ draftId, userId, videoRender });
    }

    return reusedActiveJob ? "Rendu video deja en cours." : "Rendu video lance.";
  }

  if (action.kind === "validate_video") {
    await validateCompletedVideoRenderJob({ draftId, userId });
    return "Video finale validee automatiquement.";
  }

  if (action.kind === "propose_schedule") {
    return "Planning prepare sans programmation definitive.";
  }

  throw new Error(`Action non executable automatiquement: ${action.kind}.`);
}

// Detects repeated execution passes so the runner does not loop forever when a
// remote provider leaves durable state unchanged.
function executableActionSignature(actions: ShortsAssistantAction[]) {
  return actions
    .map((action) => `${action.kind}:${action.draftId ?? "global"}`)
    .sort()
    .join("|");
}

// Runs the semi-automatic Shorts production loop. It never saves schedules,
// never publishes, and stops as soon as the selected mode requires validation.
export async function executeShortsProductionPipeline({
  command,
  mode,
  userId,
}: {
  command: string;
  mode: ShortsProductionMode;
  userId: string;
}): Promise<ShortsAssistantExecutionPreview & { logs: ShortsProductionRunLog[]; plan: ShortsAssistantPlan }> {
  const productionMode = normalizeProductionMode(mode);
  const logs: ShortsProductionRunLog[] = [];
  const seenPasses = new Set<string>();
  let plan = await buildShortsAssistantPlan({ command, mode: productionMode, userId });

  if (productionMode === "manual") {
    return {
      ...previewShortsAssistantExecution(plan),
      logs,
      message: "Mode Manuel actif: aucune execution groupee lancee.",
      plan,
    };
  }

  for (let pass = 0; pass < 8; pass += 1) {
    const executableActions = plan.actions.filter((action) =>
      action.allowedInV1 &&
      !action.placeholder &&
      !action.requiresExplicitConfirmation &&
      isExecutableInMode(action.kind, productionMode),
    );
    const signature = executableActionSignature(executableActions);

    if (executableActions.length === 0 || seenPasses.has(signature)) {
      break;
    }
    seenPasses.add(signature);

    for (const action of executableActions) {
      try {
        const message = await executeShortsAction({ action, userId });
        logs.push({
          action: action.kind,
          draftId: action.draftId,
          draftTitle: action.draftTitle,
          result: "success",
          message,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logs.push({
          action: action.kind,
          draftId: action.draftId,
          draftTitle: action.draftTitle,
          result: "failed",
          message,
        });
        plan = await buildShortsAssistantPlan({ command, mode: productionMode, userId });
        return {
          ...previewShortsAssistantExecution(plan),
          executed: logs.some((log) => log.result === "success"),
          logs,
          message: `Pipeline arrete sur erreur: ${message}`,
          plan,
        };
      }
    }

    plan = await buildShortsAssistantPlan({ command, mode: productionMode, userId });
  }

  const stoppedFor = plan.actions
    .filter((action) => action.requiresExplicitConfirmation || action.placeholder)
    .map((action) => action.label);

  return {
    ...previewShortsAssistantExecution(plan),
    executed: logs.some((log) => log.result === "success"),
    blockedActions: stoppedFor,
    logs,
    message: logs.length
      ? "Pipeline execute jusqu'au prochain point de validation utile."
      : "Aucune generation automatique disponible pour le mode actuel.",
    plan,
  };
}

// Builds a progress payload without mutating data. The production runner reuses
// it after each execution pass to keep the response shape stable.
export function previewShortsAssistantExecution(plan: ShortsAssistantPlan): ShortsAssistantExecutionPreview {
  return {
    ok: true,
    executed: false,
    message:
      "Execution non declenchee: relis le plan et choisis un mode de production.",
    blockedActions: plan.execution.blockedActions,
    progress: {
      completedSteps: 0,
      totalSteps: plan.workflowSteps.length,
      percent: 0,
      steps: plan.workflowSteps.map((step) => ({
        title: step.title,
        status: step.sensitive || step.status === "blocked" ? "blocked" : "pending",
      })),
    },
    nextImplementationStep:
      "Brancher chaque action autorisee avec une confirmation explicite, un journal d'audit et une reprise apres erreur.",
  };
}
