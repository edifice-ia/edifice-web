import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { PinterestPublisherClient } from "@/components/pinterest/PinterestPublisherClient";
import {
  getPinterestPublisherDiagnostic,
  readPinterestPublisherBoards,
  readPinterestPublisherPins,
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
  const [pins, boards] = await Promise.all([
    readPinterestPublisherPins(),
    readPinterestPublisherBoards(),
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
          {pins.length > 0 ? (
            <PinterestPublisherClient initialPins={pins} boards={boards} />
          ) : (
            <EmptyState
              title="Aucun pin synchronise"
              description="Synchronise d'abord les pins Pinterest prets depuis l'atelier avant de publier."
            />
          )}
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
          <SectionContainer>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
              Diagnostic Pinterest API
            </p>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-[#A7B0C0]">
              <p>
                Statut:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {diagnostic.environmentLabel}
                </span>
              </p>
              <p>
                Environment detecte:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {diagnostic.environment}
                </span>
              </p>
              <p>
                Access level detecte:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {diagnostic.accessLevel}
                </span>
              </p>
              <p className="break-all">
                API URL utilisee:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {diagnostic.apiBaseUrl}
                </span>
              </p>
              <p className="break-all">
                URL creation Pin:{" "}
                <span className="font-semibold text-[#F8FAFC]">
                  {diagnostic.createPinUrl}
                </span>
              </p>
              <p
                className={
                  diagnostic.createPinsCompatible
                    ? "text-[#39E6D0]"
                    : "text-[#fbbf24]"
                }
              >
                {diagnostic.compatibilityMessage}
              </p>
            </div>
          </SectionContainer>
          <LogPanel logs={logs} />
        </div>
      </div>
    </div>
  );
}
