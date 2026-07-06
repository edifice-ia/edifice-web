"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProjectMemoryPanel } from "./ProjectMemoryPanel";
import { ProjectMemorySnapshotControl } from "./ProjectMemorySnapshotControl";
import { SafetyModeBadge } from "./SafetyModeBadge";
import { SectionContainer } from "./SectionContainer";
import { StatusBadge } from "./StatusBadge";
import {
  projectMemoryForAssistant,
  projectStatusOverview,
} from "@/lib/cockpit/observatory";
import type { ProjectContext } from "@/types/cockpit";

type AssistantContext = "Projet" | "Interieur" | "Equilibre";

type WorkflowActionStatus = "pending" | "running" | "success" | "failed" | "skipped";

type WorkflowAction = {
  id: string;
  type: string;
  human_label: string;
  label: string;
  draft_id: string | null;
  draft_title: string | null;
  status: WorkflowActionStatus;
  estimated_time_seconds: number;
  estimated_cost: {
    estimatedCostEur: number | null;
    provider: string;
  } | null;
  requires_confirmation: boolean;
  is_sensitive: boolean;
  placeholder: boolean;
  route: string | null;
  result?: string;
  error?: string;
};

type WorkflowStage = {
  key: string;
  label: string;
  status: "done" | "pending" | "running";
};

