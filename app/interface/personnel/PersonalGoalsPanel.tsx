"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GOAL_TITLE_MAX_LENGTH,
  GOAL_UNIT_LABEL_MAX_LENGTH,
  TARGET_EQUALS_START_ERROR,
  goalProgress,
  parseGoalTitleValue,
  parseGoalValue,
  type ArchivedPersonalGoal,
  type PersonalGoal,
} from "@/lib/personal/goals";
import { PersonalModuleCard } from "./PersonalPrimitives";

// Trois helpers copies de PersonalTasksPanel, a l'identique. Troisieme
// duplication du genre dans le pole, avec formatJournalTimestamp : les
// rassembler merite un commit dedie, pas un passage clandestin dans celui-ci.
//
// Une echeance est un jour, pas un instant : elle s'affiche sans heure, et le
// suffixe T00:00:00 evite que la date nue soit interpretee en UTC puis reculee
// d'un jour a l'affichage.
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

function todayInParis() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Qualification purement visuelle, jamais persistee : "en retard" se recalcule a
// chaque rendu depuis la date du jour. Un objectif declare atteint n'est jamais
// en retard, quelle que soit son echeance.
function dueState(goal: PersonalGoal) {
  if (goal.status === "achieved" || goal.dueOn === null) {
    return null;
  }

  const today = todayInParis();

  if (goal.dueOn < today) {
    return "overdue" as const;
  }

  if (goal.dueOn === today) {
    return "today" as const;
  }

  return null;
}

// Trois decimales au plus, comme la colonne. Les zeros inutiles sont retires :
// une cible de 5000 s'ecrit "5 000", pas "5 000,000".
const VALUE_FORMAT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

