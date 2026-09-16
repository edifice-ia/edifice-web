"use client";

import { useCallback, useEffect, useState } from "react";
import {
  JOURNAL_CONTENT_MAX_LENGTH,
  parseJournalContentValue,
  type ArchivedPersonalJournalEntry,
  type PersonalJournalEntry,
} from "@/lib/personal/journal";
import { erasurePreview } from "@/lib/personal/data-erasure";
import type { PersonalJournalCategoryWithCounts } from "@/lib/personal/journal-categories";
import { JournalCategorySelector } from "./JournalCategoryControls";
import { PersonalJournalCategoriesPanel } from "./PersonalJournalCategoriesPanel";
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

// Categories d'une entree, en lecture. Les noms sont resolus depuis la liste
// chargee, jamais copies dans l'entree : un renommage se voit partout.
//
// Un identifiant absent de la liste n'est pas affiche, sans message. Il ne peut
// pas designer une categorie supprimee — la cle composite interdit une liaison
// vers une categorie qui n'existe plus — mais seulement une categorie creee
// ailleurs depuis le chargement. Un echec de chargement de la liste, lui, est
// signale a part, au-dessus des entrees.
function selectedCategories(
  categories: PersonalJournalCategoryWithCounts[],
  categoryIds: string[],
) {
  return categories.filter((category) => categoryIds.includes(category.id));
}

function JournalCategoryTags({
  categories,
  categoryIds,
  muted = false,
}: {
  categories: PersonalJournalCategoryWithCounts[];
  categoryIds: string[];
  muted?: boolean;
}) {
  const selected = selectedCategories(categories, categoryIds);

  if (selected.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Catégories" className="flex flex-wrap gap-2">
      {selected.map((category) => (
        <li
          className={`rounded border px-2 py-0.5 text-xs ${
            muted
              ? "border-dashed border-[#1D2A44] text-[#64748b]"
              : "border-[#39E6D0]/30 bg-[#39E6D0]/10 text-[#39E6D0]"
          }`}
          key={category.id}
        >
          {category.name}
        </li>
      ))}
    </ul>
  );
}

