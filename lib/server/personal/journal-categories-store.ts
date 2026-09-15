import { erasurePreview } from "@/lib/personal/data-erasure";
import type {
  JournalCategoryBlockingEntry,
  PersonalJournalCategory,
  PersonalJournalCategoryWithCounts,
} from "@/lib/personal/journal-categories";
import { createClient } from "@/src/lib/supabase/server";

// Client de session, pas service-role — meme raisonnement que journal-store.ts.
// RLS est le garde REEL : si les policies de personal_journal_categories ou de
// personal_journal_entry_categories manquaient, il n'y aurait aucun second
// filet. Les filtres .eq("user_id", userId) ci-dessous sont redondants avec
// RLS et volontairement conserves.
//
// Supprimer une categorie est une suppression PHYSIQUE, et elle vit ici, hors
// de data-erasure-store.ts. C'est coherent avec la regle du depot : ce fichier-
// la porte les gestes d'effacement de CONTENU, sous la cle service-role. Une
// categorie est une etiquette, pas du contenu ; sa suppression est un geste de
// gestion courante, accorde a authenticated sous policy scopee au proprietaire
// (20260909100000).
async function getCategoriesClient() {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Configuration Supabase absente.");
  }

  return supabase;
}

type CategoriesClient = Awaited<ReturnType<typeof getCategoriesClient>>;

type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type LinkRow = {
  entry_id: string;
  category_id: string;
};

const CATEGORY_COLUMNS = "id, name, description, created_at, updated_at";

// Longueur maximale d'une liste d'identifiants dans un filtre `in` : au-dela,
// l'URL de la requete PostgREST s'allonge sans borne. Environ 3,7 Ko pour 100
// UUID.
const IN_FILTER_CHUNK = 100;

function mapCategory(row: CategoryRow): PersonalJournalCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

// Nom deja pris par une autre categorie du meme compte. L'unicite est portee
// par l'index personal_journal_categories_user_id_name_key, sur
// (user_id, lower(btrim(name))) : c'est la base qui tranche, pas une lecture
// prealable, qui laisserait une fenetre de course.
export class JournalCategoryNameConflictError extends Error {
  constructor() {
    super("Une categorie porte deja ce nom (majuscules et espaces ignores).");
    this.name = "JournalCategoryNameConflictError";
  }
}

function isUniqueViolation(error: { code?: string }) {
  return error.code === "23505";
}

function isForeignKeyViolation(error: { code?: string }) {
  return error.code === "23503";
}

// Toutes les liaisons du compte, en une requete et sans filtre `in` : leur
// nombre est borne par l'usage d'un journal personnel, et cela evite une URL
// qui grandirait avec le nombre d'entrees.
async function listOwnedLinks(supabase: CategoriesClient, userId: string) {
  const { data, error } = await supabase
    .from("personal_journal_entry_categories")
    .select("entry_id, category_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LinkRow[];
}

// Identifiants des categories de CHAQUE entree du compte, pour enrichir les
// listes d'entrees de journal. Entree absente de la table : aucune categorie.
export async function listJournalEntryCategoryIds(
  userId: string,
): Promise<Map<string, string[]>> {
  const supabase = await getCategoriesClient();
  const links = await listOwnedLinks(supabase, userId);
  const byEntry = new Map<string, string[]>();

  for (const link of links) {
    const ids = byEntry.get(link.entry_id) ?? [];
    ids.push(link.category_id);
    byEntry.set(link.entry_id, ids);
  }

  return byEntry;
}

export async function listCategoryIdsForJournalEntry({
  userId,
  entryId,
}: {
  userId: string;
  entryId: string;
}): Promise<string[]> {
  const supabase = await getCategoriesClient();
  const { data, error } = await supabase
    .from("personal_journal_entry_categories")
    .select("category_id")
    .eq("user_id", userId)
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as { category_id: string }[]).map((row) => row.category_id);
}

// Comptes calcules a la lecture, jamais persistes — meme regle que la serie
// d'Habitudes et la charge de Taches.
//
// Pas de jointure imbriquee PostgREST vers les entrees : la cle etrangere est
// composite, et faire dependre l'affichage de la resolution de cette relation
// ajouterait une dependance a la contrainte que DEC-013 refuse de presumer
// appliquee. Meme choix que completionCount sur Habitudes.
export async function listJournalCategories(
  userId: string,
): Promise<PersonalJournalCategoryWithCounts[]> {
  const supabase = await getCategoriesClient();

  const [categoriesResult, links, archivedResult] = await Promise.all([
    supabase
      .from("personal_journal_categories")
      .select(CATEGORY_COLUMNS)
      .eq("user_id", userId)
      .order("name", { ascending: true }),
    listOwnedLinks(supabase, userId),
    // Les entrees archivees du compte, sans filtre `in` : leur nombre est
    // borne, et la liste suffit a distinguer, parmi les liaisons, celles qui
    // portent sur une entree archivee.
    supabase
      .from("personal_journal_entries")
      .select("id")
      .eq("user_id", userId)
      .not("deleted_at", "is", null),
  ]);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  if (archivedResult.error) {
    throw new Error(archivedResult.error.message);
  }

  const archivedIds = new Set(
    ((archivedResult.data ?? []) as { id: string }[]).map((row) => row.id),
  );
  const counts = new Map<string, { entryCount: number; archivedEntryCount: number }>();

  for (const link of links) {
    const current = counts.get(link.category_id) ?? { entryCount: 0, archivedEntryCount: 0 };
    current.entryCount += 1;

    if (archivedIds.has(link.entry_id)) {
      current.archivedEntryCount += 1;
    }

    counts.set(link.category_id, current);
  }

  return ((categoriesResult.data ?? []) as CategoryRow[]).map((row) => ({
    ...mapCategory(row),
    ...(counts.get(row.id) ?? { entryCount: 0, archivedEntryCount: 0 }),
  }));
}

