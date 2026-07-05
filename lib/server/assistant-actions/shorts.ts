import "server-only";

import { readContentDrafts, type SavedContentDraft } from "@/lib/server/content-workshop";
import { readMediaPipelineState, type MediaPipelineState } from "@/lib/server/media-pipeline";
import { readShortsSchedulingState } from "@/lib/server/shorts-scheduling";
import { readVideoRenderJobState, type VideoRenderJobState } from "@/lib/server/video-renderer";
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
};

export type ShortsAssistantDraftSummary = {
  id: string;
  title: string;
  status: string;
  workflow: ShortWorkflowState;
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
  command: string;
  generatedAt: string;
  guardrails: string[];
  stats: {
    draftsFound: number;
    terminableDrafts: number;
    blockedDrafts: number;
    readyVideos: number;
    proposedScheduleSlots: number;
  };
  drafts: ShortsAssistantDraftSummary[];
  actions: ShortsAssistantAction[];
  scheduleProposals: ShortsAssistantScheduleProposal[];
  blockedDrafts: ShortsAssistantDraftSummary[];
  warnings: string[];
  execution: {
    mode: "plan_only";
    summary: string;
    blockedActions: string[];
  };
};

export type ShortsAssistantExecutionPreview = {
  ok: true;
  executed: false;
  message: string;
  blockedActions: string[];
  nextImplementationStep: string;
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
  "Les generations sont seulement listees dans cette V1.",
  "Aucun secret, token OAuth ou configuration serveur n'est modifie.",
  "L'orchestrateur produit un plan; il ne remplace pas les validations humaines.",
];

