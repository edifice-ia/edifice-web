import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SafetyModeBadge } from "@/components/cockpit/SafetyModeBadge";
import { ContentWorkshopClient } from "./ContentWorkshopClient";

export const metadata: Metadata = {
  title: "Atelier de contenu - L'Edifice",
};

export default function PostCreationPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu"
        title="Atelier de contenu"
        description="Generer un brouillon texte complet, puis le garder en brouillon Supabase avant validation humaine."
        status="En migration"
      />

      <div className="mb-6">
        <SafetyModeBadge />
      </div>

      <ContentWorkshopClient />
    </div>
  );
}
