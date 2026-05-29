"use client";

import { useEffect, useMemo, useState } from "react";
import { constructionJournalSeed } from "@/lib/cockpit/observatory";
import type { ConstructionJournalEntry } from "@/types/cockpit";
import { SectionContainer } from "./SectionContainer";

const storageKey = "edifice-construction-journal";

type JournalDraft = Omit<ConstructionJournalEntry, "id">;

const emptyDraft: JournalDraft = {
  date: "",
  action: "",
  decision: "",
  blocker: "",
  nextStep: "",
};

export function ConstructionJournal() {
  const [entries, setEntries] = useState<ConstructionJournalEntry[]>(
    constructionJournalSeed,
  );
  const [draft, setDraft] = useState<JournalDraft>(emptyDraft);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        try {
          setEntries(JSON.parse(stored) as ConstructionJournalEntry[]);
        } catch {
          setEntries(constructionJournalSeed);
        }
      }

      setDraft((current) => ({
        ...current,
        date: current.date || new Date().toISOString().slice(0, 10),
      }));
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, isHydrated]);

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const entry: ConstructionJournalEntry = {
      id: `journal-${Date.now()}`,
      date: draft.date,
      action: draft.action.trim(),
      decision: draft.decision.trim(),
      blocker: draft.blocker?.trim(),
      nextStep: draft.nextStep.trim(),
    };

    setEntries((current) => [entry, ...current]);
    setDraft({
      ...emptyDraft,
      date: new Date().toISOString().slice(0, 10),
    });
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
          disabled={!canSubmit}
          className="mt-1 min-h-11 rounded-md border border-[#39E6D0]/50 bg-[#39E6D0]/10 px-4 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/15 disabled:border-[#1D2A44] disabled:bg-[#08111A] disabled:text-[#64748b]"
        >
          Ajouter au journal
        </button>
      </form>

      <div className="mt-6 grid gap-3">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-sm text-[#39E6D0]">{entry.date}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-[#A7B0C0]">
                chantier
              </p>
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <JournalLine label="Action" value={entry.action} />
              <JournalLine label="Decision" value={entry.decision} />
              {entry.blocker ? (
                <JournalLine label="Blocage" value={entry.blocker} />
              ) : null}
              <JournalLine label={"Prochaine \u00e9tape"} value={entry.nextStep} />
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
