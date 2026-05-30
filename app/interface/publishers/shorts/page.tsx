import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { ModuleGrid } from "@/components/cockpit/ModuleGrid";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { TikTokConnectionControls } from "@/components/cockpit/TikTokConnectionControls";
import type { CockpitModule } from "@/types/cockpit";

export const metadata: Metadata = {
  title: "Reseaux courts - L’Édifice",
};

const shortNetworks: CockpitModule[] = [
  {
    id: "shorts-tiktok",
    title: "TikTok",
    description: "Non migre, a securiser avant tout branchement.",
    href: "/interface/publishers/shorts",
    status: "A securiser",
  },
  {
    id: "shorts-instagram",
    title: "Instagram",
    description: "Non migre, publication reelle bloquee par defaut.",
    href: "/interface/publishers/shorts",
    status: "A securiser",
  },
  {
    id: "shorts-meta",
    title: "Meta",
    description: "OAuth et permissions a traiter plus tard.",
    href: "/interface/publishers/shorts",
    status: "Plus tard",
  },
];

export default function ShortsPublisherPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Reseaux courts"
        title="TikTok, Instagram et Meta"
        description="Module interne aux Publications. Ces reseaux ne sont pas des modules principaux et aucune publication reelle n'est activee."
        status="A securiser"
      />
      <SectionContainer>
        <ModuleGrid modules={shortNetworks} />
      </SectionContainer>

      <SectionContainer className="mt-6">
        <CockpitHeader
          eyebrow="TikTok Sandbox"
          title="Test upload Sandbox"
          description="Envoie une video de test vers TikTok Sandbox avec le token stocke cote serveur. Aucun token, refresh token ou client secret n'est affiche."
          status="Review"
        />
        <TikTokConnectionControls />
      </SectionContainer>
    </div>
  );
}
