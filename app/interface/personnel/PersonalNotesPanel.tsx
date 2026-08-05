"use client";

import { useEffect, useState } from "react";
import {
  NOTE_CONTENT_MAX_LENGTH,
  parseNoteContentValue,
  type PersonalNote,
} from "@/lib/personal/notes";
import { PersonalEmptyState, PersonalModuleCard } from "./PersonalPrimitives";

function formatNoteTimestamp(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// Premier module a saisie manuelle du pole Personnel. La validation du contenu
// vient de lib/personal/notes.ts, le meme module que celui utilise par les
// routes API : le retour visuel avant appel et le 400 renvoye par le serveur ne
// peuvent donc pas diverger.
export function PersonalNotesPanel() {
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/personal/notes", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          notes?: PersonalNote[];
          error?: string;
        };

        if (!response.ok || !payload.notes) {
          throw new Error(payload.error ?? "Lecture des notes indisponible.");
        }

        return payload.notes;
      })
      .then((nextNotes) => {
        if (isMounted) {
          setNotes(nextNotes);
          setError(null);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Lecture des notes indisponible.",
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

  const draftCheck = parseNoteContentValue(draft);
  const draftTouched = draft.trim().length > 0;
  const canSubmitDraft = draftCheck.ok && !isSubmitting;

  async function submitDraft() {
    const checked = parseNoteContentValue(draft);

    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/personal/notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: checked.content }),
      });
      const payload = (await response.json()) as { note?: PersonalNote; error?: string };

      if (!response.ok || !payload.note) {
        throw new Error(payload.error ?? "Creation de la note indisponible.");
      }

      const created = payload.note;
      setNotes((current) => [created, ...current]);
      setDraft("");
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Creation de la note indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveEdit(noteId: string) {
    const checked = parseNoteContentValue(editingValue);

    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/notes/${noteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: checked.content }),
      });
      const payload = (await response.json()) as { note?: PersonalNote; error?: string };

      if (!response.ok || !payload.note) {
        throw new Error(payload.error ?? "Mise a jour de la note indisponible.");
      }

      const updated = payload.note;
      setNotes((current) =>
        current.map((note) => (note.id === updated.id ? updated : note)),
      );
      setEditingId(null);
      setEditingValue("");
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Mise a jour de la note indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDelete(noteId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/notes/${noteId}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Suppression de la note indisponible.");
      }

      setNotes((current) => current.filter((note) => note.id !== noteId));
      setConfirmingDeleteId(null);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Suppression de la note indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PersonalModuleCard title="Nouvelle note">
        <div className="grid gap-3">
          <textarea
            className="min-h-24 w-full rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-sm leading-6 text-[#F8FAFC] outline-none transition placeholder:text-[#64748b] focus:border-[#39E6D0]/60"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Une information ponctuelle a garder..."
            value={draft}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#A7B0C0]">
              {draftTouched && !draftCheck.ok ? (
                <span className="text-[#fbbf24]">{draftCheck.error}</span>
              ) : (
                `${draft.trim().length} / ${NOTE_CONTENT_MAX_LENGTH} caracteres`
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

      <PersonalModuleCard title="Notes enregistrées">
        {isLoading ? (
          <p className="text-sm text-[#A7B0C0]">Chargement...</p>
        ) : notes.length === 0 ? (
          <PersonalEmptyState source="Aucune note pour le moment. La première que tu ajoutes apparaîtra ici." />
        ) : (
          <ul className="grid gap-3">
            {notes.map((note) => (
              <li
                className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4"
                key={note.id}
              >
                {editingId === note.id ? (
                  <div className="grid gap-3">
                    <textarea
                      className="min-h-24 w-full rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm leading-6 text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]/60"
                      onChange={(event) => setEditingValue(event.target.value)}
                      value={editingValue}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-3 py-1.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={isSubmitting || !parseNoteContentValue(editingValue).ok}
                        onClick={() => saveEdit(note.id)}
                        type="button"
                      >
                        Enregistrer
                      </button>
                      <button
                        className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
                        onClick={() => {
                          setEditingId(null);
                          setEditingValue("");
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
                      {note.content}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-[#64748b]">
                        {formatNoteTimestamp(note.createdAt)}
                        {note.updatedAt !== note.createdAt
                          ? ` · modifiée le ${formatNoteTimestamp(note.updatedAt)}`
                          : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {confirmingDeleteId === note.id ? (
                          <>
                            <span className="text-sm text-[#fbbf24]">Confirmer ?</span>
                            <button
                              className="rounded-md border border-[#f87171]/50 bg-[#f87171]/15 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/25 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => confirmDelete(note.id)}
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
                                setEditingId(note.id);
                                setEditingValue(note.content);
                                setConfirmingDeleteId(null);
                              }}
                              type="button"
                            >
                              Modifier
                            </button>
                            <button
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#f87171]/50 hover:text-[#fecaca]"
                              onClick={() => {
                                setConfirmingDeleteId(note.id);
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
