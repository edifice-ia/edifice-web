// Hiérarchie pédagogique d'EDIFICE ACADEMY — types, validation et masquage.
//
// Module PUR : aucune entrée-sortie, aucun import serveur. Utilisé par le store
// (lib/server/academy/hierarchy-store.ts), par les futures routes et par
// l'interface, pour que le refus avant appel et le refus du serveur ne puissent
// pas diverger. Table de référence : migration
// supabase/migrations/20261124120000_create_academy_hierarchy.sql.
//
// Les fonctions de validation renvoient { ok: true, ... } ou { ok: false, error }.
// Elles sont plus strictes que la base, jamais plus laxistes : une valeur
// acceptée ici ne doit jamais être refusée par un `check` en base.

export type AcademyLevel = "program" | "subject" | "unit" | "chapter" | "lesson";
export type AcademyChildLevel = Exclude<AcademyLevel, "program">;
export type AcademyProgramKind = "curriculum" | "formation";

export const ACADEMY_LEVELS: AcademyLevel[] = ["program", "subject", "unit", "chapter", "lesson"];
export const ACADEMY_CHILD_LEVELS: AcademyChildLevel[] = ["subject", "unit", "chapter", "lesson"];
export const ACADEMY_PROGRAM_KINDS: AcademyProgramKind[] = ["curriculum", "formation"];

export const ACADEMY_TITLE_MAX_LENGTH = 200;
export const ACADEMY_DESCRIPTION_MAX_LENGTH = 2000;
export const ACADEMY_CONTENT_MAX_LENGTH = 100000;
// Borne de la colonne `integer` de Postgres.
export const ACADEMY_POSITION_MAX = 2147483647;

// Nom du champ qui porte l'identifiant du parent, par niveau enfant. Côté
// client : camelCase. Le store traduit vers la colonne en base.
export const ACADEMY_PARENT_FIELD: Record<AcademyChildLevel, string> = {
  subject: "programId",
  unit: "subjectId",
  chapter: "unitId",
  lesson: "chapterId",
};

export const ACADEMY_PARENT_LEVEL: Record<AcademyChildLevel, AcademyLevel> = {
  subject: "program",
  unit: "subject",
  chapter: "unit",
  lesson: "chapter",
};

// --- Lecture --------------------------------------------------------------

export type AcademyProgram = {
  id: string;
  kind: AcademyProgramKind;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AcademyArchivedProgram = AcademyProgram & { archivedAt: string };

export type AcademyTreeNode = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

// Une leçon dans l'arbre ne porte pas son contenu : il est lu à part
// (lecture d'une leçon), pour que l'arbre reste léger.
export type AcademyTreeLesson = Omit<AcademyTreeNode, "description">;

export type AcademyProgramTree = AcademyProgram & {
  subjects: Array<
    AcademyTreeNode & {
      units: Array<
        AcademyTreeNode & {
          chapters: Array<AcademyTreeNode & { lessons: AcademyTreeLesson[] }>;
        }
      >;
    }
  >;
};

export type AcademyLesson = AcademyTreeLesson & {
  chapterId: string;
  content: string | null;
};

// Élément archivé d'un programme, restaurable : sa chaîne d'ancêtres est vivante.
// Pas de contenu de leçon. Niveau "objective" : objectif pédagogique (étape 2b-1),
// niveau "resource" : ressource pédagogique (étape 2b-2) ; parentTitle est alors
// le titre du niveau auquel l'élément est rattaché.
export type AcademyArchivedNode = {
  level: AcademyChildLevel | "objective" | "resource";
  id: string;
  title: string;
  parentTitle: string;
  archivedAt: string;
};

// --- Primitives de validation ------------------------------------------------

// Copie locale de isUuid, la quatrième du dépôt (goals.ts,
// journal-categories.ts, data-erasure.ts). Dette consignée au chantier 8 :
// Academy ne doit pas dépendre de Personnel, en pause, et un utilitaire partagé
// demande un commit dédié qui touche les trois autres copies.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isAcademyProgramKind(value: unknown): value is AcademyProgramKind {
  return ACADEMY_PROGRAM_KINDS.includes(value as AcademyProgramKind);
}