function formatValue(value: number, unitLabel: string | null = null) {
  const formatted = VALUE_FORMAT.format(value);

  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

// Lecture d'un champ de saisie numerique.
//
// La VIRGULE est acceptee et normalisee : un clavier francais la produit, et la
// refuser ferait rejeter une saisie correcte. Les espaces sont retires, pour
// qu'un separateur de milliers colle ne bloque pas.
//
// Le champ vide rend null — "non renseigne" —, que l'appelant traduit en valeur
// par defaut a la creation, ou en refus a la modification. Les bornes et la
// limite de trois decimales viennent de parseGoalValue, le module des routes :
// le refus avant appel et le 400 du serveur ne peuvent pas diverger.
type ValueInputResult =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

function readValueInput(raw: string, field: string): ValueInputResult {
  const text = raw.replace(/\s/g, "").replace(",", ".");

  if (text.length === 0) {
    return { ok: true, value: null };
  }

  const parsed = Number(text);

  if (!Number.isFinite(parsed)) {
    return { ok: false, error: `${field} : un nombre est attendu.` };
  }

  return parseGoalValue(parsed, field);
}

const PROGRESS_STATE_LABEL: Record<string, string | null> = {
  behind: "En recul par rapport au départ",
  inProgress: null,
  reached: "Cible atteinte",
  exceeded: "Cible dépassée",
};

// Barre de progression. Le pourcentage est borne et arrondi VERS LE BAS par
// goalProgress ; la mention d'etat dit ce que la barre seule confond — un recul
// et un debut valent tous deux 0 %, un depassement et une cible juste atteinte
// valent tous deux 100 %.
function GoalProgressBar({ goal, muted = false }: { goal: PersonalGoal; muted?: boolean }) {
  const progress = goalProgress(goal);
  const stateLabel = PROGRESS_STATE_LABEL[progress.state];

  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`text-sm ${muted ? "text-[#64748b]" : "text-[#F8FAFC]"}`}>
          {formatValue(goal.currentValue)} / {formatValue(goal.targetValue, goal.unitLabel)}
          {goal.startValue !== 0 ? (
            <span className="text-[#64748b]">
              {" "}
              · départ {formatValue(goal.startValue)}
            </span>
          ) : null}
        </p>
        <p className={`text-sm font-semibold ${muted ? "text-[#64748b]" : "text-[#39E6D0]"}`}>
          {progress.percent} %
        </p>
      </div>
      <div
        aria-hidden="true"
        className="h-2 w-full overflow-hidden rounded-full border border-[#1D2A44] bg-[#03070B]"
      >
        <div
          className={`h-full rounded-full ${muted ? "bg-[#334155]" : "bg-[#39E6D0]/70"}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      {stateLabel ? (
        <p
          className={`text-xs ${
            progress.state === "behind" ? "text-[#fbbf24]" : "text-[#39E6D0]"
          }`}
        >
          {stateLabel}
        </p>
      ) : null}
    </div>
  );
}

// Cinquieme module a saisie manuelle du pole, sur le patron de Taches. La
// validation vient de lib/personal/goals.ts, le meme module que celui utilise
// par les routes API.
//
// La progression est calculee ICI, a l'affichage, par goalProgress : elle n'est
// ni stockee en base ni renvoyee par l'API. Une seule implementation, pour
// qu'aucune copie ne derive de la formule.
export function PersonalGoalsPanel() {
  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftStart, setDraftStart] = useState("");
  const [draftTarget, setDraftTarget] = useState("");
  const [draftCurrent, setDraftCurrent] = useState("");
  const [draftUnit, setDraftUnit] = useState("");
  const [draftDueOn, setDraftDueOn] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Mise a jour rapide de la valeur actuelle : un brouillon par objectif, le
  // geste repete du module. Distinct de l'edition complete ci-dessous.
  const [valueDrafts, setValueDrafts] = useState<Record<string, string>>({});
  const [valueError, setValueError] = useState<{ goalId: string; message: string } | null>(
    null,
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingStart, setEditingStart] = useState("");
  const [editingTarget, setEditingTarget] = useState("");
  const [editingCurrent, setEditingCurrent] = useState("");
  const [editingUnit, setEditingUnit] = useState("");
  const [editingDueOn, setEditingDueOn] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string | null>(null);

  // Les archives forment une liste separee, jamais melangee a la liste active :
  // deux etats, deux appels, deux listes.
  const [archivedCount, setArchivedCount] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedGoals, setArchivedGoals] = useState<ArchivedPersonalGoal[]>([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);

  const fetchActive = useCallback(async () => {
    const response = await fetch("/api/personal/goals", { cache: "no-store" });
    const payload = (await response.json()) as {
      goals?: PersonalGoal[];
      archivedCount?: number;
      error?: string;
    };

    if (!response.ok || !payload.goals) {
      throw new Error(payload.error ?? "Lecture des objectifs indisponible.");
    }

    return { goals: payload.goals, archivedCount: payload.archivedCount ?? 0 };
  }, []);

  const fetchArchived = useCallback(async () => {
    const response = await fetch("/api/personal/goals?archived=true", { cache: "no-store" });
    const payload = (await response.json()) as {
      goals?: ArchivedPersonalGoal[];
      error?: string;
    };

    if (!response.ok || !payload.goals) {
      throw new Error(payload.error ?? "Lecture des archives indisponible.");
    }

    return payload.goals;
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchActive()
      .then((next) => {
        if (isMounted) {
          setGoals(next.goals);
          setArchivedCount(next.archivedCount);
          setError(null);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Lecture des objectifs indisponible.",
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

  // Rechargee apres chaque ecriture plutot que corrigee localement : le tri
  // depend de l'echeance, donc modifier une date change la place de l'objectif
  // dans la liste, et le compteur d'archives vient de la meme reponse.
  async function refresh() {
    const next = await fetchActive();
    setGoals(next.goals);
    setArchivedCount(next.archivedCount);

    if (showArchived) {
      setArchivedGoals(await fetchArchived());
    }

    setError(null);
  }

  async function openArchives() {
    setShowArchived(true);
    setIsLoadingArchived(true);

    try {
      setArchivedGoals(await fetchArchived());
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

  // Les champs vides ne sont PAS envoyes : le serveur applique alors ses
  // defauts, depart a 0 et valeur actuelle egale au depart. Les repeter ici en
  // ferait une seconde source, qui pourrait diverger.
  async function submitDraft() {
    const title = parseGoalTitleValue(draftTitle);

    if (!title.ok) {
      setCreateError(title.error);
      return;
    }

    const start = readValueInput(draftStart, "La valeur de départ");

    if (!start.ok) {
      setCreateError(start.error);
      return;
    }

    const target = readValueInput(draftTarget, "La valeur cible");

    if (!target.ok) {
      setCreateError(target.error);
      return;
    }

    if (target.value === null) {
      setCreateError("La valeur cible est obligatoire.");
      return;
    }

    const current = readValueInput(draftCurrent, "La valeur actuelle");

    if (!current.ok) {
      setCreateError(current.error);
      return;
    }

    if (target.value === (start.value ?? 0)) {
      setCreateError(TARGET_EQUALS_START_ERROR);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/personal/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.title,
          targetValue: target.value,
          ...(start.value === null ? {} : { startValue: start.value }),
          ...(current.value === null ? {} : { currentValue: current.value }),
          // La chaine vide part telle quelle : le serveur la normalise en null.
          unitLabel: draftUnit,
          dueOn: draftDueOn,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setCreateError(payload.error ?? "Creation de l'objectif indisponible.");
        return;
      }

      setDraftTitle("");
      setDraftStart("");
      setDraftTarget("");
      setDraftCurrent("");
      setDraftUnit("");
      setDraftDueOn("");
      setCreateError(null);
      await refresh();
    } catch {
      setCreateError("Creation de l'objectif indisponible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Geste repete du module : n'envoie que currentValue, donc l'unite, l'echeance
  // et le statut ne sont pas touches — c'est ce que garantit la distinction
  // "champ absent" / "champ a null" de parseGoalUpdatePayload.
  async function submitValue(goal: PersonalGoal) {
    const raw = valueDrafts[goal.id] ?? "";
    const parsed = readValueInput(raw, "La valeur actuelle");

    if (!parsed.ok) {
      setValueError({ goalId: goal.id, message: parsed.error });
      return;
    }

    if (parsed.value === null) {
      setValueError({ goalId: goal.id, message: "La valeur actuelle est obligatoire." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentValue: parsed.value }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setValueError({
          goalId: goal.id,
          message: payload.error ?? "Mise a jour de la valeur indisponible.",
        });
        return;
      }

      setValueDrafts((current) => {
        const next = { ...current };
        delete next[goal.id];
        return next;
      });
      setValueError(null);
      await refresh();
    } catch {
      setValueError({ goalId: goal.id, message: "Mise a jour de la valeur indisponible." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Le statut se DECLARE. Atteindre la cible ne le change pas : "cible atteinte"
  // se deduit des valeurs, "atteint" se declare, et l'ecran affiche les deux
  // sans les confondre.
  async function toggleStatus(goal: PersonalGoal) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: goal.status === "achieved" ? "active" : "achieved",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Mise a jour de l'objectif indisponible.");
      }

      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Mise a jour de l'objectif indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(goal: PersonalGoal) {
    setEditingId(goal.id);
    setEditingTitle(goal.title);
    setEditingStart(String(goal.startValue));
    setEditingTarget(String(goal.targetValue));
    setEditingCurrent(String(goal.currentValue));
    setEditingUnit(goal.unitLabel ?? "");
    setEditingDueOn(goal.dueOn ?? "");
    setEditError(null);
    setConfirmingArchiveId(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditError(null);
  }

  // L'edition porte sur l'objectif entier : les trois valeurs sont obligatoires
  // ici, contrairement a la creation. Une colonne not null ne peut pas etre
  // videe, et laisser un champ vide signifierait "efface", ce qui n'existe pas.
  async function submitEdit(goalId: string) {
    const title = parseGoalTitleValue(editingTitle);

    if (!title.ok) {
      setEditError(title.error);
      return;
    }

    const fields: Array<[string, string, string]> = [
      ["startValue", editingStart, "La valeur de départ"],
      ["targetValue", editingTarget, "La valeur cible"],
      ["currentValue", editingCurrent, "La valeur actuelle"],
    ];
    const values: Record<string, number> = {};

    for (const [key, raw, label] of fields) {
      const parsed = readValueInput(raw, label);

      if (!parsed.ok) {
        setEditError(parsed.error);
        return;
      }

      if (parsed.value === null) {
        setEditError(`${label} est obligatoire.`);
        return;
      }

      values[key] = parsed.value;
    }

    if (values.targetValue === values.startValue) {
      setEditError(TARGET_EQUALS_START_ERROR);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/goals/${goalId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.title,
          startValue: values.startValue,
          targetValue: values.targetValue,
          currentValue: values.currentValue,
          unitLabel: editingUnit,
          dueOn: editingDueOn,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setEditError(payload.error ?? "Mise a jour de l'objectif indisponible.");
        return;
      }

      setEditingId(null);
      setEditError(null);
      await refresh();
    } catch {
      setEditError("Mise a jour de l'objectif indisponible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ARCHIVE, ne supprime pas : la ligne reste en base et reste restaurable.
  async function archiveGoal(goalId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/goals/${goalId}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Archivage de l'objectif indisponible.");
      }

      setConfirmingArchiveId(null);
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Archivage de l'objectif indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function restoreGoal(goalId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/goals/${goalId}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Restauration de l'objectif indisponible.");
      }

      setArchivedGoals((current) => current.filter((goal) => goal.id !== goalId));
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Restauration de l'objectif indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-[#1D2A44] bg-[#03070B] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#64748b] focus:border-[#39E6D0]/60";
  const neutralButtonClass =
    "rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#39E6D0]/40 hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40";
  const accentButtonClass =
    "rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-3 py-1.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="grid gap-4">
      <PersonalModuleCard title="Nouvel objectif">
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-[#A7B0C0]">Intitulé</span>
            <input
              className={inputClass}
              maxLength={GOAL_TITLE_MAX_LENGTH}
              onChange={(event) => {
                setDraftTitle(event.target.value);
                setCreateError(null);
              }}
              placeholder="Épargne de précaution, poids, lectures..."
              value={draftTitle}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-sm text-[#A7B0C0]">Valeur de départ</span>
              <input
                className={inputClass}
                inputMode="decimal"
                onChange={(event) => {
                  setDraftStart(event.target.value);
                  setCreateError(null);
                }}
                placeholder="0"
                value={draftStart}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-[#A7B0C0]">Valeur cible</span>
              <input
                className={inputClass}
                inputMode="decimal"
                onChange={(event) => {
                  setDraftTarget(event.target.value);
                  setCreateError(null);
                }}
                placeholder="5000"
                value={draftTarget}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-[#A7B0C0]">Valeur actuelle</span>
              <input
                className={inputClass}
                inputMode="decimal"
                onChange={(event) => {
                  setDraftCurrent(event.target.value);
                  setCreateError(null);
                }}
                placeholder="= départ"
                value={draftCurrent}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm text-[#A7B0C0]">Unité (facultative)</span>
              <input
                className={inputClass}
                maxLength={GOAL_UNIT_LABEL_MAX_LENGTH}
                onChange={(event) => {
                  setDraftUnit(event.target.value);
                  setCreateError(null);
                }}
                placeholder="EUR, kg, km, livres..."
                value={draftUnit}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-[#A7B0C0]">Échéance (facultative)</span>
              <input
                className={inputClass}
                onChange={(event) => {
                  setDraftDueOn(event.target.value);
                  setCreateError(null);
                }}
                type="date"
                value={draftDueOn}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm">
              {createError ? (
                <span className="text-[#fbbf24]">{createError}</span>
              ) : (
                <span className="text-[#64748b]">
                  La virgule est acceptée, trois décimales au maximum.
                </span>
              )}
            </p>
            <button
              className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isSubmitting || draftTitle.trim().length === 0}
              onClick={submitDraft}
              type="button"
            >
              {isSubmitting ? "Enregistrement..." : "Ajouter"}
            </button>
          </div>
        </div>
      </PersonalModuleCard>

      {error ? (
        <div className="rounded-md border border-[#f87171]/40 bg-[#f87171]/10 p-4" role="alert">
          <p className="text-sm text-[#fecaca]">{error}</p>
        </div>
      ) : null}

      <PersonalModuleCard title="Objectifs suivis">
        {isLoading ? (
          <p className="text-sm text-[#A7B0C0]">Chargement...</p>
        ) : goals.length === 0 ? (
          // Meme cadre que PersonalEmptyState, mais pas son titre : "Aucune
          // donnee connectee" parle d'une source externe a brancher, alors
          // qu'ici il n'y a rien a connecter — seulement un premier objectif a
          // creer. Meme choix que la carte des categories de Journal.
          <div className="rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] p-4">
            <p className="text-sm font-semibold text-[#F8FAFC]">
              Aucun objectif pour l&apos;instant.
            </p>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              Crée le premier avec le formulaire ci-dessus. Une valeur de départ et une cible
              suffisent.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {goals.map((goal) => {
              const progress = goalProgress(goal);
              const due = dueState(goal);
              const valueDraft = valueDrafts[goal.id] ?? "";

              return (
                <li
                  className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4"
                  key={goal.id}
                >
                  {editingId === goal.id ? (
                    <div className="grid gap-3">
                      <label className="grid gap-1">
                        <span className="text-sm text-[#A7B0C0]">Intitulé</span>
                        <input
                          className={inputClass}
                          maxLength={GOAL_TITLE_MAX_LENGTH}
                          onChange={(event) => {
                            setEditingTitle(event.target.value);
                            setEditError(null);
                          }}
                          value={editingTitle}
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="grid gap-1">
                          <span className="text-sm text-[#A7B0C0]">Départ</span>
                          <input
                            className={inputClass}
                            inputMode="decimal"
                            onChange={(event) => {
                              setEditingStart(event.target.value);
                              setEditError(null);
                            }}
                            value={editingStart}
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm text-[#A7B0C0]">Cible</span>
                          <input
                            className={inputClass}
                            inputMode="decimal"
                            onChange={(event) => {
                              setEditingTarget(event.target.value);
                              setEditError(null);
                            }}
                            value={editingTarget}
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm text-[#A7B0C0]">Actuelle</span>
                          <input
                            className={inputClass}
                            inputMode="decimal"
                            onChange={(event) => {
                              setEditingCurrent(event.target.value);
                              setEditError(null);
                            }}
                            value={editingCurrent}
                          />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1">
                          <span className="text-sm text-[#A7B0C0]">Unité</span>
                          <input
                            className={inputClass}
                            maxLength={GOAL_UNIT_LABEL_MAX_LENGTH}
                            onChange={(event) => {
                              setEditingUnit(event.target.value);
                              setEditError(null);
                            }}
                            value={editingUnit}
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-sm text-[#A7B0C0]">Échéance</span>
                          <input
                            className={inputClass}
                            onChange={(event) => {
                              setEditingDueOn(event.target.value);
                              setEditError(null);
                            }}
                            type="date"
                            value={editingDueOn}
                          />
                        </label>
                      </div>
                      {editError ? (
                        <p aria-live="polite" className="text-sm text-[#fbbf24]">
                          {editError}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={accentButtonClass}
                          disabled={isSubmitting}
                          onClick={() => submitEdit(goal.id)}
                          type="button"
                        >
                          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                        </button>
                        <button
                          className={neutralButtonClass}
                          disabled={isSubmitting}
                          onClick={cancelEditing}
                          type="button"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-[#F8FAFC]">{goal.title}</p>
                        {goal.status === "achieved" ? (
                          <span className="rounded border border-[#39E6D0]/40 bg-[#39E6D0]/10 px-2 py-0.5 text-xs font-semibold text-[#39E6D0]">
                            Atteint
                          </span>
                        ) : null}
                      </div>

                      <GoalProgressBar goal={goal} />

                      {goal.dueOn ? (
                        <p className="text-xs text-[#64748b]">
                          Échéance : {formatDueOn(goal.dueOn)}
                          {due === "overdue" ? (
                            <span className="text-[#fbbf24]"> · en retard</span>
                          ) : due === "today" ? (
                            <span className="text-[#39E6D0]"> · aujourd&apos;hui</span>
                          ) : null}
                        </p>
                      ) : null}

                      {/* Geste repete : une seule valeur, un seul bouton. */}
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="grid gap-1">
                          <span className="text-xs text-[#A7B0C0]">Nouvelle valeur</span>
                          <input
                            className={`${inputClass} w-40`}
                            inputMode="decimal"
                            onChange={(event) => {
                              const next = event.target.value;
                              setValueDrafts((current) => ({ ...current, [goal.id]: next }));
                              setValueError(null);
                            }}
                            placeholder={formatValue(goal.currentValue)}
                            value={valueDraft}
                          />
                        </label>
                        <button
                          className={accentButtonClass}
                          disabled={isSubmitting || valueDraft.trim().length === 0}
                          onClick={() => submitValue(goal)}
                          type="button"
                        >
                          Mettre à jour
                        </button>
                      </div>

                      {valueError?.goalId === goal.id ? (
                        <p className="text-sm text-[#fbbf24]" role="alert">
                          {valueError.message}
                        </p>
                      ) : null}

                      {/* La cible est atteinte, le statut ne l'est pas : l'ecran
                          le signale et propose, il ne declare jamais a la
                          place. */}
                      {goal.status === "active" &&
                      (progress.state === "reached" || progress.state === "exceeded") ? (
                        <p className="text-xs text-[#39E6D0]">
                          La cible est atteinte. Reste à le déclarer, si c&apos;est le cas.
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2">
                        {confirmingArchiveId === goal.id ? (
                          <>
                            <span className="text-sm text-[#fbbf24]">
                              Confirmer l&apos;archivage ?
                            </span>
                            <button
                              className="rounded-md border border-[#f87171]/50 bg-[#f87171]/15 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/25 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => archiveGoal(goal.id)}
                              type="button"
                            >
                              Archiver
                            </button>
                            <button
                              className={neutralButtonClass}
                              disabled={isSubmitting}
                              onClick={() => setConfirmingArchiveId(null)}
                              type="button"
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={neutralButtonClass}
                              disabled={isSubmitting}
                              onClick={() => startEditing(goal)}
                              type="button"
                            >
                              Modifier
                            </button>
                            <button
                              className={neutralButtonClass}
                              disabled={isSubmitting}
                              onClick={() => toggleStatus(goal)}
                              type="button"
                            >
                              {goal.status === "achieved"
                                ? "Rouvrir"
                                : "Marquer comme atteint"}
                            </button>
                            <button
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#f87171]/50 hover:text-[#fecaca] disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => {
                                setConfirmingArchiveId(goal.id);
                                cancelEditing();
                              }}
                              type="button"
                            >
                              Archiver
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PersonalModuleCard>

      {/* Carte separee : aucun objectif archive ne doit pouvoir passer pour
          actif. Un seul geste y est possible, Restaurer. La suppression
          definitive n'existe pas encore dans ce module. */}
      {archivedCount > 0 || showArchived ? (
        <div className="grid gap-3">
          <button
            className={`justify-self-start ${neutralButtonClass}`}
            onClick={() => (showArchived ? setShowArchived(false) : openArchives())}
            type="button"
          >
            {showArchived ? "Masquer les archives" : `Voir les archives (${archivedCount})`}
          </button>

          {showArchived ? (
            <PersonalModuleCard title="Archives">
              {isLoadingArchived ? (
                <p className="text-sm text-[#A7B0C0]">Chargement...</p>
              ) : archivedGoals.length === 0 ? (
                <p className="text-sm text-[#A7B0C0]">Aucun objectif archivé.</p>
              ) : (
                <ul className="grid gap-3">
                  {archivedGoals.map((goal) => (
                    <li
                      className="rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] p-4"
                      key={goal.id}
                    >
                      <div className="grid gap-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-[#A7B0C0]">{goal.title}</p>
                          {goal.status === "achieved" ? (
                            <span className="text-xs text-[#64748b]">Atteint</span>
                          ) : null}
                        </div>

                        <GoalProgressBar goal={goal} muted />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-[#64748b]">
                            Archivé le {formatArchivedAt(goal.archivedAt)}
                            {goal.dueOn ? ` · échéance ${formatDueOn(goal.dueOn)}` : ""}
                          </p>
                          <button
                            className={accentButtonClass}
                            disabled={isSubmitting}
                            onClick={() => restoreGoal(goal.id)}
                            type="button"
                          >
                            Restaurer
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-[#64748b]">
                La suppression définitive d&apos;un objectif archivé n&apos;est pas encore
                construite.
              </p>
            </PersonalModuleCard>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
