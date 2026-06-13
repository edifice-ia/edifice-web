import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SafetyModeBadge } from "@/components/cockpit/SafetyModeBadge";
import { ShortsSubmoduleNav } from "../ShortsSubmoduleNav";
import { ShortsVoiceClient } from "./ShortsVoiceClient";

export const metadata: Metadata = {
  title: "Voix Shorts - L'Edifice",
};

export default function ShortsVoicePage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu > Shorts"
        title="Voix Shorts"
        description="Préparer le futur module audio par brouillon, sans connexion ElevenLabs pour l'instant."
        status="En migration"
      />

      <div className="mb-6">
        <SafetyModeBadge />
      </div>

      <ShortsSubmoduleNav active="voice" />
      <ShortsVoiceClient />
    </div>
  );
}
