import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

export const metadata: Metadata = {
  title: "YouTube Publisher - L'Edifice",
};

const logs = [
  {
    timestamp: "11:00",
    type: "api" as const,
    message: "API YouTube indiquee comme fonctionnelle cote projet local.",
    status: "Disponible" as const,
  },
  {
    timestamp: "11:03",
    type: "security" as const,
    message: "Aucune publication reelle branchee dans le cockpit web.",
    status: "A securiser" as const,
  },
];

export default function YoutubePublisherPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="YouTube Publisher"
        title="Workflow YouTube"
        description="Placeholder du workflow YouTube. L'API est connue comme fonctionnelle, mais l'upload/publication web reste a securiser avant activation."
        status="Disponible"
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <SectionContainer>
          <EmptyState
            title="Upload non branche"
            description="Cette zone recevra selection de fichiers, brouillons, validation humaine, puis publication controlee."
          />
        </SectionContainer>
        <LogPanel logs={logs} />
      </div>
    </div>
  );
}
