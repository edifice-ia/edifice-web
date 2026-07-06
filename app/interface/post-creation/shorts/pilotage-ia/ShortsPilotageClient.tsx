"use client";

import { useMemo, useState } from "react";
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

type TimelineStep = {
  id: "visuals" | "voice" | "subtitles" | "video" | "planning" | "publication";
  label: string;
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
    draftId?: string;
    draftTitle?: string;
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

// Main client component for Pilotage IA. It can start safe generation runs, but
// scheduling, publication and destructive actions stay behind dedicated screens.
export function ShortsPilotageClient() {
  const [command, setCommand] = useState(examples[0]);
  const [productionMode, setProductionMode] = useState<ProductionMode>("assisted");
  const [plan, setPlan] = useState<ShortsPlan | null>(null);
  const [executionPreview, setExecutionPreview] = useState<ExecutionPreview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="grid gap-6">
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
              <h3 className="font-semibold text-[#F8FAFC]">Temps et cout</h3>
              <div className="mt-3 grid gap-2 text-sm">
                <EstimateLine label="Temps estime" value={plan.estimates.estimatedMinutesLabel} />
                <EstimateLine label="Actions" value={String(plan.estimates.actionsCount)} />
                <EstimateLine label="OpenAI" value={formatCost(plan.estimates.openaiCostEur)} />
                <EstimateLine label="ElevenLabs" value={formatCost(plan.estimates.elevenLabsCostEur)} />
                <EstimateLine label="Railway" value={formatCost(plan.estimates.railwayCostEur)} />
                <EstimateLine label="Total" value={formatCost(plan.estimates.totalCostEur)} strong />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#64748B]">
                {plan.estimates.notes.join(" ")}
              </p>
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
                  <span className={step.sensitive ? "text-[#FDBA74]" : "text-[#86EFAC]"}>
                    {step.sensitive ? "validation" : "preparable"}
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
                    <p className="text-sm font-semibold text-[#39E6D0]">{kind}</p>
                    <ol className="mt-2 grid gap-2">
                      {actions.map((action, index) => (
                        <li key={`${kind}-${action.draftId ?? "global"}-${index}`} className="text-sm leading-6 text-[#A7B0C0]">
                          <span className="font-semibold text-[#F8FAFC]">{action.draftTitle ?? "Global"}</span>
                          <span className="text-[#64748B]"> - </span>
                          {action.label}
                          {action.costEstimate ? (
                            <span className="ml-2 text-xs text-[#64748B]">
                              {action.costEstimate.provider} {formatCost(action.costEstimate.estimatedCostEur)}
                            </span>
                          ) : null}
                          {action.sensitive ? (
                            <span className="ml-2 rounded-md border border-[#F97316]/35 bg-[#F97316]/10 px-2 py-0.5 text-xs font-semibold text-[#FDBA74]">
                              confirmation
                            </span>
                          ) : null}
                          {action.route ? (
                            <Link className="ml-2 text-xs font-semibold text-[#7DD3FC] hover:text-[#F8FAFC]" href={action.route}>
                              ouvrir
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
                  <DraftTimeline steps={draft.timeline} />
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
          <h3 className="font-semibold text-[#F8FAFC]">Execution V1</h3>
          <p className="mt-2 text-sm text-[#A7B0C0]">{executionPreview.message}</p>
          {executionPreview.logs?.length ? (
            <div className="mt-3 grid gap-2">
              {executionPreview.logs.map((log, index) => (
                <div key={`${log.action}-${log.draftId ?? "global"}-${index}`} className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#A7B0C0]">
                  <span className="font-semibold text-[#F8FAFC]">{log.draftTitle ?? "Global"}</span>
                  <span className="text-[#64748B]"> - </span>
                  {log.message}
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#03070B]">
            <div
              className="h-full bg-[#39E6D0]"
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
          <p className="mt-3 text-sm font-semibold text-[#7DD3FC]">
            {executionPreview.nextImplementationStep}
          </p>
        </section>
      ) : null}
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

// Displays the production timeline for one draft. Validation buttons only point
// to the dedicated module; they never confirm sensitive actions inline.
function DraftTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="mt-3 grid gap-2">
      {steps.map((step) => (
        <div
          key={step.id}
          className="grid gap-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3 text-sm md:grid-cols-[minmax(0,1fr)_150px_110px_130px]"
        >
          <div>
            <p className="font-semibold text-[#F8FAFC]">✓ {step.label}</p>
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
              <Link
                className="rounded-md border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-3 py-1.5 text-xs font-semibold text-[#7DD3FC] transition hover:text-[#F8FAFC]"
                href={step.route}
              >
                Ouvrir
              </Link>
            ) : null}
            {step.canValidate ? (
              <Link
                className="rounded-md border border-[#F59E0B]/45 bg-[#F59E0B]/10 px-3 py-1.5 text-xs font-semibold text-[#FCD34D] transition hover:text-[#F8FAFC]"
                href={step.route}
              >
                Valider
              </Link>
            ) : null}
          </div>
        </div>
      ))}
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
