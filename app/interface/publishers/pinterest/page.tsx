import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { SectionContainer } from "@/components/cockpit/SectionContainer";

export const metadata: Metadata = {
  title: "Pinterest Publisher - L'Edifice",
};

const logs = [
  {
    timestamp: "12:00",
    type: "system" as const,
    message: "Espace Pinterest web prepare sans branchement de publication.",
    status: "En migration" as const,
  },
  {
    timestamp: "12:05",
    type: "security" as const,
    message: "Automation et API a valider avant toute action reelle.",
    status: "A securiser" as const,
  },
];

export default function PinterestPublisherPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Pinterest Publisher"
        title="Workflow Pinterest"
        description="Placeholder du futur espace Pinterest: preparation d'epingles, programmation, statut API, automation et logs futurs. La logique reelle n'est pas branchee ici."
        status="En migration"
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <SectionContainer>
          <EmptyState
            title="Pinterest non branche"
            description="Cette zone recevra l'apercu workflow, les brouillons d'epingles, la programmation future et les validations humaines."
          />
        </SectionContainer>
        <LogPanel logs={logs} />
      </div>
    </div>
  );
}
