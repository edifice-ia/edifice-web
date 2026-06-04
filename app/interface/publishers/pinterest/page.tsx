import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { EmptyState } from "@/components/cockpit/EmptyState";
import { LogPanel } from "@/components/cockpit/LogPanel";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import {
  readPinterestWorkshopIndexes,
  type PinterestLocalIndexFile,
  type PinterestWorkshopItem,
  type PinterestWorkshopStatus,
} from "@/lib/pinterestLocalIndexes";

export const metadata: Metadata = {
  title: "Atelier Pinterest - L'Edifice",
};

export const dynamic = "force-dynamic";

const statusLabels: Record<PinterestWorkshopStatus, string> = {
  generated: "genere",
  visual_ready: "visuel pret",
  ready_to_publish: "pret a publier",
  dry_run: "dry-run",
  published: "publie",
  error: "erreur",
};

const statusClasses: Record<PinterestWorkshopStatus, string> = {
  generated: "border-[#7DD3FC]/35 bg-[#7DD3FC]/10 text-[#7DD3FC]",
  visual_ready: "border-[#39E6D0]/35 bg-[#39E6D0]/10 text-[#39E6D0]",
  ready_to_publish: "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC]",
  dry_run: "border-[#FACC15]/35 bg-[#FACC15]/10 text-[#FDE68A]",
  published: "border-[#A78BFA]/35 bg-[#A78BFA]/10 text-[#C4B5FD]",
  error: "border-[#F97316]/35 bg-[#F97316]/10 text-[#FDBA74]",
};

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

