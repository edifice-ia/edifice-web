import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { PinterestLibrary } from "@/components/pinterest/PinterestLibrary";
import { readPinterestWorkshopIndexes } from "@/lib/pinterestLocalIndexes";

export const metadata: Metadata = {
  title: "Atelier Pinterest - L'Edifice",
};

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-[#1D2A44] bg-[#08111A] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-[#F8FAFC]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">{detail}</p>
    </div>
  );
}

export default async function PinterestWorkshopPage() {
  const pinterest = await readPinterestWorkshopIndexes();
  const dataSourceLabel =
    pinterest.dataSource === "supabase" ? "Supabase" : "Snapshot local";
  const logs = [
    {
      timestamp: "atelier",
      type: "system" as const,
      message: pinterest.sourceAvailable
        ? `Pinterest lu depuis ${dataSourceLabel} pour preparation de contenu.`
        : "Aucun index Pinterest synchronise pour le moment.",
      status: "Configure" as const,
    },
    {
      timestamp: "guard",
      type: "security" as const,
      message: "Aucune publication Pinterest n'est disponible depuis l'atelier.",
      status: "Actif" as const,
    },
  ];

  return (
    <div>
      <CockpitHeader
        eyebrow="Atelier de contenu > Pinterest"
        title="Atelier Pinterest"
        description="Creer, verifier, scorer et preparer les pins, visuels et brouillons Pinterest avant passage au Publisher."
        status="Configure"
      />

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Posts generes"
            value={pinterest.stats.postsGenerated}
            detail="Lignes detectees dans posts_queue."
          />
          <StatCard
            label="Pins avec visuels"
            value={pinterest.stats.pinsWithVisuals}
            detail="Associations exactes, fallback ou generees."
          />
          <StatCard
            label="Pins prets"
            value={pinterest.stats.pinsReadyToPublish}
            detail="Pins finalises avant publication."
          />
          <StatCard
            label="En file"
            value={pinterest.stats.pinsPendingPublication}
            detail="Preparation locale, sans publication."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SectionContainer>
            {pinterest.sourceAvailable ? (
              <PinterestLibrary
                accounts={pinterest.accounts}
                initialAccountId={pinterest.accounts[0]?.id ?? null}
              />
            ) : (
              <EmptyState
                title="Aucun index Pinterest synchronise"
                description="Synchronise les pins depuis les agents locaux avant de les preparer ici."
              />
            )}
          </SectionContainer>
          <div className="grid content-start gap-6">
            <SectionContainer>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                Role de cette page
              </p>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-[#A7B0C0]">
                <p>Preparation editoriale et visuelle uniquement.</p>
                <p>Validation, correction et scoring avant publication.</p>
                <p>Publication deplacee dans Publications &gt; Pinterest Publisher.</p>
              </div>
            </SectionContainer>
            <LogPanel logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}
