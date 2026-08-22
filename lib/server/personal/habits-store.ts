import {
  addDays,
  buildHabitStats,
  HABIT_COMPLETIONS_WINDOW_DAYS,
  todayInParis,
  type ArchivedPersonalHabit,
  type HabitFrequencyType,
  type PersonalHabit,
  type PersonalHabitWithStats,
} from "@/lib/personal/habits";
import { createClient } from "@/src/lib/supabase/server";

type PersonalHabitRow = {
  id: string;
  name: string;
  frequency_type: HabitFrequencyType;
  frequency_target: number | null;
  created_at: string;
  updated_at: string;
};

type ArchivedPersonalHabitRow = PersonalHabitRow & {
  deleted_at: string;
};

type CompletionRow = {
  habit_id: string;
  completed_on: string;
};

// Client de session, pas service-role — meme raisonnement que
// lib/server/personal/notes-store.ts, ou il est detaille. RLS est le garde
// reel : si les policies de personal_habits ou personal_habit_completions sont
// absentes ou mal appliquees, il n'y a AUCUN second filet applicatif. Les
// filtres .eq("user_id", userId) ci-dessous sont redondants avec RLS et
// volontairement conserves.
async function getHabitsClient() {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Configuration Supabase absente.");
  }

  return supabase;
}

