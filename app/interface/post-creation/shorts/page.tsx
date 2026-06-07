import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SafetyModeBadge } from "@/components/cockpit/SafetyModeBadge";
import { ContentWorkshopClient } from "../ContentWorkshopClient";

export const metadata: Metadata = {
  title: "Atelier Shorts - L'Edifice",
};

export default function ShortsWorkshopPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu > Shorts"
        title="Atelier Shorts"
        description="Generer, scorer, corriger et preparer des brouillons pour formats courts. La publication reste separee."
        status="En migration"
      />

      <div className="mb-6">
        <SafetyModeBadge />
      </div>

      <ContentWorkshopClient />
    </div>
  );
}
