import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { ProjectMemorySnapshotControl } from "@/components/cockpit/ProjectMemorySnapshotControl";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import {
  getProjectStateMemoryStatus,
  readProjectMemoryEntries,
} from "@/lib/server/project-memory";

export const metadata: Metadata = {
  title: "Memoire projet - L'Edifice",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function ProjectMemoryPage() {
  const result = await readProjectMemoryEntries()
    .then((entries) => ({ entries, error: null as string | null }))
    .catch((error) => ({
      entries: [],
      error:
        error instanceof Error
          ? error.message
          : "Lecture memoire projet indisponible.",
    }));
  const snapshot = await getProjectStateMemoryStatus()
    .then((status) => ({ status, error: null as string | null }))
    .catch((error) => ({
      status: null,
      error:
        error instanceof Error
          ? error.message
          : "Statut memoire projet indisponible.",
    }));

  return (
    <div>
      <CockpitHeader
        eyebrow="Ressources > Memoire projet"
        title="Memoire projet"
        description="Etat durable du cockpit, mis a jour uniquement apres confirmation explicite de Vincent."
        status="Experimental"
      />

      {result.error ? (
        <div className="mb-6 rounded-md border border-[#f87171]/40 bg-[#f87171]/10 px-4 py-3 text-sm text-[#fecaca]">
          {result.error}
        </div>
      ) : null}

      {snapshot.error ? (
        <div className="mb-6 rounded-md border border-[#f87171]/40 bg-[#f87171]/10 px-4 py-3 text-sm text-[#fecaca]">
          {snapshot.error}
        </div>
      ) : null}

      <div className="mb-6">
        <ProjectMemorySnapshotControl
          initialLastUpdatedAt={snapshot.status?.lastUpdatedAt ?? null}
          initialState={snapshot.status?.state ?? "needs_update"}
        />
      </div>

      <SectionContainer>
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
              Entrees
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
              Clefs suivies par l&apos;assistant
            </h2>
          </div>
          <p className="text-sm text-[#A7B0C0]">
            {result.entries.length} entree(s)
          </p>
        </div>

        <div className="grid gap-3">
          {result.entries.length ? (
            result.entries.map((entry) => (
              <article
                className="min-w-0 overflow-hidden rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
                key={entry.id}
              >
                <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_150px]">
                  <Field label="Cle" value={entry.key ?? "ancienne entree"} />
                  <Field label="Titre" value={entry.title} />
                  <Field label="Statut" value={entry.status ?? "non renseigne"} />
                  <Field label="Source" value={entry.source ?? "non renseignee"} />
                </div>
                <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
                  <Field label="Valeur" value={entry.value ?? entry.content ?? "-"} />
                  <Field label="Categorie" value={entry.category ?? "-"} />
                  <Field label="Derniere mise a jour" value={formatDate(entry.updatedAt)} />
                </div>
                {entry.content && entry.content !== entry.value ? (
                  <details className="mt-3 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-semibold text-[#39E6D0]">
                      Voir le detail
                    </summary>
                    <pre className="mt-3 max-h-80 min-w-0 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[#A7B0C0]">
                      {entry.content}
                    </pre>
                  </details>
                ) : null}
              </article>
            ))
          ) : (
            <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-4 py-5 text-sm text-[#A7B0C0]">
              Aucune entree memoire pour l&apos;instant.
            </p>
          )}
        </div>
      </SectionContainer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
        {label}
      </p>
      <p className="mt-1 truncate whitespace-nowrap text-sm text-[#F8FAFC]" title={value}>
        {value}
      </p>
    </div>
  );
}