// Longueur en caractères (points de code), comme `length()` de Postgres, et non
// en unités UTF-16 comme `.length` : un emoji compte pour un.
function charLength(value: string) {
  return Array.from(value).length;
}

type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

function parseTitle(value: unknown): FieldResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: "title doit etre une chaine de caracteres." };
  }

  const title = value.trim();

  if (title.length === 0) {
    return { ok: false, error: "title ne peut pas etre vide." };
  }

  if (charLength(title) > ACADEMY_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `title depasse la longueur maximale de ${ACADEMY_TITLE_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, value: title };
}

// Texte facultatif (description, contenu de leçon). null ou absent : rien.
// Chaîne vide ou faite d'espaces : normalisée en null — la base refuse un texte
// vide, et effacer un champ ne doit pas demander un geste différent de le vider.
function parseOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
): FieldResult<string | null> {
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: `${field} doit etre une chaine de caracteres ou null.` };
  }

  if (value.trim().length === 0) {
    return { ok: true, value: null };
  }

  if (charLength(value) > maxLength) {
    return {
      ok: false,
      error: `${field} depasse la longueur maximale de ${maxLength} caracteres.`,
    };
  }

  return { ok: true, value };
}

function parsePosition(value: unknown): FieldResult<number> {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > ACADEMY_POSITION_MAX
  ) {
    return {
      ok: false,
      error: `position doit etre un entier entre 0 et ${ACADEMY_POSITION_MAX}.`,
    };
  }

  return { ok: true, value };
}

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return payload as Record<string, unknown>;
}

const NOT_AN_OBJECT = "Requete invalide: un objet JSON est attendu.";

// --- Programmes ----------------------------------------------------------------

export type AcademyProgramCreate = {
  kind: AcademyProgramKind;
  title: string;
  description: string | null;
};

export type AcademyProgramUpdates = {
  kind?: AcademyProgramKind;
  title?: string;
  description?: string | null;
};

export function parseProgramCreatePayload(
  payload: unknown,
): ({ ok: true } & AcademyProgramCreate) | { ok: false; error: string } {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: NOT_AN_OBJECT };
  }

  if (!isAcademyProgramKind(record.kind)) {
    return { ok: false, error: "kind doit valoir curriculum ou formation." };
  }

  const title = parseTitle(record.title);

  if (!title.ok) {
    return title;
  }

  const description = parseOptionalText(
    record.description,
    "description",
    ACADEMY_DESCRIPTION_MAX_LENGTH,
  );

  if (!description.ok) {
    return description;
  }

  return { ok: true, kind: record.kind, title: title.value, description: description.value };
}

export function parseProgramUpdatePayload(
  payload: unknown,
): { ok: true; updates: AcademyProgramUpdates } | { ok: false; error: string } {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: NOT_AN_OBJECT };
  }

  const updates: AcademyProgramUpdates = {};

  if ("kind" in record) {
    if (!isAcademyProgramKind(record.kind)) {
      return { ok: false, error: "kind doit valoir curriculum ou formation." };
    }

    updates.kind = record.kind;
  }

  if ("title" in record) {
    const title = parseTitle(record.title);

    if (!title.ok) {
      return title;
    }

    updates.title = title.value;
  }

  if ("description" in record) {
    const description = parseOptionalText(
      record.description,
      "description",
      ACADEMY_DESCRIPTION_MAX_LENGTH,
    );

    if (!description.ok) {
      return description;
    }

    updates.description = description.value;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "Aucun champ a mettre a jour." };
  }

  return { ok: true, updates };
}

// --- Niveaux enfants -------------------------------------------------------------

// Champ de texte propre au niveau : la leçon porte un contenu, les autres une
// description.
function textFieldFor(level: AcademyChildLevel) {
  return level === "lesson"
    ? { field: "content", maxLength: ACADEMY_CONTENT_MAX_LENGTH }
    : { field: "description", maxLength: ACADEMY_DESCRIPTION_MAX_LENGTH };
}

export type AcademyChildCreate = {
  parentId: string;
  title: string;
  // description pour matière, module et chapitre ; contenu pour la leçon.
  text: string | null;
  // null : le store calcule la position (fin de liste).
  position: number | null;
};

export type AcademyChildUpdates = {
  title?: string;
  text?: string | null;
  position?: number;
};

export function parseChildCreatePayload(
  level: AcademyChildLevel,
  payload: unknown,
): ({ ok: true } & AcademyChildCreate) | { ok: false; error: string } {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: NOT_AN_OBJECT };
  }

  const parentField = ACADEMY_PARENT_FIELD[level];
  const parentId = record[parentField];

  if (!isUuid(parentId)) {
    return { ok: false, error: `${parentField} doit etre un identifiant UUID.` };
  }

  const title = parseTitle(record.title);

  if (!title.ok) {
    return title;
  }

  const { field, maxLength } = textFieldFor(level);
  const text = parseOptionalText(record[field], field, maxLength);

  if (!text.ok) {
    return text;
  }

  let position: number | null = null;

  if (record.position !== undefined && record.position !== null) {
    const parsed = parsePosition(record.position);

    if (!parsed.ok) {
      return parsed;
    }

    position = parsed.value;
  }

  return { ok: true, parentId, title: title.value, text: text.value, position };
}

export function parseChildUpdatePayload(
  level: AcademyChildLevel,
  payload: unknown,
): { ok: true; updates: AcademyChildUpdates } | { ok: false; error: string } {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: NOT_AN_OBJECT };
  }

  // Déplacer un élément vers un autre parent n'est pas pris en charge à cette
  // étape : le refuser explicitement plutôt que de l'ignorer en silence.
  const parentField = ACADEMY_PARENT_FIELD[level];

  if (parentField in record) {
    return { ok: false, error: `${parentField} ne peut pas etre modifie.` };
  }

  const { field, maxLength } = textFieldFor(level);
  const otherTextField = field === "content" ? "description" : "content";

  if (otherTextField in record) {
    return { ok: false, error: `${otherTextField} n'existe pas a ce niveau.` };
  }

  const updates: AcademyChildUpdates = {};

  if ("title" in record) {
    const title = parseTitle(record.title);

    if (!title.ok) {
      return title;
    }

    updates.title = title.value;
  }

  if (field in record) {
    const text = parseOptionalText(record[field], field, maxLength);

    if (!text.ok) {
      return text;
    }

    updates.text = text.value;
  }

  if ("position" in record) {
    const position = parsePosition(record.position);

    if (!position.ok) {
      return position;
    }

    updates.position = position.value;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "Aucun champ a mettre a jour." };
  }

  return { ok: true, updates };
}