function sameCategorySet(left: string[], right: string[]) {
  return left.length === right.length && left.every((id) => right.includes(id));
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

  // Les archives forment une liste separee, jamais melangee a la liste active.
  const [archivedCount, setArchivedCount] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedEntries, setArchivedEntries] = useState<ArchivedPersonalJournalEntry[]>([]);
  // Un seul element en confirmation a la fois. Nom distinct de
  // confirmingDeleteId, qui porte la confirmation d'ARCHIVAGE — nom herite
  // d'avant le renommage "Supprimer" -> "Archiver" du 2026-08-09. Les deux
  // confirmations coexistent desormais, l'une reversible et l'autre non.
  const [confirmingPermanentId, setConfirmingPermanentId] = useState<string | null>(null);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);

  // Les categories sont chargees ICI, une fois, et partagees : carte de gestion,
  // selecteur des entrees, affichage des noms. Une seule liste, pour qu'aucune
  // vue ne montre un nom que l'autre a deja change.
  const [categories, setCategories] = useState<PersonalJournalCategoryWithCounts[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);
  const [editingCategoryIds, setEditingCategoryIds] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);

  const fetchActive = useCallback(async () => {
    const response = await fetch("/api/personal/journal", { cache: "no-store" });
    const payload = (await response.json()) as {
      entries?: PersonalJournalEntry[];
      archivedCount?: number;
      error?: string;
    };

    if (!response.ok || !payload.entries) {
      throw new Error(payload.error ?? "Lecture du journal indisponible.");
    }

    return { entries: payload.entries, archivedCount: payload.archivedCount ?? 0 };
  }, []);

  const fetchArchived = useCallback(async () => {
    const response = await fetch("/api/personal/journal?archived=true", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      entries?: ArchivedPersonalJournalEntry[];
      error?: string;
    };

    if (!response.ok || !payload.entries) {
      throw new Error(payload.error ?? "Lecture des archives indisponible.");
    }

    return payload.entries;
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchActive()
      .then((next) => {
        if (isMounted) {
          setEntries(next.entries);
          setArchivedCount(next.archivedCount);
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
  }, [fetchActive]);

  const fetchCategories = useCallback(async () => {
    const response = await fetch("/api/personal/journal/categories", { cache: "no-store" });
    const payload = (await response.json()) as {
      categories?: PersonalJournalCategoryWithCounts[];
      error?: string;
    };

    if (!response.ok || !payload.categories) {
      throw new Error(payload.error ?? "Lecture des categories indisponible.");
    }

    return payload.categories;
  }, []);

  // Chargement independant de celui des entrees : un echec sur les categories
  // n'empeche ni de lire ni d'ecrire son journal.
  useEffect(() => {
    let isMounted = true;

    fetchCategories()
      .then((next) => {
        if (isMounted) {
          setCategories(next);
          setCategoriesError(null);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setCategoriesError(
            caughtError instanceof Error
              ? caughtError.message
              : "Lecture des categories indisponible.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchCategories]);

  async function reloadCategories() {
    try {
      const next = await fetchCategories();
      const known = new Set(next.map((category) => category.id));

      setCategories(next);
      setCategoriesError(null);
      // Une categorie supprimee depuis la carte de gestion ne reste pas cochee
      // dans un formulaire ouvert : le PUT la refuserait en 404.
      setDraftCategoryIds((current) => current.filter((id) => known.has(id)));
      setEditingCategoryIds((current) => current.filter((id) => known.has(id)));
    } catch (caughtError) {
      setCategoriesError(
        caughtError instanceof Error ? caughtError.message : "Lecture des categories indisponible.",
      );
    }
  }

  // Appele par la carte de gestion apres chaque ecriture. Les entrees sont
  // rechargees aussi, archives comprises si elles sont ouvertes : supprimer une
  // categorie retire ses liaisons cote serveur, et les entrees deja chargees les
  // porteraient encore.
  async function handleCategoriesChanged() {
    await reloadCategories();

    try {
      const next = await fetchActive();
      setEntries(next.entries);
      setArchivedCount(next.archivedCount);

      if (showArchived) {
        setArchivedEntries(await fetchArchived());
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Lecture du journal indisponible.",
      );
    }
  }

  // Remplace l'ensemble des categories d'une entree. Route a part de la
  // creation et de la modification du contenu : voir
  // app/api/personal/journal/[id]/categories/route.ts.
  async function putEntryCategories(entryId: string, categoryIds: string[]) {
    const response = await fetch(`/api/personal/journal/${entryId}/categories`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categoryIds }),
    });
    const payload = (await response.json()) as { categoryIds?: string[]; error?: string };

    if (!response.ok || !payload.categoryIds) {
      throw new Error(payload.error ?? "Mise a jour des categories indisponible.");
    }

    return payload.categoryIds;
  }

  async function openArchives() {
    setShowArchived(true);
    setIsLoadingArchived(true);

    try {
      setArchivedEntries(await fetchArchived());
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

  // SUPPRESSION PHYSIQUE ET IRREVERSIBLE. Geste distinct de l'archivage : ni
  // route, ni fonction de store, ni bouton en commun, et atteignable depuis les
  // seules archives.
  //
  // Le serveur revalide que l'entree est archivee — filtre triple id + user_id
  // + deleted_at non nul. L'interface n'est pas un garde.
  async function permanentlyDeleteEntry(entryId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/journal/${entryId}/permanent`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Suppression definitive indisponible.");
      }

      setConfirmingPermanentId(null);
      setArchivedEntries((current) => current.filter((entry) => entry.id !== entryId));

      const next = await fetchActive();
      setEntries(next.entries);
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

  // Restaurer remet l'entree dans la liste active, rechargee plutot que
  // reconstruite localement pour qu'elle reprenne sa place exacte dans le tri.
  async function restoreEntry(entryId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/journal/${entryId}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Restauration de l'entree indisponible.");
      }

      setArchivedEntries((current) => current.filter((entry) => entry.id !== entryId));

      const next = await fetchActive();
      setEntries(next.entries);
      setArchivedCount(next.archivedCount);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Restauration de l'entree indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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

      // Deux ecritures, dans cet ordre. Si la seconde echoue, l'entree existe
      // deja : elle reste affichee sans categorie et le formulaire est vide
      // quand meme — le garder rempli inviterait a renvoyer, donc a creer
      // l'entree en double.
      let created = payload.entry;
      let categoriesFailure: string | null = null;

      if (draftCategoryIds.length > 0) {
        try {
          created = {
            ...created,
            categoryIds: await putEntryCategories(created.id, draftCategoryIds),
          };
        } catch (caughtError) {
          categoriesFailure =
            caughtError instanceof Error
              ? caughtError.message
              : "Mise a jour des categories indisponible.";
        }
      }

      const shown = created;
      setEntries((current) => [shown, ...current]);
      setDraft("");
      setDraftMood(null);
      setDraftCategoryIds([]);
      setError(
        categoriesFailure
          ? `Entrée enregistrée, mais sans ses catégories : ${categoriesFailure} Tu peux les ajouter en la modifiant.`
          : null,
      );

      if (draftCategoryIds.length > 0 && !categoriesFailure) {
        // Les comptes par categorie, affiches dans la carte de gestion, ont change.
        await reloadCategories();
      }
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

      // Categories ensuite, et seulement si la selection differe de ce que le
      // serveur vient de renvoyer. En cas d'echec, le texte et l'humeur sont
      // deja enregistres : l'edition reste ouverte, et "Enregistrer" refait les
      // deux ecritures.
      if (!sameCategorySet(editingCategoryIds, updated.categoryIds)) {
        try {
          const categoryIds = await putEntryCategories(entryId, editingCategoryIds);
          setEntries((current) =>
            current.map((entry) => (entry.id === entryId ? { ...entry, categoryIds } : entry)),
          );
        } catch (caughtError) {
          setError(
            `Texte et humeur enregistrés, mais pas les catégories : ${
              caughtError instanceof Error
                ? caughtError.message
                : "Mise a jour des categories indisponible."
            } L'édition reste ouverte.`,
          );
          return;
        }

        await reloadCategories();
      }

      setEditingId(null);
      setEditingValue("");
      setEditingMood(null);
      setEditingCategoryIds([]);
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
        throw new Error(payload.error ?? "Archivage de l'entree indisponible.");
      }

      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      setConfirmingDeleteId(null);
      setArchivedCount((current) => current + 1);
      setError(null);

      if (showArchived) {
        setArchivedEntries(await fetchArchived());
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Archivage de l'entree indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      {/* En tete de l'onglet, avant "Nouvelle entree" : on cree ses categories
          avant d'ecrire, et c'est la qu'on les cherche au moment de classer.
          Pas a cote de "Voir les archives", qui range ce qu'on a mis de cote. */}
      <div className="grid gap-3">
        <button
          aria-expanded={showCategories}
          className="justify-self-start rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
          onClick={() => setShowCategories((current) => !current)}
          type="button"
        >
          {showCategories ? "Masquer les catégories" : "Gérer les catégories"}
        </button>

        {showCategories ? (
          <PersonalJournalCategoriesPanel
            categories={categories}
            isLoading={isLoadingCategories}
            loadError={categoriesError}
            onChanged={handleCategoriesChanged}
          />
        ) : null}
      </div>

      <PersonalModuleCard title="Nouvelle entrée">
        <div className="grid gap-3">
          <textarea
            className="min-h-32 w-full rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-sm leading-6 text-[#F8FAFC] outline-none transition placeholder:text-[#64748b] focus:border-[#39E6D0]/60"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ce qui se passe, ce que tu en penses..."
            value={draft}
          />
          <MoodSelector disabled={isSubmitting} onChange={setDraftMood} value={draftMood} />
          <JournalCategorySelector
            categories={categories}
            disabled={isSubmitting}
            isLoading={isLoadingCategories}
            loadError={categoriesError}
            onChange={setDraftCategoryIds}
            onManage={() => setShowCategories(true)}
            value={draftCategoryIds}
          />
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
        {categoriesError && !isLoading && entries.length > 0 ? (
          <p className="mb-3 text-sm text-[#fbbf24]">
            Catégories indisponibles : leurs noms ne peuvent pas être affichés sur les entrées.
          </p>
        ) : null}
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
                    <JournalCategorySelector
                      categories={categories}
                      disabled={isSubmitting}
                      isLoading={isLoadingCategories}
                      loadError={categoriesError}
                      onChange={setEditingCategoryIds}
                      onManage={() => setShowCategories(true)}
                      value={editingCategoryIds}
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
                          setEditingCategoryIds([]);
                          setError(null);
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
                    <JournalCategoryTags categories={categories} categoryIds={entry.categoryIds} />
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
                            <span className="text-sm text-[#fbbf24]">
                              Confirmer l&apos;archivage ?
                            </span>
                            <button
                              className="rounded-md border border-[#f87171]/50 bg-[#f87171]/15 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/25 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => confirmDelete(entry.id)}
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
                                setEditingId(entry.id);
                                setEditingValue(entry.content);
                                setEditingMood(entry.mood);
                                setEditingCategoryIds(entry.categoryIds);
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

      {/* Carte separee : aucune entree archivee ne doit pouvoir passer pour
          active. Deux actions y sont possibles : Restaurer, et Supprimer
          definitivement. La seconde n'existe QUE dans cette carte, et le
          serveur le revalide — une entree active ne peut etre supprimee
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
              ) : archivedEntries.length === 0 ? (
                <PersonalEmptyState source="Aucune entrée archivée." />
              ) : (
                <ul className="grid gap-3">
                  {archivedEntries.map((entry) => (
                    <li
                      className="rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] p-4"
                      key={entry.id}
                    >
                      <div className="grid gap-3">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-[#A7B0C0]">
                          {entry.content}
                        </p>
                        {/* Lecture seule dans les archives, comme le reste de
                            l'entree : on ne classe pas ce qu'on a mis de cote. */}
                        <JournalCategoryTags
                          categories={categories}
                          categoryIds={entry.categoryIds}
                          muted
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-[#64748b]">
                            Archivée le {formatJournalTimestamp(entry.archivedAt)}
                            {entry.mood !== null ? ` · humeur ${entry.mood}/5` : ""}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-3 py-1.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => restoreEntry(entry.id)}
                              type="button"
                            >
                              Restaurer
                            </button>
                            <button
                              className="rounded-md border border-[#f87171]/50 bg-[#f87171]/10 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/20 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => setConfirmingPermanentId(entry.id)}
                              type="button"
                            >
                              Supprimer définitivement
                            </button>
                          </div>
                        </div>

                        {/* L'apercu reprend le debut du texte ET la date
                            d'archivage : deux entrees de journal commencent
                            souvent pareil, le texte seul ne suffit pas a
                            identifier la cible. */}
                        {confirmingPermanentId === entry.id ? (
                          <div className="grid gap-3 rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-3">
                            <div>
                              <p className="text-sm font-semibold text-[#fecaca]">
                                Supprimer définitivement cette entrée ?
                              </p>
                              <p className="mt-1 text-sm italic leading-6 text-[#fecaca]">
                                « {erasurePreview(entry.content)} »
                              </p>
                              <p className="mt-1 text-xs text-[#fecaca]/80">
                                Archivée le {formatJournalTimestamp(entry.archivedAt)}
                                {entry.mood !== null ? ` · humeur ${entry.mood}/5` : ""}
                              </p>
                              {/* Les categories aident a reconnaitre la cible,
                                  et la phrase dit que seule la liaison part —
                                  pas la categorie. */}
                              {selectedCategories(categories, entry.categoryIds).length > 0 ? (
                                <p className="mt-1 text-xs text-[#fecaca]/80">
                                  Catégories :{" "}
                                  {selectedCategories(categories, entry.categoryIds)
                                    .map((category) => category.name)
                                    .join(", ")}
                                  . Les catégories elles-mêmes sont conservées.
                                </p>
                              ) : null}
                            </div>
                            <p className="text-sm leading-6 text-[#fecaca]">
                              Cette entrée sera définitivement supprimée. Il n&apos;y a pas de
                              corbeille et aucune sauvegarde n&apos;existe. Les autres
                              éléments archivés ne sont pas touchés.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="rounded-md border border-[#f87171]/50 bg-[#f87171]/15 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/25 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={isSubmitting}
                                onClick={() => permanentlyDeleteEntry(entry.id)}
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
