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
        title="Hub de publication"
        description="Vue principale des publications. YouTube reste conserve, Pinterest est prepare, et TikTok/Instagram sont regroupes dans Reseaux courts avec publication reelle bloquee."
        status="En migration"
      />
      <SectionContainer>
        <ModuleGrid modules={publisherModules} />
      </SectionContainer>
    </div>
  );
}
