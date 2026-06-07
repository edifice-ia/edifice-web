import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { ModuleGrid } from "@/components/cockpit/ModuleGrid";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { publisherModules } from "@/lib/cockpit/modules";

export const metadata: Metadata = {
  title: "Publications - L'Edifice",
};

export default function PublishersPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Publications"
        title="Publications"
        description="Publier depuis des contenus deja prepares. Les ateliers de creation restent separes."
        status="En migration"
      />
      <SectionContainer>
        <ModuleGrid modules={publisherModules} />
      </SectionContainer>
    </div>
  );
}
