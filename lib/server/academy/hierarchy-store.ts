import { createClient } from "@/src/lib/supabase/server";
import {
  ACADEMY_PARENT_LEVEL,
  filterLiveTree,
  type AcademyArchivedNode,
  type AcademyArchivedProgram,
  type AcademyChildCreate,
  type AcademyChildLevel,
  type AcademyChildUpdates,
  type AcademyLesson,
  type AcademyLevel,
  type AcademyProgram,
  type AcademyProgramCreate,
  type AcademyProgramKind,
  type AcademyProgramTree,
  type AcademyProgramUpdates,
  type AcademyRawChapter,
  type AcademyRawLesson,
  type AcademyRawProgram,
  type AcademyRawSubject,
  type AcademyRawUnit,
} from "@/lib/academy/hierarchy";

// Store de la hiérarchie pédagogique d'Academy (étape 2a du chantier 8).
//
// CLIENT DE SESSION UNIQUEMENT (src/lib/supabase/server.ts), jamais la clé
// service-role : les policies `*_own` de la migration 20261124120000 sont le
// garde réel. Chaque requête filtre en plus `.eq("user_id", userId)`.
//
// AUCUN NOM DE TABLE NE VIENT DE L'EXTÉRIEUR. Le niveau est un type fermé
// (AcademyLevel) et LEVEL_CONFIG le résout en nom de table, colonne parent et
// colonnes lues. Un appelant ne peut désigner qu'un des cinq niveaux.
//
// ERREURS. Le store renvoie des codes — ok, invalid, not_found — et jamais
// l'erreur brute de la base. Une panne inattendue lève AcademyStoreError, au
// message générique ; le détail ne va que dans les journaux du serveur.
//
// MASQUAGE. Un élément dont un ancêtre est archivé est traité comme introuvable,
// en lecture comme en écriture (DEC-014, note du 2026-11-24) : voir
// resolveLiveChain et filterLiveTree.

export class AcademyStoreError extends Error {
  constructor() {
    super("Operation Academy indisponible.");
    this.name = "AcademyStoreError";
  }
}

export type AcademyStoreResult<T> =
  | { status: "ok"; value: T }
  | { status: "invalid"; error: string }
  | { status: "not_found" };

type LevelConfig = {
  table: string;
  parentLevel: AcademyLevel | null;
  parentColumn: string | null;
};

const LEVEL_CONFIG: Record<AcademyLevel, LevelConfig> = {
  program: { table: "academy_programs", parentLevel: null, parentColumn: null },
  subject: { table: "academy_subjects", parentLevel: "program", parentColumn: "program_id" },
  unit: { table: "academy_units", parentLevel: "subject", parentColumn: "subject_id" },
  chapter: { table: "academy_chapters", parentLevel: "unit", parentColumn: "unit_id" },
  lesson: { table: "academy_lessons", parentLevel: "chapter", parentColumn: "chapter_id" },
};

const PROGRAM_COLUMNS = "id, kind, title, description, created_at, updated_at, deleted_at";
const NODE_COLUMNS = "id, title, description, position, created_at, updated_at, deleted_at";
// Les leçons de l'arbre ne portent pas leur contenu.
const LESSON_TREE_COLUMNS = "id, chapter_id, title, position, created_at, updated_at, deleted_at";
const LESSON_DETAIL_COLUMNS =
  "id, chapter_id, title, content, position, created_at, updated_at, deleted_at";

// Codes Postgres traduits en résultat typé plutôt qu'en panne.
const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";

type DbError = { code?: string; message?: string } | null;

function fail(context: string, error: DbError): never {
  // Le détail reste côté serveur ; l'appelant ne reçoit qu'un message générique.
  console.error("[academy-store]", context, error?.code ?? "", error?.message ?? "");
  throw new AcademyStoreError();
}

async function getClient() {
  const supabase = await createClient();

  if (!supabase) {
    fail("client", { message: "Configuration Supabase absente." });
  }

  return supabase;
}

function textColumnFor(level: AcademyChildLevel) {
  return level === "lesson" ? "content" : "description";
}

// --- Chaîne vivante ---------------------------------------------------------------