function StatusPills({ badges }: { badges: PinterestWorkshopStatus[] }) {
  if (badges.length === 0) {
    return (
      <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#A7B0C0]">
        en attente
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge}
          className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusClasses[badge]}`}
        >
          {statusLabels[badge]}
        </span>
      ))}
    </div>
  );
}

function DisabledActions() {
  const actions = ["Publier", "Planifier", "Regenerer visuel"];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          disabled
          title="Bientot disponible"
          className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-1.5 text-xs font-semibold text-[#64748B] opacity-70"
        >
          {action}
        </button>
      ))}
    </div>
  );
}

function PinRow({ item }: { item: PinterestWorkshopItem }) {
  return (
    <article className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
            {item.accountName} / {item.postId}
          </p>
          <h3 className="mt-2 text-base font-semibold text-[#F8FAFC]">
            {item.title || "Pin sans titre"}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#A7B0C0]">
            {item.description || item.theme || "Description absente de l'index."}
          </p>
        </div>
        <StatusPills badges={item.badges} />
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[#64748B]">
            Tableau
          </p>
          <p className="mt-1 text-[#F8FAFC]">{item.boardName || "Non renseigne"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[#64748B]">
            Visuel
          </p>
          <p className="mt-1 break-all text-[#F8FAFC]">
            {item.finalPinFilename || item.selectedVisualFilename || "Non synchronise"}
          </p>
          <p className="mt-1 break-all font-mono text-xs leading-5 text-[#64748B]">
            {item.finalPinPath || item.selectedVisualPath || "Chemin image absent"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[#64748B]">
            Programmation
          </p>
          <p className="mt-1 text-[#F8FAFC]">
            {item.scheduledDate
              ? `${item.scheduledDate} ${item.scheduledTime || ""}`.trim()
              : "Non planifie"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-[#1D2A44] pt-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs text-[#64748B]">
          Statut publication :{" "}
          <span className="font-semibold text-[#A7B0C0]">
            {item.publishStatus || "non place en file"}
          </span>
        </p>
        <DisabledActions />
      </div>
    </article>
  );
}

function QueueTable({ items }: { items: PinterestWorkshopItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.14em] text-[#64748B]">
            <th className="px-3 py-2">Pin</th>
            <th className="px-3 py-2">Compte</th>
            <th className="px-3 py-2">Tableau</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Statut</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="bg-[#03070B] text-[#A7B0C0]">
              <td className="rounded-l-md border-y border-l border-[#1D2A44] px-3 py-3">
                <p className="font-semibold text-[#F8FAFC]">{item.title}</p>
                <p className="mt-1 text-xs text-[#64748B]">{item.postId}</p>
              </td>
              <td className="border-y border-[#1D2A44] px-3 py-3">
                {item.accountName}
              </td>
              <td className="border-y border-[#1D2A44] px-3 py-3">
                {item.boardName || "Non renseigne"}
              </td>
              <td className="border-y border-[#1D2A44] px-3 py-3">
                {item.scheduledDate
                  ? `${item.scheduledDate} ${item.scheduledTime || ""}`.trim()
                  : "Non planifie"}
              </td>
              <td className="rounded-r-md border-y border-r border-[#1D2A44] px-3 py-3">
                <StatusPills badges={item.badges} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndexFileCard({ indexFile }: { indexFile: PinterestLocalIndexFile }) {
  return (
    <div className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#F8FAFC]">{indexFile.label}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#64748B]">
            format {indexFile.format} / {indexFile.exists ? "detecte" : "absent"} /{" "}
            {indexFile.source}
          </p>
        </div>
        <span className="rounded-md border border-[#39E6D0]/35 bg-[#39E6D0]/10 px-2 py-1 text-xs font-semibold text-[#39E6D0]">
          {indexFile.count}
        </span>
      </div>
      <p className="mt-3 break-all font-mono text-xs leading-5 text-[#A7B0C0]">
        {indexFile.path}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#64748B]">
        Champs : {indexFile.fields.length > 0 ? indexFile.fields.join(", ") : "aucun"}
      </p>
      {indexFile.lastError ? (
        <p className="mt-2 rounded-md border border-[#F97316]/30 bg-[#F97316]/10 px-2 py-1.5 text-xs leading-5 text-[#FDBA74]">
          Derniere erreur : {indexFile.lastError}
        </p>
      ) : null}
    </div>
  );
}

export default async function PinterestPublisherPage() {
  const pinterest = await readPinterestWorkshopIndexes();
  const logs = [
    {
      timestamp: "local",
      type: "system" as const,
      message: pinterest.sourceAvailable
        ? "Index Pinterest locaux lus en lecture seule."
        : "Aucun index Pinterest synchronise pour le moment.",
      status: pinterest.sourceAvailable ? ("Disponible" as const) : ("En migration" as const),
    },
    {
      timestamp: "guard",
      type: "security" as const,
      message: "Aucune publication reelle, aucun agent local lance depuis cette page.",
      status: "A securiser" as const,
    },
  ];

  return (
    <div>
      <CockpitHeader
        eyebrow="Pinterest"
        title="Atelier Pinterest"
        description="Cockpit de pilotage des agents Pinterest locaux."
        status={pinterest.sourceAvailable ? "Disponible" : "En migration"}
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
            label="Pins prets a publier"
            value={pinterest.stats.pinsReadyToPublish}
            detail="Pins finaux crees dans l'index local."
          />
          <StatCard
            label="En attente publication"
            value={pinterest.stats.pinsPendingPublication}
            detail="Elements en file avec statut ready_to_publish."
          />
        </div>

        {!pinterest.sourceAvailable ? (
          <SectionContainer>
            <EmptyState
              title="Aucun index Pinterest synchronise pour le moment."
              description="La page reste disponible en lecture seule et attend un snapshot des index locaux produits par les agents Pinterest."
            />
          </SectionContainer>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <SectionContainer>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                    Pins prets
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                    Pins finalises par les agents locaux
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                    Vue limitee aux index deja produits, sans generation ni publication.
                  </p>
                </div>
                <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                  {pinterest.indexes.finalPins} index
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {pinterest.readyPins.slice(0, 12).map((item) => (
                  <PinRow key={item.id} item={item} />
                ))}
                {pinterest.readyPins.length === 0 ? (
                  <EmptyState
                    title="Aucun pin pret detecte"
                    description="Les index existent peut-etre, mais aucun pin final pret n'a ete normalise pour l'instant."
                  />
                ) : null}
              </div>
            </SectionContainer>

            <SectionContainer>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                    File de publication
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
                    Publication Pinterest locale
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                    Statuts issus de publishing_queue, affiches sans action reelle.
                  </p>
                </div>
                <span className="rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                  {pinterest.indexes.publishingQueue} lignes
                </span>
              </div>

              <div className="mt-4">
                {pinterest.publicationQueue.length > 0 ? (
                  <QueueTable items={pinterest.publicationQueue.slice(0, 18)} />
                ) : (
                  <EmptyState
                    title="File de publication vide"
                    description="Aucun publishing_queue local n'a ete trouve ou normalise."
                  />
                )}
              </div>
            </SectionContainer>
          </div>

          <div className="space-y-6">
            <SectionContainer>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                Index locaux
              </p>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                Fichiers reels lus dans D:\Edifice_IA, sans modification.
              </p>
              <div className="mt-4 grid gap-3">
                {pinterest.indexFiles.map((indexFile) => (
                  <IndexFileCard key={indexFile.key} indexFile={indexFile} />
                ))}
              </div>
              <p className="mt-4 text-xs leading-6 text-[#64748B]">
                Lecture locale uniquement. Les agents restent dans D:\Edifice_IA.
              </p>
            </SectionContainer>

            <SectionContainer>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#39E6D0]">
                Actions futures
              </p>
              <div className="mt-4 grid gap-2">
                <DisabledActions />
              </div>
              <p className="mt-4 text-sm leading-6 text-[#A7B0C0]">
                Bientot disponible apres synchronisation controlee des agents locaux.
              </p>
            </SectionContainer>

            <LogPanel logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}
