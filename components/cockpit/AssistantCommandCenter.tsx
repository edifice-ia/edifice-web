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
      "Qu'est-ce qui est en review ?",
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
}: {
  label: string;
  tone: "jade" | "blue";
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const color = tone === "jade" ? "text-[#39E6D0]" : "text-[#38BDF8]";

  return (
    <div
      className={`max-w-[88%] whitespace-pre-line rounded-lg border border-[#1D2A44] bg-[#08111A] p-4 ${
        align === "right" ? "ml-auto" : ""
      }`}
    >
      <p className={`text-sm font-semibold ${color}`}>{label}</p>
      <p className="mt-2 leading-7 text-[#A7B0C0]">{children}</p>
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
