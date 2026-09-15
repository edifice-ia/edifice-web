// Types et validation des categories de Journal, sans aucune I/O.
//
// Meme partage que lib/personal/journal.ts : la regle de validation doit etre
// importable a la fois par les routes API et par le composant client, pour que
// le retour visuel avant appel et le 400 renvoye par le serveur ne puissent
// pas diverger.
//
// PERIMETRE : Journal uniquement, conformement a DEC-013 — pas de
// generalisation avant un second cas reel. Rien ici ne doit servir Notes ou
// Taches.

export type PersonalJournalCategory = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

// Le compte affiche par categorie INCLUT les entrees archivees, et le dit.
// Un total des seules entrees actives mentirait sur ce que la suppression peut
// bloquer : la regle de blocage compte aussi les entrees archivees, qu'une
// restauration ramenerait sinon sans categorie. archivedEntryCount est une
// partie de entryCount, pas un complement.
export type PersonalJournalCategoryWithCounts = PersonalJournalCategory & {
  entryCount: number;
  archivedEntryCount: number;
};

// Une entree qui n'a QUE la categorie visee, et qui empeche donc sa
// suppression. L'apercu est calcule cote serveur par erasurePreview : le texte
// complet de l'entree ne quitte jamais le serveur sur ce chemin.
export type JournalCategoryBlockingEntry = {
  id: string;
  createdAt: string;
  mood: number | null;
  preview: string;
  archived: boolean;
};

// Codes d'erreur portes par les reponses 409, pour que l'interface distingue
// les trois conflits sans analyser un message en francais.
export const JOURNAL_CATEGORY_NAME_TAKEN = "CATEGORY_NAME_TAKEN";
export const JOURNAL_CATEGORY_IN_USE = "CATEGORY_IN_USE";
export const JOURNAL_CATEGORY_DELETE_RACE = "CATEGORY_DELETE_RACE";

// Memes bornes que les contraintes SQL de 20260909100000. Ces contraintes
// restent le dernier rempart, mais elles remonteraient une erreur Postgres
// brute en 500 ; ces constantes rendent la meme regle en message lisible.
export const JOURNAL_CATEGORY_NAME_MAX_LENGTH = 60;
export const JOURNAL_CATEGORY_DESCRIPTION_MAX_LENGTH = 200;

// Garde-fou contre une requete aberrante, sans regle metier derriere : aucune
// limite n'est posee en base au nombre de categories d'une entree.
export const JOURNAL_ENTRY_CATEGORIES_MAX = 50;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Valide le format AVANT que l'identifiant n'atteigne Postgres. Sans cela, un
// identifiant malforme remonte en erreur 22P02, que la route transformerait en
// 500. Les routes plus anciennes du pole ne font pas ce controle.
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

// Le nom est stocke apres trim. L'unicite, elle, est garantie par la base sur
// lower(btrim(name)) : "Sport" et " sport " sont refuses comme doublon par
// l'index unique, pas par cette fonction, qui ne voit qu'une valeur a la fois.
export function parseJournalCategoryNameValue(value: unknown): ParseResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: "name doit etre une chaine de caracteres." };
  }

  const name = value.trim();

  if (name.length === 0) {
    return { ok: false, error: "name ne peut pas etre vide." };
  }

  if (name.length > JOURNAL_CATEGORY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `name depasse la longueur maximale de ${JOURNAL_CATEGORY_NAME_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, value: name };
}

// "Pas de description" s'ecrit null, jamais "" : la chaine vide et les blancs
// sont normalises en null, comme context_label sur Taches. La base refuse la
// chaine vide par contrainte ; deux ecritures du meme etat divergeraient.
export function parseJournalCategoryDescriptionValue(
  value: unknown,
): ParseResult<string | null> {
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "description doit etre une chaine de caracteres ou null." };
  }

  const description = value.trim();

  if (description.length === 0) {
    return { ok: true, value: null };
  }

  if (description.length > JOURNAL_CATEGORY_DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      error: `description depasse la longueur maximale de ${JOURNAL_CATEGORY_DESCRIPTION_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, value: description };
}

export type JournalCategoryCreateParseResult =
  | { ok: true; name: string; description: string | null }
  | { ok: false; error: string };

export function parseJournalCategoryCreatePayload(
  payload: unknown,
): JournalCategoryCreateParseResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Charge utile invalide : objet attendu." };
  }

  const record = payload as { name?: unknown; description?: unknown };
  const name = parseJournalCategoryNameValue(record.name);

  if (!name.ok) {
    return name;
  }

  const description = parseJournalCategoryDescriptionValue(record.description);

  if (!description.ok) {
    return description;
  }

  return { ok: true, name: name.value, description: description.value };
}

// Modification partielle. La distinction qui compte est entre "description
// absente de la charge utile" (on n'y touche pas) et "description: null" (on
// l'efface) — d'ou le test d'appartenance, meme patron que
// parseJournalUpdatePayload.
export type JournalCategoryUpdateParseResult =
  | { ok: true; patch: { name?: string; description?: string | null } }
  | { ok: false; error: string };

export function parseJournalCategoryUpdatePayload(
  payload: unknown,
): JournalCategoryUpdateParseResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Charge utile invalide : objet attendu." };
  }

  const record = payload as { name?: unknown; description?: unknown };
  const patch: { name?: string; description?: string | null } = {};

  if ("name" in record) {
    const name = parseJournalCategoryNameValue(record.name);

    if (!name.ok) {
      return name;
    }

    patch.name = name.value;
  }

  if ("description" in record) {
    const description = parseJournalCategoryDescriptionValue(record.description);

    if (!description.ok) {
      return description;
    }

    patch.description = description.value;
  }

  if (!("name" in record) && !("description" in record)) {
    return {
      ok: false,
      error: "Aucun champ modifiable fourni : name ou description attendu.",
    };
  }

  return { ok: true, patch };
}

// Charge utile de PUT /api/personal/journal/[id]/categories : l'ensemble
// COMPLET des categories de l'entree, pas un delta.
//
// Un tableau vide est valide et signifiant : une entree sans categorie est un
// etat legitime a la saisie. L'absence de categorie n'est bloquante qu'au
// moment de supprimer une categorie, jamais ici.
//
// Les doublons sont retires plutot que refuses : la cle primaire
// (entry_id, category_id) les rendrait de toute facon sans effet.
export type JournalEntryCategoriesParseResult =
  | { ok: true; categoryIds: string[] }
  | { ok: false; error: string };

export function parseJournalEntryCategoriesPayload(
  payload: unknown,
): JournalEntryCategoriesParseResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Charge utile invalide : objet attendu." };
  }

  const record = payload as { categoryIds?: unknown };

  if (!Array.isArray(record.categoryIds)) {
    return { ok: false, error: "categoryIds doit etre un tableau, eventuellement vide." };
  }

  if (!record.categoryIds.every(isUuid)) {
    return { ok: false, error: "categoryIds ne doit contenir que des identifiants valides." };
  }

  const categoryIds = [
    ...new Set(record.categoryIds.map((id: string) => id.toLowerCase())),
  ];

  if (categoryIds.length > JOURNAL_ENTRY_CATEGORIES_MAX) {
    return {
      ok: false,
      error: `categoryIds depasse le maximum de ${JOURNAL_ENTRY_CATEGORIES_MAX} categories.`,
    };
  }

  return { ok: true, categoryIds };
}
