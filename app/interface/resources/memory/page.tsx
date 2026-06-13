import type { Metadata } from "next";
import { CockpitHeader } from "@/components/cockpit/CockpitHeader";
import { SectionContainer } from "@/components/cockpit/SectionContainer";
import { readProjectMemoryEntries } from "@/lib/server/project-memory";

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
                className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
                key={entry.id}
              >
                <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr_150px]">
                  <Field label="Cle" value={entry.key ?? "ancienne entree"} />
                  <Field label="Titre" value={entry.title} />
                  <Field label="Statut" value={entry.status ?? "non renseigne"} />
                  <Field label="Source" value={entry.source ?? "non renseignee"} />
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_180px]">
                  <Field label="Valeur" value={entry.value ?? entry.content ?? "-"} />
                  <Field label="Categorie" value={entry.category ?? "-"} />
                  <Field label="Derniere mise a jour" value={formatDate(entry.updatedAt)} />
                </div>
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
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[#F8FAFC]">{value}</p>
    </div>
  );
}
