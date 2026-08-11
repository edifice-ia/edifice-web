// Types, validation et calculs derives du module Habitudes, sans aucune I/O.
//
// Meme partage que lib/personal/notes.ts et lib/personal/journal.ts face a leur
// store. Ce fichier porte en plus la serie et le taux de constance : ce sont des
// fonctions pures, calculees en lecture, et aucune valeur n'est persistee pour
// elles.

export type HabitFrequencyType = "daily" | "weekly";

export type PersonalHabit = {
  id: string;
  name: string;
  frequencyType: HabitFrequencyType;
  frequencyTarget: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonalHabitWithStats = PersonalHabit & {
  completedToday: boolean;
  // Unite differente selon la frequence : une habitude hebdomadaire se mesure
  // en semaines, puisque c'est l'unite sur laquelle l'engagement a ete pris.
  streak: number;
  streakUnit: "days" | "weeks";
  // Progression dans la periode en cours, affichee a cote de la serie. La
  // periode en cours n'entre jamais dans la serie : elle n'est ni reussie ni
  // ratee tant qu'elle n'est pas finie.
  currentPeriodCount: number;
  currentPeriodTarget: number;
  // null tant qu'aucune semaine complete ne s'est ecoulee depuis la creation :
  // afficher 0 % pour une habitude creee avant-hier serait faux.
  constancyRate: number | null;
};

export const HABIT_NAME_MAX_LENGTH = 120;
export const HABIT_WEEKLY_TARGET_MIN = 1;
export const HABIT_WEEKLY_TARGET_MAX = 7;

// Fenetre de lecture des realisations. Une serie plus longue que cette fenetre
// est plafonnee — cas theorique, et le plafond est preferable a une requete non
// bornee qui grossirait indefiniment.
export const HABIT_COMPLETIONS_WINDOW_DAYS = 400;

const CONSTANCY_WEEKS = 4;

// Jour calendaire en Europe/Paris pour un instant donne, jamais en UTC.
//
// A utiliser pour TOUT horodatage venant de la base : created_at est un
// timestamptz serialise en UTC, et en extraire les dix premiers caracteres
// donne le jour UTC, pas le jour vecu. Une habitude creee a 00h30 heure de
// Paris porte un created_at de la veille en UTC ; la dater ainsi la faisait
// basculer d'une semaine a l'autre et faussait le calcul de constance.
export function parisDayOf(instant: Date | string) {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);
}

// Un jumeau de cette fonction existe dans
// lib/server/personal/daily-brief-engine.ts (todayInParis) ; il n'est pas
// importe ici parce que ce module doit rester utilisable cote client, sans
// tirer la chaine des stores serveur. A consolider le jour ou un troisieme
// consommateur apparait.
export function todayInParis(now = new Date()) {
  return parisDayOf(now);
}

// Arithmetique sur des dates calendaires : on passe par minuit UTC pour que
// l'ajout de jours ne soit jamais perturbe par un changement d'heure.
function toUtcDate(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

export function addDays(day: string, amount: number) {
  const date = toUtcDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

// Lundi comme premier jour, convention ISO.
export function startOfWeek(day: string) {
  const date = toUtcDate(day);
  const weekday = date.getUTCDay();
  return addDays(day, -(weekday === 0 ? 6 : weekday - 1));
}

export function isIsoDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUtcDate(value).getTime());
}

function countBetween(days: Set<string>, from: string, to: string) {
  let total = 0;
  let cursor = from;

  while (cursor <= to) {
    if (days.has(cursor)) {
      total += 1;
    }

    cursor = addDays(cursor, 1);
  }

  return total;
}

