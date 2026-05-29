import type { Metadata } from "next";
import { ConstructionJournal } from "@/components/cockpit/ConstructionJournal";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { ProjectMemoryPanel } from "@/components/cockpit/ProjectMemoryPanel";
import { ProjectObservatory } from "@/components/cockpit/ProjectObservatory";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { StatusBadge } from "@/components/cockpit/StatusBadge";
import { getLiveProjectMemory } from "@/lib/server/observatory/read-model";

export const metadata: Metadata = {
  title: "Observatoire - L'\u00c9difice",
};

const logs = [
  {
    timestamp: "12:00",
    type: "system" as const,
    message: "M\u00e9moire projet charg\u00e9e dans le cockpit.",
    status: "En cours" as const,
  },
  {
    timestamp: "12:04",
    type: "security" as const,
    message: "Garde-fous actifs: aucune publication r\u00e9elle d\u00e9clench\u00e9e.",
    status: "Operationnel" as const,
  },
  {
    timestamp: "12:08",
    type: "assistant" as const,
    message: "Prochaine pierre disponible depuis la m\u00e9moire projet.",
    status: "Review" as const,
  },
];

export default async function MonitoringPage() {
  const projectMemory = await getLiveProjectMemory();
  const reviewCount = projectMemory.observatoryItems.filter(
    (item) => item.status === "Review",
  ).length;

  return (
    <div>
      <CockpitHeader
        eyebrow="Observatoire"
        title="Observatoire projet"
        description={
          "Le cockpit de suivi de L'\u00c9difice: OAuth, agents, infrastructure, journal de chantier et prochaine pierre a poser."
        }
        status="En cours"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          [
            "Modules suivis",
            String(projectMemory.overview.totalModules),
            "En cours",
          ],
          [
            "Op\u00e9rationnels",
            String(projectMemory.overview.operational),
            "Operationnel",
          ],
          ["Bloqu\u00e9s", String(projectMemory.overview.blocked), "Bloque"],
          ["En review", String(reviewCount), "Review"],
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
                  status as
                    | "En cours"
                    | "Operationnel"
                    | "Bloque"
                    | "Review"
                }
              />
            </div>
          </SectionContainer>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <ProjectObservatory items={projectMemory.observatoryItems} />

        <aside className="space-y-6">
          <ProjectMemoryPanel
            cockpitRole={projectMemory.cockpitRole}
            safeguards={projectMemory.safeguards}
            nextRecommendedAction={projectMemory.nextRecommendedAction}
          />
          <ConstructionJournal />
          <LogPanel logs={logs} title={"Signaux r\u00e9cents"} />
        </aside>
      </div>
    </div>
  );
}
