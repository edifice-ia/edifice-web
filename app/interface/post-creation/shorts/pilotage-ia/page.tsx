import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SafetyModeBadge } from "@/components/cockpit/SafetyModeBadge";
import { ShortsSubmoduleNav } from "../ShortsSubmoduleNav";
import { ShortsPilotageClient } from "./ShortsPilotageClient";

export const metadata: Metadata = {
  title: "Pilotage IA Shorts - L'Edifice",
};

export default function ShortsPilotagePage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu > Shorts"
        title="Pilotage IA"
        description="Orchestration en lecture controlee pour analyser les brouillons, proposer les prochaines actions et preparer un planning sans publication automatique."
        status="Experimental"
      />

      <div className="mb-6">
        <SafetyModeBadge />
      </div>

      <ShortsSubmoduleNav active="pilotage" />
      <ShortsPilotageClient />
    </div>
  );
}