export async function createJournalCategory({
  userId,
  name,
  description,
}: {
  userId: string;
  name: string;
  description: string | null;
}): Promise<PersonalJournalCategory> {
  const supabase = await getCategoriesClient();
  const { data, error } = await supabase
    .from("personal_journal_categories")
    .insert({ user_id: userId, name, description })
    .select(CATEGORY_COLUMNS)
    .single<CategoryRow>();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new JournalCategoryNameConflictError();
    }

    throw new Error(error.message);
  }

  return mapCategory(data);
}

// Couvre le renommage et la modification de description. null si la categorie
// n'existe pas ou appartient a un autre compte : les deux repondent 404.
export async function updateJournalCategory({
  userId,
  categoryId,
  patch,
}: {
  userId: string;
  categoryId: string;
  patch: { name?: string; description?: string | null };
}): Promise<PersonalJournalCategory | null> {
  const supabase = await getCategoriesClient();
  const { data, error } = await supabase
    .from("personal_journal_categories")
    .update(patch)
    .eq("id", categoryId)
    .eq("user_id", userId)
    .select(CATEGORY_COLUMNS)
    .maybeSingle<CategoryRow>();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new JournalCategoryNameConflictError();
    }

    throw new Error(error.message);
  }

  return data ? mapCategory(data) : null;
}

// Entrees dont la categorie visee est la SEULE categorie — celles qui la
// rendent insupprimable. Archivees COMPRISES : une entree archivee privee en
// silence de sa seule categorie reviendrait sans categorie a sa restauration.
async function findSoleCategoryEntries(
  supabase: CategoriesClient,
  userId: string,
  categoryId: string,
): Promise<JournalCategoryBlockingEntry[]> {
  const links = await listOwnedLinks(supabase, userId);
  const categoriesPerEntry = new Map<string, number>();

  for (const link of links) {
    categoriesPerEntry.set(link.entry_id, (categoriesPerEntry.get(link.entry_id) ?? 0) + 1);
  }

  const soleEntryIds = links
    .filter((link) => link.category_id === categoryId)
    .map((link) => link.entry_id)
    .filter((entryId) => categoriesPerEntry.get(entryId) === 1);

  if (soleEntryIds.length === 0) {
    return [];
  }

  const entries: JournalCategoryBlockingEntry[] = [];

  // Filtre `in` decoupe : le nombre d'entrees bloquantes n'a pas de borne.
  for (const ids of chunk(soleEntryIds, IN_FILTER_CHUNK)) {
    const { data, error } = await supabase
      .from("personal_journal_entries")
      .select("id, content, mood, created_at, deleted_at")
      .eq("user_id", userId)
      .in("id", ids);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as {
      id: string;
      content: string;
      mood: number | null;
      created_at: string;
      deleted_at: string | null;
    }[]) {
      entries.push({
        id: row.id,
        createdAt: row.created_at,
        mood: row.mood,
        preview: erasurePreview(row.content),
        archived: row.deleted_at !== null,
      });
    }
  }

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type JournalCategoryDeletionResult =
  | { status: "deleted"; unlinkedEntryCount: number }
  | { status: "blocked"; entries: JournalCategoryBlockingEntry[] }
  | { status: "race" }
  | { status: "not_found" };