function normalizeCommand(command: string) {
  return command
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

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

function requiredVisualCount(draft: SavedContentDraft) {
  const value = draft.score.requiredVisualSceneCount;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function actionBase({
  draft,
  kind,
  label,
  route,
  sensitive = false,
  blockedBy,
}: {
  draft?: SavedContentDraft;
  kind: ShortsAssistantActionKind;
  label: string;
  route?: string;
  sensitive?: boolean;
  blockedBy?: string[];
}): ShortsAssistantAction {
  return {
    kind,
    label,
    draftId: draft?.id,
    draftTitle: draft?.title,
    blockedBy,
    route,
    sensitive,
    allowedInV1: false,
    requiresExplicitConfirmation: true,
    placeholder: true,
  };
}

function draftAction(bundle: DraftBundle): ShortsAssistantAction | null {
  const { draft, media, video, workflow } = bundle;

  if (publicationStatuses.has(draft.status)) {
    return null;
  }

  if (workflow.text === "pending") {
    return actionBase({
      draft,
      kind: "validate_text",
      label: "Valider le texte avant toute generation.",
      route: `/interface/post-creation/shorts/drafts`,
      sensitive: true,
    });
  }

  if (workflow.visuals === "pending" || workflow.visuals === "in_progress") {
    return actionBase({
      draft,
      kind: "generate_visuals",
      label: "Generer ou completer les visuels manquants.",
      route: `/interface/post-creation/shorts/visuals`,
    });
  }

  if (workflow.visuals === "ready") {
    return actionBase({
      draft,
      kind: "validate_visuals",
      label: "Valider les visuels retenus.",
      route: `/interface/post-creation/shorts/visuals`,
      sensitive: true,
    });
  }

  if (workflow.voice === "pending" || workflow.voice === "error") {
    return actionBase({
      draft,
      kind: "generate_voice",
      label: workflow.voice === "error" ? "Relancer la generation de voix." : "Generer la voix-off.",
      route: `/interface/post-creation/shorts/voice`,
    });
  }

  if (workflow.voice === "ready") {
    return actionBase({
      draft,
      kind: "validate_voice",
      label: "Valider la voix-off avant les sous-titres.",
      route: `/interface/post-creation/shorts/voice`,
      sensitive: true,
    });
  }

  if (workflow.subtitles === "pending" || workflow.subtitles === "error") {
    return actionBase({
      draft,
      kind: "generate_subtitles",
      label: workflow.subtitles === "error" ? "Relancer les sous-titres." : "Generer les sous-titres.",
      route: `/interface/post-creation/shorts/voice`,
    });
  }

  if (workflow.subtitles === "ready") {
    return actionBase({
      draft,
      kind: "validate_subtitles",
      label: "Valider les sous-titres avant le montage.",
      route: `/interface/post-creation/shorts/voice`,
      sensitive: true,
    });
  }

  if (workflow.video === "pending") {
    return actionBase({
      draft,
      kind: "prepare_video",
      label: "Preparer le manifest video pour le renderer.",
      route: `/interface/post-creation/shorts/video`,
    });
  }

  if (workflow.video === "ready" && (!video || video.status !== "completed")) {
    return actionBase({
      draft,
      kind: "start_video_render",
      label: "Lancer ou relancer le rendu video Railway.",
      route: `/interface/post-creation/shorts/video`,
    });
  }

  if (video?.status === "completed" && !video.videoValidated) {
    return actionBase({
      draft,
      kind: "validate_video",
      label: "Valider manuellement la video finale.",
      route: `/interface/post-creation/shorts/video`,
      sensitive: true,
    });
  }

  if (workflow.video === "validated" || video?.videoValidated) {
    return actionBase({
      draft,
      kind: "propose_schedule",
      label: "Proposer un creneau de programmation.",
      route: `/interface/post-creation/shorts/programming`,
    });
  }

  if (!media) {
    return actionBase({
      draft,
      kind: "blocked_report",
      label: "Relire le media pipeline: etat indisponible.",
      blockedBy: bundle.readErrors,
      route: `/interface/post-creation/shorts/drafts`,
      sensitive: false,
    });
  }

  return null;
}

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

function summarizeDraft(bundle: DraftBundle): ShortsAssistantDraftSummary {
  const action = draftAction(bundle);
  return {
    id: bundle.draft.id,
    title: bundle.draft.title,
    status: bundle.draft.status,
    workflow: bundle.workflow,
    blockedReasons: blockedReasons(bundle, action),
    nextAction: action,
  };
}

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

export async function buildShortsAssistantPlan({
  command,
  userId,
}: {
  command: string;
  userId: string;
}): Promise<ShortsAssistantPlan> {
  const normalizedCommand = command.trim().slice(0, 1000);
  const intent = detectShortsIntent(normalizedCommand);
  const drafts = await readContentDrafts({ status: "all", userId });
  const bundles = await Promise.all(drafts.map((draft) => readDraftBundle(draft, userId)));
  const summaries = bundles.map(summarizeDraft);
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

  return {
    objective: objectiveForIntent(intent),
    intent,
    command: normalizedCommand,
    generatedAt: new Date().toISOString(),
    guardrails,
    stats: {
      draftsFound: summaries.length,
      terminableDrafts: terminableDrafts.length,
      blockedDrafts: blockedDrafts.length,
      readyVideos: readyVideos.length,
      proposedScheduleSlots: scheduleProposals.length,
    },
    drafts: summaries,
    actions,
    scheduleProposals,
    blockedDrafts,
    warnings: [
      "V1 plan-only: aucune mutation Supabase n'est declenchee depuis ce module.",
      "Les actions de validation, programmation et publication restent sensibles.",
      "Les actions de generation sont listees mais pas encore branchees a l'execution groupee.",
    ],
    execution: {
      mode: "plan_only",
      summary: "Le plan peut etre relu, mais l'execution groupee est un placeholder securise.",
      blockedActions: actions
        .filter((action) => action.sensitive || action.placeholder)
        .map((action) => action.label),
    },
  };
}

export function previewShortsAssistantExecution(plan: ShortsAssistantPlan): ShortsAssistantExecutionPreview {
  return {
    ok: true,
    executed: false,
    message:
      "Execution non declenchee: la V1 du Pilotage IA produit un plan et bloque les mutations groupees.",
    blockedActions: plan.execution.blockedActions,
    nextImplementationStep:
      "Brancher chaque action autorisee avec une confirmation explicite, un journal d'audit et une reprise apres erreur.",
  };
}
