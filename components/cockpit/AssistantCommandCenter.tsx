"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LogPanel } from "./LogPanel";
import { SafetyModeBadge } from "./SafetyModeBadge";
import { SectionContainer } from "./SectionContainer";
import { StatusBadge } from "./StatusBadge";
import type { CockpitLog } from "@/types/cockpit";

type AssistantContext = "Projet" | "Intérieur" | "Équilibre";

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
      "Pour bâtir L’Édifice, créer du contenu, préparer les publications, suivre les connexions OAuth et garder le cap sur l'œuvre.",
    suggestions: [
      "Créer une idée de contenu",
      "Préparer une publication YouTube",
      "Vérifier les connexions OAuth",
      "Lire les derniers signaux",
    ],
    sources: ["Atelier de contenu", "Publications", "Connexions OAuth", "Observatoire"],
    systemMessage:
      "Assistant de L’Édifice prêt en mode Projet. Les actions sensibles restent verrouillées tant que les garde-fous ne sont pas validés.",
    userExample: "Aide-moi à choisir la prochaine pierre à poser pour L’Édifice.",
    assistantExample:
      "Je peux clarifier une idée, préparer une publication ou lire les signaux sans déclencher d'action réelle.",
  },
  Intérieur: {
    description:
      "Pour organiser le quotidien, les routines, les objectifs, les notes, l'énergie et la vision personnelle.",
    suggestions: [
      "Organiser ma journée",
      "Ajouter une tâche",
      "Revoir mes objectifs",
      "Résumer mes routines",
    ],
    sources: ["Vision du jour", "Routines", "Objectifs", "Notes rapides"],
    systemMessage:
      "Assistant de L’Édifice prêt en mode Intérieur. L'espace reste local et lisible tant que les garde-fous ne sont pas validés.",
    userExample: "Aide-moi à remettre de l'ordre dans ma journée.",
    assistantExample:
      "Je peux proposer une structure simple entre tâches, routines, énergie et objectifs.",
  },
  Équilibre: {
    description:
      "Pour arbitrer entre ambition, repos, priorités, discipline et charge mentale.",
    suggestions: [
      "Prioriser ma journée",
      "Avancer sans surcharge",
      "Planifier travail + repos",
      "Identifier l'action essentielle",
    ],
    sources: [
      "Priorités",
      "Énergie du jour",
      "Projet + intérieur",
      "Décisions à arbitrer",
    ],
    systemMessage:
      "Assistant de L’Édifice prêt en mode Équilibre. Le cockpit aide à garder le cap sans forcer l'allure.",
    userExample: "Aide-moi à arbitrer entre avancer et préserver mon énergie.",
    assistantExample:
      "Je peux mettre en balance l'impact, la charge et le repos avant toute décision.",
  },
};

const signals: CockpitLog[] = [
  {
    timestamp: "10:00",
    type: "system",
    message: "Fondations de l'assistant chargées en local.",
    status: "Disponible",
  },
  {
    timestamp: "10:04",
    type: "security",
    message: "Garde-fou actif: actions sensibles verrouillées.",
    status: "A securiser",
  },
  {
    timestamp: "10:08",
    type: "assistant",
    message: "Modes Projet, Intérieur et Équilibre prêts.",
    status: "En migration",
  },
  {
    timestamp: "10:12",
    type: "publication",
    message: "Publication réelle bloquée sans validation humaine.",
    status: "A securiser",
  },
];

const quickLinks = [
  { href: "/interface/post-creation", label: "Atelier de contenu" },
  { href: "/interface/publishers", label: "Publications" },
  { href: "/interface/settings/connections", label: "Connexions OAuth" },
  { href: "/interface/monitoring", label: "Observatoire" },
  { href: "/interface/personnel", label: "Espace intérieur" },
];

export function AssistantCommandCenter() {
  const [activeContext, setActiveContext] =
    useState<AssistantContext>("Projet");
  const [draft, setDraft] = useState("");

  const context = contexts[activeContext];
  const placeholder = useMemo(
    () =>
      draft ||
      `Suggestion prête en mode ${activeContext}. L'envoi reste désactivé.`,
    [activeContext, draft],
  );

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
              <ChatMessage label="Système" tone="jade">
                {context.systemMessage}
              </ChatMessage>
              <ChatMessage label="Vous" tone="blue" align="right">
                {context.userExample}
              </ChatMessage>
              <ChatMessage label="Assistant de L’Édifice" tone="jade">
                {context.assistantExample}
              </ChatMessage>
              <div className="rounded-md border border-dashed border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm text-[#A7B0C0]">
                Historique placeholder. Les échanges réels seront ajoutés après
                validation de la logique assistant.
              </div>
            </div>

            <div className="mt-5 grid gap-3 border-t border-[#1D2A44] pt-4 sm:grid-cols-[1fr_auto]">
              <input
                disabled
                aria-label="Message assistant"
                value={placeholder}
                readOnly
                className="min-h-11 rounded-md border border-[#1D2A44] bg-[#08111A] px-4 text-sm text-[#A7B0C0] outline-none"
              />
              <button
                type="button"
                disabled
                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-5 py-2 text-sm font-semibold text-[#64748b]"
              >
                Envoyer
              </button>
            </div>
            <p className="mt-3 text-xs text-[#A7B0C0]">
              Assistant en migration progressive. Aucun appel API réel n'est
              déclenché.
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
      </div>

      <aside className="space-y-6">
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
            <StatusBadge status="En migration" />
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
            <SafetyLine label="Actions sensibles" value="verrouillées" />
            <SafetyLine label="Publication réelle" value="bloquée" />
            <SafetyLine label="Validation humaine" value="obligatoire" />
            <SafetyLine label="Secrets" value="côté serveur uniquement" />
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

        <LogPanel logs={signals} title="Signaux récents" />
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
      className={`max-w-[88%] rounded-lg border border-[#1D2A44] bg-[#08111A] p-4 ${
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
