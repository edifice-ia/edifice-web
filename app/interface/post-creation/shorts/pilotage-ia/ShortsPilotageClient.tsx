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
  drafts: DraftSummary[];
  actions: PlanAction[];
  scheduleProposals: ScheduleProposal[];
  blockedDrafts: DraftSummary[];
  warnings: string[];
  execution: {
    mode: "plan_only";
    summary: string;
    blockedActions: string[];
  };
};

type ExecutionPreview = {
  ok: true;
  executed: false;
  message: string;
  blockedActions: string[];
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "validated" || status === "ready") {
    return "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]";
  }
  if (status === "error") {
    return "border-[#F97316]/35 bg-[#F97316]/10 text-[#FDBA74]";
  }
  if (status === "generating" || status === "in_progress") {
    return "border-[#39E6D0]/35 bg-[#39E6D0]/10 text-[#39E6D0]";
  }
  return "border-[#64748B]/35 bg-[#64748B]/10 text-[#CBD5E1]";
}

export function ShortsPilotageClient() {
  const [command, setCommand] = useState(examples[0]);
  const [plan, setPlan] = useState<ShortsPlan | null>(null);
  const [executionPreview, setExecutionPreview] = useState<ExecutionPreview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedActions = useMemo(() => {
    const groups = new Map<ActionKind, PlanAction[]>();
    plan?.actions.forEach((action) => {
      groups.set(action.kind, [...(groups.get(action.kind) ?? []), action]);
    });
    return [...groups.entries()];
  }, [plan]);

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
              {isExecuting ? "Verification..." : "Executer le plan"}
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
                  {plan.execution.summary}
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
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {(["text", "visuals", "voice", "subtitles", "video", "readyToPublish"] as const).map((step) => (
                      <span key={step} className={`rounded-md border px-2 py-1 ${statusTone(draft.workflow[step])}`}>
                        {step}: {draft.workflow[step]}
                      </span>
                    ))}
                  </div>
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
          <p className="mt-3 text-sm font-semibold text-[#7DD3FC]">
            {executionPreview.nextImplementationStep}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#F8FAFC]">{value}</p>
    </div>
  );
}