// --- Objectifs pédagogiques (étape 2b-1) --------------------------------------------

// Niveaux auxquels un objectif peut être rattaché : pas la leçon (choix du
// 2026-11-26). Table : academy_objectives, migration 20261126120000.
export type AcademyObjectiveParentLevel = "program" | "subject" | "unit" | "chapter";

export const ACADEMY_OBJECTIVE_PARENT_LEVELS: AcademyObjectiveParentLevel[] = [
  "program",
  "subject",
  "unit",
  "chapter",
];

// Champ du corps de requête qui porte l'identifiant du parent, par niveau.
export const ACADEMY_OBJECTIVE_PARENT_FIELD: Record<AcademyObjectiveParentLevel, string> = {
  program: "programId",
  subject: "subjectId",
  unit: "unitId",
  chapter: "chapterId",
};

export type AcademyObjectiveCreate = {
  parentLevel: AcademyObjectiveParentLevel;
  parentId: string;
  title: string;
  description: string | null;
};

export type AcademyObjective = {
  id: string;
  parentLevel: AcademyObjectiveParentLevel;
  parentId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export const ACADEMY_OBJECTIVE_ONE_PARENT_ERROR =
  "Un objectif doit avoir exactement un parent : programId, subjectId, unitId ou chapterId.";

// Création d'un objectif : EXACTEMENT un parent parmi programId, subjectId,
// unitId et chapterId (UUID), comme la contrainte academy_objectives_one_parent.
// Un champ parent nul ou absent ne compte pas. La position n'est pas lue : le
// store place l'objectif en fin de liste (choix du 2026-11-26, position non
// modifiable). Pas de mise à jour : il n'existe pas de parseur de mise à jour
// des objectifs, et un objectif ne change pas de parent.
export function parseObjectiveCreatePayload(
  payload: unknown,
): ({ ok: true } & AcademyObjectiveCreate) | { ok: false; error: string } {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: NOT_AN_OBJECT };
  }

  const present = ACADEMY_OBJECTIVE_PARENT_LEVELS.filter((level) => {
    const value = record[ACADEMY_OBJECTIVE_PARENT_FIELD[level]];
    return value !== undefined && value !== null;
  });

  if (present.length !== 1) {
    return { ok: false, error: ACADEMY_OBJECTIVE_ONE_PARENT_ERROR };
  }

  const parentLevel = present[0];
  const parentField = ACADEMY_OBJECTIVE_PARENT_FIELD[parentLevel];
  const parentId = record[parentField];

  if (!isUuid(parentId)) {
    return { ok: false, error: `${parentField} doit etre un identifiant UUID.` };
  }

  const title = parseTitle(record.title);

  if (!title.ok) {
    return title;
  }

  const description = parseOptionalText(
    record.description,
    "description",
    ACADEMY_DESCRIPTION_MAX_LENGTH,
  );

  if (!description.ok) {
    return description;
  }

  return { ok: true, parentLevel, parentId, title: title.value, description: description.value };
}

