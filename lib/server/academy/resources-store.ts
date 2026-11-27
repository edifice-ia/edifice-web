import {
  type AcademyArchivedNode,
  type AcademyResource,
  type AcademyResourceCreate,
  type AcademyResourceKind,
  type AcademyResourceParentLevel,
} from "@/lib/academy/hierarchy";
import {
  fail,
  getClient,
  listLivePrograms,
  resolveLiveChain,
  type AcademyStoreResult,
} from "@/lib/server/academy/hierarchy-store";

// Store des ressources pédagogiques d'Academy (étape 2b-2 du chantier 8).
// Table : academy_resources, migration 20261127120000.
//
// MÊMES RÈGLES QUE hierarchy-store.ts et objectives-store.ts : client de session
// uniquement, jamais la clé service-role ; les policies *_own sont le garde
// réel, et chaque requête filtre en plus sur user_id. Aucun nom de table ni de
// colonne ne vient de l'extérieur.
//
// MASQUAGE. Une ressource dont le parent, ou un ancêtre du parent, est archivé
// est introuvable, en lecture comme en écriture : resolveLiveChain sur le
// parent. Pour une ressource de leçon, la chaîne est vérifiée jusqu'au
// programme. Les listes descendent par les seuls niveaux vivants.
//
// Pas de mise à jour : une ressource se crée, s'archive et se restaure.

const TABLE = "academy_resources";

const PARENT_COLUMN: Record<AcademyResourceParentLevel, string> = {
  program: "program_id",
  lesson: "lesson_id",
};

const COLUMNS =
  "id, program_id, lesson_id, kind, title, url, body, position, created_at, updated_at, deleted_at";

const CHECK_VIOLATION = "23514";
const FOREIGN_KEY_VIOLATION = "23503";

// Ressource accompagnée du titre de son parent (programme ou leçon).
export type AcademyResourceWithParent = AcademyResource & { parentTitle: string };

export type AcademyProgramResources = {
  programId: string;
  programTitle: string;
  // Ressources rattachées au programme, puis aux leçons vivantes du programme.
  resources: AcademyResourceWithParent[];
};

type RawResource = {
  id: string;
  program_id: string | null;
  lesson_id: string | null;
  kind: string;
  title: string;
  url: string | null;
  body: string | null;
  position: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function parentOf(row: RawResource): { level: AcademyResourceParentLevel; id: string } {
  if (row.program_id) {
    return { level: "program", id: row.program_id };
  }

  if (row.lesson_id) {
    return { level: "lesson", id: row.lesson_id };
  }

  // La contrainte academy_resources_one_parent rend ce cas impossible.
  fail("parentOf", { message: "Ressource sans parent." });
}

function mapResource(row: RawResource): AcademyResource {
  const parent = parentOf(row);

  return {
    id: row.id,
    parentLevel: parent.level,
    parentId: parent.id,
    kind: row.kind as AcademyResourceKind,
    title: row.title,
    url: row.url ?? null,
    body: row.body ?? null,
    position: row.position ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function byPositionThenCreatedAt(a: AcademyResource, b: AcademyResource) {
  if (a.position !== b.position) {
    return a.position - b.position;
  }

  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

// --- Création ---------------------------------------------------------------------------

// Fin de liste parmi les ressources vivantes du même parent. Une course entre
// deux créations simultanées peut donner deux positions égales ; admis, le tri
// départageant par created_at.
async function nextResourcePosition(
  userId: string,
  parentLevel: AcademyResourceParentLevel,
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
    fail("nextResourcePosition", error);
  }

  return data ? data.position + 1 : 0;
}

export async function createResource(
  userId: string,
  input: AcademyResourceCreate,
): Promise<AcademyStoreResult<AcademyResource>> {
  // Le parent et toute sa chaîne, jusqu'au programme, doivent être vivants.
  if (!(await resolveLiveChain(input.parentLevel, input.parentId, userId))) {
    return { status: "not_found" };
  }

  const position = await nextResourcePosition(userId, input.parentLevel, input.parentId);
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      [PARENT_COLUMN[input.parentLevel]]: input.parentId,
      kind: input.kind,
      title: input.title,
      url: input.url,
      body: input.body,
      position,
    })
    .select(COLUMNS)
    .single<RawResource>();

  if (error) {
    if (error.code === CHECK_VIOLATION) {
      return { status: "invalid", error: "Valeur refusee par la base." };
    }

    // Clé composite (parent_id, user_id) : parent disparu entre la vérification
    // et l'insertion, ou parent d'un autre compte.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { status: "not_found" };
    }

    fail("createResource", error);
  }

  return { status: "ok", value: mapResource(data) };
}

