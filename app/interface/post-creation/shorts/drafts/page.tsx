import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SafetyModeBadge } from "@/components/cockpit/SafetyModeBadge";
import { ContentWorkshopClient } from "../../ContentWorkshopClient";
import { ShortsSubmoduleNav } from "../ShortsSubmoduleNav";

export const metadata: Metadata = {
  title: "Brouillons Shorts - L'Edifice",
};

export default function ShortsDraftsPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu > Shorts"
        title="Brouillons Shorts"
        description="Creer, editer et valider le texte avant de passer aux visuels et a la voix."
        status="En migration"
      />

      <div className="mb-6">
        <SafetyModeBadge />
      </div>

      <ShortsSubmoduleNav active="drafts" />
      <ContentWorkshopClient />
    </div>
  );
}
