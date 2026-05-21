import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { StatusBadge } from "@/components/cockpit/StatusBadge";

export const metadata: Metadata = {
  title: "Assistant IA - L'Edifice",
};

const assistantLogs = [
  {
    timestamp: "10:00",
    type: "security" as const,
    message: "Recherche web integree en mode lecture seule.",
    status: "Disponible" as const,
  },
  {
    timestamp: "10:03",
    type: "system" as const,
    message: "Conversation, outils et memoire a migrer progressivement.",
    status: "En migration" as const,
  },
];

export default function AssistantPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Assistant IA"
        title="Pilotage conversationnel"
        description="Point d'entree unifie pour l'assistant, la recherche web controlee, les outils et les logs associes. Aucune action externe n'est branchee ici."
        status="En migration"
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionContainer>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-[#F8FAFC]">
              Future conversation
            </h2>
            <StatusBadge status="En migration" />
          </div>
          <EmptyState
            title="Chat non connecte"
            description="Cette zone recevra le fil conversationnel, le contexte projet, les reponses controlees et la memoire utile."
          />
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Recherche web controlee
          </h2>
          <div className="mt-4 grid gap-3 text-[#A7B0C0]">
            <p>Lecture seule avec sources visibles.</p>
            <p>Resultats et citations a afficher avant tout usage metier.</p>
            <p>Aucune publication, ecriture externe ou secret expose.</p>
          </div>
        </SectionContainer>

        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Outils assistant
          </h2>
          <div className="mt-4 grid gap-3 text-[#A7B0C0]">
            <p>Resume de decisions et prochaines actions.</p>
            <p>Lecture de documentation projet apres securisation.</p>
            <p>Commandes agent a valider plus tard avec garde-fous.</p>
          </div>
        </SectionContainer>

        <LogPanel logs={assistantLogs} />
      </div>
    </div>
  );
}
