import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { InstagramPublishTestPanel } from "@/components/cockpit/InstagramPublishTestPanel";
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
    description: "Test publication Instagram disponible via Graph API.",
    href: "/instagram-publish-test",
    status: "Review",
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
        <div className="mt-4 rounded-md border border-[#1D2A44] bg-[#08111A] p-4">
          <div className="flex flex-wrap gap-3">
            <a
              href="/instagram-publish-test"
              className="inline-flex rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#111D2E] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Test publication Instagram
            </a>
            <a
              href="/youtube-upload-test"
              className="inline-flex rounded-md border border-[#38BDF8]/50 bg-[#38BDF8]/10 px-4 py-2 text-sm font-semibold text-[#7DD3FC] transition hover:bg-[#111D2E] hover:text-[#F8FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Test upload YouTube
            </a>
          </div>
        </div>
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

      <SectionContainer className="mt-6">
        <CockpitHeader
          eyebrow="Instagram Publish Test"
          title="Test publication Instagram"
          description="Controle le token Meta, le compte Instagram Business associe et le resultat de publication test. Aucun token ni secret n'est affiche."
          status="Review"
        />
        <InstagramPublishTestPanel />
      </SectionContainer>
    </div>
  );
}
