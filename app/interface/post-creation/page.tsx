import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { ModuleGrid } from "@/components/cockpit/ModuleGrid";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import type { CockpitModule } from "@/types/cockpit";

export const metadata: Metadata = {
  title: "Atelier de contenu - L’Édifice",
};

const contentTools: CockpitModule[] = [
  {
    id: "post-ideas",
    title: "Idées de contenus",
    description: "Angles éditoriaux, variations et pistes de contenus.",
    href: "/interface/post-creation",
    status: "En migration",
    accent: "jade",
  },
  {
    id: "post-scripts-hooks",
    title: "Scripts courts et hooks",
    description: "Scripts Shorts, accroches, captions et structures rapides.",
    href: "/interface/post-creation",
    status: "En migration",
  },
  {
    id: "post-platform-prep",
    title: "Préparation multi-réseaux",
    description: "YouTube, Pinterest, TikTok et Instagram sans publication réelle.",
    href: "/interface/post-creation",
    status: "En migration",
  },
  {
    id: "post-prompts-audio",
    title: "Prompts et voix",
    description:
      "Bibliothèque de prompts et placeholders audio ElevenLabs pour plus tard.",
    href: "/interface/post-creation",
    status: "Plus tard",
  },
];

export default function PostCreationPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu"
        title="Préparation des contenus"
        description="Un atelier pour poser les idées, écrire les scripts, préparer les formats et garder les publications sous validation."
        status="En migration"
      />
      <SectionContainer>
        <ModuleGrid modules={contentTools} />
        <div className="mt-6">
          <EmptyState
            title="Exécution non branchée"
            description="Les appels IA, générations vocales et automatisations seront ajoutés plus tard avec validation, quotas, signaux et garde-fous."
          />
        </div>
      </SectionContainer>
    </div>
  );
}
