"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ActionKind =
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

type ProductionMode = "assisted" | "automatic" | "manual";

type PlanAction = {
  kind: ActionKind;
  label: string;
  autoValidation: AutoValidationDecision | null;
  draftId?: string;
  draftTitle?: string;
  blockedBy?: string[];
  route?: string;
  sensitive: boolean;
  allowedInV1: boolean;
  requiresExplicitConfirmation: boolean;
  placeholder: boolean;
  estimatedSeconds: number;
  costEstimate: {
    provider: "openai" | "elevenlabs" | "railway" | "supabase" | "internal";
    category: string;
    estimatedCostEur: number | null;
    note: string;
  } | null;
};

type AutoValidationDecision = {
  autoValidated: boolean;
  blockedReason: string | null;
  canAutoValidate: boolean;
  canRun: boolean;
  qualitySignals: Record<string, string | number | boolean | null>;
  reason: string;
  requiresHumanValidation: boolean;
  nextAction: string;
};

type TimelineStep = {
  id: "visuals" | "voice" | "subtitles" | "video" | "planning" | "publication";
  label: string;
  autoValidation: AutoValidationDecision | null;
  state: "done" | "running" | "waiting_validation" | "pending" | "blocked";
  detail: string;
  durationLabel: string;
  costEstimate: PlanAction["costEstimate"];
  route: string;
  canOpen: boolean;
  canValidate: boolean;
};

type WorkflowStep = {
  id: string;
  title: string;
  status: "pending" | "blocked" | "ready" | "done";
  actionKind: ActionKind;
  actionCount: number;
  sensitive: boolean;
  requiresExplicitConfirmation: boolean;
  estimatedSeconds: number;
};

type DraftSummary = {
  id: string;
  title: string;
  status: string;
  blockedReasons: string[];
  workflow: {
    text: string;
    visuals: string;
    voice: string;
    subtitles: string;
    video: string;
    readyToPublish: string;
    nextStep: string;
  };
  timeline: TimelineStep[];
  nextAction: PlanAction | null;
};

type ScheduleProposal = {
  draftId: string;
  draftTitle: string;
  platform: "tiktok" | "instagram" | "youtube";
  scheduledAt: string;
  timezone: string;
  slotLabel: string;
};

type ShortsPlan = {
  objective: string;
  intent: string;
  mode: ProductionMode;
  command: string;
  generatedAt: string;
  guardrails: string[];
  dashboard: {
    currentState: string;
    blockers: string[];
    proposedPlan: string[];
    availableActions: string[];
  };
  estimates: {
    actionsCount: number;
    estimatedSeconds: number;
    estimatedMinutesLabel: string;
    openaiCostEur: number | null;
    elevenLabsCostEur: number | null;
    railwayCostEur: number | null;
    totalCostEur: number | null;
    notes: string[];
  };
  stats: {
    draftsFound: number;
    terminableDrafts: number;
    blockedDrafts: number;
    readyVideos: number;
    proposedScheduleSlots: number;
  };
  drafts: DraftSummary[];
  actions: PlanAction[];
  workflowSteps: WorkflowStep[];
  scheduleProposals: ScheduleProposal[];
  blockedDrafts: DraftSummary[];
  detailedAnalysis: {
    sourcesUsed: string[];
    memoryUsed: string[];
    draftsDetected: Array<{ id: string; title: string; status: string; nextStep: string }>;
    reasoning: string[];
    dependencies: string[];
    risks: string[];
    justification: string[];
  };
  warnings: string[];
  execution: {
    mode: "assisted" | "automatic" | "manual" | "plan_only";
    summary: string;
    blockedActions: string[];
  };
};

type ExecutionPreview = {
  ok: true;
  executed: boolean;
  message: string;
  blockedActions: string[];
  logs?: Array<{
    action: ActionKind;
    autoValidated?: boolean;
    blockedReason?: string | null;
    draftId?: string;
    draftTitle?: string;
    mode?: ProductionMode;
    qualitySignals?: Record<string, string | number | boolean | null>;
    result: "success" | "failed" | "skipped" | "stopped";
    message: string;
  }>;
  plan?: ShortsPlan;
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

type PipelineStage = {
  id: string;
  label: string;
  state: "done" | "active" | "waiting" | "pending" | "blocked";
};

type ValidationTarget = {
  draft: DraftSummary;
  step: TimelineStep;
};

type DrawerVisualAsset = {
  id: string;
  assetSource?: string;
  fileName?: string;
  publicUrl: string;
  score?: number;
  scoreReason?: string;
  metadata?: Record<string, unknown>;
  usageOrder?: number;
};

type DrawerVisualScene = {
  id: string;
  assetId: string | null;
  visualPromptIndex: number;
  visualPromptText: string;
  generationSource: string;
  generationStatus: string;
  imageUrl: string | null;
  scoreTotal: number | null;
  scoreSource?: string;
};

type DrawerVoiceState = {
  audioUrl: string | null;
  durationEstimateSeconds?: number;
  errorMessage: string | null;
  generatedAt: string | null;
  selectedVoiceLabel?: string;
  status: string;
};

type DrawerSubtitleState = {
  durationSeconds?: number;
  errorMessage: string | null;
  generatedAt: string | null;
  jsonUrl?: string | null;
  previewSegments?: Array<{ end: number; start: number; text: string }>;
  segmentsCount?: number;
  srtUrl?: string | null;
  status: string;
  vttUrl?: string | null;
};

type DrawerMediaState = {
  assetsFound?: number;
  selectedAssets?: DrawerVisualAsset[];
  suggestedAssets?: DrawerVisualAsset[];
  subtitles?: DrawerSubtitleState;
  visualDecision?: {
    confidence?: number;
    missing_visual_needs?: string[];
    mode?: string;
    reason?: string;
  } | null;
  visualScenes?: DrawerVisualScene[];
  voice?: DrawerVoiceState;
};

type DrawerVideoState = {
  completedAt: string | null;
  durationSeconds: number | null;
  errorMessage: string | null;
  outputUrl: string | null;
  status: string;
  videoValidated: boolean;
};

const examples = [
  "Termine les brouillons commences",
  "Prepare 7 jours de publications",
  "Programme les videos pretes pour la semaine",
  "Fais-moi un rapport des brouillons bloques",
];

const platformLabels = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
};

const productionModeLabels: Record<ProductionMode, { label: string; description: string }> = {
  assisted: {
    label: "Assiste",
    description: "Genere automatiquement et s'arrete aux validations utiles.",
  },
  automatic: {
    label: "Automatique",
    description: "Enchaine les generations et validations internes, sans publication reelle.",
  },
  manual: {
    label: "Manuel",
    description: "Garde le fonctionnement actuel: chaque etape est ouverte et lancee individuellement.",
  },
};

