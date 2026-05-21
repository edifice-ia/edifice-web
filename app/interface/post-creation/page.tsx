import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { ModuleGrid } from "@/components/cockpit/ModuleGrid";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import type { CockpitModule } from "@/types/cockpit";

export const metadata: Metadata = {
  title: "Creation de post - L'Edifice",
};

const contentTools: CockpitModule[] = [
  {
    id: "post-ideas",
    title: "Idees de posts",
    description: "Angles editoriaux, variations et pistes de contenus.",
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
    title: "Preparation multi-reseaux",
    description: "YouTube, Pinterest, TikTok et Instagram sans publication reelle.",
    href: "/interface/post-creation",
    status: "En migration",
  },
  {
    id: "post-prompts-audio",
    title: "Prompts et voix",
    description:
      "Bibliotheque de prompts et placeholders audio ElevenLabs pour plus tard.",
    href: "/interface/post-creation",
    status: "Plus tard",
  },
];

export default function PostCreationPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Creation de post"
        title="Preparation de contenus"
        description="Regroupe les anciens espaces Generation IA et Audio autour du workflow reel: idees, scripts, captions, hooks, prompts et preparation par plateforme."
        status="En migration"
      />
      <SectionContainer>
        <ModuleGrid modules={contentTools} />
        <div className="mt-6">
          <EmptyState
            title="Execution non branchee"
            description="Les appels IA, generations vocales et automatisations seront ajoutes plus tard avec validation, quotas, logs et controles de securite."
          />
        </div>
      </SectionContainer>
    </div>
  );
}