// Serie en jours : jours consecutifs realises, en remontant depuis aujourd'hui
// si c'est fait, sinon depuis hier. Ne pas avoir encore coche aujourd'hui a 9 h
// ne casse rien — la journee est en cours.
function dailyStreak(days: Set<string>, today: string) {
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (days.has(cursor) && streak < HABIT_COMPLETIONS_WINDOW_DAYS) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

// Serie en semaines : semaines consecutives ou la cible est atteinte, en
// remontant depuis la semaine en cours si elle est deja atteinte, sinon depuis
// la semaine derniere. Meme principe que ci-dessus, applique a la semaine.
function weeklyStreak(days: Set<string>, today: string, target: number) {
  const currentWeek = startOfWeek(today);
  const reached = (weekStart: string) =>
    countBetween(days, weekStart, addDays(weekStart, 6)) >= target;

  let cursor = reached(currentWeek) ? currentWeek : addDays(currentWeek, -7);
  let streak = 0;
  const maxWeeks = Math.ceil(HABIT_COMPLETIONS_WINDOW_DAYS / 7);

  while (reached(cursor) && streak < maxWeeks) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }

  return streak;
}

// Taux de constance sur les 4 dernieres semaines COMPLETES. La semaine en cours
// est exclue, sinon le taux plongerait chaque lundi matin. Le denominateur est
// borne a l'anciennete reelle de l'habitude : une habitude creee il y a dix
// jours n'est pas jugee sur quatre semaines.
//
// La SEMAINE DE CREATION est exclue entierement : le calcul demarre au lundi
// suivant la creation. Corrige le 2026-08-10, apres qu'une habitude creee un
// jeudi a affiche 0 % des le lundi suivant — elle etait jugee sur l'objectif
// complet d'une semaine ou elle n'avait existe que quatre jours.
//
// Pourquoi exclure plutot que proratiser : proratiser (cible x jours restants
// / 7) aurait donne un denominateur fractionnaire et un pourcentage calcule sur
// une semaine partielle, donc un chiffre exact mais peu comparable d'une
// habitude a l'autre. Exclure applique au contraire la regle deja retenue pour
// la serie — une periode incomplete ne compte pas — et garantit qu'aucun taux
// affiche ne porte sur une semaine partiellement vecue. Le cout est un "Pas
// encore mesurable" qui peut durer jusqu'a deux semaines, assume.
function constancy({
  createdOn,
  days,
  perWeek,
  today,
}: {
  createdOn: string;
  days: Set<string>;
  perWeek: number;
  today: string;
}) {
  const currentWeek = startOfWeek(today);
  const windowEnd = addDays(currentWeek, -1);
  const windowStart = addDays(currentWeek, -7 * CONSTANCY_WEEKS);
  const firstFullWeek = addDays(startOfWeek(createdOn), 7);
  const effectiveStart = firstFullWeek > windowStart ? firstFullWeek : windowStart;

  if (effectiveStart > windowEnd) {
    return null;
  }

  // effectiveStart est un lundi, windowEnd le dimanche qui cloture la derniere
  // semaine complete : l'intervalle est donc INCLUSIF des deux cotes, et il
  // faut mesurer jusqu'au lendemain de windowEnd pour compter des semaines
  // entieres. Sans cela, une fenetre d'une semaine (lundi -> dimanche, 6 jours
  // d'ecart) etait arrondie a 1 puis incrementee a 2, et la fenetre pleine de
  // 4 semaines comptait pour 5 — le denominateur etait systematiquement
  // surevalue, donc tous les taux sous-estimes.
  const elapsedWeeks = Math.round(
    (toUtcDate(addDays(windowEnd, 1)).getTime() - toUtcDate(effectiveStart).getTime()) /
      (7 * 24 * 60 * 60 * 1000),
  );

  const expected = elapsedWeeks * perWeek;

  if (expected <= 0) {
    return null;
  }

  const done = countBetween(days, effectiveStart, windowEnd);
  return Math.min(1, done / expected);
}

export function buildHabitStats({
  completedDays,
  habit,
  today = todayInParis(),
}: {
  completedDays: string[];
  habit: PersonalHabit;
  today?: string;
}): PersonalHabitWithStats {
  const days = new Set(completedDays);
  const isDaily = habit.frequencyType === "daily";
  const perWeek = isDaily ? 7 : habit.frequencyTarget ?? 1;
  const currentWeek = startOfWeek(today);

  return {
    ...habit,
    completedToday: days.has(today),
    streak: isDaily
      ? dailyStreak(days, today)
      : weeklyStreak(days, today, habit.frequencyTarget ?? 1),
    streakUnit: isDaily ? "days" : "weeks",
    currentPeriodCount: isDaily
      ? days.has(today)
        ? 1
        : 0
      : countBetween(days, currentWeek, addDays(currentWeek, 6)),
    currentPeriodTarget: isDaily ? 1 : habit.frequencyTarget ?? 1,
    constancyRate: constancy({
      // parisDayOf, pas slice(0, 10) : createdAt est un timestamptz UTC.
      createdOn: parisDayOf(habit.createdAt),
      days,
      perWeek,
      today,
    }),
  };
}