// --- Ressources pédagogiques (étape 2b-2) --------------------------------------------

// Niveaux auxquels une ressource peut être rattachée : le programme et la leçon
// (choix du 2026-11-27). Table : academy_resources, migration 20261127120000.
export type AcademyResourceParentLevel = "program" | "lesson";

export const ACADEMY_RESOURCE_PARENT_LEVELS: AcademyResourceParentLevel[] = ["program", "lesson"];

export const ACADEMY_RESOURCE_PARENT_FIELD: Record<AcademyResourceParentLevel, string> = {
  program: "programId",
  lesson: "lessonId",
};

// Lien ou texte. Pas de fichier : étape 2b-3.
export type AcademyResourceKind = "link" | "text";

export const ACADEMY_RESOURCE_KINDS: AcademyResourceKind[] = ["link", "text"];

export const ACADEMY_RESOURCE_URL_MAX_LENGTH = 2048;
export const ACADEMY_RESOURCE_BODY_MAX_LENGTH = 20000;

export type AcademyResourceCreate = {
  parentLevel: AcademyResourceParentLevel;
  parentId: string;
  kind: AcademyResourceKind;
  title: string;
  url: string | null;
  body: string | null;
};

export type AcademyResource = {
  id: string;
  parentLevel: AcademyResourceParentLevel;
  parentId: string;
  kind: AcademyResourceKind;
  title: string;
  url: string | null;
  body: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export const ACADEMY_RESOURCE_ONE_PARENT_ERROR =
  "Une ressource doit avoir exactement un parent : programId ou lessonId.";

// Mêmes motifs que les contraintes academy_resources_url_http et
// academy_resources_url_no_credentials de la migration : appliqués à la chaîne
// brute, ils garantissent qu'une URL acceptée ici ne sera pas refusée en base.
const RESOURCE_URL_PATTERN = /^https?:\/\/[^\s]+$/i;
const RESOURCE_URL_CREDENTIALS_PATTERN = /^https?:\/\/[^/?#]*@/i;

// URL d'un lien, rognée : http ou https uniquement, nom d'hôte, sans espace,
// sans identifiants, ACADEMY_RESOURCE_URL_MAX_LENGTH caractères au plus. La
// chaîne enregistrée est celle saisie, rognée, et non la forme normalisée par
// URL : ce que l'on contrôle est ce que l'on stocke.
function parseResourceUrl(value: unknown): FieldResult<string> {
  if (value === undefined || value === null) {
    return { ok: false, error: "url est obligatoire pour un lien." };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "url doit etre une chaine de caracteres." };
  }

  const url = value.trim();

  if (url.length === 0) {
    return { ok: false, error: "url est obligatoire pour un lien." };
  }

  if (charLength(url) > ACADEMY_RESOURCE_URL_MAX_LENGTH) {
    return {
      ok: false,
      error: `url depasse la longueur maximale de ${ACADEMY_RESOURCE_URL_MAX_LENGTH} caracteres.`,
    };
  }

  if (/\s/.test(url)) {
    return { ok: false, error: "url ne doit pas contenir d'espace." };
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "url doit etre une adresse http ou https valide." };
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.hostname.length === 0 ||
    !RESOURCE_URL_PATTERN.test(url)
  ) {
    return { ok: false, error: "url doit etre une adresse http ou https valide." };
  }

  if (parsed.username || parsed.password || RESOURCE_URL_CREDENTIALS_PATTERN.test(url)) {
    return { ok: false, error: "url ne doit pas contenir d'identifiants." };
  }

  return { ok: true, value: url };
}

