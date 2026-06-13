import type { Metadata } from "next";
import { DemoReviewerAgent } from "../DemoReviewerAgent";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { ModuleGrid } from "@/components/cockpit/ModuleGrid";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { StatusBadge } from "@/components/cockpit/StatusBadge";
import { cockpitModules, overviewLogs } from "@/lib/cockpit/modules";
import { getCurrentUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tableau de bord - L’Édifice",
  description:
    "Tableau de bord du cockpit IA privé pour le portail L’Édifice.",
};

export default async function OverviewPage() {
  const user = await getCurrentUser();
  const isProjectOwner = user?.email === "contact.edificeia@gmail.com";

  return (
    <div>
      <CockpitHeader
        eyebrow="Tableau de bord"
        title="Cockpit Web de L’Édifice"
        description="Vue synthétique des fondations du cockpit. L'Assistant de L’Édifice reste le point d'entrée principal."
        status="En migration"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[
          ["Modules principaux", "9", "En migration"],
          ["Garde-fous", "Validation requise", "A securiser"],
          ["Publication réelle", "Bloquée par défaut", "A securiser"],
        ].map(([label, value, status]) => (
          <SectionContainer key={label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[#A7B0C0]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#F8FAFC]">
                  {value}
                </p>
              </div>
              <StatusBadge
                status={
                  status as "Disponible" | "En migration" | "A securiser"
                }
              />
            </div>
          </SectionContainer>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <SectionContainer>
            <CockpitHeader
              eyebrow="Modules"
              title="Accès rapide"
              description="Les pièces principales de L’Édifice : assistant, atelier, publications, observatoire et ressources."
            />
            <ModuleGrid modules={cockpitModules} />
          </SectionContainer>

          <DemoReviewerAgent />

          {isProjectOwner ? (
            <section className="rounded-lg border border-[#1D2A44] bg-[#0B1420] p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
                    Interface locale Streamlit
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                    Cockpit local propriétaire
                  </h2>
                  <p className="mt-3 leading-7 text-[#A7B0C0]">
                    Ouvre le cockpit local Streamlit lorsque celui-ci est lancé
                    sur cette machine.
                  </p>
                  <p className="mt-3 rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-3 text-sm font-semibold text-[#39E6D0]">
                    Disponible uniquement en local. Non accessible aux
                    reviewers externes.
                  </p>
                </div>
                <a
                  href="http://localhost:8501"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-md border border-[#39E6D0]/50 bg-[#08111A] px-5 py-3 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#1D2A44] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Ouvrir l&apos;interface locale
                </a>
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <SectionContainer>
            <CockpitHeader
              eyebrow="Observatoire"
              title="Signaux, alertes et état"
              description="Première base d'observation du cockpit. Les signaux live viendront plus tard."
              status="Experimental"
            />
            <LogPanel logs={overviewLogs} title="Signaux récents" />
          </SectionContainer>

          <SectionContainer>
            <CockpitHeader
              eyebrow="Espace intérieur"
              title="Espace intérieur"
              description="Vision du jour, routines, énergie, notes et objectifs seront ajoutés en version légère."
              status="Experimental"
            />
            <div className="grid gap-3 text-sm text-[#A7B0C0]">
              <p>Vision du jour : à définir.</p>
              <p>Tâches : pipeline cockpit web.</p>
              <p>Notes rapides : progression locale, sans casser les garde-fous.</p>
            </div>
          </SectionContainer>
        </div>
      </div>
    </div>
  );
}
