"use client";

import { useMemo, useState } from "react";
import type { ConstructionJournalEntry, ProjectMemoryEntry } from "@/types/cockpit";
import { SectionContainer } from "./SectionContainer";

type JournalDraft = Omit<ConstructionJournalEntry, "id">;

const emptyDraft: JournalDraft = {
  date: "",
  action: "",
  decision: "",
  blocker: "",
  nextStep: "",
};

export function ConstructionJournal({
  initialEntries,
}: {
  initialEntries: ProjectMemoryEntry[];
}) {
  const [entries, setEntries] = useState<ProjectMemoryEntry[]>(initialEntries);
  const [draft, setDraft] = useState<JournalDraft>({
    ...emptyDraft,
    date: new Date().toISOString().slice(0, 10),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      draft.date.trim() &&
      draft.action.trim() &&
      draft.decision.trim() &&
      draft.nextStep.trim(),
    [draft],
  );

  function updateDraft(field: keyof JournalDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || isSaving) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const content = [
      `Date: ${draft.date}`,
      `Action realisee: ${draft.action.trim()}`,
      `Decision prise: ${draft.decision.trim()}`,
      draft.blocker?.trim() ? `Blocage eventuel: ${draft.blocker.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("/api/project-memory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "journal",
        status: draft.blocker?.trim() ? "bloque" : "en cours",
        title: draft.action.trim(),
        content,
        nextAction: draft.nextStep.trim(),
        priority: draft.blocker?.trim() ? "haute" : "moyenne",
        source: "Journal de chantier",
      }),
    });

    const payload = (await response.json()) as {
      entry?: ProjectMemoryEntry;
      error?: string;
    };

    if (!response.ok || !payload.entry) {
      setFeedback(payload.error ?? "Impossible d'ajouter l'entree.");
      setIsSaving(false);
      return;
    }

    setEntries((current) => [payload.entry!, ...current]);
    setDraft({
      ...emptyDraft,
      date: new Date().toISOString().slice(0, 10),
    });
    setFeedback("Entree ajoutee a la memoire projet.");
    setIsSaving(false);
  }

  return (
    <SectionContainer>
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#39E6D0]">
          Journal de chantier
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[#F8FAFC]">
          Ajouter une entr&eacute;e
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <label className="grid gap-2 text-sm font-semibold text-[#F8FAFC]">
          Date
          <input
            type="date"
            value={draft.date}
            onChange={(event) => updateDraft("date", event.target.value)}
            className="min-h-11 rounded-md border border-[#1D2A44] bg-[#03070B] px-3 text-sm text-[#F8FAFC]"
          />
        </label>

        <JournalField
          label={"Action r\u00e9alis\u00e9e"}
          value={draft.action}
          onChange={(value) => updateDraft("action", value)}
        />
        <JournalField
          label="Decision prise"
          value={draft.decision}
          onChange={(value) => updateDraft("decision", value)}
        />
        <JournalField
          label={"Blocage \u00e9ventuel"}
          value={draft.blocker ?? ""}
          onChange={(value) => updateDraft("blocker", value)}
          required={false}
        />
        <JournalField
          label={"Prochaine \u00e9tape"}
          value={draft.nextStep}
          onChange={(value) => updateDraft("nextStep", value)}
        />

        <button
          type="submit"
          disabled={!canSubmit || isSaving}
          className="mt-1 min-h-11 rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/15 disabled:border-[#1D2A44] disabled:bg-[#08111A] disabled:text-[#64748b]"
        >
          {isSaving ? "Ajout en cours" : "Ajouter au journal"}
        </button>
      </form>

      {feedback ? (
        <p className="mt-3 rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#A7B0C0]">
          {feedback}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3">
        {entries.length === 0 ? (
          <p className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-2 text-sm text-[#A7B0C0]">
            Aucune entree persistante pour le moment.
          </p>
        ) : null}
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-sm text-[#39E6D0]">
                {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-[#A7B0C0]">
                {entry.source ?? "project_memory"}
              </p>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <JournalLine label="Titre" value={entry.title} />
              {entry.content ? (
                <JournalLine label="Contenu" value={entry.content} />
              ) : null}
              {entry.status ? (
                <JournalLine label="Statut" value={entry.status} />
              ) : null}
              {entry.priority ? (
                <JournalLine label="Priorite" value={entry.priority} />
              ) : null}
              {entry.nextAction ? (
                <JournalLine
                  label={"Prochaine \u00e9tape"}
                  value={entry.nextAction}
                />
              ) : null}
            </dl>
          </article>
        ))}
      </div>
    </SectionContainer>
  );
}

function JournalField({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#F8FAFC]">
      {label}
      <textarea
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        className="min-h-20 resize-y rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm font-normal leading-6 text-[#F8FAFC]"
      />
    </label>
  );
}

function JournalLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A7B0C0]">
        {label}
      </dt>
      <dd className="mt-1 leading-6 text-[#F8FAFC]">{value}</dd>
    </div>
  );
}
