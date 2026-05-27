import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { StatusBadge } from "@/components/cockpit/StatusBadge";

export const metadata: Metadata = {
  title: "Observatoire - L’Édifice",
};

const logs = [
  {
    timestamp: "12:00",
    type: "system" as const,
    message: "Signaux statiques préparés.",
    status: "Experimental" as const,
  },
  {
    timestamp: "12:04",
    type: "agent" as const,
    message: "Observation live non migrée.",
    status: "Local uniquement" as const,
  },
  {
    timestamp: "12:08",
    type: "api" as const,
    message: "Coûts IA: repère sans données réelles.",
    status: "Plus tard" as const,
  },
];

export default function MonitoringPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Observatoire"
        title="Signaux, alertes et état du système"
        description="Un observatoire de fondation pour lire l'état du cockpit sans déclencher d'action sensible."
        status="Experimental"
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionContainer>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Points de vigilance
          </h2>
          <div className="mt-4 grid gap-3">
            {[
              ["Supabase Auth", "Disponible"],
              ["Agents locaux", "Local uniquement"],
              ["Connexions externes", "A securiser"],
              ["Coûts IA", "Plus tard"],
            ].map(([label, status]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-md border border-[#1D2A44] bg-[#08111A] p-3"
              >
                <span className="text-[#F8FAFC]">{label}</span>
                <StatusBadge
                  status={
                    status as
                      | "Disponible"
                      | "Local uniquement"
                      | "A securiser"
                      | "Plus tard"
                  }
                />
              </div>
            ))}
          </div>
        </SectionContainer>
        <LogPanel logs={logs} title="Signaux récents" />
      </div>
    </div>
  );
}
