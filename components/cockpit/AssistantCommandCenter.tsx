"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LogPanel } from "./LogPanel";
import { ProjectMemoryPanel } from "./ProjectMemoryPanel";
import { SafetyModeBadge } from "./SafetyModeBadge";
import { SectionContainer } from "./SectionContainer";
import { StatusBadge } from "./StatusBadge";
import {
  projectMemoryForAssistant,
  projectStatusOverview,
} from "@/lib/cockpit/observatory";
import type {
  AssistantQuestion,
  CockpitLog,
  ProjectContext,
} from "@/types/cockpit";

type AssistantContext = "Projet" | "Interieur" | "Equilibre";
type AssistantExchange = {
  id: string;
  role: "user" | "assistant";
  message: string;
  detailedAnalysis?: string;
  recommendation?: AssistantRecommendation;
  memoryProposal?: ProjectMemoryProposal;
  memoryConfirmed?: boolean;
  memoryCancelled?: boolean;
  trajectoryProposal?: TrajectoryProposal;
  trajectoryConfirmed?: boolean;
  trajectoryCancelled?: boolean;
  trajectoryCreationSummary?: string;
};

type AssistantRecommendation = {
  action: string;
  reason: string;
  dependency: string | null;
  feasibleNow: boolean;
};

type ProjectMemoryProposal = {
  key: string;
  category: string;
  title: string;
  value: string;
  status: string;
  source: string;
  confidence: number;
  previousValue?: string | null;
  impact?: string;
};

type TrajectoryProposal = {
  project: string;
  objective: string;
  deadline: string | null;
  planAction: string[];
  actions: string[];
  means: string[];
  initialProgress: number;
  confidence: number;
  mode?: "create" | "update";
  existingProjectId?: string | null;
  existingObjectiveId?: string | null;
  rationale?: string;
  memoryContext?: string[];
};

const contexts: Record<
  AssistantContext,
  {
    description: string;
    suggestions: string[];
    sources: string[];
    systemMessage: string;
    userExample: string;
    assistantExample: string;
  }
> = {
  Projet: {
    description:
      "Pour batir L'Edifice, creer du contenu, preparer les publications, suivre les connexions OAuth et garder le cap sur l'oeuvre.",
    suggestions: [
      "Que dois-je faire maintenant ?",
      "Ou en est le projet ?",
      "Quels sont les blocages ?",
      "Qu'est-ce qui depend de moi ?",
      "Qu'est-ce qui depend d'un service externe ?",
    ],
    sources: ["Project memory", "Observatoire", "OAuth Tokens", "Modules cockpit"],
    systemMessage:
      "Assistant de L'Edifice pret en mode Projet. Les actions sensibles restent verrouillees.",
    userExample: "Que dois-je faire maintenant ?",
    assistantExample:
      "Je lis l'etat reel du projet et je propose la prochaine pierre sans declencher d'action externe.",
  },
  Interieur: {
    description:
      "Pour organiser le quotidien, les routines, les objectifs, les notes, l'energie et la vision personnelle.",
    suggestions: [
      "Aide-moi a clarifier ma prochaine action",
      "Comment avancer sans surcharge ?",
      "Resume mon point d'appui du jour",
      "Quelle action simple garder ?",
    ],
    sources: ["Vision du jour", "Routines", "Objectifs", "Notes rapides"],
    systemMessage:
      "Assistant de L'Edifice pret en mode Interieur. L'espace reste local et sans action sensible.",
    userExample: "Aide-moi a remettre de l'ordre dans ma journee.",
    assistantExample:
      "Je peux proposer une structure simple entre taches, routines, energie et objectifs.",
  },
  Equilibre: {
    description:
      "Pour arbitrer entre ambition, repos, priorites, discipline et charge mentale.",
    suggestions: [
      "Quelle est l'action sobre ?",
      "Comment avancer sans ouvrir trop de fronts ?",
      "Quels risques garder visibles ?",
      "Aide-moi a prioriser",
    ],
    sources: ["Priorites", "Energie du jour", "Projet + interieur", "Decisions"],
    systemMessage:
      "Assistant de L'Edifice pret en mode Equilibre. Le cockpit aide a garder le cap sans forcer l'allure.",
    userExample: "Aide-moi a arbitrer entre avancer et preserver mon energie.",
    assistantExample:
      "Je peux mettre en balance l'impact, la charge et le repos avant toute decision.",
  },
};

