import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { PinterestPublisherClient } from "@/components/pinterest/PinterestPublisherClient";
import {
  getPinterestPublisherDiagnostic,
  readPinterestPublisherBoards,
  readPinterestPublisherPins,
  readPinterestTokenDiagnostics,
} from "@/lib/server/pinterest-publisher";

export const metadata: Metadata = {
  title: "Pinterest Publisher - L'Edifice",
};

export const dynamic = "force-dynamic";

const logs = [
  {
    timestamp: "guard",
    type: "security" as const,
    message: "Publication limitee a un seul pin test avec confirmation humaine.",
    status: "Actif" as const,
  },
  {
    timestamp: "oauth",
    type: "api" as const,
    message: "Tokens Pinterest lus cote serveur par compte OAuth.",
    status: "Connecte" as const,
  },
];

export default async function PinterestPublisherPage() {
  const [pins, boards, tokenDiagnostics] = await Promise.all([
    readPinterestPublisherPins(),
    readPinterestPublisherBoards(),
    readPinterestTokenDiagnostics(),
  ]);
  const diagnostic = getPinterestPublisherDiagnostic();
  const readyPins = pins.filter((pin) => pin.status !== "published");

  return (
    <div>
      <CockpitHeader
        eyebrow="Publications > Pinterest"
        title="Pinterest Publisher"
        description="Publier uniquement des pins deja prepares, avec selection du compte OAuth et confirmation humaine."
        status="Actif"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SectionContainer>
          <PinterestPublisherClient
            initialPins={pins}
            boards={boards}
            initialDiagnostic={diagnostic}
            tokenDiagnostics={tokenDiagnostics}
          />
        </SectionContainer>

        <div className="grid content-start gap-6">
          <SectionContainer>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
              Garde-fous
            </p>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-[#A7B0C0]">
              <p>Publication automatique en masse desactivee.</p>
              <p>Le bouton publie exactement un pin, apres confirmation.</p>
              <p>Un echec conserve le statut courant et enregistre l&apos;erreur.</p>
            </div>
          </SectionContainer>
          <SectionContainer>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
              Etat
            </p>
            <div className="mt-4 grid gap-3 text-sm text-[#A7B0C0]">
              <p>Pins visibles: {pins.length}</p>
              <p>Non publies: {readyPins.length}</p>
              <p>Boards OAuth detectes: {boards.length}</p>
            </div>
          </SectionContainer>
          <LogPanel logs={logs} />
        </div>
      </div>
    </div>
  );
}
