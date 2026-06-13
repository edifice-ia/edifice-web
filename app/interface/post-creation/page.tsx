import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { ModuleGrid } from "@/components/cockpit/ModuleGrid";
import { SafetyModeBadge } from "@/components/cockpit/SafetyModeBadge";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import type { CockpitModule } from "@/types/cockpit";

export const metadata: Metadata = {
  title: "Atelier de contenu - L'Edifice",
};

const workshopModules: CockpitModule[] = [
  {
    id: "content-workshop-shorts",
    title: "Shorts",
    description:
      "Creation, generation, scoring et correction de brouillons pour formats courts.",
    href: "/interface/post-creation/shorts/drafts",
    status: "En migration",
    accent: "blue",
  },
  {
    id: "content-workshop-pinterest",
    title: "Pinterest",
    description:
      "Pins, visuels, brouillons, validations et preparation avant publication.",
    href: "/interface/post-creation/pinterest",
    status: "En migration",
    accent: "jade",
  },
];

export default function PostCreationPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu"
        title="Atelier de contenu"
        description="Creer, generer, scorer, corriger et preparer les contenus. Aucune publication n'est lancee depuis l'atelier."
        status="En migration"
      />

      <div className="mb-6">
        <SafetyModeBadge />
      </div>

      <SectionContainer>
        <ModuleGrid modules={workshopModules} />
      </SectionContainer>
    </div>
  );
}
