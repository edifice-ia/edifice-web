import type { PersonalJournalEntry } from "@/lib/personal/journal";
import { createClient } from "@/src/lib/supabase/server";

type PersonalJournalEntryRow = {
  id: string;
  content: string;
  mood: number | null;
  created_at: string;
  updated_at: string;
};

// Client de session, pas service-role — meme raisonnement que
// lib/server/personal/notes-store.ts, ou il est detaille : ce store s'execute
// toujours dans le contexte d'une requete HTTP authentifiee, donc rien
// n'oblige a contourner RLS comme le font daily-briefs-store.ts et
// calendar-events-store.ts, qui tournent sans session (webhook, cron).
//
// Consequence identique et qui vaut d'etre repetee : RLS est le garde reel, et
// si les policies de public.personal_journal_entries sont absentes ou mal
// appliquees, il n'y a AUCUN second filet applicatif. Les filtres
// .eq("user_id", userId) ci-dessous sont redondants avec RLS et volontairement
// conserves.
async function getJournalClient() {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Configuration Supabase absente.");
  }

  return supabase;
}

function mapEntry(row: PersonalJournalEntryRow): PersonalJournalEntry {
  return {
    id: row.id,
    content: row.content,
    mood: row.mood,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const JOURNAL_COLUMNS = "id, content, mood, created_at, updated_at";

// Les entrees supprimees (deleted_at non nul) ne sont jamais renvoyees : la
// suppression est logique, mais elle est totale du point de vue de la lecture.
export async function listPersonalJournalEntries(
  userId: string,
): Promise<PersonalJournalEntry[]> {
  const supabase = await getJournalClient();
  const { data, error } = await supabase
    .from("personal_journal_entries")
    .select(JOURNAL_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PersonalJournalEntryRow[]).map(mapEntry);
}

export async function createPersonalJournalEntry({
  userId,
  content,
  mood,
}: {
  userId: string;
  content: string;
  mood: number | null;
}): Promise<PersonalJournalEntry> {
  const supabase = await getJournalClient();
  // user_id est fourni explicitement : la policy insert porte un
  // with check (user_id = auth.uid()), donc une valeur incoherente serait
  // rejetee par la base, pas silencieusement corrigee.
  const { data, error } = await supabase
    .from("personal_journal_entries")
    .insert({ user_id: userId, content, mood })
    .select(JOURNAL_COLUMNS)
    .single<PersonalJournalEntryRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapEntry(data);
}

// Renvoie null quand aucune ligne n'a ete touchee : entree inexistante,
// appartenant a quelqu'un d'autre, ou deja supprimee. Les trois cas sont
// volontairement indistinguables cote appelant — repondre "introuvable" plutot
// que "interdit" evite de confirmer l'existence d'une entree d'autrui.
//
// Le patch ne porte que les champs reellement fournis : omettre mood laisse
// l'humeur en place, passer mood: null l'efface.
export async function updatePersonalJournalEntry({
  userId,
  entryId,
  patch,
}: {
  userId: string;
  entryId: string;
  patch: { content?: string; mood?: number | null };
}): Promise<PersonalJournalEntry | null> {
  const supabase = await getJournalClient();
  const { data, error } = await supabase
    .from("personal_journal_entries")
    .update(patch)
    .eq("id", entryId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(JOURNAL_COLUMNS)
    .maybeSingle<PersonalJournalEntryRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapEntry(data) : null;
}

// Suppression logique uniquement : ecrit deleted_at. Aucune suppression
// physique n'est possible depuis ce chemin — la table n'accorde pas le
// privilege DELETE a authenticated et ne porte aucune policy DELETE.
export async function softDeletePersonalJournalEntry({
  userId,
  entryId,
}: {
  userId: string;
  entryId: string;
}): Promise<boolean> {
  const supabase = await getJournalClient();
  const { data, error } = await supabase
    .from("personal_journal_entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}