const workingMessages = [
  "Analyse des brouillons...",
  "Preparation des prompts...",
  "Comparaison des scores...",
  "Selection des meilleurs visuels...",
  "Creation des voix...",
  "Synchronisation des sous-titres...",
  "Preparation de la video...",
  "Organisation du planning...",
];

const stageLabels: Record<TimelineStep["id"] | "analysis", string> = {
  analysis: "Analyse",
  planning: "Planning",
  publication: "Publication",
  subtitles: "Sous-titres",
  video: "Video",
  visuals: "Generation des visuels",
  voice: "Generation des voix",
};

const actionKindLabels: Record<ActionKind, string> = {
  blocked_report: "Comprendre les blocages",
  generate_subtitles: "Generer les sous-titres",
  generate_visuals: "Generer les visuels",
  generate_voice: "Generer les voix",
  prepare_publication: "Preparer la publication",
  prepare_video: "Preparer la video",
  propose_schedule: "Preparer le planning",
  publish: "Publier",
  save_schedule: "Programmer",
  start_video_render: "Generer la video",
  validate_subtitles: "Valider les sous-titres",
  validate_text: "Valider le texte",
  validate_video: "Valider la video",
  validate_visuals: "Valider les visuels",
  validate_voice: "Valider la voix",
};

// Formats schedule proposals with the same Paris timezone as the scheduling
// module, so the operator sees the real planning slots.
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

// Formats nullable estimated costs without pretending unknown values are free.
function formatCost(value: number | null) {
  if (value === null) {
    return "0 EUR estime";
  }

  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 4,
    style: "currency",
  }).format(value);
}

// Converts timeline states into labels an operator can scan quickly.
function formatTimelineState(state: TimelineStep["state"]) {
  const labels: Record<TimelineStep["state"], string> = {
    blocked: "Bloque",
    done: "Termine",
    pending: "A faire",
    running: "En cours",
    waiting_validation: "En attente de validation",
  };

  return labels[state];
}

// Applies consistent visual emphasis to done, running, validation and blocked
// steps in the per-draft production timeline.
function timelineTone(state: TimelineStep["state"]) {
  if (state === "done") {
    return "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]";
  }
  if (state === "running") {
    return "border-[#39E6D0]/35 bg-[#39E6D0]/10 text-[#39E6D0]";
  }
  if (state === "waiting_validation") {
    return "border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#FCD34D]";
  }
  if (state === "blocked") {
    return "border-[#F97316]/35 bg-[#F97316]/10 text-[#FDBA74]";
  }
  return "border-[#64748B]/35 bg-[#64748B]/10 text-[#CBD5E1]";
}

function stageMark(state: PipelineStage["state"]) {
  if (state === "done") return "✓";
  if (state === "waiting") return "!";
  if (state === "active") return "•";
  if (state === "blocked") return "x";
  return "o";
}

function validationModeLabel(decision: AutoValidationDecision | null, fallback: string) {
  if (!decision) {
    return fallback;
  }

  return decision.autoValidated
    ? "Auto-valide selon criteres qualite"
    : `Validation humaine requise : ${decision.blockedReason ?? "controle qualite"}`;
}

function compactCost(plan: ShortsPlan) {
  return plan.estimates.totalCostEur === null ? "0 EUR estime" : formatCost(plan.estimates.totalCostEur);
}

function formatActionKind(kind: ActionKind) {
  return actionKindLabels[kind];
}

function formatVisualScore(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(value > 10 ? 0 : 1)
    : "score non disponible";
}

// Builds the global progress bar from the real draft timelines already returned
// by the server plan. No business state is inferred outside those statuses.
function buildPipelineProgress(plan: ShortsPlan | null) {
  if (!plan) {
    return {
      activeDraft: null as DraftSummary | null,
      activeStep: null as TimelineStep | null,
      percent: 0,
      stages: [{ id: "analysis", label: stageLabels.analysis, state: "pending" as const }],
    };
  }

  const stages: PipelineStage[] = [{
    id: "analysis",
    label: stageLabels.analysis,
    state: "done",
  }];
  const stageIds: TimelineStep["id"][] = ["visuals", "voice", "subtitles", "video", "planning", "publication"];
  let activeDraft: DraftSummary | null = null;
  let activeStep: TimelineStep | null = null;

  stageIds.forEach((id) => {
    const steps = plan.drafts.map((draft) => draft.timeline.find((step) => step.id === id)).filter((step): step is TimelineStep => Boolean(step));
    const state: PipelineStage["state"] = steps.some((step) => step.state === "blocked")
      ? "blocked"
      : steps.some((step) => step.state === "waiting_validation")
        ? "waiting"
        : steps.some((step) => step.state === "running")
          ? "active"
          : steps.length > 0 && steps.every((step) => step.state === "done")
            ? "done"
            : "pending";

    if (!activeStep && state !== "done" && state !== "pending") {
      const draft = plan.drafts.find((item) => item.timeline.some((step) => step.id === id && step.state !== "done" && step.state !== "pending"));
      activeDraft = draft ?? null;
      activeStep = draft?.timeline.find((step) => step.id === id) ?? null;
    }

    stages.push({
      id,
      label: stageLabels[id],
      state,
    });
  });

  if (!activeStep) {
    const draft = plan.drafts.find((item) => item.timeline.some((step) => step.state === "pending"));
    activeDraft = draft ?? null;
    activeStep = draft?.timeline.find((step) => step.state === "pending") ?? null;
  }

  const score = stages.reduce((sum, stage) => {
    if (stage.state === "done") return sum + 1;
    if (stage.state === "waiting" || stage.state === "active") return sum + 0.6;
    return sum;
  }, 0);

  return {
    activeDraft,
    activeStep,
    percent: Math.round((score / stages.length) * 100),
    stages,
  };
}

// Chooses a visible progress hint while a request is in flight. The server still
// owns execution; this only keeps the cockpit from looking frozen.
function simulatedProgress(isBusy: boolean, currentValue: number) {
  if (!isBusy) return currentValue;
  return Math.min(94, currentValue);
}