// Remonte de l'élément (niveau, id) jusqu'au programme. Renvoie false si un
// maillon est absent, appartient à un autre compte, ou est archivé — y compris
// l'élément lui-même. Une requête par niveau : au plus cinq, pour un seul
// utilisateur, c'est assumé.
export async function resolveLiveChain(
  level: AcademyLevel,
  id: string,
  userId: string,
): Promise<boolean> {
  const supabase = await getClient();
  let currentLevel: AcademyLevel | null = level;
  let currentId: string | null = id;

  while (currentLevel && currentId) {
    const config: LevelConfig = LEVEL_CONFIG[currentLevel];
    const columns = config.parentColumn ? `id, deleted_at, ${config.parentColumn}` : "id, deleted_at";
    const result: { data: Record<string, string | null> | null; error: DbError } = await supabase
      .from(config.table)
      .select(columns)
      .eq("id", currentId)
      .eq("user_id", userId)
      .maybeSingle<Record<string, string | null>>();
    const { data, error } = result;

    if (error) {
      fail(`resolveLiveChain ${currentLevel}`, error);
    }

    if (!data || data.deleted_at !== null) {
      return false;
    }

    currentId = config.parentColumn ? (data[config.parentColumn] as string) : null;
    currentLevel = config.parentLevel;
  }

  return true;
}

// --- Programmes ----------------------------------------------------------------------