type AssistantWorkflow = {
  id: string;
  user_intent: string;
  normalized_intent: string;
  intent_label: string;
  summary: string;
  status: "planned" | "awaiting_confirmation" | "running" | "success" | "failed" | "cancelled";
  created_at: string;
  current_stage: string;
  stages: WorkflowStage[];
  actions: WorkflowAction[];
  estimates: {
    estimated_time_seconds: number;
    estimated_time_label: string;
    estimated_cost_eur: number | null;
    cost_breakdown: {
      image_eur: number;
      llm_eur: number;
      total_eur: number;
      voice_eur: number;
    };
  };
  decision: DecisionRecommendation;
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

type DecisionRecommendation = {
  action_prioritaire: string;
  pourquoi_maintenant: string;
  temps_estime: string;
  cout_estime: string;
  risque: string;
  pret_a_executer: boolean;
};

type AssistantResponse = {
  ok?: boolean;
  activeMode?: "conversation" | "workflow";
  answer?: string;
  decision?: DecisionRecommendation;
  detailedAnalysis?: string;
  workflow?: AssistantWorkflow | null;
  error?: string;
};

type AssistantCommandCenterProps = {
  memorySnapshot?: {
    lastUpdatedAt: string | null;
    state: "up_to_date" | "needs_update";
  };
  projectContext?: ProjectContext;
};

const contexts: Record<AssistantContext, { description: string; mode: "project" | "interior" | "balance" }> = {
  Projet: {
    description: "Orchestration du cockpit, des Shorts, des publications et des prochaines etapes.",
    mode: "project",
  },
  Interieur: {
    description: "Organisation sobre du travail personnel, sans action sensible automatique.",
    mode: "interior",
  },
  Equilibre: {
    description: "Arbitrage entre priorite, charge et prochaine action realiste.",
    mode: "balance",
  },
};

const exampleCommands = [
  "Ou en est le cockpit ?",
  "Resume la memoire projet",
  "Termine tous les brouillons commences",
  "Prepare 7 jours de publications",
  "Programme les videos pretes",
  "Organise le travail",
];

const quickLinks = [
  { href: "/interface/post-creation/shorts/pilotage-ia", label: "Pilotage IA Shorts" },
  { href: "/interface/post-creation/shorts/drafts", label: "Brouillons Shorts" },
  { href: "/interface/post-creation/shorts/programming", label: "Programmation" },
  { href: "/interface/monitoring", label: "Observatoire" },
  { href: "/interface/trajectoire", label: "Trajectoire" },
];

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} min`;
}

function formatCost(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "0 EUR estime";
  }

  const formatted = new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 4,
    style: "currency",
  }).format(value);

  return `${formatted} estime`;
}

// Converts workflow status keys into labels suitable for the cockpit UI. The
// raw status stays available in the technical details when needed.
function formatWorkflowStatus(status: AssistantWorkflow["status"]) {
  const labels: Record<AssistantWorkflow["status"], string> = {
    awaiting_confirmation: "En attente de confirmation",
    cancelled: "Annule",
    failed: "Erreur",
    planned: "Planifie",
    running: "En execution",
    success: "Termine",
  };

  return labels[status];
}

// Converts action status keys into readable operational states.
function formatActionStatus(status: WorkflowActionStatus) {
  const labels: Record<WorkflowActionStatus, string> = {
    failed: "Erreur",
    pending: "A faire",
    running: "En cours",
    skipped: "Ignore",
    success: "Fait",
  };

  return labels[status];
}

// Converts canonical workflow stage status keys into project-manager wording.
function formatStageStatus(status: WorkflowStage["status"]) {
  const labels: Record<WorkflowStage["status"], string> = {
    done: "Fait",
    pending: "A faire",
    running: "En cours",
  };

  return labels[status];
}

type RunModePreference = "auto" | "conversation" | "workflow";

const runModeLabels: Record<RunModePreference, string> = {
  auto: "Auto",
  conversation: "Conversation",
  workflow: "Workflow",
};

// Main cockpit assistant. Conversation is the default mode; workflow cards are
// shown only when the detector or the manual switch selects orchestration.
export function AssistantCommandCenter({
  memorySnapshot,
  projectContext,
}: AssistantCommandCenterProps) {
  const [activeContext, setActiveContext] = useState<AssistantContext>("Projet");
  const [runModePreference, setRunModePreference] = useState<RunModePreference>("auto");
  const [activeRunMode, setActiveRunMode] = useState<"conversation" | "workflow">("conversation");
  const [command, setCommand] = useState(exampleCommands[0]);
  const [conversationAnswer, setConversationAnswer] = useState<string | null>(null);
  const [conversationDecision, setConversationDecision] = useState<DecisionRecommendation | null>(null);
  const [workflow, setWorkflow] = useState<AssistantWorkflow | null>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const context = contexts[activeContext];
  const memory = projectContext
    ? {
        cockpitRole: projectMemoryForAssistant.cockpitRole,
        safeguards: projectMemoryForAssistant.safeguards,
        nextRecommendedAction: projectContext.nextPriorityAction,
        projectMemoryEntries: projectContext.projectMemoryEntries,
        overview: projectContext.overview,
      }
    : {
        ...projectMemoryForAssistant,
        projectMemoryEntries: [],
        overview: projectStatusOverview,
      };
  const completedActions = useMemo(
    () => workflow?.actions.filter((action) => ["success", "failed", "skipped"].includes(action.status)).length ?? 0,
    [workflow],
  );
  const progress = workflow?.actions.length
    ? Math.round((completedActions / workflow.actions.length) * 100)
    : 0;

  // Sends the command to the assistant route. The server may return a direct
  // conversation answer or an executable workflow depending on the active mode.
  async function submitAssistantCommand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextCommand = command.trim();

    if (!nextCommand || isPlanning) {
      return;
    }

    setIsPlanning(true);
    setConversationAnswer(null);
    setConversationDecision(null);
    setWorkflow(null);
    setDetailedAnalysis(null);
    setError(null);

    try {
      const response = await fetch("/api/assistant/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: nextCommand,
          mode: context.mode,
          runMode: runModePreference,
        }),
      });
      const payload = (await response.json()) as AssistantResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Assistant indisponible.");
      }

      setActiveRunMode(payload.activeMode ?? (payload.workflow ? "workflow" : "conversation"));
      setConversationAnswer(payload.activeMode === "conversation" ? payload.answer ?? null : null);
      setConversationDecision(payload.activeMode === "conversation" ? payload.decision ?? null : null);
      setWorkflow(payload.workflow ?? null);
      setDetailedAnalysis(payload.detailedAnalysis ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Assistant indisponible.");
    } finally {
      setIsPlanning(false);
    }
  }

  // Executes only the confirmed workflow object. The server decides which
  // actions are safe, skips sensitive steps, and returns the final statuses.
  async function executeWorkflow() {
    if (!workflow || isExecuting) {
      return;
    }

    setIsExecuting(true);
    setError(null);
    setWorkflow({ ...workflow, status: "running" });

    try {
      const response = await fetch("/api/assistant/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow }),
      });
      const payload = (await response.json()) as {
        workflow?: AssistantWorkflow;
        error?: string;
      };

      if (!response.ok || !payload.workflow) {
        throw new Error(payload.error ?? "Execution workflow indisponible.");
      }

      setWorkflow(payload.workflow);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Execution workflow indisponible.");
      setWorkflow((current) => current ? { ...current, status: "failed" } : current);
    } finally {
      setIsExecuting(false);
    }
  }

  function cancelWorkflow() {
    setWorkflow((current) => current ? { ...current, status: "cancelled" } : current);
  }

  function modifyWorkflow() {
    if (workflow) {
      setCommand(workflow.user_intent);
      setWorkflow(null);
      setConversationAnswer(null);
      setConversationDecision(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-6">
        <SectionContainer className="bg-[#0B1420]">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Assistant du cockpit
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                Assistant de L&apos;Edifice
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
                {context.description}
              </p>
            </div>
            <SafetyModeBadge />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(contexts) as AssistantContext[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveContext(mode)}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                  activeContext === mode
                    ? "border-[#39E6D0]/60 bg-[#39E6D0]/10 text-[#F8FAFC]"
                    : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:text-[#F8FAFC]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-col gap-3 rounded-md border border-[#1D2A44] bg-[#03070B] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#F8FAFC]">Mode actif</p>
              <p className="mt-1 text-sm text-[#A7B0C0]">
                {activeRunMode === "workflow" ? "Workflow : plan, confirmation, execution." : "Conversation : reponse, analyse, conseil."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(runModeLabels) as RunModePreference[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRunModePreference(mode)}
                  className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                    runModePreference === mode
                      ? "border-[#38BDF8]/60 bg-[#38BDF8]/10 text-[#F8FAFC]"
                      : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:text-[#F8FAFC]"
                  }`}
                >
                  {runModeLabels[mode]}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submitAssistantCommand} className="grid gap-3">
            <textarea
              aria-label="Commande workflow"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              rows={3}
              className="min-h-24 resize-y rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm leading-6 text-[#F8FAFC] outline-none placeholder:text-[#64748B]"
            />
            <div className="flex flex-wrap gap-2">
              {exampleCommands.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setCommand(example)}
                  className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
                >
                  {example}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!command.trim() || isPlanning}
              className="w-fit rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-5 py-2 text-sm font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC] disabled:opacity-50"
            >
              {isPlanning ? "Analyse..." : "Envoyer"}
            </button>
          </form>

          {error ? (
            <p className="mt-4 rounded-md border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#FECACA]">
              {error}
            </p>
          ) : null}
        </SectionContainer>

        {conversationAnswer ? (
          <ConversationCard
            answer={conversationAnswer}
            decision={conversationDecision}
            detailedAnalysis={detailedAnalysis}
          />
        ) : null}

        {workflow ? (
          <WorkflowCard
            detailedAnalysis={detailedAnalysis}
            isExecuting={isExecuting}
            progress={isExecuting ? Math.max(progress, 30) : progress}
            workflow={workflow}
            onCancel={cancelWorkflow}
            onExecute={() => void executeWorkflow()}
            onModify={modifyWorkflow}
          />
        ) : null}

        <SectionContainer>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
            Etat de depart
          </p>
          <p className="mt-3 leading-7 text-[#A7B0C0]">
            {memory.nextRecommendedAction}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Metric label="Modules suivis" value={memory.overview.totalModules} />
            <Metric label="Operationnels" value={memory.overview.operational} />
            <Metric label="Bloques" value={memory.overview.blocked} />
          </div>
        </SectionContainer>
      </div>

      <aside className="space-y-6">
        <ProjectMemoryPanel
          cockpitRole={memory.cockpitRole}
          safeguards={memory.safeguards}
          nextRecommendedAction={memory.nextRecommendedAction}
        />
        <ProjectMemorySnapshotControl
          initialLastUpdatedAt={memorySnapshot?.lastUpdatedAt ?? null}
          initialState={memorySnapshot?.state ?? "needs_update"}
        />
        <SectionContainer>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#F8FAFC]">Mode actif</h2>
              <p className="mt-2 text-sm text-[#A7B0C0]">
                {activeContext} - {activeRunMode}
              </p>
            </div>
            <StatusBadge status="Operationnel" />
          </div>
        </SectionContainer>
        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">Raccourcis</h2>
          <div className="mt-4 grid gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </SectionContainer>
      </aside>
    </div>
  );
}

