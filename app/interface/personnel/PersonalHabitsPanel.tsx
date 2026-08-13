"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HABIT_NAME_MAX_LENGTH,
  HABIT_WEEKLY_TARGET_MAX,
  HABIT_WEEKLY_TARGET_MIN,
  parseHabitNameValue,
  type ArchivedPersonalHabit,
  type HabitFrequencyType,
  type PersonalHabit,
  type PersonalHabitWithStats,
} from "@/lib/personal/habits";
import { PersonalEmptyState, PersonalModuleCard } from "./PersonalPrimitives";

// Derive des bornes partagees plutot que code en dur : le selecteur ne peut pas
// proposer une valeur que la validation refuserait.
const WEEKLY_TARGETS = Array.from(
  { length: HABIT_WEEKLY_TARGET_MAX - HABIT_WEEKLY_TARGET_MIN + 1 },
  (_, index) => HABIT_WEEKLY_TARGET_MIN + index,
);

// Prend PersonalHabit et non PersonalHabitWithStats : la frequence se lit
// aussi bien sur une habitude archivee, qui n'a pas de statistiques.
function frequencyLabel(habit: PersonalHabit) {
  return habit.frequencyType === "daily"
    ? "Tous les jours"
    : `${habit.frequencyTarget}× par semaine`;
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

// La serie se lit dans deux unites selon la frequence : une habitude
// hebdomadaire se mesure en semaines, puisque c'est l'unite sur laquelle
// l'engagement a ete pris. L'etiquette doit donc porter l'unite, sinon "3" est
// ambigu.
function streakLabel(habit: PersonalHabitWithStats) {
  if (habit.streak === 0) {
    return "Aucune série en cours";
  }

  if (habit.streakUnit === "days") {
    return habit.streak === 1 ? "1 jour d'affilée" : `${habit.streak} jours d'affilée`;
  }

  return habit.streak === 1 ? "1 semaine d'affilée" : `${habit.streak} semaines d'affilée`;
}

function constancyLabel(habit: PersonalHabitWithStats) {
  // null tant qu'aucune semaine complete ne s'est ecoulee : afficher 0 % pour
  // une habitude creee avant-hier serait faux.
  if (habit.constancyRate === null) {
    return "Pas encore mesurable";
  }

  return `${Math.round(habit.constancyRate * 100)} % sur 4 semaines`;
}

function FrequencyPicker({
  disabled = false,
  frequencyTarget,
  frequencyType,
  onChange,
}: {
  disabled?: boolean;
  frequencyTarget: number;
  frequencyType: HabitFrequencyType;
  onChange: (next: { frequencyType: HabitFrequencyType; frequencyTarget: number }) => void;
}) {
  const pill = (active: boolean) =>
    `rounded-md border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? "border-[#39E6D0]/60 bg-[#39E6D0]/15 text-[#39E6D0]"
        : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
    }`;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[#A7B0C0]">Fréquence</span>
        <button
          aria-pressed={frequencyType === "daily"}
          className={pill(frequencyType === "daily")}
          disabled={disabled}
          onClick={() => onChange({ frequencyType: "daily", frequencyTarget })}
          type="button"
        >
          Tous les jours
        </button>
        <button
          aria-pressed={frequencyType === "weekly"}
          className={pill(frequencyType === "weekly")}
          disabled={disabled}
          onClick={() => onChange({ frequencyType: "weekly", frequencyTarget })}
          type="button"
        >
          X fois par semaine
        </button>
      </div>

      {frequencyType === "weekly" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[#A7B0C0]">Objectif</span>
          {WEEKLY_TARGETS.map((target) => (
            <button
              aria-label={`${target} fois par semaine`}
              aria-pressed={frequencyTarget === target}
              className={`h-8 w-8 rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                frequencyTarget === target
                  ? "border-[#39E6D0]/60 bg-[#39E6D0]/15 text-[#39E6D0]"
                  : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
              }`}
              disabled={disabled}
              key={target}
              onClick={() => onChange({ frequencyType: "weekly", frequencyTarget: target })}
              type="button"
            >
              {target}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Troisieme module a saisie manuelle du pole, et le premier a deux tables. La
// serie et le taux de constance ne sont jamais calcules ici : ils viennent du
// serveur, qui les derive de l'historique des realisations. Toute mutation
// declenche donc un rechargement de la liste plutot qu'une mise a jour locale
// approximative.
//
// Hors perimetre, differe et non oublie : le graphique par habitude.
export function PersonalHabitsPanel() {
  const [habits, setHabits] = useState<PersonalHabitWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<HabitFrequencyType>("daily");
  const [draftTarget, setDraftTarget] = useState(3);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingType, setEditingType] = useState<HabitFrequencyType>("daily");
  const [editingTarget, setEditingTarget] = useState(3);

  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string | null>(null);

  // Les archives forment une liste separee, jamais melangee a la liste active :
  // deux etats, deux appels, deux listes.
  const [archivedCount, setArchivedCount] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedHabits, setArchivedHabits] = useState<ArchivedPersonalHabit[]>([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/personal/habits", { cache: "no-store" });
    const payload = (await response.json()) as {
      habits?: PersonalHabitWithStats[];
      archivedCount?: number;
      error?: string;
    };

    if (!response.ok || !payload.habits) {
      throw new Error(payload.error ?? "Lecture des habitudes indisponible.");
    }

    return { habits: payload.habits, archivedCount: payload.archivedCount ?? 0 };
  }, []);

  // Les archives ne portent ni serie ni taux de constance : le type
  // ArchivedPersonalHabit ne comporte pas ces champs, et le serveur ne les
  // calcule pas sur ce chemin.
  const fetchArchived = useCallback(async () => {
    const response = await fetch("/api/personal/habits?archived=true", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      habits?: ArchivedPersonalHabit[];
      error?: string;
    };

    if (!response.ok || !payload.habits) {
      throw new Error(payload.error ?? "Lecture des archives indisponible.");
    }

    return payload.habits;
  }, []);

  useEffect(() => {
    let isMounted = true;

    load()
      .then((next) => {
        if (isMounted) {
          setHabits(next.habits);
          setArchivedCount(next.archivedCount);
          setError(null);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Lecture des habitudes indisponible.",
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
  }, [load]);

  // Rechargee apres chaque mutation. Le compteur d'archives vient de la meme
  // reponse, donc archiver une habitude le met a jour sans compte local a
  // maintenir. Si les archives sont ouvertes, elles sont rafraichies aussi,
  // sans quoi la liste affichee serait perimee.
  async function refresh() {
    const next = await load();
    setHabits(next.habits);
    setArchivedCount(next.archivedCount);

    if (showArchived) {
      setArchivedHabits(await fetchArchived());
    }

    setError(null);
  }

  async function openArchives() {
    setShowArchived(true);
    setIsLoadingArchived(true);

    try {
      setArchivedHabits(await fetchArchived());
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

  // Restaurer remet l'habitude dans la liste active, avec son historique de
  // realisations intact — l'archivage ne l'avait jamais touche. Serie et taux de
  // constance sont donc recalcules par le rechargement.
  async function restoreHabit(habitId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/habits/${habitId}/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Restauration de l'habitude indisponible.");
      }

      setArchivedHabits((current) => current.filter((habit) => habit.id !== habitId));
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Restauration de l'habitude indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const draftCheck = parseHabitNameValue(draftName);
  const draftTouched = draftName.trim().length > 0;

  async function createHabit() {
    const checked = parseHabitNameValue(draftName);

    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/personal/habits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: checked.name,
          frequencyType: draftType,
          frequencyTarget: draftType === "weekly" ? draftTarget : null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Creation de l'habitude indisponible.");
      }

      setDraftName("");
      setDraftType("daily");
      setDraftTarget(3);
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Creation de l'habitude indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleToday(habit: PersonalHabitWithStats) {
    setPendingId(habit.id);

    try {
      const response = await fetch(`/api/personal/habits/${habit.id}/completions`, {
        method: habit.completedToday ? "DELETE" : "POST",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Mise a jour de la realisation indisponible.");
      }

      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Mise a jour de la realisation indisponible.",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function saveEdit(habitId: string) {
    const checked = parseHabitNameValue(editingName);

    if (!checked.ok) {
      setError(checked.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/habits/${habitId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: checked.name,
          frequencyType: editingType,
          frequencyTarget: editingType === "weekly" ? editingTarget : null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Mise a jour de l'habitude indisponible.");
      }

      setEditingId(null);
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Mise a jour de l'habitude indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmArchive(habitId: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/personal/habits/${habitId}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Archivage de l'habitude indisponible.");
      }

      setConfirmingArchiveId(null);
      await refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Archivage de l'habitude indisponible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <PersonalModuleCard title="Nouvelle habitude">
        <div className="grid gap-3">
          <input
            className="w-full rounded-md border border-[#1D2A44] bg-[#03070B] p-3 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#64748b] focus:border-[#39E6D0]/60"
            maxLength={HABIT_NAME_MAX_LENGTH}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Lire 20 minutes, courir, méditer..."
            type="text"
            value={draftName}
          />
          <FrequencyPicker
            disabled={isSubmitting}
            frequencyTarget={draftTarget}
            frequencyType={draftType}
            onChange={({ frequencyType, frequencyTarget }) => {
              setDraftType(frequencyType);
              setDraftTarget(frequencyTarget);
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#A7B0C0]">
              {draftTouched && !draftCheck.ok ? (
                <span className="text-[#fbbf24]">{draftCheck.error}</span>
              ) : (
                `${draftName.trim().length} / ${HABIT_NAME_MAX_LENGTH} caracteres`
              )}
            </p>
            <button
              className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-4 py-2 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!draftCheck.ok || isSubmitting}
              onClick={createHabit}
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

      <PersonalModuleCard title="Habitudes suivies">
        {isLoading ? (
          <p className="text-sm text-[#A7B0C0]">Chargement...</p>
        ) : habits.length === 0 ? (
          <PersonalEmptyState source="Aucune habitude pour le moment. La première que tu ajoutes apparaîtra ici." />
        ) : (
          <ul className="grid gap-3">
            {habits.map((habit) => (
              <li
                className="rounded-md border border-[#1D2A44] bg-[#03070B] p-4"
                key={habit.id}
              >
                {editingId === habit.id ? (
                  <div className="grid gap-3">
                    <input
                      className="w-full rounded-md border border-[#1D2A44] bg-[#08111A] p-3 text-sm text-[#F8FAFC] outline-none transition focus:border-[#39E6D0]/60"
                      maxLength={HABIT_NAME_MAX_LENGTH}
                      onChange={(event) => setEditingName(event.target.value)}
                      type="text"
                      value={editingName}
                    />
                    <FrequencyPicker
                      disabled={isSubmitting}
                      frequencyTarget={editingTarget}
                      frequencyType={editingType}
                      onChange={({ frequencyType, frequencyTarget }) => {
                        setEditingType(frequencyType);
                        setEditingTarget(frequencyTarget);
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-3 py-1.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={isSubmitting || !parseHabitNameValue(editingName).ok}
                        onClick={() => saveEdit(habit.id)}
                        type="button"
                      >
                        Enregistrer
                      </button>
                      <button
                        className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
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
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#F8FAFC]">{habit.name}</p>
                        <p className="mt-1 text-xs text-[#64748b]">
                          {frequencyLabel(habit)}
                          {habit.frequencyType === "weekly"
                            ? ` · ${habit.currentPeriodCount}/${habit.currentPeriodTarget} cette semaine`
                            : ""}
                        </p>
                      </div>
                      <button
                        className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          habit.completedToday
                            ? "border-[#39E6D0]/60 bg-[#39E6D0]/15 text-[#39E6D0] hover:bg-[#39E6D0]/25"
                            : "border-[#1D2A44] bg-[#08111A] text-[#A7B0C0] hover:border-[#39E6D0]/40 hover:text-[#F8FAFC]"
                        }`}
                        disabled={pendingId === habit.id || isSubmitting}
                        onClick={() => toggleToday(habit)}
                        type="button"
                      >
                        {habit.completedToday ? "Fait aujourd'hui" : "Marquer aujourd'hui"}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-[#64748b]">
                        {streakLabel(habit)} · {constancyLabel(habit)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {confirmingArchiveId === habit.id ? (
                          <>
                            <span className="text-sm text-[#fbbf24]">Archiver ?</span>
                            <button
                              className="rounded-md border border-[#f87171]/50 bg-[#f87171]/15 px-3 py-1.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[#f87171]/25 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSubmitting}
                              onClick={() => confirmArchive(habit.id)}
                              type="button"
                            >
                              Archiver
                            </button>
                            <button
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:text-[#F8FAFC]"
                              onClick={() => setConfirmingArchiveId(null)}
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
                                setEditingId(habit.id);
                                setEditingName(habit.name);
                                setEditingType(habit.frequencyType);
                                setEditingTarget(habit.frequencyTarget ?? 3);
                                setConfirmingArchiveId(null);
                              }}
                              type="button"
                            >
                              Modifier
                            </button>
                            <button
                              className="rounded-md border border-[#1D2A44] bg-[#08111A] px-3 py-1.5 text-sm font-semibold text-[#A7B0C0] transition hover:border-[#f87171]/50 hover:text-[#fecaca]"
                              onClick={() => {
                                setConfirmingArchiveId(habit.id);
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

      {/* Carte separee : aucune habitude archivee ne doit pouvoir passer pour
          active. Ni serie ni taux de constance ici — ces valeurs n'ont pas de
          sens pour une habitude qu'on ne suit plus, et le type
          ArchivedPersonalHabit ne les porte pas. Seule action possible :
          Restaurer. */}
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
              ) : archivedHabits.length === 0 ? (
                <PersonalEmptyState source="Aucune habitude archivée." />
              ) : (
                <ul className="grid gap-3">
                  {archivedHabits.map((habit) => (
                    <li
                      className="rounded-md border border-dashed border-[#1D2A44] bg-[#03070B] p-4"
                      key={habit.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#A7B0C0]">{habit.name}</p>
                          <p className="mt-1 text-xs text-[#64748b]">
                            {frequencyLabel(habit)} · archivée le{" "}
                            {formatArchivedAt(habit.archivedAt)}
                          </p>
                        </div>
                        <button
                          className="rounded-md border border-[#39E6D0]/60 bg-[#39E6D0]/15 px-3 py-1.5 text-sm font-semibold text-[#39E6D0] transition hover:bg-[#39E6D0]/25 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={isSubmitting}
                          onClick={() => restoreHabit(habit.id)}
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