// --- Leçons vivantes d'un programme -------------------------------------------------------

// Leçons vivantes sous une chaîne vivante (matières, modules, chapitres
// vivants) du programme donné, identifiant -> titre. Le programme lui-même doit
// avoir été vérifié vivant par l'appelant.
async function readLiveLessons(userId: string, programId: string): Promise<Map<string, string>> {
  const supabase = await getClient();
  const steps = [
    { table: "academy_subjects", parentColumn: "program_id" },
    { table: "academy_units", parentColumn: "subject_id" },
    { table: "academy_chapters", parentColumn: "unit_id" },
    { table: "academy_lessons", parentColumn: "chapter_id" },
  ];
  let parents = [programId];
  let rows: { id: string; title: string }[] = [];

  for (const step of steps) {
    if (parents.length === 0) {
      return new Map();
    }

    const { data, error } = await supabase
      .from(step.table)
      .select("id, title")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in(step.parentColumn, parents)
      .returns<{ id: string; title: string }[]>();

    if (error) {
      fail(`readLiveLessons ${step.table}`, error);
    }

    rows = data ?? [];
    parents = rows.map((row) => row.id);
  }

  return new Map(rows.map((row) => [row.id, row.title]));
}

async function readProgramTitle(userId: string, programId: string): Promise<string | null> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("academy_programs")
    .select("title")
    .eq("id", programId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle<{ title: string }>();

  if (error) {
    fail("readProgramTitle", error);
  }

  return data ? data.title : null;
}

// Ressources, vivantes ou archivées, rattachées au programme ou à l'une des
// leçons données.
async function readResources(
  userId: string,
  programId: string,
  lessonIds: string[],
  archived: boolean,
): Promise<RawResource[]> {
  const supabase = await getClient();
  const rows: RawResource[] = [];
  const targets: { column: string; ids: string[] }[] = [
    { column: "program_id", ids: [programId] },
    { column: "lesson_id", ids: lessonIds },
  ];

  for (const target of targets) {
    if (target.ids.length === 0) {
      continue;
    }

    const query = supabase.from(TABLE).select(COLUMNS).eq("user_id", userId).in(target.column, target.ids);
    const { data, error } = await (archived
      ? query.not("deleted_at", "is", null)
      : query.is("deleted_at", null)
    ).returns<RawResource[]>();

    if (error) {
      fail(`readResources ${target.column}`, error);
    }

    rows.push(...(data ?? []));
  }

  return rows;
}

// --- Lectures -----------------------------------------------------------------------------

// Page Ressources : pour chaque programme vivant, ses ressources vivantes,
// celles du programme d'abord, puis celles de ses leçons vivantes (titre de la
// leçon en parentTitle). Un programme sans ressource figure avec une liste vide.
export async function listLiveResourcesByProgram(userId: string): Promise<AcademyProgramResources[]> {
  const programs = await listLivePrograms(userId);
  const result: AcademyProgramResources[] = [];

  for (const program of programs) {
    const lessons = await readLiveLessons(userId, program.id);
    const rows = await readResources(userId, program.id, [...lessons.keys()], false);
    const resources = rows.map((row) => {
      const resource = mapResource(row);
      const parentTitle =
        resource.parentLevel === "program" ? program.title : lessons.get(resource.parentId) ?? "";

      return { ...resource, parentTitle };
    });

    resources.sort((a, b) => {
      if (a.parentLevel !== b.parentLevel) {
        return a.parentLevel === "program" ? -1 : 1;
      }

      if (a.parentId !== b.parentId) {
        return a.parentTitle.localeCompare(b.parentTitle, "fr");
      }

      return byPositionThenCreatedAt(a, b);
    });

    result.push({ programId: program.id, programTitle: program.title, resources });
  }

  return result;
}