// Conversation card for the default assistant mode. It keeps explanations and
// advice lightweight, with sources hidden behind the analysis drawer.
function ConversationCard({
  answer,
  decision,
  detailedAnalysis,
}: {
  answer: string;
  decision: DecisionRecommendation | null;
  detailedAnalysis: string | null;
}) {
  return (
    <SectionContainer className="bg-[#03070B]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#38BDF8]">
            Conversation
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
            Reponse de l&apos;assistant
          </h2>
        </div>
        <span className="rounded-md border border-[#38BDF8]/40 bg-[#38BDF8]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
          conversation
        </span>
      </div>
      <p className="mt-4 whitespace-pre-line leading-7 text-[#A7B0C0]">
        {answer}
      </p>
      {decision ? <DecisionCard decision={decision} /> : null}
      {detailedAnalysis ? (
        <details className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-[#39E6D0]">
            Developper l&apos;analyse
          </summary>
          <div className="mt-3 whitespace-pre-line leading-6 text-[#A7B0C0]">
            {detailedAnalysis}
          </div>
        </details>
      ) : null}
    </SectionContainer>
  );
}

// Canonical workflow card shared by all assistant commands.
function WorkflowCard({
  detailedAnalysis,
  isExecuting,
  onCancel,
  onExecute,
  onModify,
  progress,
  workflow,
}: {
  detailedAnalysis: string | null;
  isExecuting: boolean;
  onCancel: () => void;
  onExecute: () => void;
  onModify: () => void;
  progress: number;
  workflow: AssistantWorkflow;
}) {
  const canExecute = workflow.status === "awaiting_confirmation";

  return (
    <SectionContainer className="bg-[#03070B]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
            Plan operationnel
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
            {workflow.intent_label}
          </h2>
          <p className="mt-3 leading-7 text-[#A7B0C0]">{workflow.summary}</p>
        </div>
        <span className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#CBD5E1]">
          {formatWorkflowStatus(workflow.status)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Metric label="Actions" value={workflow.actions.length} />
        <Metric label="Temps" value={workflow.estimates.estimated_time_label || formatDuration(workflow.estimates.estimated_time_seconds)} />
        <Metric label="Cout" value={formatCost(workflow.estimates.estimated_cost_eur)} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Metric label="LLM" value={formatCost(workflow.estimates.cost_breakdown.llm_eur)} />
        <Metric label="Voix" value={formatCost(workflow.estimates.cost_breakdown.voice_eur)} />
        <Metric label="Image" value={formatCost(workflow.estimates.cost_breakdown.image_eur)} />
        <Metric label="Total" value={formatCost(workflow.estimates.cost_breakdown.total_eur)} />
      </div>

      <DecisionCard decision={workflow.decision} />

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#08111A]">
        <div className="h-full bg-[#39E6D0] transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-5 grid gap-2">
        {workflow.stages.map((stage) => (
          <div key={stage.key} className="grid gap-2 rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm md:grid-cols-[1fr_120px]">
            <span className="font-semibold text-[#F8FAFC]">{stage.label}</span>
            <span className="text-[#A7B0C0]">{formatStageStatus(stage.status)}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-2">
        {workflow.actions.map((action) => (
          <div key={action.id} className="grid gap-2 rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-3 text-sm md:grid-cols-[1fr_120px_100px]">
            <div>
              <p className="font-semibold text-[#F8FAFC]">
                {action.draft_title ?? "Global"} - {action.human_label}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                {action.label} - {action.estimated_time_seconds}s - {formatCost(action.estimated_cost?.estimatedCostEur)}
              </p>
              {action.result ? <p className="mt-1 text-xs text-[#A7B0C0]">{action.result}</p> : null}
              {action.error ? <p className="mt-1 text-xs font-semibold text-[#FDBA74]">{action.error}</p> : null}
            </div>
            <span className={action.is_sensitive ? "text-[#FDBA74]" : "text-[#86EFAC]"}>
              {action.is_sensitive ? "sensible" : action.placeholder ? "placeholder" : "V1"}
            </span>
            <span className="text-[#CBD5E1]">{formatActionStatus(action.status)}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canExecute || isExecuting}
          onClick={onExecute}
          className="rounded-md border border-[#38BDF8]/50 bg-[#38BDF8]/10 px-4 py-2 text-sm font-semibold text-[#7DD3FC] transition hover:text-[#F8FAFC] disabled:opacity-50"
        >
          {isExecuting ? "Execution..." : "Executer le workflow"}
        </button>
        <button
          type="button"
          disabled={isExecuting}
          onClick={onModify}
          className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC] disabled:opacity-50"
        >
          Modifier
        </button>
        <button
          type="button"
          disabled={isExecuting}
          onClick={onCancel}
          className="rounded-md border border-[#64748B]/50 bg-[#64748B]/10 px-4 py-2 text-sm font-semibold text-[#CBD5E1] transition hover:text-[#F8FAFC] disabled:opacity-50"
        >
          Annuler
        </button>
      </div>

      <details className="mt-5 rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-[#39E6D0]">
          Developper l&apos;analyse
        </summary>
        <div className="mt-3 grid gap-3 text-[#A7B0C0]">
          <InfoLine label="Objectif" value={workflow.analysis.objective} />
          <InfoLine label="Intention technique" value={workflow.normalized_intent} />
          <InfoLine label="Ressources" value={workflow.resources.join(" ; ")} />
          <InfoLine label="Dependances" value={workflow.dependencies.join(" ; ") || "aucune"} />
          <InfoLine label="Risques" value={workflow.analysis.risks.join(" ; ")} />
          <InfoLine label="Garde-fous" value={workflow.guardrails.join(" ; ")} />
          {detailedAnalysis ? <InfoLine label="Trace" value={detailedAnalysis} /> : null}
        </div>
      </details>
    </SectionContainer>
  );
}

// Renders the decision section requested for both Conversation and Workflow.
function DecisionCard({ decision }: { decision: DecisionRecommendation }) {
  return (
    <div className="mt-5 rounded-md border border-[#39E6D0]/30 bg-[#39E6D0]/10 p-3 text-sm">
      <p className="font-semibold text-[#F8FAFC]">Decision recommandee</p>
      <div className="mt-3 grid gap-2 text-[#A7B0C0]">
        <InfoLine label="Action prioritaire" value={decision.action_prioritaire} />
        <InfoLine label="Pourquoi maintenant" value={decision.pourquoi_maintenant} />
        <InfoLine label="Temps estime" value={decision.temps_estime} />
        <InfoLine label="Cout estime" value={decision.cout_estime} />
        <InfoLine label="Risque" value={decision.risque} />
        <InfoLine label="Pret a executer" value={decision.pret_a_executer ? "oui" : "non"} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#F8FAFC]">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 md:grid-cols-[150px_1fr]">
      <span className="font-semibold text-[#F8FAFC]">{label}</span>
      <span className="whitespace-pre-line leading-6">{value}</span>
    </div>
  );
}