function mapHabit(row: PersonalHabitRow): PersonalHabit {
  return {
    id: row.id,
    name: row.name,
    frequencyType: row.frequency_type,
    frequencyTarget: row.frequency_target,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const HABIT_COLUMNS =
  "id, name, frequency_type, frequency_target, created_at, updated_at";
const ARCHIVED_HABIT_COLUMNS = `${HABIT_COLUMNS}, deleted_at`;

// Une seule requete pour les habitudes, une seule pour leurs realisations : la
// serie et le taux de constance sont ensuite calcules en memoire par
// buildHabitStats, sans aller-retour supplementaire par habitude.
export async function listPersonalHabits(
  userId: string,
): Promise<PersonalHabitWithStats[]> {
  const supabase = await getHabitsClient();
  const today = todayInParis();

  const { data: habitRows, error: habitsError } = await supabase
    .from("personal_habits")
    .select(HABIT_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (habitsError) {
    throw new Error(habitsError.message);
  }

  const habits = ((habitRows ?? []) as PersonalHabitRow[]).map(mapHabit);

  if (habits.length === 0) {
    return [];
  }

  const { data: completionRows, error: completionsError } = await supabase
    .from("personal_habit_completions")
    .select("habit_id, completed_on")
    .eq("user_id", userId)
    .gte("completed_on", addDays(today, -HABIT_COMPLETIONS_WINDOW_DAYS));

  if (completionsError) {
    throw new Error(completionsError.message);
  }

  const byHabit = new Map<string, string[]>();

  for (const row of (completionRows ?? []) as CompletionRow[]) {
    const days = byHabit.get(row.habit_id) ?? [];
    days.push(row.completed_on);
    byHabit.set(row.habit_id, days);
  }

  return habits.map((habit) =>
    buildHabitStats({
      completedDays: byHabit.get(habit.id) ?? [],
      habit,
      today,
    }),
  );
}

export async function createPersonalHabit({
  userId,
  name,
  frequencyType,
  frequencyTarget,
}: {
  userId: string;
  name: string;
  frequencyType: HabitFrequencyType;
  frequencyTarget: number | null;
}): Promise<PersonalHabitWithStats> {
  const supabase = await getHabitsClient();
  const { data, error } = await supabase
    .from("personal_habits")
    .insert({
      user_id: userId,
      name,
      frequency_type: frequencyType,
      frequency_target: frequencyTarget,
    })
    .select(HABIT_COLUMNS)
    .single<PersonalHabitRow>();

  if (error) {
    throw new Error(error.message);
  }

  // Une habitude qui vient d'etre creee n'a aucune realisation : les stats sont
  // calculees sur un historique vide plutot que devinees.
  return buildHabitStats({ completedDays: [], habit: mapHabit(data) });
}

// Renvoie null quand aucune ligne n'a ete touchee : habitude inexistante,
// appartenant a quelqu'un d'autre, ou deja archivee. Les trois cas sont
// volontairement indistinguables cote appelant.
export async function updatePersonalHabit({
  userId,
  habitId,
  name,
  frequencyType,
  frequencyTarget,
}: {
  userId: string;
  habitId: string;
  name: string;
  frequencyType: HabitFrequencyType;
  frequencyTarget: number | null;
}): Promise<PersonalHabit | null> {
  const supabase = await getHabitsClient();
  const { data, error } = await supabase
    .from("personal_habits")
    .update({
      name,
      frequency_type: frequencyType,
      frequency_target: frequencyTarget,
    })
    .eq("id", habitId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(HABIT_COLUMNS)
    .maybeSingle<PersonalHabitRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapHabit(data) : null;
}

// Archivage : ecrit deleted_at. L'historique de realisations est conserve, il
// n'est simplement plus lu — c'est la raison du soft delete sur cette table.
export async function archivePersonalHabit({
  userId,
  habitId,
}: {
  userId: string;
  habitId: string;
}): Promise<boolean> {
  const supabase = await getHabitsClient();
  const { data, error } = await supabase
    .from("personal_habits")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", habitId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}

// Triees par date d'archivage decroissante : ce qu'on vient d'archiver par
// erreur est ce qu'on cherche a restaurer en premier.
//
// Aucune statistique n'est calculee ici, contrairement a listPersonalHabits :
// buildHabitStats n'est jamais appele sur ce chemin. Une habitude archivee n'a
// ni serie ni taux de constance, et le type ArchivedPersonalHabit ne porte pas
// ces champs.
export async function listArchivedPersonalHabits(
  userId: string,
): Promise<ArchivedPersonalHabit[]> {
  const supabase = await getHabitsClient();
  const { data, error } = await supabase
    .from("personal_habits")
    .select(ARCHIVED_HABIT_COLUMNS)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ArchivedPersonalHabitRow[];

  if (rows.length === 0) {
    return [];
  }

  // Deuxieme requete, comme pour la liste active : une pour les habitudes, une
  // pour leurs realisations. Pas de jointure imbriquee PostgREST — la cle
  // etrangere est composite (habit_id, user_id), et faire dependre l'affichage
  // de la resolution de cette relation ajouterait une dependance de plus a une
  // contrainte que DEC-013 refuse deja de presumer appliquee en base.
  //
  // Le comptage se fait en memoire. buildHabitStats n'est toujours PAS appele
  // sur ce chemin : un volume n'est ni une serie ni un taux de constance.
  const { data: completions, error: completionsError } = await supabase
    .from("personal_habit_completions")
    .select("habit_id")
    .eq("user_id", userId)
    .in(
      "habit_id",
      rows.map((row) => row.id),
    );

  if (completionsError) {
    throw new Error(completionsError.message);
  }

  const countByHabit = new Map<string, number>();

  for (const row of (completions ?? []) as { habit_id: string }[]) {
    countByHabit.set(row.habit_id, (countByHabit.get(row.habit_id) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...mapHabit(row),
    archivedAt: row.deleted_at,
    completionCount: countByHabit.get(row.id) ?? 0,
  }));
}

// Compte seul, sans ramener les lignes : le compteur accompagne la liste active
// pour que l'UI affiche "Voir les archives (N)" sans second aller-retour.
export async function countArchivedPersonalHabits(userId: string): Promise<number> {
  const supabase = await getHabitsClient();
  const { count, error } = await supabase
    .from("personal_habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

// Restauration : remet deleted_at a null, et ne touche a rien d'autre.
//
// Les realisations de personal_habit_completions n'ont jamais ete touchees par
// l'archivage — elles ne sont supprimees que par le geste decocher. Restaurer
// une habitude retrouve donc son historique intact, et sa serie comme son taux
// de constance sont recalcules a la lecture suivante.
//
// Geste separe de toute suppression : il n'existe aucune suppression physique
// d'habitude, la table n'accordant pas DELETE a authenticated.
export async function restorePersonalHabit({
  userId,
  habitId,
}: {
  userId: string;
  habitId: string;
}): Promise<boolean> {
  const supabase = await getHabitsClient();
  const { data, error } = await supabase
    .from("personal_habits")
    .update({ deleted_at: null })
    .eq("id", habitId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}

// Verifie que l'habitude existe, appartient a l'appelant et n'est pas archivee.
// Marquer une habitude archivee n'aurait pas de sens : elle n'est plus lue.
async function findLiveHabitId(userId: string, habitId: string) {
  const supabase = await getHabitsClient();
  const { data, error } = await supabase
    .from("personal_habits")
    .select("id")
    .eq("id", habitId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

// Idempotent : marquer un jour deja marque est un succes silencieux. La
// contrainte d'unicite (habit_id, completed_on) remonte 23505, traite ici
// comme "deja fait" plutot que comme une erreur a afficher.
export async function markHabitCompletion({
  userId,
  habitId,
  day,
}: {
  userId: string;
  habitId: string;
  day: string;
}): Promise<boolean> {
  const liveHabitId = await findLiveHabitId(userId, habitId);

  if (!liveHabitId) {
    return false;
  }

  const supabase = await getHabitsClient();
  const { error } = await supabase
    .from("personal_habit_completions")
    .insert({ habit_id: liveHabitId, user_id: userId, completed_on: day });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  return true;
}

// Suppression physique assumee, contrairement aux autres modules du pole : une
// realisation est un booleen sur un jour, pas du contenu. Voir la migration
// 20260806100000 pour le raisonnement complet. Idempotent la aussi : decocher
// un jour non marque est un succes.
export async function unmarkHabitCompletion({
  userId,
  habitId,
  day,
}: {
  userId: string;
  habitId: string;
  day: string;
}): Promise<boolean> {
  const liveHabitId = await findLiveHabitId(userId, habitId);

  if (!liveHabitId) {
    return false;
  }

  const supabase = await getHabitsClient();
  const { error } = await supabase
    .from("personal_habit_completions")
    .delete()
    .eq("habit_id", liveHabitId)
    .eq("user_id", userId)
    .eq("completed_on", day);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
