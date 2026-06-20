import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SafetyModeBadge } from "@/components/cockpit/SafetyModeBadge";
import { ShortsSubmoduleNav } from "../ShortsSubmoduleNav";
import { ShortsVideoPreparationClient } from "./ShortsVideoPreparationClient";

export const metadata: Metadata = {
  title: "Preparer la video Shorts - L'Edifice",
};

export default function ShortsVideoPreparationPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu > Shorts"
        title="Preparer la video"
        description="Verifier les elements valides et preparer le manifest du futur montage."
        status="Operationnel"
      />

      <div className="mb-6">
        <SafetyModeBadge />
      </div>

      <ShortsSubmoduleNav active="video" />
      <ShortsVideoPreparationClient />
    </div>
  );
}