// Main client component for Pilotage IA. It can start safe generation runs, but
// scheduling, publication and destructive actions stay behind dedicated screens.
export function ShortsPilotageClient() {
  const [command, setCommand] = useState(examples[0]);
  const [productionMode, setProductionMode] = useState<ProductionMode>("assisted");
  const [plan, setPlan] = useState<ShortsPlan | null>(null);
  const [executionPreview, setExecutionPreview] = useState<ExecutionPreview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [simulatedPercent, setSimulatedPercent] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [validationTarget, setValidationTarget] = useState<ValidationTarget | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = isAnalyzing || isExecuting || isValidating;
  const pipelineProgress = useMemo(() => buildPipelineProgress(plan), [plan]);
  const displayedPercent = isBusy
    ? simulatedProgress(isBusy, Math.max(pipelineProgress.percent, simulatedPercent))
    : pipelineProgress.percent;
  const activeDraft = pipelineProgress.activeDraft;
  const activeStep = pipelineProgress.activeStep;
  const notifications = useMemo(() => {
    const waiting = plan?.drafts.flatMap((draft) =>
      draft.timeline
        .filter((step) => step.state === "waiting_validation")
        .map((step) => ({ draft, step })),
    ) ?? [];

    return waiting.slice(0, 3);
  }, [plan]);

  useEffect(() => {
    if (!isBusy) {
      return;
    }

    const interval = window.setInterval(() => {
      setSimulatedPercent((value) => Math.min(94, Math.max(value + 3, pipelineProgress.percent + 8)));
      setMessageIndex((value) => (value + 1) % workingMessages.length);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [isBusy, pipelineProgress.percent]);

  // Groups proposed actions by kind to keep the operational plan scannable.
  const groupedActions = useMemo(() => {
    const groups = new Map<ActionKind, PlanAction[]>();
    plan?.actions.forEach((action) => {
      groups.set(action.kind, [...(groups.get(action.kind) ?? []), action]);
    });
    return [...groups.entries()];
  }, [plan]);

  // Sends the natural command to the server-side orchestrator and stores the
  // returned dashboard plan. This is read-only.
  async function analyzePlan(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const nextCommand = command.trim();
    if (!nextCommand || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setExecutionPreview(null);
    setError(null);

    try {
      const response = await fetch("/api/assistant/shorts-orchestrator", {
        body: JSON.stringify({
          action: "analyze",
          command: nextCommand,
          mode: productionMode,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json() as { ok?: boolean; plan?: ShortsPlan; error?: string };

      if (!response.ok || !payload.ok || !payload.plan) {
        throw new Error(payload.error ?? "Analyse indisponible.");
      }

      setPlan(payload.plan);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Analyse indisponible.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Calls the future execution endpoint, which deliberately returns a dry-run
  // progress preview until per-step confirmations are implemented.
  async function executePlan() {
    if (!plan || isExecuting) {
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const response = await fetch("/api/assistant/shorts-orchestrator", {
        body: JSON.stringify({
          action: "execute",
          mode: productionMode,
          plan,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json() as ExecutionPreview & { error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Execution indisponible.");
      }

      setExecutionPreview(payload);
      if (payload.plan) {
        setPlan(payload.plan);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Execution indisponible.");
    } finally {
      setIsExecuting(false);
    }
  }

  // Validates the generated result from the drawer using existing endpoints.
  // It never publishes, never saves a schedule, and resumes the pipeline after
  // a successful validation by calling the already guarded execution endpoint.
  async function validateCurrentTarget() {
    if (!validationTarget || isValidating) {
      return;
    }

    const { draft, step } = validationTarget;
    const mediaActions: Partial<Record<TimelineStep["id"], string>> = {
      subtitles: "validate_subtitles",
      visuals: "validate_visuals",
      voice: "validate_voice",
    };
    const mediaAction = mediaActions[step.id];

    if (!mediaAction && step.id !== "video") {
      setError("Cette validation reste protegee par son module dedie.");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = step.id === "video"
        ? await fetch(`/api/content-workshop/drafts/${draft.id}/video-render`, {
            body: JSON.stringify({ action: "validate" }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          })
        : await fetch(`/api/content-workshop/drafts/${draft.id}/media`, {
            body: JSON.stringify({ action: mediaAction }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          });
      const payload = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Validation indisponible.");
      }

      setValidationTarget(null);
      await executePlan();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Validation indisponible.");
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <GlobalProgress percent={displayedPercent} stages={pipelineProgress.stages} />
          <WorkInProgressCard
            draftTitle={activeDraft?.title ?? plan?.objective ?? "Aucun objectif lance"}
            isBusy={isBusy}
            message={workingMessages[messageIndex]}
            percent={displayedPercent}
            stepLabel={activeStep?.label ?? (isAnalyzing ? "Analyse" : "En attente")}
            timeLabel={activeStep?.durationLabel ?? plan?.estimates.estimatedMinutesLabel ?? "1 min"}
          />
        </div>
      </section>

      {notifications.length ? (
        <section className="grid gap-2">
          {notifications.map(({ draft, step }) => (
            <div key={`${draft.id}-${step.id}`} className="flex flex-col gap-3 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-sm text-[#FDE68A] sm:flex-row sm:items-center sm:justify-between">
              <span>
                {step.label} prete pour <span className="font-semibold text-[#F8FAFC]">{draft.title}</span>. Validation en attente.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setValidationTarget({ draft, step })}
                  className="rounded-md border border-[#F59E0B]/45 bg-[#03070B] px-3 py-1.5 text-xs font-semibold text-[#FDE68A] transition hover:text-[#F8FAFC]"
                >
                  Examiner
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[#64748B]/40 bg-[#03070B] px-3 py-1.5 text-xs font-semibold text-[#CBD5E1] transition hover:text-[#F8FAFC]"
                >
                  Valider plus tard
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
        <form className="grid gap-4" onSubmit={analyzePlan}>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#F8FAFC]">Commande naturelle</span>
            <textarea
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              rows={3}
              className="min-h-24 resize-y rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3 text-sm leading-6 text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]/60"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(productionModeLabels) as ProductionMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setProductionMode(mode)}
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                  productionMode === mode
                    ? "border-[#39E6D0]/55 bg-[#39E6D0]/10 text-[#F8FAFC]"
                    : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:text-[#F8FAFC]"
                }`}
                title={productionModeLabels[mode].description}
              >
                Mode {productionModeLabels[mode].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setCommand(example)}
                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/45 hover:text-[#F8FAFC]"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAnalyzing ? "Analyse..." : "Analyser"}
            </button>
            <button
              type="button"
              disabled={!plan || isExecuting}
              onClick={() => void executePlan()}
              className="rounded-md border border-[#38BDF8]/50 bg-[#38BDF8]/10 px-4 py-2 text-sm font-semibold text-[#7DD3FC] transition hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExecuting ? "Execution..." : "Lancer le pipeline"}
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-4 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm font-semibold text-[#FDBA74]">
            {error}
          </p>
        ) : null}
      </section>

      {plan ? (
        <section className="grid gap-4">
          <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                  Plan genere
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                  Objectif : {plan.objective}
                </h2>
                <p className="mt-2 text-sm text-[#A7B0C0]">
                  {plan.dashboard.currentState}
                </p>
              </div>
              <span className="rounded-md border border-[#64748B]/35 bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#CBD5E1]">
                {plan.execution.mode}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Brouillons trouves" value={plan.stats.draftsFound} />
              <Metric label="Terminables" value={plan.stats.terminableDrafts} />
              <Metric label="Bloques" value={plan.stats.blockedDrafts} />
              <Metric label="Videos pretes" value={plan.stats.readyVideos} />
              <Metric label="Creneaux proposes" value={plan.stats.proposedScheduleSlots} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
              <h3 className="font-semibold text-[#F8FAFC]">Tableau de bord operationnel</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <DashboardPanel title="Blocages" items={plan.dashboard.blockers} tone="warning" />
                <DashboardPanel title="Plan propose" items={plan.dashboard.proposedPlan} tone="normal" />
              </div>
              <details className="mt-4 rounded-md border border-[#1D2A44] bg-[#08111A] p-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#39E6D0]">
                  Developper l&apos;analyse
                </summary>
                <div className="mt-3 grid gap-3 text-sm text-[#A7B0C0] lg:grid-cols-2">
                  <AnalysisList title="Sources utilisees" items={plan.detailedAnalysis.sourcesUsed} />
                  <AnalysisList title="Memoire utilisee" items={plan.detailedAnalysis.memoryUsed} />
                  <AnalysisList title="Raisonnement" items={plan.detailedAnalysis.reasoning} />
                  <AnalysisList title="Dependances" items={plan.detailedAnalysis.dependencies} />
                  <AnalysisList title="Risques" items={plan.detailedAnalysis.risks} />
                  <AnalysisList title="Justification" items={plan.detailedAnalysis.justification.slice(0, 12)} />
                </div>
              </details>
            </div>

            <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
              <h3 className="font-semibold text-[#F8FAFC]">Resume d&apos;execution</h3>
              <div className="mt-3 grid gap-2 text-sm">
                <EstimateLine label="Temps estime" value={plan.estimates.estimatedMinutesLabel} />
                <EstimateLine label="Actions" value={String(plan.estimates.actionsCount)} />
                <EstimateLine label="Cout total estime" value={compactCost(plan)} strong />
              </div>
            </div>
          </div>

          <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
            <h3 className="font-semibold text-[#F8FAFC]">Progression prevue</h3>
            <div className="mt-3 grid gap-2">
              {plan.workflowSteps.map((step, index) => (
                <div key={step.id} className="grid gap-2 rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3 text-sm text-[#A7B0C0] md:grid-cols-[90px_1fr_120px_120px]">
                  <span className="font-semibold text-[#64748B]">Etape {index + 1}/{plan.workflowSteps.length}</span>
                  <span className="font-semibold text-[#F8FAFC]">{step.title}</span>
                  <span>{step.actionCount} action(s)</span>
                  <span className={step.requiresExplicitConfirmation ? "text-[#FDBA74]" : "text-[#86EFAC]"}>
                    {step.requiresExplicitConfirmation ? "controle humain" : "automatisable"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
              <h3 className="font-semibold text-[#F8FAFC]">Actions proposees</h3>
              <div className="mt-3 grid gap-3">
                {groupedActions.length ? groupedActions.map(([kind, actions]) => (
                  <div key={kind} className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3">
                    <p className="text-sm font-semibold text-[#39E6D0]">{formatActionKind(kind)}</p>
                    <ol className="mt-2 grid gap-2">
                      {actions.map((action, index) => (
                        <li key={`${kind}-${action.draftId ?? "global"}-${index}`} className="text-sm leading-6 text-[#A7B0C0]">
                          <span className="font-semibold text-[#F8FAFC]">{action.draftTitle ?? "Global"}</span>
                          <span className="text-[#64748B]"> - </span>
                          {action.label}
                          {action.sensitive ? (
                            <span className={`ml-2 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                              action.requiresExplicitConfirmation
                                ? "border-[#F97316]/35 bg-[#F97316]/10 text-[#FDBA74]"
                                : "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]"
                            }`}>
                              {validationModeLabel(action.autoValidation, action.requiresExplicitConfirmation ? "confirmation" : "auto-validation")}
                            </span>
                          ) : null}
                          {action.route ? (
                            <Link className="ml-2 text-xs font-semibold text-[#7DD3FC] hover:text-[#F8FAFC]" href={action.route}>
                              Voir
                            </Link>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                )) : (
                  <p className="text-sm text-[#A7B0C0]">Aucune action proposee.</p>
                )}
              </div>
            </div>

            <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
              <h3 className="font-semibold text-[#F8FAFC]">Garde-fous</h3>
              <ul className="mt-3 grid gap-2 text-sm text-[#A7B0C0]">
                {plan.guardrails.map((guardrail) => (
                  <li key={guardrail} className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
                    {guardrail}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <details className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[#39E6D0]">
              Informations techniques
            </summary>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="grid gap-2 text-sm">
                <EstimateLine label="OpenAI" value={formatCost(plan.estimates.openaiCostEur)} />
                <EstimateLine label="ElevenLabs" value={formatCost(plan.estimates.elevenLabsCostEur)} />
                <EstimateLine label="Railway" value={formatCost(plan.estimates.railwayCostEur)} />
                <EstimateLine label="Total" value={formatCost(plan.estimates.totalCostEur)} strong />
                <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs leading-5 text-[#64748B]">
                  {plan.estimates.notes.join(" ")}
                </p>
              </div>
              <div className="grid gap-2 text-sm text-[#A7B0C0]">
                {(executionPreview?.logs ?? []).length ? executionPreview?.logs?.map((log, index) => (
                  <div key={`${log.action}-${log.draftId ?? "global"}-${index}`} className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
                    <span className="font-semibold text-[#F8FAFC]">{formatActionKind(log.action)}</span>
                    <span className="text-[#64748B]"> - </span>
                    {log.message}
                  </div>
                )) : (
                  <div className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
                    Aucun log d&apos;execution pour le moment.
                  </div>
                )}
              </div>
            </div>
          </details>

          {plan.scheduleProposals.length ? (
            <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
              <h3 className="font-semibold text-[#F8FAFC]">Planning propose</h3>
              <div className="mt-3 grid gap-2">
                {plan.scheduleProposals.map((proposal) => (
                  <div
                    key={`${proposal.draftId}-${proposal.platform}-${proposal.scheduledAt}`}
                    className="grid gap-2 rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3 text-sm text-[#A7B0C0] md:grid-cols-[1fr_150px_190px]"
                  >
                    <span className="font-semibold text-[#F8FAFC]">{proposal.draftTitle}</span>
                    <span>{platformLabels[proposal.platform]}</span>
                    <span>{formatDateTime(proposal.scheduledAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
            <h3 className="font-semibold text-[#F8FAFC]">Brouillons analyses</h3>
            <div className="mt-3 grid gap-3">
              {plan.drafts.map((draft) => (
                <div key={draft.id} className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold text-[#F8FAFC]">{draft.title}</p>
                      <p className="mt-1 text-xs text-[#64748B]">{draft.status} - {draft.workflow.nextStep}</p>
                    </div>
                    {draft.nextAction ? (
                      <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-2 py-1 text-xs font-semibold text-[#39E6D0]">
                        {draft.nextAction.kind}
                      </span>
                    ) : null}
                  </div>
                  <DraftTimeline draft={draft} steps={draft.timeline} onInspect={(step) => setValidationTarget({ draft, step })} />
                  {draft.blockedReasons.length ? (
                    <p className="mt-3 text-sm text-[#FDBA74]">
                      {draft.blockedReasons.join(" ; ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {executionPreview ? (
        <section className="rounded-md border border-[#38BDF8]/35 bg-[#38BDF8]/10 p-4">
          <h3 className="font-semibold text-[#F8FAFC]">Derniere action</h3>
          <p className="mt-2 text-sm text-[#A7B0C0]">{executionPreview.message}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#03070B]">
            <div
              className="h-full bg-[#39E6D0] transition-all duration-700"
              style={{ width: `${executionPreview.progress.percent}%` }}
            />
          </div>
          <div className="mt-3 grid gap-2">
            {executionPreview.progress.steps.map((step, index) => (
              <div key={`${step.title}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm">
                <span className="text-[#F8FAFC]">{step.title}</span>
                <span className={step.status === "blocked" ? "text-[#FDBA74]" : "text-[#A7B0C0]"}>
                  {step.status}
                </span>
              </div>
            ))}
          </div>
          {executionPreview.logs?.length ? (
            <div className="mt-4 grid gap-2">
              {executionPreview.logs.map((log, index) => (
                <div
                  key={`${log.action}-${log.draftId ?? "global"}-${index}`}
                  className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#F8FAFC]">{log.draftTitle ?? "Global"}</span>
                    <span className={log.result === "success" ? "text-[#86EFAC]" : "text-[#FDBA74]"}>
                      {log.autoValidated ? "auto-valide" : log.result}
                    </span>
                  </div>
                  <p className="mt-1 text-[#A7B0C0]">{log.message}</p>
                  {log.blockedReason ? (
                    <p className="mt-1 text-[#FDBA74]">Validation humaine requise : {log.blockedReason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {executionPreview.blockedActions.length ? (
            <p className="mt-3 text-sm text-[#FDBA74]">
              Prochain arret : {executionPreview.blockedActions.slice(0, 3).join(" ; ")}
            </p>
          ) : null}
          <p className="mt-3 text-sm font-semibold text-[#7DD3FC]">
            {executionPreview.nextImplementationStep}
          </p>
        </section>
      ) : null}

      {validationTarget ? (
        <ValidationDrawer
          isValidating={isValidating}
          target={validationTarget}
          onClose={() => setValidationTarget(null)}
          onValidate={() => void validateCurrentTarget()}
        />
      ) : null}
    </div>
  );
}

function GlobalProgress({ percent, stages }: { percent: number; stages: PipelineStage[] }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">Pipeline Shorts</p>
          <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">Progression globale</h2>
        </div>
        <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
          {percent} %
        </span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#08111A]">
        <div
          className="h-full rounded-full bg-[#39E6D0] transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`rounded-md border px-3 py-2 text-sm transition ${
              stage.state === "done"
                ? "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]"
                : stage.state === "active"
                  ? "border-[#39E6D0]/45 bg-[#39E6D0]/10 text-[#39E6D0]"
                  : stage.state === "waiting"
                    ? "border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#FDE68A]"
                    : stage.state === "blocked"
                      ? "border-[#F97316]/35 bg-[#F97316]/10 text-[#FDBA74]"
                      : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0]"
            }`}
          >
            <span className={stage.state === "active" ? "mr-2 inline-block animate-pulse" : "mr-2"}>
              {stageMark(stage.state)}
            </span>
            {stage.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkInProgressCard({
  draftTitle,
  isBusy,
  message,
  percent,
  stepLabel,
  timeLabel,
}: {
  draftTitle: string;
  isBusy: boolean;
  message: string;
  percent: number;
  stepLabel: string;
  timeLabel: string;
}) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
      <p className="text-sm font-semibold text-[#F8FAFC]">Atelier IA</p>
      <p className="mt-3 text-sm text-[#A7B0C0]">Je travaille actuellement sur :</p>
      <p className="mt-1 font-semibold text-[#F8FAFC]">{draftTitle}</p>
      <div className="mt-4 grid gap-2 text-sm">
        <EstimateLine label="Etape" value={stepLabel} />
        <EstimateLine label="Temps restant" value={isBusy ? "moins de 1 min" : timeLabel} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#03070B]">
        <div
          className="h-full rounded-full bg-[#38BDF8] transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={`mt-3 text-sm ${isBusy ? "text-[#7DD3FC]" : "text-[#64748B]"}`}>
        {isBusy ? message : "Pret a reprendre le pipeline."}
      </p>
    </div>
  );
}

// Compact metric card used in the dashboard summary.
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#F8FAFC]">{value}</p>
    </div>
  );
}

// Renders compact dashboard lists; details stay collapsed elsewhere.
function DashboardPanel({
  items,
  title,
  tone,
}: {
  items: string[];
  title: string;
  tone: "normal" | "warning";
}) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-3">
      <p className={`text-sm font-semibold ${tone === "warning" ? "text-[#FDBA74]" : "text-[#39E6D0]"}`}>
        {title}
      </p>
      <ul className="mt-2 grid gap-1 text-sm leading-6 text-[#A7B0C0]">
        {items.slice(0, 6).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// Displays detailed analysis blocks inside the collapsed analysis drawer.
function AnalysisList({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
      <p className="font-semibold text-[#F8FAFC]">{title}</p>
      <ul className="mt-2 grid gap-1 leading-6">
        {items.length ? items.map((item) => (
          <li key={item}>{item}</li>
        )) : (
          <li>Aucun element.</li>
        )}
      </ul>
    </div>
  );
}

// Displays the production timeline for one draft. Validation happens in the
// Pilotage IA drawer so the operator does not leave the cockpit.
function DraftTimeline({
  onInspect,
  steps,
}: {
  draft: DraftSummary;
  onInspect: (step: TimelineStep) => void;
  steps: TimelineStep[];
}) {
  return (
    <div className="mt-3 grid gap-2">
      {steps.map((step) => (
        <div
          key={step.id}
          className="grid gap-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3 text-sm md:grid-cols-[minmax(0,1fr)_150px_110px_130px]"
        >
          <div>
            <p className="font-semibold text-[#F8FAFC]">✓ {step.label}</p>
            {step.autoValidation ? (
              <p className={`mt-1 text-xs font-semibold ${
                step.autoValidation.autoValidated ? "text-[#86EFAC]" : "text-[#FDBA74]"
              }`}>
                {validationModeLabel(step.autoValidation, "Validation")}
              </p>
            ) : null}
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">{step.detail}</p>
          </div>
          <span className={`h-fit rounded-md border px-2 py-1 text-xs font-semibold ${timelineTone(step.state)}`}>
            {formatTimelineState(step.state)}
          </span>
          <div className="text-xs leading-5 text-[#A7B0C0]">
            <p>{step.durationLabel}</p>
            <p>{formatCost(step.costEstimate?.estimatedCostEur ?? null)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {step.canOpen ? (
              <button
                type="button"
                onClick={() => onInspect(step)}
                className="rounded-md border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-3 py-1.5 text-xs font-semibold text-[#7DD3FC] transition hover:text-[#F8FAFC]"
              >
                {step.canValidate && !step.autoValidation?.autoValidated ? "Examiner" : "Voir"}
              </button>
            ) : null}
            {step.canValidate && !step.autoValidation?.autoValidated ? (
              <button
                type="button"
                onClick={() => onInspect(step)}
                className="rounded-md border border-[#F59E0B]/45 bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-semibold text-[#FCD34D] transition hover:text-[#F8FAFC]"
              >
                Valider
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ValidationDrawer({
  isValidating,
  onClose,
  onValidate,
  target,
}: {
  isValidating: boolean;
  onClose: () => void;
  onValidate: () => void;
  target: ValidationTarget;
}) {
  const canValidateInline = target.step.id === "visuals" ||
    target.step.id === "voice" ||
    target.step.id === "subtitles" ||
    target.step.id === "video";
  const [media, setMedia] = useState<DrawerMediaState | null>(null);
  const [video, setVideo] = useState<DrawerVideoState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const visualScenes = media?.visualScenes?.filter((scene) => Boolean(scene.imageUrl)) ?? [];
  const selectedAssets = visualScenes.length > 0 ? [] : (media?.selectedAssets?.filter((asset) => Boolean(asset.publicUrl)) ?? []);
  const suggestedAssets = visualScenes.length > 0 || selectedAssets.length > 0 ? [] : (media?.suggestedAssets ?? []).slice(0, 20);
  const selectedVisualScene = visualScenes[selectedIndex] ?? visualScenes[0] ?? null;
  const selectedAsset = selectedAssets[selectedIndex] ?? selectedAssets[0] ?? null;
  const currentProgress = activeAction
    ? Math.min(92, 24 + ((selectedIndex + 1) * 12))
    : target.step.state === "done"
      ? 100
      : 62;

  const loadDrawerState = useCallback(async () => {
    setIsLoading(true);
    setDrawerError(null);

    try {
      const mediaResponse = await fetch(`/api/content-workshop/drafts/${target.draft.id}/media`);
      const mediaPayload = await mediaResponse.json() as { media?: DrawerMediaState; error?: string };

      if (!mediaResponse.ok) {
        throw new Error(mediaPayload.error ?? "Chargement du resultat indisponible.");
      }

      let nextMedia = mediaPayload.media ?? null;
      const linkedVisualsCount =
        (nextMedia?.visualScenes?.filter((scene) => Boolean(scene.imageUrl)).length ?? 0) +
        (nextMedia?.selectedAssets?.filter((asset) => Boolean(asset.publicUrl)).length ?? 0);

      if (target.step.id === "visuals" && linkedVisualsCount === 0) {
        const suggestionsResponse = await fetch(`/api/content-workshop/drafts/${target.draft.id}/media?suggestions=1`);
        const suggestionsPayload = await suggestionsResponse.json() as { media?: DrawerMediaState; error?: string };

        if (!suggestionsResponse.ok) {
          throw new Error(suggestionsPayload.error ?? "Recherche bibliotheque indisponible.");
        }

        nextMedia = suggestionsPayload.media ?? nextMedia;
      }

      setMedia(nextMedia);
      console.info("[Pilotage IA Visual Drawer] loaded", {
        draft_id: target.draft.id,
        library_results: nextMedia?.suggestedAssets?.length ?? 0,
        linked_visuals: linkedVisualsCount,
        method: linkedVisualsCount > 0 ? "atelier_media_state" : "atelier_library_suggestions",
        visual_status: target.draft.workflow.visuals,
      });

      if (target.step.id === "video") {
        const videoResponse = await fetch(`/api/content-workshop/drafts/${target.draft.id}/video-render`);
        const videoPayload = await videoResponse.json() as { videoRender?: DrawerVideoState; error?: string };

        if (!videoResponse.ok) {
          throw new Error(videoPayload.error ?? "Chargement video indisponible.");
        }

        setVideo(videoPayload.videoRender ?? null);
      }
    } catch (error) {
      setDrawerError(error instanceof Error ? error.message : "Chargement indisponible.");
    } finally {
      setIsLoading(false);
    }
  }, [target.draft.id, target.draft.workflow.visuals, target.step.id]);

  async function runMediaAction(action: string, extra: Record<string, unknown> = {}) {
    setActiveAction(action);
    setDrawerError(null);

    try {
      const requestPayload = { action, ...extra };
      console.info("[Pilotage IA Visual Drawer] API call", {
        draft_id: target.draft.id,
        endpoint: `/api/content-workshop/drafts/${target.draft.id}/media`,
        payload: requestPayload,
      });
      const response = await fetch(`/api/content-workshop/drafts/${target.draft.id}/media`, {
        body: JSON.stringify(requestPayload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json() as { media?: DrawerMediaState; error?: string };
      console.info("[Pilotage IA Visual Drawer] API response", {
        draft_id: target.draft.id,
        endpoint: `/api/content-workshop/drafts/${target.draft.id}/media`,
        ok: response.ok,
        response: payload,
      });

      if (!response.ok) {
        throw new Error(payload.error ?? "Action indisponible.");
      }

      setMedia(payload.media ?? null);
      setSelectedIndex(0);
      await loadDrawerState();
    } catch (error) {
      setDrawerError(error instanceof Error ? error.message : "Action indisponible.");
    } finally {
      setActiveAction(null);
    }
  }

  async function runVideoAction(action: "start" | "validate") {
    setActiveAction(action);
    setDrawerError(null);

    try {
      const response = await fetch(`/api/content-workshop/drafts/${target.draft.id}/video-render`, {
        body: JSON.stringify({ action }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json() as { videoRender?: DrawerVideoState; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Action video indisponible.");
      }

      setVideo(payload.videoRender ?? null);
      await loadDrawerState();
    } catch (error) {
      setDrawerError(error instanceof Error ? error.message : "Action video indisponible.");
    } finally {
      setActiveAction(null);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDrawerState();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadDrawerState]);

  return (
    <div className="fixed inset-0 z-50 bg-[#020617]/70 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-[#1D2A44] bg-[#03070B] shadow-2xl">
        <div className="border-b border-[#1D2A44] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">Validation</p>
              <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">{target.step.label}</h2>
              <p className="mt-2 text-sm text-[#A7B0C0]">{target.draft.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? <GenerationProgress label="Chargement du resultat..." percent={42} /> : null}
          {activeAction ? <GenerationProgress label={generationLabel(activeAction, selectedIndex, Math.max(visualScenes.length + selectedAssets.length, 1))} percent={currentProgress} /> : null}
          {drawerError ? (
            <p className="rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm text-[#FDBA74]">{drawerError}</p>
          ) : null}
          {target.step.id === "visuals" ? (
            <VisualValidationBody
              activeAction={activeAction}
              media={media}
              selectedAsset={selectedAsset}
              selectedVisualScene={selectedVisualScene}
              selectedAssets={selectedAssets}
              suggestedAssets={suggestedAssets}
              visualScenes={visualScenes}
              onGenerate={() => void runMediaAction("request_visual_generation")}
              onNext={() => setSelectedIndex((value) => Math.min(Math.max(0, visualScenes.length + selectedAssets.length - 1), value + 1))}
              onPrevious={() => setSelectedIndex((value) => Math.max(0, value - 1))}
              onRefreshLibrary={() => void runMediaAction("refresh_suggestions")}
              onRegenerate={() => void runMediaAction("regenerate_scene", { sceneIndex: selectedVisualScene?.visualPromptIndex ?? selectedAsset?.usageOrder ?? 1 })}
              onUseLibrary={() => void runMediaAction("prepare_media")}
            />
          ) : null}
          {target.step.id === "voice" ? (
            <VoiceValidationBody voice={media?.voice ?? null} onGenerate={() => void runMediaAction("generate_voice")} />
          ) : null}
          {target.step.id === "subtitles" ? (
            <SubtitlesValidationBody subtitles={media?.subtitles ?? null} onGenerate={() => void runMediaAction("generate_subtitles")} />
          ) : null}
          {target.step.id === "video" ? (
            <VideoValidationBody video={video} onGenerate={() => void runVideoAction("start")} />
          ) : null}
          {target.step.id === "planning" || target.step.id === "publication" ? (
            <ProtectedValidationBody detail={target.step.detail} />
          ) : null}
        </div>

        <div className="border-t border-[#1D2A44] p-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => target.step.id === "visuals" && (selectedVisualScene || selectedAsset)
                ? void runMediaAction("regenerate_scene", { sceneIndex: selectedVisualScene?.visualPromptIndex ?? selectedAsset?.usageOrder ?? 1 })
                : target.step.id === "voice"
                  ? void runMediaAction("regenerate_voice")
                  : target.step.id === "subtitles"
                    ? void runMediaAction("regenerate_subtitles")
                    : target.step.id === "video"
                      ? void runVideoAction("start")
                      : undefined}
              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
            >
              Regenerer
            </button>
            <button
              type="button"
              disabled
              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
            >
              Modifier le prompt
            </button>
            <button
              type="button"
              disabled={!canValidateInline || isValidating}
              onClick={onValidate}
              className="rounded-md border border-[#39E6D0]/55 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isValidating ? "Validation..." : canValidateInline ? "Valider et reprendre" : "Validation protegee"}
            </button>
          </div>
          {!canValidateInline ? (
            <p className="mt-3 text-xs leading-5 text-[#FDBA74]">
              Cette etape reste volontairement protegee par les garde-fous existants.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function generationLabel(action: string, index: number, total: number) {
  if (action.includes("visual")) return `Generation image ${Math.min(index + 1, total)} / ${total}`;
  if (action.includes("voice")) return "Creation des voix...";
  if (action.includes("subtitle")) return "Synchronisation des sous-titres...";
  if (action === "start") return "Preparation de la video...";
  return "Creation des prompts...";
}

function GenerationProgress({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="mb-4 rounded-md border border-[#38BDF8]/35 bg-[#38BDF8]/10 p-4">
      <p className="font-semibold text-[#F8FAFC]">{label}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#03070B]">
        <div className="h-full rounded-full bg-[#38BDF8] transition-all duration-700" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-[#7DD3FC]">Temps restant estime : moins de 1 min</p>
    </div>
  );
}

function VisualValidationBody({
  activeAction,
  media,
  onGenerate,
  onNext,
  onPrevious,
  onRefreshLibrary,
  onRegenerate,
  onUseLibrary,
  selectedAsset,
  selectedAssets,
  selectedVisualScene,
  suggestedAssets,
  visualScenes,
}: {
  activeAction: string | null;
  media: DrawerMediaState | null;
  onGenerate: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onRefreshLibrary: () => void;
  onRegenerate: () => void;
  onUseLibrary: () => void;
  selectedAsset: DrawerVisualAsset | null;
  selectedAssets: DrawerVisualAsset[];
  selectedVisualScene: DrawerVisualScene | null;
  suggestedAssets: DrawerVisualAsset[];
  visualScenes: DrawerVisualScene[];
}) {
  const isGeneratingVisuals = activeAction === "request_visual_generation";
  const isUsingLibrary = activeAction === "prepare_media";
  const hasDraftVisuals = visualScenes.length > 0 || selectedAssets.length > 0;

  if (hasDraftVisuals) {
    const scene = selectedVisualScene;
    const asset = scene ? null : selectedAsset;
    const imageUrl = scene?.imageUrl ?? asset?.publicUrl ?? null;
    const prompt = scene?.visualPromptText ??
      (typeof asset?.metadata?.prompt === "string" ? asset.metadata.prompt : asset?.fileName) ??
      "Prompt non disponible";
    const sceneIndex = scene?.visualPromptIndex ?? asset?.usageOrder ?? 1;
    const score = scene?.scoreTotal ?? asset?.score ?? null;
    const status = scene?.generationStatus ?? "selectionne";
    const source = scene?.generationSource ?? asset?.assetSource ?? "atelier";

    return (
      <div className="grid gap-4">
        <p className="rounded-md border border-[#39E6D0]/30 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
          Visuels deja prets - validation disponible.
        </p>
        <div className="overflow-hidden rounded-md border border-[#1D2A44] bg-[#08111A]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={prompt} className="aspect-video w-full object-cover" src={imageUrl} />
          ) : null}
          <div className="grid gap-2 p-4 text-sm text-[#A7B0C0]">
            <p className="font-semibold text-[#F8FAFC]">Visuel {sceneIndex} / scene {sceneIndex}</p>
            <p>{prompt}</p>
            <p>Score IA : {formatVisualScore(score)}</p>
            <p>Statut : {status}</p>
            <p>Source : {source}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPrevious} className="rounded-md border border-[#1D2A44] px-3 py-2 text-sm font-semibold text-[#A7B0C0]">Precedent</button>
          <button type="button" onClick={onNext} className="rounded-md border border-[#1D2A44] px-3 py-2 text-sm font-semibold text-[#A7B0C0]">Suivant</button>
          <button type="button" onClick={onRegenerate} className="rounded-md border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-3 py-2 text-sm font-semibold text-[#7DD3FC]">Regenerer cette image</button>
          {imageUrl ? (
            <a className="rounded-md border border-[#1D2A44] px-3 py-2 text-sm font-semibold text-[#A7B0C0]" href={imageUrl} rel="noreferrer" target="_blank">
              Plein ecran
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (suggestedAssets.length > 0) {
    return (
      <div className="grid gap-4">
        <div className="rounded-md border border-[#39E6D0]/30 bg-[#39E6D0]/10 p-4 text-sm text-[#A7B0C0]">
          {suggestedAssets.length} visuels compatibles trouves dans votre bibliotheque.
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {suggestedAssets.slice(0, 6).map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-md border border-[#1D2A44] bg-[#08111A]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={asset.fileName ?? "Visuel bibliotheque"} className="aspect-video w-full object-cover" src={asset.publicUrl} />
              <p className="p-3 text-xs text-[#A7B0C0]">Score de compatibilite : {formatVisualScore(asset.score)}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(activeAction)}
            onClick={onUseLibrary}
            className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUsingLibrary ? "Selection..." : "Utiliser ces visuels"}
          </button>
          <button
            type="button"
            disabled={Boolean(activeAction)}
            onClick={onGenerate}
            className="rounded-md border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-3 py-2 text-sm font-semibold text-[#7DD3FC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingVisuals ? "Generation..." : "Generer de nouveaux visuels"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
      <p className="font-semibold text-[#F8FAFC]">Aucun visuel disponible.</p>
      <p className="text-sm text-[#A7B0C0]">{media?.visualDecision?.reason ?? "Voulez-vous les generer maintenant ?"}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onRefreshLibrary} className="rounded-md border border-[#1D2A44] px-3 py-2 text-sm font-semibold text-[#A7B0C0]">Rechercher dans la bibliotheque</button>
        <button
          type="button"
          disabled={Boolean(activeAction)}
          onClick={onGenerate}
          className="rounded-md border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-3 py-2 text-sm font-semibold text-[#7DD3FC] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGeneratingVisuals ? "Generation..." : "Generer les visuels maintenant"}
        </button>
      </div>
    </div>
  );
}

function VoiceValidationBody({ onGenerate, voice }: { onGenerate: () => void; voice: DrawerVoiceState | null }) {
  if (voice?.audioUrl) {
    return (
      <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
        <p className="font-semibold text-[#F8FAFC]">Voix generee</p>
        <p className="mt-1 text-sm text-[#A7B0C0]">{voice.selectedVoiceLabel ?? "Voix selectionnee"} - {voice.status}</p>
        <audio className="mt-4 w-full" controls src={voice.audioUrl} />
      </div>
    );
  }

  return <EmptyGenerationCard label="Aucune voix disponible." onGenerate={onGenerate} />;
}

function SubtitlesValidationBody({ onGenerate, subtitles }: { onGenerate: () => void; subtitles: DrawerSubtitleState | null }) {
  if (subtitles?.segmentsCount || subtitles?.previewSegments?.length) {
    return (
      <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
        <p className="font-semibold text-[#F8FAFC]">Sous-titres generes</p>
        <p className="mt-1 text-sm text-[#A7B0C0]">{subtitles.segmentsCount ?? subtitles.previewSegments?.length ?? 0} segment(s) - {subtitles.status}</p>
        <div className="mt-4 grid gap-2">
          {(subtitles.previewSegments ?? []).slice(0, 8).map((segment, index) => (
            <p key={`${segment.start}-${index}`} className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#A7B0C0]">
              {segment.text}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyGenerationCard label="Aucun sous-titre disponible." onGenerate={onGenerate} />;
}

function VideoValidationBody({ onGenerate, video }: { onGenerate: () => void; video: DrawerVideoState | null }) {
  if (video?.outputUrl) {
    return (
      <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
        <p className="font-semibold text-[#F8FAFC]">Video generee</p>
        <p className="mt-1 text-sm text-[#A7B0C0]">{video.status} - {video.videoValidated ? "validee" : "a valider"}</p>
        <video className="mt-4 aspect-video w-full rounded-md bg-black" controls src={video.outputUrl} />
      </div>
    );
  }

  return <EmptyGenerationCard label="Aucune video finale disponible." onGenerate={onGenerate} />;
}

function ProtectedValidationBody({ detail }: { detail: string }) {
  return (
    <div className="rounded-md border border-[#F59E0B]/35 bg-[#F59E0B]/10 p-4">
      <p className="font-semibold text-[#F8FAFC]">Validation protegee</p>
      <p className="mt-2 text-sm text-[#FDE68A]">{detail}</p>
    </div>
  );
}

function EmptyGenerationCard({ label, onGenerate }: { label: string; onGenerate: () => void }) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
      <p className="font-semibold text-[#F8FAFC]">{label}</p>
      <p className="mt-2 text-sm text-[#A7B0C0]">Voulez-vous lancer la generation maintenant ?</p>
      <button type="button" onClick={onGenerate} className="mt-4 rounded-md border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-3 py-2 text-sm font-semibold text-[#7DD3FC]">
        Generer maintenant
      </button>
    </div>
  );
}

// Displays one cost/time estimate row with optional emphasis for totals.
function EstimateLine({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
      <span className="text-[#A7B0C0]">{label}</span>
      <span className={strong ? "font-semibold text-[#F8FAFC]" : "font-semibold text-[#CBD5E1]"}>
        {value}
      </span>
    </div>
  );
}
