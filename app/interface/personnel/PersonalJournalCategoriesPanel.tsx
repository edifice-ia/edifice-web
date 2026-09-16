"use client";

import { useState } from "react";
import {
  JOURNAL_CATEGORY_DELETE_RACE,
  JOURNAL_CATEGORY_DESCRIPTION_MAX_LENGTH,
  JOURNAL_CATEGORY_IN_USE,
  JOURNAL_CATEGORY_NAME_MAX_LENGTH,
  parseJournalCategoryCreatePayload,
  type JournalCategoryBlockingEntry,
  type PersonalJournalCategory,
  type PersonalJournalCategoryWithCounts,
} from "@/lib/personal/journal-categories";
import { JournalCategorySelector } from "./JournalCategoryControls";
import { PersonalModuleCard } from "./PersonalPrimitives";

// Meme format que formatJournalTimestamp dans PersonalJournalPanel. Repete ici
// plutot qu'importe : PersonalJournalPanel importe ce fichier, et l'import
// inverse formerait un cycle — la raison meme de l'extraction de
// PersonalPrimitives.
function formatJournalTimestamp(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// Le compte INCLUT les entrees archivees, et le dit. Un total des seules
// entrees actives mentirait sur ce que la suppression peut bloquer : la regle
// de blocage compte aussi les archivees.
function formatEntryCount({ entryCount, archivedEntryCount }: PersonalJournalCategoryWithCounts) {
  if (entryCount === 0) {
    return "Aucune entrée";
  }

  const total = `${entryCount} entrée${entryCount > 1 ? "s" : ""}`;

  if (archivedEntryCount === 0) {
    return total;
  }

  return `${total}, dont ${archivedEntryCount} archivée${archivedEntryCount > 1 ? "s" : ""}`;
}

// Phrase de la confirmation de suppression. Elle dit d'ou vient le compte — la
// liste chargee, qui a pu vieillir — plutot que de le presenter comme certain.
// Le compte reel, renvoye par le serveur, s'affiche apres la suppression.
function describeDeletionScope({ entryCount, archivedEntryCount }: PersonalJournalCategoryWithCounts) {
  if (entryCount === 0) {
    return "Au dernier chargement, aucune entrée ne la porte.";
  }

  if (entryCount === 1) {
    return archivedEntryCount === 1
      ? "Au dernier chargement, 1 entrée la porte, archivée."
      : "Au dernier chargement, 1 entrée la porte.";
  }

  return archivedEntryCount === 0
    ? `Au dernier chargement, ${entryCount} entrées la portent.`
    : `Au dernier chargement, ${entryCount} entrées la portent, dont ${archivedEntryCount} archivée${
        archivedEntryCount > 1 ? "s" : ""
      }.`;
}

type ApiError = { error?: string; code?: string };

// Refus de suppression en cours de traitement. Les trois tables par entree sont
// remises a zero a chaque nouveau refus : un second 409 porte une liste neuve,
// dont aucune entree n'est encore reassignee — une entree deja reassignee a au
// moins deux categories et ne peut plus bloquer.
type BlockedDeletion = {
  categoryId: string;
  entries: JournalCategoryBlockingEntry[];
  // Categories cochees, pas encore ecrites.
  selections: Record<string, string[]>;
  // Categories ajoutees, telles que renvoyees par le serveur, hors celle a
  // supprimer.
  reassigned: Record<string, string[]>;
  errors: Record<string, string>;
};

function openBlockedDeletion(
  categoryId: string,
  entries: JournalCategoryBlockingEntry[],
): BlockedDeletion {
  return { categoryId, entries, selections: {}, reassigned: {}, errors: {} };
}

// Carte de gestion des categories de Journal : creer, renommer, supprimer — et
// reassigner les entrees qui bloquent une suppression.
//
// Sous-ecran de Journal et non de Reglages : Reglages porte le geste qui
// DETRUIT des donnees du pole, y loger une gestion courante brouillerait cette
// lecture.
//
// Elle ne charge pas ses categories : PersonalJournalPanel les charge une fois
// et les partage avec le selecteur des entrees et l'affichage des noms, pour
// qu'il n'existe qu'une liste. Apres chaque ecriture, la carte appelle
// onChanged, qui recharge cette liste — et les entrees, dont une suppression a
// pu retirer des liaisons.
//
// La validation vient de lib/personal/journal-categories.ts, le module utilise
// par les routes : le retour avant appel et le 400 du serveur ne peuvent pas
// diverger. L'unicite du nom, elle, n'est tranchee que par le serveur — la
// base l'impose, et une verification locale laisserait une fenetre de course.
export function PersonalJournalCategoriesPanel({
  categories,
  isLoading,
  loadError,
  onChanged,
}: {
  categories: PersonalJournalCategoryWithCounts[];
  isLoading: boolean;
  loadError: string | null;
  onChanged: () => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Message de fin d'une suppression reussie, ou d'une categorie disparue.
  const [notice, setNotice] = useState<string | null>(null);

  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Suppression : une seule confirmation, un seul refus, une seule erreur a la
  // fois, toujours rattaches a la categorie concernee.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedDeletion | null>(null);
  const [deleteError, setDeleteError] = useState<{ categoryId: string; message: string } | null>(
    null,
  );

  // Apres chaque ecriture, la liste est rechargee plutot que corrigee
  // localement : les comptes sont calcules par le serveur, et les recalculer ici
  // creerait une seconde source qui deriverait. Un echec de rechargement
  // s'affiche via loadError, tenu par PersonalJournalPanel.
  const reload = onChanged;

  const draftCheck = parseJournalCategoryCreatePayload({
    name: draftName,
    description: draftDescription,
  });
  const canSubmitDraft = draftCheck.ok && !isSubmitting;

  async function submitDraft() {
    const checked = parseJournalCategoryCreatePayload({
      name: draftName,
      description: draftDescription,
    });

    if (!checked.ok) {
      setCreateError(checked.error);
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/personal/journal/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: checked.name, description: checked.description }),
      });
      const payload = (await response.json()) as ApiError & { category?: PersonalJournalCategory };

      if (!response.ok || !payload.category) {
        // 409 CATEGORY_NAME_TAKEN compris : le message du serveur dit deja que
        // majuscules et espaces sont ignores.
        setCreateError(payload.error ?? "Creation de la categorie indisponible.");
        return;
      }

      setDraftName("");
      setDraftDescription("");
      setCreateError(null);
      await reload();
    } catch {
      setCreateError("Creation de la categorie indisponible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(category: PersonalJournalCategoryWithCounts) {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingDescription(category.description ?? "");
    setEditError(null);
    setConfirmingDeleteId(null);
    setNotice(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
    setEditingDescription("");
    setEditError(null);
  }

  // Envoie toujours les deux champs : l'edition porte sur la categorie entiere.
  // Une description videe devient null, jamais "" — meme normalisation que le
  // serveur.
  async function saveEdit(categoryId: string) {
    const checked = parseJournalCategoryCreatePayload({
      name: editingName,
      description: editingDescription,
    });

    if (!checked.ok) {
      setEditError(checked.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/journal/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: checked.name, description: checked.description }),
      });
      const payload = (await response.json()) as ApiError & { category?: PersonalJournalCategory };

      if (response.status === 404) {
        cancelEdit();
        setNotice("Cette catégorie n'existe plus.");
        await reload();
        return;
      }

      if (!response.ok || !payload.category) {
        setEditError(payload.error ?? "Modification de la categorie indisponible.");
        return;
      }

      cancelEdit();
      await reload();
    } catch {
      setEditError("Modification de la categorie indisponible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function askDelete(categoryId: string) {
    setConfirmingDeleteId(categoryId);
    setBlocked(null);
    setDeleteError(null);
    setNotice(null);
    cancelEdit();
  }

  // SUPPRESSION PHYSIQUE ET IRREVERSIBLE. Le serveur tranche le blocage : si une
  // entree, archivee comprise, n'a que cette categorie, rien n'est ecrit et la
  // reponse porte ces entrees. L'interface n'est pas un garde.
  async function confirmDelete(category: PersonalJournalCategoryWithCounts) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/journal/categories/${category.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiError & {
        unlinkedEntryCount?: number;
        entries?: JournalCategoryBlockingEntry[];
      };

      setConfirmingDeleteId(null);

      if (response.ok) {
        setBlocked(null);
        // Le compte vient du serveur, pas de la confirmation : un ecart entre
        // les deux reste visible plutot que masque.
        const unlinked = payload.unlinkedEntryCount ?? 0;
        setNotice(
          unlinked === 0
            ? `« ${category.name} » supprimée. Aucune entrée ne la portait.`
            : `« ${category.name} » supprimée — ${unlinked} entrée${
                unlinked > 1 ? "s l'ont perdue" : " l'a perdue"
              }.`,
        );
        await reload();
        return;
      }

      if (response.status === 409 && payload.code === JOURNAL_CATEGORY_IN_USE) {
        setBlocked(openBlockedDeletion(category.id, payload.entries ?? []));
        return;
      }

      if (response.status === 409 && payload.code === JOURNAL_CATEGORY_DELETE_RACE) {
        setDeleteError({
          categoryId: category.id,
          message: "La catégorie vient d'être rattachée à une entrée. Réessayez.",
        });
        await reload();
        return;
      }

      if (response.status === 404) {
        setBlocked(null);
        setNotice("Cette catégorie n'existe plus.");
        await reload();
        return;
      }

      setDeleteError({
        categoryId: category.id,
        message: payload.error ?? "Suppression de la categorie indisponible.",
      });
    } catch {
      setDeleteError({
        categoryId: category.id,
        message: "Suppression de la categorie indisponible.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Reassignation d'UNE entree bloquante. Le PUT envoie la categorie a supprimer
  // PLUS les categories cochees : si l'on ferme sans reessayer, l'entree garde
  // tout et n'a rien perdu. C'est la suppression, ensuite, qui retire la
  // liaison — avec son compte renvoye par le serveur.
  //
  // Le PUT remplace l'ensemble : une categorie ajoutee a cette entree par une
  // autre session entre le refus et ce clic serait ecrasee. Fenetre acceptee,
  // la meme que pour la modification d'une entree ; la fermer demanderait une
  // route d'ajout seul.
  //
  // L'entree peut etre archivee : la route l'accepte, c'est le seul chemin a
  // l'ecran pour reclasser une entree archivee.
  function updateBlocked(update: (current: BlockedDeletion) => BlockedDeletion) {
    setBlocked((current) => (current ? update(current) : current));
  }

  async function reassignEntry(entryId: string, chosen: string[]) {
    if (!blocked) {
      return;
    }

    const { categoryId } = blocked;

    if (chosen.length === 0) {
      return;
    }

    setIsSubmitting(true);
    updateBlocked((current) => {
      const errors = { ...current.errors };
      delete errors[entryId];
      return { ...current, errors };
    });

    try {
      const response = await fetch(`/api/personal/journal/${entryId}/categories`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryIds: [categoryId, ...chosen] }),
      });
      const payload = (await response.json()) as ApiError & { categoryIds?: string[] };

      if (!response.ok || !payload.categoryIds) {
        const message =
          response.status === 404
            ? "Entrée ou catégorie introuvable."
            : (payload.error ?? "Attribution des categories indisponible.");

        updateBlocked((current) => ({
          ...current,
          errors: { ...current.errors, [entryId]: message },
        }));

        if (response.status === 404) {
          await reload();
        }

        return;
      }

      const added = payload.categoryIds.filter((id) => id !== categoryId);

      updateBlocked((current) => ({
        ...current,
        reassigned: { ...current.reassigned, [entryId]: added },
      }));
      // Comptes de la carte et etiquettes des entrees.
      await reload();
    } catch {
      updateBlocked((current) => ({
        ...current,
        errors: { ...current.errors, [entryId]: "Attribution des categories indisponible." },
      }));
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#64748b] focus:border-[#39E6D0]/60";
  const neutralButtonClass =
    "rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40";
  const accentButtonClass =
    "rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-3 py-1.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40";
  const dangerButtonClass =
    "rounded-md border border-[#f87171]/50 bg-[#f87171]/10 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/20 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <PersonalModuleCard title="Catégories">
      <div className="grid gap-4">
        {/* Creation. Le compteur et l'erreur partagent la meme ligne, comme le
            formulaire de nouvelle entree. */}
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-[#A7B0C0]">Nom</span>
            <input
              className={inputClass}
              maxLength={JOURNAL_CATEGORY_NAME_MAX_LENGTH}
              onChange={(event) => {
                setDraftName(event.target.value);
                setCreateError(null);
              }}
              placeholder="Observations, Décisions..."
              value={draftName}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-[#A7B0C0]">Description (facultative)</span>
            <input
              className={inputClass}
              maxLength={JOURNAL_CATEGORY_DESCRIPTION_MAX_LENGTH}
              onChange={(event) => {
                setDraftDescription(event.target.value);
                setCreateError(null);
              }}
              placeholder="Ce que cette catégorie rassemble"
              value={draftDescription}
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm text-[#A7B0C0]">
              {createError ? (
                <span className="text-[#fbbf24]">{createError}</span>
              ) : (
                `${draftName.trim().length} / ${JOURNAL_CATEGORY_NAME_MAX_LENGTH} caracteres`
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

        {notice ? (
          <p
            aria-live="polite"
            className="rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-sm text-[#A7B0C0]"
          >
            {notice}
          </p>
        ) : null}

        {loadError ? (
          <div className="rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-4" role="alert">
            <p className="text-sm text-[#fecaca]">{loadError}</p>
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-[#A7B0C0]">Chargement...</p>
        ) : categories.length === 0 ? (
          // Meme cadre que PersonalEmptyState, mais pas son titre : "Aucune donnee
          // connectee pour le moment" parle d'une source externe a brancher, alors
          // qu'ici il n'y a rien a connecter — seulement une premiere categorie a
          // creer. La primitive partagee n'est pas modifiee.
          <div className="rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] p-4">
            <p className="text-sm font-semibold text-[#F8FAFC]">Aucune catégorie pour l&apos;instant.</p>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              Crée la première avec le formulaire ci-dessus. Une entrée de journal peut
              aussi rester sans catégorie.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {categories.map((category) => (
              <li
                className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4"
                key={category.id}
              >
                {editingId === category.id ? (
                  <div className="grid gap-3">
                    <label className="grid gap-1">
                      <span className="text-sm text-[#A7B0C0]">Nom</span>
                      <input
                        className={inputClass}
                        maxLength={JOURNAL_CATEGORY_NAME_MAX_LENGTH}
                        onChange={(event) => {
                          setEditingName(event.target.value);
                          setEditError(null);
                        }}
                        value={editingName}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-sm text-[#A7B0C0]">Description (facultative)</span>
                      <input
                        className={inputClass}
                        maxLength={JOURNAL_CATEGORY_DESCRIPTION_MAX_LENGTH}
                        onChange={(event) => {
                          setEditingDescription(event.target.value);
                          setEditError(null);
                        }}
                        value={editingDescription}
                      />
                    </label>
                    {editError ? (
                      <p aria-live="polite" className="text-sm text-[#fbbf24]">
                        {editError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={accentButtonClass}
                        disabled={isSubmitting}
                        onClick={() => saveEdit(category.id)}
                        type="button"
                      >
                        {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                      </button>
                      <button
                        className={neutralButtonClass}
                        disabled={isSubmitting}
                        onClick={cancelEdit}
                        type="button"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#F8FAFC]">{category.name}</p>
                        <p
                          className={`mt-1 text-sm leading-6 ${
                            category.description ? "text-[#A7B0C0]" : "text-[#64748b]"
                          }`}
                        >
                          {category.description ?? "Sans description"}
                        </p>
                        <p className="mt-1 text-xs text-[#64748b]">{formatEntryCount(category)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={neutralButtonClass}
                          disabled={isSubmitting}
                          onClick={() => startEdit(category)}
                          type="button"
                        >
                          Renommer
                        </button>
                        <button
                          className={dangerButtonClass}
                          disabled={isSubmitting}
                          onClick={() => askDelete(category.id)}
                          type="button"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {/* Confirmation binaire. Elle dit que le geste est
                        irreversible, d'ou vient le compte, et ce que le serveur
                        refusera — sans pretendre savoir d'avance quelles
                        entrees n'ont que cette categorie. */}
                    {confirmingDeleteId === category.id ? (
                      <div className="grid gap-3 rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-3">
                        <p className="text-sm font-semibold text-[#fecaca]">
                          Supprimer définitivement « {category.name} » ?
                        </p>
                        <p className="text-sm leading-6 text-[#fecaca]">
                          <strong>Irréversible</strong> : il n&apos;y a pas de corbeille, la
                          catégorie devra être recréée à la main.
                        </p>
                        <p className="text-sm leading-6 text-[#fecaca]">
                          {describeDeletionScope(category)}
                          {category.entryCount > 0
                            ? " Celles qui ont d'autres catégories la perdent et gardent les autres. Si une entrée n'a que celle-ci, la suppression sera refusée."
                            : ""}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-md border border-[#f87171]/50 bg-[#f87171]/15 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/25 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={isSubmitting}
                            onClick={() => confirmDelete(category)}
                            type="button"
                          >
                            {isSubmitting ? "Suppression..." : "Confirmer"}
                          </button>
                          <button
                            className={neutralButtonClass}
                            disabled={isSubmitting}
                            onClick={() => setConfirmingDeleteId(null)}
                            type="button"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Refus du serveur : des entrees n'ont que cette
                        categorie. Rien n'a ete ecrit. Chaque entree recoit un
                        selecteur qui ne propose pas la categorie a supprimer ;
                        "Reessayer" n'apparait qu'une fois toutes reassignees.
                        Laisser une entree sans categorie n'est pas propose :
                        la regle bloque la perte, elle ne l'offre pas. Fermer
                        garde les attributions deja faites, ecrites en base. */}
                    {blocked?.categoryId === category.id ? (
                      <div
                        className="grid gap-3 rounded-md border border-[#fbbf24]/40 bg-[#fbbf24]/10 p-3"
                        role="alert"
                      >
                        <p className="text-sm font-semibold text-[#fde68a]">
                          Suppression refusée : {blocked.entries.length} entrée
                          {blocked.entries.length > 1 ? "s n'ont" : " n'a"} que cette catégorie.
                        </p>
                        <p className="text-sm leading-6 text-[#fde68a]">
                          Rien n&apos;a été supprimé. Donne une autre catégorie à chaque entrée,
                          puis réessaie.
                        </p>
                        <ul className="grid gap-2">
                          {blocked.entries.map((entry) => {
                            const otherCategories = categories.filter(
                              (candidate) => candidate.id !== category.id,
                            );
                            const reassignedIds = blocked.reassigned[entry.id];
                            // Une categorie cochee puis supprimee entre-temps
                            // ne compte plus : le PUT la refuserait en 404.
                            const selection = (blocked.selections[entry.id] ?? []).filter((id) =>
                              otherCategories.some((candidate) => candidate.id === id),
                            );
                            const entryError = blocked.errors[entry.id];

                            return (
                              <li
                                className="grid gap-3 rounded-md border border-[#1D2A44] bg-[#03070B] p-3"
                                key={entry.id}
                              >
                                <div>
                                  <p className="text-sm italic leading-6 text-[#A7B0C0]">
                                    « {entry.preview} »
                                  </p>
                                  <p className="mt-1 text-xs text-[#64748b]">
                                    Écrite le {formatJournalTimestamp(entry.createdAt)}
                                    {entry.mood !== null ? ` · humeur ${entry.mood}/5` : ""}
                                    {entry.archived ? " · archivée" : ""}
                                  </p>
                                </div>

                                {reassignedIds ? (
                                  <p className="text-sm text-[#39E6D0]">
                                    Réassignée :{" "}
                                    {categories
                                      .filter((candidate) => reassignedIds.includes(candidate.id))
                                      .map((candidate) => candidate.name)
                                      .join(", ")}
                                  </p>
                                ) : loadError ? (
                                  <p className="text-sm text-[#fbbf24]">
                                    Catégories indisponibles : l&apos;attribution est impossible
                                    pour l&apos;instant.
                                  </p>
                                ) : otherCategories.length === 0 && !isLoading ? (
                                  <p className="text-sm text-[#A7B0C0]">
                                    Aucune autre catégorie : crée-en une avec le formulaire
                                    ci-dessus.
                                  </p>
                                ) : (
                                  <div className="grid gap-2">
                                    <JournalCategorySelector
                                      categories={otherCategories}
                                      disabled={isSubmitting}
                                      emptySelectionNote={null}
                                      isLoading={isLoading}
                                      loadError={loadError}
                                      onChange={(categoryIds) =>
                                        updateBlocked((current) => ({
                                          ...current,
                                          selections: {
                                            ...current.selections,
                                            [entry.id]: categoryIds,
                                          },
                                        }))
                                      }
                                      onManage={() => undefined}
                                      value={selection}
                                    />
                                    <button
                                      className={`justify-self-start ${accentButtonClass}`}
                                      disabled={isSubmitting || selection.length === 0}
                                      onClick={() => reassignEntry(entry.id, selection)}
                                      type="button"
                                    >
                                      Attribuer
                                    </button>
                                  </div>
                                )}

                                {entryError ? (
                                  <p className="text-sm text-[#fecaca]" role="alert">
                                    {entryError}
                                  </p>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>

                        {blocked.entries.every((entry) => blocked.reassigned[entry.id]) ? (
                          <div className="grid gap-2">
                            {/* Pas de seconde confirmation : la suppression a
                                deja ete confirmee, et la phrase dit ce qui
                                change. Un nouveau 409 remplace la liste. */}
                            <p className="text-sm leading-6 text-[#fde68a]">
                              {blocked.entries.length > 1
                                ? `Ces ${blocked.entries.length} entrées perdront « ${category.name} » et garderont leurs nouvelles catégories.`
                                : `Cette entrée perdra « ${category.name} » et gardera ses nouvelles catégories.`}
                            </p>
                            <button
                              className={`justify-self-start ${dangerButtonClass}`}
                              disabled={isSubmitting}
                              onClick={() => confirmDelete(category)}
                              type="button"
                            >
                              {isSubmitting
                                ? "Suppression..."
                                : `Réessayer la suppression de « ${category.name} »`}
                            </button>
                          </div>
                        ) : null}

                        <button
                          className={`justify-self-start ${neutralButtonClass}`}
                          disabled={isSubmitting}
                          onClick={() => setBlocked(null)}
                          type="button"
                        >
                          Fermer
                        </button>
                      </div>
                    ) : null}

                    {deleteError?.categoryId === category.id ? (
                      <p className="text-sm text-[#fecaca]" role="alert">
                        {deleteError.message}
                      </p>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PersonalModuleCard>
  );
}
