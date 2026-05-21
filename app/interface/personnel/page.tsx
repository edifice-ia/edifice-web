import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

export const metadata: Metadata = {
  title: "Espace personnel - L'Edifice",
};

export default function PersonnelPage() {
  const blocks = [
    "Vision du jour",
    "Taches",
    "Routines",
    "Habitudes",
    "Notes rapides",
    "Objectifs",
    "Statistiques personnelles simples",
    "Calendrier placeholder",
    "Strava placeholder",
  ];

  return (
    <div>
      <CockpitHeader
        eyebrow="Espace personnel"
        title="Espace personnel leger"
        description="Version simple pour suivre routines, objectifs et notes rapides sans creer un clone Notion ni backend lourd."
        status="Experimental"
      />
      <SectionContainer>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {blocks.map((block) => (
            <div
              key={block}
              className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
            >
              <p className="font-semibold text-[#F8FAFC]">{block}</p>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                Placeholder volontairement leger.
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <EmptyState
            title="Aucune donnee personnelle connectee"
            description="Les donnees personnelles resteront simples, explicites et separees des workflows critiques."
          />
        </div>
      </SectionContainer>
    </div>
  );
}
