import {
  TARGET_EQUALS_START_ERROR,
  type ArchivedPersonalGoal,
  type GoalStatus,
  type GoalUpdates,
  type PersonalGoal,
} from "@/lib/personal/goals";
import { createClient } from "@/src/lib/supabase/server";

// Client de SESSION, pas la cle service-role. RLS est donc le garde REEL de ce
// module et non une defense en profondeur : les trois policies de
// 20260917100000 filtrent sur auth.uid(), et rien cote application ne les
// double. Meme choix que Notes, Journal, Habitudes et Taches.
//
// personal_goals n'accorde ni DELETE ni policy DELETE a authenticated : une
// suppression physique depuis ce store est impossible a deux niveaux. Elle
// viendra du geste "Vider l'historique" et de la suppression d'un element
// archive, qui passent par la cle service-role.

// Les trois valeurs sont des numeric(15,3). PostgREST les rend en nombres JSON,
// mais le type admet la chaine : une valeur numerique arrivant en texte serait
// autrement propagee telle quelle dans un champ type number, et une comparaison
// comme currentValue >= targetValue deviendrait une comparaison de chaines.
// mapGoal convertit donc explicitement.
type NumericValue = number | string;

type PersonalGoalRow = {
  id: string;
  title: string;
  start_value: NumericValue;
  target_value: NumericValue;
  current_value: NumericValue;
  unit_label: string | null;
  due_on: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
};

type ArchivedPersonalGoalRow = PersonalGoalRow & {
  deleted_at: string;
};

async function getGoalsClient() {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Configuration Supabase absente.");
  }

  return supabase;
}

