"use client";

import { useCallback, useEffect, useState } from "react";
import { erasurePreview } from "@/lib/personal/data-erasure";
import {
  NOTE_CONTENT_MAX_LENGTH,
  parseNoteContentValue,
  type ArchivedPersonalNote,
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

  // Les archives forment une liste separee, jamais melangee a la liste active :
  // deux etats, deux appels, deux listes.
  const [archivedCount, setArchivedCount] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedNotes, setArchivedNotes] = useState<ArchivedPersonalNote[]>([]);
  // Un seul element en confirmation a la fois : ouvrir la confirmation sur une
  // ligne ferme celle d'une autre. Deux confirmations ouvertes cote a cote
  // inviteraient au clic sur la mauvaise, et le geste est irreversible.
  //
  // Nom distinct de confirmingDeleteId ci-dessus, qui porte la confirmation
  // d'ARCHIVAGE — nom herite d'avant le renommage "Supprimer" -> "Archiver" du
  // 2026-08-09, ou seuls les libelles affiches avaient change. Les deux
  // confirmations coexistent maintenant dans ce fichier, l'une reversible et
  // l'autre non : elles ne doivent pas pouvoir etre confondues a la lecture.
  const [confirmingPermanentId, setConfirmingPermanentId] = useState<string | null>(null);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);

  const fetchActive = useCallback(async () => {
    const response = await fetch("/api/personal/notes", { cache: "no-store" });
    const payload = (await response.json()) as {
      notes?: PersonalNote[];
      archivedCount?: number;
      error?: string;
    };

    if (!response.ok || !payload.notes) {
      throw new Error(payload.error ?? "Lecture des notes indisponible.");
    }

    return { notes: payload.notes, archivedCount: payload.archivedCount ?? 0 };
  }, []);

  const fetchArchived = useCallback(async () => {
    const response = await fetch("/api/personal/notes?archived=true", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      notes?: ArchivedPersonalNote[];
      error?: string;
    };

    if (!response.ok || !payload.notes) {
      throw new Error(payload.error ?? "Lecture des archives indisponible.");
    }

    return payload.notes;
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchActive()
      .then((next) => {
        if (isMounted) {
          setNotes(next.notes);
          setArchivedCount(next.archivedCount);
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
  }, [fetchActive]);

  async function openArchives() {
    setShowArchived(true);
    setIsLoadingArchived(true);

    try {
      setArchivedNotes(await fetchArchived());
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lecture des archives indisponible.",
      );
    } finally {
      setIsLoadingArchived(false);
    }
  }

  // SUPPRESSION PHYSIQUE ET IRREVERSIBLE. Geste distinct de l'archivage : il ne
  // partage ni route, ni fonction de store, ni bouton avec lui, et il n'est
  // atteignable que depuis les archives.
  //
  // Le serveur revalide que la note est archivee — filtre triple id + user_id +
  // deleted_at non nul. L'interface n'expose ce bouton que dans les archives,
  // mais l'interface n'est pas un garde.
  async function permanentlyDeleteNote(noteId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/notes/${noteId}/permanent`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Suppression definitive indisponible.");
      }

      setConfirmingPermanentId(null);
      setArchivedNotes((current) => current.filter((note) => note.id !== noteId));

      // Le compteur d'archives vient de la liste active : la recharger evite de
      // maintenir un decompte local qui deriverait.
      const next = await fetchActive();
      setNotes(next.notes);
      setArchivedCount(next.archivedCount);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Suppression definitive indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Restaurer remet la note dans la liste active. Celle-ci est rechargee plutot
  // que reconstruite localement, pour que la note reprenne sa place exacte dans
  // le tri par date de creation.
  async function restoreNote(noteId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/notes/${noteId}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Restauration de la note indisponible.");
      }

      setArchivedNotes((current) => current.filter((note) => note.id !== noteId));

      const next = await fetchActive();
      setNotes(next.notes);
      setArchivedCount(next.archivedCount);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Restauration de la note indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
        throw new Error(payload.error ?? "Archivage de la note indisponible.");
      }

      setNotes((current) => current.filter((note) => note.id !== noteId));
      setConfirmingDeleteId(null);
      setArchivedCount((current) => current + 1);
      setError(null);

      // La note archivee doit apparaitre immediatement dans les archives si
      // elles sont ouvertes, sans quoi la liste affichee serait perimee.
      if (showArchived) {
        setArchivedNotes(await fetchArchived());
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Archivage de la note indisponible.",
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
                            <span className="text-sm text-[#fbbf24]">
                              Confirmer l&apos;archivage ?
                            </span>
                            <button
                              className="rounded-md border border-[#f87171]/50 bg-[#f87171]/15 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/25 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => confirmDelete(note.id)}
                              type="button"
                            >
                              Archiver
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
                              Archiver
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

      {/* Les archives vivent dans une carte separee, jamais dans la liste
          active : aucun element ne doit laisser croire qu'il est encore actif.
          Deux actions y sont possibles, et deux seulement : Restaurer, et
          Supprimer definitivement. La seconde n'existe QUE dans cette carte, et
          le serveur le revalide : un element actif ne peut etre supprime
          physiquement ni depuis l'interface, ni par appel direct. */}
      {archivedCount > 0 || showArchived ? (
        <div className="grid gap-3">
          <button
            className="justify-self-start rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
            onClick={() => (showArchived ? setShowArchived(false) : openArchives())}
            type="button"
          >
            {showArchived ? "Masquer les archives" : `Voir les archives (${archivedCount})`}
          </button>

          {showArchived ? (
            <PersonalModuleCard title="Archives">
              {isLoadingArchived ? (
                <p className="text-sm text-[#A7B0C0]">Chargement...</p>
              ) : archivedNotes.length === 0 ? (
                <PersonalEmptyState source="Aucune note archivée." />
              ) : (
                <ul className="grid gap-3">
                  {archivedNotes.map((note) => (
                    <li
                      className="rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] p-4"
                      key={note.id}
                    >
                      <div className="grid gap-3">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-[#A7B0C0]">
                          {note.content}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-[#64748b]">
                            Archivée le {formatNoteTimestamp(note.archivedAt)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-3 py-1.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => restoreNote(note.id)}
                              type="button"
                            >
                              Restaurer
                            </button>
                            <button
                              className="rounded-md border border-[#f87171]/50 bg-[#f87171]/10 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/20 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => setConfirmingPermanentId(note.id)}
                              type="button"
                            >
                              Supprimer définitivement
                            </button>
                          </div>
                        </div>

                        {/* Confirmation binaire, sans mot a taper : l'archivage
                            prealable tient lieu de premiere barriere. Elle
                            affiche un apercu du contenu vise — une confirmation
                            generique ne protegerait de rien entre deux notes
                            archivees qui se ressemblent. */}
                        {confirmingPermanentId === note.id ? (
                          <div className="grid gap-3 rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-3">
                            <div>
                              <p className="text-sm font-semibold text-[#fecaca]">
                                Supprimer définitivement cette note ?
                              </p>
                              <p className="mt-1 text-sm italic leading-6 text-[#fecaca]">
                                « {erasurePreview(note.content)} »
                              </p>
                            </div>
                            <p className="text-sm leading-6 text-[#fecaca]">
                              Cette note sera définitivement supprimée. Il n&apos;y a pas de
                              corbeille et aucune sauvegarde n&apos;existe. Les autres
                              éléments archivés ne sont pas touchés.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="rounded-md border border-[#f87171]/50 bg-[#f87171]/15 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/25 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={isSubmitting}
                                onClick={() => permanentlyDeleteNote(note.id)}
                                type="button"
                              >
                                {isSubmitting ? "Suppression..." : "Confirmer"}
                              </button>
                              <button
                                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
                                disabled={isSubmitting}
                                onClick={() => setConfirmingPermanentId(null)}
                                type="button"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </PersonalModuleCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