function mapProgram(row: AcademyRawProgram): AcademyProgram {
  return {
    id: row.id,
    kind: row.kind as AcademyProgramKind,
    title: row.title,
    description: row.description ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLivePrograms(userId: string): Promise<AcademyProgram[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(LEVEL_CONFIG.program.table)
    .select(PROGRAM_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<AcademyRawProgram[]>();

  if (error) {
    fail("listLivePrograms", error);
  }

  return (data ?? []).map(mapProgram);
}

export async function listArchivedPrograms(userId: string): Promise<AcademyArchivedProgram[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(LEVEL_CONFIG.program.table)
    .select(PROGRAM_COLUMNS)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .returns<AcademyRawProgram[]>();

  if (error) {
    fail("listArchivedPrograms", error);
  }

  return (data ?? []).map((row) => ({ ...mapProgram(row), archivedAt: row.deleted_at as string }));
}

export async function createProgram(
  userId: string,
  input: AcademyProgramCreate,
): Promise<AcademyStoreResult<AcademyProgram>> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(LEVEL_CONFIG.program.table)
    .insert({
      user_id: userId,
      kind: input.kind,
      title: input.title,
      description: input.description,
    })
    .select(PROGRAM_COLUMNS)
    .single<AcademyRawProgram>();

  if (error) {
    if (error.code === CHECK_VIOLATION) {
      return { status: "invalid", error: "Valeur refusee par la base." };
    }

    fail("createProgram", error);
  }

  return { status: "ok", value: mapProgram(data) };
}

export async function updateProgram(
  userId: string,
  programId: string,
  updates: AcademyProgramUpdates,
): Promise<AcademyStoreResult<AcademyProgram>> {
  const patch: Record<string, unknown> = {};

  if (updates.kind !== undefined) patch.kind = updates.kind;
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;

  const supabase = await getClient();
  const { data, error } = await supabase
    .from(LEVEL_CONFIG.program.table)
    .update(patch)
    .eq("id", programId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(PROGRAM_COLUMNS)
    .maybeSingle<AcademyRawProgram>();

  if (error) {
    if (error.code === CHECK_VIOLATION) {
      return { status: "invalid", error: "Valeur refusee par la base." };
    }

    fail("updateProgram", error);
  }

  return data ? { status: "ok", value: mapProgram(data) } : { status: "not_found" };
}

// --- Arbre et leçon ---------------------------------------------------------------------

// Lit l'arbre vivant d'un programme. Chaque niveau n'est lu que sous les
// parents vivants du niveau précédent, et filterLiveTree refait le filtrage :
// un descendant d'un élément archivé n'apparaît jamais.
export async function getLiveProgramTree(
  userId: string,
  programId: string,
): Promise<AcademyStoreResult<AcademyProgramTree>> {
  const supabase = await getClient();

  const { data: program, error: programError } = await supabase
    .from(LEVEL_CONFIG.program.table)
    .select(PROGRAM_COLUMNS)
    .eq("id", programId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle<AcademyRawProgram>();

  if (programError) {
    fail("getLiveProgramTree program", programError);
  }

  if (!program) {
    return { status: "not_found" };
  }

  async function readLiveChildren<T>(
    level: AcademyChildLevel,
    columns: string,
    parentIds: string[],
  ): Promise<T[]> {
    if (parentIds.length === 0) {
      return [];
    }

    const config = LEVEL_CONFIG[level];
    const { data, error } = await supabase!
      .from(config.table)
      .select(columns)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in(config.parentColumn as string, parentIds)
      .returns<T[]>();

    if (error) {
      fail(`getLiveProgramTree ${level}`, error);
    }

    return data ?? [];
  }

  const subjects = await readLiveChildren<AcademyRawSubject>(
    "subject",
    `${NODE_COLUMNS}, program_id`,
    [program.id],
  );
  const units = await readLiveChildren<AcademyRawUnit>(
    "unit",
    `${NODE_COLUMNS}, subject_id`,
    subjects.map((row) => row.id),
  );
  const chapters = await readLiveChildren<AcademyRawChapter>(
    "chapter",
    `${NODE_COLUMNS}, unit_id`,
    units.map((row) => row.id),
  );
  const lessons = await readLiveChildren<AcademyRawLesson>(
    "lesson",
    LESSON_TREE_COLUMNS,
    chapters.map((row) => row.id),
  );

  const tree = filterLiveTree({ program, subjects, units, chapters, lessons });

  return tree ? { status: "ok", value: tree } : { status: "not_found" };
}

export async function getLiveLesson(
  userId: string,
  lessonId: string,
): Promise<AcademyStoreResult<AcademyLesson>> {
  if (!(await resolveLiveChain("lesson", lessonId, userId))) {
    return { status: "not_found" };
  }

  const supabase = await getClient();
  const { data, error } = await supabase
    .from(LEVEL_CONFIG.lesson.table)
    .select(LESSON_DETAIL_COLUMNS)
    .eq("id", lessonId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle<AcademyRawLesson & { content: string | null }>();

  if (error) {
    fail("getLiveLesson", error);
  }

  if (!data) {
    return { status: "not_found" };
  }

  return {
    status: "ok",
    value: {
      id: data.id,
      chapterId: data.chapter_id,
      title: data.title,
      content: data.content,
      position: data.position ?? 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}

// --- Niveaux enfants -------------------------------------------------------------------

// Une leçon porte un contenu et pas de description ; les autres niveaux, une
// description et pas de contenu. Aucun champ inexistant n'est renvoyé à null.
function mapChild(level: AcademyChildLevel, row: Record<string, unknown>) {
  const base = {
    id: row.id as string,
    title: row.title as string,
    position: (row.position as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };

  if (level === "lesson") {
    return { ...base, content: (row.content as string | null) ?? null };
  }

  return { ...base, description: (row.description as string | null) ?? null };
}

function childColumns(level: AcademyChildLevel) {
  const config = LEVEL_CONFIG[level];
  return `id, ${config.parentColumn}, title, ${textColumnFor(level)}, position, created_at, updated_at`;
}

// Position par défaut : fin de liste parmi les frères vivants. Une course entre
// deux créations simultanées peut donner deux positions égales ; c'est admis,
// la position n'étant pas unique et le tri départageant par created_at.
async function nextPosition(level: AcademyChildLevel, parentId: string, userId: string) {
  const config = LEVEL_CONFIG[level];
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(config.table)
    .select("position")
    .eq("user_id", userId)
    .eq(config.parentColumn as string, parentId)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  if (error) {
    fail(`nextPosition ${level}`, error);
  }

  return data ? data.position + 1 : 0;
}

export async function createChild(
  level: AcademyChildLevel,
  userId: string,
  input: AcademyChildCreate,
): Promise<AcademyStoreResult<ReturnType<typeof mapChild>>> {
  // Le parent et toute sa chaîne doivent être vivants : on ne crée rien sous un
  // élément archivé ou masqué.
  if (!(await resolveLiveChain(ACADEMY_PARENT_LEVEL[level], input.parentId, userId))) {
    return { status: "not_found" };
  }

  const config = LEVEL_CONFIG[level];
  const position = input.position ?? (await nextPosition(level, input.parentId, userId));
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(config.table)
    .insert({
      user_id: userId,
      [config.parentColumn as string]: input.parentId,
      title: input.title,
      [textColumnFor(level)]: input.text,
      position,
    })
    .select(childColumns(level))
    .single<Record<string, unknown>>();

  if (error) {
    if (error.code === CHECK_VIOLATION) {
      return { status: "invalid", error: "Valeur refusee par la base." };
    }

    // Clé composite (parent_id, user_id) : parent disparu entre la vérification
    // et l'insertion, ou parent d'un autre compte.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { status: "not_found" };
    }

    fail(`createChild ${level}`, error);
  }

  return { status: "ok", value: mapChild(level, data) };
}

export async function updateChild(
  level: AcademyChildLevel,
  userId: string,
  id: string,
  updates: AcademyChildUpdates,
): Promise<AcademyStoreResult<ReturnType<typeof mapChild>>> {
  if (!(await resolveLiveChain(level, id, userId))) {
    return { status: "not_found" };
  }

  const patch: Record<string, unknown> = {};

  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.text !== undefined) patch[textColumnFor(level)] = updates.text;
  if (updates.position !== undefined) patch.position = updates.position;

  const config = LEVEL_CONFIG[level];
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(config.table)
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(childColumns(level))
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    if (error.code === CHECK_VIOLATION) {
      return { status: "invalid", error: "Valeur refusee par la base." };
    }

    fail(`updateChild ${level}`, error);
  }

  return data ? { status: "ok", value: mapChild(level, data) } : { status: "not_found" };
}

// --- Archivage et restauration (tous niveaux) ------------------------------------------

// ARCHIVE, ne supprime pas : écrit deleted_at sur l'élément seul. Ses enfants ne
// sont pas archivés ; la lecture les masque. Un élément déjà masqué par un
// ancêtre archivé est introuvable.
export async function archiveNode(
  level: AcademyLevel,
  userId: string,
  id: string,
): Promise<AcademyStoreResult<null>> {
  if (!(await resolveLiveChain(level, id, userId))) {
    return { status: "not_found" };
  }

  const supabase = await getClient();
  const { data, error } = await supabase
    .from(LEVEL_CONFIG[level].table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    fail(`archiveNode ${level}`, error);
  }

  return data ? { status: "ok", value: null } : { status: "not_found" };
}

// Restaure un élément archivé. REFUSÉE si un ancêtre est archivé : l'élément
// resterait masqué, et la restauration ne se verrait pas.
export async function restoreNode(
  level: AcademyLevel,
  userId: string,
  id: string,
): Promise<AcademyStoreResult<null>> {
  const config = LEVEL_CONFIG[level];
  const supabase = await getClient();
  const selectColumns = config.parentColumn ? `id, ${config.parentColumn}` : "id";
  const { data: row, error: readError } = await supabase
    .from(config.table)
    .select(selectColumns)
    .eq("id", id)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .maybeSingle<Record<string, string>>();

  if (readError) {
    fail(`restoreNode read ${level}`, readError);
  }

  if (!row) {
    return { status: "not_found" };
  }

  if (config.parentLevel && config.parentColumn) {
    const parentLive = await resolveLiveChain(config.parentLevel, row[config.parentColumn], userId);

    if (!parentLive) {
      return { status: "not_found" };
    }
  }

  const { data, error } = await supabase
    .from(config.table)
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    fail(`restoreNode ${level}`, error);
  }

  return data ? { status: "ok", value: null } : { status: "not_found" };
}

// --- Éléments archivés d'un programme --------------------------------------------------

type ArchivedRow = { id: string; title: string; deleted_at: string; parent: string };

// Liste les matières, modules, chapitres et leçons ARCHIVÉS d'un programme vivant,
// dont toute la chaîne d'ancêtres est vivante : exactement ceux que restoreNode
// accepte. Un élément archivé sous un ancêtre archivé n'y figure pas — il
// redeviendra visible ici quand l'ancêtre sera restauré. Lecture seule, client
// de session, filtre user_id sur chaque requête, comme le reste du store. Pas de
// contenu de leçon. Programme inexistant, archivé ou d'un autre compte : not_found.
export async function listArchivedDescendants(
  userId: string,
  programId: string,
): Promise<AcademyStoreResult<AcademyArchivedNode[]>> {
  const supabase = await getClient();

  const { data: program, error: programError } = await supabase
    .from(LEVEL_CONFIG.program.table)
    .select("id, title")
    .eq("id", programId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle<{ id: string; title: string }>();

  if (programError) {
    fail("listArchivedDescendants program", programError);
  }

  if (!program) {
    return { status: "not_found" };
  }

  // Enfants d'un niveau sous des parents vivants donnés : vivants (pour descendre)
  // ou archivés (pour la liste).
  async function readChildren(
    level: AcademyChildLevel,
    parentIds: string[],
    archived: boolean,
  ): Promise<ArchivedRow[]> {
    if (parentIds.length === 0) {
      return [];
    }

    const config = LEVEL_CONFIG[level];
    const query = supabase!
      .from(config.table)
      .select(`id, title, deleted_at, parent:${config.parentColumn}`)
      .eq("user_id", userId)
      .in(config.parentColumn as string, parentIds);
    const { data, error } = await (archived
      ? query.not("deleted_at", "is", null)
      : query.is("deleted_at", null)
    ).returns<ArchivedRow[]>();

    if (error) {
      fail(`listArchivedDescendants ${level}`, error);
    }

    return data ?? [];
  }

  const titles = new Map<string, string>([[programId, program.title]]);
  const items: AcademyArchivedNode[] = [];
  let liveParents = [programId];

  for (const level of ["subject", "unit", "chapter", "lesson"] as const) {
    const archivedRows = await readChildren(level, liveParents, true);

    for (const row of archivedRows) {
      items.push({
        level,
        id: row.id,
        title: row.title,
        parentTitle: titles.get(row.parent) ?? "",
        archivedAt: row.deleted_at,
      });
    }

    if (level === "lesson") {
      break;
    }

    const liveRows = await readChildren(level, liveParents, false);

    for (const row of liveRows) {
      titles.set(row.id, row.title);
    }

    liveParents = liveRows.map((row) => row.id);
  }

  items.sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : a.archivedAt > b.archivedAt ? -1 : 0));

  return { status: "ok", value: items };
}
