import {
  ACADEMY_OBJECTIVE_PARENT_LEVELS,
  type AcademyArchivedNode,
  type AcademyObjective,
  type AcademyObjectiveCreate,
  type AcademyObjectiveParentLevel,
} from "@/lib/academy/hierarchy";
import {
  fail,
  getClient,
  resolveLiveChain,
  type AcademyStoreResult,
} from "@/lib/server/academy/hierarchy-store";

// Store des objectifs pédagogiques d'Academy (étape 2b-1 du chantier 8).
// Table : academy_objectives, migration 20261126120000.
//
// MÊMES RÈGLES QUE hierarchy-store.ts : client de session uniquement, jamais la
// clé service-role ; les policies *_own sont le garde réel, et chaque requête
// filtre en plus sur user_id. Aucun nom de table ni de colonne ne vient de
// l'extérieur : le niveau parent est un type fermé, résolu par PARENT_COLUMN et
// NODE_TABLE.
//
// MASQUAGE. Un objectif dont le parent, ou un ancêtre du parent, est archivé est
// introuvable, en lecture comme en écriture : resolveLiveChain sur le parent.
// Les listes descendent par les seuls niveaux vivants, comme
// listArchivedDescendants.
//
// Pas de mise à jour : ni titre, ni description, ni position, ni parent ne se
// modifient (choix du 2026-11-26).

const TABLE = "academy_objectives";

const PARENT_COLUMN: Record<AcademyObjectiveParentLevel, string> = {
  program: "program_id",
  subject: "subject_id",
  unit: "unit_id",
  chapter: "chapter_id",
};

// Tables des niveaux vivants à parcourir, avec la colonne de leur propre parent.
const NODE_TABLE: Record<Exclude<AcademyObjectiveParentLevel, "program">, { table: string; parentColumn: string }> = {
  subject: { table: "academy_subjects", parentColumn: "program_id" },
  unit: { table: "academy_units", parentColumn: "subject_id" },
  chapter: { table: "academy_chapters", parentColumn: "unit_id" },
};

const COLUMNS =
  "id, program_id, subject_id, unit_id, chapter_id, title, description, position, created_at, updated_at, deleted_at";

const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";

