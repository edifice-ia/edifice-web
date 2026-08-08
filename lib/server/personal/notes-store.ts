import type { ArchivedPersonalNote, PersonalNote } from "@/lib/personal/notes";
import { createClient } from "@/src/lib/supabase/server";

type PersonalNoteRow = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type ArchivedPersonalNoteRow = PersonalNoteRow & {
  deleted_at: string;
};

// Ce store diverge deliberement des deux autres stores Personnel
// (daily-briefs-store.ts, calendar-events-store.ts), qui instancient Supabase
// avec SUPABASE_SERVICE_ROLE_KEY et contournent donc RLS.
//
// Ce n'est pas un oubli, et l'ecart va dans le sens du durcissement. Ces deux
// stores utilisent la cle service-role parce qu'ils s'executent sans session
// utilisateur — un webhook Google Calendar, un cron quotidien — ou aucun cookie
// n'existe. C'est une contrainte technique, pas un choix de securite : leur
// isolation repose entierement sur le filtre .eq("user_id", ...) applique dans
// le code, et les policies RLS n'y sont qu'une defense en profondeur inactive
// sur ce chemin.
//
// Notes n'a pas cette contrainte : chaque appel arrive par une requete HTTP
// authentifiee. On utilise donc le client de session (cle anon + cookies), et
// RLS devient le garde reel plutot qu'une couche contournee par defaut —
// principe de moindre privilege, voir 13-securite-gouvernance.md.
//
// Consequence a connaitre avant de modifier ce fichier : si les policies de
// public.personal_notes sont absentes ou mal appliquees, il n'y a AUCUN second
// filet applicatif. Les filtres .eq("user_id", userId) ci-dessous sont
// redondants avec RLS et volontairement conserves — ils rendent l'intention
// lisible et couvrent le cas ou ce store passerait un jour au service-role.
async function getNotesClient() {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Configuration Supabase absente.");
  }

  return supabase;
}

function mapNote(row: PersonalNoteRow): PersonalNote {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const NOTE_COLUMNS = "id, content, created_at, updated_at";
const ARCHIVED_NOTE_COLUMNS = `${NOTE_COLUMNS}, deleted_at`;

// Les notes archivees (deleted_at non nul) ne sont jamais renvoyees ici : les
// deux etats ne se melangent jamais dans une meme liste. Voir
// listArchivedPersonalNotes pour l'autre chemin.
export async function listPersonalNotes(userId: string): Promise<PersonalNote[]> {
  const supabase = await getNotesClient();
  const { data, error } = await supabase
    .from("personal_notes")
    .select(NOTE_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PersonalNoteRow[]).map(mapNote);
}

// Triees par date d'archivage decroissante : ce qu'on vient d'archiver par
// erreur est ce qu'on cherche a restaurer en premier.
export async function listArchivedPersonalNotes(
  userId: string,
): Promise<ArchivedPersonalNote[]> {
  const supabase = await getNotesClient();
  const { data, error } = await supabase
    .from("personal_notes")
    .select(ARCHIVED_NOTE_COLUMNS)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ArchivedPersonalNoteRow[]).map((row) => ({
    ...mapNote(row),
    archivedAt: row.deleted_at,
  }));
}

// Compte seul, sans ramener les lignes : le compteur accompagne la liste active
// pour que l'UI affiche "Voir les archives (N)" sans second aller-retour.
export async function countArchivedPersonalNotes(userId: string): Promise<number> {
  const supabase = await getNotesClient();
  const { count, error } = await supabase
    .from("personal_notes")
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
// Ce geste est volontairement separe de toute suppression physique — il n'en
// existe aucune dans ce module, ni ici ni ailleurs. 11-modularite-configuration.md
// pose qu'archiver et supprimer definitivement ne doivent jamais partager un
// bouton ni une confirmation ; ils ne partagent ici pas non plus de fonction.
//
// Renvoie false si la note n'existe pas, ne lui appartient pas, ou n'est pas
// archivee — les trois cas restent indistinguables cote appelant.
export async function restorePersonalNote({
  userId,
  noteId,
}: {
  userId: string;
  noteId: string;
}): Promise<boolean> {
  const supabase = await getNotesClient();
  const { data, error } = await supabase
    .from("personal_notes")
    .update({ deleted_at: null })
    .eq("id", noteId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}

export async function createPersonalNote({
  userId,
  content,
}: {
  userId: string;
  content: string;
}): Promise<PersonalNote> {
  const supabase = await getNotesClient();
  // user_id est fourni explicitement : la policy insert porte un
  // with check (user_id = auth.uid()), donc une valeur incoherente serait
  // rejetee par la base, pas silencieusement corrigee.
  const { data, error } = await supabase
    .from("personal_notes")
    .insert({ user_id: userId, content })
    .select(NOTE_COLUMNS)
    .single<PersonalNoteRow>();

  if (error) {
    throw new Error(error.message);
  }

  return mapNote(data);
}

// Renvoie null quand aucune ligne n'a ete touchee : note inexistante,
// appartenant a quelqu'un d'autre, ou deja supprimee. Les trois cas sont
// volontairement indistinguables cote appelant — repondre "introuvable" plutot
// que "interdit" evite de confirmer l'existence d'une note d'autrui.
export async function updatePersonalNoteContent({
  userId,
  noteId,
  content,
}: {
  userId: string;
  noteId: string;
  content: string;
}): Promise<PersonalNote | null> {
  const supabase = await getNotesClient();
  const { data, error } = await supabase
    .from("personal_notes")
    .update({ content })
    .eq("id", noteId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(NOTE_COLUMNS)
    .maybeSingle<PersonalNoteRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapNote(data) : null;
}

// Suppression logique uniquement : ecrit deleted_at. Aucune suppression
// physique n'est possible depuis ce chemin — la table n'accorde pas le
// privilege DELETE a authenticated et ne porte aucune policy DELETE. La
// suppression physique releve du geste RGPD "Supprimer l'historique d'un
// module", qui passera par la cle service-role.
export async function softDeletePersonalNote({
  userId,
  noteId,
}: {
  userId: string;
  noteId: string;
}): Promise<boolean> {
  const supabase = await getNotesClient();
  const { data, error } = await supabase
    .from("personal_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}
