"use client";

import { useEffect, useState } from "react";
import {
  JOURNAL_CONTENT_MAX_LENGTH,
  parseJournalContentValue,
  type PersonalJournalEntry,
} from "@/lib/personal/journal";
import { PersonalEmptyState, PersonalModuleCard } from "./PersonalPrimitives";

function formatJournalTimestamp(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const MOOD_VALUES = [1, 2, 3, 4, 5] as const;

// Cinq boutons plus un bouton d'effacement, sur le meme motif accent/neutre que
// les onglets du pole. "Non renseignee" est un etat a part entiere, pas la
// valeur neutre du milieu de l'echelle : il doit rester atteignable, y compris
// pour retirer une humeur deja notee.
function MoodSelector({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (mood: number | null) => void;
  value: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-[#A7B0C0]">Humeur</span>
      {MOOD_VALUES.map((mood) => (
        <button
          aria-label={`Humeur ${mood} sur 5`}
          aria-pressed={value === mood}
          className={`h-8 w-8 rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            value === mood
              ? "border-[#39E6D0]/60 bg-[#39E6D0]/15 text-[#39E6D0]"
              : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
          }`}
          disabled={disabled}
          key={mood}
          onClick={() => onChange(mood)}
          type="button"
        >
          {mood}
        </button>
      ))}
      <button
        aria-label="Ne pas renseigner d'humeur"
        aria-pressed={value === null}
        className={`h-8 rounded-md border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
          value === null
            ? "border-[#39E6D0]/60 bg-[#39E6D0]/15 text-[#39E6D0]"
            : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
        }`}
        disabled={disabled}
        onClick={() => onChange(null)}
        type="button"
      >
        Non renseignée
      </button>
    </div>
  );
}

// Deuxieme module a saisie manuelle du pole Personnel, sur le patron de
// PersonalNotesPanel. La validation du contenu vient de lib/personal/journal.ts,
// le meme module que celui utilise par les routes API : le retour visuel avant
// appel et le 400 renvoye par le serveur ne peuvent donc pas diverger.
export function PersonalJournalPanel() {
  const [entries, setEntries] = useState<PersonalJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftMood, setDraftMood] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingMood, setEditingMood] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/personal/journal", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          entries?: PersonalJournalEntry[];
          error?: string;
        };

        if (!response.ok || !payload.entries) {
          throw new Error(payload.error ?? "Lecture du journal indisponible.");
        }

        return payload.entries;
      })
      .then((nextEntries) => {
        if (isMounted) {
          setEntries(nextEntries);
          setError(null);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Lecture du journal indisponible.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const draftCheck = parseJournalContentValue(draft);
  const draftTouched = draft.trim().length > 0;
  const canSubmitDraft = draftCheck.ok && !isSubmitting;

  async function submitDraft() {
    const checked = parseJournalContentValue(draft);

    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/personal/journal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: checked.content, mood: draftMood }),
      });
      const payload = (await response.json()) as {
        entry?: PersonalJournalEntry;
        error?: string;
      };

      if (!response.ok || !payload.entry) {
        throw new Error(payload.error ?? "Creation de l'entree indisponible.");
      }

      const created = payload.entry;
      setEntries((current) => [created, ...current]);
      setDraft("");
      setDraftMood(null);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Creation de l'entree indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Envoie toujours les deux champs : l'edition porte sur l'entree entiere, donc
  // "mood absent" n'aurait pas de sens ici. Passer null efface l'humeur.
  async function saveEdit(entryId: string) {
    const checked = parseJournalContentValue(editingValue);

    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/journal/${entryId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: checked.content, mood: editingMood }),
      });
      const payload = (await response.json()) as {
        entry?: PersonalJournalEntry;
        error?: string;
      };

      if (!response.ok || !payload.entry) {
        throw new Error(payload.error ?? "Mise a jour de l'entree indisponible.");
      }

      const updated = payload.entry;
      setEntries((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setEditingId(null);
      setEditingValue("");
      setEditingMood(null);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Mise a jour de l'entree indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete(entryId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/journal/${entryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Suppression de l'entree indisponible.");
      }

      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      setConfirmingDeleteId(null);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Suppression de l'entree indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PersonalModuleCard title="Nouvelle entrée">
        <div className="grid gap-3">
          <textarea
            className="min-h-32 w-full rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-sm leading-6 text-[#F8FAFC] outline-none transition placeholder:text-[#64748b] focus:border-[#39E6D0]/60"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ce qui se passe, ce que tu en penses..."
            value={draft}
          />
          <MoodSelector disabled={isSubmitting} onChange={setDraftMood} value={draftMood} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#A7B0C0]">
              {draftTouched && !draftCheck.ok ? (
                <span className="text-[#fbbf24]">{draftCheck.error}</span>
              ) : (
                `${draft.trim().length} / ${JOURNAL_CONTENT_MAX_LENGTH} caracteres`
              )}
            </p>
            <button
              className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canSubmitDraft}
              onClick={submitDraft}
              type="button"
            >
              {isSubmitting ? "Enregistrement..." : "Ajouter"}
            </button>
          </div>
        </div>
      </PersonalModuleCard>

      {error ? (
        <div className="rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-4">
          <p className="text-sm text-[#fecaca]">{error}</p>
        </div>
      ) : null}

      <PersonalModuleCard title="Entrées enregistrées">
        {isLoading ? (
          <p className="text-sm text-[#A7B0C0]">Chargement...</p>
        ) : entries.length === 0 ? (
          <PersonalEmptyState source="Aucune entrée pour le moment. La première que tu écris apparaîtra ici." />
        ) : (
          <ul className="grid gap-3">
            {entries.map((entry) => (
              <li
                className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4"
                key={entry.id}
              >
                {editingId === entry.id ? (
                  <div className="grid gap-3">
                    <textarea
                      className="min-h-32 w-full rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm leading-6 text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]/60"
                      onChange={(event) => setEditingValue(event.target.value)}
                      value={editingValue}
                    />
                    <MoodSelector
                      disabled={isSubmitting}
                      onChange={setEditingMood}
                      value={editingMood}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-3 py-1.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={isSubmitting || !parseJournalContentValue(editingValue).ok}
                        onClick={() => saveEdit(entry.id)}
                        type="button"
                      >
                        Enregistrer
                      </button>
                      <button
                        className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
                        onClick={() => {
                          setEditingId(null);
                          setEditingValue("");
                          setEditingMood(null);
                        }}
                        type="button"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-[#F8FAFC]">
                      {entry.content}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-[#64748b]">
                        {formatJournalTimestamp(entry.createdAt)}
                        {entry.mood !== null ? ` · humeur ${entry.mood}/5` : ""}
                        {entry.updatedAt !== entry.createdAt
                          ? ` · modifiée le ${formatJournalTimestamp(entry.updatedAt)}`
                          : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {confirmingDeleteId === entry.id ? (
                          <>
                            <span className="text-sm text-[#fbbf24]">Confirmer ?</span>
                            <button
                              className="rounded-md border border-[#f87171]/50 bg-[#f87171]/15 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/25 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => confirmDelete(entry.id)}
                              type="button"
                            >
                              Supprimer
                            </button>
                            <button
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
                              onClick={() => setConfirmingDeleteId(null)}
                              type="button"
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
                              onClick={() => {
                                setEditingId(entry.id);
                                setEditingValue(entry.content);
                                setEditingMood(entry.mood);
                                setConfirmingDeleteId(null);
                              }}
                              type="button"
                            >
                              Modifier
                            </button>
                            <button
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#f87171]/50 hover:text-[#fecaca]"
                              onClick={() => {
                                setConfirmingDeleteId(entry.id);
                                setEditingId(null);
                              }}
                              type="button"
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </PersonalModuleCard>
    </div>
  );
}