// --- Validation ---

export type HabitInputParseResult =
  | { ok: true; name: string; frequencyType: HabitFrequencyType; frequencyTarget: number | null }
  | { ok: false; error: string };

export function parseHabitNameValue(value: string) {
  const name = value.trim();

  if (name.length === 0) {
    return { ok: false as const, error: "name ne peut pas etre vide." };
  }

  if (name.length > HABIT_NAME_MAX_LENGTH) {
    return {
      ok: false as const,
      error: `name depasse la longueur maximale de ${HABIT_NAME_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true as const, name };
}

// Reproduit la contrainte SQL personal_habits_frequency_coherent : la cible est
// interdite en quotidien et requise en hebdomadaire. La contrainte reste le
// dernier rempart, cette fonction rend la meme regle en message lisible.
export type HabitFrequencyParseResult =
  | { ok: true; frequencyType: HabitFrequencyType; frequencyTarget: number | null }
  | { ok: false; error: string };

// Deux precautions de typage, chacune pour une raison distincte. Les branches
// reduisent par comparaison positive (=== "daily", === "weekly") parce que sur
// un parametre unknown, TypeScript ne reduit pas par exclusion. Et le type de
// retour est annote explicitement, faute de quoi le type litteral issu de la
// reduction serait elargi en string dans le litteral d'objet.
export function parseHabitFrequency(
  frequencyType: unknown,
  frequencyTarget: unknown,
): HabitFrequencyParseResult {
  if (frequencyType === "daily") {
    if (frequencyTarget !== null && frequencyTarget !== undefined) {
      return {
        ok: false as const,
        error: "frequencyTarget doit etre absent pour une habitude quotidienne.",
      };
    }

    return { ok: true as const, frequencyType, frequencyTarget: null };
  }

  if (frequencyType === "weekly") {
    if (typeof frequencyTarget !== "number" || !Number.isInteger(frequencyTarget)) {
      return {
        ok: false as const,
        error: "frequencyTarget doit etre un entier pour une habitude hebdomadaire.",
      };
    }

    if (frequencyTarget < HABIT_WEEKLY_TARGET_MIN || frequencyTarget > HABIT_WEEKLY_TARGET_MAX) {
      return {
        ok: false as const,
        error: `frequencyTarget doit etre compris entre ${HABIT_WEEKLY_TARGET_MIN} et ${HABIT_WEEKLY_TARGET_MAX}.`,
      };
    }

    return { ok: true as const, frequencyType, frequencyTarget };
  }

  return { ok: false as const, error: "frequencyType doit valoir 'daily' ou 'weekly'." };
}

export function parseHabitPayload(payload: unknown): HabitInputParseResult {
  const record =
    payload && typeof payload === "object"
      ? (payload as { name?: unknown; frequencyType?: unknown; frequencyTarget?: unknown })
      : null;

  if (!record || typeof record.name !== "string") {
    return { ok: false, error: "name doit etre une chaine de caracteres." };
  }

  const name = parseHabitNameValue(record.name);

  if (!name.ok) {
    return name;
  }

  const frequency = parseHabitFrequency(record.frequencyType, record.frequencyTarget);

  if (!frequency.ok) {
    return frequency;
  }

  return {
    ok: true,
    name: name.name,
    frequencyType: frequency.frequencyType,
    frequencyTarget: frequency.frequencyTarget,
  };
}

export function parseCompletionDay(value: unknown, fallback = todayInParis()) {
  if (value === null || value === undefined) {
    return { ok: true as const, day: fallback };
  }

  if (typeof value !== "string" || !isIsoDay(value)) {
    return { ok: false as const, error: "date doit etre au format AAAA-MM-JJ." };
  }

  return { ok: true as const, day: value };
}
