"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TASK_CONTEXT_LABEL_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  parseTaskTitleValue,
  type ArchivedPersonalTask,
  type PersonalTask,
} from "@/lib/personal/tasks";
import { PersonalEmptyState, PersonalModuleCard } from "./PersonalPrimitives";

// Une echeance est un jour, pas un instant : elle s'affiche sans heure, et les
// bornes sont calculees en Europe/Paris. Le suffixe T00:00:00 evite que la date
// nue soit interpretee en UTC puis reculee d'un jour a l'affichage.
function formatDueOn(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatArchivedAt(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// Jour courant en Europe/Paris, au format AAAA-MM-JJ. Sert a qualifier une
// echeance de "en retard" ou "aujourd'hui". Calcule cote client sur le fuseau
// affiche, jamais en UTC : une echeance au 24 doit basculer en retard le 25 a
// minuit heure de Paris, pas a 2h du matin.
function todayInParis() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Qualification purement visuelle, jamais persistee : "en retard" se recalcule
// a chaque rendu depuis la date du jour. La stocker en base la figerait, et une
// tache cesserait d'etre en retard sans que rien ne la mette a jour.
//
// Une tache faite n'est jamais en retard, quelle que soit son echeance.
function dueState(task: PersonalTask) {
  if (task.status === "done" || task.dueOn === null) {
    return null;
  }

  const today = todayInParis();

  if (task.dueOn < today) {
    return "overdue" as const;
  }

  if (task.dueOn === today) {
    return "today" as const;
  }

  return null;
}

// Quatrieme module a saisie manuelle du pole, sur le patron d'Habitudes. La
// validation du contenu vient de lib/personal/tasks.ts, le meme module que
// celui utilise par les routes API : le retour visuel avant appel et le 400
// renvoye par le serveur ne peuvent donc pas diverger.
//
// Aucune valeur derivee n'est calculee ici. La charge de taches en attente
// vient du serveur, qui la compte a la lecture.
export function PersonalTasksPanel() {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDueOn, setDraftDueOn] = useState("");
  const [draftContext, setDraftContext] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDueOn, setEditingDueOn] = useState("");
  const [editingContext, setEditingContext] = useState("");

  // Confirmation d'ARCHIVAGE. Nom aligne sur PersonalHabitsPanel plutot que sur
  // le confirmingDeleteId de Notes et Journal, qui designe la meme chose sous un
  // nom herite d'avant le renommage "Supprimer" -> "Archiver" du 2026-08-09.
  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string | null>(null);

  // Les archives forment une liste separee, jamais melangee a la liste active :
  // deux etats, deux appels, deux listes.
  const [archivedCount, setArchivedCount] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedPersonalTask[]>([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);

  const fetchActive = useCallback(async () => {
    const response = await fetch("/api/personal/tasks", { cache: "no-store" });
    const payload = (await response.json()) as {
      tasks?: PersonalTask[];
      archivedCount?: number;
      pendingCount?: number;
      error?: string;
    };

    if (!response.ok || !payload.tasks) {
      throw new Error(payload.error ?? "Lecture des taches indisponible.");
    }

    return {
      tasks: payload.tasks,
      archivedCount: payload.archivedCount ?? 0,
      pendingCount: payload.pendingCount ?? 0,
    };
  }, []);

  const fetchArchived = useCallback(async () => {
    const response = await fetch("/api/personal/tasks?archived=true", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      tasks?: ArchivedPersonalTask[];
      error?: string;
    };

    if (!response.ok || !payload.tasks) {
      throw new Error(payload.error ?? "Lecture des archives indisponible.");
    }

    return payload.tasks;
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchActive()
      .then((next) => {
        if (isMounted) {
          setTasks(next.tasks);
          setArchivedCount(next.archivedCount);
          setPendingCount(next.pendingCount);
          setError(null);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Lecture des taches indisponible.",
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

  // Rechargee apres chaque mutation plutot que reconstruite localement : le tri
  // depend de l'echeance, donc modifier une date change la place de la tache
  // dans la liste. Le compteur d'attente et celui d'archives viennent de la
  // meme reponse, donc aucun decompte local n'est a maintenir.
  async function refresh() {
    const next = await fetchActive();
    setTasks(next.tasks);
    setArchivedCount(next.archivedCount);
    setPendingCount(next.pendingCount);

    if (showArchived) {
      setArchivedTasks(await fetchArchived());
    }

    setError(null);
  }

  async function openArchives() {
    setShowArchived(true);
    setIsLoadingArchived(true);

    try {
      setArchivedTasks(await fetchArchived());
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

  const draftCheck = parseTaskTitleValue(draftTitle);
  const draftTouched = draftTitle.trim().length > 0;
  const canSubmitDraft = draftCheck.ok && !isSubmitting;

  async function submitDraft() {
    const checked = parseTaskTitleValue(draftTitle);

    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/personal/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: checked.title,
          // La chaine vide part telle quelle : le serveur la normalise en null.
          // Envoyer null ici dupliquerait cette regle des deux cotes.
          dueOn: draftDueOn,
          contextLabel: draftContext,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Creation de la tache indisponible.");
      }

      setDraftTitle("");
      setDraftDueOn("");
      setDraftContext("");
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Creation de la tache indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Cocher une tache est un PATCH de statut, pas une route dediee : un statut
  // est un champ comme un autre. Seul `status` est envoye, donc l'echeance et
  // le contexte ne sont pas touches — c'est ce que garantit la distinction
  // "champ absent" / "champ a null" de parseTaskUpdatePayload.
  async function toggleStatus(task: PersonalTask) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: task.status === "todo" ? "done" : "todo" }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Mise a jour de la tache indisponible.");
      }

      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Mise a jour de la tache indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(task: PersonalTask) {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setEditingDueOn(task.dueOn ?? "");
    setEditingContext(task.contextLabel ?? "");
    setConfirmingArchiveId(null);
  }

  async function submitEdit(taskId: string) {
    const checked = parseTaskTitleValue(editingTitle);

    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: checked.title,
          dueOn: editingDueOn,
          contextLabel: editingContext,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Mise a jour de la tache indisponible.");
      }

      setEditingId(null);
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Mise a jour de la tache indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ARCHIVE, ne supprime pas. La tache part dans les archives et reste
  // restaurable — aucune suppression physique n'existe dans ce module.
  async function archiveTask(taskId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Archivage de la tache indisponible.");
      }

      setConfirmingArchiveId(null);
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Archivage de la tache indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Restaurer remet la tache dans la liste active, avec son statut, son
  // echeance et son contexte tels qu'ils etaient a l'archivage.
  async function restoreTask(taskId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/tasks/${taskId}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Restauration de la tache indisponible.");
      }

      setArchivedTasks((current) => current.filter((task) => task.id !== taskId));
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Restauration de la tache indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PersonalModuleCard title="Nouvelle tâche">
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
              Intitulé
            </span>
            <input
              className="w-full rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]/60"
              maxLength={TASK_TITLE_MAX_LENGTH}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Ce qu'il reste à faire"
              type="text"
              value={draftTitle}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                Échéance (optionnelle)
              </span>
              <input
                className="w-full rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]/60"
                onChange={(event) => setDraftDueOn(event.target.value)}
                type="date"
                value={draftDueOn}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A7B0C0]">
                Contexte (optionnel)
              </span>
              <input
                className="w-full rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]/60"
                maxLength={TASK_CONTEXT_LABEL_MAX_LENGTH}
                onChange={(event) => setDraftContext(event.target.value)}
                placeholder="perso, pro…"
                type="text"
                value={draftContext}
              />
            </label>
          </div>

          {draftTouched && !draftCheck.ok ? (
            <p className="text-sm text-[#fecaca]">{draftCheck.error}</p>
          ) : null}

          <button
            className="justify-self-start rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canSubmitDraft}
            onClick={submitDraft}
            type="button"
          >
            Ajouter
          </button>
        </div>
      </PersonalModuleCard>

      {error ? (
        <div className="rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-4">
          <p className="text-sm text-[#fecaca]">{error}</p>
        </div>
      ) : null}

      <PersonalModuleCard title="Tâches">
        {isLoading ? (
          <p className="text-sm text-[#A7B0C0]">Chargement...</p>
        ) : tasks.length === 0 ? (
          <PersonalEmptyState source="Aucune tâche pour l'instant." />
        ) : (
          <div className="grid gap-3">
            {/* La charge en attente vient du serveur, comptee a la lecture.
                Aucune colonne ne la persiste, donc elle ne peut pas se perimer. */}
            <p className="text-sm text-[#A7B0C0]">
              {pendingCount} tâche{pendingCount > 1 ? "s" : ""} en attente sur{" "}
              {tasks.length}
            </p>

            <ul className="grid gap-3">
              {tasks.map((task) => {
                const due = dueState(task);

                return (
                  <li
                    className="rounded-md border border-[#1D2A44] bg-[#08111A] p-4"
                    key={task.id}
                  >
                    {editingId === task.id ? (
                      <div className="grid gap-3">
                        <input
                          className="w-full rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]/60"
                          maxLength={TASK_TITLE_MAX_LENGTH}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          type="text"
                          value={editingTitle}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            className="w-full rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]/60"
                            onChange={(event) => setEditingDueOn(event.target.value)}
                            type="date"
                            value={editingDueOn}
                          />
                          <input
                            className="w-full rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]/60"
                            maxLength={TASK_CONTEXT_LABEL_MAX_LENGTH}
                            onChange={(event) => setEditingContext(event.target.value)}
                            placeholder="perso, pro…"
                            type="text"
                            value={editingContext}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-3 py-1.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={isSubmitting}
                            onClick={() => submitEdit(task.id)}
                            type="button"
                          >
                            Enregistrer
                          </button>
                          <button
                            className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
                            disabled={isSubmitting}
                            onClick={() => setEditingId(null)}
                            type="button"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <label className="flex min-w-0 cursor-pointer items-start gap-3">
                            <input
                              aria-label={
                                task.status === "done"
                                  ? "Marquer comme à faire"
                                  : "Marquer comme faite"
                              }
                              checked={task.status === "done"}
                              className="mt-1 h-4 w-4 accent-[#39E6D0]"
                              disabled={isSubmitting}
                              onChange={() => toggleStatus(task)}
                              type="checkbox"
                            />
                            <span className="min-w-0">
                              <span
                                className={`block text-sm font-semibold ${
                                  task.status === "done"
                                    ? "text-[#64748b] line-through"
                                    : "text-[#F8FAFC]"
                                }`}
                              >
                                {task.title}
                              </span>
                              <span className="mt-1 block text-xs text-[#64748b]">
                                {task.dueOn ? (
                                  <span
                                    className={
                                      due === "overdue"
                                        ? "text-[#fecaca]"
                                        : due === "today"
                                          ? "text-[#fbbf24]"
                                          : undefined
                                    }
                                  >
                                    {due === "overdue"
                                      ? "En retard · "
                                      : due === "today"
                                        ? "Aujourd'hui · "
                                        : ""}
                                    {formatDueOn(task.dueOn)}
                                  </span>
                                ) : (
                                  "Pas d'échéance"
                                )}
                                {task.contextLabel ? ` · ${task.contextLabel}` : ""}
                              </span>
                            </span>
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
                              disabled={isSubmitting}
                              onClick={() => startEditing(task)}
                              type="button"
                            >
                              Modifier
                            </button>
                            <button
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#f59e0b]/40 hover:text-[#F8FAFC]"
                              disabled={isSubmitting}
                              onClick={() => setConfirmingArchiveId(task.id)}
                              type="button"
                            >
                              Archiver
                            </button>
                          </div>
                        </div>

                        {confirmingArchiveId === task.id ? (
                          <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/10 p-3">
                            <p className="text-sm text-[#fbbf24]">
                              Confirmer l&apos;archivage ? La tâche reste restaurable.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="rounded-md border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-3 py-1.5 text-sm font-semibold text-[#fbbf24] transition hover:bg-[#f59e0b]/25 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={isSubmitting}
                                onClick={() => archiveTask(task.id)}
                                type="button"
                              >
                                Archiver
                              </button>
                              <button
                                className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
                                disabled={isSubmitting}
                                onClick={() => setConfirmingArchiveId(null)}
                                type="button"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </PersonalModuleCard>

      {/* Les archives vivent dans une carte separee, jamais dans la liste
          active : aucune tache ne doit laisser croire qu'elle est encore
          suivie. Le seul geste possible ici est Restaurer — la suppression
          definitive par element n'est pas branchee sur ce module, elle viendra
          avec le chantier d'extension. */}
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
              ) : archivedTasks.length === 0 ? (
                <PersonalEmptyState source="Aucune tâche archivée." />
              ) : (
                <ul className="grid gap-3">
                  {archivedTasks.map((task) => (
                    <li
                      className="rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] p-4"
                      key={task.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#A7B0C0]">
                            {task.title}
                          </p>
                          <p className="mt-1 text-xs text-[#64748b]">
                            {task.status === "done" ? "Faite" : "À faire"}
                            {task.dueOn ? ` · ${formatDueOn(task.dueOn)}` : ""}
                            {task.contextLabel ? ` · ${task.contextLabel}` : ""} · archivée
                            le {formatArchivedAt(task.archivedAt)}
                          </p>
                        </div>
                        <button
                          className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-3 py-1.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={isSubmitting}
                          onClick={() => restoreTask(task.id)}
                          type="button"
                        >
                          Restaurer
                        </button>
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