// Arbre : ressources vivantes rattachées au programme lui-même (pas celles des
// leçons). Programme inexistant, archivé ou d'un autre compte : not_found.
export async function listLiveProgramResources(
  userId: string,
  programId: string,
): Promise<AcademyStoreResult<AcademyResource[]>> {
  if ((await readProgramTitle(userId, programId)) === null) {
    return { status: "not_found" };
  }

  const resources = (await readResources(userId, programId, [], false)).map(mapResource);
  resources.sort(byPositionThenCreatedAt);

  return { status: "ok", value: resources };
}

// Page Leçon : ressources vivantes d'une leçon vivante, chaîne vérifiée jusqu'au
// programme. Leçon introuvable ou masquée : not_found.
export async function listLiveLessonResources(
  userId: string,
  lessonId: string,
): Promise<AcademyStoreResult<AcademyResource[]>> {
  if (!(await resolveLiveChain("lesson", lessonId, userId))) {
    return { status: "not_found" };
  }

  const supabase = await getClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .is("deleted_at", null)
    .returns<RawResource[]>();

  if (error) {
    fail("listLiveLessonResources", error);
  }

  const resources = (data ?? []).map(mapResource);
  resources.sort(byPositionThenCreatedAt);

  return { status: "ok", value: resources };
}

// Ressources ARCHIVÉES restaurables d'un programme vivant : rattachées au
// programme ou à une leçon vivante sous une chaîne vivante. Ce sont exactement
// celles que restoreResource accepte. Au format des éléments archivés de l'arbre.
export async function listArchivedResources(
  userId: string,
  programId: string,
): Promise<AcademyStoreResult<AcademyArchivedNode[]>> {
  const programTitle = await readProgramTitle(userId, programId);

  if (programTitle === null) {
    return { status: "not_found" };
  }

  const lessons = await readLiveLessons(userId, programId);
  const items = (await readResources(userId, programId, [...lessons.keys()], true)).map((row) => {
    const parent = parentOf(row);

    return {
      level: "resource" as const,
      id: row.id,
      title: row.title,
      parentTitle: parent.level === "program" ? programTitle : lessons.get(parent.id) ?? "",
      archivedAt: row.deleted_at as string,
    };
  });

  items.sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : a.archivedAt > b.archivedAt ? -1 : 0));

  return { status: "ok", value: items };
}

// --- Archivage et restauration ------------------------------------------------------------------

async function readResource(userId: string, id: string, archived: boolean) {
  const supabase = await getClient();
  const query = supabase.from(TABLE).select(COLUMNS).eq("id", id).eq("user_id", userId);
  const { data, error } = await (archived
    ? query.not("deleted_at", "is", null)
    : query.is("deleted_at", null)
  ).maybeSingle<RawResource>();

  if (error) {
    fail("readResource", error);
  }

  return data;
}

// ARCHIVE, ne supprime pas : écrit deleted_at. Une ressource dont le parent est
// archivé ou masqué est introuvable.
export async function archiveResource(
  userId: string,
  id: string,
): Promise<AcademyStoreResult<null>> {
  const row = await readResource(userId, id, false);

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
    fail("archiveResource", error);
  }

  return data ? { status: "ok", value: null } : { status: "not_found" };
}

// Restaure une ressource archivée. REFUSÉE si le parent, ou un de ses ancêtres,
// est archivé : la ressource resterait masquée.
export async function restoreResource(
  userId: string,
  id: string,
): Promise<AcademyStoreResult<null>> {
  const row = await readResource(userId, id, true);

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
    fail("restoreResource", error);
  }

  return data ? { status: "ok", value: null } : { status: "not_found" };
}
