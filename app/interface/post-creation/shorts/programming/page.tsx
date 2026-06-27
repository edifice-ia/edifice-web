import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SafetyModeBadge } from "@/components/cockpit/SafetyModeBadge";
import { ShortsSubmoduleNav } from "../ShortsSubmoduleNav";
import { ShortsProgrammingClient } from "./ShortsProgrammingClient";

export const metadata: Metadata = {
  title: "Programmation & Publication Shorts - L'Edifice",
};

export default function ShortsProgrammingPage() {
  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu > Shorts"
        title="Programmation & Publication"
        description="Planifier les videos validees. La publication reelle reste separee et desactivee."
        status="Operationnel"
      />

      <div className="mb-6">
        <SafetyModeBadge />
      </div>

      <ShortsSubmoduleNav active="programming" />
      <ShortsProgrammingClient />
    </div>
  );
}
