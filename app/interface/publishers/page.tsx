import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { ModuleGrid } from "@/components/cockpit/ModuleGrid";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { publisherModules } from "@/lib/cockpit/modules";

export const metadata: Metadata = {
  title: "Publications - L’Édifice",
};

export default function PublishersPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Publications"
        title="Préparation des publications"
        description="Espace de préparation et validation des publications. YouTube reste conservé, Pinterest est préparé, et TikTok/Instagram sont regroupés dans Réseaux courts avec publication réelle bloquée."
        status="En migration"
      />
      <SectionContainer>
        <ModuleGrid modules={publisherModules} />
      </SectionContainer>
    </div>
  );
}
