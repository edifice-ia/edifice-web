import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SafetyModeBadge } from "@/components/cockpit/SafetyModeBadge";
import { ShortsSubmoduleNav } from "../ShortsSubmoduleNav";
import { ShortsVisualsClient } from "./ShortsVisualsClient";

export const metadata: Metadata = {
  title: "Visuels Shorts - L'Edifice",
};

export default function ShortsVisualsPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu > Shorts"
        title="Visuels Shorts"
        description="Choisir un brouillon, consulter ses prompts et piloter uniquement ses visuels."
        status="En migration"
      />

      <div className="mb-6">
        <SafetyModeBadge />
      </div>

      <ShortsSubmoduleNav active="visuals" />
      <ShortsVisualsClient />
    </div>
  );
}