// SUPPRESSION PHYSIQUE ET IRREVERSIBLE d'une categorie. Sequentielle, en
// quatre temps :
//
//   1. la categorie existe et appartient a l'appelant ;
//   2. si une entree n'a QUE cette categorie, rien n'est ecrit : "blocked",
//      avec la liste des entrees a reassigner ;
//   3. sinon, retrait des liens de cette categorie — ils ne portent plus que
//      sur des entrees qui gardent d'autres categories ;
//   4. suppression de la categorie.
//
// Pas atomique, et c'est assume — meme arbitrage que DEC-012, aucune fonction
// Postgres n'est introduite. Deux fenetres, toutes deux sans perte de contenu :
//
//   - entre 3 et 4, une autre session peut creer une entree n'ayant que cette
//     categorie. La cle composite en `restrict` refuse alors la suppression en
//     23503 : c'est le filet structurel. Le controle est refait, et la reponse
//     est "blocked" si l'entree est bien mono-categorie, "race" sinon — jamais
//     une 500 ;
//   - si 4 echoue pour une autre raison, les liens de 3 sont deja retires.
//     Des entrees ont perdu une etiquette qu'elles partageaient avec d'autres ;
//     aucune n'est privee de sa derniere categorie, l'etape 2 l'a garanti.
export async function deleteJournalCategory({
  userId,
  categoryId,
}: {
  userId: string;
  categoryId: string;
}): Promise<JournalCategoryDeletionResult> {
  const supabase = await getCategoriesClient();

  const { data: existing, error: existingError } = await supabase
    .from("personal_journal_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    return { status: "not_found" };
  }

  const blocking = await findSoleCategoryEntries(supabase, userId, categoryId);

  if (blocking.length > 0) {
    return { status: "blocked", entries: blocking };
  }

  const { count: unlinkedEntryCount, error: unlinkError } = await supabase
    .from("personal_journal_entry_categories")
    .delete({ count: "exact" })
    .eq("category_id", categoryId)
    .eq("user_id", userId);

  if (unlinkError) {
    throw new Error(unlinkError.message);
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("personal_journal_categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (deleteError) {
    if (isForeignKeyViolation(deleteError)) {
      const late = await findSoleCategoryEntries(supabase, userId, categoryId);

      return late.length > 0 ? { status: "blocked", entries: late } : { status: "race" };
    }

    throw new Error(deleteError.message);
  }

  // Supprimee entre l'etape 1 et l'etape 4 par une autre session.
  if (!deleted) {
    return { status: "not_found" };
  }

  return { status: "deleted", unlinkedEntryCount: unlinkedEntryCount ?? 0 };
}

export type JournalEntryCategoriesResult =
  | { status: "ok"; categoryIds: string[] }
  | { status: "not_found" };

// Remplace l'ensemble des categories d'UNE entree.
//
// L'entree peut etre ACTIVE OU ARCHIVEE : c'est ce qui permet de reassigner,
// depuis l'ecran de blocage, une entree archivee qui empeche la suppression
// d'une categorie. Seule l'etiquette change, jamais le contenu.
//
// not_found — donc 404 uniforme — si l'entree ou l'une des categories
// n'existe pas ou appartient a un autre compte. Le controle applicatif passe
// par RLS ; la cle composite de 20260914100000 rend de toute facon impossible
// en base une liaison vers la categorie d'un autre compte.
//
// Ajouts D'ABORD, retraits ENSUITE : un echec entre les deux laisse l'entree
// avec trop de categories, jamais trop peu. Aucune perte, aucune entree videe
// par erreur.
export async function setJournalEntryCategories({
  userId,
  entryId,
  categoryIds,
}: {
  userId: string;
  entryId: string;
  categoryIds: string[];
}): Promise<JournalEntryCategoriesResult> {
  const supabase = await getCategoriesClient();

  const { data: entry, error: entryError } = await supabase
    .from("personal_journal_entries")
    .select("id")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();

  if (entryError) {
    throw new Error(entryError.message);
  }

  if (!entry) {
    return { status: "not_found" };
  }

  if (categoryIds.length > 0) {
    // Au plus JOURNAL_ENTRY_CATEGORIES_MAX identifiants : le filtre `in` reste
    // court, pas besoin de le decouper.
    const { data: owned, error: ownedError } = await supabase
      .from("personal_journal_categories")
      .select("id")
      .eq("user_id", userId)
      .in("id", categoryIds);

    if (ownedError) {
      throw new Error(ownedError.message);
    }

    if ((owned ?? []).length !== categoryIds.length) {
      return { status: "not_found" };
    }
  }

  const { data: currentRows, error: currentError } = await supabase
    .from("personal_journal_entry_categories")
    .select("category_id")
    .eq("entry_id", entryId)
    .eq("user_id", userId);

  if (currentError) {
    throw new Error(currentError.message);
  }

  const current = new Set(
    ((currentRows ?? []) as { category_id: string }[]).map((row) => row.category_id),
  );
  const requested = new Set(categoryIds);
  const toAdd = categoryIds.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !requested.has(id));

  if (toAdd.length > 0) {
    // ignoreDuplicates : "on conflict do nothing" sur la cle primaire
    // (entry_id, category_id). Une session concurrente qui aurait pose le meme
    // lien entre-temps ne fait pas echouer le lot.
    const { error: insertError } = await supabase
      .from("personal_journal_entry_categories")
      .upsert(
        toAdd.map((categoryId) => ({
          entry_id: entryId,
          category_id: categoryId,
          user_id: userId,
        })),
        { onConflict: "entry_id,category_id", ignoreDuplicates: true },
      );

    if (insertError) {
      // Une categorie supprimee entre le controle et l'insertion.
      if (isForeignKeyViolation(insertError)) {
        return { status: "not_found" };
      }

      throw new Error(insertError.message);
    }
  }

  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from("personal_journal_entry_categories")
      .delete()
      .eq("entry_id", entryId)
      .eq("user_id", userId)
      .in("category_id", toRemove);

    if (removeError) {
      throw new Error(removeError.message);
    }
  }

  return { status: "ok", categoryIds };
}