type RawObjective = {
  id: string;
  program_id: string | null;
  subject_id: string | null;
  unit_id: string | null;
  chapter_id: string | null;
  title: string;
  description: string | null;
  position: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function parentOf(row: RawObjective): { level: AcademyObjectiveParentLevel; id: string } {
  for (const level of ACADEMY_OBJECTIVE_PARENT_LEVELS) {
    const id = row[PARENT_COLUMN[level] as keyof RawObjective];

    if (typeof id === "string") {
      return { level, id };
    }
  }

  // La contrainte academy_objectives_one_parent rend ce cas impossible.
  fail("parentOf", { message: "Objectif sans parent." });
}

function mapObjective(row: RawObjective): AcademyObjective {
  const parent = parentOf(row);

  return {
    id: row.id,
    parentLevel: parent.level,
    parentId: parent.id,
    title: row.title,
    description: row.description ?? null,
    position: row.position ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function byPositionThenCreatedAt(a: AcademyObjective, b: AcademyObjective) {
  if (a.position !== b.position) {
    return a.position - b.position;
  }

  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

// --- Création ---------------------------------------------------------------------------

// Fin de liste parmi les objectifs vivants du même parent. Une course entre deux
// créations simultanées peut donner deux positions égales ; admis, le tri
// départageant par created_at.
async function nextObjectivePosition(
  userId: string,
  parentLevel: AcademyObjectiveParentLevel,
  parentId: string,
) {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("position")
    .eq("user_id", userId)
    .eq(PARENT_COLUMN[parentLevel], parentId)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  if (error) {
    fail("nextObjectivePosition", error);
  }

  return data ? data.position + 1 : 0;
}

export async function createObjective(
  userId: string,
  input: AcademyObjectiveCreate,
): Promise<AcademyStoreResult<AcademyObjective>> {
  // Le parent et toute sa chaîne doivent être vivants.
  if (!(await resolveLiveChain(input.parentLevel, input.parentId, userId))) {
    return { status: "not_found" };
  }

  const position = await nextObjectivePosition(userId, input.parentLevel, input.parentId);
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      [PARENT_COLUMN[input.parentLevel]]: input.parentId,
      title: input.title,
      description: input.description,
      position,
    })
    .select(COLUMNS)
    .single<RawObjective>();

  if (error) {
    if (error.code === CHECK_VIOLATION) {
      return { status: "invalid", error: "Valeur refusee par la base." };
    }

    // Clé composite (parent_id, user_id) : parent disparu entre la vérification
    // et l'insertion, ou parent d'un autre compte.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { status: "not_found" };
    }

    fail("createObjective", error);
  }

  return { status: "ok", value: mapObjective(data) };
}

// --- Niveaux vivants d'un programme ---------------------------------------------------------

type LiveNodes = {
  // Identifiant -> titre, pour chaque niveau rattachable vivant.
  program: Map<string, string>;
  subject: Map<string, string>;
  unit: Map<string, string>;
  chapter: Map<string, string>;
};

// Programme vivant, puis matières, modules et chapitres vivants sous des parents
// vivants. null : programme inexistant, archivé ou d'un autre compte.
async function readLiveNodes(userId: string, programId: string): Promise<LiveNodes | null> {
  const supabase = await getClient();
  const { data: program, error: programError } = await supabase
    .from("academy_programs")
    .select("id, title")
    .eq("id", programId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle<{ id: string; title: string }>();

  if (programError) {
    fail("readLiveNodes program", programError);
  }

  if (!program) {
    return null;
  }

  const nodes: LiveNodes = {
    program: new Map([[program.id, program.title]]),
    subject: new Map(),
    unit: new Map(),
    chapter: new Map(),
  };
  let parents = [program.id];

  for (const level of ["subject", "unit", "chapter"] as const) {
    if (parents.length === 0) {
      break;
    }

    const config = NODE_TABLE[level];
    const { data, error } = await supabase
      .from(config.table)
      .select("id, title")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in(config.parentColumn, parents)
      .returns<{ id: string; title: string }[]>();

    if (error) {
      fail(`readLiveNodes ${level}`, error);
    }

    for (const row of data ?? []) {
      nodes[level].set(row.id, row.title);
    }

    parents = (data ?? []).map((row) => row.id);
  }

  return nodes;
}

// Objectifs, vivants ou archivés, rattachés aux seuls niveaux vivants donnés.
async function readObjectives(
  userId: string,
  nodes: LiveNodes,
  archived: boolean,
): Promise<RawObjective[]> {
  const supabase = await getClient();
  const rows: RawObjective[] = [];

  for (const level of ACADEMY_OBJECTIVE_PARENT_LEVELS) {
    const ids = [...nodes[level].keys()];

    if (ids.length === 0) {
      continue;
    }

    const query = supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq("user_id", userId)
      .in(PARENT_COLUMN[level], ids);
    const { data, error } = await (archived
      ? query.not("deleted_at", "is", null)
      : query.is("deleted_at", null)
    ).returns<RawObjective[]>();

    if (error) {
      fail(`readObjectives ${level}`, error);
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

// --- Lectures -----------------------------------------------------------------------------

// Objectifs vivants d'un programme vivant, rattachés au programme ou à un niveau
// vivant, triés par position puis created_at. Un objectif sous un niveau
// archivé, ou sous un ancêtre archivé, n'y figure pas.
export async function listLiveObjectives(
  userId: string,
  programId: string,
): Promise<AcademyStoreResult<AcademyObjective[]>> {
  const nodes = await readLiveNodes(userId, programId);

  if (!nodes) {
    return { status: "not_found" };
  }

  const objectives = (await readObjectives(userId, nodes, false)).map(mapObjective);
  objectives.sort(byPositionThenCreatedAt);

  return { status: "ok", value: objectives };
}

// Objectifs ARCHIVÉS restaurables d'un programme vivant : rattachés à un niveau
// vivant. Ce sont exactement ceux que restoreObjective accepte. Au format des
// éléments archivés de l'arbre (niveau "objective", titre du parent).
export async function listArchivedObjectives(
  userId: string,
  programId: string,
): Promise<AcademyStoreResult<AcademyArchivedNode[]>> {
  const nodes = await readLiveNodes(userId, programId);

  if (!nodes) {
    return { status: "not_found" };
  }

  const items = (await readObjectives(userId, nodes, true)).map((row) => {
    const parent = parentOf(row);

    return {
      level: "objective" as const,
      id: row.id,
      title: row.title,
      parentTitle: nodes[parent.level].get(parent.id) ?? "",
      archivedAt: row.deleted_at as string,
    };
  });

  items.sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : a.archivedAt > b.archivedAt ? -1 : 0));

  return { status: "ok", value: items };
}

// --- Archivage et restauration ------------------------------------------------------------------

// Lit un objectif du compte, vivant ou archivé selon `archived`.
async function readObjective(userId: string, id: string, archived: boolean) {
  const supabase = await getClient();
  const query = supabase.from(TABLE).select(COLUMNS).eq("id", id).eq("user_id", userId);
  const { data, error } = await (archived
    ? query.not("deleted_at", "is", null)
    : query.is("deleted_at", null)
  ).maybeSingle<RawObjective>();

  if (error) {
    fail("readObjective", error);
  }

  return data;
}

// ARCHIVE, ne supprime pas : écrit deleted_at. Un objectif dont le parent est
// archivé ou masqué est introuvable.
export async function archiveObjective(
  userId: string,
  id: string,
): Promise<AcademyStoreResult<null>> {
  const row = await readObjective(userId, id, false);

  if (!row) {
    return { status: "not_found" };
  }

  const parent = parentOf(row);

  if (!(await resolveLiveChain(parent.level, parent.id, userId))) {
    return { status: "not_found" };
  }

  const supabase = await getClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    fail("archiveObjective", error);
  }

  return data ? { status: "ok", value: null } : { status: "not_found" };
}

// Restaure un objectif archivé. REFUSÉE si le parent, ou un de ses ancêtres, est
// archivé : l'objectif resterait masqué.
export async function restoreObjective(
  userId: string,
  id: string,
): Promise<AcademyStoreResult<null>> {
  const row = await readObjective(userId, id, true);

  if (!row) {
    return { status: "not_found" };
  }

  const parent = parentOf(row);

  if (!(await resolveLiveChain(parent.level, parent.id, userId))) {
    return { status: "not_found" };
  }

  const supabase = await getClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    fail("restoreObjective", error);
  }

  return data ? { status: "ok", value: null } : { status: "not_found" };
}