const signals: CockpitLog[] = [
  {
    timestamp: "10:00",
    type: "system",
    message: "Contexte assistant charge cote serveur.",
    status: "Disponible",
  },
  {
    timestamp: "10:04",
    type: "security",
    message: "Garde-fou actif: actions sensibles verrouillees.",
    status: "A securiser",
  },
  {
    timestamp: "10:08",
    type: "assistant",
    message: "Copilote de chantier connecte a l'API globale.",
    status: "En cours",
  },
  {
    timestamp: "10:12",
    type: "publication",
    message: "Publication reelle bloquee sans validation humaine.",
    status: "A securiser",
  },
];

const quickLinks = [
  { href: "/interface/post-creation", label: "Atelier de contenu" },
  { href: "/interface/publishers", label: "Publications" },
  { href: "/interface/settings/connections", label: "Connexions OAuth" },
  { href: "/interface/monitoring", label: "Observatoire" },
  { href: "/interface/personnel", label: "Espace interieur" },
  { href: "/interface/resources", label: "Ressources" },
];

type AssistantCommandCenterProps = {
  projectContext?: ProjectContext;
};

export function AssistantCommandCenter({
  projectContext,
}: AssistantCommandCenterProps) {
  const [activeContext, setActiveContext] =
    useState<AssistantContext>("Projet");
  const [draft, setDraft] = useState("");
  const [exchanges, setExchanges] = useState<AssistantExchange[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [confirmingProposalId, setConfirmingProposalId] = useState<string | null>(null);
  const [confirmingTrajectoryProposalId, setConfirmingTrajectoryProposalId] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<AssistantQuestion>(
    "Que dois-je faire maintenant ?",
  );

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
  const recommendation =
    projectContext?.recommendations[activeQuestion] ??
    memory.nextRecommendedAction;
  const supportedQuestions = projectContext
    ? (Object.keys(projectContext.recommendations) as AssistantQuestion[])
    : (["Que dois-je faire maintenant ?"] as AssistantQuestion[]);
  const placeholder = useMemo(
    () => `Question en mode ${activeContext}. Lecture seule, aucun declenchement.`,
    [activeContext],
  );
  const assistantMode =
    activeContext === "Interieur"
      ? "interior"
      : activeContext === "Equilibre"
        ? "balance"
        : "project";

  async function handleAssistantSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();

    if (!message || isSending) {
      return;
    }

    setExchanges((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", message },
    ]);
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant/global", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          mode: assistantMode,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        answer?: string;
        detailedAnalysis?: string;
        recommendation?: AssistantRecommendation;
        memoryProposal?: ProjectMemoryProposal;
        trajectoryProposal?: TrajectoryProposal | null;
        requiresConfirmation?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.answer) {
        throw new Error(payload.error ?? "Assistant indisponible.");
      }

      const answer = payload.answer;

      setExchanges((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          message: answer,
          detailedAnalysis: payload.detailedAnalysis,
          recommendation: payload.recommendation,
          memoryProposal: payload.memoryProposal,
          trajectoryProposal: payload.trajectoryProposal ?? undefined,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Assistant indisponible.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function cancelMemoryProposal(exchangeId: string) {
    setExchanges((current) =>
      current.map((exchange) =>
        exchange.id === exchangeId
          ? { ...exchange, memoryCancelled: true }
          : exchange,
      ),
    );
  }

  async function confirmMemoryProposal(
    exchangeId: string,
    proposal: ProjectMemoryProposal,
  ) {
    setConfirmingProposalId(exchangeId);
    setError(null);

    try {
      const response = await fetch("/api/project-memory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "confirm_update",
          proposal,
        }),
      });
      const payload = (await response.json()) as {
        entry?: unknown;
        error?: string;
      };

      if (!response.ok || !payload.entry) {
        throw new Error(payload.error ?? "Mise a jour memoire indisponible.");
      }

      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === exchangeId
            ? {
                ...exchange,
                memoryConfirmed: true,
                message: `${exchange.message}\n\nMemoire projet mise a jour.`,
              }
            : exchange,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Mise a jour memoire indisponible.",
      );
    } finally {
      setConfirmingProposalId(null);
    }
  }

  function cancelTrajectoryProposal(exchangeId: string) {
    setExchanges((current) =>
      current.map((exchange) =>
        exchange.id === exchangeId
          ? { ...exchange, trajectoryCancelled: true }
          : exchange,
      ),
    );
  }

  async function confirmTrajectoryProposal(
    exchangeId: string,
    proposal: TrajectoryProposal,
  ) {
    setConfirmingTrajectoryProposalId(exchangeId);
    setError(null);

    try {
      const response = await fetch("/api/trajectoire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "confirm_assistant_proposal",
          proposal,
        }),
      });
      const payload = (await response.json()) as {
        result?: {
          project?: { title?: string };
          objective?: { title?: string };
          actions?: unknown[];
          reusedProject?: boolean;
          reusedObjective?: boolean;
          skippedActions?: string[];
        };
        error?: string;
      };

      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "Creation Trajectoire indisponible.");
      }

      const createdActions = payload.result.actions?.length ?? 0;
      const skippedActions = payload.result.skippedActions?.length ?? 0;
      const summary = [
        payload.result.reusedProject
          ? "Projet existant reutilise."
          : "Projet cree.",
        payload.result.reusedObjective
          ? "Objectif existant reutilise."
          : "Objectif cree.",
        `${createdActions} action(s) ajoutee(s).`,
        skippedActions ? `${skippedActions} doublon(s) ignore(s).` : null,
      ]
        .filter(Boolean)
        .join(" ");

      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === exchangeId
            ? {
                ...exchange,
                trajectoryConfirmed: true,
                trajectoryCreationSummary: summary,
              }
            : exchange,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Creation Trajectoire indisponible.",
      );
    } finally {
      setConfirmingTrajectoryProposalId(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-6">
        <SectionContainer className="bg-[#0B1420]">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Chambre de pilotage
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(contexts) as AssistantContext[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setActiveContext(mode);
                      setDraft("");
                    }}
                    className={`rounded-md border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      activeContext === mode
                        ? "border-[#39E6D0]/60 bg-[#39E6D0]/10 text-[#F8FAFC]"
                        : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:text-[#F8FAFC]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p className="mt-4 max-w-3xl leading-7 text-[#A7B0C0]">
                {context.description}
              </p>
            </div>
            <SafetyModeBadge />
          </div>

          <div className="rounded-lg border border-[#1D2A44] bg-[#03070B] p-4">
            <div className="space-y-4">
              <ChatMessage label="Systeme" tone="jade">
                {context.systemMessage}
              </ChatMessage>
              {exchanges.length === 0 ? (
                <>
                  <ChatMessage label="Vous" tone="blue" align="right">
                    {context.userExample}
                  </ChatMessage>
                  <ChatMessage label="Assistant de L'Edifice" tone="jade">
                    {context.assistantExample}
                  </ChatMessage>
                  <div className="rounded-md border border-dashed border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                    Pose une question au copilote de chantier. L&apos;historique reste
                    local dans cette interface.
                  </div>
                </>
              ) : null}
              {exchanges.map((exchange) => (
                <ChatMessage
                  key={exchange.id}
                  label={exchange.role === "user" ? "Vous" : "Assistant de L'Edifice"}
                  tone={exchange.role === "user" ? "blue" : "jade"}
                  align={exchange.role === "user" ? "right" : "left"}
                  recommendation={exchange.recommendation}
                  detailedAnalysis={exchange.detailedAnalysis}
                  memoryProposal={exchange.memoryProposal}
                  memoryConfirmed={exchange.memoryConfirmed}
                  memoryCancelled={exchange.memoryCancelled}
                  trajectoryProposal={exchange.trajectoryProposal}
                  trajectoryConfirmed={exchange.trajectoryConfirmed}
                  trajectoryCancelled={exchange.trajectoryCancelled}
                  trajectoryCreationSummary={exchange.trajectoryCreationSummary}
                  confirmingProposalId={confirmingProposalId}
                  confirmingTrajectoryProposalId={confirmingTrajectoryProposalId}
                  exchangeId={exchange.id}
                  onConfirmMemoryProposal={confirmMemoryProposal}
                  onCancelMemoryProposal={cancelMemoryProposal}
                  onConfirmTrajectoryProposal={confirmTrajectoryProposal}
                  onCancelTrajectoryProposal={cancelTrajectoryProposal}
                >
                  {exchange.message}
                </ChatMessage>
              ))}
            </div>

            <form
              onSubmit={handleAssistantSubmit}
              className="mt-5 grid gap-3 border-t border-[#1D2A44] pt-4 sm:grid-cols-[1fr_auto]"
            >
              <input
                aria-label="Message assistant"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={placeholder}
                className="min-h-11 rounded-md border border-[#1D2A44] bg-[#08111A] px-4 text-sm text-[#F8FAFC] outline-none placeholder:text-[#64748b]"
              />
              <button
                type="submit"
                disabled={!draft.trim() || isSending}
                className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-5 py-2 text-sm font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC] disabled:border-[#1D2A44] disabled:bg-[#08111A] disabled:text-[#64748b]"
              >
                {isSending ? "Lecture" : "Envoyer"}
              </button>
            </form>
            {error ? (
              <p className="mt-3 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fecaca]">
                {error}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-[#A7B0C0]">
              Copilote en lecture seule. Aucune publication, suppression,
              modification OAuth ou action sensible n&apos;est declenchee.
            </p>
          </div>
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Suggestions rapides
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {context.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setDraft(suggestion)}
                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-left text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/60 hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                Observatoire projet
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                Prochaine pierre a poser
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-[#A7B0C0]">
                {memory.nextRecommendedAction}
              </p>
            </div>
            <StatusBadge status="En cours" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["Modules suivis", memory.overview.totalModules],
              ["Operationnels", memory.overview.operational],
              ["Bloques", memory.overview.blocked],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3"
              >
                <p className="text-sm text-[#A7B0C0]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
            Questions assistant
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {supportedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => {
                  setActiveQuestion(question);
                  setDraft(question);
                }}
                className={`rounded-md border px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  activeQuestion === question
                    ? "border-[#39E6D0]/60 bg-[#39E6D0]/10 text-[#F8FAFC]"
                    : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:text-[#F8FAFC]"
                }`}
              >
                {question}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] px-4 py-3">
            <h2 className="text-lg font-semibold text-[#F8FAFC]">
              {activeQuestion}
            </h2>
            <p className="mt-3 leading-7 text-[#A7B0C0]">
              {recommendation}
            </p>
          </div>
          <p className="mt-3 text-sm text-[#A7B0C0]">
            Base de recommandation : {memory.overview.totalModules} statuts
            Observatoire et {memory.projectMemoryEntries.length} entrees
            project_memory lues cote serveur.
          </p>
        </SectionContainer>
      </div>

      <aside className="space-y-6">
        <ProjectMemoryPanel
          cockpitRole={memory.cockpitRole}
          safeguards={memory.safeguards}
          nextRecommendedAction={memory.nextRecommendedAction}
        />

        <SectionContainer>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#F8FAFC]">
                Contexte actif
              </h2>
              <p className="mt-2 text-sm text-[#A7B0C0]">
                Mode actif :{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {activeContext}
                </span>
              </p>
            </div>
            <StatusBadge status="En cours" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {context.sources.map((source) => (
              <span
                key={source}
                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-xs font-semibold text-[#A7B0C0]"
              >
                {source}
              </span>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">Garde-fous</h2>
          <div className="mt-4 grid gap-3 text-sm text-[#A7B0C0]">
            <SafetyLine label="Actions sensibles" value="verrouillees" />
            <SafetyLine label="Publication reelle" value="bloquee" />
            <SafetyLine label="Validation humaine" value="obligatoire" />
            <SafetyLine label="Secrets" value="cote serveur uniquement" />
          </div>
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">Raccourcis</h2>
          <div className="mt-4 grid gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/50 hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </SectionContainer>

        <LogPanel logs={signals} title="Signaux recents" />
      </aside>
    </div>
  );
}

function ChatMessage({
  label,
  tone,
  align = "left",
  children,
  recommendation,
  detailedAnalysis,
  memoryProposal,
  memoryConfirmed,
  memoryCancelled,
  trajectoryProposal,
  trajectoryConfirmed,
  trajectoryCancelled,
  trajectoryCreationSummary,
  confirmingProposalId,
  confirmingTrajectoryProposalId,
  exchangeId,
  onConfirmMemoryProposal,
  onCancelMemoryProposal,
  onConfirmTrajectoryProposal,
  onCancelTrajectoryProposal,
}: {
  label: string;
  tone: "jade" | "blue";
  align?: "left" | "right";
  children: React.ReactNode;
  recommendation?: AssistantRecommendation;
  detailedAnalysis?: string;
  memoryProposal?: ProjectMemoryProposal;
  memoryConfirmed?: boolean;
  memoryCancelled?: boolean;
  trajectoryProposal?: TrajectoryProposal;
  trajectoryConfirmed?: boolean;
  trajectoryCancelled?: boolean;
  trajectoryCreationSummary?: string;
  confirmingProposalId?: string | null;
  confirmingTrajectoryProposalId?: string | null;
  exchangeId?: string;
  onConfirmMemoryProposal?: (
    exchangeId: string,
    proposal: ProjectMemoryProposal,
  ) => Promise<void>;
  onCancelMemoryProposal?: (exchangeId: string) => void;
  onConfirmTrajectoryProposal?: (
    exchangeId: string,
    proposal: TrajectoryProposal,
  ) => Promise<void>;
  onCancelTrajectoryProposal?: (exchangeId: string) => void;
}) {
  const color = tone === "jade" ? "text-[#39E6D0]" : "text-[#38BDF8]";
  const [isEditingTrajectory, setIsEditingTrajectory] = useState(false);
  const [trajectoryDraft, setTrajectoryDraft] = useState<TrajectoryProposal | null>(
    trajectoryProposal ?? null,
  );
  const displayedTrajectoryProposal = trajectoryDraft ?? trajectoryProposal;

  return (
    <div
      className={`max-w-[88%] whitespace-pre-line rounded-lg border border-[#1D2A44] bg-[#08111A] p-4 ${
        align === "right" ? "ml-auto" : ""
      }`}
    >
      <p className={`text-sm font-semibold ${color}`}>{label}</p>
      <p className="mt-2 leading-7 text-[#A7B0C0]">{children}</p>
      {recommendation ? (
        <div className="mt-4 grid gap-2 rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-sm">
          <RecommendationLine
            label="Action recommandee"
            value={recommendation.action}
          />
          <RecommendationLine label="Raison" value={recommendation.reason} />
          <RecommendationLine
            label="Dependance"
            value={recommendation.dependency ?? "aucune"}
          />
          <RecommendationLine
            label="Faisable maintenant"
            value={recommendation.feasibleNow ? "oui" : "non"}
          />
        </div>
      ) : null}
      {detailedAnalysis ? (
        <details className="mt-4 rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-[#39E6D0]">
            Développer l’analyse
          </summary>
          <div className="mt-3 whitespace-pre-line leading-7 text-[#A7B0C0]">
            {detailedAnalysis}
          </div>
        </details>
      ) : null}
      {memoryProposal && !memoryConfirmed && !memoryCancelled ? (
        <div className="mt-4 rounded-md border border-[#39E6D0]/30 bg-[#03070B] p-3 text-sm">
          <p className="font-semibold text-[#F8FAFC]">
            Mise à jour mémoire à confirmer
          </p>
          <div className="mt-3 grid gap-2 text-[#A7B0C0]">
            <RecommendationLine label="Clé" value={memoryProposal.key} />
            <RecommendationLine
              label="Ancienne valeur"
              value={memoryProposal.previousValue ?? "non renseignée"}
            />
            <RecommendationLine label="Nouvelle valeur" value={memoryProposal.value} />
            <RecommendationLine
              label="Impact"
              value={memoryProposal.impact ?? "Statut cockpit mis a jour apres confirmation."}
            />
          </div>
          <p className="mt-2 text-xs text-[#64748b]">
            Confiance{" "}
            {Math.round(memoryProposal.confidence * 100)}%
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC] disabled:opacity-50"
              disabled={!exchangeId || confirmingProposalId === exchangeId}
              onClick={() =>
                exchangeId
                  ? onConfirmMemoryProposal?.(exchangeId, memoryProposal)
                  : undefined
              }
              type="button"
            >
              {confirmingProposalId === exchangeId ? "Confirmation..." : "Confirmer"}
            </button>
            <button
              className="rounded-md border border-[#64748b]/50 bg-[#64748b]/10 px-3 py-2 text-xs font-semibold text-[#cbd5e1] transition hover:text-[#F8FAFC]"
              disabled={!exchangeId || confirmingProposalId === exchangeId}
              onClick={() => (exchangeId ? onCancelMemoryProposal?.(exchangeId) : undefined)}
              type="button"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
      {memoryProposal && memoryConfirmed ? (
        <p className="mt-4 rounded-md border border-[#39E6D0]/30 bg-[#39E6D0]/10 px-3 py-2 text-sm font-semibold text-[#39E6D0]">
          Mémoire projet mise à jour.
        </p>
      ) : null}
      {memoryProposal && memoryCancelled ? (
        <p className="mt-4 rounded-md border border-[#64748b]/30 bg-[#64748b]/10 px-3 py-2 text-sm font-semibold text-[#cbd5e1]">
          Mise à jour annulée.
        </p>
      ) : null}
      {displayedTrajectoryProposal && !trajectoryConfirmed && !trajectoryCancelled ? (
        <div className="mt-4 rounded-md border border-[#38BDF8]/30 bg-[#03070B] p-3 text-sm">
          <p className="font-semibold text-[#F8FAFC]">
            {displayedTrajectoryProposal.mode === "update"
              ? "Mise a jour Trajectoire proposee"
              : "Proposition Trajectoire preparee"}
          </p>
          {isEditingTrajectory ? (
            <div className="mt-3 grid gap-3 text-[#A7B0C0]">
              <TrajectoryField
                label="Projet"
                value={displayedTrajectoryProposal.project}
                onChange={(value) =>
                  setTrajectoryDraft({
                    ...displayedTrajectoryProposal,
                    project: value,
                  })
                }
              />
              <TrajectoryField
                label="Objectif"
                value={displayedTrajectoryProposal.objective}
                onChange={(value) =>
                  setTrajectoryDraft({
                    ...displayedTrajectoryProposal,
                    objective: value,
                  })
                }
              />
              <TrajectoryField
                label="Deadline"
                value={displayedTrajectoryProposal.deadline ?? ""}
                onChange={(value) =>
                  setTrajectoryDraft({
                    ...displayedTrajectoryProposal,
                    deadline: value || null,
                  })
                }
              />
              <TrajectoryTextarea
                label="Plan d'action"
                value={displayedTrajectoryProposal.planAction.join("\n")}
                onChange={(value) =>
                  setTrajectoryDraft({
                    ...displayedTrajectoryProposal,
                    planAction: splitLines(value),
                  })
                }
              />
              <TrajectoryTextarea
                label="Actions"
                value={displayedTrajectoryProposal.actions.join("\n")}
                onChange={(value) =>
                  setTrajectoryDraft({
                    ...displayedTrajectoryProposal,
                    actions: splitLines(value),
                  })
                }
              />
              <TrajectoryTextarea
                label="Moyens"
                value={displayedTrajectoryProposal.means.join("\n")}
                onChange={(value) =>
                  setTrajectoryDraft({
                    ...displayedTrajectoryProposal,
                    means: splitLines(value),
                  })
                }
              />
            </div>
          ) : (
            <div className="mt-3 grid gap-2 text-[#A7B0C0]">
              <RecommendationLine
                label="Projet"
                value={displayedTrajectoryProposal.project}
              />
              <RecommendationLine
                label="Objectif"
                value={displayedTrajectoryProposal.objective}
              />
              <RecommendationLine
                label="Deadline"
                value={displayedTrajectoryProposal.deadline ?? "a confirmer"}
              />
              <RecommendationLine
                label="Plan d'action"
                value={displayedTrajectoryProposal.planAction.join(" ; ")}
              />
              <RecommendationLine
                label="Actions"
                value={displayedTrajectoryProposal.actions.join(" ; ")}
              />
              <RecommendationLine
                label="Moyens"
                value={displayedTrajectoryProposal.means.join(" ; ")}
              />
              {displayedTrajectoryProposal.rationale ? (
                <RecommendationLine
                  label="Decision"
                  value={displayedTrajectoryProposal.rationale}
                />
              ) : null}
              {displayedTrajectoryProposal.memoryContext?.length ? (
                <RecommendationLine
                  label="Memoire"
                  value={displayedTrajectoryProposal.memoryContext.join(" ; ")}
                />
              ) : null}
            </div>
          )}
          <p className="mt-2 text-xs text-[#64748b]">
            Rien n&apos;est ecrit dans Trajectoire sans confirmation dediee.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-md border border-[#38BDF8]/50 bg-[#38BDF8]/10 px-3 py-2 text-xs font-semibold text-[#7dd3fc] transition hover:text-[#F8FAFC] disabled:opacity-50"
              disabled={
                !exchangeId || confirmingTrajectoryProposalId === exchangeId
              }
              onClick={() =>
                exchangeId
                  ? onConfirmTrajectoryProposal?.(
                      exchangeId,
                      displayedTrajectoryProposal,
                    )
                  : undefined
              }
              type="button"
            >
              {confirmingTrajectoryProposalId === exchangeId
                ? "Creation..."
                : "Creer dans Trajectoire"}
            </button>
            <button
              className="rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-3 py-2 text-xs font-semibold text-[#39E6D0] transition hover:text-[#F8FAFC]"
              disabled={confirmingTrajectoryProposalId === exchangeId}
              onClick={() => setIsEditingTrajectory((current) => !current)}
              type="button"
            >
              {isEditingTrajectory ? "Fermer l'edition" : "Modifier"}
            </button>
            <button
              className="rounded-md border border-[#64748b]/50 bg-[#64748b]/10 px-3 py-2 text-xs font-semibold text-[#cbd5e1] transition hover:text-[#F8FAFC]"
              disabled={!exchangeId || confirmingTrajectoryProposalId === exchangeId}
              onClick={() =>
                exchangeId
                  ? onCancelTrajectoryProposal?.(exchangeId)
                  : undefined
              }
              type="button"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
      {trajectoryProposal && trajectoryConfirmed ? (
        <p className="mt-4 rounded-md border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-sm font-semibold text-[#7dd3fc]">
          Projet Trajectoire confirme.{" "}
          {trajectoryCreationSummary ?? "Creation terminee."}
        </p>
      ) : null}
      {trajectoryProposal && trajectoryCancelled ? (
        <p className="mt-4 rounded-md border border-[#64748b]/30 bg-[#64748b]/10 px-3 py-2 text-sm font-semibold text-[#cbd5e1]">
          Proposition Trajectoire annulee.
        </p>
      ) : null}
    </div>
  );
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function TrajectoryField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="font-semibold text-[#F8FAFC]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#F8FAFC] outline-none"
      />
    </label>
  );
}

function TrajectoryTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="font-semibold text-[#F8FAFC]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="resize-y rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#F8FAFC] outline-none"
      />
    </label>
  );
}

function RecommendationLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
      <span className="font-semibold text-[#F8FAFC]">{label}</span>
      <span className="text-[#A7B0C0]">{value}</span>
    </div>
  );
}

function SafetyLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-[#F8FAFC]">{value}</span>
    </div>
  );
}
