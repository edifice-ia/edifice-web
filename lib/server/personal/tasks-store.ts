import {
  type ArchivedPersonalTask,
  type PersonalTask,
  type TaskStatus,
} from "@/lib/personal/tasks";
import { createClient } from "@/src/lib/supabase/server";

// Client de SESSION, pas la cle service-role. RLS est donc le garde REEL de ce
// module et non une defense en profondeur : les trois policies de
// 20260824100000 filtrent sur auth.uid(), et rien cote application ne les
// double. Meme choix que Notes, Journal et Habitudes.
//
// Depuis 20260824110000, authenticated ne detient plus sur personal_tasks que
// SELECT, INSERT et UPDATE — le DELETE herite du defaut de schema a ete
// revoque. Une suppression physique depuis ce store est donc impossible a deux
// niveaux : ni privilege, ni policy.

type PersonalTaskRow = {
  id: string;
  title: string;
  due_on: string | null;
  status: TaskStatus;
  context_label: string | null;
  created_at: string;
  updated_at: string;
};

type ArchivedPersonalTaskRow = PersonalTaskRow & {
  deleted_at: string;
};

async function getTasksClient() {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Configuration Supabase absente.");
  }

  return supabase;
}

function mapTask(row: PersonalTaskRow): PersonalTask {
  return {
    id: row.id,
    title: row.title,
    dueOn: row.due_on,
    status: row.status,
    contextLabel: row.context_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TASK_COLUMNS =
  "id, title, due_on, status, context_label, created_at, updated_at";
// Litteral de gabarit et non concatenation par `+` : `+` produit le type
// `string`, ce qui prive supabase-js du type litteral dont il derive la forme
// des lignes. Le patron vient de habits-store.ts.
const ARCHIVED_TASK_COLUMNS = `${TASK_COLUMNS}, deleted_at`;

// Tri : echeance d'abord, puis creation. nullsFirst: false place les taches
// sans echeance APRES celles qui en ont une — une date fixee est une contrainte,
// son absence n'en est pas une, et les melanger noierait l'urgent dans le reste.
//
// L'index partiel personal_tasks_user_id_due_on_idx sert exactement ce tri.
export async function listPersonalTasks(userId: string): Promise<PersonalTask[]> {
  const supabase = await getTasksClient();
  const { data, error } = await supabase
    .from("personal_tasks")
    .select(TASK_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PersonalTaskRow[]).map(mapTask);
}

// La "charge de taches en attente" de 23-modules.md. Comptee a la lecture, sans
// colonne persistee — meme decision que pour la serie et le taux de constance
// d'Habitudes : aucune valeur derivee stockee ne peut se perimer en silence.
//
// Compte seul, sans ramener les lignes.
export async function countPendingPersonalTasks(userId: string): Promise<number> {
  const supabase = await getTasksClient();
  const { count, error } = await supabase
    .from("personal_tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .eq("status", "todo");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

// Triees par date d'archivage decroissante : ce qu'on vient d'archiver par
// erreur est ce qu'on cherche a restaurer en premier.
export async function listArchivedPersonalTasks(
  userId: string,
): Promise<ArchivedPersonalTask[]> {
  const supabase = await getTasksClient();
  const { data, error } = await supabase
    .from("personal_tasks")
    .select(ARCHIVED_TASK_COLUMNS)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ArchivedPersonalTaskRow[]).map((row) => ({
    ...mapTask(row),
    archivedAt: row.deleted_at,
  }));
}

// Compte seul, sans ramener les lignes : le compteur accompagne la liste active
// pour que l'UI affiche "Voir les archives (N)" sans second aller-retour.
export async function countArchivedPersonalTasks(userId: string): Promise<number> {
  const supabase = await getTasksClient();
  const { count, error } = await supabase
    .from("personal_tasks")
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
// status n'est pas accepte a la creation — une tache nait 'todo', valeur par
// defaut de la colonne.
export async function createPersonalTask({
  userId,
  title,
  dueOn,
  contextLabel,
}: {
  userId: string;
  title: string;
  dueOn: string | null;
  contextLabel: string | null;
}): Promise<PersonalTask> {
  const supabase = await getTasksClient();
  const { data, error } = await supabase
    .from("personal_tasks")
    .insert({ user_id: userId, title, due_on: dueOn, context_label: contextLabel })
    .select(TASK_COLUMNS)
    .single<PersonalTaskRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapTask(data);
}

// Mise a jour partielle. Les champs absents de `updates` ne sont pas envoyes :
// distinguer "absent" de "explicitement null" est ce qui permet de retirer une
// echeance sans l'effacer a chaque changement de statut.
//
// Le filtre exclut les taches archivees : modifier une tache qu'on ne voit plus
// n'a pas de sens, et l'interface n'offre pas ce geste.
export async function updatePersonalTask({
  userId,
  taskId,
  updates,
}: {
  userId: string;
  taskId: string;
  updates: {
    title?: string;
    dueOn?: string | null;
    status?: TaskStatus;
    contextLabel?: string | null;
  };
}): Promise<PersonalTask | null> {
  const patch: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    patch.title = updates.title;
  }

  if (updates.dueOn !== undefined) {
    patch.due_on = updates.dueOn;
  }

  if (updates.status !== undefined) {
    patch.status = updates.status;
  }

  if (updates.contextLabel !== undefined) {
    patch.context_label = updates.contextLabel;
  }

  const supabase = await getTasksClient();
  const { data, error } = await supabase
    .from("personal_tasks")
    .update(patch)
    .eq("id", taskId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(TASK_COLUMNS)
    .maybeSingle<PersonalTaskRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data === null ? null : mapTask(data);
}

// ARCHIVAGE, pas suppression. Ecrit deleted_at ; la ligne reste en base et
// reste restaurable. Le nom de la fonction dit soft delete pour rester aligne
// sur les trois autres modules, mais le libelle affiche est "Archiver".
export async function softDeletePersonalTask({
  userId,
  taskId,
}: {
  userId: string;
  taskId: string;
}): Promise<boolean> {
  const supabase = await getTasksClient();
  const { data, error } = await supabase
    .from("personal_tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}

// Restauration : remet deleted_at a null, et ne touche a rien d'autre. Le
// statut, l'echeance et le contexte sont conserves tels qu'ils etaient a
// l'archivage.
//
// C'est un UPDATE, donc la policy update deja scopee au proprietaire suffit —
// aucune policy nouvelle n'a ete necessaire, exactement comme sur les trois
// autres modules.
export async function restorePersonalTask({
  userId,
  taskId,
}: {
  userId: string;
  taskId: string;
}): Promise<boolean> {
  const supabase = await getTasksClient();
  const { data, error } = await supabase
    .from("personal_tasks")
    .update({ deleted_at: null })
    .eq("id", taskId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}
