import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

export const metadata: Metadata = {
  title: "Espace intérieur - L'Edifice",
};

export default function PersonnelPage() {
  const blocks = [
    "Vision du jour",
    "Tâches",
    "Routines",
    "Énergie",
    "Notes rapides",
    "Objectifs",
    "Repères personnels",
    "Calendrier placeholder",
    "Strava placeholder",
  ];

  return (
    <div>
      <CockpitHeader
        eyebrow="Espace intérieur"
        title="Espace intérieur léger"
        description="Un espace calme pour suivre routines, objectifs, énergie et notes rapides sans alourdir le cockpit."
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
                Placeholder volontairement léger.
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <EmptyState
            title="Aucune donnée intérieure connectée"
            description="Les données intérieures resteront simples, explicites et séparées des workflows critiques."
          />
        </div>
      </SectionContainer>
    </div>
  );
}