// Texte d'une ressource : non vide, ACADEMY_RESOURCE_BODY_MAX_LENGTH caractères
// au plus, conservé tel quel (non rogné), comme le contenu d'une leçon.
function parseResourceBody(value: unknown): FieldResult<string> {
  if (value === undefined || value === null) {
    return { ok: false, error: "body est obligatoire pour un texte." };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "body doit etre une chaine de caracteres." };
  }

  if (value.trim().length === 0) {
    return { ok: false, error: "body ne peut pas etre vide." };
  }

  if (charLength(value) > ACADEMY_RESOURCE_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `body depasse la longueur maximale de ${ACADEMY_RESOURCE_BODY_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, value };
}

function isPresent(value: unknown) {
  return value !== undefined && value !== null;
}

// Création d'une ressource : EXACTEMENT un parent parmi programId et lessonId
// (UUID), comme academy_resources_one_parent ; kind link ou text ; titre
// rogné ; pour un lien, une url et pas de body ; pour un texte, un body et pas
// d'url (academy_resources_kind_fields). La position n'est pas lue : le store
// place la ressource en fin de liste. Pas de parseur de mise à jour.
export function parseResourceCreatePayload(
  payload: unknown,
): ({ ok: true } & AcademyResourceCreate) | { ok: false; error: string } {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: NOT_AN_OBJECT };
  }

  const present = ACADEMY_RESOURCE_PARENT_LEVELS.filter((level) =>
    isPresent(record[ACADEMY_RESOURCE_PARENT_FIELD[level]]),
  );

  if (present.length !== 1) {
    return { ok: false, error: ACADEMY_RESOURCE_ONE_PARENT_ERROR };
  }

  const parentLevel = present[0];
  const parentField = ACADEMY_RESOURCE_PARENT_FIELD[parentLevel];
  const parentId = record[parentField];

  if (!isUuid(parentId)) {
    return { ok: false, error: `${parentField} doit etre un identifiant UUID.` };
  }

  const kind = record.kind;

  if (!ACADEMY_RESOURCE_KINDS.includes(kind as AcademyResourceKind)) {
    return { ok: false, error: "kind doit valoir link ou text." };
  }

  const title = parseTitle(record.title);

  if (!title.ok) {
    return title;
  }

  if (kind === "link") {
    if (isPresent(record.body)) {
      return { ok: false, error: "body n'existe pas pour un lien." };
    }

    const url = parseResourceUrl(record.url);

    if (!url.ok) {
      return url;
    }

    return { ok: true, parentLevel, parentId, kind, title: title.value, url: url.value, body: null };
  }

  if (isPresent(record.url)) {
    return { ok: false, error: "url n'existe pas pour un texte." };
  }

  const body = parseResourceBody(record.body);

  if (!body.ok) {
    return body;
  }

  return {
    ok: true,
    parentLevel,
    parentId,
    kind: "text",
    title: title.value,
    url: null,
    body: body.value,
  };
}

// --- Masquage : filterLiveTree ---------------------------------------------------

// Lignes telles que lues en base, archivées comprises. Le masquage ne suppose
// rien sur le filtrage déjà fait par la requête : il le refait.
export type AcademyRawRow = {
  id: string;
  deleted_at: string | null;
  position?: number;
  created_at: string;
  updated_at: string;
  title: string;
  description?: string | null;
};

export type AcademyRawProgram = AcademyRawRow & { kind: AcademyProgramKind };
export type AcademyRawSubject = AcademyRawRow & { program_id: string };
export type AcademyRawUnit = AcademyRawRow & { subject_id: string };
export type AcademyRawChapter = AcademyRawRow & { unit_id: string };
export type AcademyRawLesson = AcademyRawRow & { chapter_id: string };

export type AcademyRawTree = {
  program: AcademyRawProgram | null;
  subjects: AcademyRawSubject[];
  units: AcademyRawUnit[];
  chapters: AcademyRawChapter[];
  lessons: AcademyRawLesson[];
};

function isLive(row: { deleted_at: string | null }) {
  return row.deleted_at === null;
}

// Tri de lecture : position, puis created_at (DEC-014, note du 2026-11-24).
function byPositionThenCreatedAt(a: AcademyRawRow, b: AcademyRawRow) {
  const positionDelta = (a.position ?? 0) - (b.position ?? 0);

  if (positionDelta !== 0) {
    return positionDelta;
  }

  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

function toNode(row: AcademyRawRow): AcademyTreeNode {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    position: row.position ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLesson(row: AcademyRawLesson): AcademyTreeLesson {
  return {
    id: row.id,
    title: row.title,
    position: row.position ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Construit l'arbre vivant d'un programme. Un élément n'y figure que s'il est
// lui-même non archivé ET que tout son chemin jusqu'au programme l'est aussi :
// archiver un parent masque tous ses descendants sans les archiver. Renvoie null
// si le programme est absent ou archivé.
export function filterLiveTree(raw: AcademyRawTree): AcademyProgramTree | null {
  const program = raw.program;

  if (!program || !isLive(program)) {
    return null;
  }

  const subjects = raw.subjects
    .filter((row) => isLive(row) && row.program_id === program.id)
    .sort(byPositionThenCreatedAt);
  const liveSubjectIds = new Set(subjects.map((row) => row.id));

  const units = raw.units
    .filter((row) => isLive(row) && liveSubjectIds.has(row.subject_id))
    .sort(byPositionThenCreatedAt);
  const liveUnitIds = new Set(units.map((row) => row.id));

  const chapters = raw.chapters
    .filter((row) => isLive(row) && liveUnitIds.has(row.unit_id))
    .sort(byPositionThenCreatedAt);
  const liveChapterIds = new Set(chapters.map((row) => row.id));

  const lessons = raw.lessons
    .filter((row) => isLive(row) && liveChapterIds.has(row.chapter_id))
    .sort(byPositionThenCreatedAt);

  return {
    id: program.id,
    kind: program.kind,
    title: program.title,
    description: program.description ?? null,
    createdAt: program.created_at,
    updatedAt: program.updated_at,
    subjects: subjects.map((subject) => ({
      ...toNode(subject),
      units: units
        .filter((unit) => unit.subject_id === subject.id)
        .map((unit) => ({
          ...toNode(unit),
          chapters: chapters
            .filter((chapter) => chapter.unit_id === unit.id)
            .map((chapter) => ({
              ...toNode(chapter),
              lessons: lessons
                .filter((lesson) => lesson.chapter_id === chapter.id)
                .map(toLesson),
            })),
        })),
    })),
  };
}