function mapGoal(row: PersonalGoalRow): PersonalGoal {
  return {
    id: row.id,
    title: row.title,
    startValue: Number(row.start_value),
    targetValue: Number(row.target_value),
    currentValue: Number(row.current_value),
    unitLabel: row.unit_label,
    dueOn: row.due_on,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const GOAL_COLUMNS =
  "id, title, start_value, target_value, current_value, unit_label, due_on, status, created_at, updated_at";
// Litteral de gabarit et non concatenation par `+` : `+` produit le type
// `string`, ce qui prive supabase-js du type litteral dont il derive la forme
// des lignes. Le patron vient de tasks-store.ts.
const ARCHIVED_GOAL_COLUMNS = `${GOAL_COLUMNS}, deleted_at`;

// 23514 : violation d'une contrainte CHECK. La seule que l'application peut
// declencher sans l'avoir vue venir est
// personal_goals_target_differs_from_start, quand une mise a jour n'envoie
// qu'une des deux valeurs : le parser ne peut pas comparer ce qu'il ne connait
// pas, la base le fait. Le refus revient alors en 400 lisible plutot qu'en 500.
function isTargetEqualsStartViolation(error: { code?: string; message?: string }) {
  return (
    error.code === "23514" &&
    (error.message ?? "").includes("personal_goals_target_differs_from_start")
  );
}

// Tri : echeance d'abord, puis creation, comme Taches. nullsFirst: false place
// les objectifs sans echeance APRES ceux qui en ont une — une date fixee est une
// contrainte, son absence n'en est pas une.
//
// L'index partiel personal_goals_user_id_due_on_idx sert exactement ce tri.
export async function listPersonalGoals(userId: string): Promise<PersonalGoal[]> {
  const supabase = await getGoalsClient();
  const { data, error } = await supabase
    .from("personal_goals")
    .select(GOAL_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PersonalGoalRow[]).map(mapGoal);
}

// Triees par date d'archivage decroissante : ce qu'on vient d'archiver par
// erreur est ce qu'on cherche a restaurer en premier.
export async function listArchivedPersonalGoals(
  userId: string,
): Promise<ArchivedPersonalGoal[]> {
  const supabase = await getGoalsClient();
  const { data, error } = await supabase
    .from("personal_goals")
    .select(ARCHIVED_GOAL_COLUMNS)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ArchivedPersonalGoalRow[]).map((row) => ({
    ...mapGoal(row),
    archivedAt: row.deleted_at,
  }));
}

// Compte seul, sans ramener les lignes : le compteur accompagne la liste active
// pour que l'UI affiche "Voir les archives (N)" sans second aller-retour.
export async function countArchivedPersonalGoals(userId: string): Promise<number> {
  const supabase = await getGoalsClient();
  const { count, error } = await supabase
    .from("personal_goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

// user_id est fourni explicitement, jamais deduit : la policy insert le
// revalide en with check (user_id = auth.uid()), donc une valeur erronee est
// refusee par la base et pas seulement par le code.
//
// status n'est pas accepte a la creation — un objectif nait 'active', valeur par
// defaut de la colonne. current_value est TOUJOURS envoyee, le parser l'ayant
// fixee a start_value quand elle est absente : la colonne est not null et sans
// defaut, un defaut SQL ne pouvant pas reprendre la valeur d'une autre colonne.
export async function createPersonalGoal({
  userId,
  title,
  startValue,
  targetValue,
  currentValue,
  unitLabel,
  dueOn,
}: {
  userId: string;
  title: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  unitLabel: string | null;
  dueOn: string | null;
}): Promise<PersonalGoal> {
  const supabase = await getGoalsClient();
  const { data, error } = await supabase
    .from("personal_goals")
    .insert({
      user_id: userId,
      title,
      start_value: startValue,
      target_value: targetValue,
      current_value: currentValue,
      unit_label: unitLabel,
      due_on: dueOn,
    })
    .select(GOAL_COLUMNS)
    .single<PersonalGoalRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapGoal(data);
}

export type UpdatePersonalGoalResult =
  | { status: "ok"; goal: PersonalGoal }
  | { status: "not_found" }
  | { status: "invalid"; error: string };

// Mise a jour partielle. Les champs absents de `updates` ne sont pas envoyes :
// distinguer "absent" de "explicitement null" est ce qui permet de changer la
// seule valeur actuelle sans effacer l'unite ni l'echeance.
//
// Le filtre exclut les objectifs archives : modifier ce qu'on ne voit plus n'a
// pas de sens, et l'interface n'offre pas ce geste.
export async function updatePersonalGoal({
  userId,
  goalId,
  updates,
}: {
  userId: string;
  goalId: string;
  updates: GoalUpdates;
}): Promise<UpdatePersonalGoalResult> {
  const patch: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    patch.title = updates.title;
  }

  if (updates.startValue !== undefined) {
    patch.start_value = updates.startValue;
  }

  if (updates.targetValue !== undefined) {
    patch.target_value = updates.targetValue;
  }

  if (updates.currentValue !== undefined) {
    patch.current_value = updates.currentValue;
  }

  if (updates.unitLabel !== undefined) {
    patch.unit_label = updates.unitLabel;
  }

  if (updates.dueOn !== undefined) {
    patch.due_on = updates.dueOn;
  }

  if (updates.status !== undefined) {
    patch.status = updates.status;
  }

  const supabase = await getGoalsClient();
  const { data, error } = await supabase
    .from("personal_goals")
    .update(patch)
    .eq("id", goalId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(GOAL_COLUMNS)
    .maybeSingle<PersonalGoalRow>();

  if (error) {
    // La comparaison se fait sur les valeurs RESULTANTES, donc en base : lire la
    // ligne puis comparer ici laisserait une fenetre de course entre la lecture
    // et l'ecriture.
    if (isTargetEqualsStartViolation(error)) {
      return { status: "invalid", error: TARGET_EQUALS_START_ERROR };
    }

    throw new Error(error.message);
  }

  return data === null ? { status: "not_found" } : { status: "ok", goal: mapGoal(data) };
}

// ARCHIVAGE, pas suppression. Ecrit deleted_at ; la ligne reste en base et reste
// restaurable. Le nom dit soft delete pour rester aligne sur les quatre autres
// modules, le libelle affiche dit "Archiver".
export async function softDeletePersonalGoal({
  userId,
  goalId,
}: {
  userId: string;
  goalId: string;
}): Promise<boolean> {
  const supabase = await getGoalsClient();
  const { data, error } = await supabase
    .from("personal_goals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", goalId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}

// Restauration : remet deleted_at a null, et ne touche a rien d'autre. Les
// valeurs, l'unite, l'echeance et le statut sont conserves tels qu'ils etaient a
// l'archivage.
//
// C'est un UPDATE, donc la policy update deja scopee au proprietaire suffit —
// aucune policy nouvelle, exactement comme sur les quatre autres modules.
export async function restorePersonalGoal({
  userId,
  goalId,
}: {
  userId: string;
  goalId: string;
}): Promise<boolean> {
  const supabase = await getGoalsClient();
  const { data, error } = await supabase
    .from("personal_goals")
    .update({ deleted_at: null })
    .eq("id", goalId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}
